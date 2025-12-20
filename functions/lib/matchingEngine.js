/**
 * Job Matching Engine - Hybrid Algorithmic + AI Scoring
 *
 * This module calculates match scores between jobs and user profiles using a hybrid approach:
 * - 60% Algorithmic: Skills, experience, location, salary matching
 * - 40% AI: Semantic similarity and context understanding
 *
 * Match scores range from 0-100, with explanations for each component.
 */

const admin = require('firebase-admin');
const OpenAI = require('openai');

// Initialize OpenAI client lazily
let openaiClient = null;

function getOpenAI() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// =============================================================================
// Algorithmic Scoring (60% weight)
// =============================================================================

/**
 * Calculate skills match score (0-100)
 * Compares required job skills against user's skills
 */
function calculateSkillsMatch(job, userSkills) {
  if (!job.requiredSkills || job.requiredSkills.length === 0) {
    return { score: 50, matched: [], missing: [] }; // Neutral if no requirements specified
  }

  const userSkillNames = userSkills.map(s => s.name.toLowerCase());
  const requiredSkills = job.requiredSkills.map(s => s.toLowerCase());

  const matched = [];
  const missing = [];

  requiredSkills.forEach(skill => {
    // Check for exact match or partial match
    const hasMatch = userSkillNames.some(userSkill =>
      userSkill.includes(skill) || skill.includes(userSkill)
    );

    if (hasMatch) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  });

  const matchPercentage = (matched.length / requiredSkills.length) * 100;

  return {
    score: matchPercentage,
    matched,
    missing
  };
}

/**
 * Calculate experience level match score (0-100)
 * Compares job's required experience with user's actual experience
 */
function calculateExperienceMatch(job, workExperience, jobPreferences) {
  if (!job.experienceLevel && !jobPreferences?.experienceLevel) {
    return { score: 75, explanation: 'Experience level not specified' };
  }

  // Calculate total years of experience
  const totalYears = workExperience.reduce((sum, exp) => {
    const start = new Date(exp.startDate);
    const end = exp.current ? new Date() : new Date(exp.endDate);
    const years = (end - start) / (1000 * 60 * 60 * 24 * 365);
    return sum + years;
  }, 0);

  // Map experience levels to year ranges
  const experienceLevels = {
    'entry': { min: 0, max: 2 },
    'mid': { min: 2, max: 5 },
    'senior': { min: 5, max: 10 },
    'executive': { min: 10, max: 100 }
  };

  const jobLevel = job.experienceLevel || jobPreferences?.experienceLevel;
  if (!jobLevel) {
    return { score: 75, explanation: 'Experience level not specified' };
  }

  const range = experienceLevels[jobLevel.toLowerCase()];
  if (!range) {
    return { score: 50, explanation: 'Unknown experience level' };
  }

  let score;
  let explanation;

  if (totalYears >= range.min && totalYears <= range.max) {
    score = 100;
    explanation = `Perfect match: ${Math.round(totalYears)} years of experience`;
  } else if (totalYears < range.min) {
    const deficit = range.min - totalYears;
    score = Math.max(0, 100 - (deficit * 20)); // -20 points per year under
    explanation = `Slightly under-qualified: ${Math.round(totalYears)} years (needs ${range.min}+)`;
  } else {
    const excess = totalYears - range.max;
    score = Math.max(70, 100 - (excess * 10)); // -10 points per year over, min 70
    explanation = `Over-qualified: ${Math.round(totalYears)} years (role expects ${range.min}-${range.max})`;
  }

  return { score, explanation };
}

/**
 * Calculate location match score (0-100)
 * Considers remote preferences and geographic proximity
 */
function calculateLocationMatch(job, userProfile, jobPreferences) {
  const jobLocation = job.location?.toLowerCase() || '';
  const userLocation = userProfile.location?.toLowerCase() || '';
  const remotePreference = jobPreferences?.remotePreference || 'any';
  const jobWorkArrangement = job.workArrangement?.toLowerCase() || 'unknown';

  // Remote job matching
  if (jobWorkArrangement === 'remote') {
    if (remotePreference === 'remote' || remotePreference === 'any') {
      return { score: 100, explanation: 'Remote position matches preference' };
    }
    return { score: 70, explanation: 'Remote position (not preferred)' };
  }

  // Hybrid matching
  if (jobWorkArrangement === 'hybrid') {
    if (remotePreference === 'hybrid' || remotePreference === 'any') {
      // Check if location is close
      if (jobLocation.includes(userLocation) || userLocation.includes(jobLocation)) {
        return { score: 100, explanation: 'Hybrid position in your area' };
      }
      return { score: 60, explanation: 'Hybrid position (location may require relocation)' };
    }
    if (remotePreference === 'remote') {
      return { score: 60, explanation: 'Hybrid position (prefer fully remote)' };
    }
  }

  // On-site matching
  if (jobWorkArrangement === 'on-site' || jobWorkArrangement === 'unknown') {
    if (jobLocation.includes(userLocation) || userLocation.includes(jobLocation)) {
      if (remotePreference === 'on-site' || remotePreference === 'any') {
        return { score: 100, explanation: 'On-site position in your area' };
      }
      return { score: 70, explanation: 'On-site position in your area (prefer remote)' };
    }

    if (remotePreference === 'on-site' || remotePreference === 'any') {
      return { score: 40, explanation: 'On-site position (different location)' };
    }
    return { score: 20, explanation: 'On-site position requiring relocation (prefer remote)' };
  }

  return { score: 50, explanation: 'Work arrangement unknown' };
}

/**
 * Calculate salary match score (0-100)
 * Compares job salary range with user's salary expectations
 */
function calculateSalaryMatch(job, jobPreferences) {
  if (!jobPreferences?.salaryMin && !jobPreferences?.salaryMax) {
    return { score: 75, explanation: 'No salary preference specified' };
  }

  const jobMin = job.salaryMin || 0;
  const jobMax = job.salaryMax || jobMin;

  if (jobMin === 0 && jobMax === 0) {
    return { score: 50, explanation: 'Salary not disclosed' };
  }

  const preferredMin = jobPreferences.salaryMin || 0;
  const preferredMax = jobPreferences.salaryMax || Infinity;

  // Check if job salary range overlaps with preferred range
  if (jobMax >= preferredMin && jobMin <= preferredMax) {
    // Calculate overlap percentage
    const overlapStart = Math.max(jobMin, preferredMin);
    const overlapEnd = Math.min(jobMax, preferredMax);
    const overlapSize = overlapEnd - overlapStart;
    const preferredSize = preferredMax - preferredMin;

    const overlapPercent = (overlapSize / preferredSize) * 100;
    const score = Math.min(100, 70 + (overlapPercent * 0.3));

    return {
      score,
      explanation: `Salary range ${formatSalary(jobMin)}-${formatSalary(jobMax)} matches expectations`
    };
  }

  // Job pays less than minimum
  if (jobMax < preferredMin) {
    const deficit = ((preferredMin - jobMax) / preferredMin) * 100;
    const score = Math.max(0, 70 - deficit);
    return {
      score,
      explanation: `Salary ${formatSalary(jobMax)} below minimum expectation`
    };
  }

  // Job pays more than maximum (not a problem, but might be over-qualified)
  return {
    score: 85,
    explanation: `Salary ${formatSalary(jobMin)}+ exceeds expectations`
  };
}

/**
 * Calculate overall algorithmic score
 */
function calculateAlgorithmicScore(job, userProfile, workExperience, skills, jobPreferences) {
  const skillsMatch = calculateSkillsMatch(job, skills);
  const experienceMatch = calculateExperienceMatch(job, workExperience, jobPreferences);
  const locationMatch = calculateLocationMatch(job, userProfile, jobPreferences);
  const salaryMatch = calculateSalaryMatch(job, jobPreferences);

  // Weighted average: skills 40%, experience 25%, location 20%, salary 15%
  const algorithmicScore =
    (skillsMatch.score * 0.40) +
    (experienceMatch.score * 0.25) +
    (locationMatch.score * 0.20) +
    (salaryMatch.score * 0.15);

  return {
    score: Math.round(algorithmicScore),
    breakdown: {
      skills: {
        score: Math.round(skillsMatch.score),
        matched: skillsMatch.matched,
        missing: skillsMatch.missing
      },
      experience: {
        score: Math.round(experienceMatch.score),
        explanation: experienceMatch.explanation
      },
      location: {
        score: Math.round(locationMatch.score),
        explanation: locationMatch.explanation
      },
      salary: {
        score: Math.round(salaryMatch.score),
        explanation: salaryMatch.explanation
      }
    }
  };
}

// =============================================================================
// AI Scoring (40% weight)
// =============================================================================

/**
 * Calculate AI-based semantic similarity score
 * Uses OpenAI to understand context and cultural fit beyond keywords
 */
async function calculateAIScore(job, userProfile, workExperience, education) {
  try {
    const openai = getOpenAI();

    // Build user context
    const userContext = buildUserContext(userProfile, workExperience, education);
    const jobContext = buildJobContext(job);

    // Use GPT-4 to evaluate the match
    const prompt = `You are a job matching expert. Evaluate how well this candidate matches this job opportunity.

CANDIDATE PROFILE:
${userContext}

JOB OPPORTUNITY:
${jobContext}

Analyze the match based on:
1. Career trajectory and growth alignment
2. Industry experience and domain knowledge
3. Cultural and role fit
4. Career goals alignment
5. Unique value candidate brings

Provide a match score from 0-100 and a brief explanation (max 200 words).

Respond in JSON format:
{
  "score": <number 0-100>,
  "explanation": "<brief explanation>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "concerns": ["<concern 1>", "<concern 2>"]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional recruiter and career advisor.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);

    return {
      score: Math.min(100, Math.max(0, result.score)),
      explanation: result.explanation,
      strengths: result.strengths || [],
      concerns: result.concerns || []
    };

  } catch (error) {
    console.error('AI scoring error:', error);
    // Fallback to neutral score if AI fails
    return {
      score: 50,
      explanation: 'AI analysis unavailable',
      strengths: [],
      concerns: ['AI analysis could not be completed']
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function buildUserContext(profile, workExperience, education) {
  let context = `Name: ${profile.firstName} ${profile.lastName}\n`;
  context += `Current Location: ${profile.location}\n`;
  context += `Headline: ${profile.headline}\n`;

  if (profile.summary) {
    context += `\nSummary:\n${profile.summary}\n`;
  }

  context += `\nWork Experience:\n`;
  workExperience.slice(0, 3).forEach(exp => {
    context += `- ${exp.position} at ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate})\n`;
    if (exp.description) {
      context += `  ${exp.description}\n`;
    }
  });

  if (education.length > 0) {
    context += `\nEducation:\n`;
    education.slice(0, 2).forEach(edu => {
      context += `- ${edu.degree} in ${edu.field} from ${edu.school}\n`;
    });
  }

  return context;
}

function buildJobContext(job) {
  let context = `Job Title: ${job.title}\n`;
  context += `Company: ${job.company}\n`;
  context += `Location: ${job.location}\n`;
  context += `Work Arrangement: ${job.workArrangement}\n`;

  if (job.salaryMin && job.salaryMax) {
    context += `Salary Range: ${formatSalary(job.salaryMin)} - ${formatSalary(job.salaryMax)}\n`;
  }

  if (job.description) {
    context += `\nDescription:\n${job.description}\n`;
  }

  if (job.requiredSkills && job.requiredSkills.length > 0) {
    context += `\nRequired Skills: ${job.requiredSkills.join(', ')}\n`;
  }

  return context;
}

function formatSalary(amount) {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`;
  }
  return `$${amount}`;
}

// =============================================================================
// Main Matching Function
// =============================================================================

/**
 * Calculate complete match score for a job and user profile
 *
 * @param {Object} job - Job object with details
 * @param {Object} userProfile - User profile data
 * @param {Array} workExperience - User's work experience
 * @param {Array} education - User's education
 * @param {Array} skills - User's skills
 * @param {Object} jobPreferences - User's job preferences
 * @param {boolean} enableAI - Whether to enable AI scoring (default: true)
 * @returns {Promise<Object>} Match result with score and breakdown
 */
async function calculateMatchScore(
  job,
  userProfile,
  workExperience = [],
  education = [],
  skills = [],
  jobPreferences = {},
  enableAI = true
) {
  // Calculate algorithmic score (60% weight)
  const algorithmicResult = calculateAlgorithmicScore(
    job,
    userProfile,
    workExperience,
    skills,
    jobPreferences
  );

  let aiResult = null;
  let finalScore;

  if (enableAI) {
    // Calculate AI score (40% weight)
    aiResult = await calculateAIScore(job, userProfile, workExperience, education);

    // Combine scores: 60% algorithmic + 40% AI
    finalScore = Math.round((algorithmicResult.score * 0.6) + (aiResult.score * 0.4));
  } else {
    // Use only algorithmic score
    finalScore = algorithmicResult.score;
  }

  return {
    matchScore: finalScore,
    algorithmicScore: algorithmicResult.score,
    aiScore: aiResult?.score || null,
    breakdown: algorithmicResult.breakdown,
    aiInsights: aiResult ? {
      explanation: aiResult.explanation,
      strengths: aiResult.strengths,
      concerns: aiResult.concerns
    } : null,
    requiredSkills: job.requiredSkills || [],
    missingSkills: algorithmicResult.breakdown.skills.missing,
    recommendations: generateRecommendations(algorithmicResult, aiResult)
  };
}

/**
 * Generate actionable recommendations based on match results
 */
function generateRecommendations(algorithmicResult, aiResult) {
  const recommendations = [];

  // Skills recommendations
  if (algorithmicResult.breakdown.skills.missing.length > 0) {
    recommendations.push(
      `Consider highlighting experience with: ${algorithmicResult.breakdown.skills.missing.slice(0, 3).join(', ')}`
    );
  }

  // Location recommendations
  if (algorithmicResult.breakdown.location.score < 70) {
    recommendations.push('Mention willingness to relocate or discuss remote work options');
  }

  // AI-based recommendations
  if (aiResult && aiResult.concerns.length > 0) {
    aiResult.concerns.slice(0, 2).forEach(concern => {
      recommendations.push(concern);
    });
  }

  return recommendations.slice(0, 5); // Max 5 recommendations
}

// =============================================================================
// Batch Processing
// =============================================================================

/**
 * Calculate match scores for multiple jobs
 * Optimized for batch processing with optional AI scoring
 */
async function batchCalculateMatches(
  jobs,
  userProfile,
  workExperience,
  education,
  skills,
  jobPreferences,
  options = {}
) {
  const { enableAI = true, concurrency = 5, aiThreshold = 70 } = options;

  const results = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);

    const batchPromises = batch.map(async (job) => {
      // Quick algorithmic score first
      const algorithmicResult = calculateAlgorithmicScore(
        job,
        userProfile,
        workExperience,
        skills,
        jobPreferences
      );

      // Only use AI for promising matches to save costs
      const shouldUseAI = enableAI && algorithmicResult.score >= aiThreshold;

      if (shouldUseAI) {
        return calculateMatchScore(
          job,
          userProfile,
          workExperience,
          education,
          skills,
          jobPreferences,
          true
        );
      } else {
        // Return algorithmic-only result
        return {
          matchScore: algorithmicResult.score,
          algorithmicScore: algorithmicResult.score,
          aiScore: null,
          breakdown: algorithmicResult.breakdown,
          aiInsights: null,
          requiredSkills: job.requiredSkills || [],
          missingSkills: algorithmicResult.breakdown.skills.missing,
          recommendations: generateRecommendations(algorithmicResult, null)
        };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);

    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push({
          jobId: batch[index].id,
          ...result.value
        });
      } else {
        console.error(`Failed to calculate match for job ${batch[index].id}:`, result.reason);
        results.push({
          jobId: batch[index].id,
          matchScore: 0,
          error: 'Match calculation failed'
        });
      }
    });
  }

  return results;
}

module.exports = {
  calculateMatchScore,
  batchCalculateMatches,
  calculateAlgorithmicScore,
  calculateAIScore
};
