// =============================================================================
// Data Types
// =============================================================================

export interface ResumeExperience {
  title: string
  company: string
  location: string
  startDate: string
  endDate: string
  bullets: string[]
}

export interface ResumeEducation {
  degree: string
  school: string
  location: string
  graduation: string
  focus?: string
}

export interface Resume {
  summary: string
  experience: ResumeExperience[]
  skills: string[]
  education: ResumeEducation[]
}

export interface ApplicationVariant {
  id: string
  name: string
  resume: Resume
  coverLetter: string
  aiRationale: string[]
}

export interface EditHistoryEntry {
  timestamp: string
  field: string
  originalValue: string
  editedValue: string
  reason: string
}

export interface EmailHistoryEntry {
  id: string
  recipientEmail: string
  subject: string
  body: string
  includeResume: boolean
  includeCoverLetter: boolean
  sentAt: string
  status: 'sent' | 'failed'
  fromEmail: string
  fromName: string
}

export interface GeneratedApplication {
  id: string
  jobId: string
  jobTitle: string
  company: string
  status: 'draft' | 'in_progress' | 'submitted'
  createdAt: string
  submittedAt: string | null
  selectedVariantId: string | null
  variants: ApplicationVariant[]
  editHistory: EditHistoryEntry[]
  lastEmailSentAt?: string
}

// =============================================================================
// Component Props
// =============================================================================

export interface ApplicationGeneratorProps {
  /** The list of generated applications */
  applications: GeneratedApplication[]
  /** Called when user wants to view/edit an application */
  onViewApplication?: (applicationId: string) => void
  /** Called when user wants to generate a new application for a job */
  onGenerateNew?: (jobId: string) => void
  /** Called when user selects a variant */
  onSelectVariant?: (applicationId: string, variantId: string) => void
  /** Called when user edits content */
  onEditContent?: (applicationId: string, field: string, value: string) => void
  /** Called when user saves as draft */
  onSaveDraft?: (applicationId: string) => void
  /** Called when user exports to PDF/DOCX */
  onExport?: (applicationId: string, format: 'pdf' | 'docx') => void
  /** Called when user sends via email */
  onEmail?: (applicationId: string) => void
  /** Called when user submits the application */
  onSubmit?: (applicationId: string) => void
  /** Called when user deletes a draft */
  onDelete?: (applicationId: string) => void
}

export interface ApplicationEditorProps {
  /** The application being edited */
  application: GeneratedApplication
  /** The currently selected variant */
  selectedVariant: ApplicationVariant
  /** Called when user goes back to application list */
  onBack?: () => void
  /** Called when user selects a different variant */
  onSelectVariant?: (variantId: string) => void
  /** Called when user edits a field */
  onEdit?: (field: string, value: string) => void
  /** Called when user saves changes */
  onSave?: () => void
  /** Called when user exports */
  onExport?: (format: 'pdf' | 'docx') => void
  /** Called when user emails */
  onEmail?: () => void
  /** Called when user submits */
  onSubmit?: () => void
}
