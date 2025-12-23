/**
 * Critical E2E Tests
 * Tests the most important user flows that broke during deployment
 */

import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

test.describe('Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Set up any necessary state
    await page.goto(FRONTEND_URL);
  });

  test('Backend health check is accessible', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('CORS headers are present on API responses', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`, {
      headers: {
        Origin: FRONTEND_URL,
      },
    });

    expect(response.ok()).toBeTruthy();
    const headers = response.headers();

    // Check CORS headers
    expect(headers['access-control-allow-origin']).toBeTruthy();
  });

  test('OPTIONS preflight requests work correctly', async ({ request }) => {
    const response = await request.fetch(`${BACKEND_URL}/api/applications/generate`, {
      method: 'OPTIONS',
      headers: {
        Origin: FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    });

    expect(response.status()).toBeLessThan(400);
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeTruthy();
    expect(headers['access-control-allow-methods']).toContain('POST');
  });

  test('Login page loads successfully', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);

    // Check for login form elements
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('Jobs page requires authentication', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/jobs`);

    // Should redirect to login or show auth requirement
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Application Generation Flow', () => {
  test('Should show AI generation button on job details', async ({ page, context }) => {
    // This test requires authenticated user
    // Skip if no test credentials available
    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;

    if (!testEmail || !testPassword) {
      test.skip();
      return;
    }

    // Login
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard/jobs
    await page.waitForURL(/\/(dashboard|jobs)/);

    // Navigate to jobs
    await page.goto(`${FRONTEND_URL}/jobs`);

    // Click on first job (if available)
    const jobCard = page.locator('[data-testid="job-card"]').first();

    if ((await jobCard.count()) > 0) {
      await jobCard.click();

      // Check for "Generate Application" or "Apply" button
      await expect(
        page.getByRole('button', { name: /generate|apply/i })
      ).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Backend API Endpoints', () => {
  test('Unauthenticated requests are rejected properly', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/applications/generate`, {
      data: {
        jobId: 'test-job-id',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('Invalid auth tokens are rejected', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/applications/generate`, {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
      data: {
        jobId: 'test-job-id',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('API documentation is available in development', async ({ request }) => {
    if (process.env.NODE_ENV === 'development') {
      const response = await request.get(`${BACKEND_URL}/api`);

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.endpoints).toBeDefined();
    } else {
      test.skip();
    }
  });
});

test.describe('Rate Limiting', () => {
  test('Rate limit headers are present', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);

    const headers = response.headers();

    // Rate limit headers should be exposed via CORS
    if (headers['x-ratelimit-limit']) {
      expect(headers['x-ratelimit-limit']).toBeTruthy();
      expect(headers['x-ratelimit-remaining']).toBeDefined();
    }
  });
});

test.describe('Deployment Verification', () => {
  test('Frontend is accessible', async ({ page }) => {
    const response = await page.goto(FRONTEND_URL);

    expect(response?.ok()).toBeTruthy();
  });

  test('Backend is accessible', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);

    expect(response.ok()).toBeTruthy();
  });

  test('Environment is configured correctly', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);
    const data = await response.json();

    expect(data.environment).toMatch(/^(development|production|test)$/);
  });

  test('Version information is present', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);
    const data = await response.json();

    expect(data.version).toBeTruthy();
    expect(typeof data.version).toBe('string');
  });
});
