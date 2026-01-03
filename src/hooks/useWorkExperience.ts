import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { workersApi } from '@/lib/workersApi'
import type { WorkExperience } from '@/sections/profile-resume-management/types'

/**
 * Hook to manage work experience entries via Workers API
 */
export function useWorkExperience() {
  const { user } = useAuth()
  const userId = user?.id

  const [workExperience, setWorkExperience] = useState<WorkExperience[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch and subscribe to work experience
  useEffect(() => {
    if (!userId) {
      setWorkExperience([])
      setLoading(false)
      return
    }

    let subscribed = true

    /**
     * Convert snake_case field names from API to camelCase for frontend
     */
    const convertToCamelCase = (item: Record<string, unknown>): WorkExperience => {
      const converted: Record<string, unknown> = {}
      Object.entries(item).forEach(([key, value]) => {
        if (key === 'start_date') {
          converted.startDate = value
        } else if (key === 'end_date') {
          converted.endDate = value
        } else if (key === 'is_current') {
          converted.current = value
        } else if (key === 'user_id') {
          converted.userId = value
        } else if (key === 'created_at') {
          converted.createdAt = value
        } else if (key === 'updated_at') {
          converted.updatedAt = value
        } else {
          converted[key] = value
        }
      })
      return converted as unknown as WorkExperience
    }

    // Fetch initial work experience entries via Workers API
    const fetchWorkExperience = async () => {
      try {
        setLoading(true)
        const response = await workersApi.getWorkExperience()

        if (subscribed) {
          // Convert snake_case from API to camelCase for frontend
          const convertedData = (response.workExperience || []).map(item =>
            convertToCamelCase(item as Record<string, unknown>)
          )
          setWorkExperience(convertedData)
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

    fetchWorkExperience()

    // Set up real-time subscription via Supabase (only for reactivity)
    const channel = supabase
      .channel(`work_experience:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_experience',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newExp = payload.new as WorkExperience
            setWorkExperience((current) => [newExp, ...current])
          } else if (payload.eventType === 'UPDATE') {
            const updatedExp = payload.new as WorkExperience
            setWorkExperience((current) =>
              current.map((exp) => (exp.id === updatedExp.id ? updatedExp : exp))
            )
          } else if (payload.eventType === 'DELETE') {
            setWorkExperience((current) => current.filter((exp) => exp.id !== payload.old.id))
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
   * Add new work experience entry
   */
  const addWorkExperience = async (data: Omit<WorkExperience, 'id'>) => {
    if (!userId) throw new Error('User not authenticated')

    const response = await workersApi.createWorkExperience({
      company: data.company,
      position: data.position,
      location: data.location,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate || null,
      current: data.current,
      accomplishments: data.accomplishments?.filter((a) => a.trim() !== '') || [],
    })

    // Realtime subscription will update the state automatically
    return response
  }

  /**
   * Update existing work experience entry
   */
  const updateWorkExperience = async (id: string, data: Partial<Omit<WorkExperience, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')

    const updateData: Record<string, unknown> = {}
    if (data.company !== undefined) updateData.company = data.company
    if (data.position !== undefined) updateData.position = data.position
    if (data.location !== undefined) updateData.location = data.location
    if (data.description !== undefined) updateData.description = data.description
    if (data.startDate !== undefined) updateData.startDate = data.startDate
    if (data.endDate !== undefined) updateData.endDate = data.endDate || null
    if (data.current !== undefined) updateData.current = data.current
    if (data.accomplishments !== undefined) {
      updateData.accomplishments = data.accomplishments.filter((a) => a.trim() !== '')
    }

    const response = await workersApi.updateWorkExperience(id, updateData)

    // Realtime subscription will update the state automatically
    return response
  }

  /**
   * Delete work experience entry
   */
  const deleteWorkExperience = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const response = await workersApi.deleteWorkExperience(id)

    // Realtime subscription will update the state automatically
    return response
  }

  return {
    workExperience,
    loading,
    error,
    addWorkExperience,
    updateWorkExperience,
    deleteWorkExperience,
  }
}
