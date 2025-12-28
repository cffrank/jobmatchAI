/**
 * OpenAI Application Generation Service
 *
 * Handles AI-powered generation of:
 * - Resume variants (Impact-Focused, Keyword-Optimized, Concise)
 * - Cover letters tailored to specific jobs
 * - AI rationale explaining the optimization choices
 *
 * Migrated from legacy Firebase Cloud Functions with:
 * - Comprehensive prompts for high-quality output
 * - JSON response format for structured data
 * - Fallback generation for API failures
 */

import { getOpenAI, MODELS, GENERATION_CONFIG, GENERATION_STRATEGIES } from '../config/openai';
import { supabaseAdmin } from '../config/supabase';
import type {
  Job,
  UserProfile,
  WorkExperience,
  Education,
  Skill,
  ApplicationVariant,
  ResumeContent,
} from '../types';
import { PDFParse } from 'pdf-parse';

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
 *
 * @param context - Generation context with job and user data
 * @returns Array of application variants
 */
export async function generateApplicationVariants(
  context: GenerationContext
): Promise<ApplicationVariant[]> {
  const { job, profile, workExperience, education, skills } = context;

  // Generate all variants in parallel
  const variantPromises = GENERATION_STRATEGIES.map((strategy) =>
    generateVariant(job, profile, workExperience, education, skills, strategy)
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
      // Use fallback for failed generations
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

/**
 * Generate a single application variant using OpenAI
 */
async function generateVariant(
  job: Job,
  profile: UserProfile,
  workExp: WorkExperience[],
  edu: Education[],
  skills: Skill[],
  strategy: (typeof GENERATION_STRATEGIES)[number]
): Promise<GeneratedApplication> {
  const openai = getOpenAI();

  const skillsList = job.requiredSkills?.join(', ') || 'various skills';
  const skillNames = skills.map((s) => s.name).join(', ');

  // Build experience details with achievements
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

  const result = JSON.parse(content) as GeneratedApplication;
  return result;
}

// =============================================================================
// Prompt Builders
// =============================================================================

function buildSystemPrompt(strategyPrompt: string): string {
  return `You are an expert resume writer specializing in ATS-optimized applications. ${strategyPrompt}.

EXAMPLES OF EXCELLENT RESUME BULLETS:

Bad: "Responsible for managing kitchen staff and preparing meals"
Good: "Led team of 20+ kitchen staff in upscale steakhouse, reducing food waste by 35% and increasing customer satisfaction scores from 4.2 to 4.8/5.0 through menu innovation and staff training"

Bad: "Worked as head chef at restaurant"
Good: "Directed all culinary operations for 200-seat fine dining establishment generating $2.5M annual revenue, earning Michelin recommendation in first year"

Bad: "Created new menu items"
Good: "Developed seasonal farm-to-table menu featuring 40+ locally-sourced dishes, resulting in 25% increase in repeat customers and $180K additional quarterly revenue"

Bad: "Managed software development projects"
Good: "Led cross-functional team of 8 engineers to deliver React-based dashboard 2 weeks ahead of schedule, improving user engagement by 45% and reducing support tickets by 60%"

KEY PRINCIPLES FOR RESUME BULLETS:
- Start with powerful action verbs (Led, Managed, Developed, Increased, Reduced, Improved, Created, Built, Designed, Implemented, Streamlined, Established)
- Include specific, quantifiable metrics (%, $, numbers, time saved, efficiency gains)
- Show clear impact and business results
- Length: 50-150 characters per bullet
- Avoid generic phrases like "responsible for" or "worked on" or "helped with"
- Use past tense for previous roles, present tense for current role

PROFESSIONAL SUMMARY REQUIREMENTS:
- Length: 100-300 characters
- Mention total years of experience
- Include 2-3 most relevant skills from the job description
- Highlight 1-2 key achievements with numbers
- Professional tone matching the industry

COVER LETTER REQUIREMENTS:
- Length: 500-1500 characters
- Mention company name at least twice
- Reference specific job title in opening paragraph
- Include 2-3 concrete achievements with metrics
- Show genuine enthusiasm and research about the company
- Professional greeting ("Dear Hiring Manager" or "Dear [Company] Team")
- Strong closing with call to action

QUALITY CHECKLIST (verify before returning):
- Resume summary: 100-300 chars, mentions years of experience, includes numbers
- Resume bullets: 70%+ include metrics, all start with action verbs, 50-150 chars each
- At least 3 bullets per work experience position
- Keywords from job description appear naturally in resume
- Cover letter: mentions company name 2+ times, job title in first paragraph
- Cover letter: includes 2-3 specific achievements with numbers
- Cover letter: has professional greeting and closing
- Skills section includes keywords from job requirements

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
  "coverLetter": "Multi-paragraph cover letter text with \\n\\n separating paragraphs. Must mention company name and job title.",
  "aiRationale": ["Specific reason why this resume matches job requirement 1", "How achievement X addresses need Y", "Why skill Z is emphasized for this role"]
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

  const preferredSkills =
    job.preferredSkills && job.preferredSkills.length > 0
      ? `PREFERRED SKILLS: ${job.preferredSkills.join(', ')}`
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
${job.description || 'No detailed description provided. Use job title and required skills to infer responsibilities.'}

REQUIRED SKILLS: ${skillsList}
${preferredSkills}

---

CANDIDATE PROFILE:

Name: ${profile.firstName || ''} ${profile.lastName || ''}
Location: ${profile.location || 'Not specified'}
Phone: ${profile.phone || 'Not provided'}
Email: ${profile.email || 'Not provided'}

${profile.summary ? `CURRENT PROFESSIONAL SUMMARY:\n${profile.summary}\n` : ''}

WORK EXPERIENCE (use EXACTLY as provided - DO NOT fabricate information):
${experienceSection}

EDUCATION:
${educationSection}

SKILLS:
${skillNames}

---

CRITICAL RULES - MUST FOLLOW EXACTLY:

1. TRUTHFULNESS: Use ONLY information directly provided above. DO NOT:
   - Fabricate metrics, numbers, or achievements
   - Invent team sizes, percentages, dollar amounts, or timeframes
   - Add accomplishments not listed in the candidate's experience
   - Exaggerate or embellish responsibilities

2. WHAT YOU CAN DO:
   - Rewrite existing accomplishments for clarity and impact
   - Emphasize skills and experiences most relevant to the job
   - Use strong action verbs from the accomplishments provided
   - If an accomplishment already has a metric, keep it exactly as stated
   - Reorganize information for better flow

3. WHAT YOU CANNOT DO:
   - Add numbers where none exist (NO "improved efficiency by 30%" unless stated)
   - Invent specific achievements (NO "led team of 10" unless stated)
   - Create metrics from thin air (NO "$200K budget" unless stated)

---

TASK:
Create a tailored resume and cover letter that:

1. KEYWORD OPTIMIZATION: Use keywords from the job description naturally throughout the resume. Match required skills: ${skillsList}

2. USE ACTUAL ACCOMPLISHMENTS: Use the candidate's listed accomplishments exactly as provided. Reword for clarity and impact, but DO NOT add fabricated metrics.

3. HIGHLIGHT RELEVANCE: Emphasize the 3-5 most relevant experiences for THIS specific ${job.title} position.

4. PROFESSIONAL SUMMARY: Write a compelling 100-300 character summary using:
   - Actual years of experience from the work history above
   - Top 2-3 skills that match job requirements from the candidate's skills list
   - Reference to real accomplishments (without fabricating numbers)

5. COVER LETTER: Write 500-1500 characters that:
   - Opens by mentioning the specific job title: "${job.title}"
   - References the company name "${job.company}" at least twice
   - Highlights 2-3 ACTUAL accomplishments from the candidate's experience
   - Shows enthusiasm and genuine interest
   - Ends with a call to action

6. VALIDATION: Before returning, verify:
   - NO fabricated information (numbers, achievements, or responsibilities)
   - Every accomplishment comes from the provided work experience
   - All metrics match what was actually stated in the experience section
   - Strong action verbs are used
   - Keywords from job description appear naturally

Generate the complete application following the exact JSON structure specified above.`;
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
// Match Score AI Analysis
// =============================================================================

/**
 * AI-powered semantic job compatibility analysis
 *
 * Uses GPT-4 to:
 * 1. Semantically match job titles with past experience titles
 * 2. Semantically match job requirements with experience descriptions
 * 3. Understand domain relevance (IT vs Medical vs Business, etc.)
 * 4. Calculate accurate compatibility scores
 */
interface MatchedResponsibility {
  jobRequirement: string;
  candidateExperience: string;
  strength: 'strong' | 'moderate' | 'weak';
}

export async function analyzeJobCompatibility(
  job: Job,
  profile: UserProfile,
  workExperience: WorkExperience[],
  skills: Skill[]
): Promise<{
  matchScore: number;
  compatibilityBreakdown: {
    skillMatch: number;
    experienceMatch: number;
    industryMatch: number;
    locationMatch: number;
  };
  matchedKeywords: string[];
  matchedResponsibilities: MatchedResponsibility[];
  missingSkills: string[];
  titleRelevance: 'high' | 'medium' | 'low';
  recommendationLevel: 'strong match' | 'qualified' | 'partial match' | 'not recommended';
  recommendations: string[];
  summary: string;
}> {
  try {
    const openai = getOpenAI();

    // Build experience summary
    const experienceSummary = workExperience.map((exp) => ({
      position: exp.position,
      company: exp.company,
      duration: `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate || ''}`,
      description: exp.description || '',
      accomplishments: exp.accomplishments.slice(0, 3), // Top 3
    }));

    const prompt = `You are an expert ATS (Applicant Tracking System) matching agent. Your task is to compare a job posting against a candidate profile and provide a structured compatibility analysis.

**CRITICAL MATCHING RULES:**

1. **SEMANTIC TITLE MATCHING** (not keyword-based):
   - "Physician" is NOT similar to "Infrastructure Manager" even if both work in healthcare
   - "Software Engineer" IS similar to "Developer", "Programmer", "SWE"
   - Medical roles (Doctor, Nurse, Physician) are ONLY compatible with medical experience
   - IT roles (Engineer, Administrator, Developer) are ONLY compatible with technical experience
   - Normalize title inflation/deflation (Senior vs Lead vs Principal)

2. **SEMANTIC KEYWORD MATCHING**:
   - Exact keyword matches score highest
   - Semantic equivalents count equally: "manage" = "oversee" = "lead", "build" = "develop" = "create"
   - Technical terms must match domain: "VMware" is NOT relevant to "Surgery"
   - Extract and match key skills, technologies, competencies

3. **RESPONSIBILITY MAPPING**:
   - Map specific job requirements to candidate's actual accomplishments
   - Look at what they DID, not just keywords in job descriptions
   - Rate each match: strong (directly relevant), moderate (transferable), weak (tangential)

4. **EXPERIENCE WEIGHTING**:
   - Recent experience (last 5 years) weighted more heavily than older roles
   - Years of experience requirements are soft filters, not hard cutoffs
   - 3 years of highly relevant experience > 10 years of loosely related experience

5. **DOMAIN RELEVANCE**:
   - Medical/Clinical: Doctor, Nurse, Physician, Surgeon, Medical, Clinical, Healthcare Provider
   - IT/Technical: Engineer, Developer, Administrator, Infrastructure, Systems, Network, Cloud
   - Business/Management: Manager, Director, Executive, Consultant, Operations
   - Only give high scores if domains match!

**JOB POSTING:**
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'Not specified'}
Work Arrangement: ${job.workArrangement || 'Not specified'}

Description: ${job.description?.slice(0, 1000) || 'Not provided'}

Required Skills: ${job.requiredSkills?.join(', ') || 'Not specified'}

**CANDIDATE PROFILE:**
Location: ${profile.location || 'Not specified'}
Summary: ${profile.summary || 'Not provided'}

Skills: ${skills.map((s) => s.name).join(', ')}

Work Experience:
${experienceSummary.map((exp, i) => `
${i + 1}. ${exp.position} at ${exp.company}
   Duration: ${exp.duration}
   Description: ${exp.description}
   Key Accomplishments:
   ${exp.accomplishments.map(a => `   - ${a}`).join('\n')}
`).join('\n')}

**ANALYSIS TASK:**

Perform a comprehensive ATS-style matching analysis:

1. **Keyword Extraction**: Identify key skills, technologies, competencies from job posting

2. **Skill Match (0-100)**:
   - What % of required skills does the candidate have?
   - Are the skills DOMAIN-COMPATIBLE? (IT skills don't match medical jobs)
   - Count semantic equivalents (Python = Python programming)
   - List matched and missing keywords

3. **Experience Match (0-100)**:
   - Are the candidate's PAST JOB TITLES semantically similar to THIS job title?
   - Map job responsibilities to candidate accomplishments (strong/moderate/weak)
   - Is the candidate's experience in a COMPATIBLE DOMAIN?
   - Weight recent experience (last 5 years) more heavily
   - Does the candidate have RELEVANT years (not just total years)?
   - Example: 29 years in IT ≠ 8 years required for Physician

4. **Title Relevance**: Assess career progression relevance (high/medium/low)

5. **Industry Match (0-100)**:
   - Has the candidate worked in THIS specific industry/domain before?
   - Example: IT professional applying to medical role = LOW score

6. **Location Match (0-100)**:
   - Remote jobs = 100
   - Same city = 100
   - Different locations = lower score

7. **Overall Match (0-100)**: Weighted average (Skills 40%, Experience 30%, Industry 20%, Location 10%)

8. **Recommendation Level**: strong match | qualified | partial match | not recommended

9. **Actionable Recommendations**: 2-3 specific suggestions

Return JSON with this EXACT structure:
{
  "matchScore": number (0-100),
  "compatibilityBreakdown": {
    "skillMatch": number (0-100),
    "experienceMatch": number (0-100),
    "industryMatch": number (0-100),
    "locationMatch": number (0-100)
  },
  "matchedKeywords": ["keyword1", "keyword2"],
  "matchedResponsibilities": [
    {
      "jobRequirement": "specific requirement from job posting",
      "candidateExperience": "matching accomplishment from candidate",
      "strength": "strong|moderate|weak"
    }
  ],
  "missingSkills": ["skill1", "skill2"],
  "titleRelevance": "high|medium|low",
  "recommendationLevel": "strong match|qualified|partial match|not recommended",
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "summary": "2-3 sentence assessment"
}

**EXAMPLES OF CORRECT ANALYSIS:**

Example 1: IT professional → Physician role
- Skill Match: 0-10% (VMware, Citrix ≠ Patient Care, Surgery)
- Experience Match: 0-5% (Infrastructure Manager ≠ Physician)
- Industry Match: 0% (IT ≠ Medical)
- Overall: 0-5%

Example 2: IT professional → Cloud Engineer role
- Skill Match: 70-90% (VMware, Cloud, Systems = relevant)
- Experience Match: 80-95% (Infrastructure Manager ~ Cloud Engineer)
- Industry Match: 90-100% (Both IT)
- Overall: 80-90%`;

    const completion = await openai.chat.completions.create({
      model: MODELS.MATCH_ANALYSIS, // gpt-4o
      messages: [
        {
          role: 'system',
          content: 'You are an expert ATS system that performs accurate semantic job matching. You understand domain relevance and never give high scores for incompatible domains (IT vs Medical, etc.).',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const result = JSON.parse(content);

    console.log(`[AI Match Analysis] ${job.title} at ${job.company} -> Overall: ${result.matchScore}%`);
    console.log(`[AI Match Analysis] Breakdown: Skills ${result.compatibilityBreakdown.skillMatch}%, Experience ${result.compatibilityBreakdown.experienceMatch}%, Industry ${result.compatibilityBreakdown.industryMatch}%, Location ${result.compatibilityBreakdown.locationMatch}%`);

    return result;
  } catch (error) {
    console.error('[AI Match Analysis] Analysis failed:', error);
    // Return neutral scores if AI fails
    return {
      matchScore: 50,
      compatibilityBreakdown: {
        skillMatch: 50,
        experienceMatch: 50,
        industryMatch: 50,
        locationMatch: 50,
      },
      matchedKeywords: [],
      matchedResponsibilities: [],
      missingSkills: [],
      titleRelevance: 'medium',
      recommendationLevel: 'partial match',
      recommendations: ['Unable to generate AI analysis. Please review job requirements manually.'],
      summary: 'AI analysis unavailable. Manual review recommended.',
    };
  }
}

/**
 * Generate AI-powered insights for job match analysis
 * (Legacy function - kept for backwards compatibility)
 */
export async function generateMatchInsights(
  job: Job,
  profile: UserProfile,
  skills: Skill[],
  matchScore: number
): Promise<{ insights: string[]; recommendations: string[] }> {
  try {
    const openai = getOpenAI();

    const prompt = `Analyze this job match and provide insights.

JOB: ${job.title} at ${job.company}
Required Skills: ${job.requiredSkills?.join(', ') || 'Not specified'}
Description: ${job.description?.slice(0, 500) || 'Not provided'}

CANDIDATE:
Skills: ${skills.map((s) => s.name).join(', ')}
Summary: ${profile.summary || 'Not provided'}

MATCH SCORE: ${matchScore}%

Provide a JSON response with:
{
  "insights": ["3-5 specific insights about why this is or isn't a good match"],
  "recommendations": ["2-3 actionable recommendations to improve candidacy"]
}`;

    const completion = await openai.chat.completions.create({
      model: MODELS.MATCH_ANALYSIS,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new Error('No content in response');
    }

    return JSON.parse(content) as { insights: string[]; recommendations: string[] };
  } catch (error) {
    console.error('Match insights generation failed:', error);
    return {
      insights: ['Unable to generate AI insights'],
      recommendations: ['Review job requirements manually'],
    };
  }
}

// =============================================================================
// Resume Parsing
// =============================================================================

export interface ParsedProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  linkedInUrl?: string;
}

export interface ParsedWorkExperience {
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  description: string;
  accomplishments: string[];
}

export interface ParsedEducation {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  grade?: string;
}

export interface ParsedSkill {
  name: string;
  endorsements: number;
}

export interface ParsedResume {
  profile: ParsedProfile;
  workExperience: ParsedWorkExperience[];
  education: ParsedEducation[];
  skills: ParsedSkill[];
}

/**
 * Detect file type from storage path
 */
function getFileType(storagePath: string): 'pdf' | 'image' | 'unsupported' {
  const ext = storagePath.toLowerCase().split('.').pop();

  if (ext === 'pdf') {
    return 'pdf';
  }

  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
    return 'image';
  }

  return 'unsupported';
}

/**
 * Download file from Supabase storage
 */
async function downloadFile(storagePath: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage
    .from('files')
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to download file: ${error?.message || 'Unknown error'}`);
  }

  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Extract text from PDF buffer
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text;
}

/**
 * Parse resume file and extract structured information using AI
 *
 * @param storagePath - Storage path of the uploaded resume file (e.g., "resumes/{userId}/{filename}")
 * @returns Parsed resume data
 */
export async function parseResume(storagePath: string): Promise<ParsedResume> {
  try {
    const openai = getOpenAI();

    console.log(`[parseResume] Starting parse for path: ${storagePath}`);

    // Detect file type
    const fileType = getFileType(storagePath);
    console.log(`[parseResume] Detected file type: ${fileType}`);

    if (fileType === 'unsupported') {
      throw new Error(
        'Unsupported file format. Please upload a PDF or image file (PNG, JPG, JPEG, GIF, WEBP).'
      );
    }

    // First, verify the file exists by attempting to list it
    const folderPath = storagePath.substring(0, storagePath.lastIndexOf('/'));
    const fileName = storagePath.substring(storagePath.lastIndexOf('/') + 1);

    console.log(`[parseResume] Checking folder: ${folderPath}`);
    console.log(`[parseResume] Looking for file: ${fileName}`);

    const { data: fileList, error: listError } = await supabaseAdmin.storage
      .from('files')
      .list(folderPath);

    if (listError) {
      console.error('[parseResume] Failed to list files:', listError);
      throw new Error('Failed to access storage bucket');
    }

    const fileExists = fileList?.some(file => file.name === fileName);

    if (!fileExists) {
      console.error(`[parseResume] File not found at path: ${storagePath}`);
      console.error('[parseResume] Available files in folder:', fileList?.map(f => f.name).join(', ') || 'none');
      throw new Error(
        `Resume file not found at path: ${storagePath}. ` +
        `Please ensure the file upload completed successfully before parsing.`
      );
    }

    console.log(`[parseResume] File found`);

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
`;

    let completion;

    if (fileType === 'pdf') {
      // For PDFs: Download, extract text, send to GPT-4o
      console.log(`[parseResume] Downloading PDF file`);
      const fileBuffer = await downloadFile(storagePath);

      console.log(`[parseResume] Extracting text from PDF`);
      const extractedText = await extractTextFromPDF(fileBuffer);
      console.log(`[parseResume] Extracted ${extractedText.length} characters from PDF`);

      completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume parser. Extract all information from resumes and return valid JSON only. Be thorough and accurate.',
          },
          {
            role: 'user',
            content: `${prompt}\n\nRESUME TEXT:\n${extractedText}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4000,
      });
    } else {
      // For images: Use Vision API
      console.log(`[parseResume] Generating signed URL for image`);
      const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
        .from('files')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (urlError || !signedUrlData) {
        console.error('[parseResume] Failed to generate signed URL:', urlError);
        console.error('[parseResume] Storage path:', storagePath);

        throw new Error(
          `Failed to access resume file at ${storagePath}. ` +
          `The file may not exist or the path is incorrect.`
        );
      }

      const fileUrl = signedUrlData.signedUrl;
      console.log(`[parseResume] Signed URL generated successfully`);

      completion = await openai.chat.completions.create({
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
                  url: fileUrl,
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4000,
      });
    }

    const content = completion.choices[0]?.message.content;
    if (!content) {
      console.error('[parseResume] No content in OpenAI response');
      throw new Error('No content in OpenAI response');
    }

    console.log('[parseResume] Parsing OpenAI response');
    const parsedData = JSON.parse(content) as ParsedResume;

    console.log('[parseResume] Successfully parsed resume');
    return parsedData;
  } catch (error) {
    console.error('[parseResume] Resume parsing failed:', error);

    // Re-throw with more context if it's our custom error
    if (error instanceof Error) {
      throw error;
    }

    // Wrap unknown errors
    throw new Error('Failed to parse resume: ' + String(error));
  }
}
