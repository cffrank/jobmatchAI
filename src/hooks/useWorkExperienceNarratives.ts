import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type WorkExperienceNarrativeRow = Database['public']['Tables']['work_experience_narratives']['Row']

/**
 * Hook to manage work experience narratives in Supabase
 */
export function useWorkExperienceNarratives() {
  const { user } = useAuth()
  const userId = user?.id

  const [narratives, setNarratives] = useState<WorkExperienceNarrativeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch narratives
  useEffect(() => {
    if (!userId) {
      setNarratives([])
      setLoading(false)
      return
    }

    let subscribed = true

    const fetchNarratives = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('work_experience_narratives')
          .select('*')
          .eq('user_id', userId)

        if (fetchError) throw fetchError

        if (subscribed && data) {
          setNarratives(data)
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

    fetchNarratives()

    // Set up real-time subscription
    const channel = supabase
      .channel(`work_experience_narratives:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_experience_narratives',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNarratives((current) => [...current, payload.new as WorkExperienceNarrativeRow])
          } else if (payload.eventType === 'UPDATE') {
            setNarratives((current) =>
              current.map((narrative) =>
                narrative.id === payload.new.id
                  ? (payload.new as WorkExperienceNarrativeRow)
                  : narrative
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setNarratives((current) => current.filter((narrative) => narrative.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscribed = false
      channel.unsubscribe()
    }
  }, [userId])

  /**
   * Get narrative for specific work experience
   */
  const getNarrativeByWorkExperienceId = (workExperienceId: string): WorkExperienceNarrativeRow | null => {
    return narratives.find((n) => n.work_experience_id === workExperienceId) || null
  }

  /**
   * Add or update narrative for work experience
   */
  const upsertNarrative = async (workExperienceId: string, narrative: string) => {
    if (!userId) throw new Error('User not authenticated')

    // Check if narrative already exists
    const existing = narratives.find((n) => n.work_experience_id === workExperienceId)

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('work_experience_narratives')
        .update({ narrative })
        .eq('id', existing.id)
        .eq('user_id', userId)

      if (updateError) throw updateError
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('work_experience_narratives')
        .insert({
          work_experience_id: workExperienceId,
          user_id: userId,
          narrative,
        })

      if (insertError) throw insertError
    }
  }

  /**
   * Delete narrative
   */
  const deleteNarrative = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { error: deleteError } = await supabase
      .from('work_experience_narratives')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) throw deleteError
  }

  return {
    narratives,
    loading,
    error,
    getNarrativeByWorkExperienceId,
    upsertNarrative,
    deleteNarrative,
  }
}
