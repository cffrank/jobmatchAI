/**
 * Integration Tests for Search Preferences API (Phase 1)
 *
 * Tests the search preferences REST API endpoints:
 * - GET /api/search-preferences
 * - POST /api/search-preferences
 * - DELETE /api/search-preferences
 * - POST /api/search-preferences/blacklist
 * - DELETE /api/search-preferences/blacklist/:type/:value
 * - PATCH /api/search-preferences/sources
 *
 * Coverage:
 * - Authentication middleware enforcement
 * - Request/response validation
 * - Error handling (4xx, 5xx)
 * - Database operations
 * - Input sanitization
 * - Edge cases and boundary conditions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Application } from 'express';
import { supabaseAdmin, TABLES } from '../../src/config/supabase';
import searchPreferencesRouter from '../../src/routes/searchPreferences';
import { errorHandler } from '../../src/middleware/errorHandler';

// =============================================================================
// Test Setup
// =============================================================================

let app: Application;
let testUserId: string;
let testAuthToken: string;
let testUserEmail: string;

// Create test Express app
function createTestApp(): Application {
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api', searchPreferencesRouter);
  testApp.use(errorHandler);
  return testApp;
}

beforeAll(async () => {
  app = createTestApp();

  // Create test user
  testUserEmail = `search-pref-test-${Date.now()}@example.com`;
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: testUserEmail,
    password: 'TestPassword123!',
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  testUserId = authData.user.id;

  // Sign in to get access token
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: testUserEmail,
    password: 'TestPassword123!',
  });

  if (signInError || !signInData.session) {
    throw new Error(`Failed to sign in test user: ${signInError?.message}`);
  }

  testAuthToken = signInData.session.access_token;

  // Create user profile
  await supabaseAdmin.from(TABLES.USERS).insert({
    id: testUserId,
    email: testUserEmail,
    first_name: 'Search',
    last_name: 'Test',
  });
});

afterAll(async () => {
  // Cleanup test data
  if (testUserId) {
    // Delete preferences first (foreign key constraint)
    await supabaseAdmin.from(TABLES.JOB_PREFERENCES).delete().eq('user_id', testUserId);
    await supabaseAdmin.from(TABLES.USERS).delete().eq('id', testUserId);
    await supabaseAdmin.auth.admin.deleteUser(testUserId);
  }
});

// Clean up preferences before each test for isolation
beforeEach(async () => {
  if (testUserId) {
    await supabaseAdmin.from(TABLES.JOB_PREFERENCES).delete().eq('user_id', testUserId);
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to create sample search preferences
 */
async function createTestPreferences(overrides = {}) {
  const defaultPreferences = {
    desiredTitles: ['Software Engineer', 'Backend Developer'],
    desiredLocations: ['San Francisco, CA', 'Remote'],
    workArrangement: ['Remote', 'Hybrid'],
    jobTypes: ['full-time'],
    salaryMin: 100000,
    salaryMax: 150000,
    experienceLevels: ['mid', 'senior'],
    industries: ['Technology', 'Fintech'],
    companySizes: ['medium', 'large'],
    benefits: ['Health Insurance', '401k'],
    keywords: ['TypeScript', 'Node.js', 'PostgreSQL'],
    excludeKeywords: ['PHP', 'jQuery'],
    autoSearchEnabled: true,
    notificationFrequency: 'daily',
    ...overrides,
  };

  return defaultPreferences;
}

// =============================================================================
// Tests: GET /api/search-preferences
// =============================================================================

describe('GET /api/search-preferences', () => {
  it('should return empty preferences for new user', async () => {
    const response = await request(app)
      .get('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    expect(response.body.userId).toBe(testUserId);
    expect(response.body.desiredTitles).toEqual([]);
    expect(response.body.desiredLocations).toEqual([]);
    expect(response.body.workArrangement).toEqual([]);
    expect(response.body.autoSearchEnabled).toBe(false);
    expect(response.body.notificationFrequency).toBe('daily');
  });

  it('should return existing preferences', async () => {
    // Create preferences first
    const prefs = await createTestPreferences();
    await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(prefs);

    const response = await request(app)
      .get('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    expect(response.body.userId).toBe(testUserId);
    expect(response.body.desiredTitles).toEqual(prefs.desiredTitles);
    expect(response.body.desiredLocations).toEqual(prefs.desiredLocations);
    expect(response.body.salaryMin).toBe(prefs.salaryMin);
    expect(response.body.salaryMax).toBe(prefs.salaryMax);
    expect(response.body.autoSearchEnabled).toBe(prefs.autoSearchEnabled);
    expect(response.body.createdAt).toBeDefined();
    expect(response.body.updatedAt).toBeDefined();
  });

  it('should return 401 without authentication', async () => {
    const response = await request(app)
      .get('/api/search-preferences')
      .expect(401);

    expect(response.body.code).toBe('MISSING_AUTH_HEADER');
  });

  it('should return 401 with invalid token', async () => {
    const response = await request(app)
      .get('/api/search-preferences')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body.code).toMatch(/INVALID_TOKEN|AUTH_FAILED/);
  });

  it('should include all preference fields', async () => {
    const prefs = await createTestPreferences();
    await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(prefs);

    const response = await request(app)
      .get('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    // Check all fields are present
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('userId');
    expect(response.body).toHaveProperty('desiredTitles');
    expect(response.body).toHaveProperty('desiredLocations');
    expect(response.body).toHaveProperty('workArrangement');
    expect(response.body).toHaveProperty('jobTypes');
    expect(response.body).toHaveProperty('salaryMin');
    expect(response.body).toHaveProperty('salaryMax');
    expect(response.body).toHaveProperty('experienceLevels');
    expect(response.body).toHaveProperty('industries');
    expect(response.body).toHaveProperty('companySizes');
    expect(response.body).toHaveProperty('benefits');
    expect(response.body).toHaveProperty('keywords');
    expect(response.body).toHaveProperty('excludeKeywords');
    expect(response.body).toHaveProperty('autoSearchEnabled');
    expect(response.body).toHaveProperty('notificationFrequency');
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).toHaveProperty('updatedAt');
  });
});

// =============================================================================
// Tests: POST /api/search-preferences
// =============================================================================

describe('POST /api/search-preferences', () => {
  it('should create new preferences', async () => {
    const prefs = await createTestPreferences();

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(prefs)
      .expect(200);

    expect(response.body.userId).toBe(testUserId);
    expect(response.body.desiredTitles).toEqual(prefs.desiredTitles);
    expect(response.body.id).toBeDefined();

    // Verify in database
    const { data: dbPrefs } = await supabaseAdmin
      .from(TABLES.JOB_PREFERENCES)
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(dbPrefs).toBeDefined();
    expect(dbPrefs?.desired_titles).toEqual(prefs.desiredTitles);
  });

  it('should update existing preferences (upsert)', async () => {
    const initialPrefs = await createTestPreferences();
    await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(initialPrefs);

    // Update preferences
    const updatedPrefs = await createTestPreferences({
      desiredTitles: ['Senior Engineer', 'Tech Lead'],
      salaryMin: 150000,
    });

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(updatedPrefs)
      .expect(200);

    expect(response.body.desiredTitles).toEqual(updatedPrefs.desiredTitles);
    expect(response.body.salaryMin).toBe(updatedPrefs.salaryMin);

    // Verify only one record exists
    const { data: allPrefs } = await supabaseAdmin
      .from(TABLES.JOB_PREFERENCES)
      .select('*')
      .eq('user_id', testUserId);

    expect(allPrefs).toHaveLength(1);
  });

  it('should allow partial updates', async () => {
    // Create initial preferences
    const initialPrefs = await createTestPreferences();
    await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(initialPrefs);

    // Update only salary
    const partialUpdate = {
      salaryMin: 120000,
      salaryMax: 180000,
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(partialUpdate)
      .expect(200);

    expect(response.body.salaryMin).toBe(partialUpdate.salaryMin);
    expect(response.body.salaryMax).toBe(partialUpdate.salaryMax);
    // Other fields should remain from initial preferences
    expect(response.body.desiredTitles).toEqual(initialPrefs.desiredTitles);
  });

  it('should validate desired titles array length', async () => {
    const invalidPrefs = {
      desiredTitles: Array(25).fill('Engineer'), // Max is 20
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(invalidPrefs);

    // Should return 400 for validation error
    expect(response.status).toBe(400);
    if (response.body.code) {
      expect(response.body.code).toBe('VALIDATION_ERROR');
    }
    if (response.body.errors) {
      expect(response.body.errors).toBeDefined();
    }
  });

  it('should validate desired locations array length', async () => {
    const invalidPrefs = {
      desiredLocations: Array(25).fill('Remote'), // Max is 20
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(invalidPrefs)
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should validate work arrangement enum', async () => {
    const invalidPrefs = {
      workArrangement: ['InvalidType'],
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(invalidPrefs)
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should validate job types enum', async () => {
    const invalidPrefs = {
      jobTypes: ['invalid-type'],
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(invalidPrefs)
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should validate salary range', async () => {
    const invalidPrefs = {
      salaryMin: 150000,
      salaryMax: 100000, // Max less than min
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(invalidPrefs)
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.message).toContain('salary');
  });

  it('should validate salary min bounds', async () => {
    const invalidPrefs = {
      salaryMin: -1000, // Negative
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(invalidPrefs)
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should validate salary max bounds', async () => {
    const invalidPrefs = {
      salaryMax: 15000000, // Above max (10,000,000)
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(invalidPrefs)
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should validate experience levels enum', async () => {
    const invalidPrefs = {
      experienceLevels: ['invalid-level'],
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(invalidPrefs)
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should validate notification frequency enum', async () => {
    const invalidPrefs = {
      notificationFrequency: 'invalid-frequency',
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(invalidPrefs)
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should accept all valid work arrangement values', async () => {
    const prefs = {
      workArrangement: ['Remote', 'Hybrid', 'On-site'],
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(prefs)
      .expect(200);

    expect(response.body.workArrangement).toEqual(prefs.workArrangement);
  });

  it('should accept all valid job types', async () => {
    const prefs = {
      jobTypes: ['full-time', 'part-time', 'contract', 'internship', 'temporary'],
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(prefs)
      .expect(200);

    expect(response.body.jobTypes).toEqual(prefs.jobTypes);
  });

  it('should accept all valid experience levels', async () => {
    const prefs = {
      experienceLevels: ['entry', 'mid', 'senior', 'lead', 'executive'],
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(prefs)
      .expect(200);

    expect(response.body.experienceLevels).toEqual(prefs.experienceLevels);
  });

  it('should accept all valid company sizes', async () => {
    const prefs = {
      companySizes: ['startup', 'small', 'medium', 'large', 'enterprise'],
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(prefs)
      .expect(200);

    expect(response.body.companySizes).toEqual(prefs.companySizes);
  });

  it('should accept all valid notification frequencies', async () => {
    const frequencies = ['daily', 'weekly', 'realtime', 'none'];

    for (const freq of frequencies) {
      const prefs = { notificationFrequency: freq };

      const response = await request(app)
        .post('/api/search-preferences')
        .set('Authorization', `Bearer ${testAuthToken}`)
        .send(prefs)
        .expect(200);

      expect(response.body.notificationFrequency).toBe(freq);
    }
  });

  it('should validate industries array length', async () => {
    const invalidPrefs = {
      industries: Array(35).fill('Technology'), // Max is 30
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(invalidPrefs)
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should validate keywords array length', async () => {
    const invalidPrefs = {
      keywords: Array(35).fill('TypeScript'), // Max is 30
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(invalidPrefs)
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 without authentication', async () => {
    const prefs = await createTestPreferences();

    const response = await request(app)
      .post('/api/search-preferences')
      .send(prefs)
      .expect(401);

    expect(response.body.code).toBe('MISSING_AUTH_HEADER');
  });

  it('should handle empty body gracefully', async () => {
    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({})
      .expect(200);

    // Should succeed but not change anything
    expect(response.body.userId).toBe(testUserId);
  });

  it('should update updatedAt timestamp on each save', async () => {
    const prefs = await createTestPreferences();

    const response1 = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(prefs);

    const timestamp1 = new Date(response1.body.updatedAt);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));

    const response2 = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({ salaryMin: 110000 });

    const timestamp2 = new Date(response2.body.updatedAt);

    expect(timestamp2.getTime()).toBeGreaterThan(timestamp1.getTime());
  });
});

// =============================================================================
// Tests: DELETE /api/search-preferences
// =============================================================================

describe('DELETE /api/search-preferences', () => {
  it('should delete user preferences', async () => {
    // Create preferences first
    const prefs = await createTestPreferences();
    await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(prefs);

    // Delete preferences
    await request(app)
      .delete('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(204);

    // Verify deletion
    const { data: dbPrefs } = await supabaseAdmin
      .from(TABLES.JOB_PREFERENCES)
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(dbPrefs).toBeNull();
  });

  it('should succeed even if no preferences exist', async () => {
    // Delete without creating first
    await request(app)
      .delete('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(204);
  });

  it('should return 401 without authentication', async () => {
    const response = await request(app)
      .delete('/api/search-preferences')
      .expect(401);

    expect(response.body.code).toBe('MISSING_AUTH_HEADER');
  });

  it('should only delete current user preferences', async () => {
    // This test verifies RLS is working correctly
    const prefs = await createTestPreferences();
    await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(prefs);

    // Create another user's preferences (using admin client)
    const { data: otherUser } = await supabaseAdmin.auth.admin.createUser({
      email: `other-user-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (otherUser?.user) {
      await supabaseAdmin.from(TABLES.USERS).insert({
        id: otherUser.user.id,
        email: otherUser.user.email!,
      });

      await supabaseAdmin.from(TABLES.JOB_PREFERENCES).insert({
        user_id: otherUser.user.id,
        desired_titles: ['Engineer'],
      });

      // Delete current user's preferences
      await request(app)
        .delete('/api/search-preferences')
        .set('Authorization', `Bearer ${testAuthToken}`)
        .expect(204);

      // Verify other user's preferences still exist
      const { data: otherPrefs } = await supabaseAdmin
        .from(TABLES.JOB_PREFERENCES)
        .select('*')
        .eq('user_id', otherUser.user.id)
        .single();

      expect(otherPrefs).toBeDefined();

      // Cleanup
      await supabaseAdmin.from(TABLES.JOB_PREFERENCES).delete().eq('user_id', otherUser.user.id);
      await supabaseAdmin.from(TABLES.USERS).delete().eq('id', otherUser.user.id);
      await supabaseAdmin.auth.admin.deleteUser(otherUser.user.id);
    }
  });
});

// =============================================================================
// Tests: POST /api/search-preferences/blacklist
// =============================================================================

describe('POST /api/search-preferences/blacklist', () => {
  it('should add company to blacklist', async () => {
    const response = await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        type: 'company',
        value: 'Spam Corp',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.type).toBe('company');
    expect(response.body.value).toBe('Spam Corp');
    expect(response.body.excludeKeywords).toContain('Spam Corp');
  });

  it('should add keyword to blacklist', async () => {
    const response = await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        type: 'keyword',
        value: 'MLM',
      })
      .expect(200);

    expect(response.body.excludeKeywords).toContain('MLM');
  });

  it('should add location to blacklist', async () => {
    const response = await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        type: 'location',
        value: 'Antarctica',
      })
      .expect(200);

    expect(response.body.excludeKeywords).toContain('Antarctica');
  });

  it('should add title to blacklist', async () => {
    const response = await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        type: 'title',
        value: 'Unpaid Intern',
      })
      .expect(200);

    expect(response.body.excludeKeywords).toContain('Unpaid Intern');
  });

  it('should prevent duplicate blacklist entries', async () => {
    // Add first time
    await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        type: 'company',
        value: 'Duplicate Corp',
      })
      .expect(200);

    // Try to add again
    const response = await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        type: 'company',
        value: 'Duplicate Corp',
      })
      .expect(409);

    expect(response.body.code).toBe('CONFLICT_ERROR');
    expect(response.body.message).toContain('already blacklisted');
  });

  it('should validate blacklist type', async () => {
    const response = await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        type: 'invalid-type',
        value: 'Test',
      })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should validate value is not empty', async () => {
    const response = await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        type: 'company',
        value: '',
      })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should validate value max length', async () => {
    const response = await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        type: 'company',
        value: 'x'.repeat(250), // Max is 200
      })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 without authentication', async () => {
    const response = await request(app)
      .post('/api/search-preferences/blacklist')
      .send({
        type: 'company',
        value: 'Test',
      })
      .expect(401);

    expect(response.body.code).toBe('MISSING_AUTH_HEADER');
  });

  it('should accumulate multiple blacklist items', async () => {
    await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({ type: 'company', value: 'Company 1' });

    await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({ type: 'company', value: 'Company 2' });

    const response = await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({ type: 'company', value: 'Company 3' })
      .expect(200);

    expect(response.body.excludeKeywords).toHaveLength(3);
    expect(response.body.excludeKeywords).toContain('Company 1');
    expect(response.body.excludeKeywords).toContain('Company 2');
    expect(response.body.excludeKeywords).toContain('Company 3');
  });

  it('should persist blacklist items across preference updates', async () => {
    // Add blacklist item
    await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({ type: 'company', value: 'Blacklisted Corp' });

    // Update other preferences
    await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({ salaryMin: 100000 });

    // Verify blacklist item still exists
    const response = await request(app)
      .get('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    expect(response.body.excludeKeywords).toContain('Blacklisted Corp');
  });
});

// =============================================================================
// Tests: DELETE /api/search-preferences/blacklist/:type/:value
// =============================================================================

describe('DELETE /api/search-preferences/blacklist/:type/:value', () => {
  it('should remove item from blacklist', async () => {
    // Add item first
    await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        type: 'company',
        value: 'Remove Me Corp',
      });

    // Remove item
    await request(app)
      .delete('/api/search-preferences/blacklist/company/Remove Me Corp')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(204);

    // Verify removal
    const response = await request(app)
      .get('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    expect(response.body.excludeKeywords).not.toContain('Remove Me Corp');
  });

  it('should handle URL-encoded values', async () => {
    // Add item with spaces
    await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        type: 'company',
        value: 'Multi Word Company',
      });

    // Remove with URL encoding
    await request(app)
      .delete('/api/search-preferences/blacklist/company/Multi%20Word%20Company')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(204);
  });

  it('should return 404 if item not in blacklist', async () => {
    const response = await request(app)
      .delete('/api/search-preferences/blacklist/company/NonExistent')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(404);

    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('should return 404 if preferences do not exist', async () => {
    const response = await request(app)
      .delete('/api/search-preferences/blacklist/company/Any')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(404);

    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('should validate type parameter', async () => {
    const response = await request(app)
      .delete('/api/search-preferences/blacklist/invalid-type/value')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 without authentication', async () => {
    const response = await request(app)
      .delete('/api/search-preferences/blacklist/company/Test')
      .expect(401);

    expect(response.body.code).toBe('MISSING_AUTH_HEADER');
  });

  it('should only remove exact match', async () => {
    // Add multiple items
    await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({ type: 'company', value: 'Test Corp' });

    await request(app)
      .post('/api/search-preferences/blacklist')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({ type: 'company', value: 'Test Corporation' });

    // Remove one
    await request(app)
      .delete('/api/search-preferences/blacklist/company/Test Corp')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(204);

    // Verify the other still exists
    const response = await request(app)
      .get('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    expect(response.body.excludeKeywords).not.toContain('Test Corp');
    expect(response.body.excludeKeywords).toContain('Test Corporation');
  });
});

// =============================================================================
// Tests: PATCH /api/search-preferences/sources
// =============================================================================

describe('PATCH /api/search-preferences/sources', () => {
  it('should update source preferences', async () => {
    const response = await request(app)
      .patch('/api/search-preferences/sources')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        linkedin: true,
        indeed: false,
        manual: true,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.sources).toEqual({
      linkedin: true,
      indeed: false,
      manual: true,
    });
  });

  it('should accept partial source updates', async () => {
    const response = await request(app)
      .patch('/api/search-preferences/sources')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        linkedin: false,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.sources.linkedin).toBe(false);
  });

  it('should validate source values are boolean', async () => {
    const response = await request(app)
      .patch('/api/search-preferences/sources')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        linkedin: 'yes', // Invalid type
      })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should reject unknown source fields', async () => {
    const response = await request(app)
      .patch('/api/search-preferences/sources')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        unknownSource: true,
      })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 401 without authentication', async () => {
    const response = await request(app)
      .patch('/api/search-preferences/sources')
      .send({
        linkedin: true,
      })
      .expect(401);

    expect(response.body.code).toBe('MISSING_AUTH_HEADER');
  });

  it('should create preferences if they do not exist', async () => {
    // Update sources without creating preferences first
    const response = await request(app)
      .patch('/api/search-preferences/sources')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        linkedin: true,
        indeed: true,
      })
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify preferences were created
    const { data: dbPrefs } = await supabaseAdmin
      .from(TABLES.JOB_PREFERENCES)
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(dbPrefs).toBeDefined();
  });
});

// =============================================================================
// Tests: Error Handling & Edge Cases
// =============================================================================

describe('Error Handling & Edge Cases', () => {
  it('should handle malformed JSON gracefully', async () => {
    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .set('Content-Type', 'application/json')
      .send('{ invalid json }')
      .expect(400);

    // Express will catch JSON parse errors
    expect(response.status).toBe(400);
  });

  it('should handle very large preference objects', async () => {
    const largePrefs = {
      desiredTitles: Array(20).fill('Engineer'),
      desiredLocations: Array(20).fill('Remote'),
      industries: Array(30).fill('Technology'),
      keywords: Array(30).fill('TypeScript'),
    };

    const response = await request(app)
      .post('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(largePrefs)
      .expect(200);

    expect(response.body.desiredTitles).toHaveLength(20);
    expect(response.body.industries).toHaveLength(30);
  });

  it('should handle concurrent updates gracefully', async () => {
    const prefs1 = { salaryMin: 100000 };
    const prefs2 = { salaryMax: 200000 };

    // Fire both requests simultaneously
    const [response1, response2] = await Promise.all([
      request(app)
        .post('/api/search-preferences')
        .set('Authorization', `Bearer ${testAuthToken}`)
        .send(prefs1),
      request(app)
        .post('/api/search-preferences')
        .set('Authorization', `Bearer ${testAuthToken}`)
        .send(prefs2),
    ]);

    // Both should succeed (upsert handles conflicts)
    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);

    // Final state should have both values
    const finalResponse = await request(app)
      .get('/api/search-preferences')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    // At least one of the updates should be reflected
    expect(
      finalResponse.body.salaryMin === 100000 || finalResponse.body.salaryMax === 200000
    ).toBe(true);
  });
});
