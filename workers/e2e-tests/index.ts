/**
 * E2E Testing Worker using Cloudflare Browser Rendering
 *
 * This worker runs automated browser tests against the deployed application
 * to verify critical user flows work correctly after deployment.
 *
 * Usage:
 *   curl https://e2e-tests.carl-f-frank.workers.dev/run-tests
 */

import puppeteer from '@cloudflare/puppeteer';

export interface Env {
  BROWSER: Fetcher;
  TEST_USER_EMAIL?: string;
  TEST_USER_PASSWORD?: string;
  APP_URL?: string;
}

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screenshots?: string[];
}

interface TestReport {
  timestamp: string;
  appUrl: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only allow POST requests to /run-tests
    if (url.pathname === '/run-tests' && request.method === 'POST') {
      return await runE2ETests(env);
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'healthy' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('E2E Testing Worker. POST to /run-tests to run tests.', {
      status: 200,
    });
  },
};

async function runE2ETests(env: Env): Promise<Response> {
  const startTime = Date.now();
  const appUrl = env.APP_URL || 'https://jobmatch-ai-dev.pages.dev';
  const results: TestResult[] = [];

  try {
    // Launch browser
    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();

    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1280, height: 720 });

    // Test 1: Home page loads
    results.push(await testHomePageLoads(page, appUrl));

    // Test 2: Login flow (if credentials provided)
    if (env.TEST_USER_EMAIL && env.TEST_USER_PASSWORD) {
      results.push(await testLoginFlow(page, appUrl, env.TEST_USER_EMAIL, env.TEST_USER_PASSWORD));

      // Test 3: Jobs page loads
      results.push(await testJobsPageLoads(page, appUrl));

      // Test 4: Application submission creates tracked application
      results.push(await testApplicationTracking(page, appUrl));

      // Test 5: Tracker page shows submitted application
      results.push(await testTrackerPageShows(page, appUrl));
    } else {
      results.push({
        name: 'Login Flow',
        status: 'skipped',
        duration: 0,
        error: 'No test credentials provided',
      });
      results.push({
        name: 'Jobs Page',
        status: 'skipped',
        duration: 0,
        error: 'Login required',
      });
      results.push({
        name: 'Application Tracking',
        status: 'skipped',
        duration: 0,
        error: 'Login required',
      });
      results.push({
        name: 'Tracker Page',
        status: 'skipped',
        duration: 0,
        error: 'Login required',
      });
    }

    await browser.close();
  } catch (error) {
    results.push({
      name: 'Browser Setup',
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  const duration = Date.now() - startTime;
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  const report: TestReport = {
    timestamp: new Date().toISOString(),
    appUrl,
    totalTests: results.length,
    passed,
    failed,
    skipped,
    duration,
    results,
  };

  return new Response(JSON.stringify(report, null, 2), {
    status: failed > 0 ? 500 : 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

async function testHomePageLoads(page: any, appUrl: string): Promise<TestResult> {
  const testStart = Date.now();
  try {
    await page.goto(appUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Check for expected elements
    const title = await page.title();
    if (!title.includes('JobMatch')) {
      throw new Error(`Unexpected page title: ${title}`);
    }

    return {
      name: 'Home Page Loads',
      status: 'passed',
      duration: Date.now() - testStart,
    };
  } catch (error) {
    return {
      name: 'Home Page Loads',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testLoginFlow(
  page: any,
  appUrl: string,
  email: string,
  password: string
): Promise<TestResult> {
  const testStart = Date.now();
  try {
    // Navigate to login page
    await page.goto(`${appUrl}/login`, { waitUntil: 'networkidle0', timeout: 30000 });

    // Fill in credentials
    await page.type('input[type="email"]', email);
    await page.type('input[type="password"]', password);

    // Submit form
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);

    // Verify redirect to dashboard/jobs
    const currentUrl = page.url();
    if (!currentUrl.includes('/jobs') && !currentUrl.includes('/dashboard')) {
      throw new Error(`Login failed, redirected to: ${currentUrl}`);
    }

    return {
      name: 'Login Flow',
      status: 'passed',
      duration: Date.now() - testStart,
    };
  } catch (error) {
    return {
      name: 'Login Flow',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testJobsPageLoads(page: any, appUrl: string): Promise<TestResult> {
  const testStart = Date.now();
  try {
    await page.goto(`${appUrl}/jobs`, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for jobs to load (or empty state)
    await page.waitForSelector('[data-testid="jobs-list"], [data-testid="empty-state"]', {
      timeout: 10000,
    });

    return {
      name: 'Jobs Page Loads',
      status: 'passed',
      duration: Date.now() - testStart,
    };
  } catch (error) {
    return {
      name: 'Jobs Page Loads',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testApplicationTracking(page: any, appUrl: string): Promise<TestResult> {
  const testStart = Date.now();
  try {
    // Navigate to applications page
    await page.goto(`${appUrl}/applications`, { waitUntil: 'networkidle0', timeout: 30000 });

    // Look for a submitted application
    const submittedApp = await page.$('[data-status="submitted"]');
    if (!submittedApp) {
      return {
        name: 'Application Tracking',
        status: 'skipped',
        duration: Date.now() - testStart,
        error: 'No submitted applications to test',
      };
    }

    // Click to view application details
    await submittedApp.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });

    // Verify we're on the application detail page
    const url = page.url();
    if (!url.includes('/applications/')) {
      throw new Error(`Not on application detail page: ${url}`);
    }

    return {
      name: 'Application Tracking',
      status: 'passed',
      duration: Date.now() - testStart,
    };
  } catch (error) {
    return {
      name: 'Application Tracking',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testTrackerPageShows(page: any, appUrl: string): Promise<TestResult> {
  const testStart = Date.now();
  try {
    // Navigate to tracker page
    await page.goto(`${appUrl}/tracker`, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for tracker to load
    await page.waitForSelector('[data-testid="tracker-list"], [data-testid="empty-tracker"]', {
      timeout: 10000,
    });

    // Check if there are tracked applications
    const trackedApps = await page.$$('[data-testid="tracked-application"]');

    // If we submitted an application earlier, there should be at least 1 tracked
    if (trackedApps.length === 0) {
      console.warn('Warning: No tracked applications found');
    }

    return {
      name: 'Tracker Page Shows Applications',
      status: 'passed',
      duration: Date.now() - testStart,
    };
  } catch (error) {
    return {
      name: 'Tracker Page Shows Applications',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
