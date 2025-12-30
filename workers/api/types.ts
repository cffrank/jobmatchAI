/**
 * TypeScript Type Definitions for JobMatch AI Cloudflare Workers
 *
 * Comprehensive type definitions for:
 * - Environment bindings
 * - Database entities (users, jobs, applications)
 * - API request/response payloads
 * - Service interfaces
 */

import type { Context } from 'hono';

// =============================================================================
// Cloudflare Workers Environment Bindings
// =============================================================================

/**
 * Environment bindings available in Cloudflare Workers
 * These are configured via wrangler.toml and secrets
 */
export interface Env {
  // Supabase configuration
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // OpenAI configuration
  OPENAI_API_KEY: string;

  // SendGrid configuration
  SENDGRID_API_KEY?: string;
  SENDGRID_FROM_EMAIL?: string;

  // LinkedIn OAuth configuration
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  LINKEDIN_REDIRECT_URI?: string;

  // Apify configuration (job scraping)
  APIFY_API_TOKEN?: string;

  // App configuration
  APP_URL: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';

  // Cloudflare AI Gateway configuration (optional)
  CLOUDFLARE_ACCOUNT_ID?: string;
  AI_GATEWAY_SLUG?: string;
  CF_AIG_TOKEN?: string; // AI Gateway authentication token

  // Rate Limiting (future KV namespace)
  // RATE_LIMITS?: KVNamespace;

  // D1 Database (future)
  // DB?: D1Database;
}

/**
 * Hono Context with our environment bindings
 */
export type HonoContext = Context<{ Bindings: Env; Variables: Variables }>;

/**
 * Variables stored in Hono context (set by middleware)
 */
export interface Variables {
  userId?: string;
  userEmail?: string;
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
  isSaved: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
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
export interface SendEmailResponse {
  success: boolean;
  emailId: string;
  message: string;
}

// Exports
export interface ExportResponse {
  downloadUrl: string;
  fileName: string;
  expiresAt: string;
  format: 'pdf' | 'docx';
  fileSize: number;
}

// =============================================================================
// Rate Limiting Types
// =============================================================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  currentCount: number;
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
// Resume Parsing Types
// =============================================================================

export interface ParsedProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  headline: string;
  summary: string;
  linkedInUrl?: string;
}

export interface ParsedWorkExperience {
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  description: string;
  accomplishments: string[];
}

export interface ParsedEducation {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  grade?: string;
}

export interface ParsedSkill {
  name: string;
  endorsements: number;
}

export interface ParsedResume {
  profile: ParsedProfile;
  workExperience: ParsedWorkExperience[];
  education: ParsedEducation[];
  skills: ParsedSkill[];
}

// =============================================================================
// Database Table Names
// =============================================================================

export const TABLES = {
  USERS: 'users',
  WORK_EXPERIENCE: 'work_experience',
  EDUCATION: 'education',
  SKILLS: 'skills',
  JOB_PREFERENCES: 'job_preferences',
  JOBS: 'jobs',
  JOB_SEARCHES: 'job_searches',
  APPLICATIONS: 'applications',
  APPLICATION_VARIANTS: 'application_variants',
  EMAILS: 'emails',
  RATE_LIMITS: 'rate_limits',
  OAUTH_STATES: 'oauth_states',
  NOTIFICATIONS: 'notifications',
} as const;

export const BUCKETS = {
  EXPORTS: 'exports',
  RESUMES: 'resumes',
  AVATARS: 'avatars',
} as const;

// =============================================================================
// Job Compatibility Analysis Types
// =============================================================================

/**
 * Individual dimension score in the compatibility analysis
 */
export interface CompatibilityDimension {
  score: number; // 1-10 scale
  justification: string;
}

/**
 * Comprehensive job-candidate compatibility analysis
 * 10-dimension scoring framework with weighted average
 */
export interface JobCompatibilityAnalysis {
  // Overall weighted score (0-100)
  overallScore: number;

  // Recommendation category
  recommendation: 'Strong Match' | 'Good Match' | 'Moderate Match' | 'Weak Match' | 'Poor Match';

  // Individual dimension scores (1-10 scale each)
  dimensions: {
    skillMatch: CompatibilityDimension; // 30% weight
    industryMatch: CompatibilityDimension; // 15% weight
    experienceLevel: CompatibilityDimension; // 20% weight
    locationMatch: CompatibilityDimension; // 10% weight
    seniorityLevel: CompatibilityDimension; // 5% weight
    educationCertification: CompatibilityDimension; // 5% weight
    softSkillsLeadership: CompatibilityDimension; // 5% weight
    employmentStability: CompatibilityDimension; // 5% weight
    growthPotential: CompatibilityDimension; // 3% weight
    companyScaleAlignment: CompatibilityDimension; // 2% weight
  };

  // Summary insights
  strengths: string[]; // Top 3 strengths
  gaps: string[]; // Top 3 gaps/concerns
  redFlags: string[]; // Any critical concerns (empty if none)
}

/**
 * Request to analyze job-candidate compatibility
 */
export interface AnalyzeJobCompatibilityRequest {
  jobId: string;
}
