/**
 * Job parsing types for frontend
 * These match the backend types in workers/api/types.ts
 */

/**
 * Extracted job data from unstructured text
 */
export interface ParsedJobData {
  title: string
  company: string
  location: string
  workArrangement: 'Remote' | 'Hybrid' | 'On-site' | 'Unknown'
  salaryMin?: number
  salaryMax?: number
  description: string
  url?: string
  experienceLevel?: string
  requiredSkills: string[]
  preferredSkills: string[]
}

/**
 * Metadata about the parsing process
 */
export interface ParseMetadata {
  confidence: number // 0-100 score
  aiModel: 'workers-ai' | 'openai'
  warnings: string[]
}

/**
 * Complete result from job text parsing
 */
export interface ParsedJobResult {
  job: ParsedJobData
  metadata: ParseMetadata
}
