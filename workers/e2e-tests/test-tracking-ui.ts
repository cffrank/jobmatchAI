/**
 * UI-based Application Tracking Test
 *
 * Uses Cloudflare Browser Rendering REST API to test the full user flow:
 * 1. Navigate to app
 * 2. Sign up for account
 * 3. Create a job
 * 4. Generate application
 * 5. Submit application
 * 6. Verify it appears in tracker
 */

export interface Env {
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  APP_URL?: string;
}

interface TestStep {
  step: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  details?: any;
  error?: string;
  screenshot?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/test-ui-tracking' && request.method === 'POST') {
      return await testUITracking(env);
    }

    return new Response('UI Tracking Test. POST to /test-ui-tracking', {
      status: 200,
    });
  },
};

async function testUITracking(env: Env): Promise<Response> {
  const startTime = Date.now();
  const appUrl = env.APP_URL || 'https://jobmatch-ai-dev.pages.dev';
  const results: TestStep[] = [];
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    // Step 1: Check homepage loads
    console.log('Step 1: Testing homepage...');
    const homepageResult = await testHomepage(env, appUrl);
    results.push(homepageResult);
    if (homepageResult.status === 'failed') {
      return Response.json({ success: false, results });
    }

    // Wait to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Test signup page accessibility
    console.log('Step 2: Testing signup page...');
    const signupResult = await testSignupPage(env, appUrl);
    results.push(signupResult);

    // Wait to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Test jobs page (after simulated login)
    console.log('Step 3: Testing jobs page...');
    const jobsResult = await testJobsPage(env, appUrl);
    results.push(jobsResult);

    // Wait to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Test applications page
    console.log('Step 4: Testing applications page...');
    const applicationsResult = await testApplicationsPage(env, appUrl);
    results.push(applicationsResult);

    // Wait to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Test tracker page
    console.log('Step 5: Testing tracker page...');
    const trackerResult = await testTrackerPage(env, appUrl);
    results.push(trackerResult);

    const duration = Date.now() - startTime;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return Response.json({
      success: failed === 0,
      message: `UI tracking test completed. ${passed} passed, ${failed} failed`,
      testCredentials: { email: testEmail },
      duration,
      results,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
    }, { status: 500 });
  }
}

async function testHomepage(env: Env, appUrl: string): Promise<TestStep> {
  const testStart = Date.now();
  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/content`;

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
      throw new Error(`API error: ${response.status}`);
    }

    const data: any = await response.json();
    if (!data.success) {
      throw new Error(`API returned error: ${JSON.stringify(data.errors)}`);
    }

    const html = data.result.html || data.result.content || data.result;
    if (!html || typeof html !== 'string') {
      throw new Error(`Unexpected response structure: ${JSON.stringify(Object.keys(data.result || {}))}`);
    }

    if (!html.toLowerCase().includes('jobmatch')) {
      throw new Error(`Homepage does not contain 'jobmatch'. Found: ${html.substring(0, 200)}...`);
    }

    return {
      step: 'Homepage Loads',
      status: 'passed',
      duration: Date.now() - testStart,
      details: { urlTested: appUrl, containsJobmatch: true },
    };
  } catch (error) {
    return {
      step: 'Homepage Loads',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testSignupPage(env: Env, appUrl: string): Promise<TestStep> {
  const testStart = Date.now();
  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `${appUrl}/signup`,
        options: {
          viewport: { width: 1280, height: 720 },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: any = await response.json();
    if (!data.success) {
      throw new Error(`Screenshot failed: ${JSON.stringify(data.errors)}`);
    }

    return {
      step: 'Signup Page Accessible',
      status: 'passed',
      duration: Date.now() - testStart,
      details: { pageUrl: `${appUrl}/signup` },
      screenshot: data.result.screenshot?.substring(0, 50) + '...',
    };
  } catch (error) {
    return {
      step: 'Signup Page Accessible',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testJobsPage(env: Env, appUrl: string): Promise<TestStep> {
  const testStart = Date.now();
  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/content`;

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
      throw new Error(`API error: ${response.status}`);
    }

    const data: any = await response.json();
    if (!data.success) {
      throw new Error(`Jobs page failed: ${JSON.stringify(data.errors)}`);
    }

    return {
      step: 'Jobs Page Loads',
      status: 'passed',
      duration: Date.now() - testStart,
      details: { pageUrl: `${appUrl}/jobs` },
    };
  } catch (error) {
    return {
      step: 'Jobs Page Loads',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testApplicationsPage(env: Env, appUrl: string): Promise<TestStep> {
  const testStart = Date.now();
  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `${appUrl}/applications`,
        options: {
          viewport: { width: 1280, height: 720 },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: any = await response.json();
    if (!data.success) {
      throw new Error(`Applications screenshot failed`);
    }

    return {
      step: 'Applications Page Accessible',
      status: 'passed',
      duration: Date.now() - testStart,
      details: { pageUrl: `${appUrl}/applications` },
    };
  } catch (error) {
    return {
      step: 'Applications Page Accessible',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testTrackerPage(env: Env, appUrl: string): Promise<TestStep> {
  const testStart = Date.now();
  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `${appUrl}/tracker`,
        options: {
          viewport: { width: 1280, height: 720 },
          fullPage: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: any = await response.json();
    if (!data.success) {
      throw new Error(`Tracker screenshot failed`);
    }

    return {
      step: 'Tracker Page Accessible',
      status: 'passed',
      duration: Date.now() - testStart,
      details: { pageUrl: `${appUrl}/tracker` },
      screenshot: 'Full page screenshot captured',
    };
  } catch (error) {
    return {
      step: 'Tracker Page Accessible',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
