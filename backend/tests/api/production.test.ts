/**
 * Production API Direct Testing
 *
 * These tests hit the ACTUAL DEPLOYED Railway backend to diagnose CORS issues.
 * DO NOT RUN IN CI - these are for manual debugging only.
 *
 * Usage:
 *   npm test -- tests/api/production.test.ts
 */

import { describe, it, expect } from 'vitest';

const BACKEND_URL = 'https://intelligent-celebration-production-57e4.up.railway.app';
const FRONTEND_ORIGIN = 'https://jobmatchai-production.up.railway.app';
const EVIL_ORIGIN = 'https://evil.com';

describe('Production Backend Direct Tests', () => {
  describe('Health Check', () => {
    it('should be accessible and return 200', async () => {
      const response = await fetch(`${BACKEND_URL}/health`);

      console.log('=== Health Check ===');
      console.log('Status:', response.status);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));

      expect(response.status).toBe(200);

      const data = await response.json();
      console.log('Response body:', data);

      expect(data.status).toBe('healthy');
      expect(data.environment).toBeDefined();
      expect(data.version).toBeDefined();
    });

    it('should return CORS headers when called with origin', async () => {
      const response = await fetch(`${BACKEND_URL}/health`, {
        headers: {
          'Origin': FRONTEND_ORIGIN,
        },
      });

      console.log('=== Health Check with Origin ===');
      console.log('Status:', response.status);
      console.log('All Headers:', Object.fromEntries(response.headers.entries()));

      const corsOrigin = response.headers.get('access-control-allow-origin');
      console.log('CORS Allow-Origin:', corsOrigin);

      expect(response.status).toBe(200);
      expect(corsOrigin).toBe(FRONTEND_ORIGIN);
    });
  });

  describe('OPTIONS Preflight Request', () => {
    it('should return 204/200 with proper CORS headers for /api/applications/generate', async () => {
      const response = await fetch(`${BACKEND_URL}/api/applications/generate`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization',
        },
      });

      console.log('\n=== OPTIONS Preflight Request ===');
      console.log('URL:', `${BACKEND_URL}/api/applications/generate`);
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('\n--- Request Headers ---');
      console.log('Origin:', FRONTEND_ORIGIN);
      console.log('Access-Control-Request-Method:', 'POST');
      console.log('Access-Control-Request-Headers:', 'Content-Type,Authorization');

      console.log('\n--- Response Headers (ALL) ---');
      const allHeaders = Object.fromEntries(response.headers.entries());
      Object.entries(allHeaders).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });

      console.log('\n--- CORS-Specific Headers ---');
      const corsHeaders = {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
        'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
        'access-control-max-age': response.headers.get('access-control-max-age'),
      };
      console.log(JSON.stringify(corsHeaders, null, 2));

      // The critical assertions
      expect([200, 204]).toContain(response.status);

      const allowOrigin = response.headers.get('access-control-allow-origin');
      if (!allowOrigin) {
        console.error('\n❌ CRITICAL ERROR: No Access-Control-Allow-Origin header!');
        console.error('This is why CORS is failing!');
      }
      expect(allowOrigin).toBe(FRONTEND_ORIGIN);

      const allowMethods = response.headers.get('access-control-allow-methods');
      expect(allowMethods).toBeTruthy();
      expect(allowMethods?.toUpperCase()).toContain('POST');

      const allowHeaders = response.headers.get('access-control-allow-headers');
      expect(allowHeaders).toBeTruthy();
      expect(allowHeaders?.toLowerCase()).toContain('content-type');
      expect(allowHeaders?.toLowerCase()).toContain('authorization');
    });

    it('should handle OPTIONS for /api/jobs/scrape endpoint', async () => {
      const response = await fetch(`${BACKEND_URL}/api/jobs/scrape`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Access-Control-Request-Method': 'POST',
        },
      });

      console.log('\n=== OPTIONS /api/jobs/scrape ===');
      console.log('Status:', response.status);
      console.log('CORS Headers:', {
        origin: response.headers.get('access-control-allow-origin'),
        methods: response.headers.get('access-control-allow-methods'),
      });

      expect([200, 204]).toContain(response.status);
      expect(response.headers.get('access-control-allow-origin')).toBe(FRONTEND_ORIGIN);
    });

    it('should handle OPTIONS for /api/emails/send endpoint', async () => {
      const response = await fetch(`${BACKEND_URL}/api/emails/send`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Access-Control-Request-Method': 'POST',
        },
      });

      console.log('\n=== OPTIONS /api/emails/send ===');
      console.log('Status:', response.status);
      console.log('CORS Headers:', {
        origin: response.headers.get('access-control-allow-origin'),
        methods: response.headers.get('access-control-allow-methods'),
      });

      expect([200, 204]).toContain(response.status);
      expect(response.headers.get('access-control-allow-origin')).toBe(FRONTEND_ORIGIN);
    });
  });

  describe('Unauthorized Origin Handling', () => {
    it('should NOT return CORS headers for evil origin', async () => {
      const response = await fetch(`${BACKEND_URL}/health`, {
        headers: {
          'Origin': EVIL_ORIGIN,
        },
      });

      console.log('\n=== Evil Origin Test ===');
      console.log('Status:', response.status);
      console.log('Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));

      // Should either:
      // 1. Not set the header (undefined)
      // 2. Set it but NOT to the evil origin
      const allowOrigin = response.headers.get('access-control-allow-origin');
      expect(allowOrigin).not.toBe(EVIL_ORIGIN);
    });

    it('should reject OPTIONS preflight from evil origin', async () => {
      const response = await fetch(`${BACKEND_URL}/api/applications/generate`, {
        method: 'OPTIONS',
        headers: {
          'Origin': EVIL_ORIGIN,
          'Access-Control-Request-Method': 'POST',
        },
      });

      console.log('\n=== Evil Origin OPTIONS ===');
      console.log('Status:', response.status);
      console.log('All Headers:', Object.fromEntries(response.headers.entries()));

      const allowOrigin = response.headers.get('access-control-allow-origin');
      expect(allowOrigin).not.toBe(EVIL_ORIGIN);
    });
  });

  describe('POST Request Without Auth (Should Fail with 401)', () => {
    it('should return 401 when POSTing without Authorization header', async () => {
      const response = await fetch(`${BACKEND_URL}/api/applications/generate`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId: 'test-job-id' }),
      });

      console.log('\n=== POST Without Auth ===');
      console.log('Status:', response.status);
      console.log('CORS Header:', response.headers.get('access-control-allow-origin'));

      // Should return 401 Unauthorized (not a CORS error)
      expect(response.status).toBe(401);

      // But should STILL include CORS headers
      expect(response.headers.get('access-control-allow-origin')).toBe(FRONTEND_ORIGIN);
    });
  });

  describe('No Origin Header (Mobile/Curl)', () => {
    it('should allow requests without Origin header', async () => {
      const response = await fetch(`${BACKEND_URL}/health`);

      console.log('\n=== Request Without Origin ===');
      console.log('Status:', response.status);

      expect(response.status).toBe(200);
    });
  });

  describe('Full Request Simulation', () => {
    it('should simulate exact browser preflight + request flow', async () => {
      console.log('\n=== SIMULATING FULL BROWSER FLOW ===\n');

      // Step 1: Browser sends OPTIONS preflight
      console.log('Step 1: Browser sends OPTIONS preflight...');
      const preflightResponse = await fetch(`${BACKEND_URL}/api/applications/generate`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,authorization',
        },
      });

      console.log('Preflight Status:', preflightResponse.status);
      console.log('Preflight CORS Headers:');
      console.log('  Allow-Origin:', preflightResponse.headers.get('access-control-allow-origin'));
      console.log('  Allow-Methods:', preflightResponse.headers.get('access-control-allow-methods'));
      console.log('  Allow-Headers:', preflightResponse.headers.get('access-control-allow-headers'));
      console.log('  Allow-Credentials:', preflightResponse.headers.get('access-control-allow-credentials'));

      const preflightSuccess =
        [200, 204].includes(preflightResponse.status) &&
        preflightResponse.headers.get('access-control-allow-origin') === FRONTEND_ORIGIN;

      console.log('\nPreflight Success:', preflightSuccess ? '✅' : '❌');

      if (!preflightSuccess) {
        console.log('\n❌ PREFLIGHT FAILED - Browser would block the actual request!');
        console.log('All Preflight Headers:', Object.fromEntries(preflightResponse.headers.entries()));
      }

      expect(preflightSuccess).toBe(true);

      // Step 2: If preflight succeeds, browser sends actual request
      if (preflightSuccess) {
        console.log('\nStep 2: Preflight succeeded, sending actual POST request...');
        const actualResponse = await fetch(`${BACKEND_URL}/api/applications/generate`, {
          method: 'POST',
          headers: {
            'Origin': FRONTEND_ORIGIN,
            'Content-Type': 'application/json',
            // No auth - should get 401
          },
          body: JSON.stringify({ jobId: 'test' }),
        });

        console.log('Actual Request Status:', actualResponse.status);
        console.log('Actual Request CORS Header:', actualResponse.headers.get('access-control-allow-origin'));

        // Should be 401 (not 403 CORS error)
        expect(actualResponse.status).toBe(401);
        expect(actualResponse.headers.get('access-control-allow-origin')).toBe(FRONTEND_ORIGIN);
      }
    });
  });

  describe('Railway Specific Tests', () => {
    it('should detect if Railway is properly routing requests', async () => {
      const response = await fetch(`${BACKEND_URL}/health`);

      console.log('\n=== Railway Routing Check ===');
      console.log('Server Header:', response.headers.get('server'));
      console.log('X-Powered-By:', response.headers.get('x-powered-by'));
      console.log('Connection:', response.headers.get('connection'));

      // Railway typically adds its own headers
      const headers = Object.fromEntries(response.headers.entries());
      console.log('All Headers:', headers);

      expect(response.status).toBe(200);
    });

    it('should check if OPTIONS is being handled by Express or Railway proxy', async () => {
      const response = await fetch(`${BACKEND_URL}/api/applications/generate`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_ORIGIN,
        },
      });

      console.log('\n=== OPTIONS Handler Detection ===');
      console.log('Status:', response.status);
      console.log('Server:', response.headers.get('server'));
      console.log('Content-Length:', response.headers.get('content-length'));

      // Check if it's returning Express default or custom response
      const text = await response.text();
      console.log('Response Body:', text.substring(0, 200));
      console.log('Body Length:', text.length);

      // If body is empty and status is 204, it's likely Express CORS middleware
      // If body has content, might be Railway or another proxy
      if (text.length === 0) {
        console.log('✅ Likely Express CORS middleware responding');
      } else {
        console.log('⚠️  Response has body - might be proxy or error');
      }
    });
  });
});

describe('Production Frontend Origin Variations', () => {
  const variations = [
    'https://jobmatchai-production.up.railway.app',
    'https://jobmatchai-production.up.railway.app/',
    'https://JOBMATCHAI-PRODUCTION.up.railway.app', // case variation
  ];

  variations.forEach(origin => {
    it(`should handle origin: ${origin}`, async () => {
      const response = await fetch(`${BACKEND_URL}/health`, {
        headers: { 'Origin': origin },
      });

      console.log(`\n=== Origin Variation: ${origin} ===`);
      console.log('Status:', response.status);
      console.log('Allow-Origin:', response.headers.get('access-control-allow-origin'));

      // Note: Trailing slash might cause issues
      if (origin.endsWith('/')) {
        console.log('⚠️  Origin has trailing slash - might not match');
      }
    });
  });
});

describe('Environment Variable Verification', () => {
  it('should log what environment the backend thinks it is', async () => {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();

    console.log('\n=== Backend Environment ===');
    console.log('Environment:', data.environment);
    console.log('Version:', data.version);
    console.log('Timestamp:', data.timestamp);

    // Should be 'production' not 'development'
    expect(data.environment).toBe('production');
  });
});
