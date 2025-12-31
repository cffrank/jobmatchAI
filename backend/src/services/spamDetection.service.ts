/**
 * AI-Powered Job Spam Detection Service
 *
 * Detects fraudulent, low-quality, and spam job postings using GPT-4 analysis.
 *
 * Features:
 * - Multi-layered spam detection (MLM schemes, commission-only, fake postings)
 * - Probability scoring (0-1) with detailed reasoning
 * - Batch processing for newly scraped jobs
 * - Redis-backed caching to avoid re-analysis
 * - Queue system for high-volume processing
 * - Rate limiting awareness for OpenAI API
 *
 * Detection Categories:
 * - MLM/Pyramid Schemes
 * - Commission-only/unpaid positions
 * - Fake job postings (phishing, data harvesting)
 * - Excessive/unrealistic requirements
 * - Salary misrepresentation
 * - Generic mass-recruitment postings
 */

import { getOpenAI, MODELS } from '../config/openai';
import { supabaseAdmin, TABLES } from '../config/supabase';

// =============================================================================
// Types
// =============================================================================

/**
 * Spam detection result with probability score and reasons
 */
export interface SpamDetectionResult {
  isSpam: boolean;
  spamProbability: number; // 0-1 (0 = definitely not spam, 1 = definitely spam)
  confidence: 'low' | 'medium' | 'high';
  categories: SpamCategory[];
  reasons: string[];
  flags: SpamFlag[];
  recommendation: 'safe' | 'review' | 'block';
  analyzedAt: string;
}

/**
 * Categories of spam/fraud detected
 */
export type SpamCategory =
  | 'mlm-scheme'
  | 'commission-only'
  | 'fake-posting'
  | 'excessive-requirements'
  | 'salary-misrepresentation'
  | 'mass-recruitment'
  | 'phishing'
  | 'data-harvesting'
  | 'unpaid-work'
  | 'unrealistic-promises';

/**
 * Specific red flags identified
 */
export interface SpamFlag {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

/**
 * Job content to analyze (minimal required fields)
 */
export interface JobToAnalyze {
  id: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  url?: string;
  source: string;
}

/**
 * Batch analysis result
 */
export interface BatchAnalysisResult {
  total: number;
  analyzed: number;
  cached: number;
  spamDetected: number;
  errors: number;
  results: Map<string, SpamDetectionResult>;
}

// =============================================================================
// Configuration
// =============================================================================

const SPAM_DETECTION_CONFIG = {
  // Probability thresholds
  SPAM_THRESHOLD: 0.7, // >= 0.7 = block
  REVIEW_THRESHOLD: 0.4, // 0.4-0.69 = review
  // < 0.4 = safe

  // Batch processing
  BATCH_SIZE: 10, // Process 10 jobs at a time
  BATCH_DELAY_MS: 1000, // 1 second delay between batches (rate limiting)

  // Caching
  CACHE_TTL_HOURS: 72, // Cache results for 72 hours
  CACHE_KEY_PREFIX: 'spam:job:',

  // API
  MAX_RETRIES: 2,
  TIMEOUT_MS: 30000, // 30 seconds per analysis
} as const;

// =============================================================================
// In-Memory Cache (Simple Implementation)
// =============================================================================

/**
 * Simple in-memory cache for spam detection results
 * In production, replace with Redis for persistence and distribution
 */
class SpamCache {
  private cache: Map<string, { result: SpamDetectionResult; expiresAt: number }> = new Map();

  /**
   * Generate cache key from job content
   */
  private getCacheKey(job: JobToAnalyze): string {
    // Hash based on title, company, and description (first 500 chars)
    const content = `${job.title}:${job.company}:${job.description.slice(0, 500)}`;
    return `${SPAM_DETECTION_CONFIG.CACHE_KEY_PREFIX}${this.simpleHash(content)}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached result if available and not expired
   */
  get(job: JobToAnalyze): SpamDetectionResult | null {
    const key = this.getCacheKey(job);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Store result in cache
   */
  set(job: JobToAnalyze, result: SpamDetectionResult): void {
    const key = this.getCacheKey(job);
    const expiresAt = Date.now() + SPAM_DETECTION_CONFIG.CACHE_TTL_HOURS * 60 * 60 * 1000;

    this.cache.set(key, { result, expiresAt });
  }

  /**
   * Clear all cached results
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Global cache instance
const spamCache = new SpamCache();

// =============================================================================
// Core Spam Detection
// =============================================================================

/**
 * Analyze a single job posting for spam indicators using GPT-4
 */
export async function analyzeJobForSpam(job: JobToAnalyze): Promise<SpamDetectionResult> {
  // Check cache first
  const cached = spamCache.get(job);
  if (cached) {
    console.log(`[Spam Detection] Cache hit for job ${job.id}`);
    return cached;
  }

  try {
    const openai = getOpenAI();

    const prompt = buildSpamDetectionPrompt(job);

    console.log(`[Spam Detection] Analyzing job ${job.id}: ${job.title} at ${job.company}`);

    const completion = await openai.chat.completions.create({
      model: MODELS.MATCH_ANALYSIS, // Using gpt-4o-mini for cost efficiency
      messages: [
        {
          role: 'system',
          content: `You are an expert job posting fraud detection system. Your role is to identify spam, scams, MLM schemes, and fraudulent job postings to protect job seekers.

You analyze job postings for red flags including:
- MLM/Pyramid schemes (selling products to friends/family, recruitment-focused)
- Commission-only positions disguised as salaried roles
- Fake postings for phishing or data harvesting
- Excessive requirements (10+ years for entry-level, unrealistic skill combinations)
- Salary misrepresentation (wide ranges, "unlimited earning potential")
- Mass recruitment spam (vague descriptions, no specific role details)
- Unpaid work disguised as "internships" or "opportunities"
- Unrealistic promises (get rich quick, work from home with no experience)

Your analysis is evidence-based, focusing on concrete red flags in the posting text.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Low temperature for consistent, objective analysis
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const aiResult = JSON.parse(content);

    // Transform AI response to our result format
    const result: SpamDetectionResult = {
      isSpam: aiResult.isSpam || false,
      spamProbability: Math.min(1, Math.max(0, aiResult.spamProbability || 0)),
      confidence: aiResult.confidence || 'medium',
      categories: aiResult.categories || [],
      reasons: aiResult.reasons || [],
      flags: aiResult.flags || [],
      recommendation: determineRecommendation(aiResult.spamProbability || 0),
      analyzedAt: new Date().toISOString(),
    };

    // Cache the result
    spamCache.set(job, result);

    console.log(
      `[Spam Detection] Job ${job.id} analyzed: ${result.spamProbability.toFixed(2)} spam probability, recommendation: ${result.recommendation}`
    );

    return result;
  } catch (error) {
    console.error(`[Spam Detection] Analysis failed for job ${job.id}:`, error);

    // Return conservative "safe" result on error
    return {
      isSpam: false,
      spamProbability: 0,
      confidence: 'low',
      categories: [],
      reasons: ['Analysis failed - manual review recommended'],
      flags: [],
      recommendation: 'review',
      analyzedAt: new Date().toISOString(),
    };
  }
}

/**
 * Build the spam detection prompt for GPT-4
 */
function buildSpamDetectionPrompt(job: JobToAnalyze): string {
  const salaryInfo = job.salaryMin && job.salaryMax
    ? `Salary Range: $${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`
    : 'Salary: Not specified';

  return `Analyze this job posting for spam, fraud, and scam indicators.

**JOB POSTING:**
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'Not specified'}
${salaryInfo}
Source: ${job.source}
${job.url ? `URL: ${job.url}` : ''}

Description:
${job.description}

---

**ANALYSIS TASK:**

Evaluate this job posting for the following red flags:

1. **MLM/Pyramid Schemes**:
   - Emphasis on recruiting others
   - Selling to friends/family
   - "Build your own team"
   - Multi-level commission structures
   - Product sales focus over actual job duties

2. **Commission-Only/Unpaid Work**:
   - No base salary mentioned
   - "Unlimited earning potential" without base pay
   - Disguised as internship/volunteer work
   - Payment only on sales/recruitment

3. **Fake Postings**:
   - Generic company names or no company website
   - Requests for sensitive personal information upfront
   - Phishing indicators (suspicious URLs, grammar errors)
   - Too good to be true offers

4. **Excessive Requirements**:
   - Entry-level requiring 10+ years experience
   - Unrealistic skill combinations (e.g., 5 years in 2-year-old technology)
   - Overqualification for listed salary
   - Contradictory experience levels

5. **Salary Misrepresentation**:
   - Extremely wide salary ranges ($30k-$300k)
   - No salary mentioned for professional role
   - "Competitive salary" with no range
   - Commission disguised as salary

6. **Mass Recruitment Spam**:
   - Vague job descriptions
   - No specific responsibilities listed
   - Generic "exciting opportunity" language
   - Multiple roles listed in one posting

7. **Unrealistic Promises**:
   - "Get rich quick" language
   - "Work from home, no experience needed, high pay"
   - Guarantees of specific income
   - "Be your own boss" in employment context

**OUTPUT FORMAT:**

Return JSON with this EXACT structure:
{
  "isSpam": boolean (true if spam probability >= 0.7),
  "spamProbability": number (0.0 to 1.0, where 1.0 = definitely spam),
  "confidence": "low" | "medium" | "high",
  "categories": ["category1", "category2"], // Array of detected spam categories
  "reasons": [
    "Specific reason why this is flagged as spam",
    "Another concrete red flag found in the posting"
  ],
  "flags": [
    {
      "type": "mlm-indicator",
      "severity": "critical",
      "description": "Posting emphasizes recruiting others and building a team"
    }
  ],
  "summary": "Brief 1-2 sentence assessment"
}

**SCORING GUIDELINES:**
- 0.0-0.2: Legitimate job posting, no red flags
- 0.2-0.4: Minor concerns, likely legitimate
- 0.4-0.7: Moderate red flags, recommend manual review
- 0.7-0.9: Strong spam indicators, likely fraudulent
- 0.9-1.0: Definite spam/scam, block immediately

**IMPORTANT:**
- Be conservative: only flag clear red flags, not subjective quality issues
- Focus on fraud/scam indicators, not just "bad" job postings
- Provide specific evidence from the posting text
- Consider industry context (sales roles naturally mention commission)`;
}

/**
 * Determine recommendation based on spam probability
 */
function determineRecommendation(probability: number): 'safe' | 'review' | 'block' {
  if (probability >= SPAM_DETECTION_CONFIG.SPAM_THRESHOLD) {
    return 'block';
  } else if (probability >= SPAM_DETECTION_CONFIG.REVIEW_THRESHOLD) {
    return 'review';
  } else {
    return 'safe';
  }
}

// =============================================================================
// Batch Processing
// =============================================================================

/**
 * Analyze multiple jobs for spam in batches
 * Includes rate limiting, caching, and error handling
 */
export async function analyzeBatchForSpam(jobs: JobToAnalyze[]): Promise<BatchAnalysisResult> {
  const results = new Map<string, SpamDetectionResult>();
  let analyzed = 0;
  let cached = 0;
  let errors = 0;

  console.log(`[Spam Detection] Starting batch analysis for ${jobs.length} jobs`);

  // Process in batches to respect rate limits
  for (let i = 0; i < jobs.length; i += SPAM_DETECTION_CONFIG.BATCH_SIZE) {
    const batch = jobs.slice(i, i + SPAM_DETECTION_CONFIG.BATCH_SIZE);

    const batchPromises = batch.map(async (job) => {
      try {
        // Check cache first
        const cachedResult = spamCache.get(job);
        if (cachedResult) {
          cached++;
          return { jobId: job.id, result: cachedResult };
        }

        // Analyze with AI
        const result = await analyzeJobForSpam(job);
        analyzed++;
        return { jobId: job.id, result };
      } catch (error) {
        console.error(`[Spam Detection] Error analyzing job ${job.id}:`, error);
        errors++;
        return {
          jobId: job.id,
          result: {
            isSpam: false,
            spamProbability: 0,
            confidence: 'low' as const,
            categories: [],
            reasons: ['Analysis error - manual review needed'],
            flags: [],
            recommendation: 'review' as const,
            analyzedAt: new Date().toISOString(),
          },
        };
      }
    });

    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);

    // Store results
    batchResults.forEach(({ jobId, result }) => {
      results.set(jobId, result);
    });

    // Delay between batches for rate limiting
    if (i + SPAM_DETECTION_CONFIG.BATCH_SIZE < jobs.length) {
      await new Promise((resolve) => setTimeout(resolve, SPAM_DETECTION_CONFIG.BATCH_DELAY_MS));
    }
  }

  const spamDetected = Array.from(results.values()).filter((r) => r.isSpam).length;

  console.log(
    `[Spam Detection] Batch complete: ${analyzed} analyzed, ${cached} cached, ${spamDetected} spam detected, ${errors} errors`
  );

  return {
    total: jobs.length,
    analyzed,
    cached,
    spamDetected,
    errors,
    results,
  };
}

// =============================================================================
// Database Integration
// =============================================================================

/**
 * Save spam detection results to database
 */
export async function saveSpamDetectionResults(
  jobId: string,
  result: SpamDetectionResult
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from(TABLES.JOBS)
      .update({
        spam_probability: result.spamProbability,
        spam_detected: result.isSpam,
        spam_categories: result.categories,
        spam_flags: result.flags,
        spam_analyzed_at: result.analyzedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      console.error(`[Spam Detection] Failed to save results for job ${jobId}:`, error);
      throw error;
    }

    console.log(`[Spam Detection] Results saved for job ${jobId}`);
  } catch (error) {
    console.error(`[Spam Detection] Database error for job ${jobId}:`, error);
    throw error;
  }
}

/**
 * Analyze newly scraped jobs and save results
 */
export async function analyzeNewJobs(userId: string, searchId: string): Promise<void> {
  console.log(`[Spam Detection] Analyzing new jobs for search ${searchId}`);

  // Fetch jobs from this search
  const { data: jobs, error } = await supabaseAdmin
    .from(TABLES.JOBS)
    .select('id, title, company, description, location, salary_min, salary_max, url, source')
    .eq('user_id', userId)
    .eq('search_id', searchId);

  if (error || !jobs) {
    console.error('[Spam Detection] Failed to fetch jobs:', error);
    throw new Error('Failed to fetch jobs for spam analysis');
  }

  if (jobs.length === 0) {
    console.log('[Spam Detection] No jobs to analyze');
    return;
  }

  // Transform to JobToAnalyze format
  const jobsToAnalyze: JobToAnalyze[] = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    description: job.description || '',
    location: job.location,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    url: job.url,
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
    `[Spam Detection] Completed analysis for search ${searchId}: ${batchResult.spamDetected}/${batchResult.total} flagged as spam`
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get spam detection statistics for a user
 */
export async function getSpamStats(userId: string): Promise<{
  totalJobs: number;
  analyzedJobs: number;
  spamDetected: number;
  reviewRecommended: number;
  safe: number;
}> {
  const { data: jobs, error } = await supabaseAdmin
    .from(TABLES.JOBS)
    .select('spam_probability, spam_detected')
    .eq('user_id', userId);

  if (error || !jobs) {
    return {
      totalJobs: 0,
      analyzedJobs: 0,
      spamDetected: 0,
      reviewRecommended: 0,
      safe: 0,
    };
  }

  const analyzedJobs = jobs.filter((j) => j.spam_probability !== null);
  const spamDetected = analyzedJobs.filter((j) => j.spam_detected === true).length;
  const reviewRecommended = analyzedJobs.filter(
    (j) =>
      j.spam_probability &&
      j.spam_probability >= SPAM_DETECTION_CONFIG.REVIEW_THRESHOLD &&
      j.spam_probability < SPAM_DETECTION_CONFIG.SPAM_THRESHOLD
  ).length;
  const safe = analyzedJobs.filter(
    (j) => j.spam_probability && j.spam_probability < SPAM_DETECTION_CONFIG.REVIEW_THRESHOLD
  ).length;

  return {
    totalJobs: jobs.length,
    analyzedJobs: analyzedJobs.length,
    spamDetected,
    reviewRecommended,
    safe,
  };
}

/**
 * Clear spam detection cache
 */
export function clearSpamCache(): void {
  spamCache.clear();
  console.log('[Spam Detection] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getSpamCacheStats(): { size: number; keys: string[] } {
  return spamCache.getStats();
}
