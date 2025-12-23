/**
 * Test Helper Functions
 * Utilities for creating test data, mocking, and assertions
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Create a test Supabase client
 */
export function createTestSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key';

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Create a mock JWT token for testing
 * Note: This is a fake token for unit tests only
 */
export function createMockToken(userId = 'test-user-id'): string {
  // This is a simple mock token, not a real JWT
  // For integration tests, use real Supabase tokens
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      aud: 'authenticated',
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    })
  ).toString('base64');
  const signature = 'mock-signature';

  return `${header}.${payload}.${signature}`;
}

/**
 * Create a test user in Supabase (for integration tests)
 */
export async function createTestUser(email: string, password: string) {
  const supabase = createTestSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return data;
}

/**
 * Sign in a test user and return auth token
 */
export async function getTestAuthToken(email: string, password: string): Promise<string> {
  const supabase = createTestSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to sign in test user: ${error.message}`);
  }

  if (!data.session) {
    throw new Error('No session returned from sign in');
  }

  return data.session.access_token;
}

/**
 * Clean up test data from database
 */
export async function cleanupTestData(userId: string) {
  const supabase = createTestSupabaseClient();

  // Delete test user's data
  await supabase.from('applications').delete().eq('user_id', userId);
  await supabase.from('jobs').delete().eq('user_id', userId);
  await supabase.from('user_profiles').delete().eq('id', userId);
}

/**
 * Wait for a condition to be true (polling)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Create mock job data
 */
export function createMockJob(overrides = {}) {
  return {
    id: 'test-job-id',
    user_id: 'test-user-id',
    title: 'Senior Software Engineer',
    company: 'Test Company Inc.',
    location: 'San Francisco, CA',
    description: 'This is a test job description.',
    url: 'https://example.com/job/123',
    source: 'linkedin',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock application data
 */
export function createMockApplication(overrides = {}) {
  return {
    id: 'test-app-id',
    user_id: 'test-user-id',
    job_id: 'test-job-id',
    resume_text: 'This is a test resume.',
    cover_letter: 'This is a test cover letter.',
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock OpenAI API responses
 */
export function mockOpenAIResponse() {
  return {
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: JSON.stringify({
            resume: 'Mocked resume content',
            coverLetter: 'Mocked cover letter content',
            variant: 'standard',
          }),
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300,
    },
  };
}
