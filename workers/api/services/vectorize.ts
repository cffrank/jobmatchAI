/**
 * Vectorize Service for Cloudflare Workers
 *
 * Manages vector embeddings storage and semantic search using Cloudflare Vectorize.
 * Provides hybrid search combining FTS5 (keyword) and Vectorize (semantic).
 *
 * Phase 3.1: Vectorize Semantic Search Implementation
 * - Stores job embeddings in Vectorize index
 * - Provides semantic search with cosine similarity
 * - Combines with FTS5 for hybrid search
 */

import type { Env } from '../types';
import { generateCachedEmbedding } from './embeddingsCache';

// =============================================================================
// Types
// =============================================================================

/**
 * Vectorize query result
 */
export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: {
    jobId: string;
    userId: string;
    title: string;
    company: string;
  };
}

/**
 * Hybrid search result combining FTS5 and Vectorize
 */
export interface HybridSearchResult {
  jobId: string;
  keywordScore: number;
  semanticScore: number;
  combinedScore: number;
}

// =============================================================================
// Vectorize Index Management
// =============================================================================

/**
 * Store job embedding in Vectorize index
 *
 * @param env - Environment bindings (includes VECTORIZE)
 * @param jobId - Unique job identifier
 * @param userId - User who owns the job
 * @param title - Job title (for metadata)
 * @param company - Company name (for metadata)
 * @param embedding - 768-dimensional embedding vector
 */
export async function storeJobEmbedding(
  env: Env,
  jobId: string,
  userId: string,
  title: string,
  company: string,
  embedding: number[]
): Promise<void> {
  const startTime = Date.now();

  try {
    // Validate embedding dimensions
    if (embedding.length !== 768) {
      throw new Error(`Invalid embedding dimensions: ${embedding.length}, expected 768`);
    }

    // Store in Vectorize with metadata
    // Vector ID format: job:{jobId}
    const vectorId = `job:${jobId}`;

    await env.VECTORIZE.insert([
      {
        id: vectorId,
        values: embedding,
        metadata: {
          jobId,
          userId,
          title,
          company,
        },
      },
    ]);

    const duration = Date.now() - startTime;
    console.log(
      `[Vectorize] ✓ Stored embedding for job ${jobId} (${title} at ${company}) in ${duration}ms`
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[Vectorize] ✗ Failed to store embedding for job ${jobId} after ${duration}ms:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

/**
 * Delete job embedding from Vectorize index
 *
 * @param env - Environment bindings
 * @param jobId - Job ID to delete
 */
export async function deleteJobEmbedding(env: Env, jobId: string): Promise<void> {
  const startTime = Date.now();

  try {
    const vectorId = `job:${jobId}`;
    await env.VECTORIZE.deleteByIds([vectorId]);

    const duration = Date.now() - startTime;
    console.log(`[Vectorize] ✓ Deleted embedding for job ${jobId} in ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[Vectorize] ✗ Failed to delete embedding for job ${jobId} after ${duration}ms:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

// =============================================================================
// Semantic Search
// =============================================================================

/**
 * Perform semantic search using Vectorize
 *
 * @param env - Environment bindings
 * @param queryText - Search query text
 * @param userId - User ID to filter results (security: only return user's jobs)
 * @param topK - Number of results to return (default: 20)
 * @returns Array of search results with similarity scores
 */
export async function semanticSearchJobs(
  env: Env,
  queryText: string,
  userId: string,
  topK: number = 20
): Promise<VectorSearchResult[]> {
  const startTime = Date.now();

  try {
    // Generate query embedding
    console.log(`[Vectorize] Generating query embedding for: "${queryText.substring(0, 50)}..."`);
    const queryEmbedding = await generateCachedEmbedding(env, queryText);

    // Search Vectorize index
    const searchStartTime = Date.now();
    const results = await env.VECTORIZE.query(queryEmbedding, {
      topK: topK * 2, // Request more results to filter by userId
      returnMetadata: true,
    });

    const searchDuration = Date.now() - searchStartTime;
    console.log(`[Vectorize] Vector search completed in ${searchDuration}ms, found ${results.matches.length} results`);

    // Filter results by userId (security: only return user's jobs)
    const filteredResults = results.matches
      .filter((match) => match.metadata?.userId === userId)
      .slice(0, topK)
      .map((match) => ({
        id: match.id,
        score: match.score,
        metadata: {
          jobId: match.metadata?.jobId as string,
          userId: match.metadata?.userId as string,
          title: match.metadata?.title as string,
          company: match.metadata?.company as string,
        },
      }));

    const totalDuration = Date.now() - startTime;
    console.log(
      `[Vectorize] ✓ Semantic search completed in ${totalDuration}ms, returning ${filteredResults.length} user-filtered results`
    );

    return filteredResults;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[Vectorize] ✗ Semantic search failed after ${duration}ms:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

// =============================================================================
// Hybrid Search (FTS5 + Vectorize)
// =============================================================================

/**
 * Perform hybrid search combining keyword (FTS5) and semantic (Vectorize) search
 *
 * Strategy:
 * 1. Keyword search using D1 FTS5 (fast, exact matches)
 * 2. Semantic search using Vectorize (contextual, fuzzy matches)
 * 3. Combine and rank results using weighted scoring
 *
 * @param env - Environment bindings
 * @param db - D1 database instance
 * @param queryText - Search query text
 * @param userId - User ID for filtering
 * @param options - Search options
 * @returns Array of job IDs with combined scores
 */
export async function hybridSearchJobs(
  env: Env,
  db: D1Database,
  queryText: string,
  userId: string,
  options: {
    topK?: number;
    keywordWeight?: number;
    semanticWeight?: number;
  } = {}
): Promise<HybridSearchResult[]> {
  const {
    topK = 20,
    keywordWeight = 0.3, // 30% weight to keyword matching
    semanticWeight = 0.7, // 70% weight to semantic matching
  } = options;

  const startTime = Date.now();

  try {
    // Step 1: Keyword search using FTS5
    console.log(`[HybridSearch] Starting keyword search (FTS5) for: "${queryText}"`);
    const fts5StartTime = Date.now();

    const keywordResults = await db
      .prepare(
        `
        SELECT
          j.id as jobId,
          rank as fts_score
        FROM jobs_fts fts
        INNER JOIN jobs j ON j.id = fts.rowid
        WHERE jobs_fts MATCH ?
          AND j.user_id = ?
        ORDER BY rank
        LIMIT ?
      `
      )
      .bind(queryText, userId, topK * 2)
      .all();

    const fts5Duration = Date.now() - fts5StartTime;
    console.log(
      `[HybridSearch] FTS5 search completed in ${fts5Duration}ms, found ${keywordResults.results?.length || 0} results`
    );

    // Step 2: Semantic search using Vectorize
    console.log(`[HybridSearch] Starting semantic search (Vectorize)`);
    const vectorizeStartTime = Date.now();

    const semanticResults = await semanticSearchJobs(env, queryText, userId, topK * 2);

    const vectorizeDuration = Date.now() - vectorizeStartTime;
    console.log(`[HybridSearch] Vectorize search completed in ${vectorizeDuration}ms`);

    // Step 3: Combine and rank results
    const combinedScores = new Map<string, HybridSearchResult>();

    // Add keyword results
    for (const result of keywordResults.results || []) {
      const jobId = result.jobId as string;
      const ftsScore = Math.abs(result.fts_score as number); // FTS5 rank is negative, normalize to positive

      // Normalize FTS5 score to 0-1 range (lower rank = better)
      const normalizedKeywordScore = 1 / (1 + ftsScore);

      combinedScores.set(jobId, {
        jobId,
        keywordScore: normalizedKeywordScore,
        semanticScore: 0,
        combinedScore: normalizedKeywordScore * keywordWeight,
      });
    }

    // Add semantic results
    for (const result of semanticResults) {
      const jobId = result.metadata.jobId;
      const semanticScore = result.score; // Already 0-1 range from cosine similarity

      const existing = combinedScores.get(jobId);
      if (existing) {
        // Job found in both searches - update with semantic score
        existing.semanticScore = semanticScore;
        existing.combinedScore = existing.keywordScore * keywordWeight + semanticScore * semanticWeight;
      } else {
        // Job only found in semantic search
        combinedScores.set(jobId, {
          jobId,
          keywordScore: 0,
          semanticScore: semanticScore,
          combinedScore: semanticScore * semanticWeight,
        });
      }
    }

    // Sort by combined score (descending) and take top K
    const rankedResults = Array.from(combinedScores.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, topK);

    const totalDuration = Date.now() - startTime;
    console.log(
      `[HybridSearch] ✓ Hybrid search completed in ${totalDuration}ms, returning ${rankedResults.length} results`
    );
    console.log(
      `[HybridSearch] Score breakdown - Keyword weight: ${keywordWeight}, Semantic weight: ${semanticWeight}`
    );

    return rankedResults;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[HybridSearch] ✗ Hybrid search failed after ${duration}ms:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Batch insert job embeddings (for migration or bulk import)
 *
 * @param env - Environment bindings
 * @param jobs - Array of job data with embeddings
 */
export async function batchStoreJobEmbeddings(
  env: Env,
  jobs: Array<{
    jobId: string;
    userId: string;
    title: string;
    company: string;
    embedding: number[];
  }>
): Promise<void> {
  const startTime = Date.now();

  try {
    const vectors = jobs.map((job) => ({
      id: `job:${job.jobId}`,
      values: job.embedding,
      metadata: {
        jobId: job.jobId,
        userId: job.userId,
        title: job.title,
        company: job.company,
      },
    }));

    await env.VECTORIZE.insert(vectors);

    const duration = Date.now() - startTime;
    console.log(`[Vectorize] ✓ Batch stored ${jobs.length} embeddings in ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[Vectorize] ✗ Batch store failed after ${duration}ms:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}
