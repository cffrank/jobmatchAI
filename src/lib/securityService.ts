import { supabase } from './supabase'
import { UAParser } from 'ua-parser-js'
import type { ActiveSession, ActivityLogEntry } from '@/sections/account-billing/types'
import type { Database } from './database.types'

// Type aliases for database tables
type SessionRow = Database['public']['Tables']['sessions']['Row']
type SessionInsert = Database['public']['Tables']['sessions']['Insert']
type SecurityEventInsert = Database['public']['Tables']['security_events']['Insert']

/**
 * Session expiration time (30 days)
 */
const SESSION_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000

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

    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_EXPIRATION_MS)

    const sessionData: SessionInsert = {
      user_id: userId,
      session_id: sessionId,
      device,
      browser,
      os,
      device_type: deviceType,
      ip_address: ipAddress,
      location,
      user_agent: userAgent,
      created_at: now.toISOString(),
      last_active: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    }

    const { error } = await supabase
      .from('sessions')
      .upsert(sessionData, {
        onConflict: 'session_id',
      })

    if (error) throw error

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
  userId: string,
  sessionId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('sessions')
      .update({
        last_active: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('session_id', sessionId)

    if (error) throw error
  } catch (error) {
    console.error('[Security] Failed to update session activity:', error)
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Get all active sessions for a user
 */
export async function getActiveSessions(
  userId: string,
  currentSessionId: string
): Promise<ActiveSession[]> {
  try {
    const now = new Date()

    // Query sessions that haven't expired
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', now.toISOString())
      .order('last_active', { ascending: false })
      .limit(20)

    if (error) throw error
    if (!data) return []

    const sessions: ActiveSession[] = data.map((session: SessionRow) => ({
      id: session.session_id,
      device: session.device,
      browser: session.browser,
      location: session.location,
      ipAddress: session.ip_address,
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
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', sessionId)

    if (error) throw error

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
 */
export async function cleanupExpiredSessions(userId: string): Promise<number> {
  try {
    const now = new Date()

    // Query and delete expired sessions
    const { data, error } = await supabase
      .from('sessions')
      .delete()
      .eq('user_id', userId)
      .lte('expires_at', now.toISOString())
      .select('id')

    if (error) throw error

    const count = data?.length || 0
    console.log(`[Security] Cleaned up ${count} expired sessions`)
    return count
  } catch (error) {
    console.error('[Security] Failed to cleanup expired sessions:', error)
    return 0
  }
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
      ip_address: ipAddress,
      user_agent: userAgent,
      status,
      metadata: metadata || null,
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
      device: event.device,
      location: event.location,
      ipAddress: event.ip_address,
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
 */
export async function get2FASettings(userId: string): Promise<{
  twoFactorEnabled: boolean
  twoFactorSetupComplete: boolean
  backupCodesGenerated: boolean
}> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('two_factor_enabled, two_factor_setup_complete, backup_codes_generated')
      .eq('id', userId)
      .single()

    if (error) throw error

    return {
      twoFactorEnabled: data?.two_factor_enabled || false,
      twoFactorSetupComplete: data?.two_factor_setup_complete || false,
      backupCodesGenerated: data?.backup_codes_generated || false,
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
