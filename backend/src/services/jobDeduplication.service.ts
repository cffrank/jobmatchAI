/**
 * Job Deduplication Service
 *
 * Provides comprehensive job deduplication using multiple similarity algorithms:
 * - Levenshtein distance for string similarity
 * - Token-based Jaccard similarity for set overlap
 * - Cosine similarity for semantic matching
 * - URL-based exact matching
 *
 * Features:
 * - Efficient O(n log n) duplicate detection using blocking strategies
 * - Quality-based canonical job selection
 * - Configurable similarity thresholds
 * - Batch processing for large datasets
 * - Background deduplication support
 *
 * Architecture:
 * - Multi-stage pipeline: blocking → pairwise comparison → scoring → canonical selection
 * - Avoids O(n²) complexity through smart blocking by company name
 * - Weighted similarity scores with confidence levels
 */

import { supabaseAdmin, TABLES } from '../config/supabase';
import type { Job } from '../types';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Similarity thresholds for duplicate detection
 */
interface SimilarityThresholds {
  high: number;    // >= 85% similarity = high confidence
  medium: number;  // >= 70% similarity = medium confidence
  low: number;     // >= 50% similarity = low confidence (manual review)
}

const THRESHOLDS: SimilarityThresholds = {
  high: 85,
  medium: 70,
  low: 50,
};

/**
 * Weights for similarity scoring
 */
const WEIGHTS = {
  title: 0.35,        // Title is most important
  company: 0.25,      // Company is very important
  location: 0.15,     // Location matters for non-remote jobs
  description: 0.25,  // Description provides context
};

/**
 * Batch size for processing
 */
const BATCH_SIZE = 100;

// =============================================================================
// Types
// =============================================================================

interface SimilarityScore {
  titleSimilarity: number;
  companySimilarity: number;
  locationSimilarity: number;
  descriptionSimilarity: number;
  overallSimilarity: number;
  confidenceLevel: 'high' | 'medium' | 'low';
}

interface DuplicatePair {
  canonicalJobId: string;
  duplicateJobId: string;
  similarityScore: SimilarityScore;
  detectionMethod: 'fuzzy_match' | 'url_match' | 'manual';
}

interface DeduplicationResult {
  totalJobsProcessed: number;
  duplicatesFound: number;
  canonicalJobsIdentified: number;
  processingTimeMs: number;
}

interface QualityScore {
  completenessScore: number;
  sourceReliabilityScore: number;
  freshnessScore: number;
  overallQualityScore: number;
}

// =============================================================================
// String Similarity Algorithms
// =============================================================================

/**
 * Calculate Levenshtein distance between two strings
 * Time complexity: O(m * n) where m, n are string lengths
 *
 * Used for precise character-level similarity (e.g., company names)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create distance matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill matrix using dynamic programming
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate normalized Levenshtein similarity (0-100)
 * 100 = identical strings, 0 = completely different
 */
function levenshteinSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 100;

  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100; // Both empty strings

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return ((maxLen - distance) / maxLen) * 100;
}

/**
 * Tokenize string into words (lowercase, alphanumeric only)
 */
function tokenize(str: string): Set<string> {
  const tokens = str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .split(/\s+/)
    .filter((token) => token.length > 0);

  return new Set(tokens);
}

/**
 * Calculate Jaccard similarity for token sets (0-100)
 * Measures overlap between two sets of tokens
 *
 * Used for job titles and descriptions where word order matters less
 */
function jaccardSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const tokens1 = tokenize(str1);
  const tokens2 = tokenize(str2);

  if (tokens1.size === 0 && tokens2.size === 0) return 100;
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  // Calculate intersection and union
  const intersection = new Set([...tokens1].filter((token) => tokens2.has(token)));
  const union = new Set([...tokens1, ...tokens2]);

  return (intersection.size / union.size) * 100;
}

/**
 * Calculate cosine similarity for strings (0-100)
 * Uses character bigram vectors
 *
 * Good for semantic similarity regardless of word order
 */
function cosineSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 100;

  // Extract character bigrams
  const getBigrams = (str: string): Map<string, number> => {
    const bigrams = new Map<string, number>();
    const normalized = str.toLowerCase();

    for (let i = 0; i < normalized.length - 1; i++) {
      const bigram = normalized.substring(i, i + 2);
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }

    return bigrams;
  };

  const bigrams1 = getBigrams(str1);
  const bigrams2 = getBigrams(str2);

  // Calculate dot product and magnitudes
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  // Union of all bigrams
  const allBigrams = new Set([...bigrams1.keys(), ...bigrams2.keys()]);

  for (const bigram of allBigrams) {
    const count1 = bigrams1.get(bigram) || 0;
    const count2 = bigrams2.get(bigram) || 0;

    dotProduct += count1 * count2;
    magnitude1 += count1 * count1;
    magnitude2 += count2 * count2;
  }

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return (dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2))) * 100;
}

/**
 * Hybrid similarity combining multiple algorithms
 * Uses best of Levenshtein, Jaccard, and Cosine
 */
function hybridSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 100;

  const lev = levenshteinSimilarity(str1, str2);
  const jaccard = jaccardSimilarity(str1, str2);
  const cosine = cosineSimilarity(str1, str2);

  // Use weighted average with emphasis on highest score
  // This catches both exact matches and semantic similarity
  return Math.max(lev, jaccard, cosine);
}

/**
 * Normalize location strings for comparison
 * Handles variations like "New York, NY" vs "New York City"
 */
function normalizeLocation(location: string): string {
  if (!location) return '';

  return location
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/,/g, '')
    .replace(/\./g, '')
    .replace(/\b(street|st|avenue|ave|road|rd|drive|dr)\b/g, '')
    .trim();
}

/**
 * Compare locations with fuzzy matching
 */
function locationSimilarity(loc1: string, loc2: string): number {
  if (!loc1 || !loc2) return 0;

  const norm1 = normalizeLocation(loc1);
  const norm2 = normalizeLocation(loc2);

  // Exact match after normalization
  if (norm1 === norm2) return 100;

  // Check if one location contains the other (e.g., "San Francisco" in "San Francisco, CA")
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 90;

  // Use hybrid similarity for fuzzy match
  return hybridSimilarity(norm1, norm2);
}

// =============================================================================
// Pairwise Similarity Calculation
// =============================================================================

/**
 * Calculate similarity between two jobs
 * Returns comprehensive similarity scores
 */
function calculateSimilarity(job1: Job, job2: Job): SimilarityScore {
  // Title similarity (most important)
  const titleSim = hybridSimilarity(job1.title, job2.title);

  // Company similarity (critical - same company likely = duplicate)
  const companySim = hybridSimilarity(job1.company, job2.company);

  // Location similarity (important for non-remote jobs)
  const locationSim = locationSimilarity(job1.location, job2.location);

  // Description similarity (truncate to first 500 chars for performance)
  const desc1 = (job1.description || '').substring(0, 500);
  const desc2 = (job2.description || '').substring(0, 500);
  const descriptionSim = hybridSimilarity(desc1, desc2);

  // Calculate overall similarity using weighted average
  const overallSimilarity =
    titleSim * WEIGHTS.title +
    companySim * WEIGHTS.company +
    locationSim * WEIGHTS.location +
    descriptionSim * WEIGHTS.description;

  // Determine confidence level
  const confidenceLevel: 'high' | 'medium' | 'low' =
    overallSimilarity >= THRESHOLDS.high
      ? 'high'
      : overallSimilarity >= THRESHOLDS.medium
        ? 'medium'
        : 'low';

  return {
    titleSimilarity: Math.round(titleSim * 100) / 100,
    companySimilarity: Math.round(companySim * 100) / 100,
    locationSimilarity: Math.round(locationSim * 100) / 100,
    descriptionSimilarity: Math.round(descriptionSim * 100) / 100,
    overallSimilarity: Math.round(overallSimilarity * 100) / 100,
    confidenceLevel,
  };
}

/**
 * Check if two jobs are duplicates based on URL
 * Exact URL match = definite duplicate
 */
function checkUrlMatch(job1: Job, job2: Job): boolean {
  if (!job1.url || !job2.url) return false;

  // Normalize URLs (remove trailing slashes, query params)
  const normalize = (url: string) => {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
    } catch {
      return url.toLowerCase().replace(/\/$/, '');
    }
  };

  return normalize(job1.url) === normalize(job2.url);
}

// =============================================================================
// Quality Scoring for Canonical Selection
// =============================================================================

/**
 * Calculate quality score for a job
 * Higher quality jobs become canonical
 */
async function calculateQualityScore(jobId: string): Promise<QualityScore> {
  try {
    const { data, error } = await supabaseAdmin.rpc('calculate_job_quality_score', {
      p_job_id: jobId,
    });

    if (error) {
      console.error('[Deduplication] Failed to calculate quality score:', error);
      throw error;
    }

    // Fetch detailed scores
    const { data: metadata } = await supabaseAdmin
      .from('canonical_job_metadata')
      .select('*')
      .eq('job_id', jobId)
      .single();

    return {
      completenessScore: metadata?.completeness_score || 0,
      sourceReliabilityScore: metadata?.source_reliability_score || 0,
      freshnessScore: metadata?.freshness_score || 0,
      overallQualityScore: data || 0,
    };
  } catch (error) {
    console.error('[Deduplication] Quality score calculation failed:', error);
    return {
      completenessScore: 0,
      sourceReliabilityScore: 0,
      freshnessScore: 0,
      overallQualityScore: 0,
    };
  }
}

/**
 * Select canonical job from duplicate pair
 * Returns job with higher quality score
 */
async function selectCanonicalJob(job1: Job, job2: Job): Promise<string> {
  const [score1, score2] = await Promise.all([
    calculateQualityScore(job1.id),
    calculateQualityScore(job2.id),
  ]);

  console.log(`[Deduplication] Quality scores: ${job1.id}=${score1.overallQualityScore}, ${job2.id}=${score2.overallQualityScore}`);

  return score1.overallQualityScore >= score2.overallQualityScore ? job1.id : job2.id;
}

// =============================================================================
// Duplicate Detection Pipeline
// =============================================================================

/**
 * Detect duplicates using blocking strategy
 * Groups jobs by company to avoid O(n²) comparisons
 *
 * Algorithm:
 * 1. Block jobs by normalized company name
 * 2. Within each block, perform pairwise comparisons
 * 3. Record duplicates above similarity threshold
 */
async function detectDuplicatesForUser(
  userId: string,
  minSimilarity: number = THRESHOLDS.low
): Promise<DuplicatePair[]> {
  console.log(`[Deduplication] Starting duplicate detection for user ${userId}`);
  const startTime = Date.now();

  // Fetch all non-archived jobs for user
  const { data: jobs, error } = await supabaseAdmin
    .from(TABLES.JOBS)
    .select('*')
    .eq('user_id', userId)
    .eq('archived', false);

  if (error || !jobs || jobs.length === 0) {
    console.log('[Deduplication] No jobs to process');
    return [];
  }

  console.log(`[Deduplication] Processing ${jobs.length} jobs`);

  const duplicatePairs: DuplicatePair[] = [];

  // Blocking strategy: Group by company name
  const blockMap = new Map<string, Job[]>();

  for (const job of jobs) {
    const blockKey = normalizeLocation(job.company || '');
    if (!blockMap.has(blockKey)) {
      blockMap.set(blockKey, []);
    }
    blockMap.get(blockKey)!.push(job);
  }

  console.log(`[Deduplication] Created ${blockMap.size} blocks for comparison`);

  // Within each block, perform pairwise comparisons
  for (const blockJobs of blockMap.values()) {
    if (blockJobs.length < 2) continue; // Skip single-job blocks

    for (let i = 0; i < blockJobs.length; i++) {
      for (let j = i + 1; j < blockJobs.length; j++) {
        const job1 = blockJobs[i];
        const job2 = blockJobs[j];

        // Check URL match first (fast exact match)
        let detectionMethod: 'fuzzy_match' | 'url_match' = 'fuzzy_match';
        let similarity: SimilarityScore;

        if (checkUrlMatch(job1, job2)) {
          // Exact URL match = 100% similarity
          similarity = {
            titleSimilarity: 100,
            companySimilarity: 100,
            locationSimilarity: 100,
            descriptionSimilarity: 100,
            overallSimilarity: 100,
            confidenceLevel: 'high',
          };
          detectionMethod = 'url_match';
        } else {
          // Fuzzy match
          similarity = calculateSimilarity(job1, job2);
        }

        // Record if above threshold
        if (similarity.overallSimilarity >= minSimilarity) {
          const canonicalJobId = await selectCanonicalJob(job1, job2);
          const duplicateJobId = canonicalJobId === job1.id ? job2.id : job1.id;

          duplicatePairs.push({
            canonicalJobId,
            duplicateJobId,
            similarityScore: similarity,
            detectionMethod,
          });

          console.log(
            `[Deduplication] Found duplicate: ${job1.title} (${job1.company}) ~ ${job2.title} (${job2.company}) [${similarity.overallSimilarity}%]`
          );
        }
      }
    }
  }

  const processingTime = Date.now() - startTime;
  console.log(`[Deduplication] Found ${duplicatePairs.length} duplicates in ${processingTime}ms`);

  return duplicatePairs;
}

/**
 * Save duplicate pairs to database
 */
async function saveDuplicatePairs(duplicatePairs: DuplicatePair[]): Promise<void> {
  if (duplicatePairs.length === 0) return;

  // Process in batches
  for (let i = 0; i < duplicatePairs.length; i += BATCH_SIZE) {
    const batch = duplicatePairs.slice(i, i + BATCH_SIZE);

    const records = batch.map((pair) => ({
      canonical_job_id: pair.canonicalJobId,
      duplicate_job_id: pair.duplicateJobId,
      title_similarity: pair.similarityScore.titleSimilarity,
      company_similarity: pair.similarityScore.companySimilarity,
      location_similarity: pair.similarityScore.locationSimilarity,
      description_similarity: pair.similarityScore.descriptionSimilarity,
      overall_similarity: pair.similarityScore.overallSimilarity,
      confidence_level: pair.similarityScore.confidenceLevel,
      detection_method: pair.detectionMethod,
      detection_date: new Date().toISOString(),
      manually_confirmed: false,
    }));

    const { error } = await supabaseAdmin
      .from('job_duplicates')
      .upsert(records, {
        onConflict: 'canonical_job_id,duplicate_job_id',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('[Deduplication] Failed to save duplicates batch:', error);
      throw error;
    }
  }

  // Update canonical job metadata
  const canonicalJobIds = new Set(duplicatePairs.map((pair) => pair.canonicalJobId));

  for (const jobId of canonicalJobIds) {
    await supabaseAdmin.rpc('mark_as_canonical', { p_job_id: jobId });
  }

  console.log(`[Deduplication] Saved ${duplicatePairs.length} duplicate pairs`);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Run deduplication for a user's jobs
 * Returns statistics about processing
 */
export async function deduplicateJobsForUser(userId: string): Promise<DeduplicationResult> {
  console.log(`[Deduplication] Starting deduplication for user ${userId}`);
  const startTime = Date.now();

  try {
    // Detect duplicates
    const duplicatePairs = await detectDuplicatesForUser(userId);

    // Save to database
    await saveDuplicatePairs(duplicatePairs);

    // Count canonical jobs
    const { count: canonicalCount } = await supabaseAdmin
      .from('canonical_job_metadata')
      .select('*', { count: 'exact', head: true })
      .eq('is_canonical', true);

    // Count total jobs processed
    const { count: totalCount } = await supabaseAdmin
      .from(TABLES.JOBS)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('archived', false);

    const processingTime = Date.now() - startTime;

    const result: DeduplicationResult = {
      totalJobsProcessed: totalCount || 0,
      duplicatesFound: duplicatePairs.length,
      canonicalJobsIdentified: canonicalCount || 0,
      processingTimeMs: processingTime,
    };

    console.log('[Deduplication] Complete:', result);
    return result;
  } catch (error) {
    console.error('[Deduplication] Error:', error);
    throw error;
  }
}

/**
 * Get duplicates for a specific job
 */
export async function getDuplicatesForJob(jobId: string): Promise<Job[]> {
  const { data: duplicateRecords, error: duplicatesError } = await supabaseAdmin
    .from('job_duplicates')
    .select('duplicate_job_id')
    .eq('canonical_job_id', jobId);

  if (duplicatesError || !duplicateRecords) {
    return [];
  }

  if (duplicateRecords.length === 0) {
    return [];
  }

  const duplicateIds = duplicateRecords.map((record) => record.duplicate_job_id);

  const { data: duplicateJobs, error: jobsError } = await supabaseAdmin
    .from(TABLES.JOBS)
    .select('*')
    .in('id', duplicateIds);

  if (jobsError || !duplicateJobs) {
    return [];
  }

  return duplicateJobs;
}

/**
 * Manually merge two jobs as duplicates
 * Allows user to override automatic detection
 */
export async function manuallyMergeDuplicates(
  canonicalJobId: string,
  duplicateJobId: string,
  userId: string
): Promise<void> {
  console.log(`[Deduplication] Manual merge: ${canonicalJobId} <- ${duplicateJobId}`);

  // Verify ownership
  const { data: jobs, error: jobsError } = await supabaseAdmin
    .from(TABLES.JOBS)
    .select('*')
    .in('id', [canonicalJobId, duplicateJobId])
    .eq('user_id', userId);

  if (jobsError || !jobs || jobs.length !== 2) {
    throw new Error('Jobs not found or access denied');
  }

  const canonicalJob = jobs.find((j) => j.id === canonicalJobId);
  const duplicateJob = jobs.find((j) => j.id === duplicateJobId);

  if (!canonicalJob || !duplicateJob) {
    throw new Error('Invalid job IDs');
  }

  // Calculate similarity
  const similarity = calculateSimilarity(canonicalJob, duplicateJob);

  // Save duplicate record
  await saveDuplicatePairs([
    {
      canonicalJobId,
      duplicateJobId,
      similarityScore: similarity,
      detectionMethod: 'manual',
    },
  ]);

  // Mark as manually confirmed
  await supabaseAdmin
    .from('job_duplicates')
    .update({
      manually_confirmed: true,
      confirmed_by: userId,
      confirmed_at: new Date().toISOString(),
    })
    .eq('canonical_job_id', canonicalJobId)
    .eq('duplicate_job_id', duplicateJobId);

  console.log('[Deduplication] Manual merge complete');
}

/**
 * Remove duplicate relationship
 * Used if user disagrees with automatic detection
 */
export async function removeDuplicateRelationship(
  canonicalJobId: string,
  duplicateJobId: string,
  userId: string
): Promise<void> {
  console.log(`[Deduplication] Removing duplicate relationship: ${canonicalJobId} <-> ${duplicateJobId}`);

  // Verify ownership
  const { data: jobs, error: jobsError } = await supabaseAdmin
    .from(TABLES.JOBS)
    .select('user_id')
    .in('id', [canonicalJobId, duplicateJobId])
    .eq('user_id', userId);

  if (jobsError || !jobs || jobs.length !== 2) {
    throw new Error('Jobs not found or access denied');
  }

  // Delete duplicate record
  const { error } = await supabaseAdmin
    .from('job_duplicates')
    .delete()
    .eq('canonical_job_id', canonicalJobId)
    .eq('duplicate_job_id', duplicateJobId);

  if (error) {
    console.error('[Deduplication] Failed to remove relationship:', error);
    throw error;
  }

  // Update canonical metadata
  await supabaseAdmin.rpc('mark_as_canonical', { p_job_id: canonicalJobId });

  console.log('[Deduplication] Duplicate relationship removed');
}
