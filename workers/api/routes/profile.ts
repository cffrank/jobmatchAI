/**
 * Profile Management Routes
 *
 * Handles user profile, work experience, and skills updates.
 * Automatically triggers resume embedding regeneration after changes.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { authenticateUser, getUserId } from '../middleware/auth';
import { createSupabaseAdmin } from '../services/supabase';
import { updateUserResumeEmbedding } from '../services/embeddings';
import { invalidateCacheForUser } from '../services/jobAnalysisCache';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to trigger background updates after profile changes
 *
 * Updates both resume embeddings and invalidates job compatibility analysis cache
 * Runs asynchronously in background to avoid blocking the response
 */
function triggerProfileChangeBackgroundUpdates(
  c: any,
  env: Env,
  supabase: any,
  userId: string
): void {
  c.executionCtx.waitUntil(
    Promise.allSettled([
      // Update user resume embedding for semantic search
      updateUserResumeEmbedding(env, supabase, userId).catch((err) => {
        console.error('[Profile] Failed to update user embedding:', err);
      }),
      // Invalidate job compatibility analysis cache (stale after profile changes)
      invalidateCacheForUser(env, userId).catch((err) => {
        console.error('[Profile] Failed to invalidate job analysis cache:', err);
      }),
    ])
  );
}

// =============================================================================
// Validation Schemas
// =============================================================================

const profileUpdateSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin_url: z.string().optional(),
  photo_url: z.string().optional().nullable(),
  current_title: z.string().optional(), // headline
  professional_summary: z.string().optional(), // summary
});

const workExperienceSchema = z.object({
  position: z.string().min(1, 'Position is required'),
  company: z.string().min(1, 'Company is required'),
  description: z.string().optional().nullable(),
  start_date: z.string(),
  end_date: z.string().optional().nullable(),
  is_current: z.boolean().optional(),
});

const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
});

// =============================================================================
// Profile Routes
// =============================================================================

/**
 * PUT /api/profile
 * Update user profile (headline, summary, contact info)
 */
app.put('/', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  const parseResult = profileUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: 'Invalid profile data', details: parseResult.error.errors },
      400
    );
  }

  const supabase = createSupabaseAdmin(c.env);

  try {
    const timestamp = new Date().toISOString();

    // Update profile
    const { data, error: updateError } = await supabase
      .from('users')
      .update({
        ...parseResult.data,
        updated_at: timestamp,
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(`[Profile] Updated profile for user ${userId}, background updates queued`);

    return c.json({
      message: 'Profile updated successfully',
      profile: data,
    });
  } catch (error) {
    console.error('[Profile] Error updating profile:', error);
    return c.json(
      {
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// =============================================================================
// Work Experience Routes
// =============================================================================

/**
 * POST /api/profile/work-experience
 * Add new work experience entry
 */
app.post('/work-experience', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  const parseResult = workExperienceSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: 'Invalid work experience data', details: parseResult.error.errors },
      400
    );
  }

  const supabase = createSupabaseAdmin(c.env);

  try {
    const timestamp = new Date().toISOString();

    const { data, error: insertError } = await supabase
      .from('work_experience')
      .insert({
        user_id: userId,
        ...parseResult.data,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to add work experience: ${insertError.message}`);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(`[Profile] Added work experience for user ${userId}, background updates queued`);

    return c.json({
      message: 'Work experience added successfully',
      experience: data,
    });
  } catch (error) {
    console.error('[Profile] Error adding work experience:', error);
    return c.json(
      {
        error: 'Failed to add work experience',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * PUT /api/profile/work-experience/:id
 * Update existing work experience entry
 */
app.put('/work-experience/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const experienceId = c.req.param('id');
  const body = await c.req.json();

  const parseResult = workExperienceSchema.partial().safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: 'Invalid work experience data', details: parseResult.error.errors },
      400
    );
  }

  const supabase = createSupabaseAdmin(c.env);

  try {
    const timestamp = new Date().toISOString();

    // Update work experience (ensure user owns it)
    const { data, error: updateError } = await supabase
      .from('work_experience')
      .update({
        ...parseResult.data,
        updated_at: timestamp,
      })
      .eq('id', experienceId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update work experience: ${updateError.message}`);
    }

    if (!data) {
      return c.json({ error: 'Work experience not found or access denied' }, 404);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(
      `[Profile] Updated work experience ${experienceId} for user ${userId}, background updates queued`
    );

    return c.json({
      message: 'Work experience updated successfully',
      experience: data,
    });
  } catch (error) {
    console.error('[Profile] Error updating work experience:', error);
    return c.json(
      {
        error: 'Failed to update work experience',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * DELETE /api/profile/work-experience/:id
 * Delete work experience entry
 */
app.delete('/work-experience/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const experienceId = c.req.param('id');

  const supabase = createSupabaseAdmin(c.env);

  try {
    const { error: deleteError } = await supabase
      .from('work_experience')
      .delete()
      .eq('id', experienceId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(`Failed to delete work experience: ${deleteError.message}`);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(
      `[Profile] Deleted work experience ${experienceId} for user ${userId}, background updates queued`
    );

    return c.json({
      message: 'Work experience deleted successfully',
    });
  } catch (error) {
    console.error('[Profile] Error deleting work experience:', error);
    return c.json(
      {
        error: 'Failed to delete work experience',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// =============================================================================
// Skills Routes
// =============================================================================

/**
 * POST /api/profile/skills
 * Add new skill
 */
app.post('/skills', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  const parseResult = skillSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: 'Invalid skill data', details: parseResult.error.errors },
      400
    );
  }

  const supabase = createSupabaseAdmin(c.env);

  try {
    const timestamp = new Date().toISOString();

    const { data, error: insertError } = await supabase
      .from('skills')
      .insert({
        user_id: userId,
        ...parseResult.data,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to add skill: ${insertError.message}`);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(`[Profile] Added skill for user ${userId}, background updates queued`);

    return c.json({
      message: 'Skill added successfully',
      skill: data,
    });
  } catch (error) {
    console.error('[Profile] Error adding skill:', error);
    return c.json(
      {
        error: 'Failed to add skill',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * PUT /api/profile/skills/:id
 * Update existing skill
 */
app.put('/skills/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const skillId = c.req.param('id');
  const body = await c.req.json();

  const parseResult = skillSchema.partial().safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: 'Invalid skill data', details: parseResult.error.errors },
      400
    );
  }

  const supabase = createSupabaseAdmin(c.env);

  try {
    const timestamp = new Date().toISOString();

    const { data, error: updateError } = await supabase
      .from('skills')
      .update({
        ...parseResult.data,
        updated_at: timestamp,
      })
      .eq('id', skillId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update skill: ${updateError.message}`);
    }

    if (!data) {
      return c.json({ error: 'Skill not found or access denied' }, 404);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(
      `[Profile] Updated skill ${skillId} for user ${userId}, background updates queued`
    );

    return c.json({
      message: 'Skill updated successfully',
      skill: data,
    });
  } catch (error) {
    console.error('[Profile] Error updating skill:', error);
    return c.json(
      {
        error: 'Failed to update skill',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * DELETE /api/profile/skills/:id
 * Delete skill
 */
app.delete('/skills/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const skillId = c.req.param('id');

  const supabase = createSupabaseAdmin(c.env);

  try {
    const { error: deleteError } = await supabase
      .from('skills')
      .delete()
      .eq('id', skillId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(`Failed to delete skill: ${deleteError.message}`);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(`[Profile] Deleted skill ${skillId} for user ${userId}, background updates queued`);

    return c.json({
      message: 'Skill deleted successfully',
    });
  } catch (error) {
    console.error('[Profile] Error deleting skill:', error);
    return c.json(
      {
        error: 'Failed to delete skill',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
