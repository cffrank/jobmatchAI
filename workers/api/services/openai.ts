/**
 * OpenAI Service for Cloudflare Workers
 *
 * Handles AI-powered generation of:
 * - Resume variants (Impact-Focused, Keyword-Optimized, Concise)
 * - Cover letters tailored to specific jobs
 * - AI rationale explaining the optimization choices
 * - Resume parsing
 */

import OpenAI from 'openai';
import { extractText } from 'unpdf';
import type { Env, Job, UserProfile, WorkExperience, Education, Skill, ApplicationVariant, ResumeContent, ParsedResume, JobCompatibilityAnalysis } from '../types';
import { createSupabaseAdmin } from './supabase';
import { analyzeJobCompatibilityWithWorkersAI } from './workersAI';

// =============================================================================
// Configuration
// =============================================================================

export const MODELS = {
  APPLICATION_GENERATION: 'gpt-4o-mini',
  MATCH_ANALYSIS: 'gpt-4o-mini',
  RESUME_PARSING: 'gpt-4o', // Vision model for resume parsing (images + PDFs)
} as const;

export const GENERATION_CONFIG = {
  TEMPERATURE: 0.7,
  MAX_TOKENS: 3000,
} as const;

/**
 * Feature flags for AI model selection
 */
export const AI_FEATURE_FLAGS = {
  /**
   * Use Cloudflare Workers AI for job compatibility analysis
   * - Primary: Workers AI (Llama 3.1 8B) - 95% cost savings
   * - Fallback: OpenAI GPT-4o-mini if Workers AI fails or low quality
   *
   * Set to false to use OpenAI only (useful for A/B testing or rollback)
   */
  USE_WORKERS_AI_FOR_COMPATIBILITY: true,
} as const;

export const GENERATION_STRATEGIES = [
  {
    id: 'variant-impact',
    name: 'Impact-Focused',
    prompt: 'Focus on metrics and business impact',
  },
  {
    id: 'variant-keyword',
    name: 'Keyword-Optimized',
    prompt: 'Maximize ATS keyword matches',
  },
  {
    id: 'variant-concise',
    name: 'Concise',
    prompt: 'Streamlined one-page version',
  },
] as const;

// =============================================================================
// OpenAI Client Factory
// =============================================================================

/**
 * Create an OpenAI client with optional AI Gateway routing
 *
 * If CLOUDFLARE_ACCOUNT_ID and AI_GATEWAY_SLUG are configured, all requests
 * will be routed through Cloudflare AI Gateway for automatic caching and
 * cost reduction (60-80% savings via response deduplication).
 *
 * Falls back to direct OpenAI API if AI Gateway is not configured.
 *
 * @param env - Environment bindings with API keys and configuration
 * @returns OpenAI client instance
 */
export function createOpenAI(env: Env): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  // Check if AI Gateway is configured
  const useAIGateway = env.CLOUDFLARE_ACCOUNT_ID && env.AI_GATEWAY_SLUG;

  if (useAIGateway) {
    // Route through Cloudflare AI Gateway for caching and analytics
    const gatewayBaseURL = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_SLUG}/openai`;

    console.log(`[OpenAI] Using Cloudflare AI Gateway: ${env.AI_GATEWAY_SLUG}`);

    // Build OpenAI client configuration
    const config: ConstructorParameters<typeof OpenAI>[0] = {
      apiKey: env.OPENAI_API_KEY,
      baseURL: gatewayBaseURL,
    };

    // Add authentication token if configured
    if (env.CF_AIG_TOKEN) {
      console.log('[OpenAI] Using AI Gateway authentication token');
      config.defaultHeaders = {
        'cf-aig-authorization': `Bearer ${env.CF_AIG_TOKEN}`,
      };
    }

    return new OpenAI(config);
  }

  // Fallback to direct OpenAI API
  console.log('[OpenAI] Using direct OpenAI API (AI Gateway not configured)');

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
}

export function isOpenAIConfigured(env: Env): boolean {
  return !!env.OPENAI_API_KEY;
}

/**
 * Check if AI Gateway is configured and available
 */
export function isAIGatewayConfigured(env: Env): boolean {
  return !!(env.CLOUDFLARE_ACCOUNT_ID && env.AI_GATEWAY_SLUG);
}

// =============================================================================
// Types
// =============================================================================

interface GenerationContext {
  job: Job;
  profile: UserProfile;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
}

interface GeneratedApplication {
  resume: ResumeContent;
  coverLetter: string;
  aiRationale: string[];
}

// =============================================================================
// Main Generation Function
// =============================================================================

/**
 * Generate all application variants for a job
 */
export async function generateApplicationVariants(
  env: Env,
  context: GenerationContext
): Promise<ApplicationVariant[]> {
  const { job, profile, workExperience, education, skills } = context;

  // Generate all variants in parallel
  const variantPromises = GENERATION_STRATEGIES.map((strategy) =>
    generateVariant(env, job, profile, workExperience, education, skills, strategy)
  );

  const results = await Promise.allSettled(variantPromises);

  // Collect successful results and fallbacks for failures
  const variants: ApplicationVariant[] = [];

  results.forEach((result, index) => {
    const strategy = GENERATION_STRATEGIES[index];
    if (!strategy) return;

    if (result.status === 'fulfilled') {
      variants.push({
        id: strategy.id,
        name: strategy.name,
        ...result.value,
      });
    } else {
      console.error(`Variant generation failed for ${strategy.name}:`, result.reason);
      variants.push({
        id: strategy.id,
        name: strategy.name,
        ...getFallbackVariant(job, profile, workExperience, education, skills, strategy),
      });
    }
  });

  return variants;
}

// =============================================================================
// Single Variant Generation
// =============================================================================

async function generateVariant(
  env: Env,
  job: Job,
  profile: UserProfile,
  workExp: WorkExperience[],
  edu: Education[],
  skills: Skill[],
  strategy: (typeof GENERATION_STRATEGIES)[number]
): Promise<GeneratedApplication> {
  const openai = createOpenAI(env);

  const skillsList = job.requiredSkills?.join(', ') || 'various skills';
  const skillNames = skills.map((s) => s.name).join(', ');

  const experienceWithDetails = workExp.map((exp) => ({
    position: exp.position,
    company: exp.company,
    location: exp.location || 'Location not specified',
    duration: `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate || 'Present'}`,
    achievements:
      exp.accomplishments.length > 0 ? exp.accomplishments : ['No specific achievements listed'],
  }));

  const systemPrompt = buildSystemPrompt(strategy.prompt);
  const userPrompt = buildUserPrompt(
    job,
    profile,
    experienceWithDetails,
    edu,
    skillsList,
    skillNames
  );

  const completion = await openai.chat.completions.create({
    model: MODELS.APPLICATION_GENERATION,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: GENERATION_CONFIG.TEMPERATURE,
    max_tokens: GENERATION_CONFIG.MAX_TOKENS,
    response_format: { type: 'json_object' },
  });

  // Log AI Gateway cache status (if available)
  logAIGatewayCacheStatus(completion, 'application-generation', strategy.name);

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  return JSON.parse(content) as GeneratedApplication;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Log AI Gateway cache status from OpenAI response headers
 *
 * Cloudflare AI Gateway adds a 'cf-aig-cache-status' header to responses:
 * - HIT: Response served from cache (cost savings!)
 * - MISS: Response generated fresh (will be cached for future requests)
 *
 * @param completion - OpenAI completion response
 * @param operation - Operation name for logging (e.g., 'application-generation', 'resume-parsing')
 * @param details - Additional details for logging (e.g., variant name)
 */
function logAIGatewayCacheStatus(
  completion: unknown,
  operation: string,
  details?: string
): void {
  try {
    // Access response headers if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headers = (completion as any)?.response?.headers;
    const cacheStatus = headers?.get?.('cf-aig-cache-status');

    if (cacheStatus) {
      const detailsStr = details ? ` (${details})` : '';
      if (cacheStatus === 'HIT') {
        console.log(`[AI Gateway] ✓ Cache HIT for ${operation}${detailsStr} - Cost savings!`);
      } else if (cacheStatus === 'MISS') {
        console.log(`[AI Gateway] ✗ Cache MISS for ${operation}${detailsStr} - Response will be cached`);
      } else {
        console.log(`[AI Gateway] Cache status for ${operation}${detailsStr}: ${cacheStatus}`);
      }
    }
  } catch {
    // Silently ignore if headers are not accessible (direct OpenAI API)
    // This is expected when AI Gateway is not configured
  }
}

/**
 * Format user address into a single string for resume
 */
function formatAddress(profile: UserProfile): string {
  const parts: string[] = [];

  if (profile.streetAddress) parts.push(profile.streetAddress);
  if (profile.city) parts.push(profile.city);
  if (profile.state) parts.push(profile.state);
  if (profile.postalCode) parts.push(profile.postalCode);
  if (profile.country) parts.push(profile.country);

  return parts.length > 0 ? parts.join(', ') : 'Not specified';
}

// =============================================================================
// Prompt Builders
// =============================================================================

function buildSystemPrompt(strategyPrompt: string): string {
  return `You are an expert resume writer specializing in ATS-optimized applications. ${strategyPrompt}.

KEYWORD EXTRACTION & ATS OPTIMIZATION:
CRITICAL: First, analyze the job description to extract:
- Technical skills and tools mentioned (e.g., Python, AWS, React, SQL)
- Industry-specific terminology and buzzwords
- Required qualifications and certifications
- Action verbs and power words used in the job posting
- Soft skills mentioned (e.g., leadership, communication, problem-solving)

Then, naturally incorporate these keywords throughout the resume and cover letter to maximize ATS compatibility.
DO NOT list keywords separately - weave them into achievements and descriptions.

⚠️ CRITICAL ACCURACY REQUIREMENT ⚠️
NEVER fabricate or estimate metrics, numbers, achievements, or facts.
ONLY use information explicitly provided in the candidate's profile data.
If no metrics exist for an achievement, DO NOT add them.
Honest, accurate content is MORE IMPORTANT than impressive-sounding metrics.

EXAMPLES OF EXCELLENT RESUME BULLETS:

If source data has metrics:
"Managed kitchen operations" → "Led team of 12 kitchen staff, reducing food waste by 25% through inventory optimization"

If source data has NO metrics:
"Managed kitchen operations" → "Led kitchen staff in daily operations, menu planning, and quality control"

KEY PRINCIPLES FOR RESUME BULLETS:
- Start with powerful action verbs (Led, Managed, Developed, Increased, Reduced)
- Include metrics ONLY if they exist in the source data - NEVER fabricate
- Show clear impact using the candidate's actual achievements
- Naturally incorporate keywords from the job description
- Length: 50-150 characters per bullet

PROFESSIONAL SUMMARY REQUIREMENTS:
- Length: 100-300 characters
- Mention total years of experience (calculate from work history dates)
- Include 2-3 most relevant skills/keywords from job description
- Highlight 1-2 key achievements ONLY if they exist in source data with metrics
- Use industry terminology from the job posting
- DO NOT fabricate achievement numbers

COVER LETTER REQUIREMENTS:
- Length: 500-1500 characters
- Mention company name at least twice
- Reference specific job title in opening paragraph
- Include 2-3 concrete achievements from the candidate's actual work history
- Use metrics ONLY if they exist in the source data - DO NOT fabricate
- Mirror language and keywords from job description

Return JSON with this EXACT structure:
{
  "resume": {
    "summary": "Brief professional summary string (100-300 chars with metrics and job-specific keywords)",
    "experience": [
      {
        "title": "Job title",
        "company": "Company name",
        "location": "City, State",
        "startDate": "YYYY-MM",
        "endDate": "YYYY-MM or Present",
        "bullets": ["Achievement with metrics and keywords", "Another achievement with numbers and relevant terms", "Third achievement showing impact with job-specific language"]
      }
    ],
    "skills": ["Skill 1 from job posting", "Skill 2 from job posting", "Skill 3 from job posting"],
    "education": [
      {
        "degree": "Degree name in Field",
        "school": "School name",
        "location": "City, State",
        "graduation": "YYYY-MM"
      }
    ]
  },
  "coverLetter": "Multi-paragraph cover letter text with \\n\\n separating paragraphs. Use keywords and terminology from the job description.",
  "aiRationale": ["Extracted keyword X from job description and incorporated into summary/experience", "Matched achievement Y to job requirement Z using specific terminology from posting"]
}`;
}

interface ExperienceDetail {
  position: string;
  company: string;
  location: string;
  duration: string;
  achievements: string[];
}

function buildUserPrompt(
  job: Job,
  profile: UserProfile,
  experienceDetails: ExperienceDetail[],
  edu: Education[],
  skillsList: string,
  skillNames: string
): string {
  const salaryRange =
    job.salaryMin && job.salaryMax
      ? `Salary Range: $${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`
      : '';

  const experienceSection = experienceDetails
    .map(
      (exp, i) => `
${i + 1}. ${exp.position} at ${exp.company}
   ${exp.duration} | ${exp.location}
   Current achievements listed:
${exp.achievements.map((a) => `   - ${a}`).join('\n')}
`
    )
    .join('\n');

  const educationSection = edu
    .map(
      (e) =>
        `- ${e.degree} in ${e.field} from ${e.school}${e.graduationYear ? ` (${e.graduationYear})` : ''}`
    )
    .join('\n');

  return `JOB POSTING DETAILS:

Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'Not specified'}
Work Arrangement: ${job.workArrangement || 'Not specified'}
${salaryRange}

FULL JOB DESCRIPTION:
${job.description || 'No detailed description provided.'}

REQUIRED SKILLS: ${skillsList}

---

CANDIDATE PROFILE:

Name: ${profile.firstName || ''} ${profile.lastName || ''}
Location: ${profile.location || 'Not specified'}
Address: ${formatAddress(profile)}
Phone: ${profile.phone || 'Not provided'}
Email: ${profile.email || 'Not provided'}

${profile.summary ? `CURRENT PROFESSIONAL SUMMARY:\n${profile.summary}\n` : ''}

WORK EXPERIENCE:
${experienceSection}

EDUCATION:
${educationSection}

SKILLS:
${skillNames}

---

TASK:
1. ANALYZE the job description above to identify:
   - Key technical skills, tools, and technologies mentioned
   - Industry-specific terminology and buzzwords
   - Required qualifications, certifications, and experience levels
   - Action verbs and power words used in the posting
   - Core competencies and soft skills emphasized

2. CREATE a tailored resume and cover letter that:
   - Naturally incorporates keywords and terminology from the job description
   - Maximizes ATS compatibility by mirroring the job posting language
   - Highlights the candidate's most relevant experience using job-specific terminology
   - Uses ONLY the actual metrics and achievements provided in the candidate's work history
   - NEVER fabricates, estimates, or invents numbers, percentages, or achievements
   - Maintains complete accuracy and authenticity while optimizing for keyword matching

3. EXPLAIN your keyword strategy in the aiRationale field, documenting which keywords you extracted and how you incorporated them.`;
}

// =============================================================================
// Fallback Generation
// =============================================================================

function getFallbackVariant(
  job: Job,
  profile: UserProfile,
  workExp: WorkExperience[],
  edu: Education[],
  skills: Skill[],
  strategy: (typeof GENERATION_STRATEGIES)[number]
): GeneratedApplication {
  const topSkills = job.requiredSkills?.slice(0, 3).join(', ') || 'various technologies';

  return {
    resume: {
      summary: `${job.title} with expertise in ${topSkills}`,
      experience: workExp.slice(0, 3).map((e) => ({
        title: e.position,
        company: e.company,
        location: e.location || '',
        startDate: e.startDate,
        endDate: e.current ? 'Present' : e.endDate || '',
        bullets: e.accomplishments.slice(0, 3),
      })),
      skills: skills.slice(0, 10).map((s) => s.name),
      education: edu.map((e) => ({
        degree: `${e.degree} in ${e.field}`,
        school: e.school,
        location: e.location || '',
        graduation: e.endDate || '',
      })),
    },
    coverLetter: `Dear Hiring Manager,\n\nI am interested in the ${job.title} position at ${job.company}.\n\nBest regards,\n${profile.firstName || ''} ${profile.lastName || ''}`,
    aiRationale: ['Fallback generation used', `${strategy.name} strategy applied`],
  };
}

// =============================================================================
// Resume Parsing
// =============================================================================

/**
 * Extract text from PDF using unpdf library
 * Works in Cloudflare Workers, no external APIs needed
 */
async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    console.log('[extractTextFromPDF] Fetching PDF from signed URL');
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log(`[extractTextFromPDF] Fetched PDF (${Math.round(pdfBuffer.byteLength / 1024)}KB)`);

    // Use unpdf library to extract text (works in Cloudflare Workers)
    console.log('[extractTextFromPDF] Extracting text with unpdf library');
    const { text } = await extractText(new Uint8Array(pdfBuffer));

    console.log('[extractTextFromPDF] Extracted text length:', text.length);

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the PDF. The PDF may be corrupted or unreadable.');
    }

    return text.trim();
  } catch (error) {
    console.error('[extractTextFromPDF] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      error: error,
    });
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse resume file and extract structured information using AI
 *
 * - For images: Uses OpenAI GPT-4o with Vision
 * - For PDFs: Uses unpdf library to extract text, then parses with Workers AI (Llama 3.3 70B)
 *   - Completely free, no external APIs needed
 *   - Cost-effective and fully serverless
 */
export async function parseResume(env: Env, storagePath: string): Promise<ParsedResume> {
  const openai = createOpenAI(env);
  const supabase = createSupabaseAdmin(env);

  console.log(`[parseResume] Starting parse for path: ${storagePath}`);

  // Detect file type
  const ext = storagePath.toLowerCase().split('.').pop();
  const isSupported = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'].includes(ext || '');

  if (!isSupported) {
    throw new Error(
      'Unsupported file format. Please upload an image file (PNG, JPG, JPEG, GIF, WEBP) or PDF.'
    );
  }

  const isPdf = ext === 'pdf';
  if (isPdf) {
    console.log('[parseResume] PDF detected, will extract text');
  }

  // Generate signed URL for the file
  const { data: signedUrlData, error: urlError } = await supabase.storage
    .from('files')
    .createSignedUrl(storagePath, 3600);

  if (urlError || !signedUrlData) {
    console.error('[parseResume] Failed to generate signed URL:', urlError);
    throw new Error(`Failed to access resume file at ${storagePath}.`);
  }

  const fileUrl = signedUrlData.signedUrl;
  console.log(`[parseResume] Signed URL generated successfully`);

  // For PDFs, extract text using unpdf library
  let pdfText: string | null = null;
  if (isPdf) {
    console.log('[parseResume] Extracting text from PDF');
    pdfText = await extractTextFromPDF(fileUrl);
    console.log(`[parseResume] Extracted ${pdfText.length} characters from PDF`);
  }

  const prompt = `
You are an expert resume parser. Extract all information from this resume and return it as structured JSON.

Please extract:
1. Personal Information (first name, last name, email, phone, location, headline/title, professional summary, LinkedIn URL if present)
2. Work Experience (for each job: company, position/title, location, start date, end date or "current", description, key accomplishments as array)
3. Education (for each: institution, degree, field of study, start date, end date or "current", GPA/grade if present)
4. Skills (extract all skills mentioned, set endorsements to 0)

Important formatting rules:
- Dates should be in YYYY-MM-DD format (use YYYY-MM-01 if only month/year given)
- For current positions, set "current" to true and "endDate" to null
- Extract accomplishments as separate bullet points where possible
- Set endorsements to 0 for all skills

Return the response as JSON with this EXACT structure:
{
  "profile": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "headline": "string",
    "summary": "string",
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
      "accomplishments": ["string"]
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
`;

  let parsedData: ParsedResume;

  if (isPdf && pdfText) {
    // For PDFs, use Workers AI (Llama 3.3 70B) with extracted text
    // Using the more powerful model for resume parsing to ensure accurate extraction
    console.log('[parseResume] Using Workers AI (Llama 3.3 70B) to parse PDF text');

    const aiPrompt = `${prompt}\n\nCRITICAL: Extract COMPLETE information for each position including:
- Full job description (what they did in the role)
- ALL accomplishments, achievements, and bullet points
- Technologies, tools, and skills used
- Quantifiable results and metrics

Resume Text:
${pdfText}`;

    const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume parser. Extract ALL information from resumes including complete job descriptions and accomplishments. Return valid JSON only. Follow the exact structure provided. Do not omit any details.',
        },
        {
          role: 'user',
          content: aiPrompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 8000,
    });

    console.log('[parseResume] Workers AI response received');

    // Workers AI returns {response: string}
    const responseText = typeof response === 'object' && 'response' in response
      ? (response as { response: string }).response
      : JSON.stringify(response);

    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[parseResume] No JSON found in Workers AI response:', responseText);
      throw new Error('Failed to parse resume: AI did not return valid JSON');
    }

    parsedData = JSON.parse(jsonMatch[0]) as ParsedResume;
    console.log('[parseResume] Successfully parsed resume with Workers AI');

  } else {
    // For images, use OpenAI Vision API
    console.log('[parseResume] Using OpenAI Vision to parse image');

    const userMessage: OpenAI.Chat.ChatCompletionUserMessageParam = {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: fileUrl } },
      ],
    };

    const completion = await openai.chat.completions.create({
      model: MODELS.RESUME_PARSING,
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume parser. Extract all information from resumes and return valid JSON only.',
        },
        userMessage,
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000,
    });

    // Log AI Gateway cache status (if available)
    logAIGatewayCacheStatus(completion, 'resume-parsing', storagePath.split('/').pop());

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    parsedData = JSON.parse(content) as ParsedResume;
    console.log('[parseResume] Successfully parsed resume with OpenAI Vision');
  }

  return parsedData;
}

// =============================================================================
// Job Compatibility Analysis
// =============================================================================

/**
 * Analyze job-candidate compatibility using comprehensive 10-dimension framework
 *
 * HYBRID STRATEGY:
 * 1. Primary: Cloudflare Workers AI (Llama 3.1 8B) - 95% cost savings
 * 2. Fallback: OpenAI GPT-4o-mini if Workers AI fails or quality validation fails
 *
 * This function evaluates how well a candidate matches a job posting across
 * 10 weighted dimensions, providing detailed scoring, justifications, and recommendations.
 *
 * Cost comparison:
 * - Workers AI: ~$0.001-0.002 per analysis
 * - OpenAI GPT-4o-mini: ~$0.03-0.05 per analysis
 * - Estimated savings: 95-98% when Workers AI succeeds
 *
 * @param env - Environment bindings
 * @param context - Job and candidate profile data
 * @returns Comprehensive compatibility analysis with scores, strengths, gaps, and recommendation
 */
export async function analyzeJobCompatibility(
  env: Env,
  context: GenerationContext
): Promise<JobCompatibilityAnalysis> {
  const { job, profile } = context;
  const startTime = Date.now();

  console.log(`[analyzeJobCompatibility] Analyzing match for job ${job.id}, user ${profile.id}`);

  // Try Workers AI first if feature flag is enabled
  if (AI_FEATURE_FLAGS.USE_WORKERS_AI_FOR_COMPATIBILITY) {
    console.log('[analyzeJobCompatibility] Attempting analysis with Cloudflare Workers AI (cost-optimized)');

    try {
      const workersAIResult = await analyzeJobCompatibilityWithWorkersAI(env, context);

      if (workersAIResult) {
        const duration = Date.now() - startTime;
        console.log(`[analyzeJobCompatibility] ✓ SUCCESS with Workers AI in ${duration}ms (95-98% cost savings)`);
        console.log(`[analyzeJobCompatibility] Score: ${workersAIResult.overallScore}, Recommendation: ${workersAIResult.recommendation}`);

        // Log hybrid strategy decision: Workers AI success
        console.log(JSON.stringify({
          event: 'hybrid_strategy_decision',
          job_id: job.id,
          user_id: profile.id,
          strategy: 'workers_ai',
          result: 'success',
          duration_ms: duration,
          cost_savings_percent: 95,
          timestamp: new Date().toISOString(),
        }));

        return workersAIResult;
      }

      // If Workers AI returned null (quality validation failed), fallback to OpenAI
      console.warn('[analyzeJobCompatibility] Workers AI quality validation failed, falling back to OpenAI');

      // Log hybrid strategy decision: Quality validation failed
      console.log(JSON.stringify({
        event: 'hybrid_strategy_decision',
        job_id: job.id,
        user_id: profile.id,
        strategy: 'workers_ai',
        result: 'quality_validation_failed',
        fallback_to: 'openai',
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      // Workers AI failed with an error, fallback to OpenAI
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[analyzeJobCompatibility] Workers AI error, falling back to OpenAI:', errorMessage);

      // Log hybrid strategy decision: Workers AI error
      console.log(JSON.stringify({
        event: 'hybrid_strategy_decision',
        job_id: job.id,
        user_id: profile.id,
        strategy: 'workers_ai',
        result: 'error',
        error: errorMessage,
        fallback_to: 'openai',
        timestamp: new Date().toISOString(),
      }));
    }
  } else {
    console.log('[analyzeJobCompatibility] Workers AI disabled via feature flag, using OpenAI');

    // Log hybrid strategy decision: Feature flag disabled
    console.log(JSON.stringify({
      event: 'hybrid_strategy_decision',
      job_id: job.id,
      user_id: profile.id,
      strategy: 'openai',
      result: 'feature_flag_disabled',
      reason: 'USE_WORKERS_AI_FOR_COMPATIBILITY=false',
      timestamp: new Date().toISOString(),
    }));
  }

  // Fallback to OpenAI
  console.log('[analyzeJobCompatibility] Using OpenAI GPT-4o-mini for compatibility analysis');
  const openai = createOpenAI(env);

  // Build comprehensive system prompt with 10-dimension framework
  const systemPrompt = `You are an expert recruiter and talent assessment specialist. Your task is to analyze the compatibility between a job posting and a candidate's profile using a comprehensive 10-dimension scoring framework.

SCORING FRAMEWORK (1-10 scale for each dimension):

1. **Skill Match (30% weight)**
   - Technical skills alignment with job requirements
   - Proficiency level matching
   - Transferable skills consideration
   - Score 9-10: Exceeds requirements, strong proof
   - Score 7-8: Meets all key requirements
   - Score 5-6: Meets most requirements, some gaps
   - Score 3-4: Significant skill gaps
   - Score 1-2: Minimal skill overlap

2. **Industry Match (15% weight)**
   - Relevant industry experience
   - Domain knowledge and context understanding
   - Score 9-10: Deep industry expertise, direct experience
   - Score 7-8: Solid industry background
   - Score 5-6: Related industry or transferable experience
   - Score 3-4: Different industry, some transferable aspects
   - Score 1-2: Completely unrelated industry

3. **Experience Level (20% weight)**
   - Years of experience matching job requirements
   - Career progression alignment
   - Score 9-10: Perfect match or exceeds requirements
   - Score 7-8: Meets experience requirements
   - Score 5-6: Slightly under/over-qualified
   - Score 3-4: Significantly misaligned
   - Score 1-2: Major experience mismatch

4. **Location Match (10% weight)**
   - Geographic compatibility
   - Remote/hybrid/on-site alignment
   - Relocation feasibility
   - Score 9-10: Same location or fully remote match
   - Score 7-8: Nearby or willing/able to relocate
   - Score 5-6: Different location, remote possible
   - Score 3-4: Geographic challenge
   - Score 1-2: Location incompatible

5. **Seniority Level (5% weight)**
   - Title and responsibility level matching
   - Leadership scope alignment
   - Score 9-10: Perfect seniority match
   - Score 7-8: Appropriate level
   - Score 5-6: Slight mismatch (promotion/lateral)
   - Score 3-4: Significant level gap
   - Score 1-2: Major seniority mismatch

6. **Education/Certification (5% weight)**
   - Degree requirements met
   - Relevant certifications
   - Continuous learning indicators
   - Score 9-10: Exceeds requirements with relevant certs
   - Score 7-8: Meets all requirements
   - Score 5-6: Meets most, some gaps
   - Score 3-4: Missing key requirements
   - Score 1-2: Significant education gaps

7. **Soft Skills & Leadership (5% weight)**
   - Communication, teamwork, problem-solving
   - Leadership indicators in work history
   - Score 9-10: Strong evidence of leadership/soft skills
   - Score 7-8: Clear indicators present
   - Score 5-6: Some evidence
   - Score 3-4: Weak indicators
   - Score 1-2: No evidence

8. **Employment Stability & Career Continuity (5% weight)**
   - Job tenure patterns
   - Career progression logic
   - Commitment indicators
   - Score 9-10: Stable, logical progression
   - Score 7-8: Good stability
   - Score 5-6: Some job-hopping, but reasonable
   - Score 3-4: Frequent changes
   - Score 1-2: Red flag patterns

9. **Growth Potential & Learning Agility (3% weight)**
   - Evidence of continuous learning
   - Skill acquisition over time
   - Adaptability indicators
   - Score 9-10: Strong growth trajectory
   - Score 7-8: Clear learning pattern
   - Score 5-6: Some growth evidence
   - Score 3-4: Minimal growth
   - Score 1-2: Stagnant profile

10. **Company/Organization Scale Alignment (2% weight)**
    - Startup vs. enterprise experience matching company type
    - Team size and organizational structure fit
    - Score 9-10: Perfect scale match
    - Score 7-8: Similar scale experience
    - Score 5-6: Some scale mismatch
    - Score 3-4: Different scale
    - Score 1-2: Incompatible scale

CALCULATION:
- Calculate weighted average: (Skill×30 + Industry×15 + Experience×20 + Location×10 + Seniority×5 + Education×5 + SoftSkills×5 + Stability×5 + Growth×3 + Scale×2) / 100
- Convert to 0-100 scale: (weighted_average / 10) × 100
- Round to nearest integer

RECOMMENDATION CATEGORIES:
- Strong Match: 80-100 (Excellent fit, highly recommend)
- Good Match: 65-79 (Solid fit, recommend with minor reservations)
- Moderate Match: 50-64 (Acceptable fit, notable gaps to address)
- Weak Match: 35-49 (Questionable fit, significant concerns)
- Poor Match: 0-34 (Not recommended, major misalignment)

OUTPUT FORMAT:
Return JSON with this EXACT structure:
{
  "overallScore": <number 0-100>,
  "recommendation": "<Strong Match|Good Match|Moderate Match|Weak Match|Poor Match>",
  "dimensions": {
    "skillMatch": { "score": <1-10>, "justification": "<detailed reasoning>" },
    "industryMatch": { "score": <1-10>, "justification": "<detailed reasoning>" },
    "experienceLevel": { "score": <1-10>, "justification": "<detailed reasoning>" },
    "locationMatch": { "score": <1-10>, "justification": "<detailed reasoning>" },
    "seniorityLevel": { "score": <1-10>, "justification": "<detailed reasoning>" },
    "educationCertification": { "score": <1-10>, "justification": "<detailed reasoning>" },
    "softSkillsLeadership": { "score": <1-10>, "justification": "<detailed reasoning>" },
    "employmentStability": { "score": <1-10>, "justification": "<detailed reasoning>" },
    "growthPotential": { "score": <1-10>, "justification": "<detailed reasoning>" },
    "companyScaleAlignment": { "score": <1-10>, "justification": "<detailed reasoning>" }
  },
  "strengths": ["<top strength 1>", "<top strength 2>", "<top strength 3>"],
  "gaps": ["<top gap 1>", "<top gap 2>", "<top gap 3>"],
  "redFlags": ["<critical concern 1 if any>", "<critical concern 2 if any>"]
}

REQUIREMENTS:
- Each dimension MUST have a score (1-10) and detailed justification (50-200 words)
- Justifications must reference specific evidence from the candidate's profile
- Overall score MUST be calculated using the weighted formula
- Strengths and gaps arrays MUST have exactly 3 items each
- Red flags array can be empty if no critical concerns exist
- Be honest and objective - don't inflate scores
- Consider cultural fit and role-specific nuances`;

  // Build user prompt with all candidate data
  const { workExperience, education, skills } = context;
  const userPrompt = buildCompatibilityUserPrompt(job, profile, workExperience, education, skills);

  const completion = await openai.chat.completions.create({
    model: MODELS.MATCH_ANALYSIS,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3, // Lower temperature for more consistent scoring
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  });

  // Log AI Gateway cache status (if available)
  logAIGatewayCacheStatus(completion, 'compatibility-analysis', job.id);

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  const analysis = JSON.parse(content) as JobCompatibilityAnalysis;
  const duration = Date.now() - startTime;
  console.log(`[analyzeJobCompatibility] ✓ SUCCESS with OpenAI (fallback) in ${duration}ms`);
  console.log(`[analyzeJobCompatibility] Overall score: ${analysis.overallScore}, Recommendation: ${analysis.recommendation}`);

  // Log OpenAI fallback success
  console.log(JSON.stringify({
    event: 'openai_fallback_success',
    job_id: job.id,
    user_id: profile.id,
    model: MODELS.MATCH_ANALYSIS,
    duration_ms: duration,
    overall_score: analysis.overallScore,
    recommendation: analysis.recommendation,
    timestamp: new Date().toISOString(),
  }));

  return analysis;
}

/**
 * Build user prompt with comprehensive job and candidate data
 */
function buildCompatibilityUserPrompt(
  job: Job,
  profile: UserProfile,
  workExp: WorkExperience[],
  edu: Education[],
  skills: Skill[]
): string {
  const salaryRange =
    job.salaryMin && job.salaryMax
      ? `Salary Range: $${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`
      : 'Salary: Not specified';

  const experienceSection = workExp
    .map((exp, i) => {
      const duration = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate || 'Present'}`;
      const accomplishments = exp.accomplishments?.length > 0
        ? exp.accomplishments.map((a) => `     • ${a}`).join('\n')
        : '     • No specific accomplishments listed';

      return `${i + 1}. ${exp.position} at ${exp.company}
   Location: ${exp.location || 'Not specified'}
   Duration: ${duration}
   ${exp.description ? `Description: ${exp.description}` : ''}
   Key Accomplishments:
${accomplishments}`;
    })
    .join('\n\n');

  const educationSection = edu
    .map((e) => {
      const graduationInfo = e.graduationYear ? ` (Graduated ${e.graduationYear})` : '';
      const gpaInfo = e.gpa ? ` | GPA: ${e.gpa}` : '';
      const honorsInfo = e.honors?.length ? ` | Honors: ${e.honors.join(', ')}` : '';
      return `  • ${e.degree} in ${e.field} from ${e.school}${graduationInfo}${gpaInfo}${honorsInfo}`;
    })
    .join('\n');

  const skillsSection = skills
    .map((s) => {
      const level = s.level ? ` (${s.level})` : '';
      const years = s.yearsOfExperience ? ` - ${s.yearsOfExperience} years` : '';
      return `  • ${s.name}${level}${years}`;
    })
    .join('\n');

  return `=== JOB POSTING ===

Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'Not specified'}
Work Arrangement: ${job.workArrangement || 'Not specified'}
Experience Level: ${job.experienceLevel || 'Not specified'}
${salaryRange}

FULL JOB DESCRIPTION:
${job.description || 'No detailed description provided.'}

REQUIRED SKILLS:
${job.requiredSkills?.join(', ') || 'Not specified'}

PREFERRED SKILLS:
${job.preferredSkills?.join(', ') || 'Not specified'}

=== CANDIDATE PROFILE ===

Name: ${profile.firstName || ''} ${profile.lastName || ''}
Location: ${profile.location || 'Not specified'}
Email: ${profile.email || 'Not provided'}
Phone: ${profile.phone || 'Not provided'}
${profile.linkedInUrl ? `LinkedIn: ${profile.linkedInUrl}` : ''}

${profile.headline ? `HEADLINE:\n${profile.headline}\n` : ''}

${profile.summary ? `PROFESSIONAL SUMMARY:\n${profile.summary}\n` : ''}

WORK EXPERIENCE:
${experienceSection || 'No work experience listed'}

EDUCATION:
${educationSection || 'No education listed'}

SKILLS:
${skillsSection || 'No skills listed'}

=== YOUR TASK ===

Analyze the compatibility between this job posting and candidate profile using the 10-dimension framework. Provide:
1. Scores (1-10) for each dimension with detailed justifications
2. Calculate overall weighted score (0-100)
3. Determine recommendation category
4. Identify top 3 strengths
5. Identify top 3 gaps or concerns
6. List any red flags (critical concerns that would disqualify the candidate)

Be thorough, objective, and specific in your analysis.`;
}
