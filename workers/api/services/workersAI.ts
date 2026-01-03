/**
 * Cloudflare Workers AI Service for Job Compatibility Analysis
 *
 * Provides AI-powered job compatibility analysis using Cloudflare Workers AI models
 * as a cost-effective alternative to OpenAI GPT-4.
 *
 * Cost comparison:
 * - OpenAI GPT-4o-mini: ~$0.03-0.05 per analysis
 * - Workers AI (Llama 3.1 8B): ~$0.001-0.002 per analysis
 * - Savings: 95-98% cost reduction
 *
 * Model: @cf/meta/llama-3.1-8b-instruct
 * - Supports structured JSON output via JSON Mode
 * - 128k token context window
 * - Strong instruction-following capabilities
 * - Native function calling support
 */

import type { Env, Job, UserProfile, WorkExperience, Education, Skill, JobCompatibilityAnalysis } from '../types';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Workers AI model for job compatibility analysis
 * Llama 3.1 8B Instruct with fast inference
 */
export const COMPATIBILITY_MODEL = '@cf/meta/llama-3.1-8b-instruct';

/**
 * Alternative models for fallback (ordered by preference)
 */
export const FALLBACK_MODELS = [
  '@cf/meta/llama-3.1-8b-instruct-fast', // Faster variant with fp8 quantization
  '@cf/meta/llama-3-8b-instruct', // Older but stable Llama 3
  '@cf/mistral/mistral-7b-instruct-v0.1', // Alternative model family
] as const;

/**
 * Generation config for compatibility analysis
 */
export const ANALYSIS_CONFIG = {
  TEMPERATURE: 0.3, // Lower for more consistent scoring
  MAX_TOKENS: 4000, // Sufficient for detailed 10-dimension analysis
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000,
} as const;

/**
 * Quality threshold for Workers AI responses
 * If confidence is low, fallback to OpenAI
 */
export const QUALITY_THRESHOLD = {
  MIN_DIMENSIONS_FILLED: 10, // All 10 dimensions must be present
  MIN_SCORE_RANGE: 1, // Scores must be between 1-10
  MAX_SCORE_RANGE: 10,
  MIN_JUSTIFICATION_LENGTH: 30, // Each justification must be substantive
  MIN_STRENGTHS_COUNT: 3, // Must have 3 strengths
  MIN_GAPS_COUNT: 3, // Must have 3 gaps
} as const;

// =============================================================================
// Types
// =============================================================================

interface WorkersAIResponse {
  response: string;
}

interface GenerationContext {
  job: Job;
  profile: UserProfile;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
}

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Analyze job-candidate compatibility using Cloudflare Workers AI
 *
 * Uses Llama 3.1 8B Instruct with JSON Mode for structured output.
 * Implements retry logic and quality validation.
 *
 * @param env - Environment bindings (includes AI binding)
 * @param context - Job and candidate data
 * @returns Comprehensive compatibility analysis or null if quality threshold not met
 * @throws Error if Workers AI is unavailable or analysis fails after retries
 */
export async function analyzeJobCompatibilityWithWorkersAI(
  env: Env,
  context: GenerationContext
): Promise<JobCompatibilityAnalysis | null> {
  const startTime = Date.now();
  const { job, profile } = context;

  console.log(`[WorkersAI] Starting compatibility analysis for job ${job.id}, user ${profile.id}`);

  // Build comprehensive prompt
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(context);

  let lastError: Error | null = null;
  let modelIndex = 0;

  // Try primary model first, then fallback models
  const modelsToTry = [COMPATIBILITY_MODEL, ...FALLBACK_MODELS];

  for (const model of modelsToTry) {
    const modelStartTime = Date.now();

    // Retry loop for transient failures
    for (let attempt = 1; attempt <= ANALYSIS_CONFIG.MAX_RETRIES; attempt++) {
      const attemptStartTime = Date.now();

      try {
        console.log(`[WorkersAI] Attempting analysis with ${model} (attempt ${attempt}/${ANALYSIS_CONFIG.MAX_RETRIES})`);

        // Call Workers AI with JSON Mode
        const response = await env.AI.run(model, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: ANALYSIS_CONFIG.TEMPERATURE,
          max_tokens: ANALYSIS_CONFIG.MAX_TOKENS,
          // JSON Mode for structured output (Llama 3.1 supports this natively)
          response_format: { type: 'json_object' },
        }) as WorkersAIResponse;

        const attemptDuration = Date.now() - attemptStartTime;

        // Extract and parse response
        if (!response || !response.response) {
          // Log failed attempt
          console.log(JSON.stringify({
            event: 'workers_ai_attempt',
            job_id: job.id,
            user_id: profile.id,
            model,
            model_index: modelIndex,
            attempt,
            max_attempts: ANALYSIS_CONFIG.MAX_RETRIES,
            success: false,
            error: 'Empty response from Workers AI',
            duration_ms: attemptDuration,
            timestamp: new Date().toISOString(),
          }));

          throw new Error('Empty response from Workers AI');
        }

        const analysis = JSON.parse(response.response) as JobCompatibilityAnalysis;

        // Validate response quality
        const validationResult = validateAnalysisQuality(analysis);
        if (!validationResult.isValid) {
          console.warn(`[WorkersAI] Quality validation failed with ${model}: ${validationResult.reason}`);
          console.warn('[WorkersAI] Will try fallback model or return null for OpenAI fallback');

          // Log validation failure
          console.log(JSON.stringify({
            event: 'workers_ai_validation_failed',
            job_id: job.id,
            user_id: profile.id,
            model,
            model_index: modelIndex,
            attempt,
            validation_failure: validationResult.reason,
            duration_ms: attemptDuration,
            overall_score: analysis.overallScore,
            timestamp: new Date().toISOString(),
          }));

          lastError = new Error(`Quality validation failed: ${validationResult.reason}`);
          break; // Try next model
        }

        const totalDuration = Date.now() - startTime;
        console.log(
          `[WorkersAI] ✓ Successfully generated analysis with ${model} in ${totalDuration}ms (attempt ${attempt})`
        );
        console.log(`[WorkersAI] Overall score: ${analysis.overallScore}, Recommendation: ${analysis.recommendation}`);

        // Log successful analysis
        console.log(JSON.stringify({
          event: 'workers_ai_analysis_success',
          job_id: job.id,
          user_id: profile.id,
          model,
          model_index: modelIndex,
          attempt,
          max_attempts: ANALYSIS_CONFIG.MAX_RETRIES,
          success: true,
          validation_passed: true,
          duration_ms: totalDuration,
          attempt_duration_ms: attemptDuration,
          overall_score: analysis.overallScore,
          recommendation: analysis.recommendation,
          timestamp: new Date().toISOString(),
        }));

        return analysis;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const attemptDuration = Date.now() - attemptStartTime;

        console.error(
          `[WorkersAI] Attempt ${attempt}/${ANALYSIS_CONFIG.MAX_RETRIES} failed with ${model}:`,
          lastError.message
        );

        // Log failed attempt
        console.log(JSON.stringify({
          event: 'workers_ai_attempt_failed',
          job_id: job.id,
          user_id: profile.id,
          model,
          model_index: modelIndex,
          attempt,
          max_attempts: ANALYSIS_CONFIG.MAX_RETRIES,
          success: false,
          error: lastError.message,
          error_type: lastError.name,
          duration_ms: attemptDuration,
          will_retry: attempt < ANALYSIS_CONFIG.MAX_RETRIES,
          timestamp: new Date().toISOString(),
        }));

        // If this was the last attempt for this model, try next model
        if (attempt < ANALYSIS_CONFIG.MAX_RETRIES) {
          const delayMs = ANALYSIS_CONFIG.RETRY_DELAY_MS * attempt;
          console.log(`[WorkersAI] Retrying in ${delayMs}ms...`);
          await sleep(delayMs);
        }
      }
    }

    const modelDuration = Date.now() - modelStartTime;
    console.log(`[WorkersAI] All attempts failed with ${model}, trying next model...`);

    // Log model exhaustion
    console.log(JSON.stringify({
      event: 'workers_ai_model_exhausted',
      job_id: job.id,
      user_id: profile.id,
      model,
      model_index: modelIndex,
      total_attempts: ANALYSIS_CONFIG.MAX_RETRIES,
      duration_ms: modelDuration,
      will_fallback: modelIndex < modelsToTry.length - 1,
      timestamp: new Date().toISOString(),
    }));

    modelIndex++;
  }

  // All models exhausted
  const totalDuration = Date.now() - startTime;
  console.error(
    `[WorkersAI] Failed to generate valid analysis after trying ${modelsToTry.length} models (${totalDuration}ms total)`
  );
  console.log('[WorkersAI] Returning null to trigger OpenAI fallback');

  // Log complete failure (will fallback to OpenAI)
  console.log(JSON.stringify({
    event: 'workers_ai_complete_failure',
    job_id: job.id,
    user_id: profile.id,
    models_tried: modelsToTry.length,
    total_attempts: modelsToTry.length * ANALYSIS_CONFIG.MAX_RETRIES,
    duration_ms: totalDuration,
    fallback_to: 'openai',
    last_error: lastError?.message,
    timestamp: new Date().toISOString(),
  }));

  return null; // Signal caller to use OpenAI fallback
}

// =============================================================================
// Quality Validation
// =============================================================================

interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Validate Workers AI response quality
 *
 * Ensures the analysis meets minimum quality standards before accepting it.
 * If validation fails, we fallback to OpenAI for better quality.
 */
function validateAnalysisQuality(analysis: JobCompatibilityAnalysis): ValidationResult {
  // Check overall score is present and in valid range
  if (typeof analysis.overallScore !== 'number' || analysis.overallScore < 0 || analysis.overallScore > 100) {
    return { isValid: false, reason: 'Invalid overall score' };
  }

  // Check recommendation is valid
  const validRecommendations = ['Strong Match', 'Good Match', 'Moderate Match', 'Weak Match', 'Poor Match'];
  if (!validRecommendations.includes(analysis.recommendation)) {
    return { isValid: false, reason: 'Invalid recommendation category' };
  }

  // Check all 10 dimensions exist
  const requiredDimensions = [
    'skillMatch',
    'industryMatch',
    'experienceLevel',
    'locationMatch',
    'seniorityLevel',
    'educationCertification',
    'softSkillsLeadership',
    'employmentStability',
    'growthPotential',
    'companyScaleAlignment',
  ];

  for (const dim of requiredDimensions) {
    const dimension = analysis.dimensions[dim as keyof typeof analysis.dimensions];
    if (!dimension) {
      return { isValid: false, reason: `Missing dimension: ${dim}` };
    }

    // Validate score range (1-10)
    if (dimension.score < QUALITY_THRESHOLD.MIN_SCORE_RANGE || dimension.score > QUALITY_THRESHOLD.MAX_SCORE_RANGE) {
      return { isValid: false, reason: `Invalid score for ${dim}: ${dimension.score}` };
    }

    // Validate justification exists and has substance
    if (!dimension.justification || dimension.justification.length < QUALITY_THRESHOLD.MIN_JUSTIFICATION_LENGTH) {
      return { isValid: false, reason: `Insufficient justification for ${dim}` };
    }
  }

  // Check strengths array
  if (!Array.isArray(analysis.strengths) || analysis.strengths.length < QUALITY_THRESHOLD.MIN_STRENGTHS_COUNT) {
    return { isValid: false, reason: 'Insufficient strengths' };
  }

  // Check gaps array
  if (!Array.isArray(analysis.gaps) || analysis.gaps.length < QUALITY_THRESHOLD.MIN_GAPS_COUNT) {
    return { isValid: false, reason: 'Insufficient gaps' };
  }

  // Check red flags array exists (can be empty)
  if (!Array.isArray(analysis.redFlags)) {
    return { isValid: false, reason: 'Missing red flags array' };
  }

  // All checks passed
  return { isValid: true };
}

// =============================================================================
// Prompt Builders
// =============================================================================

/**
 * Build system prompt for job compatibility analysis
 *
 * Reuses the same proven 10-dimension framework from OpenAI implementation
 * but optimized for Llama 3.1's instruction-following style.
 */
function buildSystemPrompt(): string {
  return `You are an expert recruiter and talent assessment specialist. Analyze the compatibility between a job posting and a candidate's profile using a comprehensive 10-dimension scoring framework.

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

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON, no markdown or explanatory text
- Each dimension MUST have a score (1-10) and detailed justification (50-200 words)
- Justifications must reference specific evidence from the candidate's profile
- Overall score MUST be calculated using the weighted formula
- Strengths and gaps arrays MUST have exactly 3 items each
- Red flags array can be empty if no critical concerns exist
- Be honest and objective - don't inflate scores

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
}`;
}

/**
 * Build user prompt with comprehensive job and candidate data
 *
 * Reuses the same data formatting from OpenAI implementation for consistency.
 */
function buildUserPrompt(context: GenerationContext): string {
  const { job, profile, workExperience, education, skills } = context;

  const salaryRange =
    job.salaryMin && job.salaryMax
      ? `Salary Range: $${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`
      : 'Salary: Not specified';

  const experienceSection = workExperience
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

  const educationSection = education
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

Be thorough, objective, and specific in your analysis. Return ONLY valid JSON.`;
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
