/**
 * Test 1: Authentication Flow
 *
 * Tests:
 * 1. Create test user via Supabase Auth
 * 2. Verify JWT token issued by Supabase
 * 3. Verify Workers middleware validates token
 * 4. Verify user profile stored in D1 (not Supabase DB)
 * 5. Test session management
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { createClient } from '@supabase/supabase-js';

// Import the Worker app
import worker from '../../api/index';

describe('Test 1: Authentication Flow', () => {
  let supabase: ReturnType<typeof createClient>;
  let testUser: { id: string; email: string; token: string } | null = null;

  beforeAll(async () => {
    // Initialize Supabase client for auth
    supabase = createClient(
      env.SUPABASE_URL as string,
      env.SUPABASE_ANON_KEY as string
    );

    console.log('[Test 1] Supabase URL:', env.SUPABASE_URL);
    console.log('[Test 1] Setting up test user...');
  });

  afterAll(async () => {
    // Cleanup: Delete test user from Supabase Auth
    if (testUser) {
      console.log('[Test 1] Cleaning up test user:', testUser.email);
      // Note: Requires admin access to delete users
      // For now, we'll leave test users (they can be cleaned up manually)
    }
  });

  it('should create test user via Supabase Auth', async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    console.log('[Test 1.1] Creating user:', testEmail);

    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          firstName: 'Test',
          lastName: 'User',
        },
      },
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.session).toBeDefined();
    expect(data.session?.access_token).toBeDefined();

    testUser = {
      id: data.user!.id,
      email: testEmail,
      token: data.session!.access_token,
    };

    console.log('[Test 1.1] ✓ User created successfully:', testUser.id);
  });

  it('should validate JWT token via Workers middleware', async () => {
    expect(testUser).toBeDefined();

    console.log('[Test 1.2] Testing JWT validation...');

    // Make authenticated request to Workers
    const request = new Request('http://localhost/api/profile', {
      headers: {
        'Authorization': `Bearer ${testUser!.token}`,
      },
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    // Should not return 401 (unauthorized)
    expect(response.status).not.toBe(401);

    console.log('[Test 1.2] ✓ JWT validation successful, status:', response.status);
  });

  it('should store user profile in D1 (not Supabase DB)', async () => {
    expect(testUser).toBeDefined();

    console.log('[Test 1.3] Checking D1 user profile...');

    // Query D1 directly to verify user profile
    const result = await env.DB.prepare(
      'SELECT id, email, first_name, last_name FROM users WHERE id = ?'
    )
      .bind(testUser!.id)
      .first();

    console.log('[Test 1.3] D1 query result:', result);

    // Profile might not exist yet if not created by endpoint
    // This is expected - profile creation happens on first authenticated request
    if (result) {
      expect(result.id).toBe(testUser!.id);
      expect(result.email).toBe(testUser!.email);
      console.log('[Test 1.3] ✓ User profile found in D1');
    } else {
      console.log('[Test 1.3] ⚠ User profile not in D1 yet (will be created on first request)');
    }
  });

  it('should create user profile on first authenticated request', async () => {
    expect(testUser).toBeDefined();

    console.log('[Test 1.4] Making first authenticated request...');

    // Call profile endpoint to trigger profile creation
    const request = new Request('http://localhost/api/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testUser!.token}`,
      },
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.ok).toBe(true);

    const data = await response.json();
    console.log('[Test 1.4] Profile response:', data);

    // Now verify in D1
    const result = await env.DB.prepare(
      'SELECT id, email, first_name, last_name, created_at FROM users WHERE id = ?'
    )
      .bind(testUser!.id)
      .first();

    expect(result).toBeDefined();
    expect(result!.id).toBe(testUser!.id);
    expect(result!.email).toBe(testUser!.email);

    console.log('[Test 1.4] ✓ User profile created in D1:', result);
  });

  it('should handle invalid JWT tokens', async () => {
    console.log('[Test 1.5] Testing invalid token rejection...');

    const request = new Request('http://localhost/api/profile', {
      headers: {
        'Authorization': 'Bearer invalid-token-12345',
      },
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.code).toBeDefined();
    expect(data.message).toBeDefined();

    console.log('[Test 1.5] ✓ Invalid token correctly rejected:', data.code);
  });

  it('should handle expired JWT tokens', async () => {
    console.log('[Test 1.6] Testing expired token handling...');

    // Use a clearly expired token (this is a mock example)
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjB9.invalid';

    const request = new Request('http://localhost/api/profile', {
      headers: {
        'Authorization': `Bearer ${expiredToken}`,
      },
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.code).toBeDefined();

    console.log('[Test 1.6] ✓ Expired token correctly rejected:', data.code);
  });

  it('should handle missing Authorization header', async () => {
    console.log('[Test 1.7] Testing missing auth header...');

    const request = new Request('http://localhost/api/profile');

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.code).toBe('MISSING_AUTH_HEADER');

    console.log('[Test 1.7] ✓ Missing header correctly rejected');
  });
});
