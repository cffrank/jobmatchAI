/**
 * E2E Testing Worker using Cloudflare Browser Rendering REST API
 *
 * This version uses the REST API which is simpler and doesn't require
 * special bindings configuration.
 */

export interface Env {
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  APP_URL?: string;
}

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screenshot?: string;
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

interface CloudflareAPIResponse {
  success: boolean;
  errors?: Array<{ message: string }>;
  result: {
    html?: string;
    screenshot?: string;
  };
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

    return new Response('E2E Testing Worker (REST API). POST to /run-tests to run tests.', {
      status: 200,
    });
  },
};

async function runE2ETests(env: Env): Promise<Response> {
  const startTime = Date.now();
  const appUrl = env.APP_URL || 'https://jobmatch-ai-dev.pages.dev';
  const results: TestResult[] = [];

  // Test 1: Home page loads and renders
  results.push(await testHomePageLoads(env, appUrl));

  // Test 2: Screenshot test
  results.push(await testScreenshot(env, appUrl));

  // Test 3: Jobs page accessibility
  results.push(await testJobsPageAccessible(env, appUrl));

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

async function testHomePageLoads(env: Env, appUrl: string): Promise<TestResult> {
  const testStart = Date.now();
  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser/content`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: appUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as CloudflareAPIResponse;

    if (!data.success) {
      throw new Error(`API returned error: ${JSON.stringify(data.errors)}`);
    }

    // Check if we got HTML content
    const html = data.result.html;
    if (!html || !html.includes('JobMatch')) {
      throw new Error('Page content does not contain expected text');
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

async function testScreenshot(env: Env, appUrl: string): Promise<TestResult> {
  const testStart = Date.now();
  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser/screenshot`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: appUrl,
        options: {
          viewport: { width: 1280, height: 720 },
          fullPage: false,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as CloudflareAPIResponse;

    if (!data.success) {
      throw new Error(`API returned error: ${JSON.stringify(data.errors)}`);
    }

    // Check if we got a screenshot
    const screenshot = data.result.screenshot;
    if (!screenshot) {
      throw new Error('No screenshot returned');
    }

    return {
      name: 'Screenshot Generation',
      status: 'passed',
      duration: Date.now() - testStart,
      screenshot: screenshot.substring(0, 100) + '...', // Truncate for readability
    };
  } catch (error) {
    return {
      name: 'Screenshot Generation',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testJobsPageAccessible(env: Env, appUrl: string): Promise<TestResult> {
  const testStart = Date.now();
  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser/content`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `${appUrl}/jobs`,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as CloudflareAPIResponse;

    if (!data.success) {
      throw new Error(`API returned error: ${JSON.stringify(data.errors)}`);
    }

    return {
      name: 'Jobs Page Accessible',
      status: 'passed',
      duration: Date.now() - testStart,
    };
  } catch (error) {
    return {
      name: 'Jobs Page Accessible',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
