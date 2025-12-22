import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import {
  initializeSession,
  clearSession,
  validateAndRefreshSession,
  setupActivityTracking,
  monitorSession,
  isSessionValid,
} from '../lib/sessionManagement'
import { syncOAuthProfile } from '../lib/oauthProfileSync'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithLinkedIn: () => Promise<void>
  logOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  verifyEmail: () => Promise<void>
  updateUserProfile: (displayName?: string, photoURL?: string) => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

// Rate limiting helper with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      const err = error as AuthError
      lastError = error as Error

      // Only retry on rate limiting errors
      if (err.status === 429 && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i)
        console.warn(`Rate limited, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      throw error
    }
  }

  throw lastError
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionWarningShown, setSessionWarningShown] = useState(false)

  // Handle session expiration
  const handleSessionExpired = useCallback(async () => {
    console.warn('[Auth] Session expired, logging out...')
    toast.error('Session expired', {
      description: 'Your session has expired due to inactivity. Please log in again.'
    })
    await supabase.auth.signOut()
    clearSession(user?.id)
  }, [user])

  // Handle session warning
  const handleSessionWarning = useCallback(() => {
    if (!sessionWarningShown) {
      setSessionWarningShown(true)
      toast.warning('Session expiring soon', {
        description: 'Your session will expire in 5 minutes. Any activity will extend your session.',
        duration: 10000
      })
    }
  }, [sessionWarningShown])

  // Set up auth state listener with session management
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Validate existing session or initialize new one
        validateAndRefreshSession(session.user, false).then((sessionValid) => {
          if (!sessionValid && !loading) {
            // Session is invalid, sign out
            console.warn('[Auth] Invalid session detected, signing out')
            supabase.auth.signOut()
            setUser(null)
            setLoading(false)
            return
          }

          // If this is a new login (no existing session), initialize
          if (!isSessionValid()) {
            console.log('[Auth] Initializing new session for user login')
            initializeSession(session.user)
          }

          setUser(session.user)
          setLoading(false)
        })
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Validate existing session or initialize new one
        const sessionValid = await validateAndRefreshSession(session.user, false)

        if (!sessionValid && !loading) {
          // Session is invalid, sign out
          console.warn('[Auth] Invalid session detected, signing out')
          await supabase.auth.signOut()
          setUser(null)
          return
        }

        // If this is a new login (no existing session), initialize
        if (!isSessionValid()) {
          console.log('[Auth] Initializing new session for user login')
          initializeSession(session.user)

          // For OAuth logins (Google, LinkedIn), auto-populate profile from OAuth data
          const provider = session.user.app_metadata?.provider
          if (provider === 'google' || provider === 'linkedin_oidc' || provider === 'linkedin') {
            console.log('[Auth] OAuth login detected, syncing profile data from', provider)
            // Sync profile asynchronously, don't block login
            syncOAuthProfile(session.user).then((synced) => {
              if (synced) {
                toast.success('Profile created from LinkedIn data', {
                  description: 'Your profile has been pre-filled. You can edit it anytime.',
                })
              }
            }).catch((error) => {
              console.error('[Auth] Failed to sync OAuth profile:', error)
            })
          }
        }

        setUser(session.user)
      } else {
        setUser(null)
        clearSession()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [loading])

  // Set up activity tracking
  useEffect(() => {
    if (user) {
      const cleanup = setupActivityTracking()
      return cleanup
    }
  }, [user])

  // Set up session monitoring
  useEffect(() => {
    if (user) {
      const cleanup = monitorSession(handleSessionWarning, handleSessionExpired)
      return cleanup
    }
  }, [user, handleSessionWarning, handleSessionExpired])

  // Refresh token periodically (every 50 minutes)
  useEffect(() => {
    if (user) {
      const interval = setInterval(async () => {
        await validateAndRefreshSession(user, true)
      }, 50 * 60 * 1000)

      return () => clearInterval(interval)
    }
  }, [user])

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const { data, error } = await withRetry(() =>
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || '',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
    )

    if (error) throw error
    if (!data.user) throw new Error('Failed to create user')

    // Supabase sends email verification automatically
    toast.success('Verification email sent', {
      description: 'Please check your email to verify your account.',
    })

    // Initialize session for new user
    initializeSession(data.user)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await withRetry(() =>
      supabase.auth.signInWithPassword({
        email,
        password,
      })
    )

    if (error) throw error
    if (!data.user) throw new Error('Failed to sign in')

    // Regenerate session to prevent session fixation
    initializeSession(data.user)
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await withRetry(() =>
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // Don't force consent screen - let Google decide based on authorization state
          // This gives the best UX: consent only on first login, automatic sign-in after that
        },
      })
    )

    if (error) throw error

    // Session will be initialized in onAuthStateChange after OAuth redirect
  }, [])

  const signInWithLinkedIn = useCallback(async () => {
    const { error } = await withRetry(() =>
      supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // Request profile and email scopes to get user data
          scopes: 'openid profile email',
          // Don't force consent screen - let LinkedIn decide based on authorization state
          // This gives the best UX: consent only on first login, automatic sign-in after that
        },
      })
    )

    if (error) throw error

    // Session will be initialized in onAuthStateChange after OAuth redirect
  }, [])

  const logOut = useCallback(async () => {
    const userId = user?.id
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    clearSession(userId)
  }, [user])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) throw error

    toast.success('Password reset email sent', {
      description: 'Please check your email for the password reset link.',
    })
  }, [])

  const verifyEmail = useCallback(async () => {
    if (!user || !user.email) return

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    })

    if (error) throw error

    toast.success('Verification email sent', {
      description: 'Please check your email to verify your account.',
    })
  }, [user])

  const updateUserProfile = useCallback(async (displayName?: string, photoURL?: string) => {
    if (!user) return

    const updates: {
      data?: {
        display_name?: string
        avatar_url?: string
      }
    } = {}

    if (displayName !== undefined || photoURL !== undefined) {
      updates.data = {}
      if (displayName !== undefined) updates.data.display_name = displayName
      if (photoURL !== undefined) updates.data.avatar_url = photoURL
    }

    const { error } = await supabase.auth.updateUser(updates)

    if (error) throw error

    toast.success('Profile updated', {
      description: 'Your profile has been updated successfully.',
    })
  }, [user])

  // Memoize the context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(() => ({
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithLinkedIn,
    logOut,
    resetPassword,
    verifyEmail,
    updateUserProfile,
  }), [user, loading, signUp, signIn, signInWithGoogle, signInWithLinkedIn, logOut, resetPassword, verifyEmail, updateUserProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
