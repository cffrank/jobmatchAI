import { useState, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface LinkedInAuthResult {
  authUrl: string
  state: string
}

interface UseLinkedInAuthReturn {
  initiateLinkedInAuth: () => Promise<void>
  isLoading: boolean
  error: string | null
}

/**
 * Hook to handle LinkedIn OAuth flow
 *
 * Usage:
 * ```tsx
 * const { initiateLinkedInAuth, isLoading, error } = useLinkedInAuth()
 *
 * const handleConnect = async () => {
 *   await initiateLinkedInAuth()
 * }
 * ```
 *
 * The hook will:
 * 1. Call the linkedInAuth Cloud Function to get the OAuth URL
 * 2. Redirect the user to LinkedIn for authorization
 * 3. LinkedIn will redirect back to the linkedInCallback Cloud Function
 * 4. The callback function will import the profile data
 * 5. User is redirected back to the app with success/error status
 */
export function useLinkedInAuth(): UseLinkedInAuthReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Check for OAuth callback parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const linkedInStatus = params.get('linkedin')
    const errorCode = params.get('error')

    if (linkedInStatus === 'success') {
      toast.success('LinkedIn profile imported successfully!', {
        description: 'Your profile information has been updated.'
      })
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (linkedInStatus === 'error') {
      const errorMessage = getErrorMessage(errorCode || 'unknown')
      toast.error('LinkedIn import failed', {
        description: errorMessage
      })
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  /**
   * Initiate the LinkedIn OAuth flow
   * Calls the linkedInAuth Cloud Function and redirects to LinkedIn
   */
  const initiateLinkedInAuth = async () => {
    if (!user) {
      setError('Must be logged in to connect LinkedIn')
      toast.error('Authentication required', {
        description: 'Please log in to connect your LinkedIn account.'
      })
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Call the linkedInAuth Cloud Function
      const linkedInAuthFunction = httpsCallable<void, LinkedInAuthResult>(
        functions,
        'linkedInAuth'
      )

      const result = await linkedInAuthFunction()
      const { authUrl } = result.data

      if (!authUrl) {
        throw new Error('No authorization URL returned')
      }

      // Redirect to LinkedIn authorization page
      // LinkedIn will redirect back to our linkedInCallback Cloud Function
      window.location.href = authUrl

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate LinkedIn OAuth'
      console.error('LinkedIn auth error:', err)
      setError(errorMessage)

      toast.error('Connection failed', {
        description: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  return {
    initiateLinkedInAuth,
    isLoading,
    error
  }
}

/**
 * Map error codes to user-friendly messages
 */
function getErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    'oauth_error': 'LinkedIn authorization failed. Please try again.',
    'missing_parameters': 'Invalid OAuth response. Please try again.',
    'invalid_state': 'Security validation failed. Please try again.',
    'expired_state': 'Authorization session expired. Please try again.',
    'token_exchange_failed': 'Failed to authenticate with LinkedIn. Please try again.',
    'profile_fetch_failed': 'Failed to retrieve your LinkedIn profile. Please try again.',
    'internal_error': 'An unexpected error occurred. Please try again later.',
    'unknown': 'An unknown error occurred. Please try again.'
  }

  return errorMessages[errorCode] || errorMessages.unknown
}
