import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { API_URL } from '@/lib/config'
import type { Education } from '@/sections/profile-resume-management/types'

/**
 * Hook to manage education entries via Workers API
 */
export function useEducation() {
  const { user } = useAuth()
  const userId = user?.id

  const [education, setEducation] = useState<Education[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Convert snake_case API response to camelCase for frontend
  const convertToCamelCase = (edu: Record<string, unknown>): Education => {
    return {
      id: edu.id as string,
      school: edu.institution as string,
      degree: edu.degree as string,
      field: edu.field_of_study as string,
      location: '', // Not in D1 schema, default to empty
      startDate: edu.start_date as string,
      endDate: edu.end_date as string || '',
      gpa: edu.grade as string || '',
      highlights: typeof edu.description === 'string'
        ? JSON.parse(edu.description || '[]')
        : (edu.description as string[] || []),
    }
  }

  // Fetch and subscribe to education
  useEffect(() => {
    if (!userId) {
      setEducation([])
      setLoading(false)
      return
    }

    let subscribed = true

    // Fetch initial education entries via Workers API
    const fetchEducation = async () => {
      try {
        setLoading(true)

        // Get auth session for JWT token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No active session')
        }

        const response = await fetch(`${API_URL}/api/profile/education`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch education: ${response.statusText}`)
        }

        const result = await response.json()

        if (subscribed) {
          // Convert snake_case to camelCase
          const converted = (result.education as Record<string, unknown>[] || [])
            .map(convertToCamelCase)

          setEducation(converted)
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

    fetchEducation()

    // Set up real-time subscription for live updates
    const channel = supabase
      .channel(`education:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'education',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newEducation = convertToCamelCase(payload.new as Record<string, unknown>)
            setEducation((current) => [newEducation, ...current])
          } else if (payload.eventType === 'UPDATE') {
            const updatedEducation = convertToCamelCase(payload.new as Record<string, unknown>)
            setEducation((current) =>
              current.map((edu) =>
                edu.id === payload.new.id ? updatedEducation : edu
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setEducation((current) => current.filter((edu) => edu.id !== payload.old.id))
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
   * Add new education entry via Workers API
   */
  const addEducation = async (data: Omit<Education, 'id'>) => {
    if (!userId) throw new Error('User not authenticated')

    // Get auth session for JWT token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No active session')
    }

    const response = await fetch(`${API_URL}/api/profile/education`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        school: data.school,
        degree: data.degree,
        field: data.field,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        highlights: data.highlights || [],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Failed to create education: ${response.statusText}`)
    }

    const result = await response.json()
    return result.education
  }

  /**
   * Update existing education entry via Workers API
   */
  const updateEducation = async (id: string, data: Partial<Omit<Education, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')

    // Get auth session for JWT token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No active session')
    }

    const updateData: Record<string, unknown> = {}
    if (data.school !== undefined) updateData.school = data.school
    if (data.degree !== undefined) updateData.degree = data.degree
    if (data.field !== undefined) updateData.field = data.field
    if (data.startDate !== undefined) updateData.startDate = data.startDate || undefined
    if (data.endDate !== undefined) updateData.endDate = data.endDate || undefined
    if (data.highlights !== undefined) updateData.highlights = data.highlights

    const response = await fetch(`${API_URL}/api/profile/education/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Failed to update education: ${response.statusText}`)
    }

    const result = await response.json()
    return result.education
  }

  /**
   * Delete education entry via Workers API
   */
  const deleteEducation = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    // Get auth session for JWT token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No active session')
    }

    const response = await fetch(`${API_URL}/api/profile/education/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Failed to delete education: ${response.statusText}`)
    }

    const result = await response.json()
    return result
  }

  return {
    education,
    loading,
    error,
    addEducation,
    updateEducation,
    deleteEducation,
  }
}
