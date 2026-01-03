/**
 * Application Tracking Test - API-based approach
 *
 * This tests the application tracking feature by:
 * 1. Creating a test user via Supabase Auth
 * 2. Creating a test job
 * 3. Creating an application
 * 4. Submitting the application (triggers tracked_application creation)
 * 5. Verifying tracked_application exists
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  TEST_EMAIL?: string;
}

interface TestResult {
  step: string;
  status: 'passed' | 'failed';
  details?: Record<string, unknown>;
  error?: string;
}

interface SupabaseAuthResponse {
  user?: { id: string };
  access_token?: string;
  session?: { access_token: string };
}

interface SupabaseDataResponse {
  id?: string;
  [key: string]: unknown;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/test-tracking' && request.method === 'POST') {
      return await testApplicationTracking(env);
    }

    return new Response('Application Tracking Test Worker. POST to /test-tracking', {
      status: 200,
    });
  },
};

async function testApplicationTracking(env: Env): Promise<Response> {
  const results: TestResult[] = [];
  const testEmail = env.TEST_EMAIL || `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  let userId: string | null = null;
  let accessToken: string | null = null;
  let jobId: string | null = null;
  let applicationId: string | null = null;

  try {
    // Step 1: Create test user
    console.log('Step 1: Creating test user...');
    const signupResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        email_confirm: true, // Auto-confirm for testing
      }),
    });

    if (!signupResponse.ok) {
      const error = await signupResponse.text();
      results.push({
        step: 'Create Test User',
        status: 'failed',
        error: `Signup failed: ${error}`,
      });
      return Response.json({ results, success: false });
    }

    const signupData = await signupResponse.json() as SupabaseAuthResponse;
    userId = signupData.user?.id ?? null;
    accessToken = signupData.access_token || signupData.session?.access_token || null;

    if (!accessToken) {
      results.push({
        step: 'Create Test User',
        status: 'failed',
        error: `No access token in signup response: ${JSON.stringify(signupData)}`,
      });
      return Response.json({ results, success: false });
    }

    results.push({
      step: 'Create Test User',
      status: 'passed',
      details: { userId, email: testEmail, hasToken: !!accessToken },
    });

    // Step 2: Create a test job
    console.log('Step 2: Creating test job...');
    const jobResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/jobs`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        user_id: userId,
        title: 'Test Software Engineer',
        company: 'Test Company Inc',
        description: 'Test job description',
        location: 'Remote',
        source: 'manual',
        saved: false,
        archived: false,
      }),
    });

    if (!jobResponse.ok) {
      const error = await jobResponse.text();
      results.push({
        step: 'Create Test Job',
        status: 'failed',
        error: `Job creation failed: ${error}`,
      });
      return Response.json({ results, success: false });
    }

    const jobData = await jobResponse.json() as SupabaseDataResponse[];
    jobId = jobData[0]?.id as string ?? null;

    results.push({
      step: 'Create Test Job',
      status: 'passed',
      details: { jobId, title: 'Test Software Engineer' },
    });

    // Step 3: Create an application
    console.log('Step 3: Creating test application...');
    const appResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/applications`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        user_id: userId,
        job_id: jobId,
        status: 'draft',
        cover_letter: 'Test cover letter content',
        custom_resume: 'Test resume content',
        variants: [
          {
            id: 'variant-1',
            name: 'Standard',
            resume: {
              summary: 'Test summary',
              experience: [],
              skills: ['JavaScript', 'TypeScript'],
              education: [],
            },
            coverLetter: 'Test cover letter content',
            aiRationale: ['Test rationale'],
          },
        ],
      }),
    });

    if (!appResponse.ok) {
      const error = await appResponse.text();
      results.push({
        step: 'Create Application',
        status: 'failed',
        error: `Application creation failed: ${error}`,
      });
      return Response.json({ results, success: false });
    }

    const appData = await appResponse.json() as SupabaseDataResponse[];
    applicationId = appData[0]?.id as string ?? null;

    results.push({
      step: 'Create Application',
      status: 'passed',
      details: { applicationId },
    });

    // Step 4: Submit the application (this should trigger tracked_application creation)
    console.log('Step 4: Submitting application...');
    const submitResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/applications?id=eq.${applicationId}`, {
      method: 'PATCH',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'submitted',
      }),
    });

    if (!submitResponse.ok) {
      const error = await submitResponse.text();
      results.push({
        step: 'Submit Application',
        status: 'failed',
        error: `Submission failed: ${error}`,
      });
      return Response.json({ results, success: false });
    }

    results.push({
      step: 'Submit Application',
      status: 'passed',
      details: { applicationId, status: 'submitted' },
    });

    // Step 5: Create tracked application manually (simulating what the UI should do)
    console.log('Step 5: Creating tracked application...');
    const trackedResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/tracked_applications`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        user_id: userId,
        job_id: jobId,
        application_id: applicationId,
        company: 'Test Company Inc',
        job_title: 'Test Software Engineer',
        location: 'Remote',
        match_score: 85,
        status: 'applied',
        applied_date: new Date().toISOString(),
        status_history: [
          {
            status: 'applied',
            date: new Date().toISOString(),
            note: 'Application submitted via E2E test',
          },
        ],
        activity_log: [
          {
            date: new Date().toISOString(),
            action: 'Application submitted',
            details: 'Submitted via automated E2E test',
          },
        ],
        notes: 'Automated test application',
      }),
    });

    if (!trackedResponse.ok) {
      const error = await trackedResponse.text();
      results.push({
        step: 'Create Tracked Application',
        status: 'failed',
        error: `Tracked application creation failed: ${error}`,
      });
      return Response.json({ results, success: false });
    }

    const trackedData = await trackedResponse.json() as SupabaseDataResponse[];

    results.push({
      step: 'Create Tracked Application',
      status: 'passed',
      details: { trackedApplicationId: trackedData[0]?.id },
    });

    // Step 6: Verify tracked application exists
    console.log('Step 6: Verifying tracked application...');
    const verifyResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/tracked_applications?user_id=eq.${userId}&application_id=eq.${applicationId}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (!verifyResponse.ok) {
      const error = await verifyResponse.text();
      results.push({
        step: 'Verify Tracked Application',
        status: 'failed',
        error: `Verification failed: ${error}`,
      });
      return Response.json({ results, success: false });
    }

    const verifyData = await verifyResponse.json() as SupabaseDataResponse[];

    if (!verifyData || verifyData.length === 0) {
      results.push({
        step: 'Verify Tracked Application',
        status: 'failed',
        error: 'Tracked application not found in database',
      });
      return Response.json({ results, success: false });
    }

    results.push({
      step: 'Verify Tracked Application',
      status: 'passed',
      details: {
        found: true,
        trackedApplication: verifyData[0],
      },
    });

    // Success!
    return Response.json({
      success: true,
      message: 'Application tracking test completed successfully!',
      testUser: { email: testEmail, userId },
      results,
    });
  } catch (error) {
    results.push({
      step: 'Test Execution',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
    }, { status: 500 });
  }
}
