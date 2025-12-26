/**
 * Jobs Routes for Cloudflare Workers
 *
 * Handles job listing, scraping, and management.
 *
 * Endpoints:
 * - GET /api/jobs - List user's jobs with pagination and filters
 * - GET /api/jobs/:id - Get job by ID
 * - POST /api/jobs/scrape - Scrape jobs from sources (TODO: Apify integration)
 * - PATCH /api/jobs/:id - Update job (save/archive)
 * - DELETE /api/jobs/:id - Delete job
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables, ListJobsResponse, ScrapeJobsResponse } from '../types';
import { TABLES } from '../types';
import { authenticateUser, requireAdmin, getUserId } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { createNotFoundError, createValidationError } from '../middleware/errorHandler';
import { createSupabaseAdmin } from '../services/supabase';

// =============================================================================
// Router Setup
// =============================================================================

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

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
app.get('/', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const supabase = createSupabaseAdmin(c.env);

  const parseResult = listJobsSchema.safeParse({
    page: c.req.query('page'),
    limit: c.req.query('limit'),
    archived: c.req.query('archived'),
    saved: c.req.query('saved'),
    source: c.req.query('source'),
    minMatchScore: c.req.query('minMatchScore'),
    search: c.req.query('search'),
    workArrangement: c.req.query('workArrangement'),
  });

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
  let query = supabase
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

  return c.json(response);
});

/**
 * GET /api/jobs/:id
 * Get job by ID
 */
app.get('/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const supabase = createSupabaseAdmin(c.env);

  const { data: job, error } = await supabase
    .from(TABLES.JOBS)
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !job) {
    throw createNotFoundError('Job', id);
  }

  return c.json(job);
});

/**
 * POST /api/jobs/scrape
 * Scrape jobs from LinkedIn and Indeed
 *
 * Note: Apify integration requires external API calls
 * For now, this returns a placeholder response
 */
app.post('/scrape', authenticateUser, rateLimiter(), async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  // Check if Apify is configured
  if (!c.env.APIFY_API_TOKEN) {
    throw createValidationError('Job scraping not configured', {
      apify: 'Apify API token is not configured',
    });
  }

  // Validate input
  const parseResult = scrapeJobsSchema.safeParse(body);
  if (!parseResult.success) {
    throw createValidationError(
      'Invalid request body',
      Object.fromEntries(
        parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
      )
    );
  }

  console.log(`Scraping jobs for user ${userId}:`, parseResult.data);

  // TODO: Implement Apify integration for Cloudflare Workers
  // The existing jobScraper.service.ts uses Apify client which works in Workers
  // For now, return a placeholder response

  const response: ScrapeJobsResponse = {
    success: false,
    searchId: '',
    jobCount: 0,
    jobs: [],
    errors: ['Job scraping is not yet implemented for Cloudflare Workers. Coming soon!'],
  };

  return c.json(response, 201);
});

/**
 * PATCH /api/jobs/:id
 * Update job (save/archive)
 */
app.patch('/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  const supabase = createSupabaseAdmin(c.env);

  const parseResult = updateJobSchema.safeParse(body);
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
  const { data: job, error } = await supabase
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

  return c.json(job);
});

/**
 * DELETE /api/jobs/:id
 * Delete job
 */
app.delete('/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const supabase = createSupabaseAdmin(c.env);

  const { error } = await supabase
    .from(TABLES.JOBS)
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete job:', error);
    throw new Error('Failed to delete job');
  }

  return c.body(null, 204);
});

/**
 * POST /api/jobs/cleanup
 * Admin endpoint to cleanup old jobs
 */
app.post('/cleanup', authenticateUser, requireAdmin, async (c) => {
  const supabase = createSupabaseAdmin(c.env);
  const daysOld = parseInt(c.req.query('daysOld') || '90', 10);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  // Archive jobs older than cutoff
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
    console.error('Failed to cleanup jobs:', error);
    throw new Error('Failed to cleanup jobs');
  }

  const archivedCount = data?.length || 0;
  console.log(`Archived ${archivedCount} jobs older than ${daysOld} days`);

  return c.json({
    success: true,
    jobsArchived: archivedCount,
    cutoffDate: cutoffDate.toISOString(),
  });
});

export default app;
