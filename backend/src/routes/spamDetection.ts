/**
 * Spam Detection Routes
 *
 * Endpoints for AI-powered job spam detection.
 *
 * Endpoints:
 * - POST /api/spam-detection/analyze/:jobId - Analyze single job for spam
 * - POST /api/spam-detection/batch - Analyze multiple jobs in batch
 * - GET /api/spam-detection/stats - Get spam detection statistics
 * - POST /api/spam-detection/cache/clear - Clear spam detection cache (admin)
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, TABLES } from '../config/supabase';
import { authenticateUser, requireAdmin, getUserId } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler, createNotFoundError, createValidationError } from '../middleware/errorHandler';
import {
  analyzeJobForSpam,
  analyzeBatchForSpam,
  saveSpamDetectionResults,
  getSpamStats,
  clearSpamCache,
  getSpamCacheStats,
  type JobToAnalyze,
} from '../services/spamDetection.service';

// =============================================================================
// Router Setup
// =============================================================================

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const batchAnalyzeSchema = z.object({
  jobIds: z.array(z.string().uuid()).min(1).max(50), // Max 50 jobs per batch
});

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/spam-detection/analyze/:jobId
 * Analyze a single job for spam indicators
 *
 * Rate limited: 30 per hour (API costs)
 */
router.post(
  '/analyze/:jobId',
  authenticateUser,
  rateLimiter({ maxRequests: 30, windowMs: 60 * 60 * 1000 }), // 30 per hour
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const jobId = req.params.jobId!; // Route param guaranteed by Express

    console.log(`[Spam Detection API] Manual analysis requested for job ${jobId}`);

    // Fetch job
    const { data: job, error: jobError } = await supabaseAdmin
      .from(TABLES.JOBS)
      .select('id, title, company, description, location, salary_min, salary_max, url, source')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (jobError || !job) {
      throw createNotFoundError('Job', jobId);
    }

    // Transform to analysis format
    const jobToAnalyze: JobToAnalyze = {
      id: job.id,
      title: job.title,
      company: job.company,
      description: job.description || '',
      location: job.location ?? undefined,
      salaryMin: job.salary_min ?? undefined,
      salaryMax: job.salary_max ?? undefined,
      url: job.url ?? undefined,
      source: job.source,
    };

    // Analyze for spam
    const result = await analyzeJobForSpam(jobToAnalyze);

    // Save results to database
    await saveSpamDetectionResults(jobId, result);

    console.log(
      `[Spam Detection API] Job ${jobId} analyzed: ${result.spamProbability.toFixed(2)} probability, recommendation: ${result.recommendation}`
    );

    res.json({
      success: true,
      jobId,
      result: {
        isSpam: result.isSpam,
        spamProbability: result.spamProbability,
        confidence: result.confidence,
        categories: result.categories,
        reasons: result.reasons,
        flags: result.flags,
        recommendation: result.recommendation,
        analyzedAt: result.analyzedAt,
      },
    });
  })
);

/**
 * POST /api/spam-detection/batch
 * Analyze multiple jobs for spam in a batch
 *
 * Rate limited: 10 per hour (high API costs)
 */
router.post(
  '/batch',
  authenticateUser,
  rateLimiter({ maxRequests: 10, windowMs: 60 * 60 * 1000 }), // 10 per hour
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const parseResult = batchAnalyzeSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { jobIds } = parseResult.data;

    console.log(`[Spam Detection API] Batch analysis requested for ${jobIds.length} jobs`);

    // Fetch jobs
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from(TABLES.JOBS)
      .select('id, title, company, description, location, salary_min, salary_max, url, source')
      .eq('user_id', userId)
      .in('id', jobIds);

    if (jobsError) {
      throw new Error('Failed to fetch jobs for batch analysis');
    }

    if (!jobs || jobs.length === 0) {
      throw createValidationError('No jobs found', {
        jobIds: 'None of the provided job IDs exist or belong to this user',
      });
    }

    // Transform to analysis format
    const jobsToAnalyze: JobToAnalyze[] = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      description: job.description || '',
      location: job.location ?? undefined,
      salaryMin: job.salary_min ?? undefined,
      salaryMax: job.salary_max ?? undefined,
      url: job.url ?? undefined,
      source: job.source,
    }));

    // Batch analyze
    const batchResult = await analyzeBatchForSpam(jobsToAnalyze);

    // Save results to database
    const savePromises = Array.from(batchResult.results.entries()).map(([jobId, result]) =>
      saveSpamDetectionResults(jobId, result)
    );

    await Promise.allSettled(savePromises);

    console.log(
      `[Spam Detection API] Batch complete: ${batchResult.analyzed} analyzed, ${batchResult.spamDetected} spam detected`
    );

    // Transform results for response
    const results = Array.from(batchResult.results.entries()).map(([jobId, result]) => ({
      jobId,
      isSpam: result.isSpam,
      spamProbability: result.spamProbability,
      confidence: result.confidence,
      categories: result.categories,
      recommendation: result.recommendation,
      analyzedAt: result.analyzedAt,
    }));

    res.json({
      success: true,
      total: batchResult.total,
      analyzed: batchResult.analyzed,
      cached: batchResult.cached,
      spamDetected: batchResult.spamDetected,
      errors: batchResult.errors,
      results,
    });
  })
);

/**
 * GET /api/spam-detection/stats
 * Get spam detection statistics for the user
 */
router.get(
  '/stats',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const stats = await getSpamStats(userId);

    res.json({
      success: true,
      stats: {
        totalJobs: stats.totalJobs,
        analyzedJobs: stats.analyzedJobs,
        spamDetected: stats.spamDetected,
        reviewRecommended: stats.reviewRecommended,
        safe: stats.safe,
        analysisRate: stats.totalJobs > 0 ? (stats.analyzedJobs / stats.totalJobs) * 100 : 0,
        spamRate: stats.analyzedJobs > 0 ? (stats.spamDetected / stats.analyzedJobs) * 100 : 0,
      },
    });
  })
);

/**
 * GET /api/spam-detection/cache/stats
 * Get cache statistics (admin only)
 */
router.get(
  '/cache/stats',
  authenticateUser,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const cacheStats = getSpamCacheStats();

    res.json({
      success: true,
      cache: {
        size: cacheStats.size,
        keys: cacheStats.keys.length,
        sampleKeys: cacheStats.keys.slice(0, 10), // Show first 10 keys
      },
    });
  })
);

/**
 * POST /api/spam-detection/cache/clear
 * Clear spam detection cache (admin only)
 */
router.post(
  '/cache/clear',
  authenticateUser,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    clearSpamCache();

    console.log('[Spam Detection API] Cache cleared by admin');

    res.json({
      success: true,
      message: 'Spam detection cache cleared successfully',
    });
  })
);

export default router;
