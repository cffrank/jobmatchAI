import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type { WorkExperience } from '@/sections/profile-resume-management/types'

type DbWorkExperience = Database['public']['Tables']['work_experience']['Row']

/**
 * Hook to manage work experience entries in Supabase
 * Table: work_experience
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

    // Fetch initial work experience entries
    const fetchWorkExperience = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('work_experience')
          .select('*')
          .eq('user_id', userId)
          .order('start_date', { ascending: false })

        if (fetchError) throw fetchError

        if (subscribed && data) {
          setWorkExperience(data.map(mapDbWorkExperience))
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

    // Set up real-time subscription
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
            setWorkExperience((current) => [mapDbWorkExperience(payload.new as DbWorkExperience), ...current])
          } else if (payload.eventType === 'UPDATE') {
            setWorkExperience((current) =>
              current.map((exp) =>
                exp.id === payload.new.id ? mapDbWorkExperience(payload.new as DbWorkExperience) : exp
              )
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

    const { error: insertError } = await supabase.from('work_experience').insert({
      user_id: userId,
      company: data.company,
      title: data.position,
      location: data.location,
      description: data.description,
      start_date: data.startDate,
      end_date: data.endDate || null,
      is_current: data.current,
    })

    if (insertError) throw insertError
  }

  /**
   * Update existing work experience entry
   */
  const updateWorkExperience = async (id: string, data: Partial<Omit<WorkExperience, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')

    const updateData: Partial<Database['public']['Tables']['work_experience']['Update']> = {}
    if (data.company !== undefined) updateData.company = data.company
    if (data.position !== undefined) updateData.title = data.position
    if (data.location !== undefined) updateData.location = data.location
    if (data.description !== undefined) updateData.description = data.description
    if (data.startDate !== undefined) updateData.start_date = data.startDate
    if (data.endDate !== undefined) updateData.end_date = data.endDate || null
    if (data.current !== undefined) updateData.is_current = data.current

    const { error: updateError } = await supabase
      .from('work_experience')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)

    if (updateError) throw updateError
  }

  /**
   * Delete work experience entry
   */
  const deleteWorkExperience = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { error: deleteError } = await supabase
      .from('work_experience')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) throw deleteError
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

/**
 * Map database work experience to app WorkExperience type
 */
function mapDbWorkExperience(dbExp: DbWorkExperience): WorkExperience {
  return {
    id: dbExp.id,
    company: dbExp.company,
    position: dbExp.title,
    location: dbExp.location || '',
    startDate: dbExp.start_date,
    endDate: dbExp.end_date || '',
    current: dbExp.is_current || false,
    description: dbExp.description || '',
    accomplishments: [], // Not in database schema
  }
}
