import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * ErrorFallback component for React Router error boundaries
 *
 * Provides a user-friendly error UI with:
 * - Clear error messaging
 * - Navigation options (home, retry)
 * - Different UI for 404 vs other errors
 * - Error details in development mode
 */
export function ErrorFallback() {
  const error = useRouteError()
  const navigate = useNavigate()

  // Check if it's a route error response (404, 500, etc.)
  const isRouteError = isRouteErrorResponse(error)

  // Determine error type and message
  let errorTitle = 'Something went wrong'
  let errorMessage = 'An unexpected error occurred. Please try again.'
  let statusCode: number | undefined

  if (isRouteError) {
    statusCode = error.status
    errorTitle = `Error ${error.status}`

    switch (error.status) {
      case 404:
        errorTitle = 'Page Not Found'
        errorMessage = "The page you're looking for doesn't exist or has been moved."
        break
      case 401:
        errorTitle = 'Unauthorized'
        errorMessage = 'You need to be logged in to access this page.'
        break
      case 403:
        errorTitle = 'Forbidden'
        errorMessage = "You don't have permission to access this page."
        break
      case 500:
        errorTitle = 'Server Error'
        errorMessage = 'An internal server error occurred. Please try again later.'
        break
      default:
        errorMessage = error.statusText || errorMessage
    }
  } else if (error instanceof Error) {
    errorMessage = error.message
  }

  const handleGoHome = () => {
    navigate('/')
  }

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {errorTitle}
          </CardTitle>
          <CardDescription className="mt-2 text-base">
            {errorMessage}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Show error details in development */}
          {import.meta.env.DEV && error instanceof Error && (
            <div className="mt-4 rounded-md bg-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-700">Error Details (dev only):</p>
              <pre className="mt-2 max-h-40 overflow-auto text-xs text-gray-600">
                {error.stack}
              </pre>
            </div>
          )}

          {/* Show status code for route errors */}
          {statusCode && (
            <div className="mt-4 text-center">
              <span className="text-6xl font-bold text-gray-200">{statusCode}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleGoHome}
          >
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={handleRetry}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

/**
 * Simple error fallback for non-route errors (React component errors)
 */
interface ErrorBoundaryFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export function ErrorBoundaryFallback({ error, resetErrorBoundary }: ErrorBoundaryFallbackProps) {
  const navigate = useNavigate()

  const handleGoHome = () => {
    resetErrorBoundary()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Application Error
          </CardTitle>
          <CardDescription className="mt-2 text-base">
            {error.message || 'An unexpected error occurred in the application.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {import.meta.env.DEV && (
            <div className="mt-4 rounded-md bg-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-700">Error Details (dev only):</p>
              <pre className="mt-2 max-h-40 overflow-auto text-xs text-gray-600">
                {error.stack}
              </pre>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleGoHome}
          >
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={resetErrorBoundary}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
