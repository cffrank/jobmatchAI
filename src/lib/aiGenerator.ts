import { supabase } from './supabase'
import type { GeneratedApplication } from '@/sections/application-generator/types'

/**
 * Call Railway backend API to generate AI-powered resume and cover letter variants
 * Uses OpenAI GPT-4 to create tailored applications based on job requirements
 */
export async function generateApplicationVariants(jobId: string): Promise<GeneratedApplication> {
  try {
    // Get authentication token
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('Please sign in to generate applications')
    }

    // Call the Railway backend API
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const response = await fetch(`${backendUrl}/api/applications/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
      throw new Error(errorData.error || `Failed to generate application: ${response.status}`)
    }

    const data = await response.json()

    if (!data) {
      throw new Error('No data returned from AI generation service')
    }

    // Ensure variants is always an array (fixes crash when backend returns {} or null)
    if (!data.variants || !Array.isArray(data.variants)) {
      data.variants = []
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

    if (errorMessage.includes('Profile not found') || errorMessage.includes('work experience')) {
      throw new Error('Please complete your profile before generating applications')
    }

    if (errorMessage.includes('OpenAI') || errorMessage.includes('500')) {
      throw new Error('AI service temporarily unavailable. Please try again in a moment.')
    }

    // Generic error
    throw new Error(errorMessage || 'Failed to generate application. Please try again.')
  }
}
