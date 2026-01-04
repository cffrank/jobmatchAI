import type { ApplicationStatus } from '../types'

/**
 * Status display configuration
 */
export const STATUS_CONFIG: Record<ApplicationStatus, {
  label: string
  description: string
  color: string
  icon: string
  category: 'active' | 'success' | 'closed' | 'negative'
}> = {
  applied: {
    label: 'Applied',
    description: 'Application submitted',
    color: 'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    icon: 'clock',
    category: 'active'
  },
  response_received: {
    label: 'Response Received',
    description: 'Company responded to application',
    color: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800',
    icon: 'mail',
    category: 'active'
  },
  screening: {
    label: 'Screening',
    description: 'Under initial review',
    color: 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800',
    icon: 'eye',
    category: 'active'
  },
  interview_scheduled: {
    label: 'Interview Scheduled',
    description: 'Interview is scheduled',
    color: 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800',
    icon: 'calendar',
    category: 'active'
  },
  interview_completed: {
    label: 'Interview Completed',
    description: 'Completed interview round',
    color: 'bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-300 dark:border-violet-800',
    icon: 'check-circle',
    category: 'active'
  },
  offer: {
    label: 'Offer Received',
    description: 'Job offer received',
    color: 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
    icon: 'trending-up',
    category: 'success'
  },
  offer_accepted: {
    label: 'Offer Accepted',
    description: 'Accepted the job offer',
    color: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800',
    icon: 'check-circle-2',
    category: 'success'
  },
  offer_declined: {
    label: 'Offer Declined',
    description: 'Declined the job offer',
    color: 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800',
    icon: 'x-circle',
    category: 'closed'
  },
  accepted: {
    label: 'Accepted',
    description: 'Position accepted',
    color: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800',
    icon: 'check-circle-2',
    category: 'success'
  },
  rejected: {
    label: 'Rejected',
    description: 'Application rejected',
    color: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800',
    icon: 'x-circle',
    category: 'negative'
  },
  withdrawn: {
    label: 'Withdrawn',
    description: 'Application withdrawn',
    color: 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-800',
    icon: 'minus-circle',
    category: 'closed'
  },
  abandoned: {
    label: 'Abandoned',
    description: 'Gave up on application',
    color: 'bg-gray-100 dark:bg-gray-950/30 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-800',
    icon: 'archive',
    category: 'closed'
  }
}

/**
 * Allowed status transitions (from -> to)
 * This defines the valid state machine for application status
 */
export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied: ['response_received', 'screening', 'rejected', 'withdrawn', 'abandoned'],
  response_received: ['screening', 'interview_scheduled', 'rejected', 'withdrawn', 'abandoned'],
  screening: ['interview_scheduled', 'rejected', 'withdrawn', 'abandoned'],
  interview_scheduled: ['interview_completed', 'rejected', 'withdrawn', 'abandoned'],
  interview_completed: ['interview_scheduled', 'offer', 'rejected', 'withdrawn', 'abandoned'],
  offer: ['offer_accepted', 'offer_declined', 'withdrawn'],
  offer_accepted: ['accepted'],
  offer_declined: [],
  accepted: [],
  rejected: [],
  withdrawn: [],
  abandoned: []
}

/**
 * Get status display info
 */
export function getStatusInfo(status: ApplicationStatus) {
  return STATUS_CONFIG[status]
}

/**
 * Get status label
 */
export function getStatusLabel(status: ApplicationStatus): string {
  return STATUS_CONFIG[status]?.label || status
}

/**
 * Get status color classes
 */
export function getStatusColor(status: ApplicationStatus): string {
  return STATUS_CONFIG[status]?.color || STATUS_CONFIG.applied.color
}

/**
 * Get allowed transitions for a status
 */
export function getAllowedTransitions(currentStatus: ApplicationStatus): ApplicationStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] || []
}

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return getAllowedTransitions(from).includes(to)
}

/**
 * Get all statuses grouped by category
 */
export function getStatusesByCategory() {
  const grouped: Record<string, ApplicationStatus[]> = {
    active: [],
    success: [],
    closed: [],
    negative: []
  }

  Object.entries(STATUS_CONFIG).forEach(([status, config]) => {
    grouped[config.category].push(status as ApplicationStatus)
  })

  return grouped
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Calculate days since a date
 */
export function getDaysSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Get status category (for filtering)
 */
export function getStatusCategory(status: ApplicationStatus): 'active' | 'success' | 'closed' | 'negative' {
  return STATUS_CONFIG[status]?.category || 'active'
}

/**
 * Check if status is terminal (no further transitions)
 */
export function isTerminalStatus(status: ApplicationStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0
}

/**
 * Get recommended next statuses based on current status
 */
export function getRecommendedNextStatuses(currentStatus: ApplicationStatus): {
  status: ApplicationStatus
  label: string
  description: string
}[] {
  const allowed = getAllowedTransitions(currentStatus)
  return allowed.map(status => ({
    status,
    label: STATUS_CONFIG[status].label,
    description: STATUS_CONFIG[status].description
  }))
}
