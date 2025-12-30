/**
 * Resume Gap Analysis Service
 *
 * Uses Workers AI (Llama 3.3 70B) to analyze resumes for gaps and red flags,
 * generating targeted questions to help users strengthen their profiles.
 *
 * 100% free - no external API costs
 */

import type { Env, UserProfile, WorkExperience, Education, Skill } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface ResumeGapAnalysis {
  resume_analysis: {
    overall_assessment: string;
    gap_count: number;
    red_flag_count: number;
    urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  };
  identified_gaps_and_flags: Array<{
    id: number;
    type: 'GAP' | 'RED_FLAG';
    category: string;
    description: string;
    impact: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  clarification_questions: Array<{
    question_id: number;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    gap_addressed: string;
    question: string;
    context: string;
    expected_outcome: string;
    answer?: string; // User's answer (populated later)
  }>;
  next_steps: {
    immediate_action: string;
    long_term_recommendations: string[];
  };
}

// =============================================================================
// Gap Analysis Prompt
// =============================================================================

const RESUME_GAP_ANALYSIS_PROMPT = `You are a professional resume analyst and career coach. Your task is to:

1. Analyze a candidate's resume/profile for gaps, red flags, and areas that need clarification
2. Identify the top 5-10 gaps or red flags that hiring managers would notice
3. Generate targeted, actionable questions the candidate can answer to strengthen their profile
4. Return all questions in a clean, structured JSON format

## ANALYSIS FRAMEWORK

When analyzing a resume, look for these common gaps and red flags:

**GAPS (Areas where information is missing or unclear):**
1. Employment timeline gaps (unexplained periods of unemployment or missing dates)
2. Short job tenures (less than 1-2 years) without explanation
3. Career transitions without clear narrative (e.g., why did they move from Role X to Role Y?)
4. Vague job titles or responsibilities
5. Missing quantifiable results or metrics
6. Skills not validated by recent experience
7. Education/certification requirements not met (or not mentioned)
8. No forward-looking statement about career direction
9. Unexplained job changes or lateral moves
10. Missing company names or vague descriptions

**RED FLAGS (Concerning patterns):**
1. Very frequent job changes (multiple jobs in 2-3 years)
2. Significant unexplained employment gaps
3. Seniority misalignment (overqualified/underqualified)
4. Inconsistent career progression (up and down, not clear path)
5. Technical skills claimed but not recently used
6. No evidence of soft skills (communication, leadership, collaboration)
7. No certifications for technical roles
8. Unclear employment status (says "Present" but no longer employed)
9. Industry/role changes without explanation
10. Missing recent hands-on experience in claimed specialties

## QUESTION GENERATION CRITERIA

Generate questions that are:
- **Actionable**: The candidate's answer will directly improve their resume or profile
- **Not leading**: Don't suggest answers; let the candidate provide information
- **Specific**: Ask about concrete details, not opinions
- **Relevant**: Only ask about gaps that hiring managers would actually care about
- **Professional**: Keep questions appropriate for career/professional context (not personal)
- **Non-invasive**: Don't ask for private information (health, personal crises, etc.)

## JSON OUTPUT FORMAT

Return ONLY valid JSON (no markdown, no code blocks) with this structure:

{
  "resume_analysis": {
    "overall_assessment": "Brief 1-2 sentence summary",
    "gap_count": 0,
    "red_flag_count": 0,
    "urgency": "HIGH"
  },
  "identified_gaps_and_flags": [
    {
      "id": 1,
      "type": "GAP",
      "category": "Employment Timeline",
      "description": "What's missing",
      "impact": "Why hiring managers care",
      "severity": "HIGH"
    }
  ],
  "clarification_questions": [
    {
      "question_id": 1,
      "priority": "HIGH",
      "gap_addressed": "Employment Timeline",
      "question": "The actual question",
      "context": "Why this matters",
      "expected_outcome": "How answer helps"
    }
  ],
  "next_steps": {
    "immediate_action": "What to do first",
    "long_term_recommendations": ["Rec 1", "Rec 2"]
  }
}

IMPORTANT:
- Generate 5-10 questions maximum
- Prioritize HIGH-priority questions first
- Be respectful and non-judgmental
- If resume is exceptionally strong, say so and generate fewer questions
- Return ONLY valid JSON, nothing else`;

// =============================================================================
// Resume Gap Analysis Function
// =============================================================================

/**
 * Analyze a resume/profile for gaps and generate improvement questions
 *
 * Uses Workers AI (Llama 3.3 70B) for free, high-quality analysis
 *
 * @param env - Environment bindings with AI binding
 * @param profile - User's profile data
 * @param workExperiences - User's work experience
 * @param education - User's education
 * @param skills - User's skills
 * @returns Gap analysis with questions
 */
export async function analyzeResumeGaps(
  env: Env,
  profile: UserProfile,
  workExperiences: WorkExperience[],
  education: Education[],
  skills: Skill[]
): Promise<ResumeGapAnalysis> {
  console.log('[analyzeResumeGaps] Starting gap analysis');

  // Build resume text from profile data
  const resumeText = buildResumeText(profile, workExperiences, education, skills);

  console.log('[analyzeResumeGaps] Resume text built, length:', resumeText.length);

  // Call Workers AI for analysis
  const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [
      {
        role: 'system',
        content: RESUME_GAP_ANALYSIS_PROMPT,
      },
      {
        role: 'user',
        content: `Analyze this resume and return ONLY valid JSON:\n\n${resumeText}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 8000,
  });

  console.log('[analyzeResumeGaps] Workers AI response received');

  // Extract JSON from response
  const responseText =
    typeof response === 'object' && 'response' in response
      ? (response as { response: string }).response
      : JSON.stringify(response);

  // Find JSON in response (in case there's extra text)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[analyzeResumeGaps] No JSON found in response:', responseText);
    throw new Error('Failed to parse gap analysis: AI did not return valid JSON');
  }

  const analysis = JSON.parse(jsonMatch[0]) as ResumeGapAnalysis;

  console.log(
    `[analyzeResumeGaps] Analysis complete: ${analysis.resume_analysis.gap_count} gaps, ${analysis.resume_analysis.red_flag_count} red flags`
  );

  return analysis;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build resume text from profile data for AI analysis
 */
function buildResumeText(
  profile: UserProfile,
  workExperiences: WorkExperience[],
  education: Education[],
  skills: Skill[]
): string {
  const sections: string[] = [];

  // Profile section
  sections.push('=== PROFILE ===');
  sections.push(`Name: ${profile.full_name || 'Not provided'}`);
  sections.push(`Email: ${profile.email}`);
  sections.push(`Phone: ${profile.phone_number || 'Not provided'}`);
  sections.push(`Location: ${formatLocation(profile)}`);
  sections.push(`LinkedIn: ${profile.linkedin_url || 'Not provided'}`);
  sections.push(`Portfolio: ${profile.portfolio_url || 'Not provided'}`);
  sections.push(`Professional Summary: ${profile.professional_summary || 'Not provided'}`);
  sections.push('');

  // Work Experience section
  sections.push('=== WORK EXPERIENCE ===');
  if (workExperiences.length === 0) {
    sections.push('No work experience listed');
  } else {
    workExperiences
      .sort((a, b) => {
        const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
        const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
        return bDate - aDate; // Most recent first
      })
      .forEach((exp) => {
        sections.push(`\n${exp.job_title} at ${exp.company}`);
        sections.push(`${formatDate(exp.start_date)} - ${exp.is_current ? 'Present' : formatDate(exp.end_date)}`);
        sections.push(`Location: ${exp.location || 'Not specified'}`);
        if (exp.description) {
          sections.push(`Description: ${exp.description}`);
        }
      });
  }
  sections.push('');

  // Education section
  sections.push('=== EDUCATION ===');
  if (education.length === 0) {
    sections.push('No education listed');
  } else {
    education.forEach((edu) => {
      sections.push(`\n${edu.degree || 'Degree not specified'} in ${edu.field_of_study || 'Field not specified'}`);
      sections.push(`${edu.institution}`);
      sections.push(`${formatDate(edu.start_date)} - ${edu.is_current ? 'Present' : formatDate(edu.end_date)}`);
      if (edu.grade) {
        sections.push(`Grade: ${edu.grade}`);
      }
    });
  }
  sections.push('');

  // Skills section
  sections.push('=== SKILLS ===');
  if (skills.length === 0) {
    sections.push('No skills listed');
  } else {
    sections.push(skills.map((s) => s.name).join(', '));
  }
  sections.push('');

  return sections.join('\n');
}

/**
 * Format location from profile
 */
function formatLocation(profile: UserProfile): string {
  const parts: string[] = [];
  if (profile.city) parts.push(profile.city);
  if (profile.state) parts.push(profile.state);
  if (profile.country) parts.push(profile.country);
  return parts.length > 0 ? parts.join(', ') : 'Not provided';
}

/**
 * Format date string
 */
function formatDate(date: string | null): string {
  if (!date) return 'Date not specified';
  try {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  } catch {
    return date;
  }
}
