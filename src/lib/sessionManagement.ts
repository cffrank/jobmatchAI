import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { createOrUpdateSession, logSecurityEvent } from './securityService'

// Session timeout configuration (30 minutes of inactivity)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000
const SESSION_WARNING_MS = 25 * 60 * 1000 // Warn 5 minutes before timeout

// Storage keys
const LAST_ACTIVITY_KEY = 'lastActivityTime'
const SESSION_ID_KEY = 'sessionId'
const LOGIN_TIME_KEY = 'loginTime'

export interface SessionInfo {
  sessionId: string
  loginTime: number
  lastActivity: number
  isActive: boolean
  timeUntilTimeout: number
}

/**
 * Generate a cryptographically secure session ID
 */
export function generateSessionId(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Initialize a new session after login
 * This helps prevent session fixation attacks by creating a new session ID
 */
export function initializeSession(user: User): void {
  const now = Date.now()
  const sessionId = generateSessionId()

  // Store session information
  sessionStorage.setItem(SESSION_ID_KEY, sessionId)
  sessionStorage.setItem(LOGIN_TIME_KEY, now.toString())
  sessionStorage.setItem(LAST_ACTIVITY_KEY, now.toString())

  // Also store in localStorage for cross-tab session detection
  localStorage.setItem(`${SESSION_ID_KEY}_${user.id}`, sessionId)

  console.log('[Session] New session initialized:', {
    userId: user.id,
    sessionId: sessionId.substring(0, 8) + '...'
  })

  // Create session in Supabase and log login event
  createOrUpdateSession(user.id, sessionId).catch((error) => {
    console.error('[Session] Failed to create session in Supabase:', error)
  })

  logSecurityEvent(user.id, 'Login', 'success').catch((error) => {
    console.error('[Session] Failed to log login event:', error)
  })
}

/**
 * Update last activity timestamp
 * Call this on user interactions to keep session alive
 */
export function updateActivity(): void {
  const now = Date.now()
  sessionStorage.setItem(LAST_ACTIVITY_KEY, now.toString())
}

/**
 * Check if session is still valid (not timed out)
 */
export function isSessionValid(): boolean {
  const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY)
  if (!lastActivity) return false

  const now = Date.now()
  const lastActivityTime = parseInt(lastActivity, 10)
  const timeSinceActivity = now - lastActivityTime

  return timeSinceActivity < SESSION_TIMEOUT_MS
}

/**
 * Get current session information
 */
export function getSessionInfo(): SessionInfo | null {
  const sessionId = sessionStorage.getItem(SESSION_ID_KEY)
  const loginTime = sessionStorage.getItem(LOGIN_TIME_KEY)
  const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY)

  if (!sessionId || !loginTime || !lastActivity) {
    return null
  }

  const now = Date.now()
  const lastActivityTime = parseInt(lastActivity, 10)
  const timeSinceActivity = now - lastActivityTime
  const timeUntilTimeout = Math.max(0, SESSION_TIMEOUT_MS - timeSinceActivity)
  const isActive = timeSinceActivity < SESSION_TIMEOUT_MS

  return {
    sessionId,
    loginTime: parseInt(loginTime, 10),
    lastActivity: lastActivityTime,
    isActive,
    timeUntilTimeout
  }
}

/**
 * Check if session warning should be shown
 */
export function shouldShowSessionWarning(): boolean {
  const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY)
  if (!lastActivity) return false

  const now = Date.now()
  const lastActivityTime = parseInt(lastActivity, 10)
  const timeSinceActivity = now - lastActivityTime

  return timeSinceActivity >= SESSION_WARNING_MS && timeSinceActivity < SESSION_TIMEOUT_MS
}

/**
 * Clear session data on logout
 */
export function clearSession(userId?: string): void {
  // Log logout event before clearing session data
  if (userId) {
    logSecurityEvent(userId, 'Logout', 'success').catch((error) => {
      console.error('[Session] Failed to log logout event:', error)
    })
  }

  sessionStorage.removeItem(SESSION_ID_KEY)
  sessionStorage.removeItem(LOGIN_TIME_KEY)
  sessionStorage.removeItem(LAST_ACTIVITY_KEY)

  if (userId) {
    localStorage.removeItem(`${SESSION_ID_KEY}_${userId}`)
  }

  console.log('[Session] Session cleared')
}

/**
 * Validate session and regenerate token if needed
 * Returns true if session is valid, false if expired
 */
export async function validateAndRefreshSession(
  currentUser: User | null,
  forceTokenRefresh: boolean = false
): Promise<boolean> {
  if (!currentUser) {
    clearSession()
    return false
  }

  // Check if this is a brand new session (no lastActivity set yet)
  // This happens during login before initializeSession completes
  const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY)
  if (!lastActivity) {
    // New session being initialized, don't validate yet
    console.log('[Session] New session detected, skipping validation')
    return true
  }

  // Check if session is still valid
  if (!isSessionValid()) {
    console.warn('[Session] Session expired due to inactivity')
    clearSession(currentUser.id)
    return false
  }

  // Refresh token periodically or on demand
  if (forceTokenRefresh) {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('[Session] Failed to refresh token:', error)
        return false
      }
      if (data.session) {
        console.log('[Session] Token refreshed successfully')
      }
    } catch (error) {
      console.error('[Session] Failed to refresh token:', error)
      return false
    }
  }

  // Update activity timestamp
  updateActivity()
  return true
}

/**
 * Set up activity listeners to track user interaction
 */
export function setupActivityTracking(): () => void {
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
  const throttledUpdate = throttle(updateActivity, 30000) // Update max once per 30 seconds

  events.forEach(event => {
    window.addEventListener(event, throttledUpdate, { passive: true })
  })

  // Return cleanup function
  return () => {
    events.forEach(event => {
      window.removeEventListener(event, throttledUpdate)
    })
  }
}

/**
 * Throttle helper to limit function calls
 */
function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      func(...args)
    }
  }
}

/**
 * Monitor session and trigger callbacks on events
 */
export function monitorSession(
  onWarning: () => void,
  onExpired: () => void
): () => void {
  const interval = setInterval(() => {
    if (!isSessionValid()) {
      onExpired()
      clearInterval(interval)
    } else if (shouldShowSessionWarning()) {
      onWarning()
    }
  }, 60000) // Check every minute

  return () => clearInterval(interval)
}
