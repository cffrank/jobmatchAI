import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import type { Education } from '@/sections/profile-resume-management/types'

type DbEducation = Database['public']['Tables']['education']['Row']

/**
 * Hook to manage education entries in Supabase
 * Table: education
 */
export function useEducation() {
  const { user } = useAuth()
  const userId = user?.id

  const [education, setEducation] = useState<Education[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch and subscribe to education
  useEffect(() => {
    if (!userId) {
      setEducation([])
      setLoading(false)
      return
    }

    let subscribed = true

    // Fetch initial education entries
    const fetchEducation = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('education')
          .select('*')
          .eq('user_id', userId)
          .order('start_date', { ascending: false, nullsFirst: false })

        if (fetchError) throw fetchError

        if (subscribed && data) {
          setEducation(data.map(mapDbEducation))
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

    // Set up real-time subscription
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
            setEducation((current) => [mapDbEducation(payload.new as DbEducation), ...current])
          } else if (payload.eventType === 'UPDATE') {
            setEducation((current) =>
              current.map((edu) =>
                edu.id === payload.new.id ? mapDbEducation(payload.new as DbEducation) : edu
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
   * Add new education entry
   */
  const addEducation = async (data: Omit<Education, 'id'>) => {
    if (!userId) throw new Error('User not authenticated')

    const { error: insertError } = await supabase.from('education').insert({
      user_id: userId,
      institution: data.school,
      degree: data.degree,
      field_of_study: data.field,
      description: data.highlights?.join('\n') || null,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
    })

    if (insertError) throw insertError
  }

  /**
   * Update existing education entry
   */
  const updateEducation = async (id: string, data: Partial<Omit<Education, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')

    const updateData: Partial<Database['public']['Tables']['education']['Update']> = {}
    if (data.school !== undefined) updateData.institution = data.school
    if (data.degree !== undefined) updateData.degree = data.degree
    if (data.field !== undefined) updateData.field_of_study = data.field
    if (data.startDate !== undefined) updateData.start_date = data.startDate || null
    if (data.endDate !== undefined) updateData.end_date = data.endDate || null
    if (data.highlights !== undefined) updateData.description = data.highlights.join('\n')

    const { error: updateError } = await supabase
      .from('education')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)

    if (updateError) throw updateError
  }

  /**
   * Delete education entry
   */
  const deleteEducation = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { error: deleteError } = await supabase
      .from('education')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) throw deleteError
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

/**
 * Map database education to app Education type
 */
function mapDbEducation(dbEdu: DbEducation): Education {
  return {
    id: dbEdu.id,
    school: dbEdu.institution,
    degree: dbEdu.degree || '',
    field: dbEdu.field_of_study || '',
    location: '', // Not in database schema
    startDate: dbEdu.start_date || '',
    endDate: dbEdu.end_date || '',
    gpa: undefined, // Not in database schema
    highlights: dbEdu.description ? dbEdu.description.split('\n') : [],
  }
}
