/**
 * Skills Management Routes
 *
 * Handles user skills CRUD operations.
 * This router is mounted at /api/skills (separate from /api/profile/skills)
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
 * Helper to trigger background updates after skills changes
 */
function triggerSkillsChangeBackgroundUpdates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  c: any,
  env: Env,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): void {
  c.executionCtx.waitUntil(
    Promise.allSettled([
      updateUserResumeEmbedding(env, supabase, userId).catch((err) => {
        console.error('[Skills] Failed to update user embedding:', err);
      }),
      invalidateCacheForUser(env, userId).catch((err) => {
        console.error('[Skills] Failed to invalidate job analysis cache:', err);
      }),
    ])
  );
}

// =============================================================================
// Validation Schemas
// =============================================================================

const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
});

// =============================================================================
// Skills Routes
// =============================================================================

/**
 * GET /api/skills
 * Fetch all skills for the user
 */
app.get('/', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const supabase = createSupabaseAdmin(c.env);

  try {
    const { data: skills, error: fetchError } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch skills: ${fetchError.message}`);
    }

    return c.json({
      message: 'Skills fetched successfully',
      skills: skills || [],
    });
  } catch (error) {
    console.error('[Skills] Error fetching skills:', error);
    return c.json(
      {
        error: 'Failed to fetch skills',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/skills
 * Add new skill
 */
app.post('/', authenticateUser, async (c) => {
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

    triggerSkillsChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(`[Skills] Added skill for user ${userId}, background updates queued`);

    return c.json({
      message: 'Skill added successfully',
      skill: data,
    });
  } catch (error) {
    console.error('[Skills] Error adding skill:', error);
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
 * PATCH /api/skills/:id
 * Update existing skill
 */
app.patch('/:id', authenticateUser, async (c) => {
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

    triggerSkillsChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(`[Skills] Updated skill ${skillId} for user ${userId}, background updates queued`);

    return c.json({
      message: 'Skill updated successfully',
      skill: data,
    });
  } catch (error) {
    console.error('[Skills] Error updating skill:', error);
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
 * DELETE /api/skills/:id
 * Delete skill
 */
app.delete('/:id', authenticateUser, async (c) => {
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

    triggerSkillsChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(`[Skills] Deleted skill ${skillId} for user ${userId}, background updates queued`);

    return c.json({
      message: 'Skill deleted successfully',
    });
  } catch (error) {
    console.error('[Skills] Error deleting skill:', error);
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
