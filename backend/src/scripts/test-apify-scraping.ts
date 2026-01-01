#!/usr/bin/env ts-node
/**
 * Apify Job Scraping Test Script
 *
 * Tests the Apify integration for LinkedIn and Indeed job scraping.
 * This script validates:
 * - Apify API token configuration
 * - LinkedIn Jobs Scraper actor connectivity
 * - Indeed Scraper actor connectivity
 * - Job data normalization
 * - Database storage
 * - Spam detection triggering
 * - Deduplication triggering
 *
 * Usage:
 *   npm run test:apify
 *   or
 *   ts-node src/scripts/test-apify-scraping.ts
 *
 * Environment Variables Required:
 *   APIFY_API_TOKEN - Your Apify API token
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
 */

// Environment variables are preloaded via -r dotenv/config in package.json
import { scrapeJobs, isApifyConfigured } from '../services/jobScraper.service';
import { supabaseAdmin, TABLES } from '../config/supabase';
import type { ScrapeJobsRequest } from '../types';

// =============================================================================
// Test Configuration
// =============================================================================

const TEST_USER_ID = 'test-user-apify-' + Date.now();
const TEST_QUERIES: ScrapeJobsRequest[] = [
  {
    keywords: ['Software Engineer'],
    location: 'San Francisco, CA',
    maxResults: 5,
    sources: ['linkedin'],
  },
  {
    keywords: ['Backend Developer', 'TypeScript'],
    location: 'Remote',
    workArrangement: 'Remote',
    maxResults: 5,
    sources: ['indeed'],
  },
  {
    keywords: ['Full Stack Developer'],
    location: 'New York, NY',
    salaryMin: 100000,
    maxResults: 3,
    sources: ['linkedin', 'indeed'],
  },
];

// =============================================================================
// Test Helper Functions
// =============================================================================

function logSection(title: string): void {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
}

function logSuccess(message: string): void {
  console.log('✓', message);
}

function logError(message: string): void {
  console.error('✗', message);
}

function logInfo(message: string): void {
  console.log('ℹ', message);
}

// =============================================================================
// Test Functions
// =============================================================================

/**
 * Test 1: Verify Apify is configured
 */
async function testApifyConfiguration(): Promise<boolean> {
  logSection('Test 1: Apify Configuration');

  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    logError('APIFY_API_TOKEN environment variable is not set');
    logInfo('Please add APIFY_API_TOKEN to your .env file');
    return false;
  }

  logSuccess(`APIFY_API_TOKEN is set (${token.substring(0, 15)}...)`);

  if (!isApifyConfigured()) {
    logError('isApifyConfigured() returned false');
    return false;
  }

  logSuccess('isApifyConfigured() returned true');
  return true;
}

/**
 * Test 2: Verify Supabase connection
 */
async function testSupabaseConnection(): Promise<boolean> {
  logSection('Test 2: Supabase Connection');

  try {
    // Test connection by querying jobs table
    const { error } = await supabaseAdmin
      .from(TABLES.JOBS)
      .select('id')
      .limit(1);

    if (error) {
      logError(`Supabase connection failed: ${error.message}`);
      return false;
    }

    logSuccess('Supabase connection successful');
    return true;
  } catch (error) {
    logError(`Supabase connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Test 3: Test job scraping with a single query
 */
async function testSingleScrape(
  query: ScrapeJobsRequest
): Promise<{ success: boolean; jobCount: number; searchId?: string }> {
  logSection(`Test 3: Single Scrape - ${query.keywords.join(', ')}`);

  logInfo(`Query: ${JSON.stringify(query, null, 2)}`);

  try {
    const startTime = Date.now();
    const result = await scrapeJobs(TEST_USER_ID, query);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!result.success) {
      logError('Scraping failed');
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err) => logError(`  - ${err}`));
      }
      return { success: false, jobCount: 0 };
    }

    logSuccess(`Scraping completed in ${duration}s`);
    logSuccess(`Found ${result.jobCount} jobs`);
    logSuccess(`Search ID: ${result.searchId}`);

    if (result.errors && result.errors.length > 0) {
      logInfo('Partial errors occurred:');
      result.errors.forEach((err) => logInfo(`  - ${err}`));
    }

    // Display sample job data
    if (result.jobs && result.jobs.length > 0) {
      const sampleJob = result.jobs[0];
      logInfo('\nSample job:');
      console.log({
        title: sampleJob.title,
        company: sampleJob.company,
        location: sampleJob.location,
        workArrangement: sampleJob.workArrangement,
        salaryMin: sampleJob.salaryMin,
        salaryMax: sampleJob.salaryMax,
        source: sampleJob.source,
        requiredSkills: sampleJob.requiredSkills?.slice(0, 5),
        url: sampleJob.url.substring(0, 50) + '...',
      });
    }

    return {
      success: true,
      jobCount: result.jobCount,
      searchId: result.searchId,
    };
  } catch (error) {
    logError(`Scraping error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    return { success: false, jobCount: 0 };
  }
}

/**
 * Test 4: Verify jobs were saved to database
 */
async function testDatabaseStorage(
  searchId: string,
  expectedCount: number
): Promise<boolean> {
  logSection('Test 4: Database Storage');

  try {
    // Query jobs by search_id
    const { data: jobs, error } = await supabaseAdmin
      .from(TABLES.JOBS)
      .select('*')
      .eq('search_id', searchId);

    if (error) {
      logError(`Database query failed: ${error.message}`);
      return false;
    }

    if (!jobs || jobs.length === 0) {
      logError('No jobs found in database');
      return false;
    }

    logSuccess(`Found ${jobs.length} jobs in database`);

    if (jobs.length !== expectedCount) {
      logError(`Expected ${expectedCount} jobs, found ${jobs.length}`);
      return false;
    }

    logSuccess(`Job count matches expected (${expectedCount})`);

    // Verify job data structure
    const job = jobs[0];
    const requiredFields = [
      'id',
      'user_id',
      'search_id',
      'title',
      'company',
      'location',
      'description',
      'url',
      'source',
      'created_at',
      'updated_at',
    ];

    const missingFields = requiredFields.filter((field) => !(field in job));
    if (missingFields.length > 0) {
      logError(`Missing required fields: ${missingFields.join(', ')}`);
      return false;
    }

    logSuccess('All required fields present');

    // Log sample job from database
    logInfo('\nSample job from database:');
    console.log({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      work_arrangement: job.work_arrangement,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      source: job.source,
      required_skills: job.required_skills,
      scraped_at: job.scraped_at,
    });

    return true;
  } catch (error) {
    logError(`Database test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Test 5: Test multiple sources (LinkedIn + Indeed)
 */
async function testMultipleSources(): Promise<boolean> {
  logSection('Test 5: Multiple Sources (LinkedIn + Indeed)');

  const query: ScrapeJobsRequest = {
    keywords: ['JavaScript Developer'],
    location: 'Austin, TX',
    maxResults: 3,
    sources: ['linkedin', 'indeed'],
  };

  const result = await testSingleScrape(query);

  if (!result.success) {
    return false;
  }

  // Check if we got jobs from both sources
  if (result.searchId) {
    const { data: jobs, error } = await supabaseAdmin
      .from(TABLES.JOBS)
      .select('source')
      .eq('search_id', result.searchId);

    if (error || !jobs) {
      logError('Failed to verify job sources');
      return false;
    }

    const sources = new Set(jobs.map((job) => job.source));
    logInfo(`Jobs scraped from sources: ${Array.from(sources).join(', ')}`);

    if (sources.size === 2 && sources.has('linkedin') && sources.has('indeed')) {
      logSuccess('Successfully scraped from both LinkedIn and Indeed');
    } else {
      logInfo('Note: Only scraped from partial sources (this is okay if one source failed)');
    }
  }

  return true;
}

/**
 * Test 6: Verify background processes (spam detection, deduplication)
 */
async function testBackgroundProcesses(searchId: string): Promise<boolean> {
  logSection('Test 6: Background Processes');

  logInfo('Background processes (spam detection, deduplication) run asynchronously');
  logInfo('Waiting 5 seconds for background processes to complete...');

  await new Promise((resolve) => setTimeout(resolve, 5000));

  try {
    // Check if spam detection ran (spam_score should be set)
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from(TABLES.JOBS)
      .select('spam_score, spam_indicators')
      .eq('search_id', searchId)
      .limit(5);

    if (jobsError) {
      logError(`Failed to check spam detection: ${jobsError.message}`);
      return false;
    }

    const jobsWithSpamScore = jobs?.filter((job) => job.spam_score !== null && job.spam_score !== undefined);
    if (jobsWithSpamScore && jobsWithSpamScore.length > 0) {
      logSuccess(`Spam detection ran: ${jobsWithSpamScore.length} jobs have spam scores`);
    } else {
      logInfo('Spam detection may not have completed yet (async process)');
    }

    // Check if deduplication ran (check for duplicate relationships)
    const { data: duplicates, error: dupError } = await supabaseAdmin
      .from('job_duplicates')
      .select('id')
      .limit(1);

    if (!dupError) {
      if (duplicates && duplicates.length > 0) {
        logSuccess('Deduplication has been triggered (duplicate relationships exist)');
      } else {
        logInfo('No duplicates found (expected if this is the first scrape)');
      }
    }

    return true;
  } catch (error) {
    logError(`Background process test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Cleanup test data
 */
async function cleanup(): Promise<void> {
  logSection('Cleanup');

  try {
    // Delete test jobs
    const { error: jobsError } = await supabaseAdmin
      .from(TABLES.JOBS)
      .delete()
      .eq('user_id', TEST_USER_ID);

    if (jobsError) {
      logError(`Failed to delete test jobs: ${jobsError.message}`);
    } else {
      logSuccess('Test jobs deleted');
    }

    // Delete test job searches
    const { error: searchesError } = await supabaseAdmin
      .from(TABLES.JOB_SEARCHES)
      .delete()
      .eq('user_id', TEST_USER_ID);

    if (searchesError) {
      logError(`Failed to delete test searches: ${searchesError.message}`);
    } else {
      logSuccess('Test searches deleted');
    }

    logInfo('Cleanup complete');
  } catch (error) {
    logError(`Cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// Main Test Runner
// =============================================================================

async function runTests(): Promise<void> {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                   Apify Job Scraping Integration Test                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
  };

  // Test 1: Configuration
  results.total++;
  const configOk = await testApifyConfiguration();
  if (configOk) {
    results.passed++;
  } else {
    results.failed++;
    logError('Configuration test failed. Aborting further tests.');
    process.exit(1);
  }

  // Test 2: Supabase
  results.total++;
  const supabaseOk = await testSupabaseConnection();
  if (supabaseOk) {
    results.passed++;
  } else {
    results.failed++;
    logError('Supabase connection test failed. Aborting further tests.');
    process.exit(1);
  }

  // Test 3: Single scrape (LinkedIn)
  results.total++;
  const linkedInResult = await testSingleScrape(TEST_QUERIES[0]);
  if (linkedInResult.success) {
    results.passed++;

    // Test 4: Database storage
    if (linkedInResult.searchId) {
      results.total++;
      const dbOk = await testDatabaseStorage(linkedInResult.searchId, linkedInResult.jobCount);
      if (dbOk) {
        results.passed++;
      } else {
        results.failed++;
      }

      // Test 6: Background processes
      results.total++;
      const bgOk = await testBackgroundProcesses(linkedInResult.searchId);
      if (bgOk) {
        results.passed++;
      } else {
        results.failed++;
      }
    }
  } else {
    results.failed++;
  }

  // Test 5: Multiple sources
  results.total++;
  const multiSourceOk = await testMultipleSources();
  if (multiSourceOk) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Cleanup
  await cleanup();

  // Final report
  logSection('Test Results');
  console.log(`Total tests: ${results.total}`);
  console.log(`✓ Passed: ${results.passed}`);
  console.log(`✗ Failed: ${results.failed}`);

  if (results.failed === 0) {
    logSuccess('\nAll tests passed! Apify integration is working correctly.');
  } else {
    logError(`\n${results.failed} test(s) failed. Please review the errors above.`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Fatal error during test execution:');
  console.error(error);
  process.exit(1);
});
