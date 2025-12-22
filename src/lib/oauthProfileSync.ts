import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

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
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    // If profile exists, don't overwrite
    if (existingProfile) {
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

    // Create new profile with OAuth data
    const { error } = await supabase.from('users').insert({
      id: user.id,
      email: profileData.email,
      first_name: profileData.firstName,
      last_name: profileData.lastName,
      photo_url: profileData.profileImageUrl,
      linkedin_url: profileData.linkedInUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error('[OAuth Sync] Failed to create profile:', error)
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
    // Get existing profile
    const { data: existingProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!existingProfile) {
      console.log('[OAuth Update] No existing profile found')
      return false
    }

    // Extract OAuth profile data
    const oauthData = extractOAuthProfileData(user)

    // Only update fields that are empty
    const updates: Record<string, any> = {}

    if (!existingProfile.first_name && oauthData.firstName) {
      updates.first_name = oauthData.firstName
    }

    if (!existingProfile.last_name && oauthData.lastName) {
      updates.last_name = oauthData.lastName
    }

    if (!existingProfile.photo_url && oauthData.profileImageUrl) {
      updates.photo_url = oauthData.profileImageUrl
    }

    if (!existingProfile.linkedin_url && oauthData.linkedInUrl) {
      updates.linkedin_url = oauthData.linkedInUrl
    }

    // If nothing to update, skip
    if (Object.keys(updates).length === 0) {
      console.log('[OAuth Update] No fields to update')
      return false
    }

    updates.updated_at = new Date().toISOString()

    console.log('[OAuth Update] Updating profile with OAuth data:', Object.keys(updates))

    // Update profile
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)

    if (error) {
      console.error('[OAuth Update] Failed to update profile:', error)
      return false
    }

    console.log('[OAuth Update] Profile updated successfully')
    return true
  } catch (error) {
    console.error('[OAuth Update] Unexpected error:', error)
    return false
  }
}
