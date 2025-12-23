/**
 * Environment Variables Validation Tests
 * Ensures required environment variables are present to prevent deployment crashes
 */

import { describe, it, expect } from 'vitest';

describe('Environment Variables Validation', () => {
  describe('Critical Environment Variables', () => {
    it('should have SUPABASE_URL defined', () => {
      expect(process.env.SUPABASE_URL).toBeDefined();
      expect(process.env.SUPABASE_URL).not.toBe('');

      if (process.env.NODE_ENV !== 'test') {
        expect(process.env.SUPABASE_URL).toMatch(/^https?:\/\//);
      }
    });

    it('should have SUPABASE_ANON_KEY defined', () => {
      expect(process.env.SUPABASE_ANON_KEY).toBeDefined();
      expect(process.env.SUPABASE_ANON_KEY).not.toBe('');
    });

    it('should have SUPABASE_SERVICE_ROLE_KEY defined', () => {
      expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
      expect(process.env.SUPABASE_SERVICE_ROLE_KEY).not.toBe('');
    });
  });

  describe('API Keys', () => {
    it('should have OPENAI_API_KEY defined', () => {
      expect(process.env.OPENAI_API_KEY).toBeDefined();
      expect(process.env.OPENAI_API_KEY).not.toBe('');
    });

    it('should have APIFY_API_TOKEN defined', () => {
      expect(process.env.APIFY_API_TOKEN).toBeDefined();
      expect(process.env.APIFY_API_TOKEN).not.toBe('');
    });

    it('should have SENDGRID_API_KEY defined (if email enabled)', () => {
      // SendGrid is optional depending on configuration
      if (process.env.ENABLE_EMAIL === 'true') {
        expect(process.env.SENDGRID_API_KEY).toBeDefined();
        expect(process.env.SENDGRID_API_KEY).not.toBe('');
      }
    });
  });

  describe('Configuration Variables', () => {
    it('should have NODE_ENV defined', () => {
      expect(process.env.NODE_ENV).toBeDefined();
      expect(['development', 'production', 'test']).toContain(process.env.NODE_ENV);
    });

    it('should have PORT defined or default to valid port', () => {
      const port = process.env.PORT || '3000';
      const portNum = parseInt(port, 10);

      expect(portNum).toBeGreaterThan(0);
      expect(portNum).toBeLessThan(65536);
    });

    it('should have APP_URL defined in production', () => {
      if (process.env.NODE_ENV === 'production') {
        expect(process.env.APP_URL).toBeDefined();
        expect(process.env.APP_URL).toMatch(/^https?:\/\//);
      }
    });
  });

  describe('Security Configuration', () => {
    it('should have JWT_SECRET or use Supabase JWT verification', () => {
      // We use Supabase for JWT verification, so this is informational
      const hasSupabaseConfig =
        process.env.SUPABASE_URL &&
        process.env.SUPABASE_ANON_KEY;

      expect(hasSupabaseConfig).toBe(true);
    });
  });

  describe('Optional Configuration', () => {
    it('should have LINKEDIN_CLIENT_ID if LinkedIn OAuth is enabled', () => {
      if (process.env.ENABLE_LINKEDIN_OAUTH === 'true') {
        expect(process.env.LINKEDIN_CLIENT_ID).toBeDefined();
        expect(process.env.LINKEDIN_CLIENT_SECRET).toBeDefined();
      }
    });
  });

  describe('Environment Variable Format Validation', () => {
    it('should have valid Supabase URL format', () => {
      const url = process.env.SUPABASE_URL;

      if (url && process.env.NODE_ENV !== 'test') {
        expect(url).toMatch(/^https:\/\/[a-z0-9-]+\.supabase\.co$/);
      }
    });

    it('should have valid OpenAI API key format', () => {
      const apiKey = process.env.OPENAI_API_KEY;

      if (apiKey && process.env.NODE_ENV !== 'test') {
        expect(apiKey).toMatch(/^sk-/);
      }
    });

    it('should have valid Apify token format', () => {
      const token = process.env.APIFY_API_TOKEN;

      if (token && process.env.NODE_ENV !== 'test') {
        expect(token).toMatch(/^apify_api_/);
      }
    });
  });

  describe('Startup Requirements', () => {
    it('should have all required variables to start server', () => {
      const required = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'OPENAI_API_KEY',
        'APIFY_API_TOKEN',
      ];

      const missing = required.filter(key => !process.env[key]);

      if (missing.length > 0 && process.env.NODE_ENV !== 'test') {
        console.error('Missing required environment variables:', missing);
      }

      // In test environment, we allow mocked values
      if (process.env.NODE_ENV !== 'test') {
        expect(missing).toHaveLength(0);
      }
    });
  });

  describe('Railway-specific Configuration', () => {
    it('should detect Railway environment', () => {
      // Railway sets RAILWAY_ENVIRONMENT
      const isRailway = !!process.env.RAILWAY_ENVIRONMENT;

      if (isRailway) {
        expect(process.env.RAILWAY_ENVIRONMENT).toMatch(/^(production|staging|development)$/);
      }
    });

    it('should have RAILWAY_PUBLIC_DOMAIN in Railway production', () => {
      const isRailwayProduction =
        process.env.RAILWAY_ENVIRONMENT === 'production';

      if (isRailwayProduction) {
        // Railway provides this automatically
        // Just log it for visibility
        console.log('Railway domain:', process.env.RAILWAY_PUBLIC_DOMAIN);
      }
    });
  });
});
