import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type { Resume } from '@/sections/profile-resume-management/types'

type DbResume = Database['public']['Tables']['resumes']['Row']

/**
 * Hook to manage resumes in Supabase
 * Table: resumes
 *
 * ⚠️ NOTE: This table must be created before using this hook.
 * Migration file: supabase/migrations/002_resumes_table.sql
 *
 * To apply: Run the migration via Supabase Dashboard > SQL Editor
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

    // Fetch initial resumes
    const fetchResumes = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('resumes')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })

        if (fetchError) throw fetchError

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
   * Add new resume
   */
  const addResume = async (data: Omit<Resume, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) throw new Error('User not authenticated')

    const now = new Date().toISOString()
    const { error: insertError } = await supabase.from('resumes').insert({
      user_id: userId,
      type: data.type,
      title: data.title,
      sections: data.sections as any, // JSONB field
      formats: data.formats,
      created_at: now,
      updated_at: now,
    })

    if (insertError) throw insertError
  }

  /**
   * Update existing resume
   */
  const updateResume = async (id: string, data: Partial<Omit<Resume, 'id' | 'userId' | 'createdAt'>>) => {
    if (!userId) throw new Error('User not authenticated')

    const updateData: Partial<Database['public']['Tables']['resumes']['Update']> = {
      updated_at: new Date().toISOString(),
    }

    if (data.type !== undefined) updateData.type = data.type
    if (data.title !== undefined) updateData.title = data.title
    if (data.sections !== undefined) updateData.sections = data.sections as any
    if (data.formats !== undefined) updateData.formats = data.formats

    const { error: updateError } = await supabase
      .from('resumes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)

    if (updateError) throw updateError
  }

  /**
   * Delete resume
   */
  const deleteResume = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { error: deleteError } = await supabase
      .from('resumes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) throw deleteError
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
    sections: (dbResume.sections as any) || {
      header: { name: '', title: '', contact: { email: '', phone: '', location: '', linkedIn: '' } },
      summary: '',
      experience: [],
      education: [],
      skills: [],
    },
    formats: (dbResume.formats as ('pdf' | 'docx' | 'txt')[]) || [],
  }
}
