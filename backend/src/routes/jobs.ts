/**
 * Jobs Routes
 *
 * Handles job listing, scraping, and management.
 *
 * Endpoints:
 * - GET /api/jobs - List user's jobs with pagination and filters
 * - GET /api/jobs/:id - Get job by ID
 * - POST /api/jobs/scrape - Scrape jobs from sources
 * - PATCH /api/jobs/:id - Update job (save/archive)
 * - DELETE /api/jobs/:id - Delete job
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, TABLES } from '../config/supabase';
import { authenticateUser, requireAdmin, getUserId } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler, createNotFoundError, createValidationError } from '../middleware/errorHandler';
import { scrapeJobs, isApifyConfigured } from '../services/jobScraper.service';
import type { ListJobsResponse, ScrapeJobsResponse } from '../types';

// =============================================================================
// Router Setup
// =============================================================================

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const listJobsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  archived: z.coerce.boolean().default(false),
  saved: z.coerce.boolean().optional(),
  source: z.enum(['linkedin', 'indeed', 'manual']).optional(),
  minMatchScore: z.coerce.number().int().min(0).max(100).optional(),
  search: z.string().max(200).optional(),
  workArrangement: z.enum(['Remote', 'Hybrid', 'On-site']).optional(),
});

const scrapeJobsSchema = z.object({
  keywords: z
    .array(z.string().min(1).max(100))
    .min(1, 'At least one keyword is required')
    .max(10, 'Maximum 10 keywords'),
  location: z.string().max(200).optional(),
  workArrangement: z.string().optional(),
  experienceLevel: z.string().max(50).optional(),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  maxResults: z.number().int().min(1).max(50).default(20),
  sources: z.array(z.enum(['linkedin', 'indeed'])).default(['linkedin', 'indeed']),
});

const updateJobSchema = z.object({
  isSaved: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/jobs
 * List user's jobs with pagination and filters
 */
router.get(
  '/',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const parseResult = listJobsSchema.safeParse(req.query);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid query parameters',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { page, limit, archived, saved, source, minMatchScore, search, workArrangement } =
      parseResult.data;
    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseAdmin
      .from(TABLES.JOBS)
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_archived', archived)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply optional filters
    if (saved !== undefined) {
      query = query.eq('is_saved', saved);
    }

    if (source) {
      query = query.eq('source', source);
    }

    if (minMatchScore !== undefined) {
      query = query.gte('match_score', minMatchScore);
    }

    if (workArrangement) {
      query = query.eq('work_arrangement', workArrangement);
    }

    if (search) {
      // Full-text search on title and company
      query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%`);
    }

    const { data: jobs, error, count } = await query;

    if (error) {
      console.error('Failed to fetch jobs:', error);
      throw new Error('Failed to fetch jobs');
    }

    const response: ListJobsResponse = {
      jobs: jobs || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    };

    res.json(response);
  })
);

/**
 * GET /api/jobs/:id
 * Get job by ID
 */
router.get(
  '/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    const { data: job, error } = await supabaseAdmin
      .from(TABLES.JOBS)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !job) {
      throw createNotFoundError('Job', id);
    }

    res.json(job);
  })
);

/**
 * POST /api/jobs/scrape
 * Scrape jobs from LinkedIn and Indeed
 *
 * Rate limited: 10 per hour (API costs)
 */
router.post(
  '/scrape',
  authenticateUser,
  rateLimiter({ maxRequests: 10, windowMs: 60 * 60 * 1000 }), // 10 per hour
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // Check if Apify is configured
    if (!isApifyConfigured()) {
      throw createValidationError('Job scraping not configured', {
        apify: 'Apify API token is not configured',
      });
    }

    // Validate input
    const parseResult = scrapeJobsSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    console.log(`Scraping jobs for user ${userId}:`, parseResult.data);

    // Scrape jobs
    const result = await scrapeJobs(userId, parseResult.data);

    console.log(`Scraped ${result.jobCount} jobs for user ${userId}`);

    const response: ScrapeJobsResponse = {
      success: result.success,
      searchId: result.searchId,
      jobCount: result.jobCount,
      jobs: result.jobs,
      errors: result.errors,
    };

    res.status(201).json(response);
  })
);

/**
 * PATCH /api/jobs/:id
 * Update job (save/archive)
 */
router.patch(
  '/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    const parseResult = updateJobSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const updates = parseResult.data;

    // Verify ownership and update
    const { data: job, error } = await supabaseAdmin
      .from(TABLES.JOBS)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !job) {
      throw createNotFoundError('Job', id);
    }

    res.json(job);
  })
);

/**
 * DELETE /api/jobs/:id
 * Delete job
 */
router.delete(
  '/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from(TABLES.JOBS)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete job:', error);
      throw new Error('Failed to delete job');
    }

    res.status(204).send();
  })
);

/**
 * POST /api/jobs/cleanup
 * Admin endpoint to cleanup old jobs
 */
router.post(
  '/cleanup',
  authenticateUser,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const daysOld = parseInt(req.query.daysOld as string) || 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Archive jobs older than cutoff
    const { data, error } = await supabaseAdmin
      .from(TABLES.JOBS)
      .update({
        is_archived: true,
        updated_at: new Date().toISOString(),
      })
      .lt('created_at', cutoffDate.toISOString())
      .eq('is_archived', false)
      .select('id');

    if (error) {
      console.error('Failed to cleanup jobs:', error);
      throw new Error('Failed to cleanup jobs');
    }

    const archivedCount = data?.length || 0;
    console.log(`Archived ${archivedCount} jobs older than ${daysOld} days`);

    res.json({
      success: true,
      jobsArchived: archivedCount,
      cutoffDate: cutoffDate.toISOString(),
    });
  })
);

export default router;
