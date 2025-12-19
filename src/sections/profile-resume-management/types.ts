// =============================================================================
// Data Types
// =============================================================================

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  location: string
  linkedInUrl: string
  profileImageUrl: string | null
  headline: string
  summary: string
}

export interface WorkExperience {
  id: string
  company: string
  position: string
  location: string
  startDate: string
  endDate: string | null
  current: boolean
  description: string
  accomplishments: string[]
}

export interface Education {
  id: string
  school: string
  degree: string
  field: string
  location: string
  startDate: string
  endDate: string
  gpa?: string
  highlights: string[]
}

export interface Skill {
  id: string
  name: string
  endorsements: number
}

export interface ResumeContact {
  email: string
  phone: string
  location: string
  linkedIn: string
}

export interface ResumeHeader {
  name: string
  title: string
  contact: ResumeContact
}

export interface ResumeSections {
  header: ResumeHeader
  summary: string
  experience: string[]
  education: string[]
  skills: string[]
}

export interface Resume {
  id: string
  userId: string
  type: 'master' | 'tailored'
  title: string
  createdAt: string
  updatedAt: string
  sections: ResumeSections
  formats: ('pdf' | 'docx' | 'txt')[]
}

export interface OptimizationSuggestion {
  id: string
  section: 'summary' | 'experience' | 'education' | 'skills'
  priority: 'high' | 'medium' | 'low'
  type: 'impact' | 'keywords' | 'formatting' | 'organization'
  title: string
  description: string
  suggestion: string
  accepted: boolean
}

// =============================================================================
// Component Props
// =============================================================================

export interface ResumeFile {
  id: string
  name: string
  format: 'pdf' | 'docx' | 'txt'
  uploadedAt: string
  size?: string
}

export interface ProfileOverviewProps {
  /** The user's profile information */
  user?: User | null
  /** List of work experience entries */
  workExperience: WorkExperience[]
  /** List of education entries */
  education: Education[]
  /** List of skills */
  skills: Skill[]
  /** The user's master resume */
  resume?: Resume | null
  /** AI-generated optimization suggestions */
  optimizationSuggestions: OptimizationSuggestion[]
  /** Uploaded resume files */
  resumeFiles?: ResumeFile[]
  /** Called when user wants to edit their profile */
  onEditProfile?: () => void
  /** Called when user wants to edit a work experience entry */
  onEditExperience?: (id: string) => void
  /** Called when user wants to delete a work experience entry */
  onDeleteExperience?: (id: string) => void
  /** Called when user wants to add new work experience */
  onAddExperience?: () => void
  /** Called when user wants to edit an education entry */
  onEditEducation?: (id: string) => void
  /** Called when user wants to delete an education entry */
  onDeleteEducation?: (id: string) => void
  /** Called when user wants to add new education */
  onAddEducation?: () => void
  /** Called when user wants to edit their skills */
  onEditSkills?: () => void
  /** Called when user wants to view resume */
  onViewResume?: () => void
  /** Called when user wants to edit resume */
  onEditResume?: () => void
  /** Called when user wants to download resume */
  onDownloadResume?: (format: 'pdf' | 'docx' | 'txt') => void
  /** Called when user uploads a resume file */
  onUploadResumeFile?: (file: File) => Promise<void>
  /** Called when user deletes a resume file */
  onDeleteResumeFile?: (format: 'pdf' | 'docx' | 'txt') => Promise<void>
  /** Called when user accepts an optimization suggestion */
  onAcceptSuggestion?: (id: string) => void
  /** Called when user dismisses an optimization suggestion */
  onDismissSuggestion?: (id: string) => void
}

export interface LinkedInImportWizardProps {
  /** Current step in the wizard (0-indexed) */
  currentStep: number
  /** Total number of steps */
  totalSteps: number
  /** Called when user clicks next */
  onNext?: () => void
  /** Called when user clicks back */
  onBack?: () => void
  /** Called when user completes the wizard */
  onComplete?: () => void
  /** Called when user cancels the wizard */
  onCancel?: () => void
  /** Called when user authorizes LinkedIn connection */
  onAuthorizeLinkedIn?: () => void
}

export interface ResumeEditorProps {
  /** The resume being edited */
  resume: Resume
  /** User's work experience for reference */
  workExperience: WorkExperience[]
  /** User's education for reference */
  education: Education[]
  /** User's skills for reference */
  skills: Skill[]
  /** AI-generated optimization suggestions */
  optimizationSuggestions?: OptimizationSuggestion[]
  /** Called when user saves resume changes */
  onSave?: (resume: Resume) => void
  /** Called when user cancels editing */
  onCancel?: () => void
  /** Called when user wants to preview resume */
  onPreview?: () => void
  /** Called when user accepts an optimization suggestion */
  onAcceptSuggestion?: (id: string) => void
  /** Called when user dismisses an optimization suggestion */
  onDismissSuggestion?: (id: string) => void
}

export interface ResumePreviewProps {
  /** The resume to preview */
  resume: Resume
  /** User's work experience to display */
  workExperience: WorkExperience[]
  /** User's education to display */
  education: Education[]
  /** User's skills to display */
  skills: Skill[]
  /** Called when user wants to download resume */
  onDownload?: (format: 'pdf' | 'docx' | 'txt') => void
  /** Called when user wants to edit resume */
  onEdit?: () => void
  /** Called when user closes the preview */
  onClose?: () => void
}
