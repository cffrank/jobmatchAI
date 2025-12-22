import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, AlertCircle } from 'lucide-react'
import { initializeSession } from '../lib/sessionManagement'

/**
 * OAuth Callback Handler
 *
 * This page handles the redirect from OAuth providers (Google, LinkedIn).
 * Supabase redirects here with the auth code, we exchange it for a session,
 * then redirect the user to the app.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the auth code from URL hash or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const queryParams = new URLSearchParams(window.location.search)

        const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')
        const error = hashParams.get('error') || queryParams.get('error')
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description')

        if (error) {
          console.error('[OAuth] Error from provider:', error, errorDescription)
          setError(errorDescription || error)
          setProcessing(false)
          return
        }

        // If we have tokens in the URL, Supabase has already set the session
        if (accessToken || refreshToken) {
          console.log('[OAuth] Tokens found in URL, getting session...')

          // Get the current session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()

          if (sessionError) {
            console.error('[OAuth] Failed to get session:', sessionError)
            setError('Failed to complete sign in')
            setProcessing(false)
            return
          }

          if (!session?.user) {
            console.error('[OAuth] No user in session')
            setError('Failed to complete sign in')
            setProcessing(false)
            return
          }

          console.log('[OAuth] Session established for user:', session.user.id)

          // Initialize session management
          initializeSession(session.user)

          console.log('[OAuth] Redirecting to home page...')
          // Redirect to home page
          navigate('/', { replace: true })
          return
        }

        // If no tokens in URL, try using the code parameter (PKCE flow)
        const code = queryParams.get('code')
        if (code) {
          console.log('[OAuth] Auth code found, exchanging for session...')

          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            console.error('[OAuth] Failed to exchange code:', exchangeError)
            setError('Failed to complete sign in')
            setProcessing(false)
            return
          }

          if (!data.session?.user) {
            console.error('[OAuth] No user in exchanged session')
            setError('Failed to complete sign in')
            setProcessing(false)
            return
          }

          console.log('[OAuth] Session established for user:', data.session.user.id)

          // Initialize session management
          initializeSession(data.session.user)

          console.log('[OAuth] Redirecting to home page...')
          // Redirect to home page
          navigate('/', { replace: true })
          return
        }

        // No auth parameters found
        console.warn('[OAuth] No auth parameters found in URL')
        setError('Invalid authentication callback')
        setProcessing(false)
      } catch (err) {
        console.error('[OAuth] Unexpected error:', err)
        setError('An unexpected error occurred')
        setProcessing(false)
      }
    }

    handleAuthCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-lg shadow-lg p-8 text-center border border-slate-200 dark:border-slate-800">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Authentication Failed
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {error}
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 mb-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {processing ? 'Completing sign in...' : 'Redirecting...'}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Please wait a moment
        </p>
      </div>
    </div>
  )
}
