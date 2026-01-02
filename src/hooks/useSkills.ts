import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { API_URL } from '@/lib/config'
import type { Database } from '@/types/supabase'
import type { Skill } from '@/sections/profile-resume-management/types'

type DbSkill = Database['public']['Tables']['skills']['Row']

/**
 * Hook to manage user skills via Workers API
 * Endpoints:
 * - GET /api/skills - Fetch user skills
 * - POST /api/skills - Create new skill
 * - PATCH /api/skills/:id - Update skill
 * - DELETE /api/skills/:id - Delete skill
 */
export function useSkills() {
  const { user } = useAuth()
  const userId = user?.id

  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch and subscribe to skills
  useEffect(() => {
    if (!userId) {
      setSkills([])
      setLoading(false)
      return
    }

    let subscribed = true

    // Fetch initial skills from Workers API
    const fetchSkills = async () => {
      try {
        setLoading(true)

        // Get JWT token for authentication
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.access_token) {
          throw new Error('No authentication token available')
        }

        const response = await fetch(`${API_URL}/api/skills`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch skills: ${response.statusText}`)
        }

        const data = await response.json()

        if (subscribed) {
          setSkills(data.skills || [])
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

    fetchSkills()

    // Set up real-time subscription for live updates
    const channel = supabase
      .channel(`skills:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'skills',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSkills((current) => [...current, mapDbSkillToSkill(payload.new as DbSkill)])
          } else if (payload.eventType === 'UPDATE') {
            setSkills((current) =>
              current.map((skill) =>
                skill.id === payload.new.id ? mapDbSkillToSkill(payload.new as DbSkill) : skill
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setSkills((current) => current.filter((skill) => skill.id !== payload.old.id))
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
   * Add new skill via Workers API
   */
  const addSkill = async (data: Omit<Skill, 'id'>) => {
    if (!userId) throw new Error('User not authenticated')

    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    const response = await fetch(`${API_URL}/api/skills`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        endorsements: data.endorsements || 0,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to add skill' }))
      throw new Error(errorData.error || 'Failed to add skill')
    }

    const result = await response.json()
    return result.skill
  }

  /**
   * Update existing skill via Workers API
   */
  const updateSkill = async (id: string, data: Partial<Omit<Skill, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')

    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.endorsements !== undefined) updateData.endorsements = data.endorsements

    const response = await fetch(`${API_URL}/api/skills/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update skill' }))
      throw new Error(errorData.error || 'Failed to update skill')
    }

    const result = await response.json()
    return result.skill
  }

  /**
   * Delete skill via Workers API
   */
  const deleteSkill = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    const response = await fetch(`${API_URL}/api/skills/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete skill' }))
      throw new Error(errorData.error || 'Failed to delete skill')
    }
  }

  return {
    skills,
    loading,
    error,
    addSkill,
    updateSkill,
    deleteSkill,
  }
}

/**
 * Map database skill to app Skill type
 */
function mapDbSkillToSkill(dbSkill: DbSkill): Skill {
  return {
    id: dbSkill.id,
    name: dbSkill.name,
    endorsements: dbSkill.endorsed_count || 0,
  }
}
