/**
 * Job Quality Service
 *
 * Frontend API integration for spam detection, deduplication, and quality feedback.
 * Connects to backend endpoints for Feature 1: Quality Job Listings.
 */

import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// =============================================================================
// Type Definitions
// =============================================================================

export interface SpamAnalysisResult {
  jobId: string;
  isSpam: boolean;
  spamProbability: number;
  confidence: 'low' | 'medium' | 'high';
  categories: string[];
  reasons: string[];
  flags: Record<string, boolean | number | string>;
  recommendation: 'safe' | 'review' | 'spam';
  analyzedAt: string;
}

export interface SpamStats {
  totalJobs: number;
  analyzedJobs: number;
  spamDetected: number;
  reviewRecommended: number;
  safe: number;
  analysisRate: number;
  spamRate: number;
}

export interface JobDuplicate {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  postedAt: string | null;
  source: string | null;
  url: string | null;
  similarity: number;
  matchedFields: string[];
}

export interface DeduplicationResult {
  totalJobs: number;
  duplicatesFound: number;
  canonicalJobsIdentified: number;
  duplicatesByGroup: {
    canonicalId: string;
    duplicateCount: number;
  }[];
}

export interface JobFeedback {
  feedbackType: 'interested' | 'not_interested' | 'spam';
  reason?: string;
  customReason?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get authentication token from Supabase session
 */
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return session.access_token;
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API request failed: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// Spam Detection API
// =============================================================================

/**
 * Analyze a single job for spam indicators
 * POST /api/spam-detection/analyze/:jobId
 */
export async function analyzeJobForSpam(jobId: string): Promise<SpamAnalysisResult> {
  const response = await apiRequest<{ success: boolean; jobId: string; result: SpamAnalysisResult }>(
    `/api/spam-detection/analyze/${jobId}`,
    { method: 'POST' }
  );
  return response.result;
}

/**
 * Analyze multiple jobs for spam in batch
 * POST /api/spam-detection/batch
 */
export async function analyzeBatchForSpam(
  jobIds: string[]
): Promise<{
  total: number;
  analyzed: number;
  cached: number;
  spamDetected: number;
  errors: number;
  results: SpamAnalysisResult[];
}> {
  return apiRequest('/api/spam-detection/batch', {
    method: 'POST',
    body: JSON.stringify({ jobIds }),
  });
}

/**
 * Get spam detection statistics for the user
 * GET /api/spam-detection/stats
 */
export async function getSpamStats(): Promise<SpamStats> {
  const response = await apiRequest<{ success: boolean; stats: SpamStats }>(
    '/api/spam-detection/stats'
  );
  return response.stats;
}

// =============================================================================
// Deduplication API
// =============================================================================

/**
 * Run deduplication on user's jobs
 * POST /api/jobs/deduplicate
 */
export async function deduplicateJobs(): Promise<DeduplicationResult> {
  const response = await apiRequest<{ success: boolean; result: DeduplicationResult }>(
    '/api/jobs/deduplicate',
    { method: 'POST' }
  );
  return response.result;
}

/**
 * Get duplicates for a specific job
 * GET /api/jobs/:id/duplicates
 */
export async function getJobDuplicates(jobId: string): Promise<JobDuplicate[]> {
  const response = await apiRequest<{ success: boolean; jobId: string; duplicates: JobDuplicate[] }>(
    `/api/jobs/${jobId}/duplicates`
  );
  return response.duplicates;
}

/**
 * Manually merge duplicate jobs
 * POST /api/jobs/merge
 */
export async function mergeDuplicateJobs(
  canonicalJobId: string,
  duplicateJobIds: string[]
): Promise<{ merged: number }> {
  const response = await apiRequest<{ success: boolean; merged: number }>(
    '/api/jobs/merge',
    {
      method: 'POST',
      body: JSON.stringify({ canonicalJobId, duplicateJobIds }),
    }
  );
  return { merged: response.merged };
}

/**
 * Remove duplicate relationship between jobs
 * DELETE /api/jobs/:id/duplicates/:duplicateId
 */
export async function removeDuplicateRelationship(
  canonicalJobId: string,
  duplicateJobId: string
): Promise<void> {
  await apiRequest(
    `/api/jobs/${canonicalJobId}/duplicates/${duplicateJobId}`,
    { method: 'DELETE' }
  );
}

// =============================================================================
// Job Feedback API (User Reports)
// =============================================================================

/**
 * Submit user feedback for a job
 * This saves to job_feedback and spam_reports tables
 */
export async function submitJobFeedback(
  jobId: string,
  feedback: JobFeedback
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Map our feedback types to database enum values
  const dbFeedbackType =
    feedback.feedbackType === 'interested' ? 'thumbs_up' :
    feedback.feedbackType === 'not_interested' ? 'not_interested' :
    'reported_spam'; // 'spam' becomes 'reported_spam'

  // Build reasons array
  const reasons: string[] = [];
  if (feedback.reason) reasons.push(feedback.reason);
  if (feedback.customReason) reasons.push(feedback.customReason);

  // Save to job_feedback table
  const { error: feedbackError } = await supabase
    .from('job_feedback')
    .insert({
      job_id: jobId,
      user_id: user.id,
      feedback_type: dbFeedbackType as 'thumbs_up' | 'thumbs_down' | 'not_interested' | 'reported_spam',
      reasons: reasons.length > 0 ? reasons : null,
      comment: feedback.customReason || null,
    });

  if (feedbackError) {
    console.error('Failed to save job feedback:', feedbackError);
    throw new Error('Failed to save feedback');
  }

  // If spam report, also add to spam_reports table
  if (feedback.feedbackType === 'spam') {
    const { error: spamError } = await supabase
      .from('spam_reports')
      .insert({
        job_id: jobId,
        reported_by_user_id: user.id, // Changed from user_id
        reason: feedback.reason || 'user_reported',
        details: feedback.customReason ? { customReason: feedback.customReason } : null,
      });

    if (spamError) {
      console.error('Failed to save spam report:', spamError);
      // Don't throw - feedback was saved, spam report is secondary
    }
  }
}

/**
 * Get user's feedback for a specific job
 */
export async function getUserJobFeedback(jobId: string): Promise<JobFeedback | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('job_feedback')
    .select('feedback_type, reasons, comment')
    .eq('job_id', jobId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  // Map database feedback type back to our interface
  const feedbackType =
    data.feedback_type === 'thumbs_up' ? 'interested' :
    data.feedback_type === 'not_interested' ? 'not_interested' :
    'spam'; // reported_spam, reported_scam, etc. become 'spam'

  return {
    feedbackType: feedbackType as 'interested' | 'not_interested' | 'spam',
    reason: data.reasons?.[0] || undefined,
    customReason: data.comment || undefined,
  };
}

/**
 * Get spam report count for a job (from all users)
 */
export async function getJobSpamReportCount(jobId: string): Promise<number> {
  const { count, error } = await supabase
    .from('spam_reports')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', jobId);

  if (error) {
    console.error('Failed to get spam report count:', error);
    return 0;
  }

  return count || 0;
}
