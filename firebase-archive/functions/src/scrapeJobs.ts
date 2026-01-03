/**
 * Cloud Function for scraping jobs from LinkedIn and Indeed using Apify
 *
 * This function:
 * - Accepts search parameters from authenticated users
 * - Calls Apify actors for LinkedIn and Indeed job scraping
 * - Processes and normalizes the results
 * - Stores jobs in Firestore under user-specific collections
 * - Implements rate limiting and error handling
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { ApifyClient } from 'apify-client';

// Initialize Apify client
const getApifyClient = () => {
  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken) {
    throw new HttpsError(
      'failed-precondition',
      'Apify API token is not configured'
    );
  }
  return new ApifyClient({ token: apiToken });
};

// =============================================================================
// Types
// =============================================================================

interface JobSearchParams {
  keywords: string;
  location?: string;
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  workArrangement?: 'remote' | 'hybrid' | 'on-site';
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  maxResults?: number;
  sources?: ('linkedin' | 'indeed')[];
}

interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  postedDate?: string;
  url: string;
  source: 'linkedin' | 'indeed';
  // Source-specific fields
  jobType?: string;
  experienceLevel?: string;
  workArrangement?: string;
}

interface NormalizedJob {
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
  source: 'linkedin' | 'indeed';
  rawData: ScrapedJob;
  scrapedAt: admin.firestore.Timestamp;
  matchScore?: number;
  isSaved: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse salary string to min/max values
 */
function parseSalary(salaryStr?: string): { min: number; max: number } {
  if (!salaryStr) {
    return { min: 0, max: 0 };
  }

  // Handle various salary formats
  // Examples: "$50,000 - $80,000", "$50k-$80k", "$50K/yr - $80K/yr"
  const cleanStr = salaryStr.replace(/[,$]/g, '').toLowerCase();

  // Look for range patterns
  const rangeMatch = cleanStr.match(/(\d+(?:\.\d+)?)\s*k?\s*[-–to]\s*(\d+(?:\.\d+)?)\s*k?/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]) * (rangeMatch[1].includes('.') ? 1 : 1000);
    const max = parseFloat(rangeMatch[2]) * (rangeMatch[2].includes('.') ? 1 : 1000);
    return { min, max };
  }

  // Look for single value
  const singleMatch = cleanStr.match(/(\d+(?:\.\d+)?)\s*k?/);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1]) * (singleMatch[1].includes('.') ? 1 : 1000);
    return { min: value, max: value };
  }

  return { min: 0, max: 0 };
}

/**
 * Normalize work arrangement string
 */
function normalizeWorkArrangement(arrangement?: string): 'Remote' | 'Hybrid' | 'On-site' | 'Unknown' {
  if (!arrangement) return 'Unknown';

  const lower = arrangement.toLowerCase();
  if (lower.includes('remote')) return 'Remote';
  if (lower.includes('hybrid')) return 'Hybrid';
  if (lower.includes('on-site') || lower.includes('onsite') || lower.includes('office')) return 'On-site';

  return 'Unknown';
}

/**
 * Normalize a scraped job to our data model
 */
function normalizeJob(job: ScrapedJob): NormalizedJob {
  const salary = parseSalary(job.salary);

  return {
    title: job.title,
    company: job.company,
    companyLogo: '', // Will be populated by a separate service if needed
    location: job.location,
    workArrangement: normalizeWorkArrangement(job.workArrangement),
    salaryMin: salary.min,
    salaryMax: salary.max,
    postedDate: job.postedDate || new Date().toISOString(),
    description: job.description,
    url: job.url,
    source: job.source,
    rawData: job,
    scrapedAt: admin.firestore.Timestamp.now(),
    isSaved: false,
  };
}

/**
 * Check rate limiting for user
 */
async function checkRateLimit(userId: string): Promise<void> {
  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data();
  const lastSearchTime = userData?.lastJobSearchTime?.toDate();
  const searchCount = userData?.jobSearchCount || 0;

  // Rate limiting: max 10 searches per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  if (lastSearchTime && lastSearchTime > oneHourAgo && searchCount >= 10) {
    throw new HttpsError(
      'resource-exhausted',
      'Rate limit exceeded. Please try again later.'
    );
  }

  // Update search count
  const updates: Record<string, unknown> = {
    lastJobSearchTime: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (lastSearchTime && lastSearchTime > oneHourAgo) {
    updates.jobSearchCount = admin.firestore.FieldValue.increment(1);
  } else {
    updates.jobSearchCount = 1;
  }

  await userDoc.ref.update(updates);
}

/**
 * Scrape jobs from LinkedIn using Apify
 */
async function scrapeLinkedIn(params: JobSearchParams): Promise<ScrapedJob[]> {
  const client = getApifyClient();

  // LinkedIn Jobs Scraper Actor ID
  const actorId = 'bebity/linkedin-jobs-scraper';

  const input = {
    keywords: params.keywords,
    location: params.location || 'United States',
    maxItems: params.maxResults || 20,
    // Additional filters
    ...(params.jobType && { jobType: params.jobType }),
    ...(params.experienceLevel && { experienceLevel: params.experienceLevel }),
  };

  try {
    // Run the actor and wait for it to finish
    const run = await client.actor(actorId).call(input, {
      timeout: 180, // 3 minutes timeout
    });

    // Fetch results from dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Transform to our format
    return items.map((item: Record<string, unknown>) => ({
      title: String(item.title || ''),
      company: String(item.company || ''),
      location: String(item.location || ''),
      description: String(item.description || ''),
      salary: item.salary ? String(item.salary) : undefined,
      postedDate: item.postedDate ? String(item.postedDate) : undefined,
      url: String(item.url || ''),
      source: 'linkedin' as const,
      jobType: item.jobType ? String(item.jobType) : undefined,
      experienceLevel: item.experienceLevel ? String(item.experienceLevel) : undefined,
      workArrangement: item.workArrangement ? String(item.workArrangement) : undefined,
    }));
  } catch (error) {
    console.error('LinkedIn scraping error:', error);
    throw new HttpsError(
      'internal',
      `Failed to scrape LinkedIn: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Scrape jobs from Indeed using Apify
 */
async function scrapeIndeed(params: JobSearchParams): Promise<ScrapedJob[]> {
  const client = getApifyClient();

  // Indeed Scraper Actor ID
  const actorId = 'misceres/indeed-scraper';

  const input = {
    position: params.keywords,
    location: params.location || 'United States',
    maxItems: params.maxResults || 20,
    // Additional filters
    ...(params.salaryMin && { salaryMin: params.salaryMin }),
  };

  try {
    // Run the actor and wait for it to finish
    const run = await client.actor(actorId).call(input, {
      timeout: 180, // 3 minutes timeout
    });

    // Fetch results from dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Transform to our format
    return items.map((item: Record<string, unknown>) => ({
      title: String(item.title || item.positionName || ''),
      company: String(item.company || item.companyName || ''),
      location: String(item.location || ''),
      description: String(item.description || ''),
      salary: item.salary ? String(item.salary) : undefined,
      postedDate: item.postedAt ? String(item.postedAt) : undefined,
      url: String(item.url || item.link || ''),
      source: 'indeed' as const,
      jobType: item.jobType ? String(item.jobType) : undefined,
      workArrangement: item.workType ? String(item.workType) : undefined,
    }));
  } catch (error) {
    console.error('Indeed scraping error:', error);
    throw new HttpsError(
      'internal',
      `Failed to scrape Indeed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Save jobs to Firestore with batch safety
 *
 * PERFORMANCE: Implements batch splitting to handle > 500 operations
 * Firestore batch limit is 500 operations. This function splits large
 * job lists into multiple batches to prevent failures.
 */
async function saveJobsToFirestore(
  userId: string,
  searchId: string,
  jobs: NormalizedJob[]
): Promise<void> {
  const db = admin.firestore();

  // Create search document first (separate from job batches)
  const searchRef = db
    .collection('users')
    .doc(userId)
    .collection('jobSearches')
    .doc(searchId);

  await searchRef.set({
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    jobCount: jobs.length,
  });

  // Also save to main jobs collection for easier querying
  const mainJobsRef = db
    .collection('users')
    .doc(userId)
    .collection('jobs');

  // Batch jobs in chunks of 500 to respect Firestore batch limit
  const BATCH_SIZE = 500;
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = jobs.slice(i, i + BATCH_SIZE);

    chunk.forEach((job) => {
      // Save to jobSearches subcollection
      const searchJobRef = searchRef.collection('jobs').doc();
      batch.set(searchJobRef, job);

      // Save to main jobs collection with searchId reference
      const mainJobRef = mainJobsRef.doc();
      batch.set(mainJobRef, {
        ...job,
        searchId: searchId,
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  }
}

// =============================================================================
// Cloud Function
// =============================================================================

export const scrapeJobs = onCall(
  {
    timeoutSeconds: 300,
    memory: '512MiB',
    secrets: ['APIFY_API_TOKEN']
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to scrape jobs'
      );
    }

    const data = request.data;
    const userId = request.auth.uid;

    // Validate input
    const params: JobSearchParams = {
      keywords: data.keywords,
      location: data.location,
      jobType: data.jobType,
      workArrangement: data.workArrangement,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      experienceLevel: data.experienceLevel,
      maxResults: Math.min(data.maxResults || 20, 50), // Cap at 50
      sources: data.sources || ['linkedin', 'indeed'],
    };

    if (!params.keywords || params.keywords.trim().length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'Keywords are required'
      );
    }

    try {
      // Check rate limiting
      await checkRateLimit(userId);

      // Scrape from selected sources
      const scrapingPromises: Promise<ScrapedJob[]>[] = [];

      if (params.sources?.includes('linkedin')) {
        scrapingPromises.push(scrapeLinkedIn(params));
      }

      if (params.sources?.includes('indeed')) {
        scrapingPromises.push(scrapeIndeed(params));
      }

      // Execute scraping in parallel
      const results = await Promise.allSettled(scrapingPromises);

      // Combine successful results
      const allJobs: ScrapedJob[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allJobs.push(...result.value);
        } else {
          const source = params.sources?.[index] || 'unknown';
          errors.push(`${source}: ${result.reason}`);
          console.error(`Scraping error for ${source}:`, result.reason);
        }
      });

      // If all scraping failed, throw error
      if (allJobs.length === 0) {
        throw new HttpsError(
          'internal',
          `All scraping attempts failed: ${errors.join('; ')}`
        );
      }

      // Normalize jobs
      const normalizedJobs = allJobs.map(normalizeJob);

      // Generate search ID
      const searchId = admin.firestore().collection('_').doc().id;

      // Save to Firestore
      await saveJobsToFirestore(userId, searchId, normalizedJobs);

      // Return results
      return {
        success: true,
        searchId,
        jobCount: normalizedJobs.length,
        jobs: normalizedJobs,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('Job scraping error:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to scrape jobs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);
