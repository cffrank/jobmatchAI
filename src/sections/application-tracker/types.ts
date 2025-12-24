export type ApplicationStatus =
  | 'applied'
  | 'screening'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'offer'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'

export interface Contact {
  name: string
  role: string
  email?: string
  phone?: string
}

export interface InterviewEntry {
  id: string
  round: string // e.g., "Phone Screen", "Technical Interview", "Final Round"
  date: string
  interviewers: string[]
  notes: string
  preparation?: string[]
  questionsAsked?: string[]
  reflection?: string
}

export interface ActivityLogEntry {
  id: string
  date: string
  type: 'status_change' | 'follow_up' | 'note' | 'email' | 'call'
  description: string
  details?: string
}

export interface FollowUpAction {
  id: string
  type: 'reminder' | 'action_item'
  title: string
  description: string
  dueDate?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
}

export interface TrackedApplication {
  id: string
  jobId: string // Reference to Job from Job Discovery
  applicationId: string // Reference to GeneratedApplication from Application Generator

  // Job summary (denormalized for quick display)
  company: string
  jobTitle: string
  location: string
  matchScore: number

  // Status tracking
  status: ApplicationStatus
  appliedDate: string
  lastUpdated: string
  statusHistory: {
    status: ApplicationStatus
    date: string
    note?: string
  }[]

  // Interview tracking
  interviews: InterviewEntry[]
  nextInterviewDate?: string

  // Contacts
  recruiter?: Contact
  hiringManager?: Contact

  // Follow-ups & reminders
  followUpActions: FollowUpAction[]
  nextAction?: string
  nextActionDate?: string

  // Notes & timeline
  notes: string
  activityLog: ActivityLogEntry[]

  // Offer details (if applicable)
  offerDetails?: {
    salary: string
    equity?: string
    benefits?: string[]
    deadline?: string
    notes?: string
  }

  // Metadata
  archived: boolean
  tags?: string[]
}

export interface ApplicationFilters {
  status?: ApplicationStatus[]
  statuses?: ApplicationStatus[]
  dateRange?: {
    start: string
    end: string
  }
  dateFrom?: string
  dateTo?: string
  company?: string
  jobTitle?: string
  searchQuery?: string
  archived?: boolean
  showArchived?: boolean
}

export interface AnalyticsData {
  totalApplications: number
  responseRate: number // Percentage that moved past "applied"
  averageTimeToResponse: number // Days
  averageTimeToInterview: number // Days
  averageTimeToOffer: number // Days
  applicationsByStatus: Record<ApplicationStatus, number>
  successByMatchScore: {
    range: string // e.g., "90-100%"
    responseRate: number
    offerRate: number
  }[]
  topPerformingVariants: {
    variantName: string
    responseRate: number
    count: number
  }[]
}

// Component Props
export interface ApplicationTrackerProps {
  applications: TrackedApplication[]
  filters?: ApplicationFilters
  onViewApplication?: (id: string) => void
  onUpdateStatus?: (id: string, status: ApplicationStatus, note?: string) => void
  onAddNote?: (id: string, note: string) => void
  onAddFollowUp?: (id: string, action: Omit<FollowUpAction, 'id'>) => void
  onCompleteAction?: (appId: string, actionId: string) => void
  onScheduleInterview?: (id: string, interview: Omit<InterviewEntry, 'id'>) => void
  onUpdateInterview?: (appId: string, interviewId: string, updates: Partial<InterviewEntry>) => void
  onArchive?: (id: string) => void
  onUnarchive?: (id: string) => void
  onDelete?: (id: string) => void
  onFilter?: (filters: ApplicationFilters) => void
  onSort?: (field: keyof TrackedApplication, direction: 'asc' | 'desc') => void
  onBulkUpdateStatus?: (ids: string[], status: ApplicationStatus) => void
  onBulkArchive?: (ids: string[]) => void
  onExport?: (ids: string[], format: 'csv' | 'excel') => void
}

export interface ApplicationDetailProps {
  application: TrackedApplication
  onBack?: () => void
  onUpdateStatus?: (status: ApplicationStatus, note?: string) => void
  onAddNote?: (note: string) => void
  onAddFollowUp?: (action: Omit<FollowUpAction, 'id'>) => void
  onCompleteAction?: (actionId: string) => void
  onScheduleInterview?: (interview: Omit<InterviewEntry, 'id'>) => void
  onUpdateInterview?: (interviewId: string, updates: Partial<InterviewEntry>) => void
  onViewJob?: () => void
  onViewApplication?: () => void
  onArchive?: () => void
  onDelete?: () => void
}

export interface ApplicationAnalyticsProps {
  analytics: AnalyticsData
  applications: TrackedApplication[]
  dateRange?: {
    start: string
    end: string
  }
  onDateRangeChange?: (range: { start: string; end: string }) => void
  onExport?: (format: 'pdf' | 'csv') => void
}
