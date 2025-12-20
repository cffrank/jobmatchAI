import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import type { PasswordStrength, PasswordRequirements } from '@/lib/passwordValidation'
import { cn } from '@/lib/utils'

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength
  requirements: PasswordRequirements
  showRequirements?: boolean
  className?: string
}

export function PasswordStrengthIndicator({
  strength,
  requirements,
  showRequirements = true,
  className
}: PasswordStrengthIndicatorProps) {
  const getStrengthColor = () => {
    switch (strength.strength) {
      case 'weak':
        return 'bg-red-500'
      case 'fair':
        return 'bg-orange-500'
      case 'good':
        return 'bg-yellow-500'
      case 'strong':
        return 'bg-lime-500'
      case 'very-strong':
        return 'bg-green-500'
      default:
        return 'bg-slate-300'
    }
  }

  const getStrengthText = () => {
    switch (strength.strength) {
      case 'weak':
        return 'Weak'
      case 'fair':
        return 'Fair'
      case 'good':
        return 'Good'
      case 'strong':
        return 'Strong'
      case 'very-strong':
        return 'Very Strong'
      default:
        return 'Unknown'
    }
  }

  const getStrengthWidth = () => {
    switch (strength.score) {
      case 0:
        return 'w-1/5'
      case 1:
        return 'w-2/5'
      case 2:
        return 'w-3/5'
      case 3:
        return 'w-4/5'
      case 4:
        return 'w-full'
      default:
        return 'w-0'
    }
  }

  const requirementsList = [
    { key: 'minLength', label: 'At least 12 characters', met: requirements.minLength },
    { key: 'hasUppercase', label: 'One uppercase letter', met: requirements.hasUppercase },
    { key: 'hasLowercase', label: 'One lowercase letter', met: requirements.hasLowercase },
    { key: 'hasNumber', label: 'One number', met: requirements.hasNumber },
    { key: 'hasSpecialChar', label: 'One special character (!@#$%^&*)', met: requirements.hasSpecialChar },
    { key: 'notCommon', label: 'Not a common password', met: requirements.notCommon },
    { key: 'strongEnough', label: 'Strong enough (zxcvbn score ≥ 3)', met: requirements.strongEnough }
  ]

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Password strength</span>
          <span className={cn(
            'font-semibold',
            strength.isValid ? 'text-green-600 dark:text-green-500' : 'text-orange-600 dark:text-orange-500'
          )}>
            {getStrengthText()}
          </span>
        </div>
        <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300 ease-out',
              getStrengthColor(),
              getStrengthWidth()
            )}
          />
        </div>
      </div>

      {/* Feedback Messages */}
      {strength.feedback.length > 0 && (
        <div className="space-y-1">
          {strength.feedback.slice(0, 2).map((message, index) => (
            <div key={index} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-1.5 pt-1">
          <div className="text-xs font-medium text-muted-foreground">Requirements:</div>
          <div className="grid grid-cols-1 gap-1">
            {requirementsList.map((req) => (
              <div
                key={req.key}
                className={cn(
                  'flex items-center gap-2 text-xs transition-colors',
                  req.met ? 'text-green-600 dark:text-green-500' : 'text-slate-500 dark:text-slate-400'
                )}
              >
                {req.met ? (
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                <span>{req.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
