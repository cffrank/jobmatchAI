import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import {
  initializeSession,
  clearSession,
  validateAndRefreshSession,
  setupActivityTracking,
  monitorSession,
  isSessionValid,
} from '../lib/sessionManagement'
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

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

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
    } catch (error: any) {
      lastError = error

      // Only retry on rate limiting errors
      if (error.code === 'auth/too-many-requests' && i < maxRetries - 1) {
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
    await signOut(auth)
    clearSession(user?.uid)
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Validate existing session or initialize new one
        const sessionValid = await validateAndRefreshSession(firebaseUser, false)

        if (!sessionValid && !loading) {
          // Session is invalid, sign out
          console.warn('[Auth] Invalid session detected, signing out')
          await signOut(auth)
          setUser(null)
          setLoading(false)
          return
        }

        // If this is a new login (no existing session), initialize
        if (!isSessionValid()) {
          console.log('[Auth] Initializing new session for user login')
          initializeSession(firebaseUser)
        }

        setUser(firebaseUser)
      } else {
        setUser(null)
        clearSession()
      }

      setLoading(false)
    })

    return unsubscribe
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

  const signUp = async (email: string, password: string, displayName?: string) => {
    const userCredential = await withRetry(() =>
      createUserWithEmailAndPassword(auth, email, password)
    )

    // Update profile with display name if provided
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName })
    }

    // Send email verification
    if (userCredential.user) {
      await sendEmailVerification(userCredential.user)
    }

    // Initialize session for new user
    if (userCredential.user) {
      initializeSession(userCredential.user)
    }
  }

  const signIn = async (email: string, password: string) => {
    const userCredential = await withRetry(() =>
      signInWithEmailAndPassword(auth, email, password)
    )

    // Regenerate session to prevent session fixation
    if (userCredential.user) {
      initializeSession(userCredential.user)
    }
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const userCredential = await withRetry(() => signInWithPopup(auth, provider))

    // Initialize session for OAuth login
    if (userCredential.user) {
      initializeSession(userCredential.user)
    }
  }

  const signInWithLinkedIn = async () => {
    const provider = new OAuthProvider('oidc.linkedin')
    provider.addScope('openid')
    provider.addScope('profile')
    provider.addScope('email')

    // Add custom parameters for CSRF protection
    provider.setCustomParameters({
      prompt: 'consent'
    })

    const userCredential = await withRetry(() => signInWithPopup(auth, provider))

    // Initialize session for OAuth login
    if (userCredential.user) {
      initializeSession(userCredential.user)
    }
  }

  const logOut = async () => {
    const userId = user?.uid
    await signOut(auth)
    clearSession(userId)
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  const verifyEmail = async () => {
    if (user) {
      await sendEmailVerification(user)
    }
  }

  const updateUserProfile = async (displayName?: string, photoURL?: string) => {
    if (user) {
      await updateProfile(user, { displayName, photoURL })
    }
  }

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
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
