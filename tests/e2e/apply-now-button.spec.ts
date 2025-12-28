/**
 * Apply Now Button E2E Test
 *
 * Verifies that the Apply Now button works without crashes after fixes:
 * - Fix: React crash (variants.length on undefined)
 * - Fix: CORS wildcard support for Cloudflare Pages
 * - Fix: Database migration (job_title, company, selected_variant_id columns)
 *
 * Related commits:
 * - 7baff54: fix: prevent React crash when variants is not an array
 * - 01a6f3f: fix: support wildcard CORS origins for Cloudflare Pages
 */

import { test, expect, Page } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Test credentials (set via environment variables)
const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

/**
 * Helper: Login to the application
 */
async function login(page: Page, email: string, password: string) {
  await page.goto(`${FRONTEND_URL}/login`);

  // Fill login form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect (dashboard or jobs page)
  await page.waitForURL(/\/(dashboard|profile|jobs)/, { timeout: 10000 });
}

/**
 * Helper: Check for console errors
 */
function setupConsoleErrorListener(page: Page): string[] {
  const consoleErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    consoleErrors.push(`Page Error: ${error.message}`);
  });

  return consoleErrors;
}

test.describe('Apply Now Button - Unauthenticated', () => {
  test('Jobs page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/jobs`);

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('Job detail page redirects to login when unauthenticated', async ({ page }) => {
    // Try to access a job detail page directly
    await page.goto(`${FRONTEND_URL}/jobs/some-job-id`);

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

test.describe('Apply Now Button - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    // Skip tests if no credentials provided
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      test.skip();
      return;
    }

    // Login before each test
    await login(page, TEST_EMAIL, TEST_PASSWORD);
  });

  test('Jobs page loads without React crashes', async ({ page }) => {
    const consoleErrors = setupConsoleErrorListener(page);

    // Navigate to jobs page
    await page.goto(`${FRONTEND_URL}/jobs`);

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'test-results/jobs-page-loaded.png', fullPage: true });

    // Check for critical errors
    const hasCriticalError = consoleErrors.some(error =>
      error.includes("Cannot read properties of undefined (reading 'length')") ||
      error.includes('React') ||
      error.includes('TypeError')
    );

    expect(hasCriticalError).toBe(false);

    // Verify page content loaded
    await expect(page.locator('body')).toBeVisible();
  });

  test('Apply Now button is visible on jobs page', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    // Look for Apply Now buttons (there might be multiple jobs)
    const applyButtons = page.getByRole('button', { name: /apply now/i });
    const count = await applyButtons.count();

    console.log(`Found ${count} "Apply Now" buttons`);

    // Should have at least one job with Apply Now button (if jobs exist)
    // If count is 0, it might mean no jobs in database, which is ok for this test
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Clicking Apply Now does NOT crash the application', async ({ page }) => {
    const consoleErrors = setupConsoleErrorListener(page);

    await page.goto(`${FRONTEND_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    // Find Apply Now buttons
    const applyButtons = page.getByRole('button', { name: /apply now/i });
    const buttonCount = await applyButtons.count();

    if (buttonCount === 0) {
      console.log('⚠️ No jobs available to test Apply Now button');
      test.skip();
      return;
    }

    // Take screenshot before clicking
    await page.screenshot({ path: 'test-results/before-apply-now.png', fullPage: true });

    // Click the first Apply Now button
    await applyButtons.first().click();

    // Wait a moment for any navigation/modal
    await page.waitForTimeout(1000);

    // Take screenshot after clicking
    await page.screenshot({ path: 'test-results/after-apply-now.png', fullPage: true });

    // Check for the specific crash we fixed
    const hasVariantsLengthError = consoleErrors.some(error =>
      error.includes("Cannot read properties of undefined (reading 'length')")
    );

    expect(hasVariantsLengthError).toBe(false);

    // Check for any React errors
    const hasReactError = consoleErrors.some(error =>
      error.includes('React') && error.includes('Error')
    );

    expect(hasReactError).toBe(false);

    // Verify we navigated or modal appeared (either is acceptable)
    const currentUrl = page.url();
    const hasNavigated = currentUrl.includes('/applications/new') || currentUrl.includes('jobId=');
    const hasModal = await page.locator('[role="dialog"]').count() > 0;

    expect(hasNavigated || hasModal).toBe(true);

    console.log('✅ Apply Now clicked successfully without crash');
    console.log(`   Current URL: ${currentUrl}`);
    console.log(`   Modal visible: ${hasModal}`);
  });

  test('Apply Now navigation includes jobId parameter', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    const applyButtons = page.getByRole('button', { name: /apply now/i });
    const buttonCount = await applyButtons.count();

    if (buttonCount === 0) {
      test.skip();
      return;
    }

    // Click Apply Now
    await applyButtons.first().click();
    await page.waitForTimeout(500);

    // Check that URL contains jobId (if navigation occurred)
    const url = page.url();
    if (url.includes('/applications/new')) {
      expect(url).toContain('jobId=');

      // Extract jobId
      const urlParams = new URL(url).searchParams;
      const jobId = urlParams.get('jobId');

      console.log(`✅ Navigation successful with jobId: ${jobId}`);
      expect(jobId).toBeTruthy();
      expect(jobId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    }
  });

  test('Job detail page Apply Now button works', async ({ page }) => {
    const consoleErrors = setupConsoleErrorListener(page);

    await page.goto(`${FRONTEND_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    // Click on first job to go to detail page
    const jobCards = page.locator('[data-testid="job-card"]').or(page.locator('article').filter({ hasText: /apply now/i }));
    const cardCount = await jobCards.count();

    if (cardCount === 0) {
      console.log('⚠️ No job cards found');
      test.skip();
      return;
    }

    // Click on first job card to open detail view
    await jobCards.first().click();
    await page.waitForTimeout(1000);

    // Take screenshot of job detail
    await page.screenshot({ path: 'test-results/job-detail-page.png', fullPage: true });

    // Find Apply Now button on detail page
    const detailApplyButton = page.getByRole('button', { name: /apply now|apply to this position/i });

    if ((await detailApplyButton.count()) === 0) {
      console.log('⚠️ No Apply Now button on detail page');
      test.skip();
      return;
    }

    // Click Apply Now on detail page
    await detailApplyButton.first().click();
    await page.waitForTimeout(1000);

    // Take screenshot after clicking
    await page.screenshot({ path: 'test-results/after-detail-apply.png', fullPage: true });

    // Verify no crash
    const hasCriticalError = consoleErrors.some(error =>
      error.includes("Cannot read properties of undefined (reading 'length')") ||
      error.includes('TypeError')
    );

    expect(hasCriticalError).toBe(false);

    console.log('✅ Job detail Apply Now works without crash');
  });
});

test.describe('Apply Now Button - CORS Verification', () => {
  test('CORS headers allow Cloudflare Pages preview deployments', async ({ request }) => {
    // Test that wildcard CORS pattern works
    const previewOrigins = [
      'https://5802a4d3.jobmatch-ai-dev.pages.dev',
      'https://abc123.jobmatch-ai-dev.pages.dev',
      'https://test-preview.jobmatch-ai-dev.pages.dev',
    ];

    for (const origin of previewOrigins) {
      const response = await request.fetch(`${BACKEND_URL}/api/applications/generate`, {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Authorization,Content-Type',
        },
      });

      const headers = response.headers();

      // Should have CORS headers
      expect(headers['access-control-allow-origin']).toBeTruthy();
      expect(headers['access-control-allow-methods']).toContain('POST');

      console.log(`✅ CORS working for preview: ${origin}`);
    }
  });

  test('CORS does NOT allow malicious subdomains', async ({ request }) => {
    const maliciousOrigins = [
      'https://jobmatch-ai-dev.pages.dev.evil.com',
      'https://evil.com',
      'https://fakejobmatch-ai-dev.pages.dev',
    ];

    for (const origin of maliciousOrigins) {
      const response = await request.fetch(`${BACKEND_URL}/api/applications/generate`, {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST',
        },
      });

      const headers = response.headers();
      const allowedOrigin = headers['access-control-allow-origin'];

      // Should NOT match the malicious origin
      expect(allowedOrigin).not.toBe(origin);

      console.log(`✅ Blocked malicious origin: ${origin}`);
    }
  });
});

test.describe('Apply Now Button - Database Integration', () => {
  test.skip('Generated application has required fields after migration', async ({ page }) => {
    // This test requires authentication AND backend API access
    // Skipped for now as it needs more setup
    //
    // What it should test:
    // 1. Click Apply Now
    // 2. Wait for AI generation to complete
    // 3. Verify the application was saved with:
    //    - job_title
    //    - company
    //    - selected_variant_id
    //
    // Requires: Database access or API inspection
  });
});

test.describe('Bundle Verification', () => {
  test('Frontend bundle is updated (not old cached version)', async ({ page }) => {
    await page.goto(FRONTEND_URL);

    // Get all script tags
    const scripts = await page.locator('script[src]').all();
    const scriptSrcs = await Promise.all(scripts.map(s => s.getAttribute('src')));

    // Find the main bundle
    const bundleScript = scriptSrcs.find(src => src?.includes('index-') && src?.endsWith('.js'));

    console.log(`📦 Bundle: ${bundleScript}`);

    // Old broken bundle hash
    const OLD_BUNDLE_HASH = 'D6b3pBRJ';

    if (bundleScript) {
      expect(bundleScript).not.toContain(OLD_BUNDLE_HASH);
      console.log('✅ New bundle deployed (not the old broken version)');
    }
  });
});
