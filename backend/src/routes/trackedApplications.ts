/**
 * Tracked Applications Routes
 *
 * Handles tracked application management (Application Tracker feature).
 *
 * Endpoints:
 * - GET /api/tracked-applications - List user's tracked applications (paginated)
 * - GET /api/tracked-applications/active - List non-archived tracked applications (paginated)
 * - GET /api/tracked-applications/:id - Get tracked application by ID
 * - POST /api/tracked-applications - Create tracked application
 * - PATCH /api/tracked-applications/:id - Update tracked application
 * - PATCH /api/tracked-applications/:id/archive - Archive tracked application
 * - PATCH /api/tracked-applications/:id/unarchive - Unarchive tracked application
 * - DELETE /api/tracked-applications/:id - Delete tracked application
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticateUser, getUserId } from '../middleware/auth';
import { asyncHandler, createNotFoundError, createValidationError } from '../middleware/errorHandler';

// =============================================================================
// Router Setup
// =============================================================================

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const listTrackedApplicationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  archived: z.coerce.boolean().optional(),
});

const createTrackedApplicationSchema = z.object({
  jobId: z.string().optional(),
  applicationId: z.string().optional(),
  company: z.string().min(1, 'Company is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  location: z.string().optional(),
  matchScore: z.number().optional(),
  status: z.enum([
    'applied',
    'response_received',
    'screening',
    'interview_scheduled',
    'interview_completed',
    'offer',
    'offer_accepted',
    'offer_declined',
    'accepted',
    'rejected',
    'withdrawn',
    'abandoned',
  ]),
  appliedDate: z.string().optional(),
  statusHistory: z.array(z.any()).optional(),
  interviews: z.array(z.any()).optional(),
  recruiter: z.any().optional(),
  hiringManager: z.any().optional(),
  followUpActions: z.array(z.any()).optional(),
  activityLog: z.array(z.any()).optional(),
  offerDetails: z.any().optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.string().optional(),
  nextInterviewDate: z.string().optional(),
  notes: z.string().optional(),
  archived: z.boolean().optional(),
});

const updateTrackedApplicationSchema = z.object({
  jobId: z.string().optional(),
  applicationId: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  location: z.string().optional(),
  matchScore: z.number().optional(),
  status: z.enum([
    'applied',
    'response_received',
    'screening',
    'interview_scheduled',
    'interview_completed',
    'offer',
    'offer_accepted',
    'offer_declined',
    'accepted',
    'rejected',
    'withdrawn',
    'abandoned',
  ]).optional(),
  appliedDate: z.string().optional(),
  statusHistory: z.array(z.any()).optional(),
  interviews: z.array(z.any()).optional(),
  recruiter: z.any().optional(),
  hiringManager: z.any().optional(),
  followUpActions: z.array(z.any()).optional(),
  activityLog: z.array(z.any()).optional(),
  offerDetails: z.any().optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.string().optional(),
  nextInterviewDate: z.string().optional(),
  notes: z.string().optional(),
  archived: z.boolean().optional(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/tracked-applications
 * List user's tracked applications with pagination
 */
router.get(
  '/',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const parseResult = listTrackedApplicationsSchema.safeParse(req.query);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid query parameters',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { page, limit, archived } = parseResult.data;
    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseAdmin
      .from('tracked_applications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('last_updated', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by archived status if specified
    if (archived !== undefined) {
      query = query.eq('archived', archived);
    }

    const { data: applications, error, count } = await query;

    if (error) {
      console.error('Failed to fetch tracked applications:', error);
      throw new Error('Failed to fetch tracked applications');
    }

    // Transform snake_case to camelCase
    const transformedApplications = (applications || []).map(mapDbToTrackedApplication);

    res.json({
      trackedApplications: transformedApplications,
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    });
  })
);

/**
 * GET /api/tracked-applications/active
 * List non-archived tracked applications with pagination
 */
router.get(
  '/active',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const parseResult = listTrackedApplicationsSchema.safeParse(req.query);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid query parameters',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { page, limit } = parseResult.data;
    const offset = (page - 1) * limit;

    const { data: applications, error, count } = await supabaseAdmin
      .from('tracked_applications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('archived', false)
      .order('last_updated', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch active tracked applications:', error);
      throw new Error('Failed to fetch active tracked applications');
    }

    // Transform snake_case to camelCase
    const transformedApplications = (applications || []).map(mapDbToTrackedApplication);

    res.json({
      activeApplications: transformedApplications,
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    });
  })
);

/**
 * GET /api/tracked-applications/:id
 * Get tracked application by ID
 */
router.get(
  '/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    const { data: application, error } = await supabaseAdmin
      .from('tracked_applications')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !application) {
      throw createNotFoundError('Tracked application', id);
    }

    // Transform snake_case to camelCase
    const transformedApplication = mapDbToTrackedApplication(application);

    res.json(transformedApplication);
  })
);

/**
 * POST /api/tracked-applications
 * Create tracked application
 */
router.post(
  '/',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const parseResult = createTrackedApplicationSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const data = parseResult.data;

    // Transform camelCase to snake_case for database
    const dbData = {
      user_id: userId,
      job_id: data.jobId || null,
      application_id: data.applicationId || null,
      company: data.company,
      job_title: data.jobTitle,
      location: data.location || null,
      match_score: data.matchScore || null,
      status: data.status,
      applied_date: data.appliedDate || null,
      last_updated: new Date().toISOString(),
      status_history: data.statusHistory || [],
      interviews: data.interviews || [],
      recruiter: data.recruiter || null,
      hiring_manager: data.hiringManager || null,
      follow_up_actions: data.followUpActions || [],
      activity_log: data.activityLog || [],
      offer_details: data.offerDetails || null,
      next_action: data.nextAction || null,
      next_action_date: data.nextActionDate || null,
      next_interview_date: data.nextInterviewDate || null,
      notes: data.notes || null,
      archived: data.archived || false,
    };

    const { data: application, error: insertError } = await supabaseAdmin
      .from('tracked_applications')
      .insert(dbData)
      .select()
      .single();

    if (insertError || !application) {
      console.error('Failed to create tracked application:', insertError);
      throw new Error('Failed to create tracked application');
    }

    // Transform snake_case to camelCase
    const transformedApplication = mapDbToTrackedApplication(application);

    res.status(201).json(transformedApplication);
  })
);

/**
 * PATCH /api/tracked-applications/:id
 * Update tracked application
 */
router.patch(
  '/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    const parseResult = updateTrackedApplicationSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const data = parseResult.data;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('tracked_applications')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      throw createNotFoundError('Tracked application', id);
    }

    // Transform camelCase to snake_case for database
    const dbData: Record<string, unknown> = {
      last_updated: new Date().toISOString(),
    };

    if (data.jobId !== undefined) dbData.job_id = data.jobId || null;
    if (data.applicationId !== undefined) dbData.application_id = data.applicationId || null;
    if (data.company !== undefined) dbData.company = data.company;
    if (data.jobTitle !== undefined) dbData.job_title = data.jobTitle;
    if (data.location !== undefined) dbData.location = data.location || null;
    if (data.matchScore !== undefined) dbData.match_score = data.matchScore || null;
    if (data.status !== undefined) dbData.status = data.status;
    if (data.appliedDate !== undefined) dbData.applied_date = data.appliedDate || null;
    if (data.statusHistory !== undefined) dbData.status_history = data.statusHistory;
    if (data.interviews !== undefined) dbData.interviews = data.interviews;
    if (data.recruiter !== undefined) dbData.recruiter = data.recruiter || null;
    if (data.hiringManager !== undefined) dbData.hiring_manager = data.hiringManager || null;
    if (data.followUpActions !== undefined) dbData.follow_up_actions = data.followUpActions;
    if (data.activityLog !== undefined) dbData.activity_log = data.activityLog;
    if (data.offerDetails !== undefined) dbData.offer_details = data.offerDetails || null;
    if (data.nextAction !== undefined) dbData.next_action = data.nextAction || null;
    if (data.nextActionDate !== undefined) dbData.next_action_date = data.nextActionDate || null;
    if (data.nextInterviewDate !== undefined) dbData.next_interview_date = data.nextInterviewDate || null;
    if (data.notes !== undefined) dbData.notes = data.notes || null;
    if (data.archived !== undefined) dbData.archived = data.archived;

    const { data: application, error } = await supabaseAdmin
      .from('tracked_applications')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error || !application) {
      console.error('Failed to update tracked application:', error);
      throw new Error('Failed to update tracked application');
    }

    // Transform snake_case to camelCase
    const transformedApplication = mapDbToTrackedApplication(application);

    res.json(transformedApplication);
  })
);

/**
 * PATCH /api/tracked-applications/:id/archive
 * Archive tracked application
 */
router.patch(
  '/:id/archive',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('tracked_applications')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      throw createNotFoundError('Tracked application', id);
    }

    const { data: application, error } = await supabaseAdmin
      .from('tracked_applications')
      .update({
        archived: true,
        last_updated: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !application) {
      console.error('Failed to archive tracked application:', error);
      throw new Error('Failed to archive tracked application');
    }

    // Transform snake_case to camelCase
    const transformedApplication = mapDbToTrackedApplication(application);

    res.json(transformedApplication);
  })
);

/**
 * PATCH /api/tracked-applications/:id/unarchive
 * Unarchive tracked application
 */
router.patch(
  '/:id/unarchive',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('tracked_applications')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      throw createNotFoundError('Tracked application', id);
    }

    const { data: application, error } = await supabaseAdmin
      .from('tracked_applications')
      .update({
        archived: false,
        last_updated: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !application) {
      console.error('Failed to unarchive tracked application:', error);
      throw new Error('Failed to unarchive tracked application');
    }

    // Transform snake_case to camelCase
    const transformedApplication = mapDbToTrackedApplication(application);

    res.json(transformedApplication);
  })
);

/**
 * DELETE /api/tracked-applications/:id
 * Delete tracked application
 */
router.delete(
  '/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    // Verify ownership and delete
    const { error } = await supabaseAdmin
      .from('tracked_applications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete tracked application:', error);
      throw new Error('Failed to delete tracked application');
    }

    res.status(204).send();
  })
);

// =============================================================================
// Database Mapping Functions
// =============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Map database tracked application (snake_case) to frontend type (camelCase)
 */
function mapDbToTrackedApplication(dbApp: any): any {
  return {
    id: dbApp.id,
    jobId: dbApp.job_id || '',
    applicationId: dbApp.application_id || '',
    company: dbApp.company,
    jobTitle: dbApp.job_title,
    location: dbApp.location || '',
    matchScore: dbApp.match_score || 0,
    status: dbApp.status,
    appliedDate: dbApp.applied_date || '',
    lastUpdated: dbApp.last_updated,
    statusHistory: dbApp.status_history || [],
    interviews: dbApp.interviews || [],
    recruiter: dbApp.recruiter || undefined,
    hiringManager: dbApp.hiring_manager || undefined,
    followUpActions: dbApp.follow_up_actions || [],
    nextAction: dbApp.next_action || undefined,
    nextActionDate: dbApp.next_action_date || undefined,
    nextInterviewDate: dbApp.next_interview_date || undefined,
    offerDetails: dbApp.offer_details || undefined,
    activityLog: dbApp.activity_log || [],
    archived: dbApp.archived || false,
    notes: dbApp.notes || '',
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

export default router;
