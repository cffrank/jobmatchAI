/**
 * Skills Routes
 *
 * Handles user skills management.
 *
 * Endpoints:
 * - GET /api/skills - Get current user's skills
 * - POST /api/skills - Create a new skill
 * - PATCH /api/skills/:id - Update a skill
 * - DELETE /api/skills/:id - Delete a skill
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

const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  endorsements: z.number().int().min(0).optional(),
});

const updateSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  endorsements: z.number().int().min(0).optional(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/skills
 * Get current user's skills
 */
router.get(
  '/',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const { data: skills, error } = await supabaseAdmin
      .from(TABLES.SKILLS)
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    // Transform database fields to frontend format
    const transformedSkills = (skills || []).map((skill) => ({
      id: skill.id,
      name: skill.name,
      endorsements: skill.endorsed_count || 0,
    }));

    res.json({ skills: transformedSkills });
  })
);

/**
 * POST /api/skills
 * Create a new skill
 */
router.post(
  '/',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // Validate request body
    const validation = createSkillSchema.safeParse(req.body);
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

    const { data: newSkill, error } = await supabaseAdmin
      .from(TABLES.SKILLS)
      .insert({
        user_id: userId,
        name: data.name,
        endorsed_count: data.endorsements || 0,
        proficiency_level: 'intermediate', // Default proficiency
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Transform to frontend format
    const transformedSkill = {
      id: newSkill.id,
      name: newSkill.name,
      endorsements: newSkill.endorsed_count || 0,
    };

    res.status(201).json({
      success: true,
      skill: transformedSkill,
    });
  })
);

/**
 * PATCH /api/skills/:id
 * Update a skill
 */
router.patch(
  '/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    // Validate request body
    const validation = updateSkillSchema.safeParse(req.body);
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

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: timestamp,
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.endorsements !== undefined) {
      updateData.endorsed_count = data.endorsements;
    }

    // Update skill (RLS ensures user can only update their own skills)
    const { data: updatedSkill, error } = await supabaseAdmin
      .from(TABLES.SKILLS)
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Skill not found' });
        return;
      }
      throw error;
    }

    // Transform to frontend format
    const transformedSkill = {
      id: updatedSkill.id,
      name: updatedSkill.name,
      endorsements: updatedSkill.endorsed_count || 0,
    };

    res.json({
      success: true,
      skill: transformedSkill,
    });
  })
);

/**
 * DELETE /api/skills/:id
 * Delete a skill
 */
router.delete(
  '/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    // Delete skill (RLS ensures user can only delete their own skills)
    const { error } = await supabaseAdmin
      .from(TABLES.SKILLS)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Skill deleted successfully',
    });
  })
);

// =============================================================================
// Export
// =============================================================================

export default router;
