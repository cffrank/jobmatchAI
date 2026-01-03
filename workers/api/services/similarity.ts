/**
 * Similarity Service
 *
 * Provides vector similarity calculations and job ranking functionality.
 * All functions are pure (no side effects) and optimized for 768-dimensional vectors.
 */

import type { Database } from '../../../src/types/supabase';

// Type alias for Job row from database
type Job = Database['public']['Tables']['jobs']['Row'];

/**
 * Job with its associated embedding vector
 */
export interface JobWithEmbedding {
  job: Job;
  embedding: number[];
}

/**
 * Job ranked by semantic similarity with scores
 */
export interface RankedJob {
  job: Job;
  semanticScore: number; // 0-1 cosine similarity
  normalizedScore: number; // 0-100 for display
}

/**
 * Calculate cosine similarity between two vectors.
 *
 * Cosine similarity measures the cosine of the angle between two vectors,
 * producing a value between -1 (opposite) and 1 (identical).
 *
 * Formula: cos(θ) = (A · B) / (||A|| × ||B||)
 * where A · B is dot product and ||A|| is magnitude (norm)
 *
 * @param vecA - First vector (must be 768-dimensional)
 * @param vecB - Second vector (must be 768-dimensional)
 * @returns Similarity score between -1 and 1 (higher = more similar)
 * @throws {Error} If vectors are null, undefined, or have different dimensions
 *
 * @example
 * const userVector = [0.1, 0.2, ...]; // 768 dimensions
 * const jobVector = [0.15, 0.18, ...]; // 768 dimensions
 * const similarity = cosineSimilarity(userVector, jobVector);
 * console.log(similarity); // 0.95 (very similar)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  // Input validation
  if (!vecA || !vecB) {
    throw new Error('Vectors cannot be null or undefined');
  }

  if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
    throw new Error('Both inputs must be arrays');
  }

  if (vecA.length !== vecB.length) {
    throw new Error(
      `Vector dimensions must match. Got ${vecA.length} and ${vecB.length}`
    );
  }

  if (vecA.length === 0) {
    throw new Error('Vectors cannot be empty');
  }

  // Validate all elements are numbers
  if (vecA.some(v => typeof v !== 'number' || !isFinite(v))) {
    throw new Error('First vector contains invalid values (NaN or Infinity)');
  }

  if (vecB.some(v => typeof v !== 'number' || !isFinite(v))) {
    throw new Error('Second vector contains invalid values (NaN or Infinity)');
  }

  // Calculate dot product and magnitudes in a single pass for performance
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  // Take square root to get actual magnitudes
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  // Handle zero vectors (would cause division by zero)
  if (magnitudeA === 0 || magnitudeB === 0) {
    throw new Error('Cannot calculate similarity for zero vectors');
  }

  // Calculate and return cosine similarity
  const similarity = dotProduct / (magnitudeA * magnitudeB);

  // Clamp to [-1, 1] to handle floating point precision issues
  return Math.max(-1, Math.min(1, similarity));
}

/**
 * Rank jobs by semantic similarity to a user embedding.
 *
 * Calculates cosine similarity between the user's embedding and each job's
 * embedding, then sorts jobs by similarity score in descending order.
 *
 * @param userEmbedding - User's 768-dimensional embedding vector
 * @param jobs - Array of jobs with their embedding vectors
 * @returns Array of jobs ranked by similarity (highest first)
 * @throws {Error} If userEmbedding is invalid or any job has invalid embedding
 *
 * @example
 * const userEmbedding = getUserEmbedding(); // 768-dim vector
 * const jobsWithEmbeddings = await getJobsWithEmbeddings();
 * const ranked = rankJobsBySimilarity(userEmbedding, jobsWithEmbeddings);
 *
 * ranked.forEach(({ job, semanticScore, normalizedScore }) => {
 *   console.log(`${job.title}: ${normalizedScore}% match`);
 * });
 */
export function rankJobsBySimilarity(
  userEmbedding: number[],
  jobs: JobWithEmbedding[]
): RankedJob[] {
  // Input validation
  if (!userEmbedding || !Array.isArray(userEmbedding)) {
    throw new Error('User embedding must be a valid array');
  }

  if (userEmbedding.length === 0) {
    throw new Error('User embedding cannot be empty');
  }

  if (!jobs || !Array.isArray(jobs)) {
    throw new Error('Jobs must be a valid array');
  }

  // Calculate similarity for each job
  const rankedJobs: RankedJob[] = jobs.map((jobWithEmbedding, index) => {
    // Validate jobWithEmbedding is not null before destructuring
    if (!jobWithEmbedding) {
      throw new Error(`Job at index ${index} is null or undefined`);
    }

    const { job, embedding } = jobWithEmbedding;

    // Validate job structure
    if (!job) {
      throw new Error(`Job at index ${index} is null or undefined`);
    }

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error(
        `Job "${job.title || 'unknown'}" (index ${index}) has invalid embedding`
      );
    }

    // Calculate cosine similarity (will throw if dimensions don't match)
    let semanticScore: number;
    try {
      semanticScore = cosineSimilarity(userEmbedding, embedding);
    } catch (error) {
      throw new Error(
        `Failed to calculate similarity for job "${job.title || 'unknown'}" (index ${index}): ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    // Normalize score from [-1, 1] to [0, 1] for consistency
    // (cosine similarity is typically in [0, 1] for text embeddings, but we handle full range)
    const normalizedSemanticScore = (semanticScore + 1) / 2;

    // Convert to 0-100 scale for display
    const normalizedScore = normalizedSemanticScore * 100;

    return {
      job,
      semanticScore,
      normalizedScore,
    };
  });

  // Sort by semantic score (descending) - highest similarity first
  rankedJobs.sort((a, b) => b.semanticScore - a.semanticScore);

  return rankedJobs;
}

/**
 * Calculate hybrid score combining semantic and keyword matching.
 *
 * Combines semantic similarity (vector-based) with traditional keyword matching
 * to produce a final relevance score. Semantic matching is weighted at 70%
 * and keyword matching at 30%.
 *
 * @param semanticScore - Cosine similarity score (0-1 range)
 * @param keywordScore - Keyword matching score (0-100 range)
 * @returns Combined score on 0-100 scale
 * @throws {Error} If scores are out of valid ranges
 *
 * @example
 * const semantic = 0.85; // 85% semantic similarity
 * const keyword = 75; // 75% keyword match
 * const hybrid = hybridScore(semantic, keyword);
 * console.log(hybrid); // 82.0 (59.5 from semantic + 22.5 from keyword)
 */
export function hybridScore(
  semanticScore: number,
  keywordScore: number
): number {
  // Input validation
  if (typeof semanticScore !== 'number' || !isFinite(semanticScore)) {
    throw new Error('Semantic score must be a finite number');
  }

  if (typeof keywordScore !== 'number' || !isFinite(keywordScore)) {
    throw new Error('Keyword score must be a finite number');
  }

  if (semanticScore < 0 || semanticScore > 1) {
    throw new Error('Semantic score must be between 0 and 1');
  }

  if (keywordScore < 0 || keywordScore > 100) {
    throw new Error('Keyword score must be between 0 and 100');
  }

  // Weights for hybrid scoring
  const SEMANTIC_WEIGHT = 0.7; // 70% weight on semantic similarity
  const KEYWORD_WEIGHT = 0.3; // 30% weight on keyword matching

  // Normalize semantic score to 0-100 scale and apply weight
  const semanticContribution = semanticScore * 100 * SEMANTIC_WEIGHT;

  // Apply weight to keyword score
  const keywordContribution = keywordScore * KEYWORD_WEIGHT;

  // Calculate final hybrid score
  const finalScore = semanticContribution + keywordContribution;

  // Round to 2 decimal places for consistency
  return Math.round(finalScore * 100) / 100;
}
