import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ParseResumeRequest {
  fileUrl: string // URL to the uploaded resume file in Supabase Storage
}

interface ParsedProfile {
  firstName: string
  lastName: string
  email: string
  phone: string
  location: string
  headline: string
  summary: string
  linkedInUrl?: string
}

interface ParsedWorkExperience {
  company: string
  position: string
  location: string
  startDate: string
  endDate: string | null
  current: boolean
  description: string
  accomplishments: string[]
}

interface ParsedEducation {
  institution: string
  degree: string
  fieldOfStudy: string
  startDate: string
  endDate: string | null
  current: boolean
  grade?: string
}

interface ParsedSkill {
  name: string
  endorsements: number
}

interface ParsedResume {
  profile: ParsedProfile
  workExperience: ParsedWorkExperience[]
  education: ParsedEducation[]
  skills: ParsedSkill[]
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get user from auth header
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { fileUrl }: ParseResumeRequest = await req.json()

    if (!fileUrl) {
      return new Response(JSON.stringify({ error: 'Missing fileUrl' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Download the file from Supabase Storage
    const fileResponse = await fetch(fileUrl)
    if (!fileResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to download file' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get file content as base64
    const fileBuffer = await fileResponse.arrayBuffer()
    const base64File = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)))

    // Call OpenAI API to parse the resume
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = `
You are an expert resume parser. Extract all information from this resume and return it as structured JSON.

Please extract:
1. Personal Information (first name, last name, email, phone, location, headline/title, professional summary, LinkedIn URL if present)
2. Work Experience (for each job: company, position/title, location, start date, end date or "current", description, key accomplishments as array)
3. Education (for each: institution, degree, field of study, start date, end date or "current", GPA/grade if present)
4. Skills (extract all skills mentioned, set endorsements to 0)

Important formatting rules:
- Dates should be in YYYY-MM-DD format (use YYYY-MM-01 if only month/year given, YYYY-01-01 if only year given)
- For current positions, set "current" to true and "endDate" to null
- Extract accomplishments as separate bullet points where possible
- For phone numbers, preserve the format found in resume
- Set endorsements to 0 for all skills

Return the response as JSON with this EXACT structure:
{
  "profile": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "headline": "string (professional title/headline)",
    "summary": "string (professional summary/about section)",
    "linkedInUrl": "string or empty"
  },
  "workExperience": [
    {
      "company": "string",
      "position": "string",
      "location": "string",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null",
      "current": boolean,
      "description": "string",
      "accomplishments": ["string", "string", ...]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "fieldOfStudy": "string",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null",
      "current": boolean,
      "grade": "string or empty"
    }
  ],
  "skills": [
    {
      "name": "string",
      "endorsements": 0
    }
  ]
}
`

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume parser. Extract all information from resumes and return valid JSON only. Be thorough and accurate.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64File}`,
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4000,
      }),
    })

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text()
      console.error('OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${errorText}`)
    }

    const openAiData = await openAiResponse.json()
    const parsedResume: ParsedResume = JSON.parse(openAiData.choices[0].message.content)

    return new Response(JSON.stringify(parsedResume), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error parsing resume:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to parse resume' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
