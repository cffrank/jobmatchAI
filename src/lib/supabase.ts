/**
 * Supabase Client Initialization
 *
 * MIGRATION NOTE: This client is being phased out in favor of Cloudflare Workers API.
 * Auth will be handled by Workers (JWT tokens), not Supabase Auth.
 * Database queries will go through Workers API, not direct Supabase.
 * Storage will use R2 via Workers, not Supabase Storage.
 *
 * This file is kept for backward compatibility during migration.
 * Once migration is complete, this will be removed.
 *
 * Environment variables required:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous/public key
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { SUPABASE_URL, SUPABASE_ANON_KEY, FEATURES } from './config'

// Validate environment variables (only if Workers API is not enabled)
if (!FEATURES.USE_WORKERS_API && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.error(
    '❌ Missing Supabase environment variables!\n' +
    'Required variables:\n' +
    '- VITE_SUPABASE_URL\n' +
    '- VITE_SUPABASE_ANON_KEY\n\n' +
    'Or enable Workers API with VITE_USE_WORKERS_API=true'
  )
}

/**
 * Supabase client instance
 *
 * DEPRECATED: Use workersApi from './workersApi' instead.
 *
 * This client is configured for minimal usage:
 * - Auth is DISABLED (handled by Workers)
 * - Session persistence is DISABLED (Workers manages sessions)
 * - Only used for legacy read operations during migration
 *
 * @deprecated Use workersApi for new code
 */
export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
  auth: {
    // Auth is handled by Workers, not Supabase
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    // Use same storage key for compatibility
    storageKey: 'jobmatch-auth-token',
  },
  // Global settings
  global: {
    headers: {
      'x-client-info': 'jobmatch-ai-web-legacy',
    },
  },
  // Disable realtime (Workers handles this)
  realtime: {
    heartbeatIntervalMs: 30000,
    reconnectAfterMs: (tries: number) => {
      return Math.min(1000 * Math.pow(2, tries), 30000)
    },
  },
  }
)

/**
 * Helper function to handle Supabase errors consistently
 *
 * @param error - Supabase error object
 * @param context - Context description for logging
 * @throws Error with user-friendly message
 */
export function handleSupabaseError(error: unknown, context: string): never {
  console.error(`[Supabase Error] ${context}:`, error)

  if (error && typeof error === 'object' && 'message' in error) {
    throw new Error(`${context}: ${error.message}`)
  }

  throw new Error(`${context}: An unknown error occurred`)
}

/**
 * Type-safe query helper with automatic error handling
 *
 * @param queryFn - Function that returns a Supabase query
 * @param errorContext - Context for error messages
 * @returns Query result data
 * @throws Error if query fails
 *
 * @example
 * ```ts
 * const jobs = await executeQuery(
 *   () => supabase.from('jobs').select('*').eq('user_id', userId),
 *   'Failed to fetch jobs'
 * )
 * ```
 */
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: unknown }>,
  errorContext: string
): Promise<T> {
  const { data, error } = await queryFn()

  if (error) {
    handleSupabaseError(error, errorContext)
  }

  if (!data) {
    throw new Error(`${errorContext}: No data returned`)
  }

  return data
}
