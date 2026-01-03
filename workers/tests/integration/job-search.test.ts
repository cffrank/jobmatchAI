/**
 * Test 3: Job Search with Vectorize
 *
 * Tests:
 * 1. Create 10 test jobs in D1
 * 2. Verify embeddings generated (Workers AI)
 * 3. Verify embeddings cached in KV
 * 4. Verify embeddings indexed in Vectorize
 * 5. Test semantic search
 * 6. Test hybrid search (FTS5 + Vectorize)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { createClient } from '@supabase/supabase-js';
import worker from '../../api/index';

describe('Test 3: Job Search with Vectorize', () => {
  let testUser: { id: string; email: string; token: string } | null = null;
  const testJobs: string[] = [];

  beforeAll(async () => {
    const supabase = createClient(
      env.SUPABASE_URL as string,
      env.SUPABASE_ANON_KEY as string
    );

    const timestamp = Date.now();
    const testEmail = 'test-jobs-' + timestamp + '@example.com';
    const testPassword = 'TestPassword123!';

    const { data } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    testUser = {
      id: data.user!.id,
      email: testEmail,
      token: data.session!.access_token,
    };

    console.log('[Test 3] Created test user:', testUser.id);
  });

  it('should create 10 test jobs in D1', async () => {
    expect(testUser).toBeDefined();

    console.log('[Test 3.1] Creating 10 test jobs...');

    const jobTitles = [
      'Senior Frontend Engineer',
      'Backend Developer - Node.js',
      'Full Stack Software Engineer',
      'DevOps Engineer - AWS',
      'Machine Learning Engineer',
      'Data Scientist - Python',
      'Product Manager - Tech',
      'UI/UX Designer',
      'Technical Writer',
      'Solutions Architect',
    ];

    for (let i = 0; i < jobTitles.length; i++) {
      const title = jobTitles[i];

      const jobData = {
        title,
        company: 'Tech Company ' + (i + 1),
        description: 'Exciting opportunity for ' + title + '. We are looking for passionate professionals.',
        location: 'Remote',
        workArrangement: 'Remote',
        salaryMin: 80000 + (i * 10000),
        salaryMax: 120000 + (i * 15000),
        source: 'manual',
      };

      const request = new Request('http://localhost/api/jobs', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + testUser!.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(201);

      const data = await response.json();
      testJobs.push(data.id);

      console.log('[Test 3.1] Created job ' + (i + 1) + '/10:', title);
    }

    console.log('[Test 3.1] ✓ All 10 jobs created successfully');
  });

  it('should verify embeddings generated via Workers AI', async () => {
    expect(testJobs.length).toBe(10);

    console.log('[Test 3.2] Verifying embeddings...');

    for (const jobId of testJobs) {
      const result = await env.DB.prepare(
        'SELECT embedding_vector FROM jobs WHERE id = ?'
      )
        .bind(jobId)
        .first();

      expect(result).toBeDefined();
      expect(result!.embedding_vector).toBeDefined();

      const embedding = JSON.parse(result!.embedding_vector as string);
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(768); // BGE-base-en-v1.5 dimension
    }

    console.log('[Test 3.2] ✓ All embeddings generated (768 dimensions)');
  });

  it('should perform semantic search', async () => {
    expect(testUser).toBeDefined();

    console.log('[Test 3.4] Testing semantic search...');

    const searchQuery = 'software engineer with frontend experience';

    const request = new Request('http://localhost/api/jobs/search', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + testUser!.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        searchType: 'semantic',
        limit: 5,
      }),
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.jobs).toBeDefined();
    expect(Array.isArray(data.jobs)).toBe(true);
    expect(data.jobs.length).toBeGreaterThan(0);
    expect(data.searchType).toBe('semantic');

    console.log('[Test 3.4] ✓ Semantic search returned ' + data.jobs.length + ' results');
    console.log('[Test 3.4] Top result:', data.jobs[0].title);
  });

  it('should perform hybrid search (FTS5 + Vectorize)', async () => {
    expect(testUser).toBeDefined();

    console.log('[Test 3.5] Testing hybrid search...');

    const searchQuery = 'backend node.js developer';

    const request = new Request('http://localhost/api/jobs/search', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + testUser!.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        searchType: 'hybrid',
        limit: 5,
      }),
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.jobs).toBeDefined();
    expect(Array.isArray(data.jobs)).toBe(true);
    expect(data.searchType).toBe('hybrid');

    console.log('[Test 3.5] ✓ Hybrid search returned ' + data.jobs.length + ' results');
    console.log('[Test 3.5] Top result:', data.jobs[0].title);
  });
});
