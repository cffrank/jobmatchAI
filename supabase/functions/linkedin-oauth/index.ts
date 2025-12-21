import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action') // 'initiate' or 'callback'

  if (action === 'initiate') {
    // Step 1: Redirect to LinkedIn OAuth
    const clientId = Deno.env.get('LINKEDIN_CLIENT_ID')
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
    const supabaseUrl = Deno.env.get('SUPABASE_URL')

    if (!clientId) {
      return new Response(JSON.stringify({ error: 'LinkedIn client ID not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const redirectUri = `${supabaseUrl}/functions/v1/linkedin-oauth?action=callback`
    const state = crypto.randomUUID()

    // Store state in a cookie or session (simplified approach)
    const linkedInAuthUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')
    linkedInAuthUrl.searchParams.set('response_type', 'code')
    linkedInAuthUrl.searchParams.set('client_id', clientId)
    linkedInAuthUrl.searchParams.set('redirect_uri', redirectUri)
    linkedInAuthUrl.searchParams.set('scope', 'r_liteprofile r_emailaddress')
    linkedInAuthUrl.searchParams.set('state', state)

    return new Response(null, {
      status: 302,
      headers: {
        'Location': linkedInAuthUrl.toString(),
        'Set-Cookie': `linkedin_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
      },
    })
  } else if (action === 'callback') {
    // Step 2: Handle OAuth callback
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code) {
      return new Response('Authorization code missing', {
        status: 400,
        headers: corsHeaders,
      })
    }

    const clientId = Deno.env.get('LINKEDIN_CLIENT_ID')
    const clientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'LinkedIn credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const redirectUri = `${supabaseUrl}/functions/v1/linkedin-oauth?action=callback`

    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('LinkedIn token exchange error:', errorText)
        throw new Error('Failed to exchange code for token')
      }

      const tokenData = await tokenResponse.json()
      const accessToken = tokenData.access_token

      // Fetch LinkedIn profile
      const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch LinkedIn profile')
      }

      const profile = await profileResponse.json()

      // Fetch email
      const emailResponse = await fetch(
        'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      const emailData = await emailResponse.json()
      const email = emailData.elements?.[0]?.['handle~']?.emailAddress

      // Redirect back to app with profile data
      const appRedirectUrl = new URL(`${appUrl}/linkedin-callback`)
      appRedirectUrl.searchParams.set('firstName', profile.localizedFirstName || '')
      appRedirectUrl.searchParams.set('lastName', profile.localizedLastName || '')
      appRedirectUrl.searchParams.set('email', email || '')

      return new Response(null, {
        status: 302,
        headers: {
          'Location': appRedirectUrl.toString(),
        },
      })
    } catch (error) {
      console.error('LinkedIn OAuth error:', error)

      // Redirect to app with error
      const errorUrl = new URL(`${appUrl}/login`)
      errorUrl.searchParams.set('error', 'linkedin_auth_failed')

      return new Response(null, {
        status: 302,
        headers: {
          'Location': errorUrl.toString(),
        },
      })
    }
  }

  return new Response(JSON.stringify({ error: 'Invalid action parameter' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
