import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ScrapeRequest {
  keywords: string
  location: string
  sources: string[] // ['linkedin', 'indeed']
  limit?: number
}

interface ScrapedJob {
  title: string
  company: string
  location: string
  description: string
  url: string
  salary?: string
  postedDate?: string
  source: string
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const scrapeParams: ScrapeRequest = await req.json()

    if (!scrapeParams.keywords || !scrapeParams.location || !scrapeParams.sources) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: keywords, location, sources' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const apifyApiKey = Deno.env.get('APIFY_API_KEY')
    if (!apifyApiKey) {
      throw new Error('Apify API key not configured')
    }

    const allJobs: ScrapedJob[] = []
    const errors: string[] = []

    // Scrape from each source
    for (const source of scrapeParams.sources) {
      try {
        let actorId = ''
        let input = {}

        if (source === 'linkedin') {
          actorId = 'apify/linkedin-jobs-scraper'
          input = {
            keywords: scrapeParams.keywords,
            location: scrapeParams.location,
            maxResults: scrapeParams.limit || 50,
          }
        } else if (source === 'indeed') {
          actorId = 'apify/indeed-scraper'
          input = {
            queries: `${scrapeParams.keywords} ${scrapeParams.location}`,
            maxItems: scrapeParams.limit || 50,
          }
        } else {
          errors.push(`Unsupported source: ${source}`)
          continue
        }

        // Start Apify actor
        const runResponse = await fetch(
          `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          }
        )

        if (!runResponse.ok) {
          throw new Error(`Failed to start ${source} scraper`)
        }

        const runData = await runResponse.json()
        const runId = runData.data.id

        // Wait for the run to finish (with timeout)
        let attempts = 0
        const maxAttempts = 60 // 5 minutes max
        let runStatus = 'RUNNING'

        while (runStatus === 'RUNNING' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds

          const statusResponse = await fetch(
            `https://api.apify.com/v2/acts/${actorId}/runs/${runId}?token=${apifyApiKey}`
          )
          const statusData = await statusResponse.json()
          runStatus = statusData.data.status

          attempts++
        }

        if (runStatus !== 'SUCCEEDED') {
          throw new Error(`${source} scraper did not complete successfully`)
        }

        // Get results
        const resultsResponse = await fetch(
          `https://api.apify.com/v2/acts/${actorId}/runs/${runId}/dataset/items?token=${apifyApiKey}`
        )
        const results = await resultsResponse.json()

        // Normalize results
        const normalizedJobs = results.map((item: any) => ({
          title: item.title || item.positionName || 'Unknown Title',
          company: item.company || item.companyName || 'Unknown Company',
          location: item.location || item.jobLocation || 'Unknown Location',
          description: item.description || item.descriptionText || '',
          url: item.url || item.link || '',
          salary: item.salary || null,
          postedDate: item.postedAt || item.postedDate || null,
          source,
        }))

        allJobs.push(...normalizedJobs)
      } catch (error) {
        console.error(`Error scraping from ${source}:`, error)
        errors.push(`Failed to scrape from ${source}: ${error.message}`)
      }
    }

    // Save jobs to database
    const searchId = crypto.randomUUID()

    if (allJobs.length > 0) {
      const jobInserts = allJobs.map(job => ({
        user_id: user.id,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        url: job.url,
        source: job.source,
        added_at: new Date().toISOString(),
      }))

      const { error: insertError } = await supabase.from('jobs').insert(jobInserts)

      if (insertError) {
        console.error('Failed to save jobs:', insertError)
        throw new Error('Failed to save scraped jobs')
      }
    }

    return new Response(
      JSON.stringify({
        searchId,
        jobCount: allJobs.length,
        jobs: allJobs,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Job scraping error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to scrape jobs' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
