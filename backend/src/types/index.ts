/**
 * TypeScript Type Definitions for JobMatch AI Backend
 *
 * Comprehensive type definitions for:
 * - Database entities (users, jobs, applications)
 * - API request/response payloads
 * - Service interfaces
 * - Middleware extensions
 */

import type { Request } from 'express';
import type { User } from '@supabase/supabase-js';

// =============================================================================
// Express Extensions
// =============================================================================

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: User;
  userId: string;
}

// =============================================================================
// User & Profile Types
// =============================================================================

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  summary?: string;
  headline?: string;
  profileImageUrl?: string;
  linkedInUrl?: string;
  linkedInImported?: boolean;
  linkedInImportedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkExperience {
  id: string;
  userId: string;
  position: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
  accomplishments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Education {
  id: string;
  userId: string;
  degree: string;
  field: string;
  school: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  graduationYear?: number;
  gpa?: number;
  honors?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  userId: string;
  name: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  endorsements?: number;
  yearsOfExperience?: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobPreferences {
  id: string;
  userId: string;
  desiredTitles: string[];
  desiredLocations: string[];
  workArrangement: ('Remote' | 'Hybrid' | 'On-site')[];
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: string;
  autoSearchEnabled: boolean;
  searchFrequency: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Job Types
// =============================================================================

export interface Job {
  id: string;
  userId?: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  workArrangement: 'Remote' | 'Hybrid' | 'On-site' | 'Unknown';
  salaryMin?: number;
  salaryMax?: number;
  postedDate: string;
  description: string;
  url: string;
  source: 'linkedin' | 'indeed' | 'manual';
  requiredSkills?: string[];
  preferredSkills?: string[];
  experienceLevel?: string;
  matchScore?: number;
  algorithmicScore?: number;
  aiScore?: number;
  breakdown?: MatchBreakdown;
  aiInsights?: string[];
  missingSkills?: string[];
  recommendations?: string[];
  isSaved: boolean;
  isArchived: boolean;
  scrapedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchBreakdown {
  skillsMatch: number;
  experienceMatch: number;
  locationMatch: number;
  salaryMatch: number;
  titleMatch: number;
}

// =============================================================================
// Application Types
// =============================================================================

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  variants: ApplicationVariant[];
  selectedVariantId: string;
  editHistory: EditHistoryEntry[];
}

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'viewed'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn'
  | 'accepted';

export interface ApplicationVariant {
  id: string;
  name: string;
  resume: ResumeContent;
  coverLetter: string;
  aiRationale: string[];
}

export interface ResumeContent {
  summary: string;
  experience: ResumeExperience[];
  skills: string[];
  education: ResumeEducation[];
}

export interface ResumeExperience {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface ResumeEducation {
  degree: string;
  school: string;
  location: string;
  graduation: string;
  focus?: string;
}

export interface EditHistoryEntry {
  timestamp: string;
  userId: string;
  field: string;
  previousValue: unknown;
  newValue: unknown;
}

// =============================================================================
// Email Types
// =============================================================================

export interface EmailRecord {
  id: string;
  userId: string;
  applicationId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  includeResume: boolean;
  includeCoverLetter: boolean;
  sentAt: string;
  status: 'sent' | 'delivered' | 'bounced' | 'failed';
  fromEmail: string;
  fromName: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

// Applications
export interface GenerateApplicationRequest {
  jobId: string;
}

export interface GenerateApplicationResponse {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  createdAt: string;
  variants: ApplicationVariant[];
  selectedVariantId: string;
}

// Jobs
export interface ListJobsQuery {
  page?: number;
  limit?: number;
  archived?: boolean;
  saved?: boolean;
  source?: 'linkedin' | 'indeed' | 'manual';
  minMatchScore?: number;
}

export interface ListJobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ScrapeJobsRequest {
  keywords: string[];
  location?: string;
  workArrangement?: string;
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  maxResults?: number;
  sources?: ('linkedin' | 'indeed')[];
}

export interface ScrapeJobsResponse {
  success: boolean;
  searchId: string;
  jobCount: number;
  jobs: Job[];
  errors?: string[];
}

// Emails
export interface SendEmailRequest {
  applicationId: string;
  recipientEmail?: string;
}

export interface SendEmailResponse {
  success: boolean;
  emailId: string;
  message: string;
}

// Exports
export interface ExportRequest {
  applicationId: string;
}

export interface ExportResponse {
  downloadUrl: string;
  fileName: string;
  expiresAt: string;
  format: 'pdf' | 'docx';
  fileSize: number;
}

// Auth
export interface LinkedInCallbackQuery {
  code: string;
  state: string;
  error?: string;
  error_description?: string;
}

// =============================================================================
// Rate Limiting Types
// =============================================================================

export interface RateLimitRecord {
  id: string;
  userId: string;
  endpoint: string;
  requestCount: number;
  windowStart: string;
  windowEnd: string;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: AuthenticatedRequest) => string;
}

// =============================================================================
// OAuth State Types
// =============================================================================

export interface OAuthState {
  id: string;
  userId: string;
  provider: 'linkedin';
  state: string;
  createdAt: string;
  expiresAt: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Service Types
// =============================================================================

export interface OpenAIGenerationResult {
  resume: ResumeContent;
  coverLetter: string;
  aiRationale: string[];
}

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  postedDate?: string;
  url: string;
  source: 'linkedin' | 'indeed';
  jobType?: string;
  experienceLevel?: string;
  workArrangement?: string;
}

// =============================================================================
// Error Types
// =============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'INTERNAL_ERROR',
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HttpError';
  }

  toJSON(): ApiError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
    };
  }
}

// =============================================================================
// Job Deduplication Types
// =============================================================================

export interface JobDuplicate {
  id: string;
  canonicalJobId: string;
  duplicateJobId: string;
  titleSimilarity: number;
  companySimilarity: number;
  locationSimilarity: number;
  descriptionSimilarity: number;
  overallSimilarity: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  detectionMethod: 'fuzzy_match' | 'url_match' | 'manual';
  detectionDate: string;
  manuallyConfirmed: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalJobMetadata {
  jobId: string;
  completenessScore: number;
  sourceReliabilityScore: number;
  freshnessScore: number;
  overallQualityScore: number;
  fieldCount: number;
  descriptionLength: number;
  hasSalaryRange: boolean;
  hasUrl: boolean;
  sourceType: string;
  isCanonical: boolean;
  duplicateCount: number;
  calculatedAt: string;
  updatedAt: string;
}

export interface DeduplicationResult {
  totalJobsProcessed: number;
  duplicatesFound: number;
  canonicalJobsIdentified: number;
  processingTimeMs: number;
}

export interface MergeDuplicatesRequest {
  canonicalJobId: string;
  duplicateJobId: string;
}

export interface MergeDuplicatesResponse {
  success: boolean;
  canonicalJobId: string;
  duplicateJobId: string;
  message: string;
}

export interface GetDuplicatesResponse {
  job: Job;
  duplicates: Job[];
  duplicateMetadata: JobDuplicate[];
  totalDuplicates: number;
}

// =============================================================================
// Validation Schema Types (for Zod)
// =============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}
