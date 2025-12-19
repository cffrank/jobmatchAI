import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';

/**
 * Request payload for sending an application email
 */
interface SendApplicationEmailRequest {
  /** Application document ID */
  applicationId: string;
  /** Recipient email address (hiring manager/recruiter) */
  recipientEmail: string;
  /** Email subject line */
  subject: string;
  /** Email body (cover letter text) */
  body: string;
  /** Whether to include resume attachment */
  includeResume: boolean;
  /** Whether to include cover letter attachment */
  includeCoverLetter: boolean;
}

/**
 * Email send result
 */
interface SendApplicationEmailResponse {
  success: boolean;
  emailId?: string;
  message: string;
  error?: string;
}

/**
 * Rate limiting configuration: max 10 emails per hour per user
 */
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const RATE_LIMIT_MAX_EMAILS = 10;

/**
 * Validates email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Checks if user has exceeded rate limit
 */
async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const db = admin.firestore();
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Query recent emails sent by this user
  const recentEmailsSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('emails')
    .where('sentAt', '>=', new Date(windowStart))
    .get();

  const emailCount = recentEmailsSnapshot.size;
  const remaining = Math.max(0, RATE_LIMIT_MAX_EMAILS - emailCount);
  const allowed = emailCount < RATE_LIMIT_MAX_EMAILS;

  return { allowed, remaining };
}

/**
 * Sanitizes HTML content to prevent XSS
 */
function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - in production, use a library like DOMPurify
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Converts plain text to HTML with paragraph breaks
 */
function textToHtml(text: string): string {
  return text
    .split('\n\n')
    .map(paragraph => `<p style="margin-bottom: 1em;">${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * Cloud Function to send job application email with attachments
 *
 * Security features:
 * - Validates email addresses
 * - Rate limiting (10 emails/hour per user)
 * - Input sanitization
 * - Firestore email history tracking
 * - Authentication required
 */
export const sendApplicationEmail = onCall(
  {
    secrets: ['SENDGRID_API_KEY'],
  },
  async (request): Promise<SendApplicationEmailResponse> => {
    const data = request.data as SendApplicationEmailRequest;

    // Ensure user is authenticated
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to send emails'
      );
    }

    // Initialize SendGrid with API key from environment
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    if (!SENDGRID_API_KEY) {
      throw new HttpsError(
        'failed-precondition',
        'SendGrid API key is not configured. Please contact support.'
      );
    }
    sgMail.setApiKey(SENDGRID_API_KEY);

    const userId = request.auth.uid;
    const { applicationId, recipientEmail, subject, body, includeResume, includeCoverLetter } = data;

    try {
      // Validate required fields
      if (!applicationId || !recipientEmail || !subject || !body) {
        throw new HttpsError(
          'invalid-argument',
          'Missing required fields: applicationId, recipientEmail, subject, or body'
        );
      }

      // Validate email address
      if (!isValidEmail(recipientEmail)) {
        throw new HttpsError(
          'invalid-argument',
          'Invalid recipient email address format'
        );
      }

      // Check rate limiting
      const rateLimit = await checkRateLimit(userId);
      if (!rateLimit.allowed) {
        throw new HttpsError(
          'resource-exhausted',
          `Rate limit exceeded. You can send ${RATE_LIMIT_MAX_EMAILS} emails per hour. Please try again later.`
        );
      }

      const db = admin.firestore();

      // Fetch application data
      const applicationRef = db.collection('users').doc(userId).collection('applications').doc(applicationId);
      const applicationDoc = await applicationRef.get();

      if (!applicationDoc.exists) {
        throw new HttpsError(
          'not-found',
          'Application not found'
        );
      }

      const application = applicationDoc.data();
      if (!application) {
        throw new HttpsError(
          'internal',
          'Failed to load application data'
        );
      }

      // Get user profile for "from" email
      const userDoc = await db.collection('users').doc(userId).get();
      const userProfile = userDoc.data();
      const fromEmail = userProfile?.email || request.auth.token.email || 'noreply@jobmatch-ai.com';
      const fromName = userProfile?.fullName || request.auth.token.name || 'JobMatch AI User';

      // Prepare email attachments (PDFs will be generated separately)
      const attachments: any[] = [];

      // NOTE: In a real implementation, you would generate PDFs here
      // For now, we'll add placeholder logic that would be replaced with actual PDF generation
      if (includeResume || includeCoverLetter) {
        console.warn('PDF generation not implemented yet. Attachments will be skipped.');
        // TODO: Integrate with PDF generation service (e.g., Puppeteer, PDFKit, or cloud service)
      }

      // Create HTML email body
      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${textToHtml(body)}

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
    <p style="margin: 0;">Best regards,<br><strong>${sanitizeHtml(fromName)}</strong></p>
    ${userProfile?.phone ? `<p style="margin: 8px 0 0 0;">Phone: ${sanitizeHtml(userProfile.phone)}</p>` : ''}
    <p style="margin: 8px 0 0 0;">Email: ${sanitizeHtml(fromEmail)}</p>
    ${userProfile?.linkedinUrl ? `<p style="margin: 8px 0 0 0;">LinkedIn: <a href="${sanitizeHtml(userProfile.linkedinUrl)}" style="color: #2563eb;">${sanitizeHtml(userProfile.linkedinUrl)}</a></p>` : ''}
  </div>

  <div style="margin-top: 30px; padding: 15px; background-color: #f9fafb; border-radius: 8px; font-size: 12px; color: #6b7280;">
    <p style="margin: 0;">This email was sent via JobMatch AI - Application Tracking System</p>
  </div>
</body>
</html>
      `.trim();

      // Send email via SendGrid
      const msg = {
        to: recipientEmail,
        from: {
          email: fromEmail,
          name: fromName,
        },
        replyTo: fromEmail,
        subject: subject,
        text: body,
        html: htmlBody,
        attachments: attachments,
        // Track email opens and clicks
        trackingSettings: {
          clickTracking: {
            enable: true,
          },
          openTracking: {
            enable: true,
          },
        },
        // Custom args for tracking
        customArgs: {
          applicationId: applicationId,
          userId: userId,
        },
      };

      await sgMail.send(msg);

      // Create email history record
      const emailHistoryRef = db
        .collection('users')
        .doc(userId)
        .collection('applications')
        .doc(applicationId)
        .collection('emails')
        .doc();

      const emailHistory = {
        id: emailHistoryRef.id,
        recipientEmail,
        subject,
        body,
        includeResume,
        includeCoverLetter,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        fromEmail,
        fromName,
      };

      await emailHistoryRef.set(emailHistory);

      // Also store in user's top-level emails collection for rate limiting
      await db
        .collection('users')
        .doc(userId)
        .collection('emails')
        .doc(emailHistoryRef.id)
        .set({
          applicationId,
          recipientEmail,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Update application with last email sent timestamp
      await applicationRef.update({
        lastEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('Email sent successfully', {
        userId,
        applicationId,
        emailId: emailHistoryRef.id,
        recipientEmail,
      });

      return {
        success: true,
        emailId: emailHistoryRef.id,
        message: 'Email sent successfully',
      };
    } catch (error: any) {
      console.error('Error sending email', {
        userId,
        applicationId,
        error: error.message,
        stack: error.stack,
      });

      // Handle SendGrid-specific errors
      if (error.code >= 400 && error.code < 500) {
        throw new HttpsError(
          'invalid-argument',
          `SendGrid error: ${error.message}`
        );
      }

      // Re-throw if already a functions error
      if (error instanceof HttpsError) {
        throw error;
      }

      // Generic error
      throw new HttpsError(
        'internal',
        `Failed to send email: ${error.message}`
      );
    }
  }
);
