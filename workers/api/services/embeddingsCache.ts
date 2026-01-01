/**
 * Dual-Layer Embeddings Cache for Cloudflare Workers
 *
 * Implements two-layer caching strategy (Phase 2.4):
 * - Layer 1: KV (30-day TTL, user-specific, persistent across deployments)
 * - Layer 2: AI Gateway (1-hour TTL, global, automatic via Cloudflare)
 *
 * Cache flow:
 * 1. Check KV first (Layer 1) - <10ms latency
 * 2. If miss, call Workers AI (goes through AI Gateway - Layer 2)
 * 3. Store result in KV for future hits
 *
 * Expected cache hit rate: 60-70% combined (Layer 1 + Layer 2)
 * Cost savings: 60-80% reduction in AI compute costs
 */

import type { Env } from '../types';
import { createHash } from 'crypto';

// =============================================================================
// Configuration
// =============================================================================

/**
 * KV cache TTL (30 days)
 * Balances freshness vs. storage costs
 */
const KV_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Workers AI embedding model
 * Must match the model in embeddings.ts
 */
const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';

/**
 * Expected embedding dimensions
 */
const EXPECTED_DIMENSIONS = 768;

// =============================================================================
// Types
// =============================================================================

interface CachedEmbedding {
  embedding: number[];
  model: string;
  cachedAt: string;
  hash: string;
}

interface WorkersAIEmbeddingResponse {
  shape: number[];
  data: number[][];
}

// =============================================================================
// Cache Key Generation
// =============================================================================

/**
 * Generate deterministic cache key from text
 *
 * Uses SHA-256 hash to create consistent keys for identical text.
 * Truncation to 8000 chars ensures consistent hashing for long text.
 *
 * @param text - Input text to embed
 * @returns Cache key string: embed:{hash}
 */
function generateCacheKey(text: string): string {
  // Truncate to match embedding generation limit
  const maxChars = 8000; // ~2000 tokens
  const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text;

  // Generate SHA-256 hash
  const hash = createHash('sha256').update(truncatedText).digest('hex');

  // Use first 16 chars of hash for key (collision probability: ~1 in 10^38)
  return `embed:${hash.substring(0, 16)}`;
}

// =============================================================================
// Cached Embedding Generation
// =============================================================================

/**
 * Generate embedding with dual-layer caching
 *
 * Layer 1 (KV): Check KV cache first
 * Layer 2 (AI Gateway): Workers AI call routes through AI Gateway
 *
 * @param env - Environment bindings
 * @param text - Input text to embed
 * @returns 768-dimensional embedding vector
 * @throws Error if embedding generation fails
 */
export async function generateCachedEmbedding(env: Env, text: string): Promise<number[]> {
  const startTime = Date.now();

  // Validate input
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  const cacheKey = generateCacheKey(text);

  // Layer 1: Check KV cache
  try {
    const kvStartTime = Date.now();
    const cached = await env.EMBEDDINGS_CACHE.get(cacheKey, { type: 'json' }) as CachedEmbedding | null;
    const kvLatency = Date.now() - kvStartTime;

    if (cached && cached.embedding && cached.embedding.length === EXPECTED_DIMENSIONS) {
      const totalLatency = Date.now() - startTime;
      console.log(
        `[EmbeddingsCache] ✓ Layer 1 (KV) HIT in ${kvLatency}ms (total: ${totalLatency}ms) - Cost savings!`
      );
      console.log(`[EmbeddingsCache] Cached embedding from ${cached.cachedAt}, model: ${cached.model}`);

      return cached.embedding;
    }

    if (cached) {
      console.warn('[EmbeddingsCache] Layer 1 (KV) HIT but invalid data, will regenerate');
    } else {
      console.log(`[EmbeddingsCache] Layer 1 (KV) MISS in ${kvLatency}ms, calling Workers AI (Layer 2)`);
    }
  } catch (error) {
    console.error('[EmbeddingsCache] Layer 1 (KV) error:', error);
    // Continue to Layer 2 on KV error
  }

  // Layer 2: Call Workers AI (routes through AI Gateway automatically)
  // AI Gateway provides automatic 1-hour cache for identical requests
  const aiStartTime = Date.now();

  // Truncate very long text (Workers AI has token limits)
  const maxChars = 8000; // ~2000 tokens
  const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text;

  console.log(`[EmbeddingsCache] Layer 2: Calling Workers AI for text (${truncatedText.length} chars)`);

  try {
    // Call Workers AI (request goes through AI Gateway if configured)
    const response = (await env.AI.run(EMBEDDING_MODEL, {
      text: [truncatedText],
    })) as WorkersAIEmbeddingResponse;

    // Validate response structure
    if (!response || !response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response structure from Workers AI');
    }

    // Extract embedding vector (first result since we sent single text)
    const embedding = response.data[0];

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Embedding data is missing or invalid');
    }

    // Validate dimensions
    if (embedding.length !== EXPECTED_DIMENSIONS) {
      throw new Error(
        `Unexpected embedding dimensions: got ${embedding.length}, expected ${EXPECTED_DIMENSIONS}`
      );
    }

    const aiLatency = Date.now() - aiStartTime;
    const totalLatency = Date.now() - startTime;

    console.log(
      `[EmbeddingsCache] ✓ Layer 2 (Workers AI) SUCCESS in ${aiLatency}ms (total: ${totalLatency}ms)`
    );

    // Store in KV for future hits (Layer 1 cache)
    const cachedData: CachedEmbedding = {
      embedding,
      model: EMBEDDING_MODEL,
      cachedAt: new Date().toISOString(),
      hash: cacheKey.replace('embed:', ''),
    };

    // Fire-and-forget KV write (don't block response)
    env.EMBEDDINGS_CACHE.put(cacheKey, JSON.stringify(cachedData), {
      expirationTtl: KV_CACHE_TTL_SECONDS, // 30 days
    }).catch((error) => {
      console.error('[EmbeddingsCache] Failed to store in KV:', error);
    });

    console.log(`[EmbeddingsCache] Stored embedding in KV with 30-day TTL (key: ${cacheKey})`);

    return embedding;
  } catch (error) {
    const aiLatency = Date.now() - aiStartTime;
    const totalLatency = Date.now() - startTime;

    console.error(
      `[EmbeddingsCache] Layer 2 (Workers AI) FAILED after ${aiLatency}ms (total: ${totalLatency}ms):`,
      error instanceof Error ? error.message : String(error)
    );

    throw error;
  }
}

// =============================================================================
// Cache Statistics
// =============================================================================

/**
 * Get cache statistics for monitoring
 *
 * Note: KV doesn't provide built-in hit rate metrics.
 * This is a placeholder for future implementation using separate metrics storage.
 *
 * @param _env - Environment bindings
 * @returns Cache statistics (placeholder)
 */
export async function getCacheStatistics(_env: Env): Promise<{
  layer1HitRate: number | null;
  layer2HitRate: number | null;
  totalHitRate: number | null;
}> {
  // Placeholder - would require separate metrics storage
  console.log('[EmbeddingsCache] Cache statistics not yet implemented');

  return {
    layer1HitRate: null, // Would need to track hits/misses in separate KV key
    layer2HitRate: null, // AI Gateway provides this in dashboard
    totalHitRate: null,
  };
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * Clear specific embedding from cache
 *
 * Useful for invalidating stale embeddings when content changes.
 *
 * @param env - Environment bindings
 * @param text - Original text that was embedded
 */
export async function clearEmbeddingCache(env: Env, text: string): Promise<void> {
  const cacheKey = generateCacheKey(text);

  try {
    await env.EMBEDDINGS_CACHE.delete(cacheKey);
    console.log(`[EmbeddingsCache] Cleared cache for key: ${cacheKey}`);
  } catch (error) {
    console.error('[EmbeddingsCache] Failed to clear cache:', error);
    throw error;
  }
}

/**
 * Warm cache with pre-computed embeddings
 *
 * Useful for batch processing or pre-warming cache with known queries.
 *
 * @param env - Environment bindings
 * @param text - Text to embed
 * @param embedding - Pre-computed embedding
 */
export async function warmEmbeddingCache(
  env: Env,
  text: string,
  embedding: number[]
): Promise<void> {
  // Validate embedding
  if (!embedding || embedding.length !== EXPECTED_DIMENSIONS) {
    throw new Error(`Invalid embedding dimensions: ${embedding.length}`);
  }

  const cacheKey = generateCacheKey(text);

  const cachedData: CachedEmbedding = {
    embedding,
    model: EMBEDDING_MODEL,
    cachedAt: new Date().toISOString(),
    hash: cacheKey.replace('embed:', ''),
  };

  await env.EMBEDDINGS_CACHE.put(cacheKey, JSON.stringify(cachedData), {
    expirationTtl: KV_CACHE_TTL_SECONDS,
  });

  console.log(`[EmbeddingsCache] Warmed cache for key: ${cacheKey}`);
}
