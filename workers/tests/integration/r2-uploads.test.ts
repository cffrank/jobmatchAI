/**
 * Test 2: File Uploads to R2
 *
 * Tests:
 * 1. Upload avatar to R2 AVATARS bucket
 * 2. Upload resume to R2 RESUMES bucket
 * 3. Verify metadata saved in D1
 * 4. Test authenticated downloads
 * 5. Test file validation (size, type)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { createClient } from '@supabase/supabase-js';
import worker from '../../api/index';

describe('Test 2: File Uploads to R2', () => {
  let testUser: { id: string; email: string; token: string } | null = null;

  beforeAll(async () => {
    const supabase = createClient(
      env.SUPABASE_URL as string,
      env.SUPABASE_ANON_KEY as string
    );

    const timestamp = Date.now();
    const testEmail = `test-r2-${timestamp}@example.com`;
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

    console.log('[Test 2] Created test user:', testUser.id);
  });

  it('should upload avatar to R2 AVATARS bucket', async () => {
    expect(testUser).toBeDefined();

    console.log('[Test 2.1] Uploading avatar to R2...');

    const pngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    const formData = new FormData();
    const blob = new Blob([pngData], { type: 'image/png' });
    formData.append('avatar', blob, 'avatar.png');

    const request = new Request('http://localhost/api/profile/avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUser!.token}`,
      },
      body: formData,
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.url).toBeDefined();
    expect(data.key).toBeDefined();

    console.log('[Test 2.1] ✓ Avatar uploaded:', data.key);

    const r2Object = await env.AVATARS.get(data.key);
    expect(r2Object).not.toBeNull();
    expect(r2Object!.size).toBeGreaterThan(0);

    console.log('[Test 2.1] ✓ Avatar verified in R2 bucket');
  });

  it('should upload resume to R2 RESUMES bucket', async () => {
    expect(testUser).toBeDefined();

    console.log('[Test 2.2] Uploading resume to R2...');

    const pdfData = Buffer.from('%PDF-1.4\n%Mock PDF content\n%%EOF');

    const formData = new FormData();
    const blob = new Blob([pdfData], { type: 'application/pdf' });
    formData.append('resume', blob, 'resume.pdf');

    const request = new Request('http://localhost/api/resume/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUser!.token}`,
      },
      body: formData,
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.filename).toBeDefined();
    expect(data.url).toBeDefined();

    console.log('[Test 2.2] ✓ Resume uploaded:', data.id);

    const result = await env.DB.prepare(
      'SELECT id, user_id, filename, file_size FROM resumes WHERE id = ?'
    )
      .bind(data.id)
      .first();

    expect(result).toBeDefined();
    expect(result!.user_id).toBe(testUser!.id);
    expect(result!.filename).toBe('resume.pdf');

    console.log('[Test 2.2] ✓ Resume metadata verified in D1');
  });
});
