import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export interface GapAnalysisAnswer {
  id: string
  gap_analysis_id: string
  user_id: string
  question_id: number
  priority: string
  gap_addressed: string
  question: string
  context: string
  expected_outcome: string
  answer: string | null
  created_at: string
  updated_at: string
}

export interface GapAnalysis {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  gap_count: number
  red_flag_count: number
  urgency: string
  overall_assessment: string
  identified_gaps_and_flags: unknown[]
  next_steps: unknown
  answers: GapAnalysisAnswer[]
}

/**
 * Hook to manage gap analysis data from Workers API
 */
export function useGapAnalysis() {
  const { user } = useAuth()
  const userId = user?.id

  const [gapAnalyses, setGapAnalyses] = useState<GapAnalysis[]>([])
  const [latestGapAnalysis, setLatestGapAnalysis] = useState<GapAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const backendUrl = import.meta.env.VITE_API_URL

  // Fetch gap analyses
  useEffect(() => {
    if (!userId) {
      setGapAnalyses([])
      setLatestGapAnalysis(null)
      setLoading(false)
      return
    }

    let subscribed = true

    const fetchGapAnalyses = async () => {
      try {
        setLoading(true)

        // Get JWT token for authentication
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.access_token) {
          throw new Error('No authentication token available')
        }

        // Fetch all gap analyses for user from Workers API
        const response = await fetch(`${backendUrl}/api/gap-analyses`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch gap analyses: ${response.statusText}`)
        }

        const analysesWithAnswers: GapAnalysis[] = await response.json()

        if (subscribed) {
          setGapAnalyses(analysesWithAnswers)
          setLatestGapAnalysis(analysesWithAnswers[0] || null)
          setError(null)
        }
      } catch (err) {
        if (subscribed) {
          setError(err as Error)
        }
      } finally {
        if (subscribed) {
          setLoading(false)
        }
      }
    }

    fetchGapAnalyses()

    return () => {
      subscribed = false
    }
  }, [userId, backendUrl])

  /**
   * Get gap analysis by ID
   */
  const getGapAnalysisById = async (id: string): Promise<GapAnalysis | null> => {
    if (!userId) throw new Error('User not authenticated')

    try {
      // Get JWT token for authentication
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`${backendUrl}/api/gap-analyses/${id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch gap analysis: ${response.statusText}`)
      }

      const analysis: GapAnalysis = await response.json()
      return analysis
    } catch (err) {
      console.error('Error fetching gap analysis:', err)
      throw err
    }
  }

  /**
   * Update answer to a gap analysis question
   */
  const updateAnswer = async (analysisId: string, questionId: number, answer: string) => {
    if (!userId) throw new Error('User not authenticated')

    try {
      // Get JWT token for authentication
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`${backendUrl}/api/gap-analyses/${analysisId}/answer`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question_id: questionId, answer }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update answer: ${response.statusText}`)
      }

      // Update local state
      setGapAnalyses((prev) =>
        prev.map((analysis) => {
          if (analysis.id === analysisId) {
            return {
              ...analysis,
              answers: analysis.answers.map((a) =>
                a.question_id === questionId ? { ...a, answer, updated_at: new Date().toISOString() } : a
              ),
              updated_at: new Date().toISOString(),
            }
          }
          return analysis
        })
      )

      // Update latest if needed
      if (latestGapAnalysis?.id === analysisId) {
        setLatestGapAnalysis((prev) =>
          prev
            ? {
                ...prev,
                answers: prev.answers.map((a) =>
                  a.question_id === questionId ? { ...a, answer, updated_at: new Date().toISOString() } : a
                ),
                updated_at: new Date().toISOString(),
              }
            : null
        )
      }

      return true
    } catch (err) {
      console.error('Error updating answer:', err)
      throw err
    }
  }

  /**
   * Delete gap analysis
   */
  const deleteGapAnalysis = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    try {
      // Get JWT token for authentication
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`${backendUrl}/api/gap-analyses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to delete gap analysis: ${response.statusText}`)
      }

      // Update local state
      setGapAnalyses((prev) => prev.filter((analysis) => analysis.id !== id))
      if (latestGapAnalysis?.id === id) {
        setLatestGapAnalysis(gapAnalyses.find((a) => a.id !== id) || null)
      }

      return true
    } catch (err) {
      console.error('Error deleting gap analysis:', err)
      throw err
    }
  }

  return {
    gapAnalyses,
    latestGapAnalysis,
    loading,
    error,
    getGapAnalysisById,
    updateAnswer,
    deleteGapAnalysis,
  }
}
