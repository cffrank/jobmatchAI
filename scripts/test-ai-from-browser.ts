#!/usr/bin/env tsx
/**
 * Browser-Based AI Testing
 *
 * Tests the AI functionality from the actual frontend origin
 * This properly simulates real user requests with correct CORS headers
 */

import { chromium } from 'playwright';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://jobmatchai-production.up.railway.app';
const BACKEND_URL = process.env.BACKEND_URL || 'https://intelligent-celebration-production-57e4.up.railway.app';

// Test credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Pass@word123';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function separator() {
  log('='.repeat(80), colors.cyan);
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

async function main() {
  separator();
  log('AI FUNCTIONALITY TESTING (Browser-Based)', colors.bright + colors.cyan);
  separator();
  log(`Frontend: ${FRONTEND_URL}`, colors.blue);
  log(`Backend: ${BACKEND_URL}`, colors.blue);
  log(`Test User: ${TEST_EMAIL}`, colors.blue);
  log(`Started: ${new Date().toISOString()}`, colors.blue);
  separator();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  // Track network requests
  const networkRequests: Array<{ url: string; method: string; status: number; headers: Record<string, string> }> = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes(BACKEND_URL)) {
      networkRequests.push({
        url,
        method: response.request().method(),
        status: response.status(),
        headers: response.headers(),
      });
    }
  });

  try {
    // ==========================================================================
    // 1. LOGIN
    // ==========================================================================
    separator();
    log('1. TESTING LOGIN', colors.bright + colors.yellow);
    separator();

    try {
      log('\nNavigating to login page...', colors.blue);
      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });

      log('Filling in credentials...', colors.blue);
      await page.fill('input[type="email"]', TEST_EMAIL);
      await page.fill('input[type="password"]', TEST_PASSWORD);

      log('Clicking sign in...', colors.blue);
      await page.click('button[type="submit"]');

      // Wait for navigation after login
      await page.waitForURL(/.*(?!login).*/, { timeout: 10000 });

      log('✓ Login successful', colors.green);
      results.push({ name: 'Login', passed: true });

      // Get auth token for later
      const cookies = await context.cookies();
      log(`\nCookies set: ${cookies.length}`, colors.blue);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`✗ Login failed: ${errorMessage}`, colors.red);
      results.push({ name: 'Login', passed: false, error: errorMessage });
      throw error; // Can't continue without login
    }

    // ==========================================================================
    // 2. CHECK BACKEND CONNECTIVITY FROM BROWSER
    // ==========================================================================
    separator();
    log('2. TESTING BACKEND CONNECTIVITY', colors.bright + colors.yellow);
    separator();

    try {
      log('\nTesting backend health check from browser context...', colors.blue);

      const healthResponse = await page.evaluate(async (backendUrl) => {
        const response = await fetch(`${backendUrl}/health`);
        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: await response.text(),
        };
      }, BACKEND_URL);

      log(`Status: ${healthResponse.status} ${healthResponse.statusText}`,
        healthResponse.status === 200 ? colors.green : colors.red);

      if (healthResponse.status === 200) {
        log('✓ Backend is reachable from browser', colors.green);
        results.push({ name: 'Backend Health Check', passed: true });
      } else {
        log(`✗ Backend returned ${healthResponse.status}`, colors.red);
        log(`Response: ${healthResponse.body}`, colors.yellow);
        results.push({
          name: 'Backend Health Check',
          passed: false,
          error: `HTTP ${healthResponse.status}`,
          details: healthResponse.body
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`✗ Backend health check failed: ${errorMessage}`, colors.red);
      results.push({ name: 'Backend Health Check', passed: false, error: errorMessage });
    }

    // ==========================================================================
    // 3. CREATE TEST JOB
    // ==========================================================================
    separator();
    log('3. CREATING TEST JOB', colors.bright + colors.yellow);
    separator();

    let testJobId: string | null = null;

    try {
      log('\nNavigating to add job page...', colors.blue);
      await page.goto(`${FRONTEND_URL}/jobs/add`, { waitUntil: 'networkidle' });

      log('Filling in job details...', colors.blue);
      await page.fill('input[name="title"]', 'Test Software Engineer Position');
      await page.fill('input[name="company"]', 'Test Company Inc');
      await page.fill('textarea[name="description"]', 'This is a test job for AI application generation testing. Required skills: TypeScript, React, Node.js');

      log('Submitting job...', colors.blue);
      await page.click('button[type="submit"]');

      // Wait for success message or navigation
      await page.waitForTimeout(2000);

      // Try to get the job ID from URL or storage
      const currentUrl = page.url();
      log(`Current URL: ${currentUrl}`, colors.blue);

      log('✓ Job created successfully', colors.green);
      results.push({ name: 'Create Test Job', passed: true });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`✗ Failed to create test job: ${errorMessage}`, colors.red);
      results.push({ name: 'Create Test Job', passed: false, error: errorMessage });
    }

    // ==========================================================================
    // 4. TEST AI APPLICATION GENERATION
    // ==========================================================================
    separator();
    log('4. TESTING AI APPLICATION GENERATION', colors.bright + colors.yellow);
    separator();

    try {
      log('\nNavigating to jobs page...', colors.blue);
      await page.goto(`${FRONTEND_URL}/jobs`, { waitUntil: 'networkidle' });

      // Wait for jobs to load
      await page.waitForTimeout(2000);

      // Look for "Generate Application" button
      log('Looking for Generate Application button...', colors.blue);
      const generateButton = await page.locator('button:has-text("Generate")').first();

      if (await generateButton.count() > 0) {
        log('Found Generate button, clicking...', colors.blue);

        // Clear network requests to track AI call
        networkRequests.length = 0;

        await generateButton.click();

        // Wait for AI generation to complete (or fail)
        log('Waiting for AI generation response...', colors.blue);
        await page.waitForTimeout(10000); // AI takes time

        // Check network requests for AI endpoint
        const aiRequests = networkRequests.filter(r => r.url.includes('/api/applications/generate'));

        if (aiRequests.length > 0) {
          const aiRequest = aiRequests[0];
          log(`\nAI Request Details:`, colors.bright);
          log(`  Method: ${aiRequest.method}`, colors.blue);
          log(`  Status: ${aiRequest.status}`, aiRequest.status === 200 ? colors.green : colors.red);
          log(`  CORS Headers:`, colors.blue);
          log(`    - Access-Control-Allow-Origin: ${aiRequest.headers['access-control-allow-origin'] || 'MISSING'}`,
            aiRequest.headers['access-control-allow-origin'] ? colors.green : colors.red);

          if (aiRequest.status === 200) {
            log('✓ AI generation succeeded!', colors.green);
            results.push({ name: 'AI Application Generation', passed: true });
          } else {
            log(`✗ AI generation failed with status ${aiRequest.status}`, colors.red);
            results.push({
              name: 'AI Application Generation',
              passed: false,
              error: `HTTP ${aiRequest.status}`,
            });
          }
        } else {
          log('✗ No AI request detected', colors.red);
          results.push({
            name: 'AI Application Generation',
            passed: false,
            error: 'No request to AI endpoint detected',
          });
        }
      } else {
        log('✗ Generate button not found', colors.red);
        results.push({
          name: 'AI Application Generation',
          passed: false,
          error: 'Generate button not found on page',
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`✗ AI generation test failed: ${errorMessage}`, colors.red);
      results.push({ name: 'AI Application Generation', passed: false, error: errorMessage });
    }

    // ==========================================================================
    // 5. NETWORK REQUEST SUMMARY
    // ==========================================================================
    separator();
    log('5. NETWORK REQUEST SUMMARY', colors.bright + colors.yellow);
    separator();

    if (networkRequests.length > 0) {
      log(`\nTotal backend requests: ${networkRequests.length}`, colors.blue);

      networkRequests.forEach((req, idx) => {
        const statusColor = req.status >= 200 && req.status < 300 ? colors.green : colors.red;
        log(`\n${idx + 1}. ${req.method} ${req.url}`, colors.bright);
        log(`   Status: ${req.status}`, statusColor);
        log(`   CORS: ${req.headers['access-control-allow-origin'] ? '✓' : '✗'}`,
          req.headers['access-control-allow-origin'] ? colors.green : colors.red);
      });
    } else {
      log('\n⚠ No backend requests detected', colors.yellow);
    }

  } catch (error) {
    console.error('Test suite failed:', error);
  } finally {
    await browser.close();
  }

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  separator();
  log('FINAL SUMMARY', colors.bright + colors.cyan);
  separator();

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  log(`\nTotal Tests: ${total}`, colors.bright);
  log(`✓ Passed: ${passed}`, colors.green);
  log(`✗ Failed: ${failed}`, colors.red);

  separator();
  log('TEST RESULTS:', colors.bright);

  results.forEach((result) => {
    const icon = result.passed ? '✓' : '✗';
    const color = result.passed ? colors.green : colors.red;
    log(`${icon} ${result.name}`, color);
    if (result.error) {
      log(`  Error: ${result.error}`, colors.yellow);
    }
    if (result.details) {
      log(`  Details: ${result.details}`, colors.blue);
    }
  });

  separator();
  log(`\nCompleted: ${new Date().toISOString()}`, colors.blue);
  separator();

  // Exit with error if any tests failed
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
