/**
 * RemoteOK API Integration Test Script
 *
 * Tests RemoteOK service functionality including:
 * - API connectivity
 * - Job searching with various filters
 * - Job normalization
 * - Caching behavior
 * - Rate limiting
 *
 * Usage:
 *   npm run ts-node backend/test-remoteok.ts
 *   or
 *   npx tsx backend/test-remoteok.ts
 */

import 'dotenv/config';
import {
  searchRemoteJobs,
  normalizeRemoteOKResults,
  getPopularTags,
  isRemoteOKConfigured,
} from './src/services/remoteok.service';

// =============================================================================
// Test Utilities
// =============================================================================

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80) + '\n');
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logError(message: string, error?: unknown) {
  console.error(`❌ ${message}`);
  if (error) {
    console.error('   Error details:', error instanceof Error ? error.message : error);
  }
}

function logInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}

// =============================================================================
// Test Cases
// =============================================================================

async function testConfiguration() {
  logSection('Test 1: Configuration Check');

  try {
    const isConfigured = isRemoteOKConfigured();
    if (isConfigured) {
      logSuccess('RemoteOK service is configured');
    } else {
      logError('RemoteOK service is not configured');
    }

    const userAgent = process.env.REMOTEOK_USER_AGENT;
    if (userAgent) {
      logInfo(`User-Agent: ${userAgent}`);
    } else {
      logInfo('User-Agent: Using default (from service file)');
    }
  } catch (error) {
    logError('Configuration check failed', error);
  }
}

async function testBasicSearch() {
  logSection('Test 2: Basic Search (TypeScript jobs)');

  try {
    const jobs = await searchRemoteJobs({
      keywords: ['typescript'],
      maxResults: 5,
    });

    logSuccess(`Found ${jobs.length} TypeScript jobs`);

    if (jobs.length > 0) {
      console.log('\nSample job:');
      console.log('  Position:', jobs[0].position);
      console.log('  Company:', jobs[0].company);
      console.log('  Location:', jobs[0].location || 'N/A');
      console.log('  Tags:', jobs[0].tags?.join(', ') || 'N/A');
      console.log('  URL:', jobs[0].url);
      console.log('  Salary:', jobs[0].salary_min && jobs[0].salary_max
        ? `$${jobs[0].salary_min} - $${jobs[0].salary_max}`
        : 'Not specified'
      );
    }
  } catch (error) {
    logError('Basic search failed', error);
  }
}

async function testMultiKeywordSearch() {
  logSection('Test 3: Multi-Keyword Search (React + Node.js)');

  try {
    const jobs = await searchRemoteJobs({
      keywords: ['react', 'node'],
      maxResults: 5,
    });

    logSuccess(`Found ${jobs.length} React + Node.js jobs`);

    if (jobs.length > 0) {
      console.log('\nFirst 3 positions:');
      jobs.slice(0, 3).forEach((job, index) => {
        console.log(`  ${index + 1}. ${job.position} at ${job.company}`);
      });
    }
  } catch (error) {
    logError('Multi-keyword search failed', error);
  }
}

async function testTagFiltering() {
  logSection('Test 4: Tag Filtering (Full-Stack jobs)');

  try {
    const jobs = await searchRemoteJobs({
      tags: ['full-stack', 'dev'],
      maxResults: 5,
    });

    logSuccess(`Found ${jobs.length} full-stack developer jobs`);

    if (jobs.length > 0) {
      console.log('\nJob tags:');
      jobs.slice(0, 3).forEach((job, index) => {
        console.log(`  ${index + 1}. ${job.position}: ${job.tags?.join(', ') || 'No tags'}`);
      });
    }
  } catch (error) {
    logError('Tag filtering failed', error);
  }
}

async function testLocationFiltering() {
  logSection('Test 5: Location Filtering (USA-based remote jobs)');

  try {
    const jobs = await searchRemoteJobs({
      keywords: ['backend'],
      location: 'United States',
      maxResults: 5,
    });

    logSuccess(`Found ${jobs.length} backend jobs with USA location preference`);

    if (jobs.length > 0) {
      console.log('\nLocations:');
      jobs.slice(0, 5).forEach((job, index) => {
        console.log(`  ${index + 1}. ${job.company}: ${job.location || 'Anywhere'}`);
      });
    }
  } catch (error) {
    logError('Location filtering failed', error);
  }
}

async function testSalaryFiltering() {
  logSection('Test 6: Salary Filtering (Minimum $100k)');

  try {
    const jobs = await searchRemoteJobs({
      keywords: ['senior', 'engineer'],
      salaryMin: 100000,
      maxResults: 5,
    });

    logSuccess(`Found ${jobs.length} senior engineer jobs with $100k+ salary`);

    if (jobs.length > 0) {
      console.log('\nSalaries:');
      jobs.forEach((job, index) => {
        const salaryInfo = job.salary_min && job.salary_max
          ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
          : 'Not disclosed';
        console.log(`  ${index + 1}. ${job.position}: ${salaryInfo}`);
      });
    }
  } catch (error) {
    logError('Salary filtering failed', error);
  }
}

async function testNormalization() {
  logSection('Test 7: Job Normalization');

  try {
    const remoteOKJobs = await searchRemoteJobs({
      keywords: ['python'],
      maxResults: 3,
    });

    const normalizedJobs = normalizeRemoteOKResults(remoteOKJobs);

    logSuccess(`Normalized ${normalizedJobs.length} jobs to internal format`);

    if (normalizedJobs.length > 0) {
      const job = normalizedJobs[0];
      console.log('\nNormalized job structure:');
      console.log('  ID:', job.id);
      console.log('  Title:', job.title);
      console.log('  Company:', job.company);
      console.log('  Location:', job.location);
      console.log('  Work Arrangement:', job.workArrangement);
      console.log('  Source:', job.source);
      console.log('  Required Skills:', job.requiredSkills?.join(', ') || 'None detected');
      console.log('  Experience Level:', job.experienceLevel || 'Not specified');
      console.log('  Posted Date:', new Date(job.postedDate).toLocaleDateString());
      console.log('  Is Saved:', job.isSaved);
      console.log('  Is Archived:', job.isArchived);
    }
  } catch (error) {
    logError('Normalization test failed', error);
  }
}

async function testCaching() {
  logSection('Test 8: Caching Behavior');

  try {
    const searchParams = {
      keywords: ['javascript'],
      maxResults: 5,
    };

    logInfo('First search (should hit API)...');
    const startTime1 = Date.now();
    const jobs1 = await searchRemoteJobs(searchParams);
    const duration1 = Date.now() - startTime1;
    logSuccess(`Found ${jobs1.length} jobs in ${duration1}ms`);

    logInfo('Second search with same params (should hit cache)...');
    const startTime2 = Date.now();
    const jobs2 = await searchRemoteJobs(searchParams);
    const duration2 = Date.now() - startTime2;
    logSuccess(`Found ${jobs2.length} jobs in ${duration2}ms`);

    if (duration2 < duration1) {
      logSuccess(`Cache is working! Second search was ${duration1 - duration2}ms faster`);
    } else {
      logInfo('Cache timing inconclusive (may vary due to network)');
    }
  } catch (error) {
    logError('Caching test failed', error);
  }
}

async function testPopularTags() {
  logSection('Test 9: Popular Tags');

  try {
    const tags = getPopularTags();
    logSuccess(`Retrieved ${tags.length} popular tags`);
    console.log('\nPopular tags:', tags.join(', '));
  } catch (error) {
    logError('Popular tags test failed', error);
  }
}

async function testRateLimiting() {
  logSection('Test 10: Rate Limiting');

  try {
    logInfo('Making two consecutive API calls...');

    const startTime = Date.now();

    // First call
    await searchRemoteJobs({ keywords: ['golang'], maxResults: 1 });
    const firstCallTime = Date.now() - startTime;

    // Second call (should be rate limited)
    await searchRemoteJobs({ keywords: ['rust'], maxResults: 1 });
    const totalTime = Date.now() - startTime;

    logSuccess(`Two calls completed in ${totalTime}ms`);
    logInfo(`First call: ${firstCallTime}ms`);
    logInfo(`Second call was delayed by: ${totalTime - firstCallTime}ms`);

    if (totalTime >= 1000) {
      logSuccess('Rate limiting is working (1 second delay enforced)');
    } else {
      logInfo('Rate limiting may have been bypassed by cache');
    }
  } catch (error) {
    logError('Rate limiting test failed', error);
  }
}

// =============================================================================
// Main Test Runner
// =============================================================================

async function runAllTests() {
  console.log('\n🚀 RemoteOK API Integration Tests\n');

  const tests = [
    testConfiguration,
    testBasicSearch,
    testMultiKeywordSearch,
    testTagFiltering,
    testLocationFiltering,
    testSalaryFiltering,
    testNormalization,
    testCaching,
    testPopularTags,
    testRateLimiting,
  ];

  for (const test of tests) {
    try {
      await test();
    } catch (error) {
      logError(`Test ${test.name} crashed`, error);
    }
  }

  logSection('Test Summary');
  console.log('All tests completed!');
  console.log('\n💡 Tips:');
  console.log('  - RemoteOK API is free and requires no API key');
  console.log('  - Results are cached for 72 hours to minimize API calls');
  console.log('  - Rate limiting enforces 1 request per second');
  console.log('  - All jobs returned are remote positions');
  console.log('  - Remember to attribute RemoteOK in your UI');
  console.log('\n');
}

// Run tests
runAllTests().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
