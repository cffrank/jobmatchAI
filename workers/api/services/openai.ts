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
import type { Env, Job, UserProfile, WorkExperience, Education, Skill, ApplicationVariant, ResumeContent, ParsedResume } from '../types';
import { createSupabaseAdmin } from './supabase';

// =============================================================================
// Configuration
// =============================================================================

export const MODELS = {
  APPLICATION_GENERATION: 'gpt-4o-mini',
  MATCH_ANALYSIS: 'gpt-4o-mini',
  RESUME_PARSING: 'gpt-4o', // Vision model for resume parsing
} as const;

export const GENERATION_CONFIG = {
  TEMPERATURE: 0.7,
  MAX_TOKENS: 3000,
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
 * Create an OpenAI client (per-request in Workers)
 */
export function createOpenAI(env: Env): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

export function isOpenAIConfigured(env: Env): boolean {
  return !!env.OPENAI_API_KEY;
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

EXAMPLES OF EXCELLENT RESUME BULLETS:

Bad: "Responsible for managing kitchen staff and preparing meals"
Good: "Led team of 20+ kitchen staff in upscale steakhouse, reducing food waste by 35% and increasing customer satisfaction scores from 4.2 to 4.8/5.0 through menu innovation and staff training"

KEY PRINCIPLES FOR RESUME BULLETS:
- Start with powerful action verbs (Led, Managed, Developed, Increased, Reduced)
- Include specific, quantifiable metrics (%, $, numbers)
- Show clear impact and business results
- Length: 50-150 characters per bullet

PROFESSIONAL SUMMARY REQUIREMENTS:
- Length: 100-300 characters
- Mention total years of experience
- Include 2-3 most relevant skills from job description
- Highlight 1-2 key achievements with numbers

COVER LETTER REQUIREMENTS:
- Length: 500-1500 characters
- Mention company name at least twice
- Reference specific job title in opening paragraph
- Include 2-3 concrete achievements with metrics

Return JSON with this EXACT structure:
{
  "resume": {
    "summary": "Brief professional summary string (100-300 chars with metrics)",
    "experience": [
      {
        "title": "Job title",
        "company": "Company name",
        "location": "City, State",
        "startDate": "YYYY-MM",
        "endDate": "YYYY-MM or Present",
        "bullets": ["Achievement with metrics", "Another achievement with numbers", "Third achievement showing impact"]
      }
    ],
    "skills": ["Skill 1", "Skill 2", "Skill 3"],
    "education": [
      {
        "degree": "Degree name in Field",
        "school": "School name",
        "location": "City, State",
        "graduation": "YYYY-MM"
      }
    ]
  },
  "coverLetter": "Multi-paragraph cover letter text with \\n\\n separating paragraphs.",
  "aiRationale": ["Specific reason why this resume matches job requirement 1", "How achievement X addresses need Y"]
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
Create a tailored resume and cover letter that maximizes ATS compatibility and highlights relevant experience.`;
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
 * Parse resume file and extract structured information using AI
 * For Cloudflare Workers: Uses Vision API for images, returns error for PDFs
 * (PDF parsing requires Node.js-specific libraries not available in Workers)
 */
export async function parseResume(env: Env, storagePath: string): Promise<ParsedResume> {
  const openai = createOpenAI(env);
  const supabase = createSupabaseAdmin(env);

  console.log(`[parseResume] Starting parse for path: ${storagePath}`);

  // Detect file type
  const ext = storagePath.toLowerCase().split('.').pop();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
  const isPdf = ext === 'pdf';

  if (isPdf) {
    // TODO: PDF parsing in Workers requires different approach
    // Options:
    // 1. Use pdfjs-serverless package
    // 2. Convert PDF to image client-side before upload
    // 3. Use an external PDF-to-text API
    throw new Error(
      'PDF parsing is not yet supported in Cloudflare Workers. ' +
      'Please upload an image of your resume (PNG, JPG, JPEG, GIF, or WEBP) or ' +
      'convert your PDF to an image before uploading.'
    );
  }

  if (!isImage) {
    throw new Error(
      'Unsupported file format. Please upload an image file (PNG, JPG, JPEG, GIF, WEBP).'
    );
  }

  // Generate signed URL for the image
  const { data: signedUrlData, error: urlError } = await supabase.storage
    .from('files')
    .createSignedUrl(storagePath, 3600);

  if (urlError || !signedUrlData) {
    console.error('[parseResume] Failed to generate signed URL:', urlError);
    throw new Error(`Failed to access resume file at ${storagePath}.`);
  }

  const fileUrl = signedUrlData.signedUrl;
  console.log(`[parseResume] Signed URL generated successfully`);

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

  const completion = await openai.chat.completions.create({
    model: MODELS.RESUME_PARSING,
    messages: [
      {
        role: 'system',
        content: 'You are an expert resume parser. Extract all information from resumes and return valid JSON only.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: fileUrl } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 4000,
  });

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  console.log('[parseResume] Successfully parsed resume');
  return JSON.parse(content) as ParsedResume;
}
