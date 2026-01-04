/**
 * Usage Metrics Routes
 *
 * Handles user usage metrics and limits.
 *
 * Endpoints:
 * - GET /api/usage/metrics - Get current user's usage metrics
 */

import { Router, type Request, type Response } from 'express';
import { supabaseAdmin, TABLES } from '../config/supabase';
import { authenticateUser, getUserId } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

// =============================================================================
// Router Setup
// =============================================================================

const router = Router();

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/usage/metrics
 * Get current user's usage metrics
 *
 * Returns:
 * - applicationsTracked: Total number of tracked applications
 * - resumeVariantsCreated: Total number of tailored resume variants
 * - jobSearchesPerformed: Number of job searches performed (from usage_limits)
 * - emailsSent: Number of emails sent (from usage_limits)
 */
router.get(
  '/metrics',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // Fetch tracked applications count
    const { count: applicationsCount, error: appsError } = await supabaseAdmin
      .from(TABLES.TRACKED_APPLICATIONS)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (appsError) {
      throw appsError;
    }

    // Fetch resume variants count (tailored resumes only)
    const { count: resumesCount, error: resumesError } = await supabaseAdmin
      .from(TABLES.RESUMES)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'tailored');

    if (resumesError) {
      throw resumesError;
    }

    // Fetch job searches count and emails sent from usage_limits table
    const { data: usageLimits, error: usageError } = await supabaseAdmin
      .from(TABLES.USAGE_LIMITS)
      .select('job_searches_used, emails_sent_used')
      .eq('user_id', userId)
      .single();

    // usage_limits row might not exist yet (PGRST116 = not found)
    // This is not an error - just means user hasn't used these features yet
    if (usageError && usageError.code !== 'PGRST116') {
      throw usageError;
    }

    // Return metrics in camelCase format for frontend
    res.json({
      metrics: {
        applicationsTracked: applicationsCount || 0,
        resumeVariantsCreated: resumesCount || 0,
        jobSearchesPerformed: usageLimits?.job_searches_used || 0,
        emailsSent: usageLimits?.emails_sent_used || 0,
      },
    });
  })
);

// =============================================================================
// Export
// =============================================================================

export default router;
