/**
 * CORS E2E Validation Tests
 * Live tests against deployed endpoints to verify CORS configuration
 */

import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

test.describe('Live CORS Validation', () => {
  test('Backend allows frontend origin', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`, {
      headers: {
        Origin: FRONTEND_URL,
      },
    });

    expect(response.ok()).toBeTruthy();

    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeTruthy();

    // Should match the frontend URL or be wildcard (not recommended for production)
    const allowedOrigin = headers['access-control-allow-origin'];
    expect([FRONTEND_URL, '*'].includes(allowedOrigin)).toBeTruthy();
  });

  test('Preflight request for POST /api/applications/generate', async ({ request }) => {
    const response = await request.fetch(`${BACKEND_URL}/api/applications/generate`, {
      method: 'OPTIONS',
      headers: {
        Origin: FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization',
      },
    });

    // OPTIONS should return 2xx or 204
    expect(response.status()).toBeLessThan(300);

    const headers = response.headers();

    // Critical CORS headers must be present
    expect(headers['access-control-allow-origin']).toBeTruthy();
    expect(headers['access-control-allow-methods']).toMatch(/POST/i);
    expect(headers['access-control-allow-headers']).toMatch(/authorization/i);
    expect(headers['access-control-allow-headers']).toMatch(/content-type/i);
  });

  test('Preflight request for POST /api/jobs/scrape', async ({ request }) => {
    const response = await request.fetch(`${BACKEND_URL}/api/jobs/scrape`, {
      method: 'OPTIONS',
      headers: {
        Origin: FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization',
      },
    });

    expect(response.status()).toBeLessThan(300);

    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeTruthy();
    expect(headers['access-control-allow-methods']).toMatch(/POST/i);
  });

  test('Credentials flag is set correctly', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`, {
      headers: {
        Origin: FRONTEND_URL,
      },
    });

    const headers = response.headers();

    // Check if credentials are allowed
    expect(headers['access-control-allow-credentials']).toBe('true');
  });

  test('Exposed headers include rate limit headers', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`, {
      headers: {
        Origin: FRONTEND_URL,
      },
    });

    const headers = response.headers();
    const exposedHeaders = headers['access-control-expose-headers'] || '';

    // Should expose rate limit headers
    expect(exposedHeaders.toLowerCase()).toMatch(/x-ratelimit/);
  });

  test('Unauthorized origins are blocked', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`, {
      headers: {
        Origin: 'https://malicious-site.com',
      },
    });

    // Request might succeed but CORS headers should not allow the origin
    const headers = response.headers();
    const allowedOrigin = headers['access-control-allow-origin'];

    if (allowedOrigin) {
      expect(allowedOrigin).not.toBe('https://malicious-site.com');
    }
  });

  test('Max-Age header is set for preflight caching', async ({ request }) => {
    const response = await request.fetch(`${BACKEND_URL}/api/applications/generate`, {
      method: 'OPTIONS',
      headers: {
        Origin: FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
      },
    });

    const headers = response.headers();
    const maxAge = headers['access-control-max-age'];

    if (maxAge) {
      const maxAgeSeconds = parseInt(maxAge, 10);
      expect(maxAgeSeconds).toBeGreaterThan(0);
      expect(maxAgeSeconds).toBeLessThanOrEqual(86400); // Max 24 hours
    }
  });
});

test.describe('Production CORS Configuration', () => {
  test.skip(({ }, testInfo) => {
    // Only run in production or staging environments
    const isProduction =
      BACKEND_URL.includes('railway.app') ||
      BACKEND_URL.includes('vercel.app') ||
      process.env.NODE_ENV === 'production';

    return !isProduction;
  });

  test('Production backend allows production frontend', async ({ request }) => {
    const prodFrontendUrl = 'https://jobmatchai-production.up.railway.app';

    const response = await request.get(`${BACKEND_URL}/health`, {
      headers: {
        Origin: prodFrontendUrl,
      },
    });

    expect(response.ok()).toBeTruthy();

    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeTruthy();
  });

  test('Production backend uses HTTPS', async ({ request }) => {
    if (process.env.NODE_ENV === 'production') {
      expect(BACKEND_URL).toMatch(/^https:/);
    }
  });
});
