/**
 * Scheduled Jobs
 *
 * Background tasks that run on a schedule using node-cron.
 *
 * Jobs:
 * - cleanupOldJobs: Archive jobs older than 90 days (daily at 3 AM)
 * - cleanupExpiredSessions: Delete expired rate limit records (hourly)
 * - cleanupOAuthStates: Delete expired OAuth state tokens (hourly)
 * - searchJobsForUsers: Scrape jobs for users with auto-search enabled (daily at 2 AM)
 */

import cron from 'node-cron';
import { supabaseAdmin, TABLES } from '../config/supabase';
import { cleanupExpiredRateLimits } from '../middleware/rateLimiter';
import { scrapeJobs, isApifyConfigured } from '../services/jobScraper.service';
import { cleanupOldFailedLogins, cleanupExpiredLockouts } from '../middleware/loginProtection';

// =============================================================================
// Configuration
// =============================================================================

const JOBS_ARCHIVE_DAYS = 90;
const BATCH_SIZE = 10;
const HIGH_MATCH_THRESHOLD = 80;

// =============================================================================
// Job Definitions
// =============================================================================

interface ScheduledJobResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Archive jobs older than configured days
 * Runs daily at 3:00 AM
 */
async function cleanupOldJobs(): Promise<ScheduledJobResult> {
  console.log('[CRON] Starting job cleanup...');

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - JOBS_ARCHIVE_DAYS);

    const { data, error } = await supabaseAdmin
      .from(TABLES.JOBS)
      .update({
        archived: true,
        updated_at: new Date().toISOString(),
      })
      .lt('created_at', cutoffDate.toISOString())
      .eq('archived', false)
      .select('id');

    if (error) {
      console.error('[CRON] Job cleanup failed:', error);
      return { success: false, message: `Failed: ${error.message}` };
    }

    const archivedCount = data?.length || 0;
    console.log(`[CRON] Archived ${archivedCount} jobs older than ${JOBS_ARCHIVE_DAYS} days`);

    return {
      success: true,
      message: `Archived ${archivedCount} jobs`,
      details: { archivedCount, cutoffDate: cutoffDate.toISOString() },
    };
  } catch (error) {
    console.error('[CRON] Job cleanup error:', error);
    return { success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown'}` };
  }
}

/**
 * Cleanup expired OAuth state tokens
 * Runs hourly
 */
async function cleanupOAuthStates(): Promise<ScheduledJobResult> {
  console.log('[CRON] Starting OAuth state cleanup...');

  try {
    const { data, error } = await supabaseAdmin
      .from(TABLES.OAUTH_STATES)
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('[CRON] OAuth state cleanup failed:', error);
      return { success: false, message: `Failed: ${error.message}` };
    }

    const deletedCount = data?.length || 0;
    console.log(`[CRON] Deleted ${deletedCount} expired OAuth states`);

    return {
      success: true,
      message: `Deleted ${deletedCount} expired states`,
      details: { deletedCount },
    };
  } catch (error) {
    console.error('[CRON] OAuth state cleanup error:', error);
    return { success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown'}` };
  }
}

/**
 * Cleanup expired rate limit records
 * Runs hourly
 */
async function cleanupRateLimits(): Promise<ScheduledJobResult> {
  console.log('[CRON] Starting rate limit cleanup...');

  try {
    const deletedCount = await cleanupExpiredRateLimits();
    console.log(`[CRON] Deleted ${deletedCount} expired rate limit records`);

    return {
      success: true,
      message: `Deleted ${deletedCount} rate limit records`,
      details: { deletedCount },
    };
  } catch (error) {
    console.error('[CRON] Rate limit cleanup error:', error);
    return { success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown'}` };
  }
}

/**
 * SEC-004: Cleanup old failed login attempts (older than 24 hours)
 * Runs hourly
 */
async function cleanupFailedLogins(): Promise<ScheduledJobResult> {
  console.log('[CRON] [SEC-004] Starting failed login cleanup...');

  try {
    const deletedCount = await cleanupOldFailedLogins();
    console.log(`[CRON] [SEC-004] Deleted ${deletedCount} old failed login attempts`);

    return {
      success: true,
      message: `Deleted ${deletedCount} old failed login attempts`,
      details: { deletedCount },
    };
  } catch (error) {
    console.error('[CRON] [SEC-004] Failed login cleanup error:', error);
    return { success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown'}` };
  }
}

/**
 * SEC-004: Auto-unlock accounts after lockout period expires
 * Runs every 15 minutes
 */
async function unlockExpiredAccounts(): Promise<ScheduledJobResult> {
  console.log('[CRON] [SEC-004] Starting expired lockout cleanup...');

  try {
    const unlockedCount = await cleanupExpiredLockouts();
    console.log(`[CRON] [SEC-004] Auto-unlocked ${unlockedCount} expired account lockouts`);

    return {
      success: true,
      message: `Auto-unlocked ${unlockedCount} accounts`,
      details: { unlockedCount },
    };
  } catch (error) {
    console.error('[CRON] [SEC-004] Expired lockout cleanup error:', error);
    return { success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown'}` };
  }
}

/**
 * Search jobs for all users with auto-search enabled
 * Runs daily at 2:00 AM
 */
async function searchJobsForAllUsers(): Promise<ScheduledJobResult> {
  console.log('[CRON] Starting automated job search...');

  if (!isApifyConfigured()) {
    console.warn('[CRON] Apify not configured, skipping job search');
    return { success: false, message: 'Apify not configured' };
  }

  try {
    // Fetch users with auto-search enabled
    const { data: users, error: usersError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id')
      .eq('auto_search_enabled', true);

    if (usersError) {
      console.error('[CRON] Failed to fetch users:', usersError);
      return { success: false, message: `Failed to fetch users: ${usersError.message}` };
    }

    if (!users || users.length === 0) {
      console.log('[CRON] No users with auto-search enabled');
      return { success: true, message: 'No users to process', details: { userCount: 0 } };
    }

    console.log(`[CRON] Processing ${users.length} users...`);

    const results = {
      total: users.length,
      successful: 0,
      failed: 0,
      totalJobs: 0,
    };

    // Process users in batches
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (user) => {
          try {
            // Get user's job preferences
            const { data: preferences } = await supabaseAdmin
              .from(TABLES.JOB_PREFERENCES)
              .select('*')
              .eq('user_id', user.id)
              .single();

            if (!preferences?.desired_titles || preferences.desired_titles.length === 0) {
              console.log(`[CRON] User ${user.id} has no job preferences, skipping`);
              return { userId: user.id, jobCount: 0 };
            }

            // Scrape jobs for user
            const result = await scrapeJobs(user.id, {
              keywords: preferences.desired_titles,
              location: preferences.desired_locations?.[0],
              workArrangement: preferences.work_arrangement?.[0],
              salaryMin: preferences.salary_min,
              salaryMax: preferences.salary_max,
              maxResults: 20,
              sources: ['linkedin', 'indeed'],
            });

            console.log(`[CRON] Scraped ${result.jobCount} jobs for user ${user.id}`);

            // Create notification for high-quality matches
            const highMatches = result.jobs.filter((j) => (j.matchScore || 0) >= HIGH_MATCH_THRESHOLD);
            if (highMatches.length > 0) {
              await supabaseAdmin.from(TABLES.NOTIFICATIONS).insert({
                user_id: user.id,
                type: 'new_job_matches',
                title: `${highMatches.length} New Job Match${highMatches.length > 1 ? 'es' : ''}!`,
                message: `We found ${highMatches.length} job${highMatches.length > 1 ? 's' : ''} that match your profile with ${HIGH_MATCH_THRESHOLD}%+ compatibility.`,
                read: false,
                action_url: '/jobs?minMatchScore=80',
                action_text: 'View Matches',
                created_at: new Date().toISOString(),
              });
            }

            return { userId: user.id, jobCount: result.jobCount };
          } catch (error) {
            console.error(`[CRON] Failed to process user ${user.id}:`, error);
            throw error;
          }
        })
      );

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.successful++;
          results.totalJobs += result.value.jobCount;
        } else {
          results.failed++;
        }
      });

      // Rate limit between batches
      if (i + BATCH_SIZE < users.length) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    console.log('[CRON] Automated job search completed:', results);

    return {
      success: true,
      message: `Processed ${results.successful}/${results.total} users, found ${results.totalJobs} jobs`,
      details: results,
    };
  } catch (error) {
    console.error('[CRON] Automated job search error:', error);
    return { success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown'}` };
  }
}

// =============================================================================
// Cron Schedule Registration
// =============================================================================

/**
 * Initialize all scheduled jobs
 * Call this from the main server file after startup
 */
export function initializeScheduledJobs(): void {
  console.log('[CRON] Initializing scheduled jobs...');

  // Daily job cleanup at 3:00 AM UTC
  cron.schedule('0 3 * * *', async () => {
    await cleanupOldJobs();
  });
  console.log('[CRON] Registered: cleanupOldJobs (daily at 3:00 AM)');

  // Hourly OAuth state cleanup
  cron.schedule('0 * * * *', async () => {
    await cleanupOAuthStates();
  });
  console.log('[CRON] Registered: cleanupOAuthStates (hourly)');

  // Hourly rate limit cleanup
  cron.schedule('30 * * * *', async () => {
    await cleanupRateLimits();
  });
  console.log('[CRON] Registered: cleanupRateLimits (hourly at :30)');

  // SEC-004: Hourly failed login cleanup
  cron.schedule('15 * * * *', async () => {
    await cleanupFailedLogins();
  });
  console.log('[CRON] Registered: cleanupFailedLogins (hourly at :15) [SEC-004]');

  // SEC-004: Auto-unlock expired accounts every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await unlockExpiredAccounts();
  });
  console.log('[CRON] Registered: unlockExpiredAccounts (every 15 minutes) [SEC-004]');

  // Daily automated job search at 2:00 AM UTC
  cron.schedule('0 2 * * *', async () => {
    await searchJobsForAllUsers();
  });
  console.log('[CRON] Registered: searchJobsForAllUsers (daily at 2:00 AM)');

  console.log('[CRON] All scheduled jobs initialized');
}

// =============================================================================
// Manual Trigger Functions (for testing/admin)
// =============================================================================

export {
  cleanupOldJobs,
  cleanupOAuthStates,
  cleanupRateLimits,
  cleanupFailedLogins,
  unlockExpiredAccounts,
  searchJobsForAllUsers,
};
