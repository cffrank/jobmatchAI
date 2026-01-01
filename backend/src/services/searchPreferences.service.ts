/**
 * Search Preferences Service
 *
 * Manages user job search preferences for automated job searching.
 * Handles:
 * - CRUD operations for search preferences
 * - Company and keyword blacklist management
 * - Job source toggling (LinkedIn, Indeed, etc.)
 * - Notification preferences
 *
 * Phase 1 of Automated Job Search Implementation
 */

import { supabaseAdmin } from '../config/supabase';
import { HttpError } from '../types';
import type {
  SearchPreferences,
  CreatePreferencesData,
  UpdatePreferencesData,
} from '../types';

// =============================================================================
// Constants
// =============================================================================

const TABLE_NAME = 'search_preferences';

const DEFAULT_PREFERENCES: Partial<SearchPreferences> = {
  desiredRoles: [],
  locations: [],
  remotePreference: 'any',
  employmentTypes: ['full-time'],
  companyBlacklist: [],
  keywordBlacklist: [],
  enabledSources: { linkedin: true, indeed: true },
  searchFrequency: 'daily',
  autoSearchEnabled: false,
  notificationEmail: true,
  notificationInApp: true,
  matchScoreThreshold: 70,
};

// =============================================================================
// Main CRUD Operations
// =============================================================================

/**
 * Get user's search preferences
 *
 * @param userId - The user's ID
 * @returns User's search preferences or null if not set
 * @throws HttpError if database query fails
 */
export async function getUserPreferences(
  userId: string
): Promise<SearchPreferences | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // Not found is acceptable - user hasn't set preferences yet
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching search preferences:', error);
    throw new HttpError(
      500,
      'Failed to fetch search preferences',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return mapDatabaseToPreferences(data);
}

/**
 * Create initial search preferences for a user
 *
 * @param userId - The user's ID
 * @param data - Partial preferences data (will be merged with defaults)
 * @returns Created search preferences
 * @throws HttpError if user already has preferences or database error
 */
export async function createPreferences(
  userId: string,
  data: CreatePreferencesData = {}
): Promise<SearchPreferences> {
  // Check if preferences already exist
  const existing = await getUserPreferences(userId);
  if (existing) {
    throw new HttpError(
      409,
      'Search preferences already exist for this user',
      'PREFERENCES_EXIST'
    );
  }

  // Merge with defaults
  const preferencesData = {
    user_id: userId,
    desired_roles: data.desiredRoles ?? DEFAULT_PREFERENCES.desiredRoles,
    locations: data.locations ?? DEFAULT_PREFERENCES.locations,
    salary_min: data.salaryMin,
    salary_max: data.salaryMax,
    remote_preference: data.remotePreference ?? DEFAULT_PREFERENCES.remotePreference,
    employment_types: data.employmentTypes ?? DEFAULT_PREFERENCES.employmentTypes,
    experience_level: data.experienceLevel,
    industries: data.industries,
    company_sizes: data.companySizes,
    company_blacklist: data.companyBlacklist ?? DEFAULT_PREFERENCES.companyBlacklist,
    keyword_blacklist: data.keywordBlacklist ?? DEFAULT_PREFERENCES.keywordBlacklist,
    enabled_sources: data.enabledSources ?? DEFAULT_PREFERENCES.enabledSources,
    search_frequency: data.searchFrequency ?? DEFAULT_PREFERENCES.searchFrequency,
    auto_search_enabled: data.autoSearchEnabled ?? DEFAULT_PREFERENCES.autoSearchEnabled,
    notification_email: data.notificationEmail ?? DEFAULT_PREFERENCES.notificationEmail,
    notification_in_app: data.notificationInApp ?? DEFAULT_PREFERENCES.notificationInApp,
    match_score_threshold: data.matchScoreThreshold ?? DEFAULT_PREFERENCES.matchScoreThreshold,
  };

  const { data: created, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .insert(preferencesData)
    .select()
    .single();

  if (error) {
    console.error('Error creating search preferences:', error);
    throw new HttpError(
      500,
      'Failed to create search preferences',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return mapDatabaseToPreferences(created);
}

/**
 * Update user's search preferences
 *
 * @param userId - The user's ID
 * @param data - Partial preferences data to update
 * @returns Updated search preferences
 * @throws HttpError if preferences don't exist or database error
 */
export async function updatePreferences(
  userId: string,
  data: UpdatePreferencesData
): Promise<SearchPreferences> {
  // Verify preferences exist
  const existing = await getUserPreferences(userId);
  if (!existing) {
    throw new HttpError(
      404,
      'Search preferences not found for this user',
      'PREFERENCES_NOT_FOUND'
    );
  }

  // Build update object (only include provided fields)
  const updateData: Record<string, unknown> = {};

  if (data.desiredRoles !== undefined) updateData.desired_roles = data.desiredRoles;
  if (data.locations !== undefined) updateData.locations = data.locations;
  if (data.salaryMin !== undefined) updateData.salary_min = data.salaryMin;
  if (data.salaryMax !== undefined) updateData.salary_max = data.salaryMax;
  if (data.remotePreference !== undefined) updateData.remote_preference = data.remotePreference;
  if (data.employmentTypes !== undefined) updateData.employment_types = data.employmentTypes;
  if (data.experienceLevel !== undefined) updateData.experience_level = data.experienceLevel;
  if (data.industries !== undefined) updateData.industries = data.industries;
  if (data.companySizes !== undefined) updateData.company_sizes = data.companySizes;
  if (data.companyBlacklist !== undefined) updateData.company_blacklist = data.companyBlacklist;
  if (data.keywordBlacklist !== undefined) updateData.keyword_blacklist = data.keywordBlacklist;
  if (data.enabledSources !== undefined) updateData.enabled_sources = data.enabledSources;
  if (data.searchFrequency !== undefined) updateData.search_frequency = data.searchFrequency;
  if (data.autoSearchEnabled !== undefined) updateData.auto_search_enabled = data.autoSearchEnabled;
  if (data.notificationEmail !== undefined) updateData.notification_email = data.notificationEmail;
  if (data.notificationInApp !== undefined) updateData.notification_in_app = data.notificationInApp;
  if (data.matchScoreThreshold !== undefined) updateData.match_score_threshold = data.matchScoreThreshold;

  const { data: updated, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .update(updateData)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating search preferences:', error);
    throw new HttpError(
      500,
      'Failed to update search preferences',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return mapDatabaseToPreferences(updated);
}

/**
 * Delete user's search preferences
 *
 * @param userId - The user's ID
 * @throws HttpError if database error
 */
export async function deletePreferences(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLE_NAME)
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting search preferences:', error);
    throw new HttpError(
      500,
      'Failed to delete search preferences',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }
}

// =============================================================================
// Blacklist Management
// =============================================================================

/**
 * Add item to blacklist (company or keyword)
 *
 * @param userId - The user's ID
 * @param type - Type of blacklist ('company' or 'keyword')
 * @param value - Value to add to blacklist
 * @returns Updated search preferences
 * @throws HttpError if preferences don't exist or database error
 */
export async function addToBlacklist(
  userId: string,
  type: 'company' | 'keyword',
  value: string
): Promise<SearchPreferences> {
  const preferences = await getUserPreferences(userId);
  if (!preferences) {
    throw new HttpError(
      404,
      'Search preferences not found for this user',
      'PREFERENCES_NOT_FOUND'
    );
  }

  const field = type === 'company' ? 'companyBlacklist' : 'keywordBlacklist';
  const dbField = type === 'company' ? 'company_blacklist' : 'keyword_blacklist';

  // Avoid duplicates
  const currentList = preferences[field] || [];
  if (currentList.includes(value)) {
    return preferences; // Already in blacklist
  }

  const updatedList = [...currentList, value];

  const { data: updated, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .update({ [dbField]: updatedList })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error(`Error adding to ${type} blacklist:`, error);
    throw new HttpError(
      500,
      `Failed to add to ${type} blacklist`,
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return mapDatabaseToPreferences(updated);
}

/**
 * Remove item from blacklist (company or keyword)
 *
 * @param userId - The user's ID
 * @param type - Type of blacklist ('company' or 'keyword')
 * @param value - Value to remove from blacklist
 * @returns Updated search preferences
 * @throws HttpError if preferences don't exist or database error
 */
export async function removeFromBlacklist(
  userId: string,
  type: 'company' | 'keyword',
  value: string
): Promise<SearchPreferences> {
  const preferences = await getUserPreferences(userId);
  if (!preferences) {
    throw new HttpError(
      404,
      'Search preferences not found for this user',
      'PREFERENCES_NOT_FOUND'
    );
  }

  const field = type === 'company' ? 'companyBlacklist' : 'keywordBlacklist';
  const dbField = type === 'company' ? 'company_blacklist' : 'keyword_blacklist';

  const currentList = preferences[field] || [];
  const updatedList = currentList.filter((item) => item !== value);

  const { data: updated, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .update({ [dbField]: updatedList })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error(`Error removing from ${type} blacklist:`, error);
    throw new HttpError(
      500,
      `Failed to remove from ${type} blacklist`,
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return mapDatabaseToPreferences(updated);
}

// =============================================================================
// Source Management
// =============================================================================

/**
 * Toggle job source enabled/disabled
 *
 * @param userId - The user's ID
 * @param source - Source to toggle (e.g., 'linkedin', 'indeed')
 * @param enabled - True to enable, false to disable
 * @returns Updated search preferences
 * @throws HttpError if preferences don't exist or database error
 */
export async function toggleSource(
  userId: string,
  source: string,
  enabled: boolean
): Promise<SearchPreferences> {
  const preferences = await getUserPreferences(userId);
  if (!preferences) {
    throw new HttpError(
      404,
      'Search preferences not found for this user',
      'PREFERENCES_NOT_FOUND'
    );
  }

  const updatedSources = {
    ...preferences.enabledSources,
    [source]: enabled,
  };

  const { data: updated, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .update({ enabled_sources: updatedSources })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error toggling source:', error);
    throw new HttpError(
      500,
      'Failed to toggle source',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return mapDatabaseToPreferences(updated);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Map database record to SearchPreferences interface
 * Converts snake_case database fields to camelCase TypeScript properties
 *
 * @param record - Database record
 * @returns SearchPreferences object
 */
function mapDatabaseToPreferences(record: Record<string, unknown>): SearchPreferences {
  return {
    id: record.id as string,
    userId: record.user_id as string,
    desiredRoles: (record.desired_roles as string[]) || [],
    locations: (record.locations as string[]) || [],
    salaryMin: record.salary_min as number | undefined,
    salaryMax: record.salary_max as number | undefined,
    remotePreference: (record.remote_preference as 'remote' | 'hybrid' | 'on-site' | 'any') || 'any',
    employmentTypes: (record.employment_types as string[]) || ['full-time'],
    experienceLevel: record.experience_level as 'entry' | 'mid' | 'senior' | 'executive' | undefined,
    industries: record.industries as string[] | undefined,
    companySizes: record.company_sizes as ('startup' | 'small' | 'medium' | 'large' | 'enterprise')[] | undefined,
    companyBlacklist: (record.company_blacklist as string[]) || [],
    keywordBlacklist: (record.keyword_blacklist as string[]) || [],
    enabledSources: (record.enabled_sources as Record<string, boolean>) || { linkedin: true, indeed: true },
    searchFrequency: (record.search_frequency as 'daily' | 'weekly' | 'manual') || 'daily',
    autoSearchEnabled: (record.auto_search_enabled as boolean) || false,
    notificationEmail: (record.notification_email as boolean) ?? true,
    notificationInApp: (record.notification_in_app as boolean) ?? true,
    matchScoreThreshold: (record.match_score_threshold as number) || 70,
    createdAt: record.created_at as string,
    updatedAt: record.updated_at as string,
  };
}
