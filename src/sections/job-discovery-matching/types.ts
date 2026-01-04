// =============================================================================
// Data Types
// =============================================================================

export interface CompatibilityBreakdown {
  skillMatch: number
  experienceMatch: number
  industryMatch: number
  locationMatch: number
}

// New 10-dimension compatibility analysis types
export interface CompatibilityDimension {
  score: number // 1-10 scale
  justification: string
}

export interface JobCompatibilityAnalysis {
  // Overall weighted score (0-100)
  overallScore: number

  // Recommendation category
  recommendation: 'Strong Match' | 'Good Match' | 'Moderate Match' | 'Weak Match' | 'Poor Match'

  // Individual dimension scores (1-10 scale each)
  dimensions: {
    skillMatch: CompatibilityDimension // 30% weight
    industryMatch: CompatibilityDimension // 15% weight
    experienceLevel: CompatibilityDimension // 20% weight
    locationMatch: CompatibilityDimension // 10% weight
    seniorityLevel: CompatibilityDimension // 5% weight
    educationCertification: CompatibilityDimension // 5% weight
    softSkillsLeadership: CompatibilityDimension // 5% weight
    employmentStability: CompatibilityDimension // 5% weight
    growthPotential: CompatibilityDimension // 3% weight
    companyScaleAlignment: CompatibilityDimension // 2% weight
  }

  // Summary insights
  strengths: string[] // Top 3 strengths
  gaps: string[] // Top 3 gaps/concerns
  redFlags: string[] // Any critical concerns (empty if none)
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
  compatibilityAnalysis?: JobCompatibilityAnalysis // New 10-dimension analysis
  recommendations?: string[]
  // Fields for scraped jobs
  url?: string
  source?: 'linkedin' | 'indeed' | 'manual'
  scrapedAt?: Date
  // Job expiration and save tracking
  savedAt?: string  // ISO timestamp when job was saved
  expiresAt?: string  // ISO timestamp when unsaved job expires (48 hours from creation)
}

// =============================================================================
// Component Props
// =============================================================================

export interface JobDiscoveryProps {
  /** The list of jobs to display */
  jobs: Job[]
  /** Whether jobs are currently loading */
  loading?: boolean
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
  /** Called when user clicks the Edit button */
  onEdit?: () => void
}
