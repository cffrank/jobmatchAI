/**
 * Notification Service
 *
 * Handles sending notifications to users about high-quality job matches.
 * Features:
 * - Email notifications for high-match jobs (score > 80)
 * - Daily digest emails
 * - Rate limiting (max 1 email per day per user)
 * - In-app notifications
 */

const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
const initSendGrid = () => {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY environment variable is not set');
  }
  sgMail.setApiKey(apiKey);
};

// =============================================================================
// Email Templates
// =============================================================================

/**
 * Generate high-match job notification email HTML
 */
function generateHighMatchEmailHTML(userName, job, matchScore, breakdown) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Job Match</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .match-score { background: rgba(255,255,255,0.2); display: inline-block; padding: 8px 16px; border-radius: 20px; margin-top: 10px; font-size: 18px; font-weight: 600; }
    .content { padding: 30px 20px; }
    .job-title { font-size: 22px; font-weight: 600; color: #1a1a1a; margin: 0 0 8px 0; }
    .job-company { font-size: 16px; color: #666; margin: 0 0 16px 0; }
    .job-details { background: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0; }
    .job-detail { display: flex; margin: 8px 0; }
    .job-detail-label { font-weight: 600; width: 120px; color: #555; }
    .job-detail-value { color: #333; }
    .breakdown { margin: 24px 0; }
    .breakdown-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .breakdown-item:last-child { border-bottom: none; }
    .breakdown-label { font-weight: 500; color: #374151; }
    .breakdown-score { font-weight: 600; color: #84cc16; }
    .cta-button { display: inline-block; background: #84cc16; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .cta-button:hover { background: #65a30d; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 New High-Match Job Found!</h1>
      <div class="match-score">${matchScore}% Match</div>
    </div>

    <div class="content">
      <p>Hi ${userName},</p>
      <p>Great news! We found a job that's an excellent match for your profile.</p>

      <h2 class="job-title">${job.title}</h2>
      <p class="job-company">${job.company}</p>

      <div class="job-details">
        <div class="job-detail">
          <span class="job-detail-label">Location:</span>
          <span class="job-detail-value">${job.location}</span>
        </div>
        <div class="job-detail">
          <span class="job-detail-label">Work Type:</span>
          <span class="job-detail-value">${job.workArrangement}</span>
        </div>
        ${job.salaryMin && job.salaryMax ? `
        <div class="job-detail">
          <span class="job-detail-label">Salary:</span>
          <span class="job-detail-value">$${(job.salaryMin / 1000).toFixed(0)}k - $${(job.salaryMax / 1000).toFixed(0)}k</span>
        </div>
        ` : ''}
        <div class="job-detail">
          <span class="job-detail-label">Posted:</span>
          <span class="job-detail-value">${formatDate(job.postedDate)}</span>
        </div>
      </div>

      <div class="breakdown">
        <h3 style="margin: 0 0 16px 0; color: #1a1a1a;">Match Breakdown:</h3>
        <div class="breakdown-item">
          <span class="breakdown-label">Skills Match</span>
          <span class="breakdown-score">${breakdown.skills.score}%</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">Experience Match</span>
          <span class="breakdown-score">${breakdown.experience.score}%</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">Location Match</span>
          <span class="breakdown-score">${breakdown.location.score}%</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">Salary Match</span>
          <span class="breakdown-score">${breakdown.salary.score}%</span>
        </div>
      </div>

      <center>
        <a href="${process.env.APP_URL || 'https://jobmatch-ai.web.app'}/jobs/${job.id}" class="cta-button">
          View Job Details
        </a>
      </center>

      <p style="color: #666; font-size: 14px; margin-top: 24px;">
        This job matches your preferences and profile. Review the full details and apply when you're ready!
      </p>
    </div>

    <div class="footer">
      <p>You're receiving this because you have job search notifications enabled.</p>
      <p><a href="${process.env.APP_URL || 'https://jobmatch-ai.web.app'}/settings" style="color: #84cc16;">Manage notification preferences</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate daily digest email HTML
 */
function generateDailyDigestEmailHTML(userName, jobs, totalNewJobs) {
  const topJobs = jobs.slice(0, 5); // Show top 5 jobs

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Job Digest</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .stats { background: rgba(255,255,255,0.2); display: inline-block; padding: 8px 16px; border-radius: 20px; margin-top: 10px; font-size: 16px; }
    .content { padding: 30px 20px; }
    .job-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .job-card:hover { border-color: #84cc16; }
    .job-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; }
    .job-title { font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0; }
    .match-badge { background: #84cc16; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; }
    .job-company { color: #666; margin: 4px 0; }
    .job-meta { color: #999; font-size: 14px; }
    .view-button { display: inline-block; background: #f3f4f6; color: #374151; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500; margin-top: 12px; }
    .view-button:hover { background: #e5e7eb; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📬 Your Daily Job Digest</h1>
      <div class="stats">${totalNewJobs} new ${totalNewJobs === 1 ? 'job' : 'jobs'} found</div>
    </div>

    <div class="content">
      <p>Hi ${userName},</p>
      <p>Here are today's top job matches based on your profile and preferences:</p>

      ${topJobs.map(job => `
        <div class="job-card">
          <div class="job-header">
            <div>
              <h3 class="job-title">${job.title}</h3>
              <p class="job-company">${job.company}</p>
            </div>
            <span class="match-badge">${job.matchScore}%</span>
          </div>
          <p class="job-meta">📍 ${job.location} • ${job.workArrangement} • Posted ${formatDate(job.postedDate)}</p>
          <a href="${process.env.APP_URL || 'https://jobmatch-ai.web.app'}/jobs/${job.id}" class="view-button">View Details</a>
        </div>
      `).join('')}

      ${totalNewJobs > 5 ? `
        <p style="text-align: center; margin-top: 24px;">
          <a href="${process.env.APP_URL || 'https://jobmatch-ai.web.app'}/jobs" style="color: #84cc16; font-weight: 600;">
            View all ${totalNewJobs} jobs →
          </a>
        </p>
      ` : ''}
    </div>

    <div class="footer">
      <p>You're receiving daily job digests based on your preferences.</p>
      <p><a href="${process.env.APP_URL || 'https://jobmatch-ai.web.app'}/settings" style="color: #84cc16;">Manage notification preferences</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(dateString) {
  if (!dateString) return 'Recently';

  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

// =============================================================================
// Rate Limiting
// =============================================================================

/**
 * Check if user can receive an email (rate limiting)
 */
async function canSendEmail(userId, emailType = 'general') {
  const db = admin.firestore();
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Check recent emails
  const recentEmails = await db
    .collection('users')
    .doc(userId)
    .collection('emails')
    .where('type', '==', emailType)
    .where('sentAt', '>', oneDayAgo)
    .limit(1)
    .get();

  return recentEmails.empty;
}

/**
 * Log email sent
 */
async function logEmailSent(userId, emailType, jobIds = []) {
  const db = admin.firestore();

  await db
    .collection('users')
    .doc(userId)
    .collection('emails')
    .add({
      type: emailType,
      jobIds,
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });
}

// =============================================================================
// Notification Functions
// =============================================================================

/**
 * Send high-match job notification
 */
async function sendHighMatchNotification(userId, job, matchData) {
  const db = admin.firestore();

  try {
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.error(`User ${userId} not found`);
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();

    // Check notification preferences
    const notificationPrefs = userData.searchSettings?.notificationPreferences || {};
    const matchThreshold = notificationPrefs.matchScoreThreshold || 80;

    if (matchData.matchScore < matchThreshold) {
      return { success: false, error: 'Match score below threshold' };
    }

    // Send in-app notification if enabled
    if (notificationPrefs.inApp !== false) {
      await db
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .add({
          type: 'high_match_job',
          title: 'New High-Match Job!',
          message: `${job.title} at ${job.company} - ${matchData.matchScore}% match`,
          jobId: job.id,
          matchScore: matchData.matchScore,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    // Send email if enabled
    if (notificationPrefs.email !== false) {
      // Check rate limiting
      const canSend = await canSendEmail(userId, 'high_match');

      if (!canSend) {
        console.log(`Rate limit exceeded for user ${userId}, skipping email`);
        return { success: true, emailSent: false, reason: 'rate_limited' };
      }

      // Send email
      initSendGrid();

      const msg = {
        to: userData.email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'notifications@jobmatch-ai.com',
          name: 'JobMatch AI'
        },
        subject: `🎯 ${matchData.matchScore}% Match: ${job.title} at ${job.company}`,
        html: generateHighMatchEmailHTML(
          userData.firstName,
          job,
          matchData.matchScore,
          matchData.breakdown
        )
      };

      await sgMail.send(msg);

      // Log email sent
      await logEmailSent(userId, 'high_match', [job.id]);

      return { success: true, emailSent: true };
    }

    return { success: true, emailSent: false };

  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Send daily digest email
 */
async function sendDailyDigest(userId, jobs) {
  const db = admin.firestore();

  try {
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.error(`User ${userId} not found`);
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();

    // Check notification preferences
    const notificationPrefs = userData.searchSettings?.notificationPreferences || {};

    if (notificationPrefs.email === false) {
      return { success: false, error: 'Email notifications disabled' };
    }

    // Check rate limiting (once per day for digest)
    const canSend = await canSendEmail(userId, 'daily_digest');

    if (!canSend) {
      console.log(`Daily digest already sent to user ${userId}`);
      return { success: false, error: 'Already sent today' };
    }

    // Don't send if no jobs
    if (!jobs || jobs.length === 0) {
      return { success: false, error: 'No jobs to send' };
    }

    // Send email
    initSendGrid();

    const msg = {
      to: userData.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'notifications@jobmatch-ai.com',
        name: 'JobMatch AI'
      },
      subject: `📬 ${jobs.length} New Job ${jobs.length === 1 ? 'Match' : 'Matches'} for You`,
      html: generateDailyDigestEmailHTML(userData.firstName, jobs, jobs.length)
    };

    await sgMail.send(msg);

    // Log email sent
    await logEmailSent(userId, 'daily_digest', jobs.map(j => j.id));

    return { success: true, jobCount: jobs.length };

  } catch (error) {
    console.error(`Error sending daily digest to user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Queue notification for later processing
 * Useful for batch processing
 */
async function queueNotification(userId, jobId, matchData) {
  const db = admin.firestore();

  await db.collection('notificationQueue').add({
    userId,
    jobId,
    matchData,
    type: 'high_match',
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    processedAt: null
  });
}

/**
 * Process notification queue
 * Should be called by a scheduled function
 */
async function processNotificationQueue(batchSize = 50) {
  const db = admin.firestore();

  const queuedNotifications = await db
    .collection('notificationQueue')
    .where('status', '==', 'pending')
    .limit(batchSize)
    .get();

  const results = [];

  for (const doc of queuedNotifications.docs) {
    const notification = doc.data();

    try {
      // Get job data
      const jobDoc = await db
        .collection('users')
        .doc(notification.userId)
        .collection('jobs')
        .doc(notification.jobId)
        .get();

      if (!jobDoc.exists) {
        await doc.ref.update({ status: 'failed', error: 'Job not found' });
        continue;
      }

      const job = { id: jobDoc.id, ...jobDoc.data() };

      // Send notification
      const result = await sendHighMatchNotification(
        notification.userId,
        job,
        notification.matchData
      );

      // Update queue status
      await doc.ref.update({
        status: result.success ? 'completed' : 'failed',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        result
      });

      results.push({ id: doc.id, success: result.success });

    } catch (error) {
      console.error(`Error processing notification ${doc.id}:`, error);
      await doc.ref.update({
        status: 'failed',
        error: error.message,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      results.push({ id: doc.id, success: false, error: error.message });
    }
  }

  return results;
}

module.exports = {
  sendHighMatchNotification,
  sendDailyDigest,
  queueNotification,
  processNotificationQueue,
  canSendEmail
};
