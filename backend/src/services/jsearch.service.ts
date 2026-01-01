/**
 * JSearch API Service
 *
 * Integrates with JSearch API (RapidAPI) for real-time job searching from Google for Jobs.
 * JSearch aggregates job listings from multiple sources including LinkedIn, Indeed, Glassdoor,
 * and many others through Google for Jobs index.
 *
 * Features:
 * - Multi-source job aggregation via Google for Jobs
 * - Advanced search with filters (location, date, employment type)
 * - Salary data extraction and normalization
 * - Skills extraction from job descriptions
 * - Work arrangement detection (remote/hybrid/onsite)
 * - Rate limiting (1000 requests/hour on free tier)
 * - Response caching (72-hour TTL to save API quota)
 * - Automatic retry on transient failures
 * - Source attribution tracking
 *
 * API Documentation: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 */

import axios, { AxiosInstance } from 'axios';
import type { Job } from '../types';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// Configuration
// =============================================================================

const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY;
const JSEARCH_API_HOST = process.env.JSEARCH_API_HOST || 'jsearch.p.rapidapi.com';
const JSEARCH_BASE_URL = `https://${JSEARCH_API_HOST}`;

// Rate limiting: Free tier = 1000 requests/hour, Basic = 10,000/hour
const RATE_LIMIT_REQUESTS_PER_HOUR = 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Cache results for 72 hours to save API quota (job listings change slowly)
const CACHE_TTL_HOURS = 72;

// Retry configuration for transient failures
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * JSearch API search parameters
 * Mirrors the JSearch API /search endpoint parameters
 */
export interface JSearchQuery {
  /** Search query (e.g., "Software Engineer in San Francisco") */
  query: string;
  /** Number of results per page (max 10, default 10) */
  num_pages?: string;
  /** Page number for pagination (starts at 1) */
  page?: string;
  /** Date posted filter: all, today, 3days, week, month */
  date_posted?: 'all' | 'today' | '3days' | 'week' | 'month';
  /** Remote jobs only filter */
  remote_jobs_only?: boolean;
  /** Employment type: FULLTIME, CONTRACTOR, PARTTIME, INTERN */
  employment_types?: string;
  /** Job requirements: under_3_years_experience, more_than_3_years_experience, no_experience, no_degree */
  job_requirements?: string;
  /** Exclude job publishers (comma-separated) */
  exclude_job_publishers?: string;
  /** Categories (comma-separated job category IDs) */
  categories?: string;
}

/**
 * JSearch API response structure
 */
export interface JSearchResponse {
  status: string;
  request_id: string;
  parameters: {
    query: string;
    page: number;
    num_pages: number;
  };
  data: JSearchJob[];
}

/**
 * Individual job from JSearch API
 * Contains comprehensive job details from Google for Jobs
 */
export interface JSearchJob {
  /** Unique job ID from JSearch */
  job_id: string;
  /** Job title */
  job_title: string;
  /** Employer/company name */
  employer_name: string;
  /** Employer logo URL (may be null) */
  employer_logo?: string | null;
  /** Employer website URL */
  employer_website?: string | null;
  /** Job publisher (e.g., LinkedIn, Indeed, Glassdoor) */
  job_publisher: string;
  /** Employment type: FULLTIME, PARTTIME, CONTRACTOR, INTERN */
  job_employment_type: string;
  /** Job description (HTML or plain text) */
  job_description: string;
  /** Application link/URL */
  job_apply_link: string;
  /** Direct job posting URL (canonical) */
  job_url?: string;
  /** City */
  job_city?: string;
  /** State/region */
  job_state?: string;
  /** Country */
  job_country?: string;
  /** Full location string */
  job_location?: string;
  /** Google Maps URL for location */
  job_google_link?: string;
  /** Is remote position */
  job_is_remote: boolean;
  /** Posted date (Unix timestamp or date string) */
  job_posted_at_timestamp?: number;
  /** Posted date human-readable */
  job_posted_at_datetime_utc?: string;
  /** Required skills array */
  job_required_skills?: string[] | null;
  /** Required experience (object with details) */
  job_required_experience?: {
    no_experience_required?: boolean;
    required_experience_in_months?: number;
    experience_mentioned?: boolean;
    experience_preferred?: boolean;
  };
  /** Salary information */
  job_salary_currency?: string;
  job_salary_period?: string;
  /** Minimum salary */
  job_min_salary?: number | null;
  /** Maximum salary */
  job_max_salary?: number | null;
  /** Highlighted words in description */
  job_highlights?: {
    Qualifications?: string[];
    Responsibilities?: string[];
    Benefits?: string[];
  };
  /** Job offer expiration timestamp */
  job_offer_expiration_datetime_utc?: string;
  /** Job offer expiration timestamp */
  job_offer_expiration_timestamp?: number;
}

/**
 * Normalized search parameters for internal use
 */
export interface JobSearchParams {
  keywords: string;
  location?: string;
  remote?: boolean;
  employmentType?: 'FULLTIME' | 'PARTTIME' | 'CONTRACTOR' | 'INTERN';
  datePosted?: 'all' | 'today' | '3days' | 'week' | 'month';
  maxResults?: number;
}

/**
 * Rate limit tracking record (for reference, not currently used)
 */
// interface RateLimitRecord {
//   timestamp: number;
//   requestCount: number;
// }

// =============================================================================
// Rate Limiting (In-Memory)
// =============================================================================

/**
 * In-memory rate limit tracker
 * Tracks API usage to avoid exceeding JSearch API quota
 */
class RateLimiter {
  private requests: number[] = [];

  /**
   * Check if we can make a request without exceeding rate limit
   */
  canMakeRequest(): boolean {
    this.cleanOldRequests();
    return this.requests.length < RATE_LIMIT_REQUESTS_PER_HOUR;
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    this.requests.push(Date.now());
  }

  /**
   * Remove requests older than the rate limit window
   */
  private cleanOldRequests(): void {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
    this.requests = this.requests.filter((timestamp) => timestamp > cutoff);
  }

  /**
   * Get current request count in window
   */
  getRequestCount(): number {
    this.cleanOldRequests();
    return this.requests.length;
  }

  /**
   * Get time until rate limit resets (ms)
   */
  getTimeUntilReset(): number {
    this.cleanOldRequests();
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    const resetTime = oldestRequest + RATE_LIMIT_WINDOW_MS;
    return Math.max(0, resetTime - Date.now());
  }
}

const rateLimiter = new RateLimiter();

// =============================================================================
// Result Caching
// =============================================================================

/**
 * Cache entry structure
 */
interface CacheEntry {
  query: string;
  results: Job[];
  timestamp: number;
  expiresAt: number;
}

/**
 * In-memory cache for search results
 * Reduces API calls for repeated searches
 */
class ResultCache {
  private cache = new Map<string, CacheEntry>();

  /**
   * Generate cache key from search parameters
   */
  private getCacheKey(params: JobSearchParams): string {
    return JSON.stringify({
      keywords: params.keywords.toLowerCase().trim(),
      location: params.location?.toLowerCase().trim(),
      remote: params.remote,
      employmentType: params.employmentType,
      datePosted: params.datePosted,
    });
  }

  /**
   * Get cached results if available and not expired
   */
  get(params: JobSearchParams): Job[] | null {
    const key = this.getCacheKey(params);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[JSearch Cache] Hit for query: ${params.keywords}`);
    return entry.results;
  }

  /**
   * Store results in cache
   */
  set(params: JobSearchParams, results: Job[]): void {
    const key = this.getCacheKey(params);
    const now = Date.now();
    const expiresAt = now + CACHE_TTL_HOURS * 60 * 60 * 1000;

    this.cache.set(key, {
      query: params.keywords,
      results,
      timestamp: now,
      expiresAt,
    });

    console.log(`[JSearch Cache] Stored ${results.length} results for: ${params.keywords}`);
  }

  /**
   * Clear all cached results
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

const cache = new ResultCache();

// Periodically clean expired cache entries (every hour)
setInterval(() => {
  cache.cleanExpired();
}, 60 * 60 * 1000);

// =============================================================================
// HTTP Client
// =============================================================================

/**
 * Create configured Axios instance for JSearch API
 */
function createJSearchClient(): AxiosInstance {
  if (!JSEARCH_API_KEY) {
    throw new Error(
      'JSEARCH_API_KEY environment variable is not set. Please configure your JSearch API key from RapidAPI.'
    );
  }

  return axios.create({
    baseURL: JSEARCH_BASE_URL,
    timeout: 30000, // 30 second timeout
    headers: {
      'X-RapidAPI-Key': JSEARCH_API_KEY,
      'X-RapidAPI-Host': JSEARCH_API_HOST,
      'Content-Type': 'application/json',
    },
  });
}

// =============================================================================
// Main Search Function
// =============================================================================

/**
 * Search for jobs using JSearch API
 *
 * @param userId - User ID for attribution and caching
 * @param params - Search parameters
 * @returns Array of normalized Job objects
 * @throws Error if API key not configured or rate limit exceeded
 */
export async function searchJobs(userId: string, params: JobSearchParams): Promise<Job[]> {
  // Check cache first
  const cachedResults = cache.get(params);
  if (cachedResults) {
    console.log(`[JSearch] Returning ${cachedResults.length} cached results`);
    return cachedResults;
  }

  // Check rate limit
  if (!rateLimiter.canMakeRequest()) {
    const resetMs = rateLimiter.getTimeUntilReset();
    const resetMinutes = Math.ceil(resetMs / 60000);
    throw new Error(
      `JSearch API rate limit exceeded. ${rateLimiter.getRequestCount()} requests in last hour. Reset in ${resetMinutes} minutes.`
    );
  }

  // Build query string
  const query = buildQueryString(params);

  // Prepare API request
  const jsearchQuery: JSearchQuery = {
    query,
    num_pages: '1', // JSearch uses pages, not total results
    page: '1',
    date_posted: params.datePosted || 'all',
    remote_jobs_only: params.remote,
    employment_types: params.employmentType,
  };

  console.log('[JSearch] Searching jobs:', jsearchQuery);

  // Execute search with retry logic
  const results = await executeSearchWithRetry(jsearchQuery);

  // Normalize results to internal Job format
  const normalizedJobs = normalizeJSearchResults(results, userId);

  // Limit results to requested max
  const maxResults = params.maxResults || 20;
  const limitedJobs = normalizedJobs.slice(0, maxResults);

  // Cache results
  cache.set(params, limitedJobs);

  // Record request for rate limiting
  rateLimiter.recordRequest();

  console.log(`[JSearch] Found and normalized ${limitedJobs.length} jobs`);

  return limitedJobs;
}

/**
 * Build search query string from parameters
 */
function buildQueryString(params: JobSearchParams): string {
  let query = params.keywords;

  if (params.location) {
    query += ` in ${params.location}`;
  }

  return query;
}

/**
 * Execute JSearch API request with retry logic
 */
async function executeSearchWithRetry(query: JSearchQuery): Promise<JSearchJob[]> {
  const client = createJSearchClient();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.get<JSearchResponse>('/search', {
        params: query,
      });

      if (response.data.status === 'OK' && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      throw new Error(`JSearch API returned unexpected status: ${response.data.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Check if it's a rate limit error (429)
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const resetHeader = error.response.headers['x-ratelimit-requests-reset'];
        const resetSeconds = resetHeader ? parseInt(resetHeader) : 60;
        throw new Error(
          `JSearch API rate limit exceeded. Try again in ${Math.ceil(resetSeconds / 60)} minutes.`
        );
      }

      // Don't retry on client errors (4xx except 429)
      if (axios.isAxiosError(error) && error.response?.status) {
        const status = error.response.status;
        if (status >= 400 && status < 500 && status !== 429) {
          throw new Error(
            `JSearch API client error (${status}): ${error.response.data?.message || error.message}`
          );
        }
      }

      // Retry on server errors (5xx) or network errors
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt; // Exponential backoff
        console.warn(
          `[JSearch] Request failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`,
          error
        );
        await sleep(delay);
        continue;
      }

      // Max retries exceeded
      break;
    }
  }

  // All retries failed
  throw new Error(
    `JSearch API request failed after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Result Normalization
// =============================================================================

/**
 * Convert JSearch API results to internal Job format
 *
 * Maps JSearch fields to JobMatch AI schema:
 * - Extracts salary ranges
 * - Detects work arrangement (remote/hybrid/onsite)
 * - Extracts skills from description + required_skills
 * - Normalizes employment type
 * - Tracks source attribution
 */
export function normalizeJSearchResults(results: JSearchJob[], userId: string): Job[] {
  return results.map((job) => normalizeJSearchJob(job, userId));
}

/**
 * Normalize a single JSearch job to internal Job format
 */
function normalizeJSearchJob(job: JSearchJob, userId: string): Job {
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    userId,
    title: job.job_title || 'Untitled Position',
    company: job.employer_name || 'Unknown Company',
    companyLogo: job.employer_logo || undefined,
    location: buildLocationString(job),
    workArrangement: detectWorkArrangement(job),
    salaryMin: job.job_min_salary || undefined,
    salaryMax: job.job_max_salary || undefined,
    postedDate: normalizePostedDate(job),
    description: stripHtml(job.job_description || ''),
    url: job.job_apply_link || job.job_url || '',
    source: 'jsearch' as unknown as Job['source'], // Will need to add 'jsearch' to Job.source type union
    requiredSkills: extractSkills(job),
    experienceLevel: extractExperienceLevel(job),
    isSaved: false,
    isArchived: false,
    scrapedAt: now,
    createdAt: now,
    updatedAt: now,
    // Additional metadata as JSON
    metadata: {
      jsearchId: job.job_id,
      publisher: job.job_publisher,
      employmentType: job.job_employment_type,
      salaryCurrency: job.job_salary_currency,
      salaryPeriod: job.job_salary_period,
      highlights: job.job_highlights,
      expiresAt: job.job_offer_expiration_datetime_utc,
    },
  };
}

/**
 * Build location string from JSearch location fields
 */
function buildLocationString(job: JSearchJob): string {
  if (job.job_location) return job.job_location;

  const parts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
  return parts.join(', ') || 'Location Not Specified';
}

/**
 * Detect work arrangement from job data
 */
function detectWorkArrangement(job: JSearchJob): 'Remote' | 'Hybrid' | 'On-site' | 'Unknown' {
  // Explicit remote flag
  if (job.job_is_remote) return 'Remote';

  // Check description for work arrangement keywords
  const description = (job.job_description || '').toLowerCase();
  const title = (job.job_title || '').toLowerCase();
  const combined = `${title} ${description}`;

  if (combined.includes('remote')) return 'Remote';
  if (combined.includes('hybrid')) return 'Hybrid';
  if (combined.includes('on-site') || combined.includes('onsite') || combined.includes('in-office'))
    return 'On-site';

  return 'Unknown';
}

/**
 * Normalize posted date to ISO string
 */
function normalizePostedDate(job: JSearchJob): string {
  if (job.job_posted_at_datetime_utc) {
    return new Date(job.job_posted_at_datetime_utc).toISOString();
  }

  if (job.job_posted_at_timestamp) {
    return new Date(job.job_posted_at_timestamp * 1000).toISOString();
  }

  // Default to current time if not available
  return new Date().toISOString();
}

/**
 * Extract skills from JSearch job data
 * Combines API-provided skills with description parsing
 */
function extractSkills(job: JSearchJob): string[] {
  const skills = new Set<string>();

  // Add skills from required_skills field
  if (job.job_required_skills && Array.isArray(job.job_required_skills)) {
    job.job_required_skills.forEach((skill) => skills.add(skill));
  }

  // Extract from highlights > Qualifications
  if (job.job_highlights?.Qualifications) {
    job.job_highlights.Qualifications.forEach((qual) => {
      extractSkillsFromText(qual).forEach((skill) => skills.add(skill));
    });
  }

  // Extract from description if we have few skills
  if (skills.size < 5 && job.job_description) {
    extractSkillsFromText(job.job_description).forEach((skill) => skills.add(skill));
  }

  return Array.from(skills).slice(0, 15); // Limit to top 15 skills
}

/**
 * Extract skills from text using keyword matching
 * Reuses skill list from jobScraper.service.ts
 */
function extractSkillsFromText(text: string): string[] {
  const commonSkills = [
    'JavaScript',
    'TypeScript',
    'Python',
    'Java',
    'C++',
    'C#',
    'Ruby',
    'PHP',
    'Go',
    'Rust',
    'React',
    'Angular',
    'Vue',
    'Node.js',
    'Django',
    'Flask',
    'Spring',
    'ASP.NET',
    'SQL',
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'Redis',
    'Elasticsearch',
    'AWS',
    'Azure',
    'GCP',
    'Docker',
    'Kubernetes',
    'Terraform',
    'Git',
    'CI/CD',
    'Agile',
    'Scrum',
    'REST',
    'GraphQL',
    'Microservices',
    'Machine Learning',
    'TensorFlow',
    'PyTorch',
    'Data Science',
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  commonSkills.forEach((skill) => {
    if (lowerText.includes(skill.toLowerCase())) {
      found.push(skill);
    }
  });

  return found;
}

/**
 * Extract experience level from JSearch job data
 */
function extractExperienceLevel(job: JSearchJob): string | undefined {
  const exp = job.job_required_experience;

  if (!exp) return undefined;

  if (exp.no_experience_required) return 'Entry Level';

  if (exp.required_experience_in_months) {
    const years = exp.required_experience_in_months / 12;
    if (years < 2) return 'Entry Level';
    if (years < 5) return 'Mid Level';
    if (years < 10) return 'Senior Level';
    return 'Executive';
  }

  return undefined;
}

/**
 * Strip HTML tags from text
 * JSearch descriptions may contain HTML formatting
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if JSearch API is configured
 */
export function isJSearchConfigured(): boolean {
  return !!JSEARCH_API_KEY;
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus() {
  return {
    requestCount: rateLimiter.getRequestCount(),
    limit: RATE_LIMIT_REQUESTS_PER_HOUR,
    remaining: RATE_LIMIT_REQUESTS_PER_HOUR - rateLimiter.getRequestCount(),
    resetInMs: rateLimiter.getTimeUntilReset(),
    resetInMinutes: Math.ceil(rateLimiter.getTimeUntilReset() / 60000),
  };
}

/**
 * Clear the result cache
 */
export function clearCache(): void {
  cache.clear();
  console.log('[JSearch] Cache cleared');
}
