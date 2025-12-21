/**
 * Job Scraper Service
 *
 * Handles job scraping from LinkedIn and Indeed using Apify actors.
 * Normalizes job data to a consistent format for storage.
 *
 * Features:
 * - LinkedIn Jobs Scraper integration
 * - Indeed Scraper integration
 * - Salary parsing and normalization
 * - Work arrangement detection
 * - Required skills extraction
 * - Batch processing with Firestore-safe limits
 */

import { ApifyClient } from 'apify-client';
import { supabaseAdmin, TABLES } from '../config/supabase';
import type { Job, ScrapedJob, ScrapeJobsRequest, ScrapeJobsResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// Configuration
// =============================================================================

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const MAX_RESULTS_PER_SOURCE = 50;
const SCRAPE_TIMEOUT_SECONDS = 180;

// Apify Actor IDs
const LINKEDIN_ACTOR_ID = 'bebity/linkedin-jobs-scraper';
const INDEED_ACTOR_ID = 'misceres/indeed-scraper';

// =============================================================================
// Apify Client
// =============================================================================

function getApifyClient(): ApifyClient {
  if (!APIFY_API_TOKEN) {
    throw new Error('APIFY_API_TOKEN environment variable is not set');
  }
  return new ApifyClient({ token: APIFY_API_TOKEN });
}

// =============================================================================
// Main Scraping Function
// =============================================================================

/**
 * Scrape jobs from configured sources
 */
export async function scrapeJobs(
  userId: string,
  params: ScrapeJobsRequest
): Promise<ScrapeJobsResponse> {
  const {
    keywords,
    location,
    workArrangement,
    experienceLevel,
    salaryMin,
    // salaryMax not used in current scraper implementations
    maxResults = 20,
    sources = ['linkedin', 'indeed'],
  } = params;

  const cappedMaxResults = Math.min(maxResults, MAX_RESULTS_PER_SOURCE);

  // Scrape from selected sources in parallel
  const scrapingPromises: Promise<ScrapedJob[]>[] = [];

  if (sources.includes('linkedin')) {
    scrapingPromises.push(
      scrapeLinkedIn({
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
      scrapeIndeed({
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

  // Normalize and save jobs
  const normalizedJobs = allJobs.map(normalizeJob);
  const searchId = uuidv4();

  await saveJobsToDatabase(userId, searchId, normalizedJobs);

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

async function scrapeLinkedIn(params: LinkedInParams): Promise<ScrapedJob[]> {
  const client = getApifyClient();

  const input = {
    keywords: params.keywords,
    location: params.location || 'United States',
    maxItems: params.maxResults,
    ...(params.jobType && { jobType: params.jobType }),
    ...(params.experienceLevel && { experienceLevel: params.experienceLevel }),
  };

  try {
    const run = await client.actor(LINKEDIN_ACTOR_ID).call(input, {
      timeout: SCRAPE_TIMEOUT_SECONDS,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    return items.map(
      (item): ScrapedJob => ({
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

async function scrapeIndeed(params: IndeedParams): Promise<ScrapedJob[]> {
  const client = getApifyClient();

  const input = {
    position: params.keywords,
    location: params.location || 'United States',
    maxItems: params.maxResults,
    ...(params.salaryMin && { salaryMin: params.salaryMin }),
  };

  try {
    const run = await client.actor(INDEED_ACTOR_ID).call(input, {
      timeout: SCRAPE_TIMEOUT_SECONDS,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    return items.map(
      (item): ScrapedJob => ({
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
// Job Normalization
// =============================================================================

function normalizeJob(job: ScrapedJob): Job {
  const salary = parseSalary(job.salary);

  return {
    id: uuidv4(),
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function parseSalary(salaryStr?: string): { min: number; max: number } {
  if (!salaryStr) {
    return { min: 0, max: 0 };
  }

  const cleanStr = salaryStr.replace(/[,$]/g, '').toLowerCase();

  // Range patterns: "$50,000 - $80,000", "$50k-$80k"
  const rangeMatch = cleanStr.match(/(\d+(?:\.\d+)?)\s*k?\s*[-\u2013to]\s*(\d+(?:\.\d+)?)\s*k?/);
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
// Database Storage
// =============================================================================

async function saveJobsToDatabase(
  userId: string,
  searchId: string,
  jobs: Job[]
): Promise<void> {
  // Create search record
  await supabaseAdmin.from(TABLES.JOB_SEARCHES).insert({
    id: searchId,
    user_id: userId,
    job_count: jobs.length,
    created_at: new Date().toISOString(),
  });

  // Insert jobs in batches of 100 (Supabase recommendation)
  const BATCH_SIZE = 100;
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);

    const jobRecords = batch.map((job) => ({
      id: job.id,
      user_id: userId,
      search_id: searchId,
      title: job.title,
      company: job.company,
      company_logo: job.companyLogo,
      location: job.location,
      work_arrangement: job.workArrangement,
      salary_min: job.salaryMin,
      salary_max: job.salaryMax,
      posted_date: job.postedDate,
      description: job.description,
      url: job.url,
      source: job.source,
      required_skills: job.requiredSkills,
      experience_level: job.experienceLevel,
      is_saved: job.isSaved,
      is_archived: job.isArchived,
      scraped_at: job.scrapedAt,
      created_at: job.createdAt,
      updated_at: job.updatedAt,
    }));

    const { error } = await supabaseAdmin.from(TABLES.JOBS).insert(jobRecords);

    if (error) {
      console.error('Failed to insert jobs batch:', error);
      throw error;
    }
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if Apify is configured
 */
export function isApifyConfigured(): boolean {
  return !!APIFY_API_TOKEN;
}
