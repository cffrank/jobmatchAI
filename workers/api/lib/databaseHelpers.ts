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
export function mapUserProfile(dbRecord: any): UserProfile {
  return {
    id: dbRecord.id,
    email: dbRecord.email,
    firstName: dbRecord.first_name,
    lastName: dbRecord.last_name,
    phone: dbRecord.phone_number,
    location: dbRecord.city && dbRecord.state ? `${dbRecord.city}, ${dbRecord.state}` : undefined,
    summary: dbRecord.professional_summary,
    headline: dbRecord.headline,
    profileImageUrl: dbRecord.profile_image_url,
    linkedInUrl: dbRecord.linkedin_url,
    linkedInImported: dbRecord.linkedin_imported,
    linkedInImportedAt: dbRecord.linkedin_imported_at,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
  };
}

/**
 * Maps database work experience record to WorkExperience type
 */
export function mapWorkExperience(dbRecord: any): WorkExperience {
  return {
    id: dbRecord.id,
    userId: dbRecord.user_id,
    position: dbRecord.job_title,
    company: dbRecord.company,
    location: dbRecord.location,
    startDate: dbRecord.start_date,
    endDate: dbRecord.end_date,
    current: dbRecord.is_current,
    description: dbRecord.description,
    accomplishments: dbRecord.accomplishments || [],
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
  };
}

/**
 * Maps database education record to Education type
 */
export function mapEducation(dbRecord: any): Education {
  return {
    id: dbRecord.id,
    userId: dbRecord.user_id,
    degree: dbRecord.degree,
    field: dbRecord.field_of_study,
    school: dbRecord.institution,
    location: dbRecord.location,
    startDate: dbRecord.start_date,
    endDate: dbRecord.end_date,
    graduationYear: dbRecord.graduation_year,
    gpa: dbRecord.grade,
    honors: dbRecord.honors || [],
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
  };
}
