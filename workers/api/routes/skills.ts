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
import { updateUserResumeEmbedding } from '../services/embeddings';
import { invalidateCacheForUser } from '../services/jobAnalysisCache';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// =============================================================================
// Helper Functions
// =============================================================================

interface ContextWithExecutionContext {
  executionCtx: {
    waitUntil(promise: Promise<unknown>): void;
  };
}

/**
 * Helper to trigger background updates after skills changes
 */
function triggerSkillsChangeBackgroundUpdates(
  c: ContextWithExecutionContext,
  env: Env,
  userId: string
): void {
  c.executionCtx.waitUntil(
    Promise.allSettled([
      updateUserResumeEmbedding(env, userId).catch((err) => {
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

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM skills WHERE user_id = ? ORDER BY created_at DESC'
    )
      .bind(userId)
      .all();

    return c.json({
      message: 'Skills fetched successfully',
      skills: results || [],
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

  try {
    const skillId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO skills (id, user_id, name, proficiency_level, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        skillId,
        userId,
        parseResult.data.name,
        parseResult.data.level || null,
        timestamp,
        timestamp
      )
      .run();

    // Fetch the inserted skill
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM skills WHERE id = ?'
    )
      .bind(skillId)
      .all();

    const skill = results[0];

    triggerSkillsChangeBackgroundUpdates(c, c.env, userId);
    console.log(`[Skills] Added skill for user ${userId}, background updates queued`);

    return c.json({
      message: 'Skill added successfully',
      skill,
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

  try {
    const timestamp = new Date().toISOString();

    // Build dynamic UPDATE query based on fields provided
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (parseResult.data.name !== undefined) {
      updates.push('name = ?');
      values.push(parseResult.data.name);
    }
    if (parseResult.data.level !== undefined) {
      updates.push('proficiency_level = ?');
      values.push(parseResult.data.level);
    }

    updates.push('updated_at = ?');
    values.push(timestamp);

    // Add WHERE clause values
    values.push(skillId, userId);

    const { meta } = await c.env.DB.prepare(
      `UPDATE skills SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
    )
      .bind(...values)
      .run();

    if (meta.changes === 0) {
      return c.json({ error: 'Skill not found or access denied' }, 404);
    }

    // Fetch updated skill
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM skills WHERE id = ? AND user_id = ?'
    )
      .bind(skillId, userId)
      .all();

    const skill = results[0];

    triggerSkillsChangeBackgroundUpdates(c, c.env, userId);
    console.log(`[Skills] Updated skill ${skillId} for user ${userId}, background updates queued`);

    return c.json({
      message: 'Skill updated successfully',
      skill,
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

  try {
    const { meta } = await c.env.DB.prepare(
      'DELETE FROM skills WHERE id = ? AND user_id = ?'
    )
      .bind(skillId, userId)
      .run();

    if (meta.changes === 0) {
      return c.json({ error: 'Skill not found or access denied' }, 404);
    }

    triggerSkillsChangeBackgroundUpdates(c, c.env, userId);
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
