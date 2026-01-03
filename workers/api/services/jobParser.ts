/**
 * Job Parser Service for Cloudflare Workers
 *
 * Parses unstructured job posting text into structured JSON using AI.
 * Users paste raw job postings from LinkedIn, Indeed, etc. and we extract
 * structured data fields.
 *
 * AI Strategy:
 * - Primary: Cloudflare Workers AI (Llama 3.3 70B Instruct) with JSON Mode
 * - Fallback: OpenAI GPT-4o-mini if Workers AI fails or produces invalid results
 * - Cost: Workers AI ~$0.001/parse vs OpenAI ~$0.01/parse (10x savings)
 *
 * Quality Validation:
 * - Validates required fields (title, company, location, description)
 * - Validates salary range (min <= max if both present)
 * - Validates work arrangement enum
 * - Validates description length (min 50 chars)
 * - If validation fails, retries with OpenAI fallback
 *
 * Retry Logic:
 * - Exponential backoff for transient failures
 * - Multiple model fallbacks (Llama 3.3 70B → OpenAI GPT-4o-mini)
 */

import OpenAI from 'openai';
import type { Env } from '../types';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Workers AI model for job parsing
 * Llama 3.3 70B Instruct FP8 Fast with JSON Mode
 */
export const PARSER_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

/**
 * OpenAI fallback model for job parsing
 */
export const FALLBACK_MODEL = 'gpt-4o-mini';

/**
 * Generation config for job parsing
 */
export const PARSER_CONFIG = {
  TEMPERATURE: 0.1, // Very low for deterministic extraction
  MAX_TOKENS: 2000, // Sufficient for structured job data
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 500,
  RETRY_BACKOFF_MULTIPLIER: 2,
} as const;

/**
 * Quality thresholds for validation
 */
export const QUALITY_THRESHOLD = {
  MIN_DESCRIPTION_LENGTH: 50,
  MIN_TITLE_LENGTH: 3,
  MIN_COMPANY_LENGTH: 2,
  MIN_LOCATION_LENGTH: 2,
} as const;

// =============================================================================
// Types
// =============================================================================

export type WorkArrangement = 'Remote' | 'Hybrid' | 'On-site' | 'Unknown';

export interface ParsedJobData {
  title: string;
  company: string;
  location: string;
  workArrangement: WorkArrangement;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  url?: string;
  experienceLevel?: string;
  requiredSkills: string[];
  preferredSkills: string[];
}

export interface ParsedJobResult {
  job: ParsedJobData;
  metadata: {
    confidence: number; // 0-100
    aiModel: 'workers-ai' | 'openai';
    warnings: string[];
  };
}

interface WorkersAIResponse {
  response: string;
}

// =============================================================================
// Main Parsing Function
// =============================================================================

/**
 * Parse unstructured job posting text into structured JSON
 *
 * Uses Workers AI (Llama 3.3 70B) with OpenAI fallback.
 * Implements retry logic and quality validation.
 *
 * @param env - Environment bindings (includes AI binding and OpenAI key)
 * @param jobText - Raw job posting text (50-10,000 characters)
 * @returns Parsed job data with confidence score and warnings
 * @throws Error if parsing fails after all retries
 */
export async function parseJobPosting(
  env: Env,
  jobText: string
): Promise<ParsedJobResult> {
  const startTime = Date.now();

  console.log(`[JobParser] Starting job parsing (${jobText.length} chars)`);

  // Try Workers AI first
  try {
    const result = await parseWithWorkersAI(env, jobText);
    const duration = Date.now() - startTime;

    console.log(
      `[JobParser] Successfully parsed with Workers AI in ${duration}ms (confidence: ${result.metadata.confidence})`
    );

    return result;
  } catch (error) {
    console.warn('[JobParser] Workers AI parsing failed:', error instanceof Error ? error.message : String(error));
    console.log('[JobParser] Falling back to OpenAI...');

    // Fallback to OpenAI
    const result = await parseWithOpenAI(env, jobText);
    const duration = Date.now() - startTime;

    console.log(
      `[JobParser] Successfully parsed with OpenAI fallback in ${duration}ms (confidence: ${result.metadata.confidence})`
    );

    return result;
  }
}

// =============================================================================
// Workers AI Parsing
// =============================================================================

/**
 * Parse job posting using Cloudflare Workers AI
 *
 * Uses Llama 3.3 70B Instruct with JSON Mode for structured output.
 * Implements retry logic and quality validation.
 *
 * @throws Error if parsing fails or validation fails
 */
async function parseWithWorkersAI(
  env: Env,
  jobText: string
): Promise<ParsedJobResult> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(jobText);

  let lastError: Error | null = null;

  // Retry loop for transient failures
  for (let attempt = 1; attempt <= PARSER_CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(`[JobParser] Attempting Workers AI parse (attempt ${attempt}/${PARSER_CONFIG.MAX_RETRIES})`);

      // Call Workers AI with JSON Mode
      const response = await env.AI.run(PARSER_MODEL, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: PARSER_CONFIG.TEMPERATURE,
        max_tokens: PARSER_CONFIG.MAX_TOKENS,
        response_format: { type: 'json_object' }, // JSON Mode for structured output
      }) as WorkersAIResponse;

      if (!response || !response.response) {
        throw new Error('Empty response from Workers AI');
      }

      // Parse JSON response
      const parsed = JSON.parse(response.response) as ParsedJobData;

      // Validate quality
      const validationResult = validateParsedJob(parsed);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.reason}`);
      }

      // Calculate confidence score based on completeness
      const confidence = calculateConfidence(parsed);

      console.log(`[JobParser] Workers AI parse successful (confidence: ${confidence})`);

      return {
        job: parsed,
        metadata: {
          confidence,
          aiModel: 'workers-ai',
          warnings: validationResult.warnings || [],
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.error(
        `[JobParser] Workers AI attempt ${attempt}/${PARSER_CONFIG.MAX_RETRIES} failed:`,
        lastError.message
      );

      // Retry with exponential backoff
      if (attempt < PARSER_CONFIG.MAX_RETRIES) {
        const delayMs = PARSER_CONFIG.RETRY_DELAY_MS * Math.pow(PARSER_CONFIG.RETRY_BACKOFF_MULTIPLIER, attempt - 1);
        console.log(`[JobParser] Retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('Workers AI parsing failed after all retries');
}

// =============================================================================
// OpenAI Fallback Parsing
// =============================================================================

/**
 * Parse job posting using OpenAI GPT-4o-mini
 *
 * Used as fallback when Workers AI fails or produces invalid results.
 * More expensive but higher reliability.
 *
 * @throws Error if parsing fails or validation fails
 */
async function parseWithOpenAI(
  env: Env,
  jobText: string
): Promise<ParsedJobResult> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(jobText);

  // Create OpenAI client with optional AI Gateway
  const baseURL = env.CLOUDFLARE_ACCOUNT_ID && env.AI_GATEWAY_SLUG
    ? `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_SLUG}/openai`
    : undefined;

  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL,
  });

  let lastError: Error | null = null;

  // Retry loop for transient failures
  for (let attempt = 1; attempt <= PARSER_CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(`[JobParser] Attempting OpenAI parse (attempt ${attempt}/${PARSER_CONFIG.MAX_RETRIES})`);

      const completion = await openai.chat.completions.create({
        model: FALLBACK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: PARSER_CONFIG.TEMPERATURE,
        max_tokens: PARSER_CONFIG.MAX_TOKENS,
        response_format: { type: 'json_object' }, // JSON Mode
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse JSON response
      const parsed = JSON.parse(content) as ParsedJobData;

      // Validate quality
      const validationResult = validateParsedJob(parsed);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.reason}`);
      }

      // Calculate confidence score
      const confidence = calculateConfidence(parsed);

      console.log(`[JobParser] OpenAI parse successful (confidence: ${confidence})`);

      return {
        job: parsed,
        metadata: {
          confidence,
          aiModel: 'openai',
          warnings: validationResult.warnings || [],
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.error(
        `[JobParser] OpenAI attempt ${attempt}/${PARSER_CONFIG.MAX_RETRIES} failed:`,
        lastError.message
      );

      // Retry with exponential backoff
      if (attempt < PARSER_CONFIG.MAX_RETRIES) {
        const delayMs = PARSER_CONFIG.RETRY_DELAY_MS * Math.pow(PARSER_CONFIG.RETRY_BACKOFF_MULTIPLIER, attempt - 1);
        console.log(`[JobParser] Retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('OpenAI parsing failed after all retries');
}

// =============================================================================
// Quality Validation
// =============================================================================

interface ValidationResult {
  isValid: boolean;
  reason?: string;
  warnings?: string[];
}

/**
 * Validate parsed job data quality
 *
 * Ensures required fields are present and valid before accepting the result.
 */
function validateParsedJob(job: ParsedJobData): ValidationResult {
  const warnings: string[] = [];

  // Required fields validation
  if (!job.title || job.title.trim().length < QUALITY_THRESHOLD.MIN_TITLE_LENGTH) {
    return { isValid: false, reason: 'Invalid or missing job title' };
  }

  if (!job.company || job.company.trim().length < QUALITY_THRESHOLD.MIN_COMPANY_LENGTH) {
    return { isValid: false, reason: 'Invalid or missing company name' };
  }

  if (!job.location || job.location.trim().length < QUALITY_THRESHOLD.MIN_LOCATION_LENGTH) {
    return { isValid: false, reason: 'Invalid or missing location' };
  }

  if (!job.description || job.description.trim().length < QUALITY_THRESHOLD.MIN_DESCRIPTION_LENGTH) {
    return { isValid: false, reason: 'Description too short or missing' };
  }

  // Work arrangement validation
  const validArrangements: WorkArrangement[] = ['Remote', 'Hybrid', 'On-site', 'Unknown'];
  if (!validArrangements.includes(job.workArrangement)) {
    return { isValid: false, reason: `Invalid work arrangement: ${job.workArrangement}` };
  }

  // Salary range validation
  if (job.salaryMin !== undefined && job.salaryMax !== undefined) {
    if (job.salaryMin < 0 || job.salaryMax < 0) {
      return { isValid: false, reason: 'Salary values cannot be negative' };
    }
    if (job.salaryMin > job.salaryMax) {
      return { isValid: false, reason: 'Minimum salary cannot exceed maximum salary' };
    }
  }

  // Optional field warnings
  if (!job.url) {
    warnings.push('No job posting URL provided');
  }

  if (!job.experienceLevel) {
    warnings.push('Experience level not specified');
  }

  if (!job.requiredSkills || job.requiredSkills.length === 0) {
    warnings.push('No required skills extracted');
  }

  if (job.workArrangement === 'Unknown') {
    warnings.push('Could not determine work arrangement');
  }

  return { isValid: true, warnings };
}

// =============================================================================
// Confidence Calculation
// =============================================================================

/**
 * Calculate confidence score (0-100) based on data completeness
 *
 * Higher score = more complete data extracted
 */
function calculateConfidence(job: ParsedJobData): number {
  let score = 0;

  // Required fields (40 points total)
  if (job.title) score += 10;
  if (job.company) score += 10;
  if (job.location) score += 10;
  if (job.description && job.description.length >= QUALITY_THRESHOLD.MIN_DESCRIPTION_LENGTH) score += 10;

  // Work arrangement (15 points)
  if (job.workArrangement && job.workArrangement !== 'Unknown') score += 15;

  // Salary (15 points)
  if (job.salaryMin !== undefined && job.salaryMax !== undefined) score += 15;
  else if (job.salaryMin !== undefined || job.salaryMax !== undefined) score += 7;

  // URL (10 points)
  if (job.url) score += 10;

  // Experience level (10 points)
  if (job.experienceLevel) score += 10;

  // Skills (10 points)
  const skillCount = (job.requiredSkills?.length || 0) + (job.preferredSkills?.length || 0);
  if (skillCount >= 5) score += 10;
  else if (skillCount >= 3) score += 7;
  else if (skillCount >= 1) score += 4;

  return Math.min(100, score);
}

// =============================================================================
// Prompt Builders
// =============================================================================

/**
 * Build system prompt for job parsing
 *
 * Instructs the AI to extract structured data from unstructured job postings.
 */
function buildSystemPrompt(): string {
  return `You are an expert job posting parser. Extract structured information from unstructured job posting text.

EXTRACTION RULES:

1. **Title** (required)
   - Extract the exact job title
   - If multiple titles mentioned, use the primary one
   - Do not infer or guess if not clearly stated

2. **Company** (required)
   - Extract the company/employer name
   - Remove suffixes like "Inc.", "LLC", "Ltd." if they make it cleaner
   - If not explicitly stated, set to "Unknown Company"

3. **Location** (required)
   - Extract city, state/province, and/or country
   - Format: "City, State" or "City, Country" or "Remote"
   - If work is fully remote, set to "Remote"
   - If not stated, set to "Location not specified"

4. **Work Arrangement** (required)
   - Classify as: "Remote", "Hybrid", "On-site", or "Unknown"
   - Keywords for Remote: "remote", "work from home", "distributed", "anywhere"
   - Keywords for Hybrid: "hybrid", "flexible", "some remote", "partially remote"
   - Keywords for On-site: "on-site", "in-office", "in office", "office-based"
   - Default to "Unknown" if unclear

5. **Salary Range** (optional)
   - Extract minimum and maximum salary as numbers (annual USD)
   - Examples:
     - "$100k-$150k" → salaryMin: 100000, salaryMax: 150000
     - "$80-100K" → salaryMin: 80000, salaryMax: 100000
     - "$50/hour" → estimate annual: 50 * 2080 = 104000 (40hr/week * 52 weeks)
     - "€70,000 - €90,000" → convert to USD (approximate)
   - If only one value given, set both min and max to same value
   - If no salary mentioned, omit these fields

6. **Description** (required)
   - Extract the full job description text
   - Include responsibilities, requirements, benefits
   - Clean up excessive whitespace but preserve paragraph breaks
   - Must be at least 50 characters

7. **URL** (optional)
   - Extract job posting URL if present
   - Must be a valid URL starting with http:// or https://
   - If not present, omit this field

8. **Experience Level** (optional)
   - Extract required experience level: "Entry Level", "Mid Level", "Senior", "Lead", "Executive"
   - Look for keywords like "junior", "senior", "5+ years", "10+ years"
   - If not clearly stated, omit this field

9. **Required Skills** (array)
   - Extract technical skills, tools, languages explicitly marked as required
   - Return as array of strings
   - Examples: ["Python", "React", "SQL", "AWS"]
   - If none mentioned, return empty array []

10. **Preferred Skills** (array)
    - Extract skills marked as "nice to have", "preferred", "bonus"
    - Return as array of strings
    - If none mentioned, return empty array []

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON, no markdown or explanatory text
- Use EXACT field names as shown below
- Do not hallucinate information not present in the text
- workArrangement MUST be one of: "Remote", "Hybrid", "On-site", "Unknown"
- Salary values must be positive integers (annual USD)
- Skills arrays can be empty but must exist

Return JSON with this EXACT structure:
{
  "title": "<job title>",
  "company": "<company name>",
  "location": "<location>",
  "workArrangement": "<Remote|Hybrid|On-site|Unknown>",
  "salaryMin": <number or omit>,
  "salaryMax": <number or omit>,
  "description": "<full job description>",
  "url": "<url or omit>",
  "experienceLevel": "<level or omit>",
  "requiredSkills": ["<skill1>", "<skill2>"],
  "preferredSkills": ["<skill1>", "<skill2>"]
}`;
}

/**
 * Build user prompt with job posting text
 */
function buildUserPrompt(jobText: string): string {
  return `Extract structured job information from the following job posting:

${jobText}

Return ONLY valid JSON following the schema provided in the system prompt.`;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
