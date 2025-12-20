import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react'
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

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
  }

  const signIn = async (email: string, password: string) => {
    await withRetry(() => signInWithEmailAndPassword(auth, email, password))
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await withRetry(() => signInWithPopup(auth, provider))
  }

  const signInWithLinkedIn = async () => {
    const provider = new OAuthProvider('oidc.linkedin')
    provider.addScope('openid')
    provider.addScope('profile')
    provider.addScope('email')
    await withRetry(() => signInWithPopup(auth, provider))
  }

  const logOut = async () => {
    await signOut(auth)
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
