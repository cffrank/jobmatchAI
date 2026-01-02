import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { User } from '@/sections/profile-resume-management/types'

// Get backend URL from environment
const BACKEND_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

/**
 * Hook to manage user profile data via Workers API
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

    // Fetch initial profile via Workers API
    const fetchProfile = async () => {
      try {
        setLoading(true)

        // Get JWT token for authentication
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          throw new Error('No authentication token available')
        }

        const response = await fetch(`${BACKEND_URL}/api/profile`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.statusText}`)
        }

        const { profile: fetchedProfile } = await response.json()

        if (subscribed) {
          setProfile(fetchedProfile)
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

    // Set up real-time subscription for profile updates
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
        () => {
          // Refetch profile when changes are detected
          fetchProfile()
        }
      )
      .subscribe()

    return () => {
      subscribed = false
      channel.unsubscribe()
    }
  }, [userId])

  /**
   * Create or update user profile via Workers API
   */
  const updateProfile = async (data: Partial<Omit<User, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')

    // Get JWT token for authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    const response = await fetch(`${BACKEND_URL}/api/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(errorData.message || 'Failed to update profile')
    }
  }

  return {
    profile,
    loading,
    error,
    updateProfile,
  }
}
