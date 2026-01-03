// =============================================================================
// User Feedback Types
// =============================================================================

export type FeedbackType = 'interested' | 'not_interested' | 'spam';

export type NotInterestedReason =
  | 'wrong_location'
  | 'salary_too_low'
  | 'wrong_role_type'
  | 'skill_mismatch'
  | 'company_culture'
  | 'experience_level'
  | 'other';

export interface JobFeedback {
  id: string;
  jobId: string;
  userId: string;
  feedbackType: FeedbackType;
  reason?: NotInterestedReason;
  customReason?: string;
  createdAt: string;
}

export interface FeedbackStats {
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
  spamCount: number;
  topNotInterestedReasons: {
    reason: NotInterestedReason;
    count: number;
  }[];
  matchQualityImprovement: number; // Percentage improvement in match scores
}

export interface EnhancedJob {
  id: string;
  title: string;
  company: string;
  companyLogo: string;
  location: string;
  workArrangement: 'Remote' | 'Hybrid' | 'On-site' | 'Unknown';
  salaryMin: number;
  salaryMax: number;
  postedDate: string;
  applicationDeadline?: string;
  matchScore?: number;
  isSaved: boolean;
  requiredSkills?: string[];
  missingSkills?: string[];
  description: string;
  url?: string;
  source?: 'linkedin' | 'indeed' | 'manual';
  scrapedAt?: Date;
  savedAt?: string;
  expiresAt?: string;

  // Feedback-related fields
  userFeedback?: JobFeedback;
  spamReports?: number;
  duplicateOf?: string; // ID of original job if this is a duplicate
  matchReasoning?: {
    strengths: string[];
    concerns: string[];
    topSkillMatches: string[];
  };

  // Quality and spam detection fields (from Supabase)
  spamDetected?: boolean;
  spamProbability?: number;
  spamStatus?: 'clean' | 'suspicious' | 'spam' | 'scam' | 'expired' | 'pending_review';
  qualityScore?: number;
  dedupStatus?: 'canonical' | 'duplicate' | 'merged' | null;
  canonicalJobId?: string;
  lastSeenAt?: string;
  postedAt?: string;
}

// =============================================================================
// Feedback Filter Types
// =============================================================================

export interface FeedbackFilters {
  hideNotInterested?: boolean;
  hideSpam?: boolean;
  hideDuplicates?: boolean; // Hide duplicate job listings
  showOnlyVerified?: boolean; // Show only spam-verified jobs
  minMatchScore?: number;
  showOnlyHighQuality?: boolean; // 75%+ match score
  sortBy?: 'match_score' | 'date_posted' | 'salary';
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// Component Props
// =============================================================================

export interface JobFeedbackWidgetProps {
  jobId: string;
  currentFeedback?: JobFeedback;
  onThumbsUp?: () => void;
  onThumbsDown?: (reason: NotInterestedReason, customReason?: string) => void;
  onReportSpam?: () => void;
  disabled?: boolean;
}

export interface EnhancedJobCardProps {
  job: EnhancedJob;
  onViewDetails?: () => void;
  onSave?: () => void;
  onApply?: () => void;
  onFeedback?: (feedback: JobFeedback) => void;
  showFeedbackWidget?: boolean;
}

export interface FeedbackDashboardProps {
  feedbacks: JobFeedback[];
  stats: FeedbackStats;
  onDeleteFeedback?: (feedbackId: string) => void;
  onExportFeedback?: () => void;
}
