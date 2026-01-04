/**
 * Search History Service
 *
 * Tracks and analyzes job search history for:
 * - Search deduplication (avoid redundant searches)
 * - Analytics and insights
 * - Performance monitoring
 * - User behavior patterns
 *
 * Phase 1 of Automated Job Search Implementation
 */

import { createHash } from 'crypto';
import { supabaseAdmin } from '../config/supabase';
import { HttpError } from '../types';
import type {
  SearchHistory,
  SearchHistoryStats,
  RecordSearchData,
} from '../types';

// =============================================================================
// Constants
// =============================================================================

const TABLE_NAME = 'search_history';

/**
 * Default number of days for statistics calculation
 */
const DEFAULT_STATS_DAYS = 30;

/**
 * Default limit for search history queries
 */
const DEFAULT_LIMIT = 50;

// =============================================================================
// Main Operations
// =============================================================================

/**
 * Record a new search execution
 *
 * @param userId - The user's ID
 * @param searchData - Search execution data
 * @returns Created search history record
 * @throws HttpError if database error
 */
export async function recordSearch(
  userId: string,
  searchData: RecordSearchData
): Promise<SearchHistory> {
  // Generate search fingerprint for deduplication
  const fingerprint = generateSearchFingerprint(searchData.criteria);

  const record = {
    user_id: userId,
    search_type: searchData.searchType,
    template_id: searchData.templateId,
    criteria: searchData.criteria,
    jobs_found: searchData.jobsFound,
    jobs_saved: searchData.jobsSaved ?? 0,
    high_matches: searchData.highMatches ?? 0,
    sources_used: searchData.sourcesUsed,
    search_fingerprint: fingerprint,
    duration_ms: searchData.durationMs,
    errors: searchData.errors,
  };

  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .insert(record)
    .select()
    .single();

  if (error) {
    // Handle duplicate search within timeframe
    if (error.code === '23505') { // Unique constraint violation
      console.warn('Duplicate search detected:', { userId, fingerprint });
      throw new HttpError(
        409,
        'Identical search was performed recently',
        'DUPLICATE_SEARCH',
        { fingerprint }
      );
    }

    console.error('Error recording search history:', error);
    throw new HttpError(
      500,
      'Failed to record search history',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return mapDatabaseToSearchHistory(data);
}

/**
 * Get search history for a user
 *
 * @param userId - The user's ID
 * @param limit - Maximum number of records to return
 * @param offset - Number of records to skip (for pagination)
 * @returns Array of search history records
 * @throws HttpError if database error
 */
export async function getSearchHistory(
  userId: string,
  limit: number = DEFAULT_LIMIT,
  offset: number = 0
): Promise<SearchHistory[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching search history:', error);
    throw new HttpError(
      500,
      'Failed to fetch search history',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return data.map(mapDatabaseToSearchHistory);
}

/**
 * Get search statistics for a user over a time period
 *
 * @param userId - The user's ID
 * @param days - Number of days to include in statistics (default: 30)
 * @returns Search statistics
 * @throws HttpError if database error
 */
export async function getSearchStats(
  userId: string,
  days: number = DEFAULT_STATS_DAYS
): Promise<SearchHistoryStats> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .select('jobs_found, jobs_saved, sources_used')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString());

  if (error) {
    console.error('Error fetching search stats:', error);
    throw new HttpError(
      500,
      'Failed to fetch search statistics',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  // Calculate statistics
  const totalSearches = data.length;
  const totalJobsFound = data.reduce((sum, record) => sum + (record.jobs_found || 0), 0);
  const totalJobsSaved = data.reduce((sum, record) => sum + (record.jobs_saved || 0), 0);
  const averageMatchesPerSearch = totalSearches > 0 ? totalJobsFound / totalSearches : 0;

  // Count source usage
  const sourceCount: Record<string, number> = {};
  data.forEach((record) => {
    const sources = record.sources_used || [];
    sources.forEach((source: string) => {
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    });
  });

  // Sort sources by usage
  const mostUsedSources = Object.entries(sourceCount)
    .sort(([, a], [, b]) => b - a)
    .map(([source]) => source);

  return {
    totalSearches,
    totalJobsFound,
    totalJobsSaved,
    averageMatchesPerSearch: Math.round(averageMatchesPerSearch * 100) / 100,
    mostUsedSources,
    periodStart: startDate.toISOString(),
    periodEnd: new Date().toISOString(),
  };
}

/**
 * Get the most recent search for a user
 *
 * @param userId - The user's ID
 * @returns Most recent search history record or null
 * @throws HttpError if database error
 */
export async function getLastSearch(
  userId: string
): Promise<SearchHistory | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // Not found is acceptable - user hasn't performed any searches
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching last search:', error);
    throw new HttpError(
      500,
      'Failed to fetch last search',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return mapDatabaseToSearchHistory(data);
}

/**
 * Check if a similar search was recently performed
 * Used for deduplication to avoid redundant searches
 *
 * @param userId - The user's ID
 * @param criteria - Search criteria to check
 * @param withinMinutes - Time window to check (default: 10 minutes)
 * @returns True if similar search exists, false otherwise
 * @throws HttpError if database error
 */
export async function hasSimilarRecentSearch(
  userId: string,
  criteria: Record<string, unknown>,
  withinMinutes: number = 10
): Promise<boolean> {
  const fingerprint = generateSearchFingerprint(criteria);
  const since = new Date();
  since.setMinutes(since.getMinutes() - withinMinutes);

  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .select('id')
    .eq('user_id', userId)
    .eq('search_fingerprint', fingerprint)
    .gte('created_at', since.toISOString())
    .limit(1);

  if (error) {
    console.error('Error checking for similar searches:', error);
    throw new HttpError(
      500,
      'Failed to check for similar searches',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return data.length > 0;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a deterministic fingerprint for search criteria
 * Used for deduplication of identical searches
 *
 * @param criteria - Search criteria object
 * @returns MD5 hash of normalized criteria
 */
function generateSearchFingerprint(criteria: Record<string, unknown>): string {
  // Normalize criteria by sorting keys and stringifying
  const sortedKeys = Object.keys(criteria).sort();
  const normalized: Record<string, unknown> = {};

  sortedKeys.forEach((key) => {
    normalized[key] = criteria[key];
  });

  const criteriaString = JSON.stringify(normalized);
  return createHash('md5').update(criteriaString).digest('hex');
}

/**
 * Map database record to SearchHistory interface
 * Converts snake_case database fields to camelCase TypeScript properties
 *
 * @param record - Database record
 * @returns SearchHistory object
 */
function mapDatabaseToSearchHistory(record: Record<string, unknown>): SearchHistory {
  return {
    id: record.id as string,
    userId: record.user_id as string,
    searchType: record.search_type as 'automated' | 'manual' | 'template',
    templateId: record.template_id as string | undefined,
    criteria: (record.criteria as Record<string, unknown>) || {},
    jobsFound: (record.jobs_found as number) || 0,
    jobsSaved: (record.jobs_saved as number) || 0,
    highMatches: (record.high_matches as number) || 0,
    sourcesUsed: (record.sources_used as string[]) || [],
    searchFingerprint: record.search_fingerprint as string | undefined,
    durationMs: record.duration_ms as number | undefined,
    errors: record.errors as Record<string, unknown> | undefined,
    createdAt: record.created_at as string,
  };
}

/**
 * Delete old search history records (cleanup)
 * Useful for data retention policies
 *
 * @param olderThanDays - Delete records older than this many days
 * @returns Number of records deleted
 * @throws HttpError if database error
 */
export async function deleteOldSearchHistory(olderThanDays: number): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    console.error('Error deleting old search history:', error);
    throw new HttpError(
      500,
      'Failed to delete old search history',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return data.length;
}
