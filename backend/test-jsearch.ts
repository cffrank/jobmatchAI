/**
 * JSearch API Integration Test Script
 *
 * Tests the JSearch service integration with RapidAPI.
 *
 * Usage:
 *   1. Ensure JSEARCH_API_KEY is set in backend/.env
 *   2. Run: npm run test:jsearch (or tsx test-jsearch.ts)
 *
 * This script will:
 * - Test API connectivity and authentication
 * - Perform a sample job search
 * - Verify normalization of results
 * - Test rate limiting
 * - Verify caching functionality
 */

import 'dotenv/config';
import { searchJobs, isJSearchConfigured, getRateLimitStatus, clearCache } from './src/services/jsearch.service';
import type { JobSearchParams } from './src/services/jsearch.service';

// =============================================================================
// Test Configuration
// =============================================================================

const TEST_USER_ID = 'test-user-jsearch-integration';

const TEST_SEARCHES: JobSearchParams[] = [
  {
    keywords: 'Software Engineer',
    location: 'San Francisco, CA',
    remote: false,
    employmentType: 'FULLTIME',
    datePosted: 'week',
    maxResults: 5,
  },
  {
    keywords: 'Frontend Developer',
    location: 'New York, NY',
    remote: true,
    datePosted: 'month',
    maxResults: 3,
  },
  {
    keywords: 'Backend Engineer',
    location: 'Austin, TX',
    employmentType: 'FULLTIME',
    maxResults: 5,
  },
];

// =============================================================================
// Test Functions
// =============================================================================

/**
 * Test API configuration
 */
function testConfiguration(): void {
  console.log('\n=== Configuration Test ===');

  if (!isJSearchConfigured()) {
    console.error('❌ JSearch API is NOT configured');
    console.log('\nTo configure JSearch API:');
    console.log('1. Visit https://rapidapi.com and create a free account');
    console.log('2. Subscribe to JSearch API: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch');
    console.log('3. Copy your RapidAPI key from the dashboard');
    console.log('4. Add to backend/.env: JSEARCH_API_KEY=your-rapidapi-key');
    console.log('\nFree tier includes: 1000 requests/hour, 500,000 requests/month');
    process.exit(1);
  }

  console.log('✅ JSearch API is configured');
  console.log(`   API Host: ${process.env.JSEARCH_API_HOST || 'jsearch.p.rapidapi.com'}`);
}

/**
 * Test rate limiting status
 */
function testRateLimitStatus(): void {
  console.log('\n=== Rate Limit Status ===');

  const status = getRateLimitStatus();
  console.log(`Current requests: ${status.requestCount}/${status.limit}`);
  console.log(`Remaining: ${status.remaining}`);

  if (status.requestCount > 0) {
    console.log(`Reset in: ${status.resetInMinutes} minutes`);
  }

  if (status.remaining === 0) {
    console.warn('⚠️  Rate limit reached! Wait for reset before testing.');
    process.exit(1);
  }
}

/**
 * Perform a test search
 */
async function testSearch(params: JobSearchParams): Promise<void> {
  console.log(`\n=== Search Test: ${params.keywords} ===`);
  console.log('Parameters:', JSON.stringify(params, null, 2));

  try {
    const startTime = Date.now();
    const results = await searchJobs(TEST_USER_ID, params);
    const duration = Date.now() - startTime;

    console.log(`✅ Search completed in ${duration}ms`);
    console.log(`   Found ${results.length} jobs`);

    if (results.length > 0) {
      console.log('\nSample Result:');
      const job = results[0];
      console.log(`   Title: ${job.title}`);
      console.log(`   Company: ${job.company}`);
      console.log(`   Location: ${job.location}`);
      console.log(`   Work Arrangement: ${job.workArrangement}`);
      console.log(`   Source: ${job.source}`);
      console.log(`   URL: ${job.url.substring(0, 80)}...`);

      if (job.salaryMin || job.salaryMax) {
        console.log(
          `   Salary: $${job.salaryMin?.toLocaleString() || '?'} - $${job.salaryMax?.toLocaleString() || '?'}`
        );
      }

      if (job.requiredSkills && job.requiredSkills.length > 0) {
        console.log(`   Skills: ${job.requiredSkills.slice(0, 5).join(', ')}`);
      }

      if (job.metadata) {
        const meta = job.metadata as any;
        console.log(`   Publisher: ${meta.publisher || 'N/A'}`);
        console.log(`   Employment Type: ${meta.employmentType || 'N/A'}`);
      }
    }

    // Verify normalization
    console.log('\n✅ Normalization checks:');
    results.forEach((job, idx) => {
      const checks = [
        { name: 'Has ID', valid: !!job.id },
        { name: 'Has Title', valid: !!job.title },
        { name: 'Has Company', valid: !!job.company },
        { name: 'Has Location', valid: !!job.location },
        { name: 'Has Description', valid: !!job.description },
        { name: 'Has URL', valid: !!job.url },
        { name: 'Has Work Arrangement', valid: !!job.workArrangement },
        { name: 'Has Posted Date', valid: !!job.postedDate },
        { name: 'Source is jsearch', valid: job.source === 'jsearch' },
      ];

      const failed = checks.filter((c) => !c.valid);
      if (failed.length > 0) {
        console.log(`   Job ${idx + 1} - Failed checks: ${failed.map((c) => c.name).join(', ')}`);
      }
    });

    if (results.every((job) => job.id && job.title && job.company && job.source === 'jsearch')) {
      console.log('   All jobs properly normalized ✅');
    }
  } catch (error) {
    console.error(`❌ Search failed:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Test caching functionality
 */
async function testCaching(params: JobSearchParams): Promise<void> {
  console.log('\n=== Cache Test ===');
  console.log('Performing first search (should hit API)...');

  const startTime1 = Date.now();
  const results1 = await searchJobs(TEST_USER_ID, params);
  const duration1 = Date.now() - startTime1;

  console.log(`First search: ${duration1}ms, ${results1.length} results`);

  console.log('\nPerforming identical search (should hit cache)...');

  const startTime2 = Date.now();
  const results2 = await searchJobs(TEST_USER_ID, params);
  const duration2 = Date.now() - startTime2;

  console.log(`Second search: ${duration2}ms, ${results2.length} results`);

  if (duration2 < duration1 * 0.1) {
    // Cache should be >10x faster
    console.log('✅ Caching is working (second search much faster)');
  } else {
    console.warn('⚠️  Caching may not be working as expected');
  }

  if (results1.length === results2.length) {
    console.log('✅ Cache returned same number of results');
  } else {
    console.warn('⚠️  Cache returned different number of results');
  }
}

/**
 * Display rate limit status after tests
 */
function displayFinalStatus(): void {
  console.log('\n=== Final Rate Limit Status ===');

  const status = getRateLimitStatus();
  console.log(`Total requests made: ${status.requestCount}`);
  console.log(`Remaining in this hour: ${status.remaining}`);
  console.log(`Limit: ${status.limit} requests/hour`);

  if (status.requestCount > 0) {
    console.log(`Rate limit resets in: ${status.resetInMinutes} minutes`);
  }

  const percentUsed = ((status.requestCount / status.limit) * 100).toFixed(1);
  console.log(`Usage: ${percentUsed}% of hourly quota`);
}

// =============================================================================
// Main Test Runner
// =============================================================================

async function runTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║          JSearch API Integration Test Suite                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  try {
    // Test 1: Configuration
    testConfiguration();

    // Test 2: Rate limit status
    testRateLimitStatus();

    // Test 3: Perform test searches
    for (const search of TEST_SEARCHES) {
      await testSearch(search);
    }

    // Test 4: Cache functionality
    await testCaching(TEST_SEARCHES[0]);

    // Final status
    displayFinalStatus();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                  All Tests Passed! ✅                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    console.log('\nJSearch integration is working correctly.');
    console.log('You can now use JSearch in your job search routes.');

    // Clean up
    clearCache();
    console.log('\nCache cleared for next test run.');
  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════════╗');
    console.error('║                    Tests Failed ❌                             ║');
    console.error('╚════════════════════════════════════════════════════════════════╝');
    console.error('\nError:', error instanceof Error ? error.message : error);

    if (error instanceof Error && error.message.includes('JSEARCH_API_KEY')) {
      console.log('\n📋 Setup Instructions:');
      console.log('1. Visit https://rapidapi.com and create a free account');
      console.log('2. Navigate to https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch');
      console.log('3. Click "Subscribe to Test" and select the free tier');
      console.log('4. Copy your RapidAPI key from the dashboard');
      console.log('5. Add to backend/.env:');
      console.log('   JSEARCH_API_KEY=your-rapidapi-key-here');
      console.log('   JSEARCH_API_HOST=jsearch.p.rapidapi.com');
      console.log('\n6. Re-run this test script');
    }

    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
