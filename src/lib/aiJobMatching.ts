/**
 * AI-Powered Job Matching Service
 *
 * Calls the backend to perform semantic job compatibility analysis using GPT-4.
 *
 * This replaces the old keyword-based matching with proper semantic understanding:
 * - Semantically matches job titles with past experience
 * - Semantically matches requirements with experience descriptions
 * - Understands domain relevance (IT vs Medical vs Business)
 */

import type { JobCompatibilityAnalysis } from '@/sections/job-discovery-matching/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * Request AI-powered semantic analysis for a job
 *
 * @param jobId - ID of the job to analyze
 * @param authToken - User's authentication token
 * @returns Full 10-dimension compatibility analysis
 */
export async function analyzeJobWithAI(
  jobId: string,
  authToken: string
): Promise<JobCompatibilityAnalysis> {
  try {
    const response = await fetch(`${API_URL}/api/jobs/${jobId}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    const analysis: JobCompatibilityAnalysis = await response.json()
    console.log(`[AI Matching] Job ${jobId} analyzed: ${analysis.overallScore}% (${analysis.recommendation})`)

    return analysis
  } catch (error) {
    console.error('[AI Matching] Analysis failed:', error)
    throw error
  }
}

/**
 * Batch analyze multiple jobs with AI
 *
 * @param jobIds - Array of job IDs to analyze
 * @param authToken - User's authentication token
 * @param onProgress - Optional callback for progress updates
 * @returns Array of compatibility analyses
 */
export async function batchAnalyzeJobs(
  jobIds: string[],
  authToken: string,
  onProgress?: (completed: number, total: number) => void
): Promise<JobCompatibilityAnalysis[]> {
  const results: JobCompatibilityAnalysis[] = []

  for (let i = 0; i < jobIds.length; i++) {
    try {
      const analysis = await analyzeJobWithAI(jobIds[i], authToken)
      results.push(analysis)

      if (onProgress) {
        onProgress(i + 1, jobIds.length)
      }

      // Small delay to avoid rate limiting
      if (i < jobIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.error(`[AI Matching] Failed to analyze job ${jobIds[i]}:`, error)
      // Continue with other jobs even if one fails
    }
  }

  return results
}
