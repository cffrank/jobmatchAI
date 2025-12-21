import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface GenerateRequest {
  jobId: string
}

interface GeneratedApplication {
  resumeVariant: string
  coverLetter: string
  keySkillsHighlighted: string[]
  tailoredExperiences: string[]
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

    // Initialize Supabase client with service role for full access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
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

    const { jobId }: GenerateRequest = await req.json()

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Missing jobId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch work experience
    const { data: workExperience } = await supabaseClient
      .from('work_experience')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })

    // Fetch education
    const { data: education } = await supabaseClient
      .from('education')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })

    // Fetch skills
    const { data: skills } = await supabaseClient
      .from('skills')
      .select('*')
      .eq('user_id', user.id)

    // Call OpenAI API
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = `
You are an expert resume and cover letter writer. Generate a tailored application for the following job:

Job Title: ${job.title}
Company: ${job.company}
Description: ${job.description || 'N/A'}
Location: ${job.location || 'N/A'}

Candidate Profile:
Name: ${profile.first_name} ${profile.last_name}
Email: ${profile.email}
Phone: ${profile.phone || 'N/A'}
Location: ${profile.location || 'N/A'}
Current Title: ${profile.current_title || 'N/A'}
Professional Summary: ${profile.professional_summary || 'N/A'}

Work Experience:
${workExperience?.map(exp => `
- ${exp.title} at ${exp.company} (${exp.start_date} - ${exp.end_date || 'Present'})
  ${exp.description || ''}
`).join('\n') || 'No work experience listed'}

Education:
${education?.map(edu => `
- ${edu.degree || 'Degree'} in ${edu.field_of_study || 'Field'} from ${edu.institution} (${edu.start_date || 'N/A'} - ${edu.end_date || 'Present'})
`).join('\n') || 'No education listed'}

Skills:
${skills?.map(skill => `- ${skill.name} (${skill.proficiency_level || 'intermediate'})`).join('\n') || 'No skills listed'}

Please generate:
1. A tailored resume variant highlighting the most relevant experience and skills (formatted in markdown)
2. A compelling cover letter (3-4 paragraphs, professional tone)
3. A list of key skills to highlight (5-7 skills most relevant to this job)
4. Tailored experience bullets (3-5 bullets emphasizing achievements relevant to this role)

Return the response as JSON with the following structure:
{
  "resumeVariant": "Full resume text here in markdown format",
  "coverLetter": "Full cover letter here",
  "keySkillsHighlighted": ["skill1", "skill2", ...],
  "tailoredExperiences": ["bullet1", "bullet2", ...]
}
`

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume and cover letter writer. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text()
      console.error('OpenAI error:', errorText)
      throw new Error(`OpenAI API error: ${openAiResponse.status}`)
    }

    const openAiData = await openAiResponse.json()
    const generatedContent = openAiData.choices[0]?.message?.content

    if (!generatedContent) {
      throw new Error('No content generated from OpenAI')
    }

    // Parse the JSON response
    const result: GeneratedApplication = JSON.parse(generatedContent)

    // Save the generated application
    const { data: savedApp, error: saveError } = await supabaseClient
      .from('applications')
      .insert({
        user_id: user.id,
        job_id: jobId,
        custom_resume: result.resumeVariant,
        cover_letter: result.coverLetter,
        status: 'draft',
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save application:', saveError)
      throw new Error('Failed to save generated application')
    }

    return new Response(
      JSON.stringify({
        ...result,
        applicationId: savedApp.id,
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
    console.error('AI generation error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate application' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
