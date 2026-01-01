/**
 * Production CORS End-to-End Tests
 *
 * Tests the ACTUAL deployed production site with Playwright to diagnose CORS issues.
 * These tests run in a real browser and capture network requests exactly as they happen.
 *
 * Usage:
 *   npm run test:e2e -- tests/e2e/production-cors.spec.ts
 *   npm run test:e2e:headed -- tests/e2e/production-cors.spec.ts  # See browser
 */

import { test, expect, type Request, type Response } from '@playwright/test';

// Cloudflare deployment URLs (not Railway)
const PRODUCTION_URL = process.env.FRONTEND_URL || 'https://jobmatch-ai-dev.pages.dev';
const BACKEND_URL = process.env.BACKEND_URL || 'https://jobmatch-ai-dev.carl-f-frank.workers.dev';

test.describe('Production CORS Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Enable verbose logging
    page.on('console', msg => {
      console.log(`[BROWSER ${msg.type()}]`, msg.text());
    });

    page.on('pageerror', error => {
      console.error('[PAGE ERROR]', error.message);
    });

    page.on('requestfailed', request => {
      console.error('[REQUEST FAILED]', request.url(), request.failure()?.errorText);
    });
  });

  test('should capture all network requests to backend', async ({ page }) => {
    const requests: Array<{
      method: string;
      url: string;
      headers: Record<string, string>;
      type: string;
    }> = [];

    const responses: Array<{
      method: string;
      url: string;
      status: number;
      statusText: string;
      headers: Record<string, string>;
    }> = [];

    // Capture all requests
    page.on('request', (request: Request) => {
      if (request.url().includes(BACKEND_URL)) {
        requests.push({
          method: request.method(),
          url: request.url(),
          headers: request.headers(),
          type: request.resourceType(),
        });
      }
    });

    // Capture all responses
    page.on('response', (response: Response) => {
      if (response.url().includes(BACKEND_URL)) {
        responses.push({
          method: response.request().method(),
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers(),
        });
      }
    });

    // Navigate to production site
    await page.goto(PRODUCTION_URL);

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    console.log('\n=== Network Capture Results ===');
    console.log('Requests captured:', requests.length);
    console.log('Responses captured:', responses.length);

    if (requests.length > 0) {
      console.log('\n--- Requests ---');
      requests.forEach((req, i) => {
        console.log(`\n${i + 1}. ${req.method} ${req.url}`);
        console.log('   Type:', req.type);
        console.log('   Origin:', req.headers['origin'] || '(no origin header)');
      });
    }

    if (responses.length > 0) {
      console.log('\n--- Responses ---');
      responses.forEach((res, i) => {
        console.log(`\n${i + 1}. ${res.method} ${res.url}`);
        console.log('   Status:', res.status, res.statusText);
        console.log('   CORS Headers:');
        console.log('     Allow-Origin:', res.headers['access-control-allow-origin'] || '❌ MISSING');
        console.log('     Allow-Methods:', res.headers['access-control-allow-methods'] || '(not set)');
        console.log('     Allow-Headers:', res.headers['access-control-allow-headers'] || '(not set)');
      });
    }
  });

  test('should detect CORS errors in console', async ({ page }) => {
    const consoleMessages: string[] = [];
    const errors: string[] = [];

    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Look for any backend API calls in the page
    // This might trigger automatically or we might need to interact

    // Wait a bit for any async operations
    await page.waitForTimeout(2000);

    console.log('\n=== Console Messages ===');
    const corsRelated = consoleMessages.filter(
      msg => msg.toLowerCase().includes('cors') ||
             msg.toLowerCase().includes('blocked') ||
             msg.toLowerCase().includes('access-control')
    );

    if (corsRelated.length > 0) {
      console.log('❌ CORS-related console messages:');
      corsRelated.forEach(msg => console.log('  -', msg));
    } else {
      console.log('✅ No CORS errors in console');
    }

    console.log('\n=== Page Errors ===');
    const corsErrors = errors.filter(
      err => err.toLowerCase().includes('cors') ||
             err.toLowerCase().includes('blocked')
    );

    if (corsErrors.length > 0) {
      console.log('❌ CORS-related page errors:');
      corsErrors.forEach(err => console.log('  -', err));
    } else {
      console.log('✅ No CORS page errors');
    }
  });

  test('should test OPTIONS preflight via browser', async ({ page }) => {
    let optionsRequest: Request | null = null;
    let optionsResponse: Response | null = null;

    page.on('request', (request: Request) => {
      if (request.method() === 'OPTIONS' && request.url().includes(BACKEND_URL)) {
        optionsRequest = request;
        console.log('\n=== OPTIONS Request Detected ===');
        console.log('URL:', request.url());
        console.log('Headers:', request.headers());
      }
    });

    page.on('response', (response: Response) => {
      if (response.request().method() === 'OPTIONS' && response.url().includes(BACKEND_URL)) {
        optionsResponse = response;
        console.log('\n=== OPTIONS Response Detected ===');
        console.log('Status:', response.status(), response.statusText());
        console.log('Headers:', response.headers());
      }
    });

    await page.goto(PRODUCTION_URL);

    // Try to trigger an API call by evaluating fetch in the browser
    // This will trigger a real preflight request
    const result = await page.evaluate(async (backendUrl) => {
      try {
        const response = await fetch(`${backendUrl}/api/applications/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-token-for-testing',
          },
          body: JSON.stringify({ jobId: 'test' }),
        });

        return {
          success: true,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }, BACKEND_URL);

    console.log('\n=== Browser Fetch Result ===');
    console.log(JSON.stringify(result, null, 2));

    if (!result.success && result.error?.includes('CORS')) {
      console.log('\n❌ CORS ERROR CAUGHT IN BROWSER:');
      console.log(result.error);
    }

    // Wait a bit for network requests to complete
    await page.waitForTimeout(1000);

    if (optionsRequest) {
      console.log('\n✅ OPTIONS preflight was sent');
    } else {
      console.log('\n⚠️  No OPTIONS preflight detected (might be cached or CORS not triggered)');
    }

    if (optionsResponse) {
      const corsHeader = optionsResponse.headers()['access-control-allow-origin'];
      if (corsHeader) {
        console.log('✅ OPTIONS response had CORS headers');
      } else {
        console.log('❌ OPTIONS response MISSING CORS headers');
      }
    }
  });

  test('should test if user can login and make authenticated request', async ({ page }) => {
    // This test is optional - only run if you want to test with real login
    test.skip(!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD, 'Skipping - no test credentials');

    const requests: Request[] = [];
    const responses: Response[] = [];

    page.on('request', (request: Request) => {
      if (request.url().includes(BACKEND_URL)) {
        requests.push(request);
      }
    });

    page.on('response', (response: Response) => {
      if (response.url().includes(BACKEND_URL)) {
        responses.push(response);
      }
    });

    await page.goto(PRODUCTION_URL);

    // Try to login (adjust selectors based on your actual login form)
    try {
      await page.fill('input[type="email"]', process.env.TEST_EMAIL!);
      await page.fill('input[type="password"]', process.env.TEST_PASSWORD!);
      await page.click('button[type="submit"]');

      // Wait for navigation after login
      await page.waitForURL(/dashboard|jobs/, { timeout: 10000 });

      console.log('\n✅ Login successful');

      // Try to trigger an API call (adjust based on your UI)
      // For example, clicking "Apply to Job" button
      const applyButton = page.locator('[data-testid="apply-button"]').first();
      if (await applyButton.isVisible({ timeout: 5000 })) {
        await applyButton.click();

        // Wait for API call
        await page.waitForTimeout(2000);

        console.log('\n=== Authenticated API Requests ===');
        const apiRequests = requests.filter(r => r.url().includes('/api/'));
        apiRequests.forEach(req => {
          console.log(`${req.method()} ${req.url()}`);
          console.log('  Auth:', req.headers()['authorization'] ? '✅ Present' : '❌ Missing');
        });

        console.log('\n=== Authenticated API Responses ===');
        const apiResponses = responses.filter(r => r.url().includes('/api/'));
        apiResponses.forEach(res => {
          console.log(`${res.status()} ${res.url()}`);
          console.log('  CORS:', res.headers()['access-control-allow-origin'] || '❌ MISSING');
        });
      }
    } catch (error) {
      console.log('\n⚠️  Could not complete login flow:', error);
    }
  });
});

test.describe('Backend Direct Testing (via Playwright)', () => {
  test('should test OPTIONS preflight directly', async ({ request }) => {
    const response = await request.fetch(`${BACKEND_URL}/api/applications/generate`, {
      method: 'OPTIONS',
      headers: {
        'Origin': PRODUCTION_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    });

    console.log('\n=== Direct OPTIONS Test ===');
    console.log('Status:', response.status(), response.statusText());

    const headers = response.headers();
    console.log('\n--- All Response Headers ---');
    Object.entries(headers).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

    console.log('\n--- CORS Headers ---');
    console.log('Allow-Origin:', headers['access-control-allow-origin'] || '❌ MISSING');
    console.log('Allow-Methods:', headers['access-control-allow-methods'] || '❌ MISSING');
    console.log('Allow-Headers:', headers['access-control-allow-headers'] || '❌ MISSING');
    console.log('Allow-Credentials:', headers['access-control-allow-credentials'] || '(not set)');

    expect([200, 204]).toContain(response.status());
    expect(headers['access-control-allow-origin']).toBe(PRODUCTION_URL);
  });

  test('should test health endpoint accessibility', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);

    console.log('\n=== Health Check ===');
    console.log('Status:', response.status());

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    console.log('Response:', data);

    expect(data.status).toBe('healthy');

    // Environment should match the backend URL being tested
    const expectedEnvironment = BACKEND_URL.includes('-dev.') ? 'development' :
                                 BACKEND_URL.includes('-staging.') ? 'staging' :
                                 'production';
    expect(data.environment).toBe(expectedEnvironment);
  });

  test('should test GET request with CORS headers', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': PRODUCTION_URL,
      },
    });

    console.log('\n=== GET with Origin ===');
    console.log('Status:', response.status());

    const headers = response.headers();
    console.log('CORS Header:', headers['access-control-allow-origin']);

    expect(headers['access-control-allow-origin']).toBe(PRODUCTION_URL);
  });

  test('should verify all critical endpoints handle OPTIONS', async ({ request }) => {
    const endpoints = [
      '/api/applications/generate',
      '/api/jobs/scrape',
      '/api/emails/send',
      '/api/exports/pdf',
    ];

    console.log('\n=== Testing OPTIONS on All Endpoints ===\n');

    for (const endpoint of endpoints) {
      const response = await request.fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'OPTIONS',
        headers: {
          'Origin': PRODUCTION_URL,
          'Access-Control-Request-Method': 'POST',
        },
      });

      const headers = response.headers();
      const corsOrigin = headers['access-control-allow-origin'];

      console.log(`${endpoint}:`);
      console.log(`  Status: ${response.status()}`);
      console.log(`  CORS: ${corsOrigin || '❌ MISSING'}`);

      expect([200, 204]).toContain(response.status());
      expect(corsOrigin).toBe(PRODUCTION_URL);
    }
  });
});

test.describe('Error Detection and Diagnostics', () => {
  test('should detect exact CORS error message from browser', async ({ page }) => {
    const errorDetails: Array<{
      type: string;
      message: string;
      timestamp: Date;
    }> = [];

    // Catch all types of errors
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        errorDetails.push({
          type: msg.type(),
          message: msg.text(),
          timestamp: new Date(),
        });
      }
    });

    page.on('pageerror', error => {
      errorDetails.push({
        type: 'pageerror',
        message: error.message,
        timestamp: new Date(),
      });
    });

    page.on('requestfailed', request => {
      errorDetails.push({
        type: 'requestfailed',
        message: `${request.method()} ${request.url()}: ${request.failure()?.errorText}`,
        timestamp: new Date(),
      });
    });

    await page.goto(PRODUCTION_URL);

    // Try to trigger a backend API call
    await page.evaluate(async (backendUrl) => {
      try {
        await fetch(`${backendUrl}/api/applications/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: 'test' }),
        });
      } catch (error) {
        console.error('Fetch error:', error);
      }
    }, BACKEND_URL);

    await page.waitForTimeout(2000);

    console.log('\n=== All Errors and Warnings ===');
    if (errorDetails.length === 0) {
      console.log('✅ No errors detected');
    } else {
      errorDetails.forEach((error, i) => {
        console.log(`\n${i + 1}. [${error.type}] ${error.timestamp.toISOString()}`);
        console.log(`   ${error.message}`);
      });

      const corsErrors = errorDetails.filter(
        e => e.message.toLowerCase().includes('cors') ||
             e.message.toLowerCase().includes('blocked')
      );

      if (corsErrors.length > 0) {
        console.log('\n❌ CORS ERRORS DETECTED:');
        corsErrors.forEach(e => console.log(`   ${e.message}`));
      }
    }
  });
});
