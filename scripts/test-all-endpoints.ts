#!/usr/bin/env tsx
/**
 * Comprehensive Backend Endpoint Testing Script
 *
 * Tests ALL backend endpoints to identify which ones work and which fail.
 * This helps isolate issues with specific functionality (e.g., AI generation).
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://intelligent-celebration-production-57e4.up.railway.app';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://jobmatchai-production.up.railway.app';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
  responseTime: number;
  corsHeaders: boolean;
  requiresAuth: boolean;
}

const results: TestResult[] = [];

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function separator() {
  log('='.repeat(80), colors.cyan);
}

async function testEndpoint(
  endpoint: string,
  method: string = 'GET',
  options: {
    requiresAuth?: boolean;
    body?: any;
    description?: string;
    expectedStatus?: number;
    testCORS?: boolean;
  } = {}
): Promise<TestResult> {
  const {
    requiresAuth = false,
    body,
    description,
    expectedStatus,
    testCORS = true,
  } = options;

  const url = `${BACKEND_URL}${endpoint}`;
  const startTime = Date.now();

  log(`\nTesting: ${method} ${endpoint}`, colors.bright);
  if (description) {
    log(`  ${description}`, colors.blue);
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (testCORS) {
      headers['Origin'] = FRONTEND_URL;
    }

    // For OPTIONS requests (CORS preflight)
    if (method === 'OPTIONS') {
      headers['Access-Control-Request-Method'] = 'POST';
      headers['Access-Control-Request-Headers'] = 'Content-Type,Authorization';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseTime = Date.now() - startTime;
    const corsHeaders = {
      origin: response.headers.get('access-control-allow-origin'),
      methods: response.headers.get('access-control-allow-methods'),
      headers: response.headers.get('access-control-allow-headers'),
      credentials: response.headers.get('access-control-allow-credentials'),
    };

    const hasCORS = !!corsHeaders.origin;
    const status = response.status;
    const statusText = response.statusText;

    let responseBody = '';
    try {
      const text = await response.text();
      if (text) {
        responseBody = text.length > 500 ? text.substring(0, 500) + '...' : text;
      }
    } catch (e) {
      // Ignore parsing errors
    }

    const success = expectedStatus ? status === expectedStatus : status >= 200 && status < 300;

    log(`  Status: ${status} ${statusText}`, success ? colors.green : colors.red);
    log(`  Response Time: ${responseTime}ms`, colors.cyan);

    if (testCORS) {
      log(`  CORS Headers: ${hasCORS ? '✓' : '✗'}`, hasCORS ? colors.green : colors.red);
      if (hasCORS) {
        log(`    - Origin: ${corsHeaders.origin}`, colors.blue);
        log(`    - Methods: ${corsHeaders.methods}`, colors.blue);
      }
    }

    if (responseBody && responseBody.length < 200) {
      log(`  Response: ${responseBody}`, colors.blue);
    }

    const result: TestResult = {
      endpoint,
      method,
      status,
      success,
      responseTime,
      corsHeaders: hasCORS,
      requiresAuth,
    };

    results.push(result);
    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    log(`  ✗ ERROR: ${errorMessage}`, colors.red);
    log(`  Response Time: ${responseTime}ms`, colors.cyan);

    const result: TestResult = {
      endpoint,
      method,
      status: 0,
      success: false,
      error: errorMessage,
      responseTime,
      corsHeaders: false,
      requiresAuth,
    };

    results.push(result);
    return result;
  }
}

async function main() {
  separator();
  log('COMPREHENSIVE BACKEND ENDPOINT TESTING', colors.bright + colors.cyan);
  separator();
  log(`Backend: ${BACKEND_URL}`, colors.blue);
  log(`Frontend: ${FRONTEND_URL}`, colors.blue);
  log(`Started: ${new Date().toISOString()}`, colors.blue);
  separator();

  // ==========================================================================
  // 1. HEALTH & INFRASTRUCTURE
  // ==========================================================================
  separator();
  log('1. HEALTH & INFRASTRUCTURE ENDPOINTS', colors.bright + colors.yellow);
  separator();

  await testEndpoint('/health', 'GET', {
    description: 'Health check - should always work',
    expectedStatus: 200,
  });

  await testEndpoint('/api', 'GET', {
    description: 'API documentation (dev only)',
    testCORS: false,
  });

  // ==========================================================================
  // 2. CORS PREFLIGHT TESTS
  // ==========================================================================
  separator();
  log('2. CORS PREFLIGHT TESTS (OPTIONS)', colors.bright + colors.yellow);
  separator();

  await testEndpoint('/api/applications/generate', 'OPTIONS', {
    description: 'AI generation preflight - CRITICAL for CORS',
    expectedStatus: 204,
  });

  await testEndpoint('/api/jobs/scrape', 'OPTIONS', {
    description: 'Job scraping preflight',
    expectedStatus: 204,
  });

  await testEndpoint('/api/emails/send', 'OPTIONS', {
    description: 'Email sending preflight',
    expectedStatus: 204,
  });

  // ==========================================================================
  // 3. AUTHENTICATION ENDPOINTS
  // ==========================================================================
  separator();
  log('3. AUTHENTICATION ENDPOINTS', colors.bright + colors.yellow);
  separator();

  await testEndpoint('/api/auth/linkedin/initiate', 'GET', {
    description: 'LinkedIn OAuth initiation',
    testCORS: false,
  });

  // ==========================================================================
  // 4. JOB ENDPOINTS (NO AUTH - should fail with 401)
  // ==========================================================================
  separator();
  log('4. JOB ENDPOINTS (Without Auth)', colors.bright + colors.yellow);
  separator();

  await testEndpoint('/api/jobs', 'GET', {
    description: 'List jobs (should require auth)',
    expectedStatus: 401,
    requiresAuth: true,
  });

  await testEndpoint('/api/jobs/scrape', 'POST', {
    description: 'Scrape jobs (should require auth)',
    expectedStatus: 401,
    requiresAuth: true,
    body: {
      keywords: 'software engineer',
      location: 'San Francisco',
      sources: ['linkedin'],
    },
  });

  // ==========================================================================
  // 5. APPLICATION ENDPOINTS (NO AUTH - should fail with 401)
  // ==========================================================================
  separator();
  log('5. APPLICATION ENDPOINTS (Without Auth)', colors.bright + colors.yellow);
  separator();

  await testEndpoint('/api/applications', 'GET', {
    description: 'List applications (should require auth)',
    expectedStatus: 401,
    requiresAuth: true,
  });

  await testEndpoint('/api/applications/generate', 'POST', {
    description: 'AI generation (should require auth OR get 401)',
    requiresAuth: true,
    body: {
      jobId: 'test-job-id',
    },
  });

  // ==========================================================================
  // 6. EMAIL ENDPOINTS (NO AUTH - should fail with 401)
  // ==========================================================================
  separator();
  log('6. EMAIL ENDPOINTS (Without Auth)', colors.bright + colors.yellow);
  separator();

  await testEndpoint('/api/emails/send', 'POST', {
    description: 'Send email (should require auth)',
    expectedStatus: 401,
    requiresAuth: true,
    body: {
      to: 'test@example.com',
      subject: 'Test',
      body: 'Test',
    },
  });

  await testEndpoint('/api/emails/history', 'GET', {
    description: 'Email history (should require auth)',
    expectedStatus: 401,
    requiresAuth: true,
  });

  await testEndpoint('/api/emails/remaining', 'GET', {
    description: 'Remaining email quota (should require auth)',
    expectedStatus: 401,
    requiresAuth: true,
  });

  // ==========================================================================
  // 7. EXPORT ENDPOINTS (NO AUTH - should fail with 401)
  // ==========================================================================
  separator();
  log('7. EXPORT ENDPOINTS (Without Auth)', colors.bright + colors.yellow);
  separator();

  await testEndpoint('/api/exports/pdf', 'POST', {
    description: 'Export as PDF (should require auth)',
    expectedStatus: 401,
    requiresAuth: true,
    body: {
      applicationId: 'test-app-id',
    },
  });

  await testEndpoint('/api/exports/docx', 'POST', {
    description: 'Export as DOCX (should require auth)',
    expectedStatus: 401,
    requiresAuth: true,
    body: {
      applicationId: 'test-app-id',
    },
  });

  // ==========================================================================
  // 8. RESUME ENDPOINTS (NO AUTH - should fail with 401)
  // ==========================================================================
  separator();
  log('8. RESUME ENDPOINTS (Without Auth)', colors.bright + colors.yellow);
  separator();

  await testEndpoint('/api/resume/parse', 'POST', {
    description: 'Parse resume (should require auth)',
    expectedStatus: 401,
    requiresAuth: true,
    body: {
      resumeText: 'Test resume content',
    },
  });

  // ==========================================================================
  // 9. SUMMARY & ANALYSIS
  // ==========================================================================
  separator();
  log('SUMMARY & ANALYSIS', colors.bright + colors.cyan);
  separator();

  const total = results.length;
  const working = results.filter((r) => r.success).length;
  const failing = results.filter((r) => !r.success).length;
  const withCORS = results.filter((r) => r.corsHeaders).length;
  const withoutCORS = results.filter((r) => !r.corsHeaders && r.method !== 'GET').length;

  log(`\nTotal Endpoints Tested: ${total}`, colors.bright);
  log(`✓ Working: ${working}`, colors.green);
  log(`✗ Failing: ${failing}`, colors.red);
  log(`CORS Enabled: ${withCORS}`, colors.cyan);
  log(`CORS Missing: ${withoutCORS}`, colors.yellow);

  // Group by status
  separator();
  log('\nResults by Status Code:', colors.bright);
  const byStatus = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  Object.entries(byStatus)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([status, count]) => {
      const statusNum = Number(status);
      const color =
        statusNum === 0
          ? colors.red
          : statusNum >= 200 && statusNum < 300
          ? colors.green
          : statusNum === 401
          ? colors.yellow
          : statusNum >= 500
          ? colors.red
          : colors.blue;
      log(`  ${status}: ${count} endpoints`, color);
    });

  // Identify problem areas
  separator();
  log('\nPROBLEM AREAS:', colors.bright + colors.red);

  const problems: string[] = [];

  // Check for 502 errors
  const error502 = results.filter((r) => r.status === 502);
  if (error502.length > 0) {
    problems.push(
      `⚠️  ${error502.length} endpoints returning 502 Bad Gateway (backend crashed/not responding)`
    );
    error502.forEach((r) => {
      log(`    - ${r.method} ${r.endpoint}`, colors.red);
    });
  }

  // Check for missing CORS
  const missingCORS = results.filter(
    (r) => !r.corsHeaders && r.method === 'POST' && !r.requiresAuth
  );
  if (missingCORS.length > 0) {
    problems.push(`⚠️  ${missingCORS.length} POST endpoints missing CORS headers`);
    missingCORS.forEach((r) => {
      log(`    - ${r.method} ${r.endpoint}`, colors.red);
    });
  }

  // Check for network errors
  const networkErrors = results.filter((r) => r.status === 0);
  if (networkErrors.length > 0) {
    problems.push(`⚠️  ${networkErrors.length} endpoints failed with network errors`);
    networkErrors.forEach((r) => {
      log(`    - ${r.method} ${r.endpoint}: ${r.error}`, colors.red);
    });
  }

  // Check for slow responses
  const slowResponses = results.filter((r) => r.responseTime > 5000);
  if (slowResponses.length > 0) {
    problems.push(`⚠️  ${slowResponses.length} endpoints responding slowly (>5s)`);
    slowResponses.forEach((r) => {
      log(`    - ${r.method} ${r.endpoint}: ${r.responseTime}ms`, colors.yellow);
    });
  }

  if (problems.length === 0) {
    log('\n✓ No critical problems detected!', colors.green);
  }

  // Success indicators
  separator();
  log('\nSUCCESS INDICATORS:', colors.bright + colors.green);

  const successIndicators: string[] = [];

  if (results.find((r) => r.endpoint === '/health' && r.success)) {
    successIndicators.push('✓ Backend is running (health check passed)');
  }

  const workingCORS = results.filter(
    (r) => r.method === 'OPTIONS' && r.corsHeaders
  ).length;
  if (workingCORS > 0) {
    successIndicators.push(`✓ CORS preflight working on ${workingCORS} endpoints`);
  }

  const authWorking = results.filter(
    (r) => r.requiresAuth && r.status === 401
  ).length;
  if (authWorking > 0) {
    successIndicators.push(`✓ Authentication middleware working on ${authWorking} endpoints`);
  }

  successIndicators.forEach((msg) => log(msg, colors.green));

  // Recommendations
  separator();
  log('\nRECOMMENDATIONS:', colors.bright + colors.cyan);

  if (error502.length > 0) {
    log('1. Check Railway logs for crash/error messages', colors.yellow);
    log('2. Verify all environment variables are set', colors.yellow);
    log('3. Test endpoints locally to isolate the issue', colors.yellow);
  }

  if (missingCORS.length > 0) {
    log('1. Verify CORS middleware is applied to all routes', colors.yellow);
    log('2. Check that OPTIONS requests bypass authentication', colors.yellow);
    log('3. Ensure APP_URL environment variable is correct', colors.yellow);
  }

  separator();
  log(`\nCompleted: ${new Date().toISOString()}`, colors.blue);
  separator();

  // Exit with error code if there are failures
  if (failing > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
