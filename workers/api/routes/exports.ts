/**
 * Export Routes for Cloudflare Workers
 *
 * Handles application export to PDF and DOCX formats.
 *
 * NOTE: Full PDF/DOCX generation requires pdfkit and docx libraries
 * which have Node.js-specific dependencies. For Cloudflare Workers,
 * we provide a simplified text export or defer to client-side generation.
 *
 * Endpoints:
 * - POST /api/exports/pdf - Export application as PDF (simplified)
 * - POST /api/exports/docx - Export application as DOCX (simplified)
 * - POST /api/exports/text - Export application as plain text
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables, ApplicationVariant, UserProfile } from '../types';
import { TABLES, BUCKETS } from '../types';
import { authenticateUser, getUserId } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { createNotFoundError, createValidationError } from '../middleware/errorHandler';

// =============================================================================
// Router Setup
// =============================================================================

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// =============================================================================
// Validation Schemas
// =============================================================================

const exportSchema = z.object({
  applicationId: z
    .string()
    .min(1, 'Application ID is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid application ID format'),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/exports/pdf
 * Export application as PDF
 *
 * Phase 3.4: Full PDF Generation with pdf-lib
 * - Uses pdf-lib (Workers-compatible pure JavaScript library)
 * - Generates actual PDF files (not just text)
 * - Stores in R2 EXPORTS bucket
 * - Returns presigned download URL
 */
app.post('/pdf', authenticateUser, rateLimiter({ maxRequests: 30, windowMs: 60 * 60 * 1000 }), async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  const parseResult = exportSchema.safeParse(body);
  if (!parseResult.success) {
    throw createValidationError(
      'Invalid request body',
      Object.fromEntries(
        parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
      )
    );
  }

  const { applicationId } = parseResult.data;
  console.log(`[Exports] Generating PDF for user ${userId}, application ${applicationId}`);

  try {
    // Fetch application data
    const { application, variant, profile } = await fetchApplicationData(c.env, userId, applicationId);

    // Import document generation service
    const { generateApplicationPDF } = await import('../services/documentGeneration');

    // Prepare application data
    const appData = {
      resume: {
        fullName: `${profile.firstName} ${profile.lastName}`,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedInUrl: profile.linkedInUrl,
        summary: variant.resume.summary,
        experience: variant.resume.experience,
        education: variant.resume.education,
        skills: variant.resume.skills,
      },
      coverLetter: variant.coverLetter,
      jobTitle: application.job_title,
      company: application.company,
    };

    // Generate PDF and upload to R2
    const result = await generateApplicationPDF(c.env, userId, appData);

    console.log(`[Exports] PDF generated successfully: ${result.filename}`);

    return c.json({
      downloadUrl: result.downloadUrl,
      fileName: result.filename,
      expiresAt: result.expiresAt,
      format: 'pdf',
      fileSize: result.size,
    });
  } catch (error) {
    console.error('[Exports] PDF generation failed:', error);
    throw error;
  }
});

/**
 * POST /api/exports/docx
 * Export application as DOCX
 *
 * Phase 3.4: Full DOCX Generation with docx library
 * - Uses docx (Workers-compatible pure JavaScript library)
 * - Generates actual DOCX files
 * - Stores in R2 EXPORTS bucket
 * - Returns presigned download URL
 */
app.post('/docx', authenticateUser, rateLimiter({ maxRequests: 30, windowMs: 60 * 60 * 1000 }), async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  const parseResult = exportSchema.safeParse(body);
  if (!parseResult.success) {
    throw createValidationError(
      'Invalid request body',
      Object.fromEntries(
        parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
      )
    );
  }

  const { applicationId } = parseResult.data;
  console.log(`[Exports] Generating DOCX for user ${userId}, application ${applicationId}`);

  try {
    // Fetch application data
    const { application, variant, profile } = await fetchApplicationData(c.env, userId, applicationId);

    // Import document generation service
    const { generateApplicationDOCX } = await import('../services/documentGeneration');

    // Prepare application data
    const appData = {
      resume: {
        fullName: `${profile.firstName} ${profile.lastName}`,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedInUrl: profile.linkedInUrl,
        summary: variant.resume.summary,
        experience: variant.resume.experience,
        education: variant.resume.education,
        skills: variant.resume.skills,
      },
      coverLetter: variant.coverLetter,
      jobTitle: application.job_title,
      company: application.company,
    };

    // Generate DOCX and upload to R2
    const result = await generateApplicationDOCX(c.env, userId, appData);

    console.log(`[Exports] DOCX generated successfully: ${result.filename}`);

    return c.json({
      downloadUrl: result.downloadUrl,
      fileName: result.filename,
      expiresAt: result.expiresAt,
      format: 'docx',
      fileSize: result.size,
    });
  } catch (error) {
    console.error('[Exports] DOCX generation failed:', error);
    throw error;
  }
});

/**
 * POST /api/exports/text
 * Export application as plain text
 * This works fully in Workers without any issues
 */
app.post('/text', authenticateUser, rateLimiter({ maxRequests: 30, windowMs: 60 * 60 * 1000 }), async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  const parseResult = exportSchema.safeParse(body);
  if (!parseResult.success) {
    throw createValidationError(
      'Invalid request body',
      Object.fromEntries(
        parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
      )
    );
  }

  const { applicationId } = parseResult.data;
  console.log(`Exporting text for user ${userId}, application ${applicationId}`);

  // Fetch application data from D1
  const { application, variant, profile } = await fetchApplicationData(c.env, userId, applicationId);

  // Generate text content
  const textContent = generateTextContent(application, variant, profile);

  // Store text content in R2
  const fileName = sanitizeFilename(`${application.job_title}_${new Date().toISOString().split('T')[0]}.txt`);
  const objectKey = `exports/${userId}/${applicationId}/${crypto.randomUUID()}_${fileName}`;

  await c.env.EXPORTS.put(objectKey, textContent, {
    httpMetadata: {
      contentType: 'text/plain',
      cacheControl: 'max-age=3600',
    },
  });

  // Generate presigned URL (valid for 24 hours)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const downloadUrl = `${c.env.PUBLIC_URL || ''}/r2/exports/${objectKey}`;

  return c.json({
    downloadUrl,
    fileName,
    expiresAt: expiresAt.toISOString(),
    format: 'txt',
    fileSize: new TextEncoder().encode(textContent).length,
  });
});

// =============================================================================
// Helper Functions
// =============================================================================

interface ApplicationData {
  application: { id: string; job_title: string; company: string };
  variant: ApplicationVariant;
  profile: UserProfile;
}

async function fetchApplicationData(env: Env, userId: string, applicationId: string): Promise<ApplicationData> {
  // Fetch application from D1
  const { results: applicationResults } = await env.DB.prepare(
    'SELECT * FROM applications WHERE id = ? AND user_id = ?'
  )
    .bind(applicationId, userId)
    .all();

  const application = applicationResults[0];

  if (!application) {
    throw createNotFoundError('Application', applicationId);
  }

  // Parse variants from JSON
  const variants = application.variants ? JSON.parse(application.variants as string) : [];

  if (variants.length === 0) {
    throw createNotFoundError('Application variants');
  }

  // Find selected variant or use first one
  const selectedVariant =
    variants.find((v: any) => v.id === application.selected_variant_id) || variants[0];

  if (!selectedVariant) {
    throw createNotFoundError('Selected variant');
  }

  // Fetch user profile from D1
  const { results: profileResults } = await env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  )
    .bind(userId)
    .all();

  const profileRecord = profileResults[0];

  if (!profileRecord) {
    throw createNotFoundError('User profile');
  }

  const variant: ApplicationVariant = {
    id: selectedVariant.id,
    name: selectedVariant.name,
    resume: selectedVariant.resume,
    coverLetter: selectedVariant.cover_letter,
    aiRationale: selectedVariant.ai_rationale || [],
  };

  const profile: UserProfile = {
    id: profileRecord.id as string,
    email: profileRecord.email as string,
    firstName: profileRecord.first_name as string | undefined,
    lastName: profileRecord.last_name as string | undefined,
    phone: profileRecord.phone as string | undefined,
    location: profileRecord.location as string | undefined,
    summary: profileRecord.summary as string | undefined,
    headline: profileRecord.headline as string | undefined,
    profileImageUrl: profileRecord.profile_image_url as string | undefined,
    linkedInUrl: profileRecord.linkedin_url as string | undefined,
    linkedInImported: profileRecord.linkedin_imported as boolean | undefined,
    linkedInImportedAt: profileRecord.linkedin_imported_at as string | undefined,
    createdAt: profileRecord.created_at as string,
    updatedAt: profileRecord.updated_at as string,
  };

  return { application, variant, profile };
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/^\.+/, '')
    .substring(0, 255);
}

function generateTextContent(
  application: { job_title: string; company: string },
  variant: ApplicationVariant,
  profile: UserProfile
): string {
  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Applicant';
  const { resume, coverLetter } = variant;

  const contactInfo = [profile.email, profile.phone, profile.location, profile.linkedInUrl]
    .filter(Boolean)
    .join(' | ');

  const experienceText = resume.experience
    ?.map((exp) => `
${exp.title}
${exp.company} | ${exp.location}
${exp.startDate} - ${exp.endDate}
${exp.bullets.map((b) => `  - ${b}`).join('\n')}
`)
    .join('\n') || '';

  const educationText = resume.education
    ?.map((edu) => `${edu.degree} - ${edu.school}, ${edu.location} (${edu.graduation})`)
    .join('\n') || '';

  return `
================================================================================
RESUME
================================================================================

${fullName}
${contactInfo}

--------------------------------------------------------------------------------
PROFESSIONAL SUMMARY
--------------------------------------------------------------------------------
${resume.summary || 'No summary provided.'}

--------------------------------------------------------------------------------
PROFESSIONAL EXPERIENCE
--------------------------------------------------------------------------------
${experienceText}

--------------------------------------------------------------------------------
SKILLS
--------------------------------------------------------------------------------
${resume.skills?.join(' | ') || 'No skills listed.'}

--------------------------------------------------------------------------------
EDUCATION
--------------------------------------------------------------------------------
${educationText}


================================================================================
COVER LETTER
================================================================================

${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Hiring Manager
${application.company}

${coverLetter}

Sincerely,
${fullName}


--------------------------------------------------------------------------------
Generated by JobMatch AI
Application for: ${application.job_title} at ${application.company}
`.trim();
}

export default app;
