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
import type { Env, Variables, ApplicationVariant, UserProfile, ExportResponse } from '../types';
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
 * NOTE: Full PDF generation with pdfkit is not available in Workers.
 * This returns a text-based response that can be used for client-side PDF generation.
 * For production, consider:
 * - Using Cloudflare Browser Rendering API (paid feature)
 * - Client-side PDF generation with jsPDF
 * - External PDF generation service
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
  console.log(`Exporting PDF for user ${userId}, application ${applicationId}`);

  // Fetch application data
  const { application, variant, profile } = await fetchApplicationData(c.env, userId, applicationId);

  // Generate text content for PDF
  const textContent = generateTextContent(application, variant, profile);

  // For Workers, we store the text content and return a URL
  // The client can then use this to generate a PDF
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
    console.error('Failed to upload content:', uploadError);
    throw new Error('Failed to upload content');
  }

  // Generate signed URL (valid for 24 hours)
  const { data: signedData } = await supabase.storage
    .from(BUCKETS.EXPORTS)
    .createSignedUrl(filePath, 24 * 60 * 60);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Return the data needed for client-side PDF generation
  const response: ExportResponse & { note: string; data: { resume: unknown; coverLetter: string; profile: Partial<UserProfile> } } = {
    downloadUrl: signedData?.signedUrl || '',
    fileName: fileName.replace('.txt', '.pdf'),
    expiresAt: expiresAt.toISOString(),
    format: 'pdf',
    fileSize: new TextEncoder().encode(textContent).length,
    note: 'PDF generation is performed client-side. Use the provided data to generate the PDF.',
    data: {
      resume: variant.resume,
      coverLetter: variant.coverLetter,
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedInUrl: profile.linkedInUrl,
      },
    },
  };

  return c.json(response);
});

/**
 * POST /api/exports/docx
 * Export application as DOCX
 *
 * NOTE: Similar to PDF, full DOCX generation requires the 'docx' library
 * which may have compatibility issues with Workers.
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
  console.log(`Exporting DOCX for user ${userId}, application ${applicationId}`);

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
    console.error('Failed to upload content:', uploadError);
    throw new Error('Failed to upload content');
  }

  // Generate signed URL
  const { data: signedData } = await supabase.storage
    .from(BUCKETS.EXPORTS)
    .createSignedUrl(filePath, 24 * 60 * 60);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const response: ExportResponse & { note: string; data: { resume: unknown; coverLetter: string; profile: Partial<UserProfile> } } = {
    downloadUrl: signedData?.signedUrl || '',
    fileName: fileName.replace('.txt', '.docx'),
    expiresAt: expiresAt.toISOString(),
    format: 'docx',
    fileSize: new TextEncoder().encode(textContent).length,
    note: 'DOCX generation is performed client-side. Use the provided data to generate the DOCX.',
    data: {
      resume: variant.resume,
      coverLetter: variant.coverLetter,
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedInUrl: profile.linkedInUrl,
      },
    },
  };

  return c.json(response);
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
