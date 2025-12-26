/**
 * Scheduled Jobs Handler for Cloudflare Workers
 *
 * Handles cron-triggered background tasks:
 * - cleanupOldJobs: Archive jobs older than 90 days (daily at 3 AM)
 * - cleanupExpiredSessions: Delete expired rate limit records (hourly)
 * - cleanupOAuthStates: Delete expired OAuth state tokens (hourly)
 * - unlockExpiredAccounts: Auto-unlock accounts after lockout (every 15 min)
 *
 * Note: Automated job searching (Apify integration) is not yet implemented
 * for Workers and should be done via a separate service if needed.
 */

import type { Env } from '../api/types';
import { TABLES } from '../api/types';
import { createSupabaseAdmin } from '../api/services/supabase';
import { cleanupExpiredRateLimits } from '../api/middleware/rateLimiter';

// =============================================================================
// Configuration
// =============================================================================

const JOBS_ARCHIVE_DAYS = 90;

// =============================================================================
// Main Scheduler Handler
// =============================================================================

/**
 * Handle scheduled events from Cloudflare Cron Triggers
 *
 * Cron patterns configured in wrangler.toml:
 * - "0 * * * *"     - Hourly (rate limits, OAuth states, failed logins)
 * - "*/15 * * * *"  - Every 15 minutes (unlock expired accounts)
 * - "0 2 * * *"     - Daily at 2 AM (automated job search - TODO)
 * - "0 3 * * *"     - Daily at 3 AM (archive old jobs)
 */
export async function handleScheduledJobs(event: ScheduledEvent, env: Env): Promise<void> {
  const cronTime = new Date(event.scheduledTime);
  const hour = cronTime.getUTCHours();
  const minute = cronTime.getUTCMinutes();

  console.log(`[CRON] Scheduled job triggered at ${cronTime.toISOString()}`);

  try {
    // Determine which jobs to run based on the cron pattern

    // Every 15 minutes - unlock expired accounts
    if (minute % 15 === 0) {
      await runWithLogging('unlockExpiredAccounts', () => unlockExpiredAccounts(env));
    }

    // Hourly jobs (at :00)
    if (minute === 0) {
      await Promise.all([
        runWithLogging('cleanupOAuthStates', () => cleanupOAuthStates(env)),
        runWithLogging('cleanupRateLimits', () => cleanupExpiredRateLimits(env)),
        runWithLogging('cleanupFailedLogins', () => cleanupFailedLogins(env)),
      ]);
    }

    // Daily at 3 AM - archive old jobs
    if (hour === 3 && minute === 0) {
      await runWithLogging('cleanupOldJobs', () => cleanupOldJobs(env));
    }

    // Daily at 2 AM - automated job search (TODO)
    // if (hour === 2 && minute === 0) {
    //   await runWithLogging('searchJobsForAllUsers', () => searchJobsForAllUsers(env));
    // }

    console.log(`[CRON] Scheduled jobs completed successfully`);
  } catch (error) {
    console.error(`[CRON] Scheduled jobs failed:`, error);
  }
}

// =============================================================================
// Job Implementations
// =============================================================================

interface JobResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Helper to run a job with logging
 */
async function runWithLogging(name: string, job: () => Promise<JobResult>): Promise<void> {
  console.log(`[CRON] Starting ${name}...`);
  try {
    const result = await job();
    console.log(`[CRON] ${name} completed:`, result.message);
  } catch (error) {
    console.error(`[CRON] ${name} failed:`, error);
  }
}

/**
 * Archive jobs older than configured days
 */
async function cleanupOldJobs(env: Env): Promise<JobResult> {
  const supabase = createSupabaseAdmin(env);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - JOBS_ARCHIVE_DAYS);

  const { data, error } = await supabase
    .from(TABLES.JOBS)
    .update({
      is_archived: true,
      updated_at: new Date().toISOString(),
    })
    .lt('created_at', cutoffDate.toISOString())
    .eq('is_archived', false)
    .select('id');

  if (error) {
    return { success: false, message: `Failed: ${error.message}` };
  }

  const archivedCount = data?.length || 0;
  return {
    success: true,
    message: `Archived ${archivedCount} jobs`,
    details: { archivedCount, cutoffDate: cutoffDate.toISOString() },
  };
}

/**
 * Cleanup expired OAuth state tokens
 */
async function cleanupOAuthStates(env: Env): Promise<JobResult> {
  const supabase = createSupabaseAdmin(env);

  const { data, error } = await supabase
    .from(TABLES.OAUTH_STATES)
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    return { success: false, message: `Failed: ${error.message}` };
  }

  const deletedCount = data?.length || 0;
  return {
    success: true,
    message: `Deleted ${deletedCount} expired OAuth states`,
    details: { deletedCount },
  };
}

/**
 * Cleanup old failed login attempts (older than 24 hours)
 * Note: This assumes a 'failed_logins' table exists
 */
async function cleanupFailedLogins(env: Env): Promise<JobResult> {
  const supabase = createSupabaseAdmin(env);
  const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // Check if table exists before querying
    const { error: tableError } = await supabase
      .from('failed_logins')
      .select('id')
      .limit(1);

    if (tableError) {
      // Table might not exist, skip this job
      return {
        success: true,
        message: 'Skipped - failed_logins table not found',
        details: { skipped: true },
      };
    }

    const { data, error } = await supabase
      .from('failed_logins')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      return { success: false, message: `Failed: ${error.message}` };
    }

    const deletedCount = data?.length || 0;
    return {
      success: true,
      message: `Deleted ${deletedCount} old failed login attempts`,
      details: { deletedCount },
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

/**
 * Auto-unlock accounts after lockout period expires
 * Note: This assumes an 'account_lockouts' table exists
 */
async function unlockExpiredAccounts(env: Env): Promise<JobResult> {
  const supabase = createSupabaseAdmin(env);

  try {
    // Check if table exists before querying
    const { error: tableError } = await supabase
      .from('account_lockouts')
      .select('id')
      .limit(1);

    if (tableError) {
      // Table might not exist, skip this job
      return {
        success: true,
        message: 'Skipped - account_lockouts table not found',
        details: { skipped: true },
      };
    }

    const { data, error } = await supabase
      .from('account_lockouts')
      .delete()
      .lt('locked_until', new Date().toISOString())
      .select('id');

    if (error) {
      return { success: false, message: `Failed: ${error.message}` };
    }

    const unlockedCount = data?.length || 0;
    return {
      success: true,
      message: `Auto-unlocked ${unlockedCount} accounts`,
      details: { unlockedCount },
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

// =============================================================================
// Future: Automated Job Search
// =============================================================================

// TODO: Implement automated job search with Apify
// This would require:
// 1. Fetching users with auto_search_enabled
// 2. Getting their job preferences
// 3. Calling Apify API for each user
// 4. Processing and saving results
// 5. Creating notifications for high matches
//
// For now, this is left as a placeholder. Consider implementing
// this as a separate Cloudflare Worker or Durable Object for
// better control over execution time and state management.

/*
async function searchJobsForAllUsers(env: Env): Promise<JobResult> {
  if (!env.APIFY_API_TOKEN) {
    return { success: false, message: 'Apify not configured' };
  }

  // Implementation here...

  return {
    success: true,
    message: 'Job search not yet implemented for Workers',
    details: { status: 'pending_implementation' },
  };
}
*/
