/**
 * Test Setup File
 * Runs before all tests to configure the testing environment
 */

import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables from .env.test if it exists, otherwise use .env
dotenv.config({ path: '.env.test' });
dotenv.config();

// Ensure required environment variables are set for tests
beforeAll(() => {
  // Set test-specific environment variables
  process.env.NODE_ENV = 'test';

  // Verify critical environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.warn(`Warning: Missing test environment variables: ${missing.join(', ')}`);
    console.warn('Some tests may fail. Create a .env.test file with test credentials.');
  }

  // Mock external services in test environment
  if (!process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = 'test-key-mock';
  }
  if (!process.env.APIFY_API_TOKEN) {
    process.env.APIFY_API_TOKEN = 'test-apify-token-mock';
  }
  if (!process.env.SENDGRID_API_KEY) {
    process.env.SENDGRID_API_KEY = 'test-sendgrid-key-mock';
  }

  console.log('Test environment configured');
});

afterAll(() => {
  console.log('Test suite completed');
});
