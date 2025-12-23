import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RateLimitRequest {
  operation: 'ai_generation' | 'job_search' | 'email_send'
}

interface RateLimitResponse {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { operation }: RateLimitRequest = await req.json()

    // Get usage limits for user
    const { data: limits, error: limitsError } = await supabase
      .from('usage_limits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (limitsError) {
      // If no limits exist, create default limits
      if (limitsError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('usage_limits')
          .insert({
            user_id: user.id,
            ai_generations_limit: 10,
            job_searches_limit: 50,
            emails_sent_limit: 20,
          })

        if (insertError) {
          console.error('Failed to create usage limits:', insertError)
          return new Response(JSON.stringify({ error: 'Failed to initialize usage limits' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Refetch limits
        const { data: newLimits, error: refetchError } = await supabase
          .from('usage_limits')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (refetchError || !newLimits) {
          throw refetchError
        }

        return checkAndIncrementLimit(supabase, user.id, newLimits, operation, corsHeaders)
      }

      return new Response(JSON.stringify({ error: 'Failed to fetch limits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if we need to reset the period
    const now = new Date()
    const periodEnd = new Date(limits.period_end)

    if (now > periodEnd) {
      // Reset usage counters
      const { error: resetError } = await supabase
        .from('usage_limits')
        .update({
          ai_generations_used: 0,
          job_searches_used: 0,
          emails_sent_used: 0,
          period_start: now.toISOString(),
          period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
        })
        .eq('user_id', user.id)

      if (resetError) throw resetError

      // Refetch limits
      const { data: newLimits } = await supabase
        .from('usage_limits')
        .select('*')
        .eq('user_id', user.id)
        .single()

      return checkAndIncrementLimit(supabase, user.id, newLimits, operation, corsHeaders)
    }

    return checkAndIncrementLimit(supabase, user.id, limits, operation, corsHeaders)
  } catch (error) {
    console.error('Rate limit error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function checkAndIncrementLimit(
  supabase: any,
  userId: string,
  limits: any,
  operation: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  let allowed = false
  let remaining = 0
  let limit = 0
  let fieldToIncrement = ''

  switch (operation) {
    case 'ai_generation':
      allowed = limits.ai_generations_used < limits.ai_generations_limit
      remaining = limits.ai_generations_limit - limits.ai_generations_used
      limit = limits.ai_generations_limit
      fieldToIncrement = 'ai_generations_used'
      break
    case 'job_search':
      allowed = limits.job_searches_used < limits.job_searches_limit
      remaining = limits.job_searches_limit - limits.job_searches_used
      limit = limits.job_searches_limit
      fieldToIncrement = 'job_searches_used'
      break
    case 'email_send':
      allowed = limits.emails_sent_used < limits.emails_sent_limit
      remaining = limits.emails_sent_limit - limits.emails_sent_used
      limit = limits.emails_sent_limit
      fieldToIncrement = 'emails_sent_used'
      break
  }

  // If allowed, increment the counter
  if (allowed) {
    const { error: updateError } = await supabase
      .from('usage_limits')
      .update({
        [fieldToIncrement]: limits[fieldToIncrement] + 1,
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Failed to update usage:', updateError)
      // Don't fail the request, but log the error
    }

    remaining -= 1 // Decrement remaining
  }

  const response: RateLimitResponse = {
    allowed,
    remaining,
    limit,
    resetAt: limits.period_end,
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
