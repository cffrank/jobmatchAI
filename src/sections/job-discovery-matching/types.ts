// =============================================================================
// Data Types
// =============================================================================

export interface CompatibilityBreakdown {
  skillMatch: number
  experienceMatch: number
  industryMatch: number
  locationMatch: number
}

export interface Job {
  id: string
  title: string
  company: string
  companyLogo: string
  location: string
  workArrangement: 'Remote' | 'Hybrid' | 'On-site' | 'Unknown'
  salaryMin: number
  salaryMax: number
  postedDate: string
  applicationDeadline?: string
  matchScore?: number
  isSaved: boolean
  requiredSkills?: string[]
  missingSkills?: string[]
  description: string
  compatibilityBreakdown?: CompatibilityBreakdown
  recommendations?: string[]
  // Fields for scraped jobs
  url?: string
  source?: 'linkedin' | 'indeed' | 'manual'
  scrapedAt?: Date
}

// =============================================================================
// Component Props
// =============================================================================

export interface JobDiscoveryProps {
  /** The list of jobs to display */
  jobs: Job[]
  /** Called when user wants to view a job's full details */
  onViewDetails?: (jobId: string) => void
  /** Called when user saves/bookmarks a job */
  onSaveJob?: (jobId: string) => void
  /** Called when user unsaves/unbookmarks a job */
  onUnsaveJob?: (jobId: string) => void
  /** Called when user clicks the Apply button */
  onApply?: (jobId: string) => void
  /** Called when user performs a search */
  onSearch?: (query: string) => void
  /** Called when user changes filter settings */
  onFilter?: (filters: JobFilters) => void
}

export interface JobFilters {
  keyword?: string
  matchScoreMin?: number
  matchScoreMax?: number
  location?: string
  workArrangement?: 'Remote' | 'Hybrid' | 'On-site' | 'All'
  salaryMin?: number
  salaryMax?: number
  showSavedOnly?: boolean
}

export interface JobSearchParams {
  keywords: string
  location?: string
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship'
  workArrangement?: 'remote' | 'hybrid' | 'on-site'
  salaryMin?: number
  salaryMax?: number
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive'
  maxResults?: number
  sources?: ('linkedin' | 'indeed')[]
}

export interface JobSearchResult {
  success: boolean
  searchId: string
  jobCount: number
  jobs: Job[]
  errors?: string[]
}

export interface JobDetailProps {
  /** The job to display in detail */
  job: Job
  /** Called when user goes back to the job list */
  onBack?: () => void
  /** Called when user saves/bookmarks the job */
  onSaveJob?: () => void
  /** Called when user unsaves/unbookmarks the job */
  onUnsaveJob?: () => void
  /** Called when user clicks the Apply button */
  onApply?: () => void
}
