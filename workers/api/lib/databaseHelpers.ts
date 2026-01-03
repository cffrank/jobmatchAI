/**
 * Database Helpers for Mapping Between DB Schema and TypeScript Types
 *
 * The database uses snake_case (created_at, first_name, etc.)
 * while TypeScript interfaces use camelCase (createdAt, firstName, etc.)
 *
 * These helper functions map between the two naming conventions.
 */

import type { UserProfile, WorkExperience, Education } from '../types';

/**
 * Maps database user record to UserProfile type
 */
export function mapUserProfile(dbRecord: Record<string, unknown>): UserProfile {
  return {
    id: dbRecord.id as string,
    email: dbRecord.email as string,
    firstName: dbRecord.first_name as string | undefined,
    lastName: dbRecord.last_name as string | undefined,
    phone: dbRecord.phone_number as string | undefined,
    location: dbRecord.city && dbRecord.state ? `${dbRecord.city as string}, ${dbRecord.state as string}` : undefined,
    summary: dbRecord.professional_summary as string | undefined,
    headline: dbRecord.headline as string | undefined,
    profileImageUrl: dbRecord.profile_image_url as string | undefined,
    linkedInUrl: dbRecord.linkedin_url as string | undefined,
    linkedInImported: dbRecord.linkedin_imported as boolean | undefined,
    linkedInImportedAt: dbRecord.linkedin_imported_at as string | undefined,
    createdAt: dbRecord.created_at as string,
    updatedAt: dbRecord.updated_at as string,
  };
}

/**
 * Maps database work experience record to WorkExperience type
 */
export function mapWorkExperience(dbRecord: Record<string, unknown>): WorkExperience {
  return {
    id: dbRecord.id as string,
    userId: dbRecord.user_id as string,
    position: dbRecord.job_title as string,
    company: dbRecord.company as string,
    location: dbRecord.location as string | undefined,
    startDate: dbRecord.start_date as string,
    endDate: dbRecord.end_date as string | undefined,
    current: dbRecord.is_current as boolean,
    description: dbRecord.description as string | undefined,
    accomplishments: (dbRecord.accomplishments as string[]) || [],
    createdAt: dbRecord.created_at as string,
    updatedAt: dbRecord.updated_at as string,
  };
}

/**
 * Maps database education record to Education type
 */
export function mapEducation(dbRecord: Record<string, unknown>): Education {
  return {
    id: dbRecord.id as string,
    userId: dbRecord.user_id as string,
    degree: dbRecord.degree as string,
    field: dbRecord.field_of_study as string,
    school: dbRecord.institution as string,
    location: dbRecord.location as string | undefined,
    startDate: dbRecord.start_date as string | undefined,
    endDate: dbRecord.end_date as string | undefined,
    graduationYear: dbRecord.graduation_year as number | undefined,
    gpa: dbRecord.grade as number | undefined,
    honors: (dbRecord.honors as string[]) || [],
    createdAt: dbRecord.created_at as string,
    updatedAt: dbRecord.updated_at,
  };
}
