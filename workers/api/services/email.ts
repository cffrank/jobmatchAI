/**
 * Email Service for Cloudflare Workers
 *
 * Handles email sending via SendGrid with template support.
 *
 * Phase 3.6: SendGrid Email Integration
 * - Application submission emails
 * - Resume sent notifications
 * - Account notifications
 * - Email history tracking in D1
 * - Rate limiting enforcement
 */

import type { Env } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailContent {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface SendEmailOptions {
  to: EmailRecipient;
  from: EmailRecipient;
  replyTo?: EmailRecipient;
  subject: string;
  htmlBody: string;
  textBody: string;
  metadata?: Record<string, string>;
}

export interface SendEmailResult {
  success: boolean;
  emailId: string;
  message: string;
}

// =============================================================================
// Email Templates
// =============================================================================

/**
 * Generate application submission email
 */
export function generateApplicationEmail(
  applicantName: string,
  applicantEmail: string,
  jobTitle: string,
  company: string,
  coverLetter: string,
  resumeText: string
): EmailContent {
  const subject = `Application for ${jobTitle} at ${company}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      border-bottom: 3px solid #0070f3;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .applicant-info {
      margin-bottom: 30px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #0070f3;
      margin-bottom: 15px;
      border-bottom: 1px solid #e5e5e5;
      padding-bottom: 8px;
    }
    .resume-section {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 5px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${subject}</h1>
    <p><strong>From:</strong> ${applicantName}</p>
    <p><strong>Email:</strong> <a href="mailto:${applicantEmail}">${applicantEmail}</a></p>
  </div>

  <div class="section">
    <div class="section-title">Cover Letter</div>
    <div>${coverLetter.replace(/\n/g, '<br>')}</div>
  </div>

  <div class="section resume-section">
    <div class="section-title">Resume</div>
    <div>${resumeText.replace(/\n/g, '<br>')}</div>
  </div>

  <div class="footer">
    <p>This application was sent via JobMatch AI</p>
    <p>Application submitted on ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}</p>
  </div>
</body>
</html>
  `.trim();

  const textBody = `
${subject}

From: ${applicantName}
Email: ${applicantEmail}

================================================================================
COVER LETTER
================================================================================

${coverLetter}

================================================================================
RESUME
================================================================================

${resumeText}

--------------------------------------------------------------------------------
This application was sent via JobMatch AI
Application submitted on ${new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}
  `.trim();

  return {
    subject,
    htmlBody,
    textBody,
  };
}

/**
 * Generate confirmation email for user
 */
export function generateConfirmationEmail(
  applicantName: string,
  jobTitle: string,
  company: string,
  recipientEmail: string
): EmailContent {
  const subject = `Application Submitted: ${jobTitle} at ${company}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .success-banner {
      background: #10b981;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      text-align: center;
    }
    .content {
      margin-bottom: 30px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="success-banner">
    <h1>✓ Application Submitted Successfully</h1>
  </div>

  <div class="content">
    <p>Hi ${applicantName},</p>
    <p>Your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been successfully submitted to:</p>
    <p><strong>${recipientEmail}</strong></p>
    <p>The hiring manager will review your application and contact you if there's interest.</p>
    <p>Good luck with your application!</p>
  </div>

  <div class="footer">
    <p>JobMatch AI - AI-Powered Job Application Platform</p>
    <p>Submitted on ${new Date().toLocaleString('en-US')}</p>
  </div>
</body>
</html>
  `.trim();

  const textBody = `
APPLICATION SUBMITTED SUCCESSFULLY

Hi ${applicantName},

Your application for ${jobTitle} at ${company} has been successfully submitted to:

${recipientEmail}

The hiring manager will review your application and contact you if there's interest.

Good luck with your application!

--
JobMatch AI - AI-Powered Job Application Platform
Submitted on ${new Date().toLocaleString('en-US')}
  `.trim();

  return {
    subject,
    htmlBody,
    textBody,
  };
}

// =============================================================================
// SendGrid API Integration
// =============================================================================

/**
 * Send email via SendGrid
 *
 * Handles email sending with error handling and retry logic.
 * Stores email history in D1 for tracking and analytics.
 */
export async function sendEmail(
  env: Env,
  db: D1Database,
  options: SendEmailOptions
): Promise<SendEmailResult> {
  console.log(`[Email] Sending email to: ${options.to.email}`);

  if (!env.SENDGRID_API_KEY) {
    throw new Error('SendGrid API key not configured');
  }

  try {
    // Prepare SendGrid request
    const sendGridRequest = {
      personalizations: [
        {
          to: [{ email: options.to.email, name: options.to.name }],
        },
      ],
      from: {
        email: options.from.email,
        name: options.from.name || 'JobMatch AI',
      },
      reply_to: options.replyTo
        ? {
            email: options.replyTo.email,
            name: options.replyTo.name,
          }
        : undefined,
      subject: options.subject,
      content: [
        { type: 'text/plain', value: options.textBody },
        { type: 'text/html', value: options.htmlBody },
      ],
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true },
      },
      custom_args: options.metadata || {},
    };

    // Send via SendGrid API
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendGridRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Email] SendGrid API error:', errorText);
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
    }

    // Get SendGrid message ID from headers
    const messageId =
      response.headers.get('X-Message-Id') || crypto.randomUUID();

    console.log(`[Email] Email sent successfully. Message ID: ${messageId}`);

    // Save email history to D1
    await saveEmailHistory(db, {
      messageId,
      recipientEmail: options.to.email,
      recipientName: options.to.name,
      subject: options.subject,
      fromEmail: options.from.email,
      fromName: options.from.name,
      status: 'sent',
      sentAt: new Date().toISOString(),
      metadata: options.metadata,
    });

    return {
      success: true,
      emailId: messageId,
      message: 'Email sent successfully',
    };
  } catch (error) {
    console.error('[Email] Failed to send email:', error);

    // Save failed email attempt to D1
    await saveEmailHistory(db, {
      messageId: crypto.randomUUID(),
      recipientEmail: options.to.email,
      recipientName: options.to.name,
      subject: options.subject,
      fromEmail: options.from.email,
      fromName: options.from.name,
      status: 'failed',
      sentAt: new Date().toISOString(),
      metadata: {
        ...options.metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

// =============================================================================
// Email History (D1 Storage)
// =============================================================================

interface EmailHistoryRecord {
  messageId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  fromEmail: string;
  fromName?: string;
  status: 'sent' | 'failed' | 'bounced' | 'delivered';
  sentAt: string;
  metadata?: Record<string, string>;
}

/**
 * Save email history to D1
 */
async function saveEmailHistory(
  db: D1Database,
  record: EmailHistoryRecord
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO email_history
         (id, recipient_email, recipient_name, subject, from_email, from_name, status, sent_at, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        record.messageId,
        record.recipientEmail,
        record.recipientName || null,
        record.subject,
        record.fromEmail,
        record.fromName || null,
        record.status,
        record.sentAt,
        JSON.stringify(record.metadata || {}),
        new Date().toISOString()
      )
      .run();

    console.log(`[Email] Saved email history: ${record.messageId}`);
  } catch (error) {
    console.error('[Email] Failed to save email history:', error);
    // Don't throw - email was sent successfully even if logging failed
  }
}

/**
 * Get email history for user
 */
export async function getEmailHistory(
  db: D1Database,
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}
): Promise<EmailHistoryRecord[]> {
  const { limit = 20, offset = 0, status } = options;

  let query = `
    SELECT *
    FROM email_history
    WHERE json_extract(metadata, '$.userId') = ?
  `;

  const params: (string | number)[] = [userId];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  query += ` ORDER BY sent_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await db.prepare(query).bind(...params).all();

  return (result.results || []).map((row) => ({
    messageId: row.id as string,
    recipientEmail: row.recipient_email as string,
    recipientName: row.recipient_name as string | undefined,
    subject: row.subject as string,
    fromEmail: row.from_email as string,
    fromName: row.from_name as string | undefined,
    status: row.status as 'sent' | 'failed' | 'bounced' | 'delivered',
    sentAt: row.sent_at as string,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
  }));
}

/**
 * Check if SendGrid is configured
 */
export function isSendGridConfigured(env: Env): boolean {
  return !!env.SENDGRID_API_KEY && !!env.SENDGRID_FROM_EMAIL;
}
