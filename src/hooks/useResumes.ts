import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { API_URL } from '@/lib/config'
import type { Database } from '@/types/supabase'
import type { Resume, ResumeSections } from '@/sections/profile-resume-management/types'

type DbResume = Database['public']['Tables']['resumes']['Row']

/**
 * Hook to manage resumes via Workers API
 * Endpoints:
 * - GET /api/resume - Fetch all resumes
 * - POST /api/resume - Create new resume
 * - PATCH /api/resume/:id - Update resume
 * - DELETE /api/resume/:id - Delete resume
 */
export function useResumes() {
  const { user } = useAuth()
  const userId = user?.id

  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch and subscribe to resumes
  useEffect(() => {
    if (!userId) {
      setResumes([])
      setLoading(false)
      return
    }

    let subscribed = true

    // Fetch initial resumes via Workers API
    const fetchResumes = async () => {
      try {
        setLoading(true)

        // Get auth session for API call
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No active session')
        }

        const response = await fetch(`${API_URL}/api/resume`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch resumes' }))
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json() as DbResume[]

        if (subscribed && data) {
          setResumes(data.map(mapDbResume))
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

    fetchResumes()

    // Set up real-time subscription
    const channel = supabase
      .channel(`resumes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resumes',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setResumes((current) => [mapDbResume(payload.new as DbResume), ...current])
          } else if (payload.eventType === 'UPDATE') {
            setResumes((current) =>
              current.map((resume) =>
                resume.id === payload.new.id ? mapDbResume(payload.new as DbResume) : resume
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setResumes((current) => current.filter((resume) => resume.id !== payload.old.id))
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
   * Add new resume via Workers API
   */
  const addResume = async (data: Omit<Resume, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) throw new Error('User not authenticated')

    // Get auth session for API call
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No active session')
    }

    const response = await fetch(`${API_URL}/api/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        type: data.type,
        title: data.title,
        sections: data.sections,
        formats: data.formats,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to create resume' }))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const newResume = await response.json() as DbResume

    // Update local state optimistically
    setResumes((current) => [mapDbResume(newResume), ...current])
  }

  /**
   * Update existing resume via Workers API
   */
  const updateResume = async (id: string, data: Partial<Omit<Resume, 'id' | 'userId' | 'createdAt'>>) => {
    if (!userId) throw new Error('User not authenticated')

    // Get auth session for API call
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No active session')
    }

    const updateData: Record<string, unknown> = {}
    if (data.type !== undefined) updateData.type = data.type
    if (data.title !== undefined) updateData.title = data.title
    if (data.sections !== undefined) updateData.sections = data.sections
    if (data.formats !== undefined) updateData.formats = data.formats

    const response = await fetch(`${API_URL}/api/resume/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(updateData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update resume' }))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const updatedResume = await response.json() as DbResume

    // Update local state
    setResumes((current) =>
      current.map((resume) =>
        resume.id === id ? mapDbResume(updatedResume) : resume
      )
    )
  }

  /**
   * Delete resume via Workers API
   */
  const deleteResume = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    // Get auth session for API call
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No active session')
    }

    const response = await fetch(`${API_URL}/api/resume/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to delete resume' }))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    // Update local state
    setResumes((current) => current.filter((resume) => resume.id !== id))
  }

  /**
   * Get master resume - memoized to prevent infinite loops
   */
  const masterResume = useMemo(() => {
    return resumes.find((r) => r.type === 'master')
  }, [resumes])

  /**
   * Get tailored resumes - memoized to prevent infinite loops
   */
  const tailoredResumes = useMemo(() => {
    return resumes.filter((r) => r.type === 'tailored')
  }, [resumes])

  return {
    resumes,
    masterResume,
    tailoredResumes,
    loading,
    error,
    addResume,
    updateResume,
    deleteResume,
  }
}

/**
 * Map database resume to app Resume type
 */
function mapDbResume(dbResume: DbResume): Resume {
  return {
    id: dbResume.id,
    userId: dbResume.user_id,
    type: dbResume.type as 'master' | 'tailored',
    title: dbResume.title,
    createdAt: dbResume.created_at,
    updatedAt: dbResume.updated_at,
    sections: (dbResume.sections as unknown as ResumeSections) || {
      header: { name: '', title: '', contact: { email: '', phone: '', location: '', linkedIn: '' } },
      summary: '',
      experience: [],
      education: [],
      skills: [],
    },
    formats: (dbResume.formats as ('pdf' | 'docx' | 'txt')[]) || [],
  }
}
