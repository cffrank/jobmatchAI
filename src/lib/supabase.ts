/**
 * Supabase Client Initialization
 *
 * This module initializes the Supabase client with proper TypeScript types
 * and environment variable validation.
 *
 * Environment variables required:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous/public key
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Missing Supabase environment variables!\n' +
    'Required variables:\n' +
    '- VITE_SUPABASE_URL\n' +
    '- VITE_SUPABASE_ANON_KEY\n\n' +
    'App will not function correctly until these are set.'
  )
  // Use dummy values to prevent import-time crashes
  // The app will show error states when actually trying to use Supabase
}

/**
 * Supabase client instance
 *
 * Features:
 * - Full TypeScript type safety via Database type
 * - Automatic JWT token refresh
 * - Row Level Security (RLS) enforcement
 * - Real-time subscriptions support
 *
 * @example
 * ```ts
 * // Query with type safety
 * const { data, error } = await supabase
 *   .from('jobs')
 *   .select('*')
 *   .eq('user_id', userId)
 * ```
 */
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
  auth: {
    // Auto-refresh session before it expires
    autoRefreshToken: true,
    // Persist session in localStorage
    persistSession: true,
    // Detect session from URL after OAuth redirect
    detectSessionInUrl: true,
    // Storage key for session data
    storageKey: 'jobmatch-auth-token',
    // SEC-002: PKCE flow for enhanced OAuth security
    // PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks
    flowType: 'pkce',
    // Note: storage defaults to localStorage - no override needed
  },
  // Global settings
  global: {
    headers: {
      'x-client-info': 'jobmatch-ai-web',
    },
  },
  // Real-time settings
  realtime: {
    // Heartbeat interval in ms
    heartbeatIntervalMs: 30000,
    // Reconnect after network failure
    reconnectAfterMs: (tries) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
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
