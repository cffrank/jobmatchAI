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

  // Fetch application from D1
  const { results: applicationResults } = await c.env.DB.prepare(
    'SELECT * FROM applications WHERE id = ? AND user_id = ?'
  ).bind(applicationId, userId).all();

  const applicationRecord = applicationResults[0];

  if (!applicationRecord) {
    throw createNotFoundError('Application', applicationId);
  }

  // Parse variants JSON
  const variants = applicationRecord.variants ? JSON.parse(applicationRecord.variants as string) : [];

  if (variants.length === 0) {
    throw createNotFoundError('Application variants');
  }

  // Find selected variant or use first one
  const selectedVariantRecord =
    variants.find((v: any) => v.id === applicationRecord.selected_variant_id) || variants[0];

  if (!selectedVariantRecord) {
    throw createNotFoundError('Selected variant');
  }

  // Fetch user profile from D1
  const { results: profileResults } = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(userId).all();

  const profileRecord = profileResults[0];

  if (!profileRecord) {
    throw createNotFoundError('User profile');
  }

  // Map to typed objects
  const application: Application = {
    id: applicationRecord.id as string,
    userId: applicationRecord.user_id as string,
    jobId: applicationRecord.job_id as string | undefined,
    jobTitle: applicationRecord.job_title as string,
    company: applicationRecord.company as string,
    status: applicationRecord.status as string,
    createdAt: applicationRecord.created_at as string,
    updatedAt: applicationRecord.updated_at as string,
    submittedAt: applicationRecord.submitted_at as string | undefined,
    variants: [],
    selectedVariantId: applicationRecord.selected_variant_id as string | undefined,
    editHistory: applicationRecord.edit_history ? JSON.parse(applicationRecord.edit_history as string) : [],
  };

  const variant: ApplicationVariant = {
    id: selectedVariantRecord.id,
    name: selectedVariantRecord.name,
    resume: selectedVariantRecord.resume,
    coverLetter: selectedVariantRecord.cover_letter,
    aiRationale: selectedVariantRecord.ai_rationale || [],
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

  // Send email using SendGrid service (Phase 3.6)
  const { sendEmail, generateApplicationEmail } = await import('../services/email');

  // Generate email content
  const resumeText = buildResumeText(variant, profile);
  const emailContent = generateApplicationEmail(
    `${profile.firstName} ${profile.lastName}`,
    profile.email!,
    application.jobTitle,
    application.company,
    variant.coverLetter,
    resumeText
  );

  // Send email
  const result = await sendEmail(c.env, c.env.DB, {
    to: { email: recipientEmail },
    from: {
      email: c.env.SENDGRID_FROM_EMAIL || 'noreply@jobmatch-ai.com',
      name: `${profile.firstName} ${profile.lastName}`,
    },
    replyTo: {
      email: profile.email!,
      name: `${profile.firstName} ${profile.lastName}`,
    },
    subject: emailContent.subject,
    htmlBody: emailContent.htmlBody,
    textBody: emailContent.textBody,
    metadata: {
      userId,
      applicationId: application.id,
      jobTitle: application.jobTitle,
      company: application.company,
    },
  });

  console.log(`[Emails] Email sent successfully: ${result.emailId}`);

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

  // Build query for D1
  let query = 'SELECT * FROM email_history WHERE user_id = ?';
  const params: any[] = [userId];

  if (applicationId) {
    query += ' AND application_id = ?';
    params.push(applicationId);
  }

  query += ' ORDER BY sent_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  // Get emails
  const { results: emails } = await c.env.DB.prepare(query).bind(...params).all();

  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM email_history WHERE user_id = ?';
  const countParams: any[] = [userId];

  if (applicationId) {
    countQuery += ' AND application_id = ?';
    countParams.push(applicationId);
  }

  const { results: countResults } = await c.env.DB.prepare(countQuery).bind(...countParams).all();
  const count = (countResults[0] as any)?.count || 0;

  return c.json({
    emails: emails || [],
    total: count,
    page,
    limit,
    hasMore: count > offset + limit,
  });
});

/**
 * GET /api/emails/remaining
 * Get remaining emails in the current rate limit window
 */
app.get('/remaining', authenticateUser, async (c) => {
  const userId = getUserId(c);

  // Check rate limit without incrementing
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { results: countResults } = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM email_history WHERE user_id = ? AND sent_at >= ?'
  ).bind(userId, oneHourAgo).all();

  const sent = (countResults[0] as any)?.count || 0;
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

export async function sendApplicationEmail(
  env: Env,
  userId: string,
  application: Application,
  variant: ApplicationVariant,
  profile: UserProfile,
  recipientEmail: string,
  db: D1Database
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

  // Log email to D1 database
  const emailId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO email_history (
      id, user_id, application_id, to_address, subject, from_address, from_name,
      status, sent_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      emailId,
      userId,
      application.id,
      recipientEmail,
      subject,
      fromEmail,
      fromName,
      'sent',
      now,
      now
    )
    .run();

  // Update application with last email timestamp
  await db.prepare(
    'UPDATE applications SET last_email_sent_at = ?, updated_at = ? WHERE id = ?'
  )
    .bind(now, now, application.id)
    .run();

  return {
    success: true,
    emailId,
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

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build resume text from variant data (Phase 3.6)
 */
function buildResumeText(variant: ApplicationVariant, profile: UserProfile): string {
  const fullName = `${profile.firstName} ${profile.lastName}`;
  const { resume } = variant;

  const contactParts = [
    profile.email,
    profile.phone,
    profile.location,
    profile.linkedInUrl,
  ].filter(Boolean);
  const contactInfo = contactParts.join(' | ');

  const experienceText = resume.experience
    ?.map((exp) => `
${exp.title}
${exp.company} | ${exp.location || ''}
${exp.startDate} - ${exp.endDate}
${exp.bullets.map((b) => `  • ${b}`).join('\n')}
`)
    .join('\n') || '';

  const educationText = resume.education
    ?.map((edu) => `${edu.degree} - ${edu.school}, ${edu.location || ''} (${edu.graduation})`)
    .join('\n') || '';

  return `
${fullName}
${contactInfo}

PROFESSIONAL SUMMARY
${resume.summary || 'No summary provided.'}

PROFESSIONAL EXPERIENCE
${experienceText}

SKILLS
${resume.skills?.join(' | ') || 'No skills listed.'}

EDUCATION
${educationText}
  `.trim();
}

export default app;
