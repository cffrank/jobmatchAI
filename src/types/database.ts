/**
 * Database types for Supabase tables
 */

import type {
  TrackedApplication,
  ApplicationStatus,
  Contact,
  InterviewEntry,
  ActivityLogEntry,
  FollowUpAction
} from '@/sections/application-tracker/types'

/**
 * Database row type for tracked_applications table
 */
export interface DbTrackedApplication {
  id: string
  user_id: string
  job_id: string | null
  application_id: string | null
  company: string
  job_title: string
  location: string | null
  match_score: number | null
  status: ApplicationStatus
  applied_date: string | null
  last_updated: string
  status_history: Array<{
    status: ApplicationStatus
    date: string
    note?: string
  }>
  interviews: InterviewEntry[]
  recruiter: Contact | null
  hiring_manager: Contact | null
  follow_up_actions: FollowUpAction[]
  next_action: string | null
  next_action_date: string | null
  next_interview_date: string | null
  offer_details: TrackedApplication['offerDetails'] | null
  activity_log: ActivityLogEntry[]
  archived: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Realtime payload for Postgres changes
 */
export interface RealtimePayload<T = Record<string, unknown>> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: { id: string }
}
