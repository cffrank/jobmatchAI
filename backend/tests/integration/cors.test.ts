/**
 * CORS Integration Tests
 * Critical tests to prevent CORS deployment issues
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { type Application } from 'express';
import cors from 'cors';

// Create a test app with the same CORS configuration as production
const createTestApp = (nodeEnv: string, appUrl: string): Application => {
  const app = express();

  const corsOptions = {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (nodeEnv === 'development') {
        const ALLOWED_DEV_PORTS = ['5173', '3000', '4173'];
        const portMatch = origin.match(/:(\d+)$/);

        const capturedPort = portMatch?.[1];
        if (portMatch && capturedPort && ALLOWED_DEV_PORTS.includes(capturedPort)) {
          const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
          if (isLocalhost) {
            callback(null, true);
            return;
          }
        }
      }

      const allowedOrigins = [
        appUrl,
        'https://jobmatch-ai.railway.app',
        'https://jobmatch-ai.vercel.app',
        'https://jobmatchai-production.up.railway.app',
      ];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400,
  };

  app.use(cors(corsOptions));

  // Test routes
  app.options('/api/test', (req, res) => {
    res.status(204).send();
  });

  app.post('/api/test', (req, res) => {
    res.json({ message: 'success' });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  return app;
};

describe('CORS Configuration Tests', () => {
  describe('Production CORS', () => {
    let app: Application;

    beforeAll(() => {
      app = createTestApp('production', 'https://jobmatchai-production.up.railway.app');
    });

    it('should allow OPTIONS preflight request from production frontend', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'https://jobmatchai-production.up.railway.app')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(
        'https://jobmatchai-production.up.railway.app'
      );
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    });

    it('should allow POST request from production frontend', async () => {
      const response = await request(app)
        .post('/api/test')
        .set('Origin', 'https://jobmatchai-production.up.railway.app')
        .send({ test: 'data' });

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(
        'https://jobmatchai-production.up.railway.app'
      );
    });

    it('should block requests from unauthorized origins', async () => {
      const response = await request(app)
        .post('/api/test')
        .set('Origin', 'https://malicious-site.com')
        .send({ test: 'data' });

      // CORS middleware may not block the request but won't set CORS headers
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should allow requests with no origin (mobile apps, curl)', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ test: 'data' });

      expect(response.status).toBe(200);
    });
  });

  describe('Development CORS', () => {
    let app: Application;

    beforeAll(() => {
      app = createTestApp('development', 'http://localhost:5173');
    });

    it('should allow OPTIONS from localhost:5173 (Vite dev)', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('should allow OPTIONS from localhost:3000 (backend dev)', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should allow OPTIONS from localhost:4173 (Vite preview)', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'http://localhost:4173')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:4173');
    });

    it('should block localhost on unauthorized ports', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'http://localhost:8080')
        .set('Access-Control-Request-Method', 'POST');

      // Should not set CORS headers for unauthorized port
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Critical Application Generation Endpoint', () => {
    let app: Application;

    beforeAll(() => {
      app = createTestApp('production', 'https://jobmatchai-production.up.railway.app');
    });

    it('should handle OPTIONS preflight for /api/applications/generate', async () => {
      const response = await request(app)
        .options('/api/applications/generate')
        .set('Origin', 'https://jobmatchai-production.up.railway.app')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBeTruthy();
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should expose rate limit headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://jobmatchai-production.up.railway.app');

      expect(response.headers['access-control-expose-headers']).toContain('X-RateLimit-Limit');
    });
  });

  describe('CORS Headers Validation', () => {
    let app: Application;

    beforeAll(() => {
      app = createTestApp('production', 'https://jobmatchai-production.up.railway.app');
    });

    it('should include credentials: true', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'https://jobmatchai-production.up.railway.app');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should have appropriate max-age for preflight cache', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'https://jobmatchai-production.up.railway.app');

      expect(response.headers['access-control-max-age']).toBe('86400');
    });

    it('should allow Authorization header', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'https://jobmatchai-production.up.railway.app')
        .set('Access-Control-Request-Headers', 'Authorization');

      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    });
  });
});
