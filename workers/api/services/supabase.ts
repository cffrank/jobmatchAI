/**
 * Supabase Service for Cloudflare Workers
 *
 * Creates Supabase clients per-request since Workers are stateless.
 * Uses the service role key for admin operations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../types';

/**
 * Create a Supabase admin client with service role privileges
 * This bypasses RLS - use with caution
 */
export function createSupabaseAdmin(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Create a Supabase client with anon key
 * Respects RLS policies
 */
export function createSupabaseClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Create a Supabase client authenticated with a user's JWT
 */
export function createSupabaseUserClient(env: Env, jwt: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
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
 */
export async function verifyToken(env: Env, jwt: string) {
  const supabase = createSupabaseClient(env);
  const { data: { user }, error } = await supabase.auth.getUser(jwt);

  if (error || !user) {
    return null;
  }

  return user;
}
