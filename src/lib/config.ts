/**
 * Application Configuration
 *
 * Centralized configuration for environment-specific values.
 * Supports both local development and production deployments.
 */

/**
 * API URL for backend Workers
 * - Development: http://localhost:8787 (Wrangler dev)
 * - Production: https://jobmatch-ai-prod.workers.dev (or custom domain)
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

/**
 * Indicates if running on Cloudflare Pages
 * Used to enable Cloudflare-specific optimizations
 */
export const CLOUDFLARE_PAGES = import.meta.env.VITE_CLOUDFLARE_PAGES === 'true';

/**
 * Supabase configuration
 * Still used for auth and some legacy features during migration
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Environment name
 */
export const ENVIRONMENT = import.meta.env.MODE || 'development';

/**
 * Feature flags
 */
export const FEATURES = {
  // Use Workers API instead of direct Supabase queries
  USE_WORKERS_API: import.meta.env.VITE_USE_WORKERS_API === 'true' || true,
  // Enable debug logging
  DEBUG: import.meta.env.MODE === 'development',
};

/**
 * Log configuration on app startup (development only)
 */
if (ENVIRONMENT === 'development') {
  console.log('[Config] Application configuration:', {
    API_URL,
    CLOUDFLARE_PAGES,
    SUPABASE_URL,
    ENVIRONMENT,
    FEATURES,
  });
}
