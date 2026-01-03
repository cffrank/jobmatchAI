/**
 * Profile Routes
 *
 * Handles user profile management.
 *
 * Endpoints:
 * - GET /api/profile - Get current user's profile
 * - PATCH /api/profile - Update current user's profile
 * - GET /api/profile/work-experience - Get user's work experience entries
 * - POST /api/profile/work-experience - Create new work experience entry
 * - PATCH /api/profile/work-experience/:id - Update work experience entry
 * - DELETE /api/profile/work-experience/:id - Delete work experience entry
 * - GET /api/profile/work-experience-narratives - Get user's work experience narratives
 * - POST /api/profile/work-experience-narratives - Upsert work experience narrative
 * - DELETE /api/profile/work-experience-narratives/:id - Delete work experience narrative
 * - GET /api/profile/education - Get user's education entries
 * - POST /api/profile/education - Create new education entry
 * - PATCH /api/profile/education/:id - Update education entry
 * - DELETE /api/profile/education/:id - Delete education entry
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, TABLES } from '../config/supabase';
import { authenticateUser, getUserId } from '../middleware/auth';
import { asyncHandler, createValidationError } from '../middleware/errorHandler';

// =============================================================================
// Router Setup
// =============================================================================

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const updateProfileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  location: z.string().max(200).optional(),
  streetAddress: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  linkedInUrl: z.string().url().optional().or(z.literal('')),
  profileImageUrl: z.string().url().optional().or(z.literal('')).nullable(),
  headline: z.string().max(200).optional(),
  summary: z.string().max(2000).optional(),
});

const createWorkExperienceSchema = z.object({
  company: z.string().min(1).max(200),
  position: z.string().min(1).max(200),
  location: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  startDate: z.string(), // ISO date format
  endDate: z.string().optional().nullable(),
  current: z.boolean().optional(),
  accomplishments: z.array(z.string()).optional(),
});

const updateWorkExperienceSchema = z.object({
  company: z.string().min(1).max(200).optional(),
  position: z.string().min(1).max(200).optional(),
  location: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  startDate: z.string().optional(), // ISO date format
  endDate: z.string().optional().nullable(),
  current: z.boolean().optional(),
  accomplishments: z.array(z.string()).optional(),
});

const createEducationSchema = z.object({
  school: z.string().min(1).max(200),
  degree: z.string().max(200).optional(),
  field: z.string().max(200).optional(),
  startDate: z.string().optional(), // ISO date format
  endDate: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});

const updateEducationSchema = z.object({
  school: z.string().min(1).max(200).optional(),
  degree: z.string().max(200).optional(),
  field: z.string().max(200).optional(),
  startDate: z.string().optional(), // ISO date format
  endDate: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});

const upsertNarrativeSchema = z.object({
  workExperienceId: z.string().uuid(),
  narrative: z.string().min(1).max(10000),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/profile
 * Get current user's profile
 */
router.get(
  '/',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const { data: profile, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('*')
      .eq('id', userId)
      .single();

    // If profile doesn't exist yet, return null (not an error)
    if (error && error.code === 'PGRST116') {
      res.json({ profile: null });
      return;
    }

    if (error) {
      throw error;
    }

    // Transform database fields to frontend format
    const transformedProfile = {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      phone: profile.phone || '',
      location: profile.location || '',
      streetAddress: profile.street_address || '',
      city: profile.city || '',
      state: profile.state || '',
      postalCode: profile.postal_code || '',
      country: profile.country || '',
      linkedInUrl: profile.linkedin_url || '',
      profileImageUrl: profile.photo_url || null,
      headline: profile.current_title || '',
      summary: profile.professional_summary || '',
    };

    res.json({ profile: transformedProfile });
  })
);

/**
 * PATCH /api/profile
 * Update current user's profile (creates if doesn't exist)
 */
router.patch(
  '/',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const userEmail = req.user?.email || '';

    // Validate request body
    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          validation.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const data = validation.data;
    const timestamp = new Date().toISOString();

    // Transform frontend fields to database format
    const dbUpdate: Record<string, unknown> = {};
    if (data.firstName !== undefined) dbUpdate.first_name = data.firstName;
    if (data.lastName !== undefined) dbUpdate.last_name = data.lastName;
    if (data.phone !== undefined) dbUpdate.phone = data.phone;
    if (data.location !== undefined) dbUpdate.location = data.location;
    if (data.streetAddress !== undefined) dbUpdate.street_address = data.streetAddress;
    if (data.city !== undefined) dbUpdate.city = data.city;
    if (data.state !== undefined) dbUpdate.state = data.state;
    if (data.postalCode !== undefined) dbUpdate.postal_code = data.postalCode;
    if (data.country !== undefined) dbUpdate.country = data.country;
    if (data.linkedInUrl !== undefined) dbUpdate.linkedin_url = data.linkedInUrl;
    if (data.profileImageUrl !== undefined) dbUpdate.photo_url = data.profileImageUrl || null;
    if (data.headline !== undefined) dbUpdate.current_title = data.headline;
    if (data.summary !== undefined) dbUpdate.professional_summary = data.summary;

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabaseAdmin
        .from(TABLES.USERS)
        .update({
          ...dbUpdate,
          updated_at: timestamp,
        })
        .eq('id', userId);

      if (updateError) throw updateError;
    } else {
      // Create new profile
      const { error: insertError } = await supabaseAdmin
        .from(TABLES.USERS)
        .insert({
          id: userId,
          email: userEmail,
          ...dbUpdate,
          created_at: timestamp,
          updated_at: timestamp,
        });

      if (insertError) throw insertError;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
    });
  })
);

// =============================================================================
// Work Experience Routes
// =============================================================================

/**
 * GET /api/profile/work-experience
 * Get all work experience for current user
 */
router.get(
  '/work-experience',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const { data: workExperience, error } = await supabaseAdmin
      .from(TABLES.WORK_EXPERIENCE)
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform database fields to frontend format
    const transformedExperience = (workExperience || []).map((exp) => ({
      id: exp.id,
      company: exp.company,
      position: exp.title,
      location: exp.location || '',
      startDate: exp.start_date,
      endDate: exp.end_date || '',
      current: exp.is_current || false,
      description: exp.description || '',
      accomplishments: exp.accomplishments || [],
    }));

    res.json({ workExperience: transformedExperience });
  })
);

/**
 * POST /api/profile/work-experience
 * Create new work experience entry
 */
router.post(
  '/work-experience',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // Validate request body
    const validation = createWorkExperienceSchema.safeParse(req.body);
    if (!validation.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          validation.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const data = validation.data;
    const timestamp = new Date().toISOString();

    // Insert work experience
    const { data: created, error } = await supabaseAdmin
      .from(TABLES.WORK_EXPERIENCE)
      .insert({
        user_id: userId,
        company: data.company,
        title: data.position,
        location: data.location || '',
        description: data.description || '',
        start_date: data.startDate,
        end_date: data.endDate || null,
        is_current: data.current || false,
        accomplishments: data.accomplishments?.filter((a) => a.trim() !== '') || [],
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Transform to frontend format
    const transformed = {
      id: created.id,
      company: created.company,
      position: created.title,
      location: created.location || '',
      startDate: created.start_date,
      endDate: created.end_date || '',
      current: created.is_current || false,
      description: created.description || '',
      accomplishments: created.accomplishments || [],
    };

    res.status(201).json({
      success: true,
      message: 'Work experience created successfully',
      workExperience: transformed,
    });
  })
);

/**
 * PATCH /api/profile/work-experience/:id
 * Update existing work experience entry
 */
router.patch(
  '/work-experience/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const experienceId = req.params.id;

    // Validate request body
    const validation = updateWorkExperienceSchema.safeParse(req.body);
    if (!validation.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          validation.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const data = validation.data;
    const timestamp = new Date().toISOString();

    // Transform frontend fields to database format
    const dbUpdate: Record<string, unknown> = {
      updated_at: timestamp,
    };
    if (data.company !== undefined) dbUpdate.company = data.company;
    if (data.position !== undefined) dbUpdate.title = data.position;
    if (data.location !== undefined) dbUpdate.location = data.location;
    if (data.description !== undefined) dbUpdate.description = data.description;
    if (data.startDate !== undefined) dbUpdate.start_date = data.startDate;
    if (data.endDate !== undefined) dbUpdate.end_date = data.endDate || null;
    if (data.current !== undefined) dbUpdate.is_current = data.current;
    if (data.accomplishments !== undefined) {
      dbUpdate.accomplishments = data.accomplishments.filter((a) => a.trim() !== '');
    }

    // Update work experience (verify ownership with user_id match)
    const { data: updated, error } = await supabaseAdmin
      .from(TABLES.WORK_EXPERIENCE)
      .update(dbUpdate)
      .eq('id', experienceId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          message: 'Work experience not found or you do not have permission to update it',
        });
        return;
      }
      throw error;
    }

    // Transform to frontend format
    const transformed = {
      id: updated.id,
      company: updated.company,
      position: updated.title,
      location: updated.location || '',
      startDate: updated.start_date,
      endDate: updated.end_date || '',
      current: updated.is_current || false,
      description: updated.description || '',
      accomplishments: updated.accomplishments || [],
    };

    res.json({
      success: true,
      message: 'Work experience updated successfully',
      workExperience: transformed,
    });
  })
);

/**
 * DELETE /api/profile/work-experience/:id
 * Delete work experience entry
 */
router.delete(
  '/work-experience/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const experienceId = req.params.id;

    // Delete work experience (verify ownership with user_id match)
    const { error } = await supabaseAdmin
      .from(TABLES.WORK_EXPERIENCE)
      .delete()
      .eq('id', experienceId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Work experience deleted successfully',
    });
  })
);

// =============================================================================
// Work Experience Narratives Routes
// =============================================================================

/**
 * GET /api/profile/work-experience-narratives
 * Get all work experience narratives for current user
 */
router.get(
  '/work-experience-narratives',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const { data: narratives, error } = await supabaseAdmin
      .from('work_experience_narratives')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    // Transform database fields to frontend format
    const transformedNarratives = (narratives || []).map((narrative) => ({
      id: narrative.id,
      workExperienceId: narrative.work_experience_id,
      userId: narrative.user_id,
      narrative: narrative.narrative,
      createdAt: narrative.created_at,
      updatedAt: narrative.updated_at,
    }));

    res.json({ narratives: transformedNarratives });
  })
);

/**
 * POST /api/profile/work-experience-narratives
 * Upsert work experience narrative (create or update)
 */
router.post(
  '/work-experience-narratives',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // Validate request body
    const validation = upsertNarrativeSchema.safeParse(req.body);
    if (!validation.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          validation.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const data = validation.data;
    const timestamp = new Date().toISOString();

    // Check if narrative already exists
    const { data: existing } = await supabaseAdmin
      .from('work_experience_narratives')
      .select('id')
      .eq('work_experience_id', data.workExperienceId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Update existing narrative
      const { data: updated, error } = await supabaseAdmin
        .from('work_experience_narratives')
        .update({
          narrative: data.narrative,
          updated_at: timestamp,
        })
        .eq('id', existing.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Transform to frontend format
      const transformed = {
        id: updated.id,
        workExperienceId: updated.work_experience_id,
        userId: updated.user_id,
        narrative: updated.narrative,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      };

      res.json({
        success: true,
        message: 'Narrative updated successfully',
        narrative: transformed,
      });
    } else {
      // Insert new narrative
      const { data: created, error } = await supabaseAdmin
        .from('work_experience_narratives')
        .insert({
          user_id: userId,
          work_experience_id: data.workExperienceId,
          narrative: data.narrative,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Transform to frontend format
      const transformed = {
        id: created.id,
        workExperienceId: created.work_experience_id,
        userId: created.user_id,
        narrative: created.narrative,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
      };

      res.status(201).json({
        success: true,
        message: 'Narrative created successfully',
        narrative: transformed,
      });
    }
  })
);

/**
 * DELETE /api/profile/work-experience-narratives/:id
 * Delete work experience narrative
 */
router.delete(
  '/work-experience-narratives/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const narrativeId = req.params.id;

    // Delete narrative (verify ownership with user_id match)
    const { error } = await supabaseAdmin
      .from('work_experience_narratives')
      .delete()
      .eq('id', narrativeId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Narrative deleted successfully',
    });
  })
);

// =============================================================================
// Education Routes
// =============================================================================

/**
 * GET /api/profile/education
 * Get all education entries for current user
 */
router.get(
  '/education',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const { data: education, error } = await supabaseAdmin
      .from('education')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform database fields to frontend format
    const transformedEducation = (education || []).map((edu) => ({
      id: edu.id,
      school: edu.institution,
      degree: edu.degree || '',
      field: edu.field_of_study || '',
      location: '', // Not in database schema
      startDate: edu.start_date || '',
      endDate: edu.end_date || '',
      gpa: undefined, // Not in database schema
      highlights: edu.description ? edu.description.split('\n').filter((h: string) => h.trim() !== '') : [],
    }));

    res.json({ education: transformedEducation });
  })
);

/**
 * POST /api/profile/education
 * Create new education entry
 */
router.post(
  '/education',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // Validate request body
    const validation = createEducationSchema.safeParse(req.body);
    if (!validation.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          validation.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const data = validation.data;
    const timestamp = new Date().toISOString();

    // Insert education
    const { data: created, error } = await supabaseAdmin
      .from('education')
      .insert({
        user_id: userId,
        institution: data.school,
        degree: data.degree || '',
        field_of_study: data.field || '',
        description: data.highlights?.filter((h) => h.trim() !== '').join('\n') || '',
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Transform to frontend format
    const transformed = {
      id: created.id,
      school: created.institution,
      degree: created.degree || '',
      field: created.field_of_study || '',
      location: '', // Not in database schema
      startDate: created.start_date || '',
      endDate: created.end_date || '',
      gpa: undefined, // Not in database schema
      highlights: created.description ? created.description.split('\n').filter((h: string) => h.trim() !== '') : [],
    };

    res.status(201).json({
      success: true,
      message: 'Education created successfully',
      education: transformed,
    });
  })
);

/**
 * PATCH /api/profile/education/:id
 * Update existing education entry
 */
router.patch(
  '/education/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const educationId = req.params.id;

    // Validate request body
    const validation = updateEducationSchema.safeParse(req.body);
    if (!validation.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          validation.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const data = validation.data;
    const timestamp = new Date().toISOString();

    // Transform frontend fields to database format
    const dbUpdate: Record<string, unknown> = {
      updated_at: timestamp,
    };
    if (data.school !== undefined) dbUpdate.institution = data.school;
    if (data.degree !== undefined) dbUpdate.degree = data.degree;
    if (data.field !== undefined) dbUpdate.field_of_study = data.field;
    if (data.startDate !== undefined) dbUpdate.start_date = data.startDate || null;
    if (data.endDate !== undefined) dbUpdate.end_date = data.endDate || null;
    if (data.highlights !== undefined) {
      dbUpdate.description = data.highlights.filter((h) => h.trim() !== '').join('\n');
    }

    // Update education (verify ownership with user_id match)
    const { data: updated, error } = await supabaseAdmin
      .from('education')
      .update(dbUpdate)
      .eq('id', educationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          message: 'Education entry not found or you do not have permission to update it',
        });
        return;
      }
      throw error;
    }

    // Transform to frontend format
    const transformed = {
      id: updated.id,
      school: updated.institution,
      degree: updated.degree || '',
      field: updated.field_of_study || '',
      location: '', // Not in database schema
      startDate: updated.start_date || '',
      endDate: updated.end_date || '',
      gpa: undefined, // Not in database schema
      highlights: updated.description ? updated.description.split('\n').filter((h: string) => h.trim() !== '') : [],
    };

    res.json({
      success: true,
      message: 'Education updated successfully',
      education: transformed,
    });
  })
);

/**
 * DELETE /api/profile/education/:id
 * Delete education entry
 */
router.delete(
  '/education/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const educationId = req.params.id;

    // Delete education (verify ownership with user_id match)
    const { error } = await supabaseAdmin
      .from('education')
      .delete()
      .eq('id', educationId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Education deleted successfully',
    });
  })
);

// =============================================================================
// Export
// =============================================================================

export default router;
