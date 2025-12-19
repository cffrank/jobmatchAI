import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'
import type { GeneratedApplication } from '@/sections/application-generator/types'

/**
 * Call Cloud Function to generate AI-powered resume and cover letter variants
 * This replaces the mock generator with actual OpenAI integration
 */
export async function generateApplicationVariants(jobId: string): Promise<GeneratedApplication> {
  try {
    // Call the Cloud Function
    const generateApplication = httpsCallable<
      { jobId: string },
      GeneratedApplication
    >(functions, 'generateApplication')

    const result = await generateApplication({ jobId })

    return result.data

  } catch (error: any) {
    console.error('Cloud Function error:', error)

    // Provide helpful error messages
    if (error.code === 'unauthenticated') {
      throw new Error('Please sign in to generate applications')
    }

    if (error.code === 'not-found') {
      throw new Error('Job or profile not found. Please try again.')
    }

    if (error.code === 'failed-precondition') {
      throw new Error(error.message || 'Please complete your profile before generating applications')
    }

    if (error.code === 'resource-exhausted') {
      throw new Error('AI service temporarily unavailable. Please try again in a moment.')
    }

    // Generic error
    throw new Error(
      error.message || 'Failed to generate application. Please try again.'
    )
  }
}
