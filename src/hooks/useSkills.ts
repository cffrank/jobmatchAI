import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import type { Skill } from '@/sections/profile-resume-management/types'

type DbSkill = Database['public']['Tables']['skills']['Row']

/**
 * Hook to manage user skills in Supabase
 * Table: skills
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

    // Fetch initial skills
    const fetchSkills = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('skills')
          .select('*')
          .eq('user_id', userId)
          .order('name', { ascending: true })

        if (fetchError) throw fetchError

        if (subscribed && data) {
          setSkills(data.map(mapDbSkillToSkill))
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

    // Set up real-time subscription
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
   * Add new skill
   */
  const addSkill = async (data: Omit<Skill, 'id'>) => {
    if (!userId) throw new Error('User not authenticated')

    const { error: insertError } = await supabase.from('skills').insert({
      user_id: userId,
      name: data.name,
      proficiency_level: 'intermediate', // Default proficiency
      endorsed_count: data.endorsements || 0,
    })

    if (insertError) throw insertError
  }

  /**
   * Update existing skill
   */
  const updateSkill = async (id: string, data: Partial<Omit<Skill, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')

    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.endorsements !== undefined) updateData.endorsed_count = data.endorsements

    const { error: updateError } = await supabase
      .from('skills')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)

    if (updateError) throw updateError
  }

  /**
   * Delete skill
   */
  const deleteSkill = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { error: deleteError } = await supabase
      .from('skills')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) throw deleteError
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
