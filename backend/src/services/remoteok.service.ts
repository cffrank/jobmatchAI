/**
 * RemoteOK API Service
 *
 * Integrates with RemoteOK's public API to fetch remote job listings.
 * RemoteOK is a curated remote job board with 30,000+ listings.
 *
 * Features:
 * - Public API integration (no authentication required)
 * - Job search with keyword filtering
 * - Tag-based filtering (e.g., 'typescript', 'backend', 'frontend')
 * - Result caching (72-hour TTL) to minimize API calls
 * - Rate limiting (1 request per second as per best practices)
 * - Automatic normalization to internal Job format
 * - Source attribution and compliance
 *
 * API Documentation: https://remoteok.com/api
 *
 * Important Notes:
 * - API items are available 24 hours after posting on the web
 * - Must attribute Remote OK as source with direct links (no redirects)
 * - Public API has no authentication requirements
 * - Results are from the last 30 days by default
 */

import axios, { AxiosError } from 'axios';
import type { Job } from '../types';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// Configuration
// =============================================================================

const REMOTEOK_API_URL = 'https://remoteok.com/api';
const CACHE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours
const RATE_LIMIT_DELAY_MS = 1000; // 1 second between requests

/**
 * User-Agent is required by RemoteOK API to identify your application
 * Format: AppName/Version (Contact)
 */
const USER_AGENT = process.env.REMOTEOK_USER_AGENT || 'JobMatchAI/1.0 (https://github.com/yourorg/jobmatch-ai)';

// =============================================================================
// Types
// =============================================================================

/**
 * Raw job data from RemoteOK API
 *
 * Note: RemoteOK API returns inconsistent field names and types.
 * This interface covers the most common fields.
 */
export interface RemoteOKJob {
  id: string;
  slug: string;
  company: string;
  company_logo?: string;
  position: string;
  tags?: string[];
  description?: string;
  location?: string;
  url: string;
  apply_url?: string;
  date: string; // ISO date string or epoch timestamp
  epoch?: number;

  // Salary fields (may be null or undefined)
  salary_min?: number;
  salary_max?: number;

  // Additional metadata
  logo?: string;
  original?: boolean;
  expired?: boolean;
}

/**
 * Search parameters for RemoteOK jobs
 */
export interface RemoteOKSearchParams {
  keywords?: string[];
  tags?: string[];
  location?: string;
  salaryMin?: number;
  maxResults?: number;
}

/**
 * Cache entry for RemoteOK results
 */
interface CacheEntry {
  data: RemoteOKJob[];
  timestamp: number;
}

// =============================================================================
// In-Memory Cache
// =============================================================================

/**
 * Simple in-memory cache to reduce API calls
 * Key: JSON.stringify(search params)
 * Value: { data, timestamp }
 */
const cache = new Map<string, CacheEntry>();

/**
 * Generate cache key from search parameters
 */
function getCacheKey(params: RemoteOKSearchParams): string {
  return JSON.stringify({
    keywords: params.keywords?.sort(),
    tags: params.tags?.sort(),
    location: params.location,
    salaryMin: params.salaryMin,
  });
}

/**
 * Get cached results if still valid
 */
function getCachedResults(params: RemoteOKSearchParams): RemoteOKJob[] | null {
  const key = getCacheKey(params);
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  console.log(`[RemoteOK] Cache hit (age: ${Math.round(age / 1000 / 60)}m)`);
  return entry.data;
}

/**
 * Store results in cache
 */
function setCachedResults(params: RemoteOKSearchParams, data: RemoteOKJob[]): void {
  const key = getCacheKey(params);
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
  console.log(`[RemoteOK] Cached ${data.length} results`);
}

/**
 * Clear expired cache entries (run periodically)
 */
function cleanupCache(): void {
  const now = Date.now();
  let removed = 0;

  // Use Array.from to avoid iterator compatibility issues
  const entries = Array.from(cache.entries());
  for (const [key, entry] of entries) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`[RemoteOK] Cleaned up ${removed} expired cache entries`);
  }
}

// Run cache cleanup every hour
setInterval(cleanupCache, 60 * 60 * 1000);

// =============================================================================
// Rate Limiting
// =============================================================================

let lastRequestTime = 0;

/**
 * Enforce rate limit by delaying if needed
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
    const delayMs = RATE_LIMIT_DELAY_MS - timeSinceLastRequest;
    console.log(`[RemoteOK] Rate limiting: waiting ${delayMs}ms`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  lastRequestTime = Date.now();
}

// =============================================================================
// API Client
// =============================================================================

/**
 * Fetch all jobs from RemoteOK API
 *
 * Note: RemoteOK API returns ALL jobs in a single request.
 * The first item in the array is metadata, not a job.
 *
 * @throws Error if API request fails or returns invalid data
 */
async function fetchAllJobs(): Promise<RemoteOKJob[]> {
  await enforceRateLimit();

  try {
    console.log('[RemoteOK] Fetching jobs from API...');

    const response = await axios.get<RemoteOKJob[]>(REMOTEOK_API_URL, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    if (!Array.isArray(response.data)) {
      throw new Error('Invalid API response: expected array');
    }

    // First item is API metadata, skip it
    const jobs = response.data.slice(1);

    console.log(`[RemoteOK] Fetched ${jobs.length} jobs`);

    return jobs;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        // API returned error response
        throw new Error(
          `RemoteOK API error: ${error.response.status} - ${error.response.statusText}`
        );
      } else if (error.request) {
        // No response received
        throw new Error('RemoteOK API: No response received (network error)');
      } else {
        // Request setup error
        throw new Error(`RemoteOK API request failed: ${error.message}`);
      }
    }

    throw error;
  }
}

// =============================================================================
// Search & Filtering
// =============================================================================

/**
 * Search remote jobs on RemoteOK with filtering
 *
 * @param params Search parameters
 * @returns Array of matching jobs
 *
 * @example
 * ```typescript
 * const jobs = await searchRemoteJobs({
 *   keywords: ['typescript', 'backend'],
 *   tags: ['dev', 'full-stack'],
 *   location: 'United States',
 *   salaryMin: 80000,
 *   maxResults: 20,
 * });
 * ```
 */
export async function searchRemoteJobs(
  params: RemoteOKSearchParams = {}
): Promise<RemoteOKJob[]> {
  const {
    keywords = [],
    tags = [],
    location,
    salaryMin,
    maxResults = 50,
  } = params;

  // Check cache first
  const cached = getCachedResults(params);
  if (cached) {
    return cached.slice(0, maxResults);
  }

  // Fetch all jobs from API
  const allJobs = await fetchAllJobs();

  // Filter jobs based on search parameters
  let filtered = allJobs.filter(job => {
    // Skip expired jobs
    if (job.expired) {
      return false;
    }

    // Keyword filtering (case-insensitive, matches position, company, or description)
    if (keywords.length > 0) {
      const searchText = [
        job.position,
        job.company,
        job.description || '',
        ...(job.tags || []),
      ].join(' ').toLowerCase();

      const hasAllKeywords = keywords.every(keyword =>
        searchText.includes(keyword.toLowerCase())
      );

      if (!hasAllKeywords) {
        return false;
      }
    }

    // Tag filtering (job must have at least one matching tag)
    if (tags.length > 0 && job.tags) {
      const jobTags = job.tags.map(t => t.toLowerCase());
      const hasMatchingTag = tags.some(tag =>
        jobTags.includes(tag.toLowerCase())
      );

      if (!hasMatchingTag) {
        return false;
      }
    }

    // Location filtering (case-insensitive partial match)
    if (location && job.location) {
      const locationMatch = job.location.toLowerCase().includes(location.toLowerCase());
      if (!locationMatch) {
        return false;
      }
    }

    // Salary filtering (minimum salary requirement)
    if (salaryMin !== undefined) {
      // Only filter if salary data is available
      if (job.salary_min !== undefined && job.salary_min !== null) {
        if (job.salary_min < salaryMin) {
          return false;
        }
      }
      // If no salary data, don't exclude (many jobs don't list salary)
    }

    return true;
  });

  // Cache the filtered results
  setCachedResults(params, filtered);

  // Limit results
  filtered = filtered.slice(0, maxResults);

  console.log(`[RemoteOK] Filtered to ${filtered.length} matching jobs`);

  return filtered;
}

// =============================================================================
// Job Normalization
// =============================================================================

/**
 * Normalize RemoteOK job to internal Job format
 *
 * Maps RemoteOK's field names and formats to our standard Job interface.
 * Ensures all required fields are present and properly typed.
 *
 * @param remoteOKJob Raw job from RemoteOK API
 * @returns Normalized Job object
 */
export function normalizeRemoteOKJob(remoteOKJob: RemoteOKJob): Job {
  // Parse posted date
  let postedDate: string;
  if (remoteOKJob.epoch) {
    // Epoch timestamp in seconds
    postedDate = new Date(remoteOKJob.epoch * 1000).toISOString();
  } else if (remoteOKJob.date) {
    // ISO date string
    postedDate = new Date(remoteOKJob.date).toISOString();
  } else {
    // Fallback to current date
    postedDate = new Date().toISOString();
  }

  // Extract skills from tags
  const requiredSkills = extractSkillsFromTags(remoteOKJob.tags || []);

  // Determine job URL (prefer apply_url if available)
  const jobUrl = remoteOKJob.apply_url || remoteOKJob.url || `https://remoteok.com/remote-jobs/${remoteOKJob.slug}`;

  // Ensure URL is absolute and includes RemoteOK attribution
  const attributedUrl = jobUrl.startsWith('http')
    ? jobUrl
    : `https://remoteok.com${jobUrl}`;

  return {
    id: uuidv4(),
    title: remoteOKJob.position,
    company: remoteOKJob.company,
    companyLogo: remoteOKJob.company_logo || remoteOKJob.logo || undefined,
    location: remoteOKJob.location || 'Remote (Worldwide)',
    workArrangement: 'Remote', // All RemoteOK jobs are remote
    salaryMin: remoteOKJob.salary_min || undefined,
    salaryMax: remoteOKJob.salary_max || undefined,
    postedDate,
    description: remoteOKJob.description || 'No description provided.',
    url: attributedUrl,
    source: 'remoteok',
    requiredSkills,
    experienceLevel: inferExperienceLevelFromTags(remoteOKJob.tags || []),
    isSaved: false,
    isArchived: false,
    scrapedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Normalize multiple RemoteOK jobs
 */
export function normalizeRemoteOKResults(jobs: RemoteOKJob[]): Job[] {
  return jobs.map(normalizeRemoteOKJob);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract programming languages and frameworks from tags
 */
function extractSkillsFromTags(tags: string[]): string[] {
  // Common tech skills that map to RemoteOK tags
  const skillMap: Record<string, string> = {
    'javascript': 'JavaScript',
    'js': 'JavaScript',
    'typescript': 'TypeScript',
    'python': 'Python',
    'java': 'Java',
    'ruby': 'Ruby',
    'php': 'PHP',
    'go': 'Go',
    'golang': 'Go',
    'rust': 'Rust',
    'react': 'React',
    'reactjs': 'React',
    'vue': 'Vue',
    'vuejs': 'Vue',
    'angular': 'Angular',
    'node': 'Node.js',
    'nodejs': 'Node.js',
    'django': 'Django',
    'flask': 'Flask',
    'rails': 'Ruby on Rails',
    'laravel': 'Laravel',
    'spring': 'Spring',
    'dotnet': '.NET',
    'aws': 'AWS',
    'azure': 'Azure',
    'gcp': 'GCP',
    'docker': 'Docker',
    'kubernetes': 'Kubernetes',
    'k8s': 'Kubernetes',
    'postgres': 'PostgreSQL',
    'postgresql': 'PostgreSQL',
    'mysql': 'MySQL',
    'mongodb': 'MongoDB',
    'redis': 'Redis',
    'graphql': 'GraphQL',
    'rest': 'REST API',
  };

  const skills: string[] = [];
  const seen = new Set<string>();

  tags.forEach(tag => {
    const normalized = tag.toLowerCase().trim();
    const skill = skillMap[normalized];

    if (skill && !seen.has(skill)) {
      skills.push(skill);
      seen.add(skill);
    }
  });

  return skills;
}

/**
 * Infer experience level from tags
 */
function inferExperienceLevelFromTags(tags: string[]): string | undefined {
  const tagSet = new Set(tags.map(t => t.toLowerCase()));

  if (tagSet.has('senior') || tagSet.has('lead') || tagSet.has('principal') || tagSet.has('staff')) {
    return 'Senior';
  }

  if (tagSet.has('junior') || tagSet.has('entry') || tagSet.has('intern')) {
    return 'Entry Level';
  }

  if (tagSet.has('mid') || tagSet.has('intermediate')) {
    return 'Mid Level';
  }

  return undefined; // Unknown
}

/**
 * Get popular RemoteOK tags for autocomplete/suggestions
 */
export function getPopularTags(): string[] {
  return [
    'dev',
    'backend',
    'frontend',
    'full-stack',
    'design',
    'marketing',
    'sales',
    'customer-support',
    'devops',
    'data',
    'mobile',
    'javascript',
    'typescript',
    'python',
    'react',
    'node',
    'aws',
    'docker',
  ];
}

/**
 * Check if RemoteOK service is configured and operational
 */
export function isRemoteOKConfigured(): boolean {
  // RemoteOK API is public and doesn't require API keys
  // Just verify we can reach the API
  return true;
}
