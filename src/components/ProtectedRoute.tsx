import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { EmailVerificationBanner } from './EmailVerificationBanner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireEmailVerification?: boolean
}

/**
 * Protected route component with email verification enforcement
 *
 * By default, shows a banner for unverified users but allows access.
 * Set requireEmailVerification={true} to block access until email is verified.
 */
export function ProtectedRoute({
  children,
  requireEmailVerification = false
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Block access if email verification is required and not verified
  // Exception: OAuth providers (Google, LinkedIn) auto-verify emails
  const isOAuthUser = user.providerData.some(
    provider => provider.providerId === 'google.com' || provider.providerId.includes('linkedin')
  )

  if (requireEmailVerification && !user.emailVerified && !isOAuthUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full p-6">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-8 text-center border border-slate-200 dark:border-slate-800">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
              <svg
                className="w-8 h-8 text-amber-600 dark:text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Email Verification Required
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              This feature requires email verification. Please check your inbox for a verification link.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Email sent to: <strong>{user.email}</strong>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <EmailVerificationBanner />
      {children}
    </>
  )
}
