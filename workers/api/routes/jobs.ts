/**
 * Jobs Routes for Cloudflare Workers
 *
 * Handles job listing, scraping, and management.
 *
 * Endpoints:
 * - GET /api/jobs - List user's jobs with pagination and filters
 * - GET /api/jobs/:id - Get job by ID
 * - POST /api/jobs/scrape - Scrape jobs from sources (TODO: Apify integration)
 * - POST /api/jobs/:id/analyze - Analyze job-candidate compatibility (10-dimension framework)
 * - PATCH /api/jobs/:id - Update job (save/archive)
 * - DELETE /api/jobs/:id - Delete job
 * - POST /api/jobs/cleanup - Admin endpoint to cleanup old jobs
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables, ListJobsResponse, Job, UserProfile, WorkExperience, Education, Skill } from '../types';
import { authenticateUser, requireAdmin, getUserId } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { createNotFoundError, createValidationError } from '../middleware/errorHandler';
import { analyzeJobCompatibility } from '../services/openai';
import { generateJobEmbedding } from '../services/embeddings';
import { getCachedAnalysis, cacheAnalysis } from '../services/jobAnalysisCache';
import { storeJobEmbedding, semanticSearchJobs, hybridSearchJobs } from '../services/vectorize';

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

const searchJobsSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(500),
  limit: z.coerce.number().int().positive().max(50).default(20),
  searchType: z.enum(['semantic', 'hybrid']).default('hybrid'),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate and save embedding for a job (non-blocking)
 *
 * Phase 3.1: Migrated to Vectorize
 * - Generates embedding using Workers AI (with dual-layer caching)
 * - Stores in Vectorize index for semantic search
 * - No longer stores in Supabase (embedding column removed from D1)
 *
 * Usage in routes:
 *   c.executionCtx.waitUntil(generateAndSaveJobEmbedding(c.env, job));
 *
 * @param env - Environment bindings (for AI API and Vectorize)
 * @param job - Job object with all fields
 */
// TODO: Re-enable when background tasks are supported in Workers
 
export async function generateAndSaveJobEmbedding(
  env: Env,
  job: Job
): Promise<void> {
  try {
    console.log(`[Embeddings] Starting embedding generation for job ${job.id}`);

    if (!job.userId) {
      console.warn(`[Embeddings] Skipping embedding for job ${job.id}: missing userId`);
      return;
    }

    const embedding = await generateJobEmbedding(env, job);

    // Store in Vectorize instead of Supabase
    await storeJobEmbedding(
      env,
      job.id,
      job.userId,
      job.title,
      job.company,
      embedding
    );

    console.log(`[Embeddings] Successfully generated and stored embedding in Vectorize for job ${job.id}`);
  } catch (error) {
    console.error(
      `[Embeddings] Failed to generate/store embedding for job ${job.id}:`,
      error instanceof Error ? error.message : String(error)
    );
    // Don't throw - embedding generation is optional and shouldn't fail the request
  }
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/jobs
 * List user's jobs with pagination and filters
 */
app.get('/', authenticateUser, async (c) => {
  const userId = getUserId(c);

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

  // Build dynamic query
  const conditions: string[] = ['user_id = ?', 'is_archived = ?'];
  const params: (string | number)[] = [userId, archived ? 1 : 0];

  if (saved !== undefined) {
    conditions.push('is_saved = ?');
    params.push(saved ? 1 : 0);
  }

  if (source) {
    conditions.push('source = ?');
    params.push(source);
  }

  if (minMatchScore !== undefined) {
    conditions.push('match_score >= ?');
    params.push(minMatchScore);
  }

  if (workArrangement) {
    conditions.push('work_arrangement = ?');
    params.push(workArrangement);
  }

  if (search) {
    conditions.push('(title LIKE ? OR company LIKE ?)');
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern);
  }

  // Get jobs with pagination
  const jobsQuery = `
    SELECT * FROM jobs
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);

  const { results: jobs } = await c.env.DB.prepare(jobsQuery)
    .bind(...params)
    .all();

  // Get total count (same conditions, without pagination)
  const countQuery = `
    SELECT COUNT(*) as count FROM jobs
    WHERE ${conditions.join(' AND ')}
  `;
  const countParams = params.slice(0, params.length - 2); // Remove LIMIT and OFFSET

  const { results: countResults } = await c.env.DB.prepare(countQuery)
    .bind(...countParams)
    .all();

  const count = (countResults[0] as { count: number } | undefined)?.count || 0;

  const response: ListJobsResponse = {
    jobs: jobs || [],
    total: count,
    page,
    limit,
    hasMore: count > offset + limit,
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

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM jobs WHERE id = ? AND user_id = ?'
  )
    .bind(id, userId)
    .all();

  const job = results[0];

  if (!job) {
    throw createNotFoundError('Job', id);
  }

  return c.json(job);
});

/**
 * POST /api/jobs/search
 * Semantic and hybrid job search using Vectorize
 *
 * Phase 3.1: Vectorize Integration
 * - Semantic search: Pure vector similarity search
 * - Hybrid search: Combines FTS5 (keyword) + Vectorize (semantic)
 *
 * Returns job IDs ranked by relevance, client fetches full job details
 */
app.post('/search', authenticateUser, rateLimiter(), async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  // Validate input
  const parseResult = searchJobsSchema.safeParse(body);
  if (!parseResult.success) {
    throw createValidationError(
      'Invalid request body',
      Object.fromEntries(
        parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
      )
    );
  }

  const { query, limit, searchType } = parseResult.data;

  console.log(`[JobSearch] ${searchType} search for user ${userId}: "${query}"`);

  try {
    if (searchType === 'semantic') {
      // Pure semantic search using Vectorize
      const results = await semanticSearchJobs(c.env, query, userId, limit);

      // Fetch full job details from D1
      const jobIds = results.map((r) => r.metadata.jobId);

      if (jobIds.length === 0) {
        return c.json({
          jobs: [],
          searchType: 'semantic',
          resultCount: 0,
        });
      }

      // Build IN clause placeholders
      const placeholders = jobIds.map(() => '?').join(', ');
      const jobsQuery = `
        SELECT * FROM jobs
        WHERE id IN (${placeholders}) AND user_id = ?
      `;

      const { results: jobs } = await c.env.DB.prepare(jobsQuery)
        .bind(...jobIds, userId)
        .all();

      // Sort jobs by semantic score (maintain Vectorize ranking)
      const jobsMap = new Map(jobs?.map((j) => [j.id as string, j]) || []);
      const sortedJobs = results
        .map((r) => jobsMap.get(r.metadata.jobId))
        .filter(Boolean);

      return c.json({
        jobs: sortedJobs,
        searchType: 'semantic',
        resultCount: sortedJobs.length,
      });
    } else {
      // Hybrid search using FTS5 + Vectorize
      const results = await hybridSearchJobs(c.env, c.env.DB, query, userId, {
        topK: limit,
      });

      // Fetch full job details from D1
      const jobIds = results.map((r) => r.jobId);

      if (jobIds.length === 0) {
        return c.json({
          jobs: [],
          searchType: 'hybrid',
          resultCount: 0,
        });
      }

      // Build IN clause placeholders
      const placeholders = jobIds.map(() => '?').join(', ');
      const jobsQuery = `
        SELECT * FROM jobs
        WHERE id IN (${placeholders}) AND user_id = ?
      `;

      const { results: jobs } = await c.env.DB.prepare(jobsQuery)
        .bind(...jobIds, userId)
        .all();

      // Sort jobs by combined score (maintain hybrid ranking)
      const jobsMap = new Map(jobs?.map((j) => [j.id as string, j]) || []);
      const sortedJobs = results
        .map((r) => jobsMap.get(r.jobId))
        .filter(Boolean);

      return c.json({
        jobs: sortedJobs,
        searchType: 'hybrid',
        resultCount: sortedJobs.length,
        scores: results.map((r) => ({
          jobId: r.jobId,
          keywordScore: r.keywordScore,
          semanticScore: r.semanticScore,
          combinedScore: r.combinedScore,
        })),
      });
    }
  } catch (error) {
    console.error('[JobSearch] Search failed:', error);
    throw error;
  }
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

  console.log(`[Jobs] Scraping jobs for user ${userId}:`, parseResult.data);

  try {
    // Import and use the job scraper service (Phase 3.5)
    const { scrapeJobs } = await import('../services/jobScraper');

    // Scrape jobs (stores in D1 with deduplication and embeddings)
    const result = await scrapeJobs(c.env, c.env.DB, userId, parseResult.data);

    console.log(
      `[Jobs] Successfully scraped ${result.jobCount} jobs for user ${userId}`
    );

    return c.json(result, 201);
  } catch (error) {
    console.error('[Jobs] Scraping failed:', error);
    throw error;
  }
});

/**
 * PATCH /api/jobs/:id
 * Update job (save/archive)
 */
app.patch('/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const body = await c.req.json();

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
  const timestamp = new Date().toISOString();

  // Build dynamic UPDATE query
  const updateFields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.isSaved !== undefined) {
    updateFields.push('is_saved = ?');
    values.push(updates.isSaved ? 1 : 0);
  }

  if (updates.isArchived !== undefined) {
    updateFields.push('is_archived = ?');
    values.push(updates.isArchived ? 1 : 0);
  }

  updateFields.push('updated_at = ?');
  values.push(timestamp);

  // Add WHERE clause values
  values.push(id, userId);

  const { meta } = await c.env.DB.prepare(
    `UPDATE jobs SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`
  )
    .bind(...values)
    .run();

  if (meta.changes === 0) {
    throw createNotFoundError('Job', id);
  }

  // Fetch updated job
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM jobs WHERE id = ? AND user_id = ?'
  )
    .bind(id, userId)
    .all();

  const job = results[0];

  return c.json(job);
});

/**
 * DELETE /api/jobs/:id
 * Delete job
 */
app.delete('/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');

  const { meta } = await c.env.DB.prepare(
    'DELETE FROM jobs WHERE id = ? AND user_id = ?'
  )
    .bind(id, userId)
    .run();

  if (meta.changes === 0) {
    throw createNotFoundError('Job', id);
  }

  return c.body(null, 204);
});

/**
 * POST /api/jobs/:id/analyze
 * Analyze job-candidate compatibility using 10-dimension framework
 *
 * Implements hybrid caching strategy:
 * 1. Check KV cache (fast, 7-day TTL)
 * 2. Fallback to database cache
 * 3. Generate new analysis if no cache hit
 * 4. Store in both KV and database
 *
 * Cache invalidation happens when user profile changes (see profile routes)
 */
app.post('/:id/analyze', authenticateUser, rateLimiter(), async (c) => {
  const userId = getUserId(c);
  const jobId = c.req.param('id');

  console.log(`Analyzing compatibility for user ${userId}, job ${jobId}`);

  // === CACHE CHECK ===
  // Try to get cached analysis first (KV → Database fallback)
  const cached = await getCachedAnalysis(c.env, userId, jobId);

  if (cached) {
    console.log(`[Cache HIT] Using cached analysis from ${cached.source} (cached at ${cached.cachedAt})`);
    console.log(`[Cost Savings] Avoided OpenAI API call (~$0.03-0.05 saved)`);

    // Still update job's match_score in database
    const timestamp = new Date().toISOString();
    await c.env.DB.prepare(
      'UPDATE jobs SET match_score = ?, updated_at = ? WHERE id = ?'
    )
      .bind(cached.analysis.overallScore, timestamp, jobId)
      .run();

    // Return cached result with metadata
    return c.json({
      ...cached.analysis,
      cached: true,
      cacheSource: cached.source,
      cachedAt: cached.cachedAt,
    });
  }

  console.log('[Cache MISS] Generating new analysis...');

  // === FETCH DATA ===
  // Fetch job data
  const { results: jobResults } = await c.env.DB.prepare(
    'SELECT * FROM jobs WHERE id = ? AND user_id = ?'
  )
    .bind(jobId, userId)
    .all();

  const job = jobResults[0];

  if (!job) {
    throw createNotFoundError('Job', jobId);
  }

  // Fetch user profile
  const { results: profileResults } = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  )
    .bind(userId)
    .all();

  const profile = profileResults[0];

  if (!profile) {
    throw createNotFoundError('User profile');
  }

  // Fetch work experience
  const { results: workExperience } = await c.env.DB.prepare(
    'SELECT * FROM work_experience WHERE user_id = ? ORDER BY start_date DESC'
  )
    .bind(userId)
    .all();

  if (!workExperience || workExperience.length === 0) {
    throw createValidationError('Add work experience to your profile first', {
      workExperience: 'At least one work experience entry is required',
    });
  }

  // Fetch education
  const { results: education } = await c.env.DB.prepare(
    'SELECT * FROM education WHERE user_id = ? ORDER BY end_date DESC'
  )
    .bind(userId)
    .all();

  // Fetch skills
  const { results: skills } = await c.env.DB.prepare(
    'SELECT * FROM skills WHERE user_id = ? ORDER BY endorsements DESC'
  )
    .bind(userId)
    .all();

  // === MAP DATA ===
  const mappedJob: Job = mapDatabaseJob(job);
  const mappedProfile: UserProfile = mapDatabaseProfile(profile);
  const mappedWorkExperience: WorkExperience[] = (workExperience || []).map(mapDatabaseWorkExperience);
  const mappedEducation: Education[] = (education || []).map(mapDatabaseEducation);
  const mappedSkills: Skill[] = (skills || []).map(mapDatabaseSkill);

  // === GENERATE ANALYSIS ===
  const analysis = await analyzeJobCompatibility(c.env, {
    job: mappedJob,
    profile: mappedProfile,
    workExperience: mappedWorkExperience,
    education: mappedEducation,
    skills: mappedSkills,
  });

  // === CACHE NEW ANALYSIS ===
  // Store in both KV and database (fire and forget)
  c.executionCtx.waitUntil(cacheAnalysis(c.env, userId, jobId, analysis));

  // === UPDATE JOB MATCH SCORE ===
  const timestamp = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE jobs SET match_score = ?, updated_at = ? WHERE id = ?'
  )
    .bind(analysis.overallScore, timestamp, jobId)
    .run();

  console.log(`Compatibility analysis complete: ${analysis.overallScore} (${analysis.recommendation})`);
  console.log('[Cost] OpenAI API call made (~$0.03-0.05)');

  // Return fresh result
  return c.json({
    ...analysis,
    cached: false,
    cacheSource: 'generated',
    cachedAt: new Date().toISOString(),
  });
});

/**
 * POST /api/jobs/cleanup
 * Admin endpoint to cleanup old jobs
 */
app.post('/cleanup', authenticateUser, requireAdmin, async (c) => {
  const daysOld = parseInt(c.req.query('daysOld') || '90', 10);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  const timestamp = new Date().toISOString();

  // Archive jobs older than cutoff
  const { meta } = await c.env.DB.prepare(
    `UPDATE jobs
     SET is_archived = 1, updated_at = ?
     WHERE created_at < ? AND is_archived = 0`
  )
    .bind(timestamp, cutoffDate.toISOString())
    .run();

  const archivedCount = meta.changes || 0;
  console.log(`Archived ${archivedCount} jobs older than ${daysOld} days`);

  return c.json({
    success: true,
    jobsArchived: archivedCount,
    cutoffDate: cutoffDate.toISOString(),
  });
});

// =============================================================================
// Database Mapping Functions
// =============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapDatabaseJob(record: any): Job {
  return {
    id: record.id,
    userId: record.user_id,
    title: record.title,
    company: record.company,
    companyLogo: record.company_logo,
    location: record.location,
    workArrangement: record.work_arrangement,
    salaryMin: record.salary_min,
    salaryMax: record.salary_max,
    postedDate: record.posted_date,
    description: record.description,
    url: record.url,
    source: record.source,
    requiredSkills: record.required_skills,
    preferredSkills: record.preferred_skills,
    experienceLevel: record.experience_level,
    matchScore: record.match_score,
    isSaved: record.is_saved,
    isArchived: record.is_archived,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapDatabaseProfile(record: any): UserProfile {
  return {
    id: record.id,
    email: record.email,
    firstName: record.first_name,
    lastName: record.last_name,
    phone: record.phone,
    location: record.location,
    summary: record.summary,
    headline: record.headline,
    profileImageUrl: record.profile_image_url,
    linkedInUrl: record.linkedin_url,
    linkedInImported: record.linkedin_imported,
    linkedInImportedAt: record.linkedin_imported_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapDatabaseWorkExperience(record: any): WorkExperience {
  return {
    id: record.id,
    userId: record.user_id,
    position: record.position,
    company: record.company,
    location: record.location,
    startDate: record.start_date,
    endDate: record.end_date,
    current: record.current,
    description: record.description,
    accomplishments: record.accomplishments || [],
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapDatabaseEducation(record: any): Education {
  return {
    id: record.id,
    userId: record.user_id,
    degree: record.degree,
    field: record.field,
    school: record.school,
    location: record.location,
    startDate: record.start_date,
    endDate: record.end_date,
    graduationYear: record.graduation_year,
    gpa: record.gpa,
    honors: record.honors,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapDatabaseSkill(record: any): Skill {
  return {
    id: record.id,
    userId: record.user_id,
    name: record.name,
    level: record.level,
    endorsements: record.endorsements,
    yearsOfExperience: record.years_of_experience,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

export default app;
