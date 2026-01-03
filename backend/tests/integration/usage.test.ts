/**
 * Integration tests for Usage Metrics API
 *
 * Tests the /api/usage/metrics endpoint
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

// Mock authentication token (in real tests, you'd need a valid Supabase JWT)
const MOCK_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

describe('Usage Metrics API', () => {
  describe('GET /api/usage/metrics', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/usage/metrics')
        .expect(401);

      // Auth middleware returns 'code' field
      expect(response.body).toHaveProperty('code');
      expect(response.body.code).toBe('MISSING_AUTH_HEADER');
    });

    it('should return usage metrics with valid auth token', async () => {
      if (!MOCK_AUTH_TOKEN) {
        console.warn('Skipping authenticated test - TEST_AUTH_TOKEN not set');
        return;
      }

      const response = await request(app)
        .get('/api/usage/metrics')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('applicationsTracked');
      expect(response.body.metrics).toHaveProperty('resumeVariantsCreated');
      expect(response.body.metrics).toHaveProperty('jobSearchesPerformed');
      expect(response.body.metrics).toHaveProperty('emailsSent');

      // All values should be numbers
      expect(typeof response.body.metrics.applicationsTracked).toBe('number');
      expect(typeof response.body.metrics.resumeVariantsCreated).toBe('number');
      expect(typeof response.body.metrics.jobSearchesPerformed).toBe('number');
      expect(typeof response.body.metrics.emailsSent).toBe('number');
    });
  });
});
