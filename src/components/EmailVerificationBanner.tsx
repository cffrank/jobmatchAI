import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { AlertCircle, Mail, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function EmailVerificationBanner() {
  const { user, verifyEmail } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)

  // Don't show if user is not logged in, email is verified, or banner is dismissed
  if (!user || user.emailVerified || dismissed) {
    return null
  }

  const handleResendVerification = async () => {
    setSending(true)
    try {
      await verifyEmail()
      toast.success('Verification email sent!', {
        description: 'Please check your inbox and spam folder.'
      })
    } catch (error: unknown) {
      console.error('Failed to send verification email:', error)

      // Handle rate limiting
      if (error.code === 'auth/too-many-requests') {
        toast.error('Too many requests', {
          description: 'Please wait a few minutes before requesting another verification email.'
        })
      } else {
        toast.error('Failed to send verification email', {
          description: 'Please try again later.'
        })
      }
    } finally {
      setSending(false)
    }
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Email verification required
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  Please verify your email address to access all features. Check your inbox for the verification link.
                </p>
              </div>

              <button
                onClick={() => setDismissed(true)}
                className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handleResendVerification}
                disabled={sending}
                className="h-8 text-xs border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                    Resend verification email
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleReload}
                className="h-8 text-xs border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              >
                I've verified - refresh page
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
