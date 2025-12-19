/**
 * Converts Firebase Auth error codes to user-friendly messages
 */
export function getAuthErrorMessage(error: any): string {
  const errorCode = error?.code || ''

  // OAuth-specific errors
  if (errorCode === 'auth/popup-closed-by-user') {
    return 'Sign-in cancelled. Please try again if you want to continue.'
  }

  if (errorCode === 'auth/popup-blocked') {
    return 'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.'
  }

  if (errorCode === 'auth/cancelled-popup-request') {
    return 'Sign-in was cancelled. Only one sign-in can be in progress at a time.'
  }

  if (errorCode === 'auth/network-request-failed') {
    return 'Network error. Please check your internet connection and try again.'
  }

  if (errorCode === 'auth/too-many-requests') {
    return 'Too many failed attempts. Please wait a few minutes before trying again.'
  }

  // Account-related errors
  if (errorCode === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with this email using a different sign-in method. Try signing in with email/password or Google.'
  }

  if (errorCode === 'auth/credential-already-in-use') {
    return 'This account is already linked to another user.'
  }

  // Email/Password errors
  if (errorCode === 'auth/invalid-email') {
    return 'Invalid email address format.'
  }

  if (errorCode === 'auth/user-disabled') {
    return 'This account has been disabled. Please contact support.'
  }

  if (errorCode === 'auth/user-not-found') {
    return 'No account found with this email. Please sign up first.'
  }

  if (errorCode === 'auth/wrong-password') {
    return 'Incorrect password. Please try again.'
  }

  if (errorCode === 'auth/weak-password') {
    return 'Password is too weak. Please use at least 6 characters.'
  }

  if (errorCode === 'auth/email-already-in-use') {
    return 'An account already exists with this email. Please sign in instead.'
  }

  if (errorCode === 'auth/requires-recent-login') {
    return 'This action requires recent authentication. Please sign out and sign in again.'
  }

  // Token/Session errors
  if (errorCode === 'auth/expired-action-code') {
    return 'This link has expired. Please request a new one.'
  }

  if (errorCode === 'auth/invalid-action-code') {
    return 'Invalid or expired link. Please request a new one.'
  }

  // OAuth provider errors
  if (errorCode === 'auth/unauthorized-domain') {
    return 'This domain is not authorized for OAuth operations. Please contact support.'
  }

  if (errorCode === 'auth/operation-not-allowed') {
    return 'This sign-in method is not enabled. Please contact support.'
  }

  // Fallback to original error message or generic message
  return error?.message || 'An error occurred during authentication. Please try again.'
}
