/**
 * Job Scraper Service for Cloudflare Workers
 *
 * Integrates Apify job scraping with Workers infrastructure.
 * Stores jobs in D1, generates embeddings with Workers AI, indexes in Vectorize.
 *
 * Phase 3.5: Apify Integration
 * - LinkedIn Jobs Scraper
 * - Indeed Scraper
 * - Deduplication using canonical_job_metadata
 * - Automatic embedding generation and Vectorize indexing
 */

import type { Env } from '../types';
import { generateCachedEmbedding } from './embeddingsCache';
import { storeJobEmbedding } from './vectorize';

// =============================================================================
// Types
// =============================================================================

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  postedDate?: string;
  url: string;
  source: 'linkedin' | 'indeed';
  jobType?: string;
  experienceLevel?: string;
  workArrangement?: string;
}

export interface ScrapeJobsRequest {
  keywords: string[];
  location?: string;
  workArrangement?: string;
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  maxResults?: number;
  sources?: ('linkedin' | 'indeed')[];
}

export interface ScrapeJobsResponse {
  success: boolean;
  searchId: string;
  jobCount: number;
  jobs: NormalizedJob[];
  errors?: string[];
}

export interface NormalizedJob {
  id: string;
  userId: string;
  searchId: string;
  title: string;
  company: string;
  companyLogo: string;
  location: string;
  workArrangement: 'Remote' | 'Hybrid' | 'On-site' | 'Unknown';
  salaryMin: number;
  salaryMax: number;
  postedDate: string;
  description: string;
  url: string;
  source: 'linkedin' | 'indeed' | 'manual';
  requiredSkills: string[];
  preferredSkills?: string[];
  experienceLevel?: string;
  isSaved: boolean;
  isArchived: boolean;
  scrapedAt: string;
  canonicalId?: string; // Links to canonical_job_metadata for deduplication
}

// =============================================================================
// Configuration
// =============================================================================

const MAX_RESULTS_PER_SOURCE = 50;
const SCRAPE_TIMEOUT_SECONDS = 180;

// Apify Actor IDs
const LINKEDIN_ACTOR_ID = 'bebity/linkedin-jobs-scraper';
const INDEED_ACTOR_ID = 'misceres/indeed-scraper';

// =============================================================================
// Main Scraping Function
// =============================================================================

/**
 * Scrape jobs from Apify actors and store in D1 with embeddings
 */
export async function scrapeJobs(
  env: Env,
  db: D1Database,
  userId: string,
  params: ScrapeJobsRequest
): Promise<ScrapeJobsResponse> {
  const {
    keywords,
    location,
    workArrangement,
    experienceLevel,
    salaryMin,
    maxResults = 20,
    sources = ['linkedin', 'indeed'],
  } = params;

  if (!env.APIFY_API_TOKEN) {
    throw new Error('APIFY_API_TOKEN not configured');
  }

  const cappedMaxResults = Math.min(maxResults, MAX_RESULTS_PER_SOURCE);

  // Scrape from selected sources in parallel
  const scrapingPromises: Promise<ScrapedJob[]>[] = [];

  if (sources.includes('linkedin')) {
    scrapingPromises.push(
      scrapeLinkedIn(env.APIFY_API_TOKEN, {
        keywords: keywords.join(' '),
        location,
        maxResults: cappedMaxResults,
        jobType: workArrangement,
        experienceLevel,
      })
    );
  }

  if (sources.includes('indeed')) {
    scrapingPromises.push(
      scrapeIndeed(env.APIFY_API_TOKEN, {
        keywords: keywords.join(' '),
        location,
        maxResults: cappedMaxResults,
        salaryMin,
      })
    );
  }

  // Execute scraping and collect results
  const results = await Promise.allSettled(scrapingPromises);
  const allJobs: ScrapedJob[] = [];
  const errors: string[] = [];

  results.forEach((result, index) => {
    const source = sources[index] || 'unknown';
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value);
    } else {
      errors.push(`${source}: ${result.reason}`);
      console.error(`Scraping error for ${source}:`, result.reason);
    }
  });

  if (allJobs.length === 0 && errors.length > 0) {
    throw new Error(`All scraping attempts failed: ${errors.join('; ')}`);
  }

  // Normalize jobs
  const searchId = crypto.randomUUID();
  const normalizedJobs = allJobs.map((job) => normalizeJob(job, userId, searchId));

  // Save to D1 with deduplication
  await saveJobsToD1(env, db, userId, searchId, normalizedJobs);

  return {
    success: true,
    searchId,
    jobCount: normalizedJobs.length,
    jobs: normalizedJobs,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// =============================================================================
// LinkedIn Scraping
// =============================================================================

interface LinkedInParams {
  keywords: string;
  location?: string;
  maxResults: number;
  jobType?: string;
  experienceLevel?: string;
}

async function scrapeLinkedIn(
  apiToken: string,
  params: LinkedInParams
): Promise<ScrapedJob[]> {
  const input = {
    keywords: params.keywords,
    location: params.location || 'United States',
    maxItems: params.maxResults,
    ...(params.jobType && { jobType: params.jobType }),
    ...(params.experienceLevel && { experienceLevel: params.experienceLevel }),
  };

  try {
    // Call Apify API
    const runResponse = await fetch(`https://api.apify.com/v2/acts/${LINKEDIN_ACTOR_ID}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(input),
    });

    if (!runResponse.ok) {
      throw new Error(`Apify API error: ${runResponse.status}`);
    }

    const run = await runResponse.json() as { data: { defaultDatasetId: string } };

    // Wait for run to complete (with timeout)
    await waitForRun(apiToken, LINKEDIN_ACTOR_ID, run.data.defaultDatasetId, SCRAPE_TIMEOUT_SECONDS);

    // Fetch results
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${run.data.defaultDatasetId}/items`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    if (!datasetResponse.ok) {
      throw new Error(`Failed to fetch dataset: ${datasetResponse.status}`);
    }

    const items = (await datasetResponse.json()) as unknown[];

    return items.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any): ScrapedJob => ({
        title: String(item.title || ''),
        company: String(item.company || ''),
        location: String(item.location || ''),
        description: String(item.description || ''),
        salary: item.salary ? String(item.salary) : undefined,
        postedDate: item.postedDate ? String(item.postedDate) : undefined,
        url: String(item.url || ''),
        source: 'linkedin',
        jobType: item.jobType ? String(item.jobType) : undefined,
        experienceLevel: item.experienceLevel ? String(item.experienceLevel) : undefined,
        workArrangement: item.workArrangement ? String(item.workArrangement) : undefined,
      })
    );
  } catch (error) {
    console.error('LinkedIn scraping error:', error);
    throw new Error(
      `Failed to scrape LinkedIn: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// =============================================================================
// Indeed Scraping
// =============================================================================

interface IndeedParams {
  keywords: string;
  location?: string;
  maxResults: number;
  salaryMin?: number;
}

async function scrapeIndeed(
  apiToken: string,
  params: IndeedParams
): Promise<ScrapedJob[]> {
  const input = {
    position: params.keywords,
    location: params.location || 'United States',
    maxItems: params.maxResults,
    ...(params.salaryMin && { salaryMin: params.salaryMin }),
  };

  try {
    // Call Apify API
    const runResponse = await fetch(`https://api.apify.com/v2/acts/${INDEED_ACTOR_ID}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(input),
    });

    if (!runResponse.ok) {
      throw new Error(`Apify API error: ${runResponse.status}`);
    }

    const run = await runResponse.json() as { data: { defaultDatasetId: string } };

    // Wait for run to complete
    await waitForRun(apiToken, INDEED_ACTOR_ID, run.data.defaultDatasetId, SCRAPE_TIMEOUT_SECONDS);

    // Fetch results
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${run.data.defaultDatasetId}/items`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    if (!datasetResponse.ok) {
      throw new Error(`Failed to fetch dataset: ${datasetResponse.status}`);
    }

    const items = (await datasetResponse.json()) as unknown[];

    return items.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any): ScrapedJob => ({
        title: String(item.title || item.positionName || ''),
        company: String(item.company || item.companyName || ''),
        location: String(item.location || ''),
        description: String(item.description || ''),
        salary: item.salary ? String(item.salary) : undefined,
        postedDate: item.postedAt ? String(item.postedAt) : undefined,
        url: String(item.url || item.link || ''),
        source: 'indeed',
        jobType: item.jobType ? String(item.jobType) : undefined,
        workArrangement: item.workType ? String(item.workType) : undefined,
      })
    );
  } catch (error) {
    console.error('Indeed scraping error:', error);
    throw new Error(
      `Failed to scrape Indeed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Wait for Apify run to complete
 */
async function waitForRun(
  apiToken: string,
  _actorId: string,
  datasetId: string,
  timeoutSeconds: number
): Promise<void> {
  const startTime = Date.now();
  const timeout = timeoutSeconds * 1000;

  while (Date.now() - startTime < timeout) {
    const statusResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    if (statusResponse.ok) {
      const dataset = await statusResponse.json() as { data: { itemCount: number } };
      if (dataset.data.itemCount > 0) {
        return; // Run completed
      }
    }

    // Wait 2 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`Scraping timeout after ${timeoutSeconds} seconds`);
}

/**
 * Normalize scraped job to standard format
 */
function normalizeJob(job: ScrapedJob, userId: string, searchId: string): NormalizedJob {
  const salary = parseSalary(job.salary);

  return {
    id: crypto.randomUUID(),
    userId,
    searchId,
    title: job.title,
    company: job.company,
    companyLogo: '',
    location: job.location,
    workArrangement: normalizeWorkArrangement(job.workArrangement),
    salaryMin: salary.min,
    salaryMax: salary.max,
    postedDate: job.postedDate || new Date().toISOString(),
    description: job.description,
    url: job.url,
    source: job.source,
    requiredSkills: extractRequiredSkills(job.description),
    experienceLevel: job.experienceLevel,
    isSaved: false,
    isArchived: false,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Parse salary string to min/max numbers
 */
function parseSalary(salaryStr?: string): { min: number; max: number } {
  if (!salaryStr) {
    return { min: 0, max: 0 };
  }

  const cleanStr = salaryStr.replace(/[,$]/g, '').toLowerCase();

  // Range patterns: "$50,000 - $80,000", "$50k-$80k"
  const rangeMatch = cleanStr.match(/(\d+(?:\.\d+)?)\s*k?\s*[-–to]\s*(\d+(?:\.\d+)?)\s*k?/);
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    const min = parseFloat(rangeMatch[1]) * (cleanStr.includes('k') ? 1000 : 1);
    const max = parseFloat(rangeMatch[2]) * (cleanStr.includes('k') ? 1000 : 1);
    return { min, max };
  }

  // Single value
  const singleMatch = cleanStr.match(/(\d+(?:\.\d+)?)\s*k?/);
  if (singleMatch && singleMatch[1]) {
    const value = parseFloat(singleMatch[1]) * (cleanStr.includes('k') ? 1000 : 1);
    return { min: value, max: value };
  }

  return { min: 0, max: 0 };
}

/**
 * Normalize work arrangement
 */
function normalizeWorkArrangement(
  arrangement?: string
): 'Remote' | 'Hybrid' | 'On-site' | 'Unknown' {
  if (!arrangement) return 'Unknown';

  const lower = arrangement.toLowerCase();
  if (lower.includes('remote')) return 'Remote';
  if (lower.includes('hybrid')) return 'Hybrid';
  if (lower.includes('on-site') || lower.includes('onsite') || lower.includes('office'))
    return 'On-site';
  return 'Unknown';
}

/**
 * Extract required skills from description
 */
function extractRequiredSkills(description?: string): string[] {
  if (!description) return [];

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
  ];

  const found: string[] = [];
  const lowerDesc = description.toLowerCase();

  commonSkills.forEach((skill) => {
    if (lowerDesc.includes(skill.toLowerCase())) {
      found.push(skill);
    }
  });

  return found.slice(0, 10);
}

// =============================================================================
// Database Storage with Deduplication
// =============================================================================

/**
 * Save jobs to D1 with deduplication using canonical_job_metadata
 *
 * Deduplication strategy:
 * 1. Generate hash: `${company}_${title}_${location}` (normalized)
 * 2. Check canonical_job_metadata for existing hash
 * 3. If exists: Link to canonical_id, increment duplicate_count
 * 4. If not: Create new canonical record, save job
 * 5. Generate and store embeddings in Vectorize
 */
async function saveJobsToD1(
  env: Env,
  db: D1Database,
  userId: string,
  searchId: string,
  jobs: NormalizedJob[]
): Promise<void> {
  const timestamp = new Date().toISOString();

  // Create search record
  await db
    .prepare(
      `INSERT INTO job_searches (id, user_id, job_count, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(searchId, userId, jobs.length, timestamp)
    .run();

  // Process each job with deduplication
  for (const job of jobs) {
    // Generate deduplication hash
    const hash = generateJobHash(job.company, job.title, job.location);

    // Check if canonical record exists
    const canonicalRecord = await db
      .prepare(
        `SELECT id, duplicate_count FROM canonical_job_metadata WHERE job_hash = ?`
      )
      .bind(hash)
      .first<{ id: string; duplicate_count: number }>();

    let canonicalId: string;

    if (canonicalRecord) {
      // Duplicate found - link to existing canonical record
      canonicalId = canonicalRecord.id;

      // Update duplicate count
      await db
        .prepare(
          `UPDATE canonical_job_metadata
           SET duplicate_count = duplicate_count + 1, updated_at = ?
           WHERE id = ?`
        )
        .bind(timestamp, canonicalId)
        .run();

      console.log(
        `[Scraper] Duplicate job detected: ${job.title} at ${job.company} (canonical: ${canonicalId})`
      );
    } else {
      // New unique job - create canonical record
      canonicalId = crypto.randomUUID();

      await db
        .prepare(
          `INSERT INTO canonical_job_metadata
           (id, job_hash, title, company, location, first_seen, last_seen, duplicate_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          canonicalId,
          hash,
          job.title,
          job.company,
          job.location,
          timestamp,
          timestamp,
          1,
          timestamp,
          timestamp
        )
        .run();
    }

    // Save job with canonical_id link
    await db
      .prepare(
        `INSERT INTO jobs
         (id, user_id, search_id, canonical_id, title, company, company_logo, location,
          work_arrangement, salary_min, salary_max, posted_date, description, url, source,
          required_skills, preferred_skills, experience_level, saved, archived, scraped_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        job.id,
        userId,
        searchId,
        canonicalId,
        job.title,
        job.company,
        job.companyLogo,
        job.location,
        job.workArrangement,
        job.salaryMin,
        job.salaryMax,
        job.postedDate,
        job.description,
        job.url,
        job.source,
        JSON.stringify(job.requiredSkills),
        JSON.stringify(job.preferredSkills || []),
        job.experienceLevel || null,
        job.isSaved ? 1 : 0,
        job.isArchived ? 1 : 0,
        job.scrapedAt,
        timestamp,
        timestamp
      )
      .run();

    // Generate and store embedding in Vectorize (non-blocking)
    // Only generate embeddings for unique jobs (not duplicates)
    if (!canonicalRecord) {
      const embeddingText = `${job.title} ${job.company} ${job.description} ${job.requiredSkills.join(' ')}`;
      const embedding = await generateCachedEmbedding(env, embeddingText);

      await storeJobEmbedding(
        env,
        job.id,
        userId,
        job.title,
        job.company,
        embedding
      );

      console.log(`[Scraper] Generated embedding for job ${job.id}`);
    }
  }

  console.log(`[Scraper] Saved ${jobs.length} jobs to D1 with deduplication`);
}

/**
 * Generate hash for job deduplication
 */
function generateJobHash(company: string, title: string, location: string): string {
  const normalized = `${company}_${title}_${location}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  return normalized;
}

/**
 * Check if Apify is configured
 */
export function isApifyConfigured(env: Env): boolean {
  return !!env.APIFY_API_TOKEN;
}
