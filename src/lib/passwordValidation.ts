import zxcvbn from 'zxcvbn'
import type { ZXCVBNResult } from 'zxcvbn'

// Common passwords to block (extend this list as needed)
const COMMON_PASSWORDS = [
  'password',
  'password123',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'monkey',
  '1234567',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  'iloveyou',
  'master',
  'sunshine',
  'ashley',
  'bailey',
  'shadow',
  'superman',
  'qazwsx',
  'michael',
  'football'
]

export interface PasswordStrength {
  score: number // 0-4 (zxcvbn score)
  feedback: string[]
  warning: string | null
  isValid: boolean
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'
}

export interface PasswordRequirements {
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
  notCommon: boolean
  strongEnough: boolean
}

/**
 * Comprehensive password validation using zxcvbn and custom rules
 *
 * Security Requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not in common passwords list
 * - zxcvbn score of at least 3 (good)
 */
export function validatePassword(
  password: string,
  userInputs: string[] = []
): PasswordStrength {
  // Run zxcvbn analysis
  const result: ZXCVBNResult = zxcvbn(password, userInputs)

  const requirements = checkPasswordRequirements(password)
  const feedback: string[] = []

  // Check minimum length
  if (!requirements.minLength) {
    feedback.push('Password must be at least 12 characters long')
  }

  // Check complexity requirements
  if (!requirements.hasUppercase) {
    feedback.push('Password must contain at least one uppercase letter')
  }

  if (!requirements.hasLowercase) {
    feedback.push('Password must contain at least one lowercase letter')
  }

  if (!requirements.hasNumber) {
    feedback.push('Password must contain at least one number')
  }

  if (!requirements.hasSpecialChar) {
    feedback.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)')
  }

  // Check if password is too common
  if (!requirements.notCommon) {
    feedback.push('This password is too common. Please choose a more unique password')
  }

  // Add zxcvbn feedback
  if (result.feedback.warning) {
    feedback.push(result.feedback.warning)
  }

  if (result.feedback.suggestions && result.feedback.suggestions.length > 0) {
    feedback.push(...result.feedback.suggestions)
  }

  // Determine overall validity
  const isValid = Object.values(requirements).every(req => req) &&
                  requirements.strongEnough

  return {
    score: result.score,
    feedback,
    warning: result.feedback.warning || null,
    isValid,
    strength: getStrengthLabel(result.score, isValid)
  }
}

/**
 * Check individual password requirements
 */
export function checkPasswordRequirements(password: string): PasswordRequirements {
  const minLength = password.length >= 12
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)
  const notCommon = !COMMON_PASSWORDS.includes(password.toLowerCase())

  // Run zxcvbn to check overall strength
  const result = zxcvbn(password)
  const strongEnough = result.score >= 3 // Require at least "good" strength

  return {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    notCommon,
    strongEnough
  }
}

/**
 * Get human-readable strength label
 */
function getStrengthLabel(
  score: number,
  meetsRequirements: boolean
): 'weak' | 'fair' | 'good' | 'strong' | 'very-strong' {
  if (!meetsRequirements) return 'weak'

  switch (score) {
    case 0:
    case 1:
      return 'weak'
    case 2:
      return 'fair'
    case 3:
      return 'good'
    case 4:
      return score === 4 && meetsRequirements ? 'very-strong' : 'strong'
    default:
      return 'weak'
  }
}

/**
 * Estimate password crack time (human readable)
 */
export function getPasswordCrackTime(password: string): string {
  const result = zxcvbn(password)
  const secondsValue = result.crack_times_seconds.offline_slow_hashing_1e4_per_second
  const seconds = typeof secondsValue === 'number' ? secondsValue : 0

  if (seconds < 60) return 'less than a minute'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days`
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months`
  if (seconds < 3153600000) return `${Math.floor(seconds / 31536000)} years`
  return 'centuries'
}
