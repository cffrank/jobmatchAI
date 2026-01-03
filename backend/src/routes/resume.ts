/**
 * Resume Routes
 *
 * Handles resume CRUD operations and parsing functionality.
 *
 * Endpoints:
 * - GET /api/resume - Fetch user resumes
 * - POST /api/resume - Create new resume
 * - PATCH /api/resume/:id - Update resume
 * - DELETE /api/resume/:id - Delete resume
 * - POST /api/resume/parse - Parse resume file using OpenAI
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateUser, getUserId } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler, createValidationError } from '../middleware/errorHandler';
import { parseResume } from '../services/openai.service';
import { supabaseAdmin } from '../config/supabase';

// =============================================================================
// Router Setup
// =============================================================================

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const parseResumeSchema = z.object({
  storagePath: z
    .string()
    .min(1, 'Storage path is required'),
});

const createResumeSchema = z.object({
  type: z.enum(['master', 'tailored'], { required_error: 'Type is required' }),
  title: z.string().min(1, 'Title is required'),
  sections: z.object({
    header: z.object({
      name: z.string(),
      title: z.string(),
      contact: z.object({
        email: z.string(),
        phone: z.string(),
        location: z.string(),
        linkedIn: z.string(),
      }),
    }),
    summary: z.string(),
    experience: z.array(z.any()),
    education: z.array(z.any()),
    skills: z.array(z.any()),
  }),
  formats: z.array(z.enum(['pdf', 'docx', 'txt'])),
});

const updateResumeSchema = z.object({
  type: z.enum(['master', 'tailored']).optional(),
  title: z.string().min(1).optional(),
  sections: z.object({
    header: z.object({
      name: z.string(),
      title: z.string(),
      contact: z.object({
        email: z.string(),
        phone: z.string(),
        location: z.string(),
        linkedIn: z.string(),
      }),
    }),
    summary: z.string(),
    experience: z.array(z.any()),
    education: z.array(z.any()),
    skills: z.array(z.any()),
  }).optional(),
  formats: z.array(z.enum(['pdf', 'docx', 'txt'])).optional(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/resume
 * Fetch all resumes for the authenticated user
 */
router.get(
  '/',
  authenticateUser,
  rateLimiter(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    console.log(`[GET /api/resume] Fetching resumes for user ${userId}`);

    const { data, error } = await supabaseAdmin
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error(`[GET /api/resume] Error fetching resumes:`, error);
      throw new Error(`Failed to fetch resumes: ${error.message}`);
    }

    console.log(`[GET /api/resume] Found ${data?.length || 0} resumes`);
    res.status(200).json(data || []);
  })
);

/**
 * POST /api/resume
 * Create a new resume
 */
router.post(
  '/',
  authenticateUser,
  rateLimiter(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    console.log(`[POST /api/resume] Creating resume for user ${userId}`);

    const parseResult = createResumeSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.error(`[POST /api/resume] Validation failed:`, parseResult.error.errors);
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { type, title, sections, formats } = parseResult.data;
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('resumes')
      .insert({
        user_id: userId,
        type,
        title,
        sections,
        formats,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error(`[POST /api/resume] Error creating resume:`, error);
      throw new Error(`Failed to create resume: ${error.message}`);
    }

    console.log(`[POST /api/resume] Resume created successfully:`, data.id);
    res.status(201).json(data);
  })
);

/**
 * PATCH /api/resume/:id
 * Update an existing resume
 */
router.patch(
  '/:id',
  authenticateUser,
  rateLimiter(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    console.log(`[PATCH /api/resume/:id] Updating resume ${id} for user ${userId}`);

    const parseResult = updateResumeSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.error(`[PATCH /api/resume/:id] Validation failed:`, parseResult.error.errors);
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const updates = {
      ...parseResult.data,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('resumes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error(`[PATCH /api/resume/:id] Error updating resume:`, error);
      throw new Error(`Failed to update resume: ${error.message}`);
    }

    if (!data) {
      console.error(`[PATCH /api/resume/:id] Resume not found:`, id);
      res.status(404).json({ message: 'Resume not found' });
      return;
    }

    console.log(`[PATCH /api/resume/:id] Resume updated successfully`);
    res.status(200).json(data);
  })
);

/**
 * DELETE /api/resume/:id
 * Delete a resume
 */
router.delete(
  '/:id',
  authenticateUser,
  rateLimiter(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    console.log(`[DELETE /api/resume/:id] Deleting resume ${id} for user ${userId}`);

    const { error } = await supabaseAdmin
      .from('resumes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error(`[DELETE /api/resume/:id] Error deleting resume:`, error);
      throw new Error(`Failed to delete resume: ${error.message}`);
    }

    console.log(`[DELETE /api/resume/:id] Resume deleted successfully`);
    res.status(204).send();
  })
);

/**
 * POST /api/resume/parse
 * Parse resume file using OpenAI GPT-4o with Vision
 */
router.post(
  '/parse',
  authenticateUser,
  rateLimiter(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // Log request details for debugging
    console.log(`[/api/resume/parse] Request received from user ${userId}`);
    console.log(`[/api/resume/parse] Request body:`, JSON.stringify(req.body));
    console.log(`[/api/resume/parse] Content-Type:`, req.headers['content-type']);
    console.log(`[/api/resume/parse] Origin:`, req.headers.origin);

    // Validate input
    const parseResult = parseResumeSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.error(`[/api/resume/parse] Validation failed for user ${userId}`);
      console.error(`[/api/resume/parse] Validation errors:`, JSON.stringify(parseResult.error.errors, null, 2));
      console.error(`[/api/resume/parse] Received body:`, JSON.stringify(req.body, null, 2));
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { storagePath } = parseResult.data;

    console.log(`[/api/resume/parse] Validation passed - starting parse for user ${userId}, path: ${storagePath}`);

    try {
      // Parse resume using OpenAI (will generate signed URL internally)
      const parsedData = await parseResume(storagePath);

      console.log(`[/api/resume/parse] Resume parsed successfully for user ${userId}`);

      res.status(200).json(parsedData);
    } catch (error) {
      console.error(`[/api/resume/parse] Parse failed for user ${userId}:`, error);

      // The error from parseResume should already be well-formatted
      // Just re-throw it and let the error handler deal with it
      throw error;
    }
  })
);

export default router;
