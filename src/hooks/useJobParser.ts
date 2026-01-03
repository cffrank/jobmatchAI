import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { ParsedJobResult } from '@/types/job-parser'

/**
 * Hook for parsing unstructured job posting text into structured data
 *
 * Calls the backend AI service to extract job details from raw text
 * (copied from LinkedIn, Indeed, company websites, etc.)
 */
export function useJobParser() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseJobText = async (text: string): Promise<ParsedJobResult | null> => {
    if (!user) {
      setError('You must be logged in to parse jobs')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      // Get current session token from Supabase (consistent with other hooks)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
      const response = await fetch(`${apiUrl}/api/jobs/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse job' }))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const result: ParsedJobResult = await response.json()
      setLoading(false)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse job'
      setError(message)
      setLoading(false)
      return null
    }
  }

  return {
    parseJobText,
    loading,
    error,
  }
}
