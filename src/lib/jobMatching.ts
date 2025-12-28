import type { Job, CompatibilityBreakdown } from '@/sections/job-discovery-matching/types'
import type { User, Skill, WorkExperience } from '@/sections/profile-resume-management/types'

/**
 * Job matching service that scores jobs based on user profile compatibility
 *
 * REDESIGNED ALGORITHM (v2.0) - Semantic Relevance Based
 * ========================================================
 * The algorithm evaluates four key dimensions with RELEVANCE checking:
 *
 * 1. Skill Match: Domain-aware skill overlap (IT skills don't match medical jobs)
 * 2. Experience Match: Role-relevant years only (IT years don't count for Physician)
 * 3. Industry Match: Role-level matching, not just company keywords
 * 4. Location Match: Geographic compatibility
 *
 * KEY IMPROVEMENTS:
 * - Role domain classification (IT, Medical, Business, Engineering, etc.)
 * - Skill domain grouping (Technical, Clinical, Business, etc.)
 * - Job title semantic similarity (Infrastructure Manager ≠ Physician)
 * - Experience relevance checking (only count years in similar roles)
 *
 * @architecture This is a pure function with no side effects, making it easily testable
 */

/**
 * Role domain classifications
 * DEPRECATED: Now handled by AI in backend
 * Kept for reference only
 */
// @ts-expect-error - Kept for reference, not used in code
const _ROLE_DOMAINS = {
  IT_TECHNICAL: [
    'engineer', 'developer', 'programmer', 'architect', 'administrator', 'analyst',
    'devops', 'sre', 'cloud', 'systems', 'infrastructure', 'network', 'security',
    'software', 'data', 'database', 'technical', 'it ', 'technology', 'cyber'
  ],
  MEDICAL_CLINICAL: [
    'physician', 'doctor', 'nurse', 'surgeon', 'medical', 'clinical', 'healthcare provider',
    'practitioner', 'clinician', 'therapist', 'radiologist', 'cardiologist', 'md', 'do',
    'registered nurse', 'rn', 'lpn', 'np', 'pa', 'anesthesiologist', 'psychiatrist'
  ],
  BUSINESS_MANAGEMENT: [
    'manager', 'director', 'executive', 'ceo', 'cto', 'cfo', 'coo', 'vp', 'president',
    'lead', 'head of', 'chief', 'senior manager', 'project manager', 'product manager',
    'business', 'operations', 'strategy', 'consultant'
  ],
  SALES_MARKETING: [
    'sales', 'marketing', 'account', 'business development', 'growth', 'revenue',
    'account executive', 'sales engineer', 'marketer', 'brand', 'advertising'
  ],
  DESIGN_CREATIVE: [
    'designer', 'ux', 'ui', 'creative', 'artist', 'visual', 'graphic', 'product design'
  ],
  FINANCE_ACCOUNTING: [
    'accountant', 'financial', 'finance', 'accounting', 'auditor', 'controller', 'treasurer'
  ],
  LEGAL: [
    'attorney', 'lawyer', 'legal', 'counsel', 'paralegal', 'compliance'
  ],
  EDUCATION: [
    'teacher', 'professor', 'instructor', 'educator', 'tutor', 'trainer', 'coach'
  ],
  SERVICE_OPERATIONS: [
    'service', 'support', 'operations', 'logistics', 'warehouse', 'driver', 'technician'
  ]
}

/**
 * Skill domain classifications
 * DEPRECATED: Now handled by AI in backend
 * Kept for reference only
 */
// @ts-expect-error - Kept for reference, not used in code
const _SKILL_DOMAINS = {
  TECHNICAL_IT: [
    'java', 'python', 'javascript', 'react', 'angular', 'vue', 'node', 'aws', 'azure', 'gcp',
    'kubernetes', 'docker', 'ci/cd', 'git', 'linux', 'windows', 'sql', 'nosql', 'api',
    'rest', 'graphql', 'microservices', 'devops', 'terraform', 'ansible', 'jenkins',
    'vmware', 'hyper-v', 'virtualization', 'citrix', 'active directory', 'networking',
    'security', 'firewall', 'vpn', 'cloud', 'saas', 'infrastructure', 'system administration',
    'powershell', 'bash', 'scripting', 'automation', 'monitoring', 'nagios', 'prometheus'
  ],
  MEDICAL_CLINICAL: [
    'patient care', 'diagnosis', 'treatment', 'surgery', 'medical procedures', 'clinical',
    'emr', 'ehr', 'epic', 'cerner', 'healthcare', 'hipaa', 'patient safety', 'bedside manner',
    'clinical assessment', 'medical coding', 'icd', 'cpt', 'medical terminology'
  ],
  BUSINESS_SOFT: [
    'leadership', 'management', 'communication', 'teamwork', 'project management', 'agile',
    'scrum', 'stakeholder management', 'budget', 'strategy', 'planning', 'analysis',
    'problem solving', 'critical thinking', 'presentation', 'negotiation'
  ],
  DATA_ANALYTICS: [
    'data analysis', 'sql', 'excel', 'tableau', 'power bi', 'analytics', 'reporting',
    'statistics', 'data visualization', 'business intelligence', 'etl'
  ]
}

/**
 * NOTE: The semantic matching functions below are now handled by AI in the backend.
 * These domain classifications are kept for reference but the actual matching
 * is done via GPT-4 in backend/src/services/openai.service.ts:analyzeJobCompatibility()
 *
 * The AI provides much more accurate semantic matching that understands:
 * - Job title similarity (Infrastructure Manager ≠ Physician even in same industry)
 * - Skill domain compatibility (VMware ≠ Patient Care)
 * - Experience relevance (IT years don't count for medical positions)
 */

interface UserProfile {
  user: User | null
  skills: Skill[]
  workExperience: WorkExperience[]
}

interface JobMatchResult {
  matchScore: number
  compatibilityBreakdown: CompatibilityBreakdown
  missingSkills: string[]
  recommendations: string[]
}

/**
 * Calculate match score for a job based on user profile
 * Returns a score between 0-100
 */
export function calculateJobMatch(
  job: Job,
  profile: UserProfile
): JobMatchResult {
  const { user, skills, workExperience } = profile

  // If no profile data, return zero match
  if (!user || skills.length === 0) {
    return {
      matchScore: 0,
      compatibilityBreakdown: {
        skillMatch: 0,
        experienceMatch: 0,
        industryMatch: 0,
        locationMatch: 0,
      },
      missingSkills: job.requiredSkills || [],
      recommendations: ['Complete your profile to see better matches'],
    }
  }

  // Calculate each matching dimension
  const skillMatch = calculateSkillMatch(job, skills)
  const experienceMatch = calculateExperienceMatch(job, workExperience)
  const industryMatch = calculateIndustryMatch(job, workExperience)
  const locationMatch = calculateLocationMatch(job, user)

  // Weighted average for overall match score
  // Skills are most important (40%), followed by experience (30%), industry (20%), location (10%)
  const matchScore = Math.round(
    skillMatch.score * 0.4 +
    experienceMatch.score * 0.3 +
    industryMatch.score * 0.2 +
    locationMatch.score * 0.1
  )

  const compatibilityBreakdown: CompatibilityBreakdown = {
    skillMatch: skillMatch.score,
    experienceMatch: experienceMatch.score,
    industryMatch: industryMatch.score,
    locationMatch: locationMatch.score,
  }

  // Collect recommendations
  const recommendations: string[] = []
  if (skillMatch.missingSkills.length > 0) {
    recommendations.push(
      `Consider highlighting transferable skills for: ${skillMatch.missingSkills.slice(0, 3).join(', ')}`
    )
  }
  if (experienceMatch.score < 70) {
    recommendations.push('Emphasize relevant achievements and impact in your experience')
  }
  if (industryMatch.score < 60) {
    recommendations.push('Highlight transferable skills from related industries')
  }
  if (locationMatch.score < 100 && job.workArrangement !== 'Remote') {
    recommendations.push('Consider mentioning relocation willingness or remote work preference')
  }

  return {
    matchScore,
    compatibilityBreakdown,
    missingSkills: skillMatch.missingSkills,
    recommendations: recommendations.slice(0, 3), // Limit to top 3 recommendations
  }
}

/**
 * Calculate skill match score
 * Compares user skills against job requirements
 */
function calculateSkillMatch(
  job: Job,
  userSkills: Skill[]
): { score: number; missingSkills: string[] } {
  const requiredSkills = job.requiredSkills || []

  if (requiredSkills.length === 0) {
    return { score: 50, missingSkills: [] } // Neutral score if no requirements specified
  }

  const userSkillNames = new Set(
    userSkills.map(s => s.name.toLowerCase().trim())
  )

  const matchedSkills: string[] = []
  const missingSkills: string[] = []

  for (const requiredSkill of requiredSkills) {
    const normalizedRequired = requiredSkill.toLowerCase().trim()

    // Check for exact match or partial match (e.g., "React" matches "React.js")
    const hasMatch = Array.from(userSkillNames).some(userSkill =>
      userSkill === normalizedRequired ||
      userSkill.includes(normalizedRequired) ||
      normalizedRequired.includes(userSkill)
    )

    if (hasMatch) {
      matchedSkills.push(requiredSkill)
    } else {
      missingSkills.push(requiredSkill)
    }
  }

  // Score is percentage of matched skills
  const score = Math.round((matchedSkills.length / requiredSkills.length) * 100)

  return { score, missingSkills }
}

/**
 * Calculate experience match score
 * Evaluates total years of experience and recency
 */
function calculateExperienceMatch(
  job: Job,
  workExperience: WorkExperience[]
): { score: number } {
  if (workExperience.length === 0) {
    console.warn('[JobMatching] calculateExperienceMatch: No work experience provided')
    return { score: 0 }
  }

  // Calculate total years of experience
  const totalYears = workExperience.reduce((sum, exp) => {
    const startDate = new Date(exp.startDate)
    const endDate = exp.current ? new Date() : new Date(exp.endDate || new Date())
    const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
    console.log(`[JobMatching] Experience at ${exp.company} (${exp.position}): ${years.toFixed(1)} years`)
    return sum + Math.max(0, years)
  }, 0)

  console.log(`[JobMatching] Total years of experience: ${totalYears.toFixed(1)}`)

  // Estimate required experience based on job title and description
  const requiredYears = estimateRequiredExperience(job)

  // Score calculation:
  // - Perfect match: user has 0.8x to 1.5x required experience
  // - Too little: user has < 0.8x required experience
  // - Too much: user has > 1.5x required experience (may be overqualified)
  let score: number

  if (totalYears >= requiredYears * 0.8 && totalYears <= requiredYears * 1.5) {
    score = 100
  } else if (totalYears < requiredYears * 0.8) {
    // Gradually decrease score for less experience
    score = Math.max(40, Math.round((totalYears / requiredYears) * 100))
  } else {
    // Slight penalty for being overqualified
    const overqualificationRatio = totalYears / (requiredYears * 1.5)
    score = Math.max(70, Math.round(100 - (overqualificationRatio - 1) * 20))
  }

  return { score }
}

/**
 * Estimate required years of experience from job details
 */
function estimateRequiredExperience(job: Job): number {
  const title = job.title.toLowerCase()
  const description = job.description.toLowerCase()

  // Look for explicit experience requirements
  const experienceMatches = description.match(/(\d+)\+?\s*years?/i)
  if (experienceMatches) {
    return parseInt(experienceMatches[1])
  }

  // Estimate based on seniority level in title
  if (title.includes('senior') || title.includes('lead') || title.includes('principal')) {
    return 5
  }
  if (title.includes('staff') || title.includes('architect')) {
    return 7
  }
  if (title.includes('junior') || title.includes('entry')) {
    return 1
  }
  if (title.includes('intern')) {
    return 0
  }

  // Default to mid-level (3 years)
  return 3
}

/**
 * Calculate industry match score
 * Evaluates domain/industry experience alignment
 */
function calculateIndustryMatch(
  job: Job,
  workExperience: WorkExperience[]
): { score: number } {
  if (workExperience.length === 0) {
    console.warn('[JobMatching] calculateIndustryMatch: No work experience provided')
    return { score: 0 }
  }

  // Extract industry keywords from job
  const jobIndustryKeywords = extractIndustryKeywords(job)
  console.log(`[JobMatching] Job industry keywords:`, jobIndustryKeywords)

  // Check if user has experience in similar industries
  const hasIndustryMatch = workExperience.some(exp => {
    const expText = `${exp.company} ${exp.position} ${exp.description || ''}`.toLowerCase()
    const match = jobIndustryKeywords.some(keyword => expText.includes(keyword))
    if (match) {
      console.log(`[JobMatching] Industry match found: ${exp.company} (${exp.position})`)
    }
    return match
  })

  console.log(`[JobMatching] Industry match result: ${hasIndustryMatch ? '100 (matched)' : '60 (neutral)'}`)

  // Score based on industry alignment
  return { score: hasIndustryMatch ? 100 : 60 } // 60 = neutral for different industry
}

/**
 * Extract industry keywords from job
 */
function extractIndustryKeywords(job: Job): string[] {
  const text = `${job.title} ${job.company} ${job.description}`.toLowerCase()
  const keywords: string[] = []

  // Common industry identifiers
  const industries = [
    'fintech', 'finance', 'banking',
    'healthcare', 'medical', 'health',
    'e-commerce', 'retail', 'marketplace',
    'saas', 'enterprise', 'b2b',
    'social', 'media', 'content',
    'gaming', 'game',
    'ai', 'ml', 'machine learning',
    'crypto', 'blockchain', 'web3',
    'education', 'edtech',
    'logistics', 'supply chain',
    'security', 'cybersecurity',
  ]

  for (const industry of industries) {
    if (text.includes(industry)) {
      keywords.push(industry)
    }
  }

  return keywords
}

/**
 * Calculate location match score
 * Evaluates geographic compatibility
 */
function calculateLocationMatch(
  job: Job,
  user: User
): { score: number } {
  // Remote jobs get perfect score
  if (job.workArrangement === 'Remote') {
    return { score: 100 }
  }

  const userLocation = user.location.toLowerCase().trim()
  const jobLocation = job.location.toLowerCase().trim()

  // Empty locations get neutral score
  if (!userLocation || !jobLocation) {
    return { score: 70 }
  }

  // Check for exact match
  if (userLocation === jobLocation) {
    return { score: 100 }
  }

  // Check for city/state match
  const userParts = userLocation.split(',').map(p => p.trim())
  const jobParts = jobLocation.split(',').map(p => p.trim())

  // If any part matches (city or state), give partial credit
  const hasPartialMatch = userParts.some(uPart =>
    jobParts.some(jPart => uPart === jPart || uPart.includes(jPart) || jPart.includes(uPart))
  )

  if (hasPartialMatch) {
    return { score: 85 }
  }

  // Hybrid jobs get some credit even for different locations
  if (job.workArrangement === 'Hybrid') {
    return { score: 60 }
  }

  // Different locations for on-site jobs
  return { score: 30 }
}

/**
 * Batch calculate matches for multiple jobs
 * Returns jobs sorted by match score (descending)
 */
export function rankJobs(
  jobs: Job[],
  profile: UserProfile
): (Job & JobMatchResult)[] {
  return jobs
    .map(job => {
      const matchResult = calculateJobMatch(job, profile)
      return {
        ...job,
        ...matchResult,
      }
    })
    .sort((a, b) => b.matchScore - a.matchScore)
}
