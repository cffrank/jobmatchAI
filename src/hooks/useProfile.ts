import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import type { User } from '@/sections/profile-resume-management/types'

type DbUser = Database['public']['Tables']['users']['Row']

/**
 * Hook to manage user profile data in Supabase
 * Table: users
 */
export function useProfile() {
  const { user } = useAuth()
  const userId = user?.id

  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch and subscribe to profile
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }

    let subscribed = true

    // Fetch initial profile
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        if (fetchError) {
          // If profile doesn't exist yet, that's okay
          if (fetchError.code !== 'PGRST116') {
            throw fetchError
          }
          if (subscribed) {
            setProfile(null)
            setError(null)
          }
        } else if (subscribed && data) {
          setProfile(mapDbUserToUser(data))
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

    fetchProfile()

    // Set up real-time subscription
    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setProfile(mapDbUserToUser(payload.new as DbUser))
          } else if (payload.eventType === 'DELETE') {
            setProfile(null)
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
   * Create or update user profile
   */
  const updateProfile = async (data: Partial<Omit<User, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')

    const timestamp = new Date().toISOString()

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          ...mapUserToDbUser(data),
          updated_at: timestamp,
        })
        .eq('id', userId)

      if (updateError) throw updateError
    } else {
      // Create new profile
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: user?.email || '',
          ...mapUserToDbUser(data),
          created_at: timestamp,
          updated_at: timestamp,
        })

      if (insertError) throw insertError
    }
  }

  return {
    profile,
    loading,
    error,
    updateProfile,
  }
}

/**
 * Map database user to app User type
 * Maps actual schema fields: first_name, last_name, phone, location, photo_url,
 * current_title, professional_summary, years_of_experience, linkedin_url
 */
function mapDbUserToUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.first_name || '',
    lastName: dbUser.last_name || '',
    phone: dbUser.phone || '',
    location: dbUser.location || '',
    linkedInUrl: (dbUser as any).linkedin_url || '',
    profileImageUrl: dbUser.photo_url || null,
    headline: dbUser.current_title || '',
    summary: dbUser.professional_summary || '',
  }
}

/**
 * Map app User type to database user (for updates/inserts)
 * Only maps fields that exist in our schema
 */
function mapUserToDbUser(user: Partial<Omit<User, 'id'>>): Partial<Database['public']['Tables']['users']['Update']> {
  return {
    first_name: user.firstName,
    last_name: user.lastName,
    phone: user.phone,
    location: user.location,
    photo_url: user.profileImageUrl || undefined,
    current_title: user.headline,
    professional_summary: user.summary,
    linkedin_url: user.linkedInUrl,
    // Note: jobPreferences, searchSettings not in database schema
  }
}
