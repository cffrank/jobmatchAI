/**
 * Supabase Client Configuration
 *
 * Initializes and exports Supabase clients:
 * - Standard client for user-authenticated operations
 * - Admin client with service role for server-side operations
 *
 * Security considerations:
 * - Service role key should NEVER be exposed to the client
 * - Use standard client for user-scoped queries when possible
 * - Admin client bypasses RLS - use with caution
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// Environment Validation
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is not set');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY environment variable is not set');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
}

// =============================================================================
// Supabase Client Instances
// =============================================================================

/**
 * Standard Supabase client using anon key
 * - Respects Row Level Security (RLS) policies
 * - Used for operations that should be scoped to the authenticated user
 * - Safe to use with user JWT tokens
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

/**
 * Admin Supabase client using service role key
 * - Bypasses Row Level Security (RLS) policies
 * - Used for server-side operations that need elevated privileges
 * - NEVER expose this client or its key to the frontend
 *
 * Use cases:
 * - Background jobs (cleanup, scheduled tasks)
 * - Admin operations (user management, bulk updates)
 * - Cross-user queries (analytics, aggregations)
 */
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a Supabase client authenticated with a specific user's JWT
 * This is useful for making requests on behalf of a user while respecting RLS
 *
 * @param jwt - The user's JWT token from the Authorization header
 * @returns Supabase client authenticated as the user
 */
export function createUserClient(jwt: string): SupabaseClient {
  // SUPABASE_URL and SUPABASE_ANON_KEY are validated at module load time
  return createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
}

/**
 * Verify a JWT token and return the user data
 * Uses the admin client to verify tokens server-side
 *
 * @param jwt - The JWT token to verify
 * @returns User object if valid, null if invalid
 */
export async function verifyToken(jwt: string) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(jwt);

  if (error || !user) {
    return null;
  }

  return user;
}

// =============================================================================
// Database Table Names (for consistency)
// =============================================================================

export const TABLES = {
  USERS: 'users',
  WORK_EXPERIENCE: 'work_experience',
  EDUCATION: 'education',
  SKILLS: 'skills',
  JOB_PREFERENCES: 'job_preferences',
  JOBS: 'jobs',
  JOB_SEARCHES: 'job_searches',
  APPLICATIONS: 'applications',
  APPLICATION_VARIANTS: 'application_variants',
  TRACKED_APPLICATIONS: 'tracked_applications',
  RESUMES: 'resumes',
  USAGE_LIMITS: 'usage_limits',
  EMAILS: 'emails',
  RATE_LIMITS: 'rate_limits',
  OAUTH_STATES: 'oauth_states',
  NOTIFICATIONS: 'notifications',
  SUBSCRIPTIONS: 'subscriptions',
  INVOICES: 'invoices',
  PAYMENT_METHODS: 'payment_methods',
} as const;

// =============================================================================
// Storage Bucket Names
// =============================================================================

export const BUCKETS = {
  EXPORTS: 'exports',
  RESUMES: 'resumes',
  AVATARS: 'avatars',
} as const;
