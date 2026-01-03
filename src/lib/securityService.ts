import { supabase } from './supabase'
import { UAParser } from 'ua-parser-js'
import type { ActiveSession, ActivityLogEntry } from '@/sections/account-billing/types'
import type { Database } from '@/types/supabase'

// Type aliases for database tables
type SessionRow = Database['public']['Tables']['sessions']['Row']
type SessionInsert = Database['public']['Tables']['sessions']['Insert']
type SecurityEventInsert = Database['public']['Tables']['security_events']['Insert']

/**
 * Session expiration time (30 days)
 */
const SESSION_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Backend API URL for Workers endpoints
 */
const BACKEND_URL = import.meta.env.VITE_API_URL

/**
 * Parse user agent string to extract device and browser information
 */
export function parseUserAgent(userAgent: string): {
  device: string
  browser: string
  os: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
} {
  const parser = new UAParser(userAgent)
  const result = parser.getResult()

  // Determine device name
  let device = 'Unknown Device'
  if (result.device.vendor && result.device.model) {
    device = `${result.device.vendor} ${result.device.model}`
  } else if (result.os.name) {
    device = result.os.name
    if (result.device.type === 'mobile' || result.device.type === 'tablet') {
      device = `${result.device.type.charAt(0).toUpperCase() + result.device.type.slice(1)}`
    }
  }

  // Determine browser
  const browser = result.browser.name && result.browser.version
    ? `${result.browser.name} ${result.browser.version.split('.')[0]}`
    : 'Unknown Browser'

  // Determine OS
  const os = result.os.name && result.os.version
    ? `${result.os.name} ${result.os.version}`
    : 'Unknown OS'

  // Determine device type
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown'
  if (result.device.type === 'mobile') deviceType = 'mobile'
  else if (result.device.type === 'tablet') deviceType = 'tablet'
  else if (!result.device.type || result.device.type === 'desktop') deviceType = 'desktop'

  return { device, browser, os, deviceType }
}

/**
 * Get IP address and geolocation information
 * Uses ipapi.co free tier (up to 1000 requests/day)
 * Falls back to CloudFlare trace if ipapi.co fails
 */
export async function getLocationInfo(): Promise<{
  ipAddress: string
  location: string
}> {
  try {
    // Try ipapi.co first (provides detailed location)
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (response.ok) {
      const data = await response.json()
      const location = data.city && data.region
        ? `${data.city}, ${data.region}`
        : data.country_name || 'Unknown Location'

      return {
        ipAddress: data.ip || 'Unknown IP',
        location,
      }
    }
  } catch (error) {
    console.warn('[Security] Failed to fetch location from ipapi.co:', error)
  }

  // Fallback to CloudFlare trace (only provides IP)
  try {
    const response = await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
      signal: AbortSignal.timeout(3000),
    })

    if (response.ok) {
      const text = await response.text()
      const ipMatch = text.match(/ip=([^\n]+)/)
      const ip = ipMatch ? ipMatch[1] : 'Unknown IP'

      return {
        ipAddress: ip,
        location: 'Unknown Location',
      }
    }
  } catch (error) {
    console.warn('[Security] Failed to fetch IP from CloudFlare:', error)
  }

  // Ultimate fallback
  return {
    ipAddress: 'Unknown IP',
    location: 'Unknown Location',
  }
}

/**
 * Create or update a session in Supabase
 */
export async function createOrUpdateSession(
  userId: string,
  sessionId: string
): Promise<void> {
  try {
    const userAgent = navigator.userAgent
    const { device, browser, os, deviceType } = parseUserAgent(userAgent)
    const { ipAddress, location } = await getLocationInfo()

    // Get JWT token for authentication
    const { data: { session: authSession } } = await supabase.auth.getSession()

    if (!authSession?.access_token) {
      throw new Error('No authentication token available')
    }

    // Call Workers API to create/update session in KV
    const response = await fetch(`${BACKEND_URL}/api/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        device_type: deviceType,
        device_os: os,
        browser: browser,
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create/update session: ${response.statusText}`)
    }

    console.log('[Security] Session created/updated:', {
      sessionId: sessionId.substring(0, 8) + '...',
      device,
      location,
    })
  } catch (error) {
    console.error('[Security] Failed to create/update session:', error)
    throw error
  }
}

/**
 * Update session last active timestamp
 */
export async function updateSessionActivity(
  _userId: string,
  sessionId: string
): Promise<void> {
  try {
    // Get JWT token for authentication
    const { data: { session: authSession } } = await supabase.auth.getSession()

    if (!authSession?.access_token) {
      console.warn('[Security] No auth token available for session activity update')
      return
    }

    // Call Workers API to update session activity in KV
    const response = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to update session activity: ${response.statusText}`)
    }
  } catch (error) {
    console.error('[Security] Failed to update session activity:', error)
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Get all active sessions for a user
 */
export async function getActiveSessions(
  _userId: string,
  currentSessionId: string
): Promise<ActiveSession[]> {
  try {
    // Get JWT token for authentication
    const { data: { session: authSession } } = await supabase.auth.getSession()

    if (!authSession?.access_token) {
      console.warn('[Security] No auth token available for fetching sessions')
      return []
    }

    // Call Workers API to get active sessions from KV
    const response = await fetch(`${BACKEND_URL}/api/sessions?active=true`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.statusText}`)
    }

    const data = await response.json()

    const sessions: ActiveSession[] = data.map((session: SessionRow) => ({
      id: session.session_id,
      device: session.device_type ?? 'Unknown Device',
      browser: session.browser ?? 'Unknown Browser',
      location: session.ip_address ?? 'Unknown Location',
      ipAddress: String(session.ip_address ?? 'Unknown IP'),
      lastActive: session.last_active,
      current: session.session_id === currentSessionId,
    }))

    return sessions
  } catch (error) {
    console.error('[Security] Failed to fetch active sessions:', error)
    return []
  }
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
  userId: string,
  sessionId: string
): Promise<void> {
  try {
    // Get JWT token for authentication
    const { data: { session: authSession } } = await supabase.auth.getSession()

    if (!authSession?.access_token) {
      throw new Error('No authentication token available')
    }

    // Call Workers API to delete session from KV
    const response = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to revoke session: ${response.statusText}`)
    }

    // Log the session revocation as a security event
    await logSecurityEvent(userId, 'Session Revoked', 'success', {
      revokedSessionId: sessionId,
    })

    console.log('[Security] Session revoked:', sessionId)
  } catch (error) {
    console.error('[Security] Failed to revoke session:', error)
    throw error
  }
}

/**
 * Clean up expired sessions
 *
 * NOTE: This function is deprecated. KV storage automatically expires sessions
 * via TTL (Time To Live), so manual cleanup is no longer needed.
 *
 * @deprecated Cloudflare KV handles automatic expiration via TTL
 * @returns Always returns 0 (no cleanup needed)
 */
export async function cleanupExpiredSessions(_userId: string): Promise<number> {
  // KV storage automatically expires sessions via TTL
  // No manual cleanup needed
  console.log('[Security] Session cleanup not needed - KV TTL handles expiration automatically')
  return 0
}

/**
 * Log a security event to Supabase
 */
export async function logSecurityEvent(
  userId: string,
  action: string,
  status: 'success' | 'failed',
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const userAgent = navigator.userAgent
    const { device, browser, os } = parseUserAgent(userAgent)
    const { ipAddress, location } = await getLocationInfo()

    const eventData: SecurityEventInsert = {
      user_id: userId,
      action,
      device,
      browser,
      os,
      location,
      ip_address: ipAddress as unknown, // Database uses 'unknown' type for ip_address (inet type in Postgres)
      user_agent: userAgent,
      status,
      metadata: metadata ? (metadata as Database['public']['Tables']['security_events']['Insert']['metadata']) : null,
      timestamp: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('security_events')
      .insert(eventData)

    if (error) throw error

    console.log('[Security] Event logged:', action, status)
  } catch (error) {
    console.error('[Security] Failed to log security event:', error)
    // Don't throw - logging failures shouldn't break user flow
  }
}

/**
 * Get recent security events for a user
 */
export async function getRecentSecurityEvents(
  userId: string,
  maxEvents: number = 20
): Promise<ActivityLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('security_events')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(maxEvents)

    if (error) throw error
    if (!data) return []

    const events: ActivityLogEntry[] = data.map((event) => ({
      id: event.id,
      date: event.timestamp,
      action: event.action,
      device: event.device ?? 'Unknown Device',
      location: event.location ?? 'Unknown Location',
      ipAddress: String(event.ip_address ?? 'Unknown IP'),
      status: event.status,
    }))

    return events
  } catch (error) {
    console.error('[Security] Failed to fetch security events:', error)
    return []
  }
}

/**
 * Get 2FA settings for a user
 * Note: two_factor_setup_complete and backup_codes_generated columns may not exist in the database yet
 */
export async function get2FASettings(userId: string): Promise<{
  twoFactorEnabled: boolean
  twoFactorSetupComplete: boolean
  backupCodesGenerated: boolean
}> {
  try {
    // Get JWT token for authentication
    const { data: { session: authSession } } = await supabase.auth.getSession()

    if (!authSession?.access_token) {
      throw new Error('No authentication token available')
    }

    // Call Workers API to get 2FA settings from D1
    const response = await fetch(`${BACKEND_URL}/api/sessions/users/${userId}/2fa-settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch 2FA settings: ${response.statusText}`)
    }

    const data = await response.json()

    // Only two_factor_enabled exists in the database currently
    // The other fields are derived: if 2FA is enabled, we assume setup is complete
    const twoFactorEnabled = data?.two_factor_enabled || false

    return {
      twoFactorEnabled,
      twoFactorSetupComplete: twoFactorEnabled, // Assume setup is complete if enabled
      backupCodesGenerated: twoFactorEnabled, // Assume backup codes exist if enabled
    }
  } catch (error) {
    console.error('[Security] Failed to fetch 2FA settings:', error)
    return {
      twoFactorEnabled: false,
      twoFactorSetupComplete: false,
      backupCodesGenerated: false,
    }
  }
}
