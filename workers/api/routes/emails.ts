/**
 * Email Routes for Cloudflare Workers
 *
 * Handles application email sending via SendGrid.
 *
 * Endpoints:
 * - POST /api/emails/send - Send application email
 * - GET /api/emails/history - Get user's email history
 * - GET /api/emails/remaining - Get remaining emails in rate limit window
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables, UserProfile, Application, ApplicationVariant, SendEmailResponse } from '../types';
import { TABLES } from '../types';
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

const sendEmailSchema = z.object({
  applicationId: z
    .string()
    .min(1, 'Application ID is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid application ID format'),
  recipientEmail: z
    .string()
    .email('Invalid email address')
    .optional()
    .default('carl.f.frank@gmail.com'),
});

const emailHistorySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  applicationId: z.string().optional(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/emails/send
 * Send application email with cover letter and resume
 *
 * Rate limited: 10 emails per hour per user
 */
app.post('/send', authenticateUser, rateLimiter({ maxRequests: 10, windowMs: 60 * 60 * 1000 }), async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();
  const supabase = createSupabaseAdmin(c.env);

  // Check if SendGrid is configured
  if (!c.env.SENDGRID_API_KEY) {
    throw createValidationError('Email service not configured', {
      sendgrid: 'SendGrid API key is not configured',
    });
  }

  // Validate input
  const parseResult = sendEmailSchema.safeParse(body);
  if (!parseResult.success) {
    throw createValidationError(
      'Invalid request body',
      Object.fromEntries(
        parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
      )
    );
  }

  const { applicationId, recipientEmail } = parseResult.data;

  // Validate email format
  if (!isValidEmail(recipientEmail)) {
    throw createValidationError('Invalid email address', {
      recipientEmail: 'Email address format is invalid',
    });
  }

  console.log(`Sending application email for user ${userId}, application ${applicationId}`);

  // Fetch application
  const { data: applicationRecord, error: applicationError } = await supabase
    .from(TABLES.APPLICATIONS)
    .select('*')
    .eq('id', applicationId)
    .eq('user_id', userId)
    .single();

  if (applicationError || !applicationRecord) {
    throw createNotFoundError('Application', applicationId);
  }

  // Fetch selected variant
  const { data: variantRecords, error: variantError } = await supabase
    .from(TABLES.APPLICATION_VARIANTS)
    .select('*')
    .eq('application_id', applicationId);

  if (variantError || !variantRecords || variantRecords.length === 0) {
    throw createNotFoundError('Application variants');
  }

  // Find selected variant or use first one
  const selectedVariantRecord =
    variantRecords.find((v) => v.variant_id === applicationRecord.selected_variant_id) ||
    variantRecords[0];

  if (!selectedVariantRecord) {
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

  // Map to typed objects
  const application: Application = {
    id: applicationRecord.id,
    userId: applicationRecord.user_id,
    jobId: applicationRecord.job_id,
    jobTitle: applicationRecord.job_title,
    company: applicationRecord.company,
    status: applicationRecord.status,
    createdAt: applicationRecord.created_at,
    updatedAt: applicationRecord.updated_at,
    submittedAt: applicationRecord.submitted_at,
    variants: [],
    selectedVariantId: applicationRecord.selected_variant_id,
    editHistory: applicationRecord.edit_history || [],
  };

  const variant: ApplicationVariant = {
    id: selectedVariantRecord.variant_id,
    name: selectedVariantRecord.name,
    resume: selectedVariantRecord.resume,
    coverLetter: selectedVariantRecord.cover_letter,
    aiRationale: selectedVariantRecord.ai_rationale || [],
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

  // Send email using SendGrid API directly
  const result = await sendApplicationEmail(c.env, userId, application, variant, profile, recipientEmail, supabase);

  console.log(`Email sent successfully: ${result.emailId}`);

  const response: SendEmailResponse = {
    success: result.success,
    emailId: result.emailId,
    message: result.message,
  };

  return c.json(response);
});

/**
 * GET /api/emails/history
 * Get user's email history with pagination
 */
app.get('/history', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const supabase = createSupabaseAdmin(c.env);

  const parseResult = emailHistorySchema.safeParse({
    page: c.req.query('page'),
    limit: c.req.query('limit'),
    applicationId: c.req.query('applicationId'),
  });

  if (!parseResult.success) {
    throw createValidationError(
      'Invalid query parameters',
      Object.fromEntries(
        parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
      )
    );
  }

  const { page, limit, applicationId } = parseResult.data;
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from(TABLES.EMAILS)
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (applicationId) {
    query = query.eq('application_id', applicationId);
  }

  const { data: emails, error, count } = await query;

  if (error) {
    console.error('Failed to fetch email history:', error);
    throw new Error('Failed to fetch email history');
  }

  return c.json({
    emails: emails || [],
    total: count || 0,
    page,
    limit,
    hasMore: (count || 0) > offset + limit,
  });
});

/**
 * GET /api/emails/remaining
 * Get remaining emails in the current rate limit window
 */
app.get('/remaining', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const supabase = createSupabaseAdmin(c.env);

  // Check rate limit without incrementing
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const { count } = await supabase
    .from(TABLES.EMAILS)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('sent_at', oneHourAgo.toISOString());

  const sent = count || 0;
  const limit = 10;
  const remaining = Math.max(0, limit - sent);

  return c.json({
    limit,
    sent,
    remaining,
    resetsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
});

// =============================================================================
// Email Sending Functions
// =============================================================================

interface SendEmailResult {
  success: boolean;
  emailId: string;
  message: string;
}

async function sendApplicationEmail(
  env: Env,
  userId: string,
  application: Application,
  variant: ApplicationVariant,
  profile: UserProfile,
  recipientEmail: string,
  supabase: ReturnType<typeof createSupabaseAdmin>
): Promise<SendEmailResult> {
  const fromEmail = env.SENDGRID_FROM_EMAIL || 'noreply@jobmatch-ai.com';
  const fromName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'JobMatch AI User';
  const subject = `Application for ${application.jobTitle} at ${application.company}`;

  const htmlBody = buildHtmlEmail(variant, profile, fromName, profile.email || fromEmail, subject);
  const textBody = buildTextEmail(variant, profile, fromName, profile.email || fromEmail);

  // Send via SendGrid API
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: recipientEmail }] }],
      from: { email: fromEmail, name: fromName },
      reply_to: { email: profile.email || fromEmail },
      subject,
      content: [
        { type: 'text/plain', value: textBody },
        { type: 'text/html', value: htmlBody },
      ],
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true },
      },
      custom_args: {
        applicationId: application.id,
        userId,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('SendGrid error:', error);
    throw new Error('Failed to send email via SendGrid');
  }

  // Log email to database
  const { data, error } = await supabase
    .from(TABLES.EMAILS)
    .insert({
      user_id: userId,
      application_id: application.id,
      recipient_email: recipientEmail,
      subject,
      from_email: fromEmail,
      from_name: fromName,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to log email:', error);
    throw error;
  }

  // Update application with last email timestamp
  await supabase
    .from(TABLES.APPLICATIONS)
    .update({
      last_email_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', application.id);

  return {
    success: true,
    emailId: data.id,
    message: 'Email sent successfully',
  };
}

// =============================================================================
// Email Template Builders
// =============================================================================

function sanitizeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function buildHtmlEmail(
  variant: ApplicationVariant,
  profile: UserProfile,
  fromName: string,
  fromEmail: string,
  subject: string
): string {
  const coverLetterHtml = variant.coverLetter
    .split('\n\n')
    .map((p) => `<p style="margin-bottom: 1em;">${sanitizeHtml(p)}</p>`)
    .join('');

  const resumeHtml = buildResumeHtml(variant.resume);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${sanitizeHtml(subject)}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background-color: white; padding: 40px; border-radius: 8px;">
    <h2 style="color: #1f2937; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">Cover Letter</h2>
    ${coverLetterHtml}

    <h2 style="color: #1f2937; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-top: 40px;">Resume</h2>
    ${resumeHtml}

    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
      <p style="font-weight: bold;">${sanitizeHtml(fromName)}</p>
      <p style="color: #6b7280;">Email: ${sanitizeHtml(fromEmail)}</p>
      ${profile.phone ? `<p style="color: #6b7280;">Phone: ${sanitizeHtml(profile.phone)}</p>` : ''}
      ${profile.linkedInUrl ? `<p><a href="${sanitizeHtml(profile.linkedInUrl)}" style="color: #2563eb;">LinkedIn Profile</a></p>` : ''}
    </div>
  </div>
</body>
</html>`;
}

function buildResumeHtml(resume: ApplicationVariant['resume']): string {
  let html = '';

  if (resume.summary) {
    html += `<h3 style="color: #2563eb;">Professional Summary</h3><p>${sanitizeHtml(resume.summary)}</p>`;
  }

  if (resume.experience?.length) {
    html += '<h3 style="color: #2563eb;">Experience</h3>';
    resume.experience.forEach((exp) => {
      html += `
        <div style="margin-bottom: 16px;">
          <div style="font-weight: bold;">${sanitizeHtml(exp.title)}</div>
          <div style="color: #666;">${sanitizeHtml(exp.company)} | ${sanitizeHtml(exp.location)}</div>
          <div style="color: #666; font-size: 14px;">${sanitizeHtml(exp.startDate)} - ${sanitizeHtml(exp.endDate)}</div>
          <ul>${exp.bullets.map((b) => `<li>${sanitizeHtml(b)}</li>`).join('')}</ul>
        </div>`;
    });
  }

  if (resume.skills?.length) {
    html += `<h3 style="color: #2563eb;">Skills</h3><p>${resume.skills.map(sanitizeHtml).join(' | ')}</p>`;
  }

  if (resume.education?.length) {
    html += '<h3 style="color: #2563eb;">Education</h3>';
    resume.education.forEach((edu) => {
      html += `
        <div style="margin-bottom: 12px;">
          <div style="font-weight: bold;">${sanitizeHtml(edu.degree)}</div>
          <div style="color: #666;">${sanitizeHtml(edu.school)} | ${sanitizeHtml(edu.location)}</div>
          <div style="color: #666; font-size: 14px;">${sanitizeHtml(edu.graduation)}</div>
        </div>`;
    });
  }

  return html;
}

function buildTextEmail(
  variant: ApplicationVariant,
  profile: UserProfile,
  fromName: string,
  fromEmail: string
): string {
  const { resume } = variant;

  const experienceText = resume.experience
    ?.map((exp) => `${exp.title} at ${exp.company}\n${exp.startDate} - ${exp.endDate}\n${exp.bullets.join('\n')}`)
    .join('\n\n') || '';

  const educationText = resume.education
    ?.map((edu) => `${edu.degree} - ${edu.school} (${edu.graduation})`)
    .join('\n') || '';

  return `
Cover Letter:

${variant.coverLetter}

---

Resume:

${resume.summary || ''}

Experience:
${experienceText}

Skills: ${resume.skills?.join(', ') || ''}

Education:
${educationText}

---

${fromName}
${fromEmail}
${profile.phone || ''}
${profile.linkedInUrl || ''}
`.trim();
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default app;
