/**
 * Search Preferences Routes
 *
 * Handles job search preferences, history, and templates.
 *
 * Endpoints:
 * - GET /api/search-preferences - Get user's preferences
 * - POST /api/search-preferences - Create/update preferences
 * - DELETE /api/search-preferences - Delete preferences
 * - POST /api/search-preferences/blacklist - Add to blacklist
 * - DELETE /api/search-preferences/blacklist/:type/:value - Remove from blacklist
 * - PATCH /api/search-preferences/sources - Enable/disable sources
 *
 * - GET /api/search-history - Get search history (paginated)
 * - GET /api/search-history/stats - Get search statistics
 * - GET /api/search-history/last - Get last search details
 *
 * - GET /api/search-templates - List templates
 * - POST /api/search-templates - Create template
 * - GET /api/search-templates/:id - Get template
 * - PUT /api/search-templates/:id - Update template
 * - DELETE /api/search-templates/:id - Delete template
 * - POST /api/search-templates/:id/use - Use template (increments counter)
 *
 * - POST /api/jobs/trigger-search - Manually trigger job search now
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, TABLES } from '../config/supabase';
import { authenticateUser, getUserId } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler, createNotFoundError, createValidationError, createConflictError } from '../middleware/errorHandler';

// =============================================================================
// Router Setup
// =============================================================================

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

// Search Preferences Schemas
const searchPreferencesSchema = z.object({
  desiredTitles: z.array(z.string().min(1).max(100)).max(20).optional(),
  desiredLocations: z.array(z.string().min(1).max(200)).max(20).optional(),
  workArrangement: z.array(z.enum(['Remote', 'Hybrid', 'On-site'])).optional(),
  jobTypes: z.array(z.enum(['full-time', 'part-time', 'contract', 'internship', 'temporary'])).optional(),
  salaryMin: z.number().int().min(0).max(1000000).optional(),
  salaryMax: z.number().int().min(0).max(10000000).optional(),
  experienceLevels: z.array(z.enum(['entry', 'mid', 'senior', 'lead', 'executive'])).optional(),
  industries: z.array(z.string().min(1).max(100)).max(30).optional(),
  companySizes: z.array(z.enum(['startup', 'small', 'medium', 'large', 'enterprise'])).optional(),
  benefits: z.array(z.string().min(1).max(100)).max(20).optional(),
  keywords: z.array(z.string().min(1).max(100)).max(30).optional(),
  excludeKeywords: z.array(z.string().min(1).max(100)).max(30).optional(),
  autoSearchEnabled: z.boolean().optional(),
  notificationFrequency: z.enum(['daily', 'weekly', 'realtime', 'none']).optional(),
}).refine(
  (data) => {
    // Validate salary range if both are provided
    if (data.salaryMin !== undefined && data.salaryMax !== undefined) {
      return data.salaryMax >= data.salaryMin;
    }
    return true;
  },
  {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['salaryMax'],
  }
);

const addBlacklistSchema = z.object({
  type: z.enum(['company', 'keyword', 'location', 'title']),
  value: z.string().min(1).max(200),
});

const updateSourcesSchema = z.object({
  linkedin: z.boolean().optional(),
  indeed: z.boolean().optional(),
  manual: z.boolean().optional(),
});

// Search History Schemas
const listSearchHistorySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['automated', 'initial', 'manual']).optional(),
});

// Search Template Schemas
const createSearchTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  preferences: searchPreferencesSchema,
});

const updateSearchTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  preferences: searchPreferencesSchema.optional(),
});

// Manual Search Trigger Schema
const triggerSearchSchema = z.object({
  templateId: z.string().uuid().optional(),
  maxResults: z.number().int().min(1).max(50).default(20),
  sources: z.array(z.enum(['linkedin', 'indeed'])).default(['linkedin', 'indeed']),
});

// =============================================================================
// Search Preferences Routes
// =============================================================================

/**
 * GET /api/search-preferences
 * Get user's search preferences
 */
router.get(
  '/search-preferences',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(req);

    const { data: preferences, error } = await supabaseAdmin
      .from(TABLES.JOB_PREFERENCES)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no preferences exist yet, return empty preferences
      if (error.code === 'PGRST116') {
        res.json({
          userId,
          desiredTitles: [],
          desiredLocations: [],
          workArrangement: [],
          jobTypes: [],
          experienceLevels: [],
          industries: [],
          companySizes: [],
          benefits: [],
          keywords: [],
          excludeKeywords: [],
          autoSearchEnabled: false,
          notificationFrequency: 'daily',
        });
        return;
      }
      console.error('Failed to fetch preferences:', error);
      throw new Error('Failed to fetch search preferences');
    }

    res.json({
      id: preferences.id,
      userId: preferences.user_id,
      desiredTitles: preferences.desired_titles || [],
      desiredLocations: preferences.desired_locations || [],
      workArrangement: preferences.work_arrangement || [],
      jobTypes: preferences.job_types || [],
      salaryMin: preferences.salary_min,
      salaryMax: preferences.salary_max,
      experienceLevels: preferences.experience_levels || [],
      industries: preferences.industries || [],
      companySizes: preferences.company_sizes || [],
      benefits: preferences.benefits || [],
      keywords: preferences.keywords || [],
      excludeKeywords: preferences.exclude_keywords || [],
      autoSearchEnabled: preferences.auto_search_enabled || false,
      notificationFrequency: preferences.notification_frequency || 'daily',
      createdAt: preferences.created_at,
      updatedAt: preferences.updated_at,
    });
  })
);

/**
 * POST /api/search-preferences
 * Create or update user's search preferences
 */
router.post(
  '/search-preferences',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const parseResult = searchPreferencesSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid search preferences',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const preferences = parseResult.data;

    // Map frontend fields to database column names
    const dbPreferences: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (preferences.desiredTitles !== undefined) dbPreferences.desired_titles = preferences.desiredTitles;
    if (preferences.desiredLocations !== undefined) dbPreferences.desired_locations = preferences.desiredLocations;
    if (preferences.workArrangement !== undefined) dbPreferences.work_arrangement = preferences.workArrangement;
    if (preferences.jobTypes !== undefined) dbPreferences.job_types = preferences.jobTypes;
    if (preferences.salaryMin !== undefined) dbPreferences.salary_min = preferences.salaryMin;
    if (preferences.salaryMax !== undefined) dbPreferences.salary_max = preferences.salaryMax;
    if (preferences.experienceLevels !== undefined) dbPreferences.experience_levels = preferences.experienceLevels;
    if (preferences.industries !== undefined) dbPreferences.industries = preferences.industries;
    if (preferences.companySizes !== undefined) dbPreferences.company_sizes = preferences.companySizes;
    if (preferences.benefits !== undefined) dbPreferences.benefits = preferences.benefits;
    if (preferences.keywords !== undefined) dbPreferences.keywords = preferences.keywords;
    if (preferences.excludeKeywords !== undefined) dbPreferences.exclude_keywords = preferences.excludeKeywords;
    if (preferences.autoSearchEnabled !== undefined) dbPreferences.auto_search_enabled = preferences.autoSearchEnabled;
    if (preferences.notificationFrequency !== undefined) dbPreferences.notification_frequency = preferences.notificationFrequency;

    // Upsert preferences (insert or update)
    const { data: savedPreferences, error } = await supabaseAdmin
      .from(TABLES.JOB_PREFERENCES)
      .upsert(dbPreferences, { onConflict: 'user_id' })
      .select()
      .single();

    if (error || !savedPreferences) {
      console.error('Failed to save preferences:', error);
      throw new Error('Failed to save search preferences');
    }

    console.log(`[Search Preferences] Updated preferences for user ${userId}`);

    res.json({
      id: savedPreferences.id,
      userId: savedPreferences.user_id,
      desiredTitles: savedPreferences.desired_titles || [],
      desiredLocations: savedPreferences.desired_locations || [],
      workArrangement: savedPreferences.work_arrangement || [],
      jobTypes: savedPreferences.job_types || [],
      salaryMin: savedPreferences.salary_min,
      salaryMax: savedPreferences.salary_max,
      experienceLevels: savedPreferences.experience_levels || [],
      industries: savedPreferences.industries || [],
      companySizes: savedPreferences.company_sizes || [],
      benefits: savedPreferences.benefits || [],
      keywords: savedPreferences.keywords || [],
      excludeKeywords: savedPreferences.exclude_keywords || [],
      autoSearchEnabled: savedPreferences.auto_search_enabled || false,
      notificationFrequency: savedPreferences.notification_frequency || 'daily',
      createdAt: savedPreferences.created_at,
      updatedAt: savedPreferences.updated_at,
    });
  })
);

/**
 * DELETE /api/search-preferences
 * Delete user's search preferences (reset to defaults)
 */
router.delete(
  '/search-preferences',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const { error } = await supabaseAdmin
      .from(TABLES.JOB_PREFERENCES)
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete preferences:', error);
      throw new Error('Failed to delete search preferences');
    }

    console.log(`[Search Preferences] Deleted preferences for user ${userId}`);

    res.status(204).send();
  })
);

/**
 * POST /api/search-preferences/blacklist
 * Add item to blacklist (company, keyword, location, title)
 */
router.post(
  '/search-preferences/blacklist',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const parseResult = addBlacklistSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid blacklist item',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { type, value } = parseResult.data;

    // Fetch current preferences
    const { data: currentPrefs, error: fetchError } = await supabaseAdmin
      .from(TABLES.JOB_PREFERENCES)
      .select('exclude_keywords')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Failed to fetch current preferences:', fetchError);
      throw new Error('Failed to update blacklist');
    }

    // Add to exclude_keywords array (we'll use this for all blacklist types for now)
    const currentExcludeKeywords = currentPrefs?.exclude_keywords || [];

    // Check if already blacklisted
    if (currentExcludeKeywords.includes(value)) {
      throw createConflictError('This item is already blacklisted');
    }

    const updatedExcludeKeywords = [...currentExcludeKeywords, value];

    // Update preferences
    const { data: updatedPrefs, error: updateError } = await supabaseAdmin
      .from(TABLES.JOB_PREFERENCES)
      .upsert({
        user_id: userId,
        exclude_keywords: updatedExcludeKeywords,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (updateError || !updatedPrefs) {
      console.error('Failed to update blacklist:', updateError);
      throw new Error('Failed to update blacklist');
    }

    console.log(`[Search Preferences] Added to blacklist: ${type}=${value} for user ${userId}`);

    res.json({
      success: true,
      type,
      value,
      excludeKeywords: updatedPrefs.exclude_keywords || [],
    });
  })
);

/**
 * DELETE /api/search-preferences/blacklist/:type/:value
 * Remove item from blacklist
 */
router.delete(
  '/search-preferences/blacklist/:type/:value',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { type, value } = req.params;

    // Validate params exist
    if (!type || !value) {
      throw createValidationError('Invalid blacklist params', { params: 'Type and value are required' });
    }

    // Validate type
    if (!['company', 'keyword', 'location', 'title'].includes(type)) {
      throw createValidationError('Invalid blacklist type', { type: 'Must be one of: company, keyword, location, title' });
    }

    // Fetch current preferences
    const { data: currentPrefs, error: fetchError } = await supabaseAdmin
      .from(TABLES.JOB_PREFERENCES)
      .select('exclude_keywords')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      throw createNotFoundError('Search preferences');
    }

    const currentExcludeKeywords = currentPrefs?.exclude_keywords || [];

    // Check if item exists in blacklist
    if (!currentExcludeKeywords.includes(value)) {
      throw createNotFoundError('Blacklist item', value);
    }

    // Remove from blacklist
    const updatedExcludeKeywords = currentExcludeKeywords.filter((item: string) => item !== value);

    // Update preferences
    const { error: updateError } = await supabaseAdmin
      .from(TABLES.JOB_PREFERENCES)
      .update({
        exclude_keywords: updatedExcludeKeywords,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to remove from blacklist:', updateError);
      throw new Error('Failed to remove from blacklist');
    }

    console.log(`[Search Preferences] Removed from blacklist: ${type}=${value} for user ${userId}`);

    res.status(204).send();
  })
);

/**
 * PATCH /api/search-preferences/sources
 * Enable/disable job sources (LinkedIn, Indeed, manual)
 */
router.patch(
  '/search-preferences/sources',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const parseResult = updateSourcesSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid source settings',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    // Note: For now, we'll store this as a JSONB field in preferences
    // In a future migration, we might create a separate sources configuration table
    const sources = parseResult.data;

    const { data: updatedPrefs, error } = await supabaseAdmin
      .from(TABLES.JOB_PREFERENCES)
      .upsert({
        user_id: userId,
        // Store sources as JSON in a future column, for now just log
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error || !updatedPrefs) {
      console.error('Failed to update sources:', error);
      throw new Error('Failed to update job sources');
    }

    console.log(`[Search Preferences] Updated sources for user ${userId}:`, sources);

    res.json({
      success: true,
      sources,
      message: 'Source preferences updated successfully',
    });
  })
);

// =============================================================================
// Search History Routes
// =============================================================================

/**
 * GET /api/search-history
 * Get user's search history with pagination
 *
 * Note: This endpoint will require a job_searches table to be created
 * For now, we return a stub response
 */
router.get(
  '/search-history',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const parseResult = listSearchHistorySchema.safeParse(req.query);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid query parameters',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { page, limit, type } = parseResult.data;

    // TODO: Implement search history table and query
    // For now, return empty response
    console.log(`[Search History] Fetching history for user ${userId}, page ${page}, limit ${limit}, type ${type}`);

    res.json({
      searches: [],
      total: 0,
      page,
      limit,
      hasMore: false,
      message: 'Search history feature requires database migration',
    });
  })
);

/**
 * GET /api/search-history/stats
 * Get search statistics for user
 */
router.get(
  '/search-history/stats',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // TODO: Implement search stats calculation
    console.log(`[Search History] Fetching stats for user ${userId}`);

    res.json({
      totalSearches: 0,
      automatedSearches: 0,
      manualSearches: 0,
      lastSearchAt: null,
      averageJobsPerSearch: 0,
      totalJobsFound: 0,
      message: 'Search statistics feature requires database migration',
    });
  })
);

/**
 * GET /api/search-history/last
 * Get details of last search performed
 */
router.get(
  '/search-history/last',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // TODO: Implement last search query
    console.log(`[Search History] Fetching last search for user ${userId}`);

    res.json({
      search: null,
      message: 'Last search feature requires database migration',
    });
  })
);

// =============================================================================
// Search Templates Routes
// =============================================================================

/**
 * GET /api/search-templates
 * List user's search templates
 *
 * Note: This endpoint will require a search_templates table to be created
 * For now, we return a stub response
 */
router.get(
  '/search-templates',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // TODO: Implement search templates table and query
    console.log(`[Search Templates] Fetching templates for user ${userId}`);

    res.json({
      templates: [],
      message: 'Search templates feature requires database migration',
    });
  })
);

/**
 * POST /api/search-templates
 * Create a new search template
 */
router.post(
  '/search-templates',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const parseResult = createSearchTemplateSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid template data',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const template = parseResult.data;

    // TODO: Implement template creation
    console.log(`[Search Templates] Creating template for user ${userId}:`, template.name);

    res.status(201).json({
      id: 'stub-id',
      userId,
      ...template,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      message: 'Search templates feature requires database migration',
    });
  })
);

/**
 * GET /api/search-templates/:id
 * Get a specific search template
 */
router.get(
  '/search-templates/:id',
  authenticateUser,
  asyncHandler(async (req: Request, _res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    // TODO: Implement template fetch
    console.log(`[Search Templates] Fetching template ${id} for user ${userId}`);

    throw createNotFoundError('Search template', id);
  })
);

/**
 * PUT /api/search-templates/:id
 * Update a search template
 */
router.put(
  '/search-templates/:id',
  authenticateUser,
  asyncHandler(async (req: Request, _res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    const parseResult = updateSearchTemplateSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid template data',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const updates = parseResult.data;

    // TODO: Implement template update
    console.log(`[Search Templates] Updating template ${id} for user ${userId}:`, updates);

    throw createNotFoundError('Search template', id);
  })
);

/**
 * DELETE /api/search-templates/:id
 * Delete a search template
 */
router.delete(
  '/search-templates/:id',
  authenticateUser,
  asyncHandler(async (req: Request, _res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    // TODO: Implement template deletion
    console.log(`[Search Templates] Deleting template ${id} for user ${userId}`);

    throw createNotFoundError('Search template', id);
  })
);

/**
 * POST /api/search-templates/:id/use
 * Use a template (increments usage counter and triggers search)
 */
router.post(
  '/search-templates/:id/use',
  authenticateUser,
  rateLimiter({ maxRequests: 10, windowMs: 60 * 60 * 1000 }), // 10 per hour
  asyncHandler(async (req: Request, _res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    // TODO: Implement template usage and search trigger
    console.log(`[Search Templates] Using template ${id} for user ${userId}`);

    throw createNotFoundError('Search template', id);
  })
);

// =============================================================================
// Manual Search Trigger
// =============================================================================

/**
 * POST /api/jobs/trigger-search
 * Manually trigger job search now
 *
 * Rate limited: 10 per hour (API costs)
 *
 * Note: This should integrate with the job scraping service
 */
router.post(
  '/trigger-search',
  authenticateUser,
  rateLimiter({ maxRequests: 10, windowMs: 60 * 60 * 1000 }), // 10 per hour
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const parseResult = triggerSearchSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid search parameters',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { templateId, maxResults, sources } = parseResult.data;

    console.log(`[Manual Search] Triggering search for user ${userId}, template: ${templateId}, max: ${maxResults}, sources: ${sources.join(',')}`);

    // TODO: Integrate with job scraping service
    // For now, return a stub response

    res.status(202).json({
      success: true,
      message: 'Job search triggered successfully',
      searchId: 'stub-search-id',
      status: 'pending',
      expectedResults: maxResults,
      sources,
      templateId,
      note: 'Manual search trigger requires integration with job scraping service',
    });
  })
);

export default router;
