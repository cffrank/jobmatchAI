import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * Backend API URL for Workers endpoints
 */
const BACKEND_URL = import.meta.env.VITE_API_URL

/**
 * Extract profile data from OAuth user metadata
 * Supports Google and LinkedIn OIDC providers
 */
export function extractOAuthProfileData(user: User) {
  const { user_metadata, app_metadata } = user
  const provider = app_metadata?.provider as string

  // Common fields from OIDC
  const email = user.email || ''
  const fullName = user_metadata?.full_name || user_metadata?.name || ''
  const firstName = user_metadata?.given_name || ''
  const lastName = user_metadata?.family_name || ''
  const picture = user_metadata?.picture || user_metadata?.avatar_url || null

  // LinkedIn-specific: Try to extract LinkedIn profile URL from metadata
  let linkedInUrl = ''
  if (provider === 'linkedin_oidc' || provider === 'linkedin') {
    // LinkedIn doesn't provide profile URL directly in OIDC, but we can construct it
    // from the sub (subject) claim which contains the LinkedIn member ID
    const linkedInId = user_metadata?.sub || user_metadata?.id
    if (linkedInId) {
      // LinkedIn OIDC sub format: usually contains the member ID
      linkedInUrl = `https://www.linkedin.com/in/${linkedInId}`
    }
  }

  return {
    email,
    firstName: firstName || fullName.split(' ')[0] || '',
    lastName: lastName || fullName.split(' ').slice(1).join(' ') || '',
    profileImageUrl: picture,
    linkedInUrl,
    provider,
  }
}

/**
 * Auto-populate user profile from OAuth data on first login
 * Only creates profile if one doesn't exist yet
 */
export async function syncOAuthProfile(user: User): Promise<boolean> {
  try {
    // Get JWT token for authentication
    const { data: { session: authSession } } = await supabase.auth.getSession()

    if (!authSession?.access_token) {
      console.error('[OAuth Sync] No auth token available')
      return false
    }

    // Check if profile already exists via Workers API
    const existsResponse = await fetch(`${BACKEND_URL}/api/users/${user.id}/exists`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!existsResponse.ok) {
      console.error('[OAuth Sync] Failed to check profile existence:', existsResponse.statusText)
      return false
    }

    const { exists } = await existsResponse.json()

    // If profile exists, don't overwrite
    if (exists) {
      console.log('[OAuth Sync] Profile already exists, skipping sync')
      return false
    }

    // Extract OAuth profile data
    const profileData = extractOAuthProfileData(user)

    console.log('[OAuth Sync] Creating profile from OAuth data:', {
      provider: profileData.provider,
      hasFirstName: !!profileData.firstName,
      hasLastName: !!profileData.lastName,
      hasPhoto: !!profileData.profileImageUrl,
      hasLinkedIn: !!profileData.linkedInUrl,
    })

    // Create new profile with OAuth data via Workers API
    const createResponse = await fetch(`${BACKEND_URL}/api/users/oauth-profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        email: profileData.email,
        first_name: profileData.firstName || null,
        last_name: profileData.lastName || null,
        photo_url: profileData.profileImageUrl || null,
        linkedin_url: profileData.linkedInUrl || null,
      }),
    })

    if (!createResponse.ok) {
      console.error('[OAuth Sync] Failed to create profile:', createResponse.statusText)
      return false
    }

    console.log('[OAuth Sync] Profile created successfully')
    return true
  } catch (error) {
    console.error('[OAuth Sync] Unexpected error:', error)
    return false
  }
}

/**
 * Update existing profile with missing OAuth data
 * Only updates fields that are currently empty
 */
export async function updateProfileFromOAuth(user: User): Promise<boolean> {
  try {
    // Get JWT token for authentication
    const { data: { session: authSession } } = await supabase.auth.getSession()

    if (!authSession?.access_token) {
      console.error('[OAuth Update] No auth token available')
      return false
    }

    // Extract OAuth profile data
    const oauthData = extractOAuthProfileData(user)

    console.log('[OAuth Update] Enriching profile with OAuth data')

    // Call Workers API to enrich profile (only updates empty fields)
    const enrichResponse = await fetch(`${BACKEND_URL}/api/users/${user.id}/oauth-enrich`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: oauthData.firstName || null,
        last_name: oauthData.lastName || null,
        photo_url: oauthData.profileImageUrl || null,
        linkedin_url: oauthData.linkedInUrl || null,
      }),
    })

    if (!enrichResponse.ok) {
      console.error('[OAuth Update] Failed to enrich profile:', enrichResponse.statusText)
      return false
    }

    const result = await enrichResponse.json()

    if (result.updated) {
      console.log('[OAuth Update] Profile enriched successfully')
    } else {
      console.log('[OAuth Update] No fields to update')
    }

    return result.updated
  } catch (error) {
    console.error('[OAuth Update] Unexpected error:', error)
    return false
  }
}
