import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// Get backend URL from environment
const BACKEND_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

// Frontend types (camelCase)
export interface WorkExperienceNarrative {
  id: string
  workExperienceId: string
  userId: string
  narrative: string
  createdAt: string
  updatedAt: string
}

/**
 * Hook to manage work experience narratives via Workers/Express API
 */
export function useWorkExperienceNarratives() {
  const { user } = useAuth()
  const userId = user?.id

  const [narratives, setNarratives] = useState<WorkExperienceNarrative[]>([])
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

        // Get JWT token for authentication
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          throw new Error('No authentication token available')
        }

        const response = await fetch(`${BACKEND_URL}/api/profile/work-experience-narratives`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch narratives: ${response.statusText}`)
        }

        const { narratives: fetchedNarratives } = await response.json()

        if (subscribed && fetchedNarratives) {
          setNarratives(fetchedNarratives)
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

    // Set up real-time subscription for narratives (read-only)
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
          // Transform database fields (snake_case) to frontend format (camelCase)
          if (payload.eventType === 'INSERT') {
            const newNarrative: WorkExperienceNarrative = {
              id: payload.new.id,
              workExperienceId: payload.new.work_experience_id,
              userId: payload.new.user_id,
              narrative: payload.new.narrative,
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at,
            }
            setNarratives((current) => [...current, newNarrative])
          } else if (payload.eventType === 'UPDATE') {
            const updatedNarrative: WorkExperienceNarrative = {
              id: payload.new.id,
              workExperienceId: payload.new.work_experience_id,
              userId: payload.new.user_id,
              narrative: payload.new.narrative,
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at,
            }
            setNarratives((current) =>
              current.map((narrative) =>
                narrative.id === updatedNarrative.id ? updatedNarrative : narrative
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
  const getNarrativeByWorkExperienceId = (workExperienceId: string): WorkExperienceNarrative | null => {
    return narratives.find((n) => n.workExperienceId === workExperienceId) || null
  }

  /**
   * Add or update narrative for work experience via Workers/Express API
   */
  const upsertNarrative = async (workExperienceId: string, narrative: string) => {
    if (!userId) throw new Error('User not authenticated')

    // Get JWT token for authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    const response = await fetch(`${BACKEND_URL}/api/profile/work-experience-narratives`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workExperienceId,
        narrative,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(errorData.message || 'Failed to upsert narrative')
    }

    const result = await response.json()
    return result
  }

  /**
   * Delete narrative via Workers/Express API
   */
  const deleteNarrative = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    // Get JWT token for authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    const response = await fetch(`${BACKEND_URL}/api/profile/work-experience-narratives/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(errorData.message || 'Failed to delete narrative')
    }

    const result = await response.json()
    return result
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
