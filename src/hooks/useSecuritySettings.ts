import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getSessionInfo } from '@/lib/sessionManagement'
import {
  getActiveSessions,
  getRecentSecurityEvents,
  get2FASettings,
  revokeSession as revokeSessionService,
  cleanupExpiredSessions,
  updateSessionActivity,
} from '@/lib/securityService'
import type { SecuritySettings } from '@/sections/account-billing/types'

/**
 * Hook to manage security settings with real Firebase data
 */
export function useSecuritySettings() {
  const { user } = useAuth()
  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    twoFactorSetupComplete: false,
    backupCodesGenerated: false,
    activeSessions: [],
    recentActivity: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Fetch all security data
   */
  const fetchSecurityData = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const sessionInfo = getSessionInfo()
      const currentSessionId = sessionInfo?.sessionId || ''

      // Clean up expired sessions first
      await cleanupExpiredSessions(user.uid)

      // Fetch all security data in parallel
      const [twoFactorSettings, activeSessions, recentActivity] = await Promise.all([
        get2FASettings(user.uid),
        getActiveSessions(user.uid, currentSessionId),
        getRecentSecurityEvents(user.uid, 20),
      ])

      setSecurity({
        ...twoFactorSettings,
        activeSessions,
        recentActivity,
      })
    } catch (err) {
      console.error('[useSecuritySettings] Error fetching security data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch security data'))
    } finally {
      setLoading(false)
    }
  }, [user])

  /**
   * Initial fetch and refresh on user change
   */
  useEffect(() => {
    fetchSecurityData()
  }, [fetchSecurityData])

  /**
   * Update session activity periodically (every 5 minutes)
   */
  useEffect(() => {
    if (!user) return

    const sessionInfo = getSessionInfo()
    if (!sessionInfo?.sessionId) return

    const interval = setInterval(async () => {
      try {
        await updateSessionActivity(user.uid, sessionInfo.sessionId)
      } catch (error) {
        console.error('[useSecuritySettings] Failed to update session activity:', error)
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [user])

  /**
   * Revoke a session
   */
  const revokeSession = useCallback(async (sessionId: string) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      await revokeSessionService(user.uid, sessionId)

      // Update local state immediately for better UX
      setSecurity((prev) => ({
        ...prev,
        activeSessions: prev.activeSessions.filter((s) => s.id !== sessionId),
      }))

      // Refresh security data to get the latest state
      await fetchSecurityData()
    } catch (err) {
      console.error('[useSecuritySettings] Error revoking session:', err)
      throw err
    }
  }, [user, fetchSecurityData])

  /**
   * Enable 2FA (placeholder - will be implemented when 2FA feature is added)
   */
  const enable2FA = useCallback(async () => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    // TODO: Implement actual 2FA setup flow
    console.log('[useSecuritySettings] Enable 2FA - not implemented yet')
    throw new Error('2FA setup not implemented yet')
  }, [user])

  /**
   * Disable 2FA (placeholder - will be implemented when 2FA feature is added)
   */
  const disable2FA = useCallback(async () => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    // TODO: Implement actual 2FA disable flow
    console.log('[useSecuritySettings] Disable 2FA - not implemented yet')
    throw new Error('2FA disable not implemented yet')
  }, [user])

  /**
   * Generate backup codes (placeholder - will be implemented when 2FA feature is added)
   */
  const generateBackupCodes = useCallback(async () => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    // TODO: Implement backup codes generation
    console.log('[useSecuritySettings] Generate backup codes - not implemented yet')
    throw new Error('Backup codes generation not implemented yet')
  }, [user])

  /**
   * Refresh security data manually
   */
  const refresh = useCallback(async () => {
    await fetchSecurityData()
  }, [fetchSecurityData])

  return {
    security,
    loading,
    error,
    revokeSession,
    enable2FA,
    disable2FA,
    generateBackupCodes,
    refresh,
  }
}
