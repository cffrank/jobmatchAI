/**
 * Supabase Edge Function: cleanup-expired-jobs
 *
 * Periodically cleans up expired unsaved jobs (older than 48 hours).
 * This function should be called via a cron job (e.g., every hour).
 *
 * Endpoint: POST /cleanup-expired-jobs
 * Auth: Requires service role key or scheduled function invocation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!authHeader && !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log('Starting cleanup of expired jobs...')

    // Call the database function to cleanup expired jobs
    const { data, error } = await supabase.rpc('cleanup_expired_jobs')

    if (error) {
      console.error('Error cleaning up expired jobs:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          details: error.details || 'Unknown error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const deletedCount = data?.[0]?.deleted_count ?? 0

    console.log(`Successfully cleaned up ${deletedCount} expired jobs`)

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        timestamp: new Date().toISOString(),
        message: `Cleaned up ${deletedCount} expired job(s)`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Unexpected error in cleanup function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
