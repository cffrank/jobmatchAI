/**
 * SendGrid Email Service
 *
 * Handles email sending for job applications with:
 * - Professional HTML templates
 * - Cover letter and resume formatting
 * - Email tracking (opens, clicks)
 * - Email history logging
 */

import sgMail from '@sendgrid/mail';
import { supabaseAdmin, TABLES } from '../config/supabase';
import type { Application, ApplicationVariant, UserProfile } from '../types';

// =============================================================================
// Configuration
// =============================================================================

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@jobmatch-ai.com';

// Initialize SendGrid
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// =============================================================================
// Email Sending
// =============================================================================

interface SendEmailParams {
  userId: string;
  application: Application;
  variant: ApplicationVariant;
  profile: UserProfile;
  recipientEmail: string;
}

interface SendEmailResult {
  success: boolean;
  emailId: string;
  message: string;
}

/**
 * Send application email with resume and cover letter
 */
export async function sendApplicationEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { userId, application, variant, profile, recipientEmail } = params;

  if (!SENDGRID_API_KEY) {
    throw new Error('SendGrid API key is not configured');
  }

  // Build email content
  const subject = `Application for ${application.jobTitle} at ${application.company}`;
  const fromName =
    `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'JobMatch AI User';
  const fromEmail = profile.email || SENDGRID_FROM_EMAIL;

  const htmlBody = buildHtmlEmail(variant, profile, fromName, fromEmail, subject);
  const textBody = buildTextEmail(variant, profile, fromName, fromEmail);

  // Send email via SendGrid
  const msg = {
    to: recipientEmail,
    from: {
      email: SENDGRID_FROM_EMAIL,
      name: fromName,
    },
    replyTo: fromEmail,
    subject,
    text: textBody,
    html: htmlBody,
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true },
    },
    customArgs: {
      applicationId: application.id,
      userId,
    },
  };

  await sgMail.send(msg);

  // Log email to database
  const emailId = await logEmailHistory(userId, application.id, recipientEmail, subject, fromEmail, fromName);

  return {
    success: true,
    emailId,
    message: 'Email sent successfully',
  };
}

// =============================================================================
// Email History Logging
// =============================================================================

async function logEmailHistory(
  userId: string,
  applicationId: string,
  recipientEmail: string,
  subject: string,
  fromEmail: string,
  fromName: string
): Promise<string> {
  // Insert email record
  const { data, error } = await supabaseAdmin
    .from(TABLES.EMAILS)
    .insert({
      user_id: userId,
      application_id: applicationId,
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
    console.error('Failed to log email history:', error);
    throw error;
  }

  // Update application with last email timestamp
  await supabaseAdmin
    .from(TABLES.APPLICATIONS)
    .update({
      last_email_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  return data.id;
}

// =============================================================================
// Email Template Builders
// =============================================================================

function buildHtmlEmail(
  variant: ApplicationVariant,
  profile: UserProfile,
  fromName: string,
  fromEmail: string,
  subject: string
): string {
  const coverLetterHtml = textToHtml(variant.coverLetter);
  const resumeHtml = formatResumeAsHtml(variant.resume);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

    <!-- Cover Letter -->
    <div style="margin-bottom: 40px;">
      <h2 style="color: #1f2937; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">Cover Letter</h2>
      ${coverLetterHtml}
    </div>

    <!-- Resume -->
    <div style="margin-bottom: 40px;">
      <h2 style="color: #1f2937; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">Resume</h2>
      ${resumeHtml}
    </div>

    <!-- Signature -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
      <p style="margin: 0 0 12px 0; font-weight: bold; font-size: 16px;">${sanitizeHtml(fromName)}</p>
      <p style="margin: 0 0 4px 0; color: #6b7280;">Email: ${sanitizeHtml(fromEmail)}</p>
      ${profile.phone ? `<p style="margin: 0 0 4px 0; color: #6b7280;">Phone: ${sanitizeHtml(profile.phone)}</p>` : ''}
      ${profile.linkedInUrl ? `<p style="margin: 0 0 4px 0;"><a href="${sanitizeHtml(profile.linkedInUrl)}" style="color: #2563eb; text-decoration: none;">LinkedIn Profile</a></p>` : ''}
    </div>

  </div>

  <!-- Footer -->
  <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af;">
    <p style="margin: 0;">Sent via JobMatch AI - Application Tracking System</p>
  </div>
</body>
</html>
  `.trim();
}

function buildTextEmail(
  variant: ApplicationVariant,
  profile: UserProfile,
  fromName: string,
  fromEmail: string
): string {
  const { resume } = variant;

  const experienceText = resume.experience
    .map(
      (exp) =>
        `${exp.title} at ${exp.company}\n${exp.startDate} - ${exp.endDate}\n${exp.bullets.join('\n')}`
    )
    .join('\n\n');

  const educationText = resume.education
    .map((edu) => `${edu.degree} - ${edu.school} (${edu.graduation})`)
    .join('\n');

  return `
Cover Letter:

${variant.coverLetter}

---

Resume:

${resume.summary}

Experience:
${experienceText}

Skills: ${resume.skills.join(', ')}

Education:
${educationText}

---

${fromName}
${fromEmail}
${profile.phone || ''}
${profile.linkedInUrl || ''}
  `.trim();
}

// =============================================================================
// HTML Formatting Helpers
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

function textToHtml(text: string): string {
  if (!text) return '';
  return text
    .split('\n\n')
    .map((paragraph) => `<p style="margin-bottom: 1em;">${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

interface ResumeContent {
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }>;
  skills: string[];
  education: Array<{
    degree: string;
    school: string;
    location: string;
    graduation: string;
    focus?: string;
  }>;
}

function formatResumeAsHtml(resume: ResumeContent): string {
  let html = '<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">';

  // Summary
  if (resume.summary) {
    html += `<div style="margin-bottom: 20px;">
      <h3 style="color: #2563eb; margin-bottom: 8px;">Professional Summary</h3>
      <p style="margin: 0;">${sanitizeHtml(resume.summary)}</p>
    </div>`;
  }

  // Experience
  if (resume.experience && resume.experience.length > 0) {
    html +=
      '<div style="margin-bottom: 20px;"><h3 style="color: #2563eb; margin-bottom: 8px;">Experience</h3>';
    resume.experience.forEach((exp) => {
      html += `<div style="margin-bottom: 16px;">
        <div style="font-weight: bold; font-size: 16px;">${sanitizeHtml(exp.title)}</div>
        <div style="color: #666; margin-bottom: 4px;">${sanitizeHtml(exp.company)} | ${sanitizeHtml(exp.location)}</div>
        <div style="color: #666; font-size: 14px; margin-bottom: 8px;">${sanitizeHtml(exp.startDate)} - ${sanitizeHtml(exp.endDate)}</div>
        <ul style="margin: 0; padding-left: 20px;">
          ${exp.bullets.map((bullet) => `<li style="margin-bottom: 4px;">${sanitizeHtml(bullet)}</li>`).join('')}
        </ul>
      </div>`;
    });
    html += '</div>';
  }

  // Skills
  if (resume.skills && resume.skills.length > 0) {
    html += `<div style="margin-bottom: 20px;">
      <h3 style="color: #2563eb; margin-bottom: 8px;">Skills</h3>
      <p style="margin: 0;">${resume.skills.map((s) => sanitizeHtml(s)).join(' | ')}</p>
    </div>`;
  }

  // Education
  if (resume.education && resume.education.length > 0) {
    html +=
      '<div style="margin-bottom: 20px;"><h3 style="color: #2563eb; margin-bottom: 8px;">Education</h3>';
    resume.education.forEach((edu) => {
      html += `<div style="margin-bottom: 12px;">
        <div style="font-weight: bold;">${sanitizeHtml(edu.degree)}</div>
        <div style="color: #666;">${sanitizeHtml(edu.school)} | ${sanitizeHtml(edu.location)}</div>
        <div style="color: #666; font-size: 14px;">${sanitizeHtml(edu.graduation)}</div>
        ${edu.focus ? `<div style="font-size: 14px; margin-top: 4px;">Focus: ${sanitizeHtml(edu.focus)}</div>` : ''}
      </div>`;
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
}

// =============================================================================
// Email Validation
// =============================================================================

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if SendGrid is configured
 */
export function isSendGridConfigured(): boolean {
  return !!SENDGRID_API_KEY;
}
