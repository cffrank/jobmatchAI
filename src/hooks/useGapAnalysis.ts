import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type GapAnalysisRow = Database['public']['Tables']['gap_analyses']['Row']
type GapAnalysisAnswerRow = Database['public']['Tables']['gap_analysis_answers']['Row']

export interface GapAnalysisWithAnswers extends GapAnalysisRow {
  answers: GapAnalysisAnswerRow[]
}

/**
 * Hook to manage gap analysis data from Supabase
 */
export function useGapAnalysis() {
  const { user } = useAuth()
  const userId = user?.id

  const [gapAnalyses, setGapAnalyses] = useState<GapAnalysisWithAnswers[]>([])
  const [latestGapAnalysis, setLatestGapAnalysis] = useState<GapAnalysisWithAnswers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

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

        // Fetch all gap analyses for user
        const { data: analysesData, error: analysesError } = await supabase
          .from('gap_analyses')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (analysesError) throw analysesError

        if (!analysesData || analysesData.length === 0) {
          if (subscribed) {
            setGapAnalyses([])
            setLatestGapAnalysis(null)
            setLoading(false)
          }
          return
        }

        // Fetch answers for each analysis
        const analysesWithAnswers: GapAnalysisWithAnswers[] = await Promise.all(
          analysesData.map(async (analysis) => {
            const { data: answersData, error: answersError } = await supabase
              .from('gap_analysis_answers')
              .select('*')
              .eq('gap_analysis_id', analysis.id)
              .order('question_id', { ascending: true })

            if (answersError) {
              console.error('Error fetching answers:', answersError)
              return { ...analysis, answers: [] }
            }

            return { ...analysis, answers: answersData || [] }
          })
        )

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
  }, [userId])

  /**
   * Get gap analysis by ID
   */
  const getGapAnalysisById = async (id: string): Promise<GapAnalysisWithAnswers | null> => {
    if (!userId) throw new Error('User not authenticated')

    try {
      const { data: analysisData, error: analysisError } = await supabase
        .from('gap_analyses')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (analysisError) throw analysisError

      const { data: answersData, error: answersError } = await supabase
        .from('gap_analysis_answers')
        .select('*')
        .eq('gap_analysis_id', id)
        .order('question_id', { ascending: true })

      if (answersError) throw answersError

      return {
        ...analysisData,
        answers: answersData || [],
      }
    } catch (err) {
      console.error('Error fetching gap analysis:', err)
      throw err
    }
  }

  /**
   * Delete gap analysis
   */
  const deleteGapAnalysis = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { error: deleteError } = await supabase
      .from('gap_analyses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) throw deleteError

    // Update local state
    setGapAnalyses((prev) => prev.filter((analysis) => analysis.id !== id))
    if (latestGapAnalysis?.id === id) {
      setLatestGapAnalysis(gapAnalyses.find((a) => a.id !== id) || null)
    }
  }

  return {
    gapAnalyses,
    latestGapAnalysis,
    loading,
    error,
    getGapAnalysisById,
    deleteGapAnalysis,
  }
}
