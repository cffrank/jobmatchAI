/**
 * Production CORS Testing Script
 *
 * Simple Node.js script to test CORS configuration on production backend.
 * Run with: tsx scripts/test-production-cors.ts
 */

const BACKEND_URL = 'https://intelligent-celebration-production-57e4.up.railway.app';
const FRONTEND_URL = 'https://jobmatchai-production.up.railway.app';
const EVIL_URL = 'https://evil.com';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  error?: string;
}

const results: TestResult[] = [];

function logSection(title: string) {
  console.log('\n' + '='.repeat(70));
  console.log(title);
  console.log('='.repeat(70) + '\n');
}

function logResult(passed: boolean, message: string) {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${message}`);
}

async function test1_HealthCheck() {
  logSection('Test 1: Health Check');

  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    const passed = response.status === 200 && data.status === 'healthy';
    logResult(passed, `Health check ${passed ? 'passed' : 'failed'}`);

    results.push({
      name: 'Health Check',
      passed,
      details: `Status: ${response.status}, Environment: ${data.environment}`,
    });

    return passed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logResult(false, `Health check failed: ${message}`);
    results.push({
      name: 'Health Check',
      passed: false,
      details: 'Failed to connect',
      error: message,
    });
    return false;
  }
}

async function test2_HealthWithOrigin() {
  logSection('Test 2: Health Check with Origin Header');

  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': FRONTEND_URL,
      },
    });

    console.log('Status:', response.status);

    const corsOrigin = response.headers.get('access-control-allow-origin');
    console.log('Access-Control-Allow-Origin:', corsOrigin || '(not set)');

    const passed = corsOrigin === FRONTEND_URL;
    logResult(passed, `CORS origin header ${passed ? 'correct' : 'incorrect'}`);

    if (!passed) {
      console.log(`  Expected: ${FRONTEND_URL}`);
      console.log(`  Got: ${corsOrigin || '(none)'}`);
    }

    results.push({
      name: 'Health with Origin',
      passed,
      details: `CORS Origin: ${corsOrigin || 'missing'}`,
    });

    return passed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logResult(false, `Test failed: ${message}`);
    results.push({
      name: 'Health with Origin',
      passed: false,
      details: 'Request failed',
      error: message,
    });
    return false;
  }
}

async function test3_OptionsPreflight() {
  logSection('Test 3: OPTIONS Preflight (CRITICAL TEST)');

  console.log('Endpoint:', `${BACKEND_URL}/api/applications/generate`);
  console.log('Origin:', FRONTEND_URL);
  console.log('Request Method:', 'OPTIONS');
  console.log('');

  try {
    const response = await fetch(`${BACKEND_URL}/api/applications/generate`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    });

    console.log('Status:', response.status, response.statusText);
    console.log('');

    const headers = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
      'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
      'access-control-max-age': response.headers.get('access-control-max-age'),
    };

    console.log('CORS Headers:');
    Object.entries(headers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value || '❌ MISSING'}`);
    });
    console.log('');

    const checks = {
      statusOk: [200, 204].includes(response.status),
      hasOrigin: headers['access-control-allow-origin'] === FRONTEND_URL,
      hasMethods: headers['access-control-allow-methods']?.toUpperCase().includes('POST') ?? false,
      hasHeaders:
        headers['access-control-allow-headers']?.toLowerCase().includes('content-type') ?? false,
    };

    console.log('Validation:');
    logResult(checks.statusOk, `Status is 200/204: ${response.status}`);
    logResult(checks.hasOrigin, `Allow-Origin matches frontend: ${headers['access-control-allow-origin']}`);
    logResult(checks.hasMethods, `Allow-Methods includes POST: ${headers['access-control-allow-methods']}`);
    logResult(checks.hasHeaders, `Allow-Headers includes Content-Type: ${headers['access-control-allow-headers']}`);

    const passed = Object.values(checks).every(Boolean);

    if (!passed) {
      console.log('');
      console.log('❌ OPTIONS PREFLIGHT FAILED - THIS IS WHY CORS IS BROKEN!');
      console.log('');
      console.log('The browser sends OPTIONS before POST requests.');
      console.log('If OPTIONS does not return proper CORS headers, the browser blocks the actual request.');
    } else {
      console.log('');
      console.log('✅ OPTIONS preflight looks good!');
    }

    results.push({
      name: 'OPTIONS Preflight',
      passed,
      details: `Status: ${response.status}, Origin: ${headers['access-control-allow-origin'] || 'missing'}`,
    });

    return passed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logResult(false, `OPTIONS request failed: ${message}`);
    results.push({
      name: 'OPTIONS Preflight',
      passed: false,
      details: 'Request failed',
      error: message,
    });
    return false;
  }
}

async function test4_EvilOrigin() {
  logSection('Test 4: Unauthorized Origin (Should Reject)');

  console.log('Testing with origin:', EVIL_URL);
  console.log('');

  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': EVIL_URL,
      },
    });

    const corsOrigin = response.headers.get('access-control-allow-origin');
    console.log('Access-Control-Allow-Origin:', corsOrigin || '(not set)');

    const passed = corsOrigin !== EVIL_URL;
    logResult(passed, `Evil origin ${passed ? 'rejected' : 'ACCEPTED (SECURITY ISSUE!)'}`);

    results.push({
      name: 'Reject Evil Origin',
      passed,
      details: `CORS Origin: ${corsOrigin || 'not set'}`,
    });

    return passed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      name: 'Reject Evil Origin',
      passed: false,
      details: 'Request failed',
      error: message,
    });
    return false;
  }
}

async function test5_PostWithoutAuth() {
  logSection('Test 5: POST Without Auth (Should Get 401)');

  try {
    const response = await fetch(`${BACKEND_URL}/api/applications/generate`, {
      method: 'POST',
      headers: {
        'Origin': FRONTEND_URL,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId: 'test' }),
    });

    console.log('Status:', response.status, response.statusText);

    const corsOrigin = response.headers.get('access-control-allow-origin');
    console.log('Access-Control-Allow-Origin:', corsOrigin || '(not set)');

    const passed = response.status === 401;
    logResult(passed, `Got 401 Unauthorized: ${passed}`);

    if (passed) {
      console.log('  ✅ Request made it past CORS to auth middleware');
    } else {
      console.log(`  ⚠️  Got ${response.status} instead of 401 (might be CORS blocking)`);
    }

    const hasCors = corsOrigin === FRONTEND_URL;
    logResult(hasCors, `Response includes CORS headers: ${hasCors}`);

    results.push({
      name: 'POST Without Auth',
      passed: passed && hasCors,
      details: `Status: ${response.status}, CORS: ${corsOrigin || 'missing'}`,
    });

    return passed && hasCors;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logResult(false, `POST request failed: ${message}`);
    results.push({
      name: 'POST Without Auth',
      passed: false,
      details: 'Request failed',
      error: message,
    });
    return false;
  }
}

async function test6_AllEndpoints() {
  logSection('Test 6: OPTIONS on All Critical Endpoints');

  const endpoints = [
    '/api/applications/generate',
    '/api/jobs/scrape',
    '/api/emails/send',
    '/api/exports/pdf',
    '/api/exports/docx',
  ];

  let allPassed = true;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'POST',
        },
      });

      const corsOrigin = response.headers.get('access-control-allow-origin');
      const passed = [200, 204].includes(response.status) && corsOrigin === FRONTEND_URL;

      console.log(`${endpoint}:`);
      console.log(`  Status: ${response.status}`);
      console.log(`  CORS: ${corsOrigin || 'missing'}`);
      logResult(passed, passed ? 'OK' : 'Failed');
      console.log('');

      if (!passed) allPassed = false;
    } catch (error) {
      console.log(`${endpoint}:`);
      logResult(false, `Failed: ${error}`);
      console.log('');
      allPassed = false;
    }
  }

  results.push({
    name: 'All Endpoints',
    passed: allPassed,
    details: `Tested ${endpoints.length} endpoints`,
  });

  return allPassed;
}

async function test7_Environment() {
  logSection('Test 7: Backend Environment Verification');

  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();

    console.log('Environment:', data.environment);
    console.log('Version:', data.version);
    console.log('Timestamp:', data.timestamp);

    const passed = data.environment === 'production';
    logResult(passed, `Backend in production mode: ${passed}`);

    if (!passed) {
      console.log(`  ⚠️  Backend is in '${data.environment}' mode, should be 'production'`);
    }

    results.push({
      name: 'Environment Check',
      passed,
      details: `Environment: ${data.environment}, Version: ${data.version}`,
    });

    return passed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      name: 'Environment Check',
      passed: false,
      details: 'Failed to check',
      error: message,
    });
    return false;
  }
}

async function runAllTests() {
  console.log('='.repeat(70));
  console.log('Production CORS Testing');
  console.log('='.repeat(70));
  console.log('');
  console.log('Backend:', BACKEND_URL);
  console.log('Frontend:', FRONTEND_URL);
  console.log('');

  await test1_HealthCheck();
  await test2_HealthWithOrigin();
  await test3_OptionsPreflight();
  await test4_EvilOrigin();
  await test5_PostWithoutAuth();
  await test6_AllEndpoints();
  await test7_Environment();

  // Summary
  logSection('Summary');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`Tests Passed: ${passed}/${total}`);
  console.log('');

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.details}`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });

  console.log('');

  const criticalFailed = results.find(r => r.name === 'OPTIONS Preflight' && !r.passed);
  if (criticalFailed) {
    console.log('❌ CRITICAL: OPTIONS Preflight is failing!');
    console.log('');
    console.log('This is why CORS is broken in production.');
    console.log('Browsers send OPTIONS before POST requests.');
    console.log('If OPTIONS does not return CORS headers, the browser blocks the request.');
    console.log('');
    console.log('Possible causes:');
    console.log('  1. CORS middleware not configured in backend/src/index.ts');
    console.log('  2. Railway environment variables missing (NODE_ENV, APP_URL)');
    console.log('  3. Railway proxy stripping CORS headers');
    console.log('  4. Backend not handling OPTIONS method properly');
  } else if (passed === total) {
    console.log('✅ All tests passed!');
    console.log('');
    console.log('CORS configuration looks good from this script.');
    console.log('If you are still seeing CORS errors:');
    console.log('  1. Check browser DevTools Network tab for actual headers');
    console.log('  2. Verify Railway environment variables are set');
    console.log('  3. Check Railway logs for CORS-related errors');
  }

  console.log('');
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
