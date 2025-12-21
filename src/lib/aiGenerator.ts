import { supabase } from './supabase'
import type { GeneratedApplication } from '@/sections/application-generator/types'

/**
 * Call Supabase Edge Function to generate AI-powered resume and cover letter variants
 * Uses OpenAI GPT-4 to create tailored applications based on job requirements
 */
export async function generateApplicationVariants(jobId: string): Promise<GeneratedApplication> {
  try {
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke<GeneratedApplication & { applicationId: string }>('generate-application', {
      body: { jobId },
    })

    if (error) {
      console.error('Edge Function error:', error)
      throw error
    }

    if (!data) {
      throw new Error('No data returned from AI generation service')
    }

    return data

  } catch (error: unknown) {
    console.error('AI generation error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Provide helpful error messages based on error content
    if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
      throw new Error('Please sign in to generate applications')
    }

    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      throw new Error('Job or profile not found. Please try again.')
    }

    if (errorMessage.includes('Profile not found')) {
      throw new Error('Please complete your profile before generating applications')
    }

    if (errorMessage.includes('OpenAI') || errorMessage.includes('500')) {
      throw new Error('AI service temporarily unavailable. Please try again in a moment.')
    }

    // Generic error
    throw new Error(errorMessage || 'Failed to generate application. Please try again.')
  }
}
