/**
 * Health Check Integration Tests
 * Tests the /health endpoint that Railway uses for deployment verification
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Server } from 'http';
import app from '../../src/index';

describe('Health Check Endpoint', () => {
  let server: Server;

  beforeAll(() => {
    // Start server on a test port
    server = app.listen(0); // Port 0 = random available port
  });

  afterAll(() => {
    server.close();
  });

  it('should return 200 OK', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
  });

  it('should return JSON with status "healthy"', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toMatchObject({
      status: 'healthy',
    });
  });

  it('should include timestamp', async () => {
    const response = await request(app).get('/health');

    expect(response.body.timestamp).toBeDefined();
    expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('should include version', async () => {
    const response = await request(app).get('/health');

    expect(response.body.version).toBeDefined();
    expect(typeof response.body.version).toBe('string');
  });

  it('should include environment', async () => {
    const response = await request(app).get('/health');

    expect(response.body.environment).toBeDefined();
    expect(['development', 'production', 'test']).toContain(response.body.environment);
  });

  it('should respond quickly (< 1 second)', async () => {
    const start = Date.now();
    await request(app).get('/health');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000);
  });

  it('should not require authentication', async () => {
    const response = await request(app).get('/health');

    // Should succeed without Authorization header
    expect(response.status).toBe(200);
  });

  it('should handle CORS for health checks', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://jobmatch-ai-prod.pages.dev');

    expect(response.headers['access-control-allow-origin']).toBeTruthy();
  });
});
