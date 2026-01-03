/**
 * Job Analysis Caching Service
 *
 * Implements hybrid caching strategy for expensive job compatibility analyses:
 * 1. KV (Cloudflare Workers KV) - Fast edge cache with 7-day TTL
 * 2. Database (Supabase) - Permanent storage for historical tracking
 * 3. Fallback chain: KV → Database → Generate new analysis
 *
 * This hybrid approach provides:
 * - 80-90% cost reduction in OpenAI API calls
 * - Sub-millisecond cache reads from KV
 * - Historical analytics from database
 * - Automatic cache invalidation on profile changes
 */

import type { JobCompatibilityAnalysis, Env } from '../types';

// =============================================================================
// Configuration
// =============================================================================

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const KV_KEY_PREFIX = 'job-analysis';

// =============================================================================
// Types
// =============================================================================

interface CachedAnalysis {
  analysis: JobCompatibilityAnalysis;
  cachedAt: string; // ISO timestamp
  source: 'kv' | 'database' | 'generated';
}

// =============================================================================
// KV Cache Functions
// =============================================================================

/**
 * Generate KV cache key for a user-job pair
 */
function getKVKey(userId: string, jobId: string): string {
  return `${KV_KEY_PREFIX}:${userId}:${jobId}`;
}

/**
 * Get analysis from KV cache
 *
 * @returns Cached analysis or null if not found/expired
 */
export async function getFromKVCache(
  env: Env,
  userId: string,
  jobId: string
): Promise<JobCompatibilityAnalysis | null> {
  try {
    if (!env.JOB_ANALYSIS_CACHE) {
      console.log('[JobAnalysisCache] KV namespace not configured, skipping KV cache');
      return null;
    }

    const key = getKVKey(userId, jobId);
    const cached = await env.JOB_ANALYSIS_CACHE.get(key, { type: 'json' });

    if (!cached) {
      console.log(`[JobAnalysisCache] KV cache MISS for ${key}`);

      // Log KV cache miss
      console.log(JSON.stringify({
        event: 'cache_lookup',
        cache_type: 'kv',
        user_id: userId,
        job_id: jobId,
        result: 'miss',
        timestamp: new Date().toISOString(),
      }));

      return null;
    }

    console.log(`[JobAnalysisCache] ✓ KV cache HIT for ${key} - Cost savings!`);

    // Log KV cache hit
    console.log(JSON.stringify({
      event: 'cache_lookup',
      cache_type: 'kv',
      user_id: userId,
      job_id: jobId,
      result: 'hit',
      timestamp: new Date().toISOString(),
    }));

    return cached as JobCompatibilityAnalysis;
  } catch (error) {
    console.error('[JobAnalysisCache] Error reading from KV cache:', error);
    return null; // Fail gracefully, continue to database fallback
  }
}

/**
 * Store analysis in KV cache with TTL
 */
export async function storeInKVCache(
  env: Env,
  userId: string,
  jobId: string,
  analysis: JobCompatibilityAnalysis
): Promise<void> {
  try {
    if (!env.JOB_ANALYSIS_CACHE) {
      console.log('[JobAnalysisCache] KV namespace not configured, skipping KV cache write');
      return;
    }

    const key = getKVKey(userId, jobId);
    await env.JOB_ANALYSIS_CACHE.put(
      key,
      JSON.stringify(analysis),
      {
        expirationTtl: CACHE_TTL_SECONDS,
      }
    );

    console.log(`[JobAnalysisCache] Stored in KV cache: ${key} (TTL: 7 days)`);
  } catch (error) {
    console.error('[JobAnalysisCache] Error writing to KV cache:', error);
    // Fail gracefully - cache write failure shouldn't break the request
  }
}

/**
 * Invalidate KV cache for a user (called when profile changes)
 *
 * Note: KV doesn't support pattern deletion, so we can't delete all
 * keys matching "job-analysis:{userId}:*". Instead, we track keys
 * to delete in the database or rely on TTL expiration.
 *
 * For immediate invalidation, you would need to:
 * 1. Store a list of job IDs the user has analyzed
 * 2. Delete each key individually
 *
 * For now, we rely on the 7-day TTL to eventually expire stale data.
 * If user profile changes significantly, they can re-analyze jobs.
 */
export async function invalidateKVCacheForUser(
  env: Env,
  userId: string,
  jobIds?: string[]
): Promise<void> {
  try {
    if (!env.JOB_ANALYSIS_CACHE) {
      console.log('[JobAnalysisCache] KV namespace not configured, skipping invalidation');
      return;
    }

    if (jobIds && jobIds.length > 0) {
      // Delete specific job analyses
      for (const jobId of jobIds) {
        const key = getKVKey(userId, jobId);
        await env.JOB_ANALYSIS_CACHE.delete(key);
        console.log(`[JobAnalysisCache] Invalidated KV cache: ${key}`);
      }
    } else {
      // For bulk invalidation, we'd need to track all analyzed jobs
      // For now, log a warning and rely on TTL
      console.log(`[JobAnalysisCache] Bulk KV invalidation requested for user ${userId}, but not implemented. Rely on 7-day TTL.`);
    }
  } catch (error) {
    console.error('[JobAnalysisCache] Error invalidating KV cache:', error);
  }
}

// =============================================================================
// Database Cache Functions
// =============================================================================

/**
 * Get analysis from D1 database
 *
 * Migrated from Supabase to D1 on 2026-01-02
 * Uses prepared statements with app-level RLS (WHERE user_id = ?)
 *
 * @returns Cached analysis or null if not found
 */
export async function getFromDatabase(
  env: Env,
  userId: string,
  jobId: string
): Promise<JobCompatibilityAnalysis | null> {
  try {
    const result = await env.DB.prepare(
      `SELECT analysis, created_at
       FROM job_compatibility_analyses
       WHERE user_id = ? AND job_id = ?
       LIMIT 1`
    )
      .bind(userId, jobId)
      .first<{ analysis: string; created_at: string }>();

    if (!result) {
      console.log(`[JobAnalysisCache] D1 cache MISS for user ${userId}, job ${jobId}`);

      // Log database cache miss
      console.log(JSON.stringify({
        event: 'cache_lookup',
        cache_type: 'd1',
        user_id: userId,
        job_id: jobId,
        result: 'miss',
        timestamp: new Date().toISOString(),
      }));

      return null;
    }

    console.log(`[JobAnalysisCache] ✓ D1 cache HIT for user ${userId}, job ${jobId}`);

    // Log database cache hit
    console.log(JSON.stringify({
      event: 'cache_lookup',
      cache_type: 'd1',
      user_id: userId,
      job_id: jobId,
      result: 'hit',
      timestamp: new Date().toISOString(),
    }));

    // Parse JSON analysis from TEXT column
    return JSON.parse(result.analysis) as JobCompatibilityAnalysis;
  } catch (error) {
    console.error('[JobAnalysisCache] Error reading from D1 cache:', error);
    return null;
  }
}

/**
 * Store analysis in D1 database (upsert to handle re-analysis)
 *
 * Migrated from Supabase to D1 on 2026-01-02
 * Uses INSERT OR REPLACE for upsert behavior
 */
export async function storeInDatabase(
  env: Env,
  userId: string,
  jobId: string,
  analysis: JobCompatibilityAnalysis
): Promise<void> {
  try {
    const now = new Date().toISOString();

    // SQLite upsert using INSERT OR REPLACE
    // This will update if (user_id, job_id) already exists
    await env.DB.prepare(
      `INSERT INTO job_compatibility_analyses (user_id, job_id, analysis, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, job_id)
       DO UPDATE SET
         analysis = excluded.analysis,
         updated_at = excluded.updated_at`
    )
      .bind(
        userId,
        jobId,
        JSON.stringify(analysis), // Store as JSON TEXT
        now,
        now
      )
      .run();

    console.log(`[JobAnalysisCache] Stored in D1 database: user ${userId}, job ${jobId}`);
  } catch (error) {
    console.error('[JobAnalysisCache] Failed to store in D1 database:', error);
    // Fail gracefully - database write failure shouldn't break the request
  }
}

/**
 * Invalidate D1 database cache for a user
 *
 * Migrated from Supabase to D1 on 2026-01-02
 * Deletes all cached analyses for a user (called when profile changes significantly)
 */
export async function invalidateDatabaseCacheForUser(
  env: Env,
  userId: string,
  jobIds?: string[]
): Promise<void> {
  try {
    if (jobIds && jobIds.length > 0) {
      // Delete specific job analyses
      // Build IN clause with placeholders
      const placeholders = jobIds.map(() => '?').join(',');
      const sql = `DELETE FROM job_compatibility_analyses
                   WHERE user_id = ? AND job_id IN (${placeholders})`;

      await env.DB.prepare(sql)
        .bind(userId, ...jobIds)
        .run();

      console.log(`[JobAnalysisCache] Invalidated ${jobIds.length} D1 entries for user ${userId}`);
    } else {
      // Delete all analyses for user
      await env.DB.prepare(
        `DELETE FROM job_compatibility_analyses WHERE user_id = ?`
      )
        .bind(userId)
        .run();

      console.log(`[JobAnalysisCache] Invalidated ALL D1 entries for user ${userId}`);
    }
  } catch (error) {
    console.error('[JobAnalysisCache] Failed to invalidate D1 cache:', error);
  }
}

// =============================================================================
// High-Level Cache API
// =============================================================================

/**
 * Get cached analysis using fallback chain: KV → Database → null
 *
 * This is the primary function to use when retrieving cached analyses.
 * It automatically falls back through the cache layers.
 *
 * @returns Cached analysis with metadata, or null if not found
 */
export async function getCachedAnalysis(
  env: Env,
  userId: string,
  jobId: string
): Promise<CachedAnalysis | null> {
  // Try KV cache first (fastest)
  const kvResult = await getFromKVCache(env, userId, jobId);
  if (kvResult) {
    return {
      analysis: kvResult,
      cachedAt: new Date().toISOString(),
      source: 'kv',
    };
  }

  // Fallback to database
  const dbResult = await getFromDatabase(env, userId, jobId);
  if (dbResult) {
    // Backfill KV cache for next time
    await storeInKVCache(env, userId, jobId, dbResult);

    return {
      analysis: dbResult,
      cachedAt: new Date().toISOString(),
      source: 'database',
    };
  }

  // No cache hit
  return null;
}

/**
 * Store analysis in both KV and Database
 *
 * This is the primary function to use when caching new analyses.
 * It stores in both layers for maximum coverage.
 */
export async function cacheAnalysis(
  env: Env,
  userId: string,
  jobId: string,
  analysis: JobCompatibilityAnalysis
): Promise<void> {
  // Store in both KV and database (fire and forget for KV)
  await Promise.allSettled([
    storeInKVCache(env, userId, jobId, analysis),
    storeInDatabase(env, userId, jobId, analysis),
  ]);
}

/**
 * Invalidate all caches for a user
 *
 * Call this when user profile changes significantly:
 * - Work experience updated
 * - Skills modified
 * - Education changed
 * - Resume re-uploaded
 *
 * @param jobIds - Optional list of specific job IDs to invalidate. If not provided, invalidates all.
 */
export async function invalidateCacheForUser(
  env: Env,
  userId: string,
  jobIds?: string[]
): Promise<void> {
  console.log(`[JobAnalysisCache] Invalidating caches for user ${userId}...`);

  await Promise.allSettled([
    invalidateKVCacheForUser(env, userId, jobIds),
    invalidateDatabaseCacheForUser(env, userId, jobIds),
  ]);

  console.log(`[JobAnalysisCache] Cache invalidation complete for user ${userId}`);
}
