import type { GeneratedApplication, ApplicationVariant } from '@/sections/application-generator/types'
import type { User, WorkExperience, Education, Skill } from '@/sections/profile-resume-management/types'
import type { Job } from '@/sections/job-discovery-matching/types'

/**
 * Mock AI generator that creates tailored resume and cover letter variants
 * In production, this would call a Cloud Function that uses OpenAI/Claude API
 */
export async function generateApplicationVariants(
  job: Job,
  user: User,
  workExperience: WorkExperience[],
  education: Education[],
  skills: Skill[]
): Promise<GeneratedApplication> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000))

  const applicationId = `app-${Date.now()}`

  // Generate 3 variants with different strategies
  const variants: ApplicationVariant[] = [
    generateImpactFocusedVariant(job, user, workExperience, education, skills),
    generateKeywordOptimizedVariant(job, user, workExperience, education, skills),
    generateConciseVariant(job, user, workExperience, education, skills)
  ]

  return {
    id: applicationId,
    jobId: job.id,
    jobTitle: job.title,
    company: job.company,
    status: 'draft',
    createdAt: new Date().toISOString(),
    submittedAt: null,
    selectedVariantId: variants[0].id,
    variants,
    editHistory: []
  }
}

function generateImpactFocusedVariant(
  job: Job,
  user: User,
  workExperience: WorkExperience[],
  education: Education[],
  skills: Skill[]
): ApplicationVariant {
  return {
    id: 'variant-impact',
    name: 'Impact-Focused',
    resume: {
      summary: generateSummary(user, job, 'impact'),
      experience: workExperience.slice(0, 3).map(exp => ({
        title: exp.position,
        company: exp.company,
        location: exp.location,
        startDate: formatDate(exp.startDate),
        endDate: exp.current ? 'Present' : formatDate(exp.endDate),
        bullets: exp.accomplishments.slice(0, 4).map(acc =>
          `• ${acc}`
        )
      })),
      skills: extractRelevantSkills(skills, job).map(s => s.name),
      education: education.map(edu => ({
        degree: `${edu.degree} in ${edu.field}`,
        school: edu.school,
        location: edu.location,
        graduation: formatDate(edu.endDate),
        focus: edu.highlights[0]
      }))
    },
    coverLetter: generateCoverLetter(user, job, workExperience, 'impact'),
    aiRationale: [
      'Emphasizes quantifiable achievements and business impact',
      'Highlights metrics and revenue growth that align with role requirements',
      'Tailored summary focuses on leadership and scale matching job level',
      'Experience bullets start with strong action verbs and include specific numbers'
    ]
  }
}

function generateKeywordOptimizedVariant(
  job: Job,
  user: User,
  workExperience: WorkExperience[],
  education: Education[],
  skills: Skill[]
): ApplicationVariant {
  return {
    id: 'variant-keyword',
    name: 'Keyword-Optimized',
    resume: {
      summary: generateSummary(user, job, 'keyword'),
      experience: workExperience.slice(0, 3).map(exp => ({
        title: exp.position,
        company: exp.company,
        location: exp.location,
        startDate: formatDate(exp.startDate),
        endDate: exp.current ? 'Present' : formatDate(exp.endDate),
        bullets: enhanceWithKeywords(exp.accomplishments.slice(0, 4), job.requiredSkills || [])
      })),
      skills: [...extractRelevantSkills(skills, job).map(s => s.name), ...(job.requiredSkills || []).slice(0, 3)].filter((v, i, a) => a.indexOf(v) === i),
      education: education.map(edu => ({
        degree: `${edu.degree} in ${edu.field}`,
        school: edu.school,
        location: edu.location,
        graduation: formatDate(edu.endDate)
      }))
    },
    coverLetter: generateCoverLetter(user, job, workExperience, 'keyword'),
    aiRationale: [
      'Maximizes keyword matches from job description for ATS optimization',
      'Incorporates required skills naturally throughout experience bullets',
      'Skills section expanded to include all job requirements',
      'Optimized for applicant tracking systems and initial screening'
    ]
  }
}

function generateConciseVariant(
  job: Job,
  user: User,
  workExperience: WorkExperience[],
  education: Education[],
  skills: Skill[]
): ApplicationVariant {
  return {
    id: 'variant-concise',
    name: 'Concise',
    resume: {
      summary: generateSummary(user, job, 'concise'),
      experience: workExperience.slice(0, 2).map(exp => ({
        title: exp.position,
        company: exp.company,
        location: exp.location,
        startDate: formatDate(exp.startDate),
        endDate: exp.current ? 'Present' : formatDate(exp.endDate),
        bullets: exp.accomplishments.slice(0, 3).map(acc => `• ${acc}`)
      })),
      skills: extractRelevantSkills(skills, job).slice(0, 8).map(s => s.name),
      education: education.slice(0, 1).map(edu => ({
        degree: `${edu.degree} in ${edu.field}`,
        school: edu.school,
        location: edu.location,
        graduation: formatDate(edu.endDate)
      }))
    },
    coverLetter: generateCoverLetter(user, job, workExperience, 'concise'),
    aiRationale: [
      'Streamlined to one page for roles requiring brevity',
      'Focuses on most recent and relevant experience only',
      'Concise bullet points highlighting key achievements',
      'Ideal for senior roles where less detail is expected'
    ]
  }
}

function generateSummary(user: User, job: Job, style: 'impact' | 'keyword' | 'concise'): string {
  const years = calculateYearsOfExperience(user)
  const jobLevel = 'Mid-level' // experienceLevel not available on Job type
  const skills = job.requiredSkills || []

  if (style === 'impact') {
    const topSkills = skills.slice(0, 2).join(' and ') || 'key technologies'
    return `${jobLevel} ${job.title} with ${years}+ years driving measurable business outcomes in fast-paced environments. Proven track record of ${topSkills} with demonstrated success in cross-functional teams. Passionate about leveraging technology to solve complex challenges and deliver exceptional results.`
  }

  if (style === 'keyword') {
    const keywords = skills.slice(0, 4).join(', ') || 'relevant technologies'
    const moreSkills = skills.slice(4, 7).join(', ') || 'various domains'
    return `Experienced ${job.title} specializing in ${keywords}. Strong background in product development with expertise across ${moreSkills}. Track record of successful project delivery and team collaboration in technology sector.`
  }

  // concise
  const topThreeSkills = skills.slice(0, 3).join(', ') || 'relevant skills'
  return `${jobLevel} ${job.title} with ${years}+ years of experience. Expertise in ${topThreeSkills}. Proven ability to deliver results in dynamic environments.`
}

function generateCoverLetter(
  user: User,
  job: Job,
  workExperience: WorkExperience[],
  style: 'impact' | 'keyword' | 'concise'
): string {
  const mostRecentRole = workExperience[0]
  const skills = job.requiredSkills || []
  const topTwoSkills = skills.slice(0, 2).join(' and ') || 'relevant technologies'

  return `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. With my background in ${mostRecentRole.position} and proven expertise in ${topTwoSkills}, I am excited about the opportunity to contribute to your team.

${style === 'impact'
  ? `In my current role at ${mostRecentRole.company}, I have ${mostRecentRole.accomplishments[0]?.toLowerCase() || 'driven significant impact'}. This experience has prepared me to take on the challenges outlined in your job description${skills.length >= 2 ? `, particularly around ${skills[0]} and ${skills[1]}` : ''}.`
  : `My experience includes ${mostRecentRole.accomplishments.slice(0, 2).map(a => a.toLowerCase()).join(', and ')}. These accomplishments demonstrate my capability to excel in the ${job.title} role.`
}

${skills.slice(0, 3).map(skill =>
  `I bring strong expertise in ${skill}, having applied this skill across multiple projects to drive successful outcomes.`
).join(' ')}

I am particularly drawn to ${job.company} because of your innovative approach and collaborative culture. I am confident that my skills and experience make me a strong fit for this role, and I look forward to the opportunity to discuss how I can contribute to your team's success.

Thank you for your consideration.

Best regards,
${user.firstName} ${user.lastName}`
}

function extractRelevantSkills(skills: Skill[], job: Job): Skill[] {
  const requiredSkills = job.requiredSkills || []
  // Sort by relevance to job (matching required skills first, then by endorsements)
  return skills
    .map(skill => ({
      ...skill,
      relevance: requiredSkills.some(req =>
        req.toLowerCase().includes(skill.name.toLowerCase()) ||
        skill.name.toLowerCase().includes(req.toLowerCase())
      ) ? 100 : skill.endorsements
    }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 12)
}

function enhanceWithKeywords(bullets: string[], keywords: string[]): string[] {
  return bullets.map((bullet, index) => {
    // Add a relevant keyword to each bullet if possible
    if (index < keywords.length && !bullet.toLowerCase().includes(keywords[index].toLowerCase())) {
      return `• ${bullet.replace(/^([^.]+)/, `$1 leveraging ${keywords[index]}`)}`
    }
    return `• ${bullet}`
  })
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Present'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function calculateYearsOfExperience(_user: User): number {
  // Simple heuristic - in real app, would calculate from work experience
  return 8
}
