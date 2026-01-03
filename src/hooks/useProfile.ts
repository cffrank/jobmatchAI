import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { User } from '@/sections/profile-resume-management/types'

// Get backend URL from environment
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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
          // Convert snake_case from API to camelCase for frontend
          const camelCaseProfile = fetchedProfile ? convertToCamelCase(fetchedProfile) : null
          setProfile(camelCaseProfile)
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
   * Convert snake_case field names from API to camelCase for frontend
   */
  const convertToCamelCase = (data: Record<string, unknown>): User => {
    const fieldMap: Record<string, string> = {
      first_name: 'firstName',
      last_name: 'lastName',
      linkedin_url: 'linkedInUrl',
      photo_url: 'photoUrl',
      current_title: 'headline',
      professional_summary: 'summary',
      street_address: 'streetAddress',
      postal_code: 'postalCode',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
    }

    const converted: Record<string, unknown> = {}
    Object.entries(data).forEach(([key, value]) => {
      const camelKey = fieldMap[key] || key
      converted[camelKey] = value
    })

    return converted as User
  }

  /**
   * Convert camelCase field names to snake_case for Workers API
   */
  const convertToSnakeCase = (data: Record<string, unknown>): Record<string, unknown> => {
    const fieldMap: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      linkedInUrl: 'linkedin_url',
      photoUrl: 'photo_url',
      headline: 'current_title',
      summary: 'professional_summary',
      streetAddress: 'street_address',
      postalCode: 'postal_code',
      profileImageUrl: 'photo_url',
    }

    const converted: Record<string, unknown> = {}
    Object.entries(data).forEach(([key, value]) => {
      const snakeKey = fieldMap[key] || key
      converted[snakeKey] = value
    })

    return converted
  }

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

    // Convert camelCase to snake_case for Workers API
    const snakeCaseData = convertToSnakeCase(data as Record<string, unknown>)

    const response = await fetch(`${BACKEND_URL}/api/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(snakeCaseData),
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
