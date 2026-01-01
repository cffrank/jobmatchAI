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
import { createSupabaseAdmin } from '../services/supabase';

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

  // Fetch application data
  const { application, variant, profile } = await fetchApplicationData(c.env, userId, applicationId);

  // Generate text content
  const textContent = generateTextContent(application, variant, profile);

  // Store text content
  const supabase = createSupabaseAdmin(c.env);
  const fileName = sanitizeFilename(`${application.job_title}_${new Date().toISOString().split('T')[0]}.txt`);
  const filePath = `exports/${userId}/${applicationId}/${crypto.randomUUID()}_${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKETS.EXPORTS)
    .upload(filePath, textContent, {
      contentType: 'text/plain',
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('Failed to upload text:', uploadError);
    throw new Error('Failed to upload text');
  }

  // Generate signed URL
  const { data: signedData } = await supabase.storage
    .from(BUCKETS.EXPORTS)
    .createSignedUrl(filePath, 24 * 60 * 60);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return c.json({
    downloadUrl: signedData?.signedUrl || '',
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
  const supabase = createSupabaseAdmin(env);

  // Fetch application
  const { data: application, error: appError } = await supabase
    .from(TABLES.APPLICATIONS)
    .select('*')
    .eq('id', applicationId)
    .eq('user_id', userId)
    .single();

  if (appError || !application) {
    throw createNotFoundError('Application', applicationId);
  }

  // Fetch variants
  const { data: variants, error: variantError } = await supabase
    .from(TABLES.APPLICATION_VARIANTS)
    .select('*')
    .eq('application_id', applicationId);

  if (variantError || !variants || variants.length === 0) {
    throw createNotFoundError('Application variants');
  }

  // Find selected variant
  const selectedVariant =
    variants.find((v) => v.variant_id === application.selected_variant_id) || variants[0];

  if (!selectedVariant) {
    throw createNotFoundError('Selected variant');
  }

  // Fetch user profile
  const { data: profileRecord, error: profileError } = await supabase
    .from(TABLES.USERS)
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profileRecord) {
    throw createNotFoundError('User profile');
  }

  const variant: ApplicationVariant = {
    id: selectedVariant.variant_id,
    name: selectedVariant.name,
    resume: selectedVariant.resume,
    coverLetter: selectedVariant.cover_letter,
    aiRationale: selectedVariant.ai_rationale || [],
  };

  const profile: UserProfile = {
    id: profileRecord.id,
    email: profileRecord.email,
    firstName: profileRecord.first_name,
    lastName: profileRecord.last_name,
    phone: profileRecord.phone,
    location: profileRecord.location,
    summary: profileRecord.summary,
    headline: profileRecord.headline,
    profileImageUrl: profileRecord.profile_image_url,
    linkedInUrl: profileRecord.linkedin_url,
    linkedInImported: profileRecord.linkedin_imported,
    linkedInImportedAt: profileRecord.linkedin_imported_at,
    createdAt: profileRecord.created_at,
    updatedAt: profileRecord.updated_at,
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
