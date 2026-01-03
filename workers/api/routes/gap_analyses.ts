/**
 * Gap Analysis Routes
 *
 * CRUD operations for gap analysis feature:
 * - List user's gap analyses
 * - Get single gap analysis with answers
 * - Create new gap analysis
 * - Update answers to gap analysis questions
 * - Delete gap analysis
 */

import { Hono } from 'hono';
import type { Env, HonoContext } from '../types';
import { authenticateUser, getUserId } from '../middleware/auth';
import { randomUUID } from 'node:crypto';

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /api/gap-analyses
 * List all gap analyses for authenticated user
 */
app.get('/', authenticateUser, async (c: HonoContext) => {
  const userId = getUserId(c);

  try {
    // Fetch all gap analyses for user
    const { results: analyses } = await c.env.DB.prepare(
      `SELECT * FROM gap_analyses
       WHERE user_id = ?
       ORDER BY created_at DESC`
    ).bind(userId).all();

    // For each analysis, fetch its answers
    const analysesWithAnswers = await Promise.all(
      analyses.map(async (analysis) => {
        const { results: answers } = await c.env.DB.prepare(
          `SELECT * FROM gap_analysis_answers
           WHERE gap_analysis_id = ?
           ORDER BY question_id ASC`
        ).bind(analysis.id).all();

        return {
          ...analysis,
          identified_gaps_and_flags: analysis.identified_gaps_and_flags
            ? JSON.parse(analysis.identified_gaps_and_flags as string)
            : [],
          next_steps: analysis.next_steps
            ? JSON.parse(analysis.next_steps as string)
            : null,
          answers,
        };
      })
    );

    return c.json(analysesWithAnswers, 200);
  } catch (error) {
    console.error('Error fetching gap analyses:', error);
    return c.json({ error: 'Failed to fetch gap analyses' }, 500);
  }
});

/**
 * GET /api/gap-analyses/:id
 * Get single gap analysis with all answers
 */
app.get('/:id', authenticateUser, async (c: HonoContext) => {
  const userId = getUserId(c);
  const analysisId = c.req.param('id');

  try {
    // Fetch main analysis
    const { results: analyses } = await c.env.DB.prepare(
      'SELECT * FROM gap_analyses WHERE id = ? AND user_id = ?'
    ).bind(analysisId, userId).all();

    if (analyses.length === 0) {
      return c.json({ error: 'Gap analysis not found' }, 404);
    }

    const analysis = analyses[0];

    // Fetch answers
    const { results: answers } = await c.env.DB.prepare(
      `SELECT * FROM gap_analysis_answers
       WHERE gap_analysis_id = ?
       ORDER BY question_id ASC`
    ).bind(analysisId).all();

    return c.json({
      ...analysis,
      identified_gaps_and_flags: analysis.identified_gaps_and_flags
        ? JSON.parse(analysis.identified_gaps_and_flags as string)
        : [],
      next_steps: analysis.next_steps
        ? JSON.parse(analysis.next_steps as string)
        : null,
      answers,
    }, 200);
  } catch (error) {
    console.error('Error fetching gap analysis:', error);
    return c.json({ error: 'Failed to fetch gap analysis' }, 500);
  }
});

/**
 * POST /api/gap-analyses
 * Create new gap analysis
 *
 * Body:
 * {
 *   gap_count: number,
 *   red_flag_count: number,
 *   urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
 *   overall_assessment: string,
 *   identified_gaps_and_flags: array,
 *   next_steps: object,
 *   questions: [{ question_id, priority, gap_addressed, question, context, expected_outcome }]
 * }
 */
app.post('/', authenticateUser, async (c: HonoContext) => {
  const userId = getUserId(c);

  try {
    const body = await c.req.json();
    const analysisId = randomUUID();
    const now = new Date().toISOString();

    // Insert gap analysis
    await c.env.DB.prepare(
      `INSERT INTO gap_analyses
       (id, user_id, created_at, updated_at, gap_count, red_flag_count, urgency, overall_assessment, identified_gaps_and_flags, next_steps)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      analysisId,
      userId,
      now,
      now,
      body.gap_count || 0,
      body.red_flag_count || 0,
      body.urgency || 'MEDIUM',
      body.overall_assessment || '',
      JSON.stringify(body.identified_gaps_and_flags || []),
      JSON.stringify(body.next_steps || null)
    ).run();

    // Insert gap analysis questions/answers
    if (body.questions && Array.isArray(body.questions)) {
      for (const question of body.questions) {
        await c.env.DB.prepare(
          `INSERT INTO gap_analysis_answers
           (id, gap_analysis_id, user_id, question_id, priority, gap_addressed, question, context, expected_outcome, answer, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          randomUUID(),
          analysisId,
          userId,
          question.question_id,
          question.priority || 'MEDIUM',
          question.gap_addressed || '',
          question.question,
          question.context || '',
          question.expected_outcome || '',
          question.answer || null,
          now,
          now
        ).run();
      }
    }

    // Fetch the created analysis with answers
    const { results: analyses } = await c.env.DB.prepare(
      'SELECT * FROM gap_analyses WHERE id = ?'
    ).bind(analysisId).all();

    const { results: answers } = await c.env.DB.prepare(
      `SELECT * FROM gap_analysis_answers
       WHERE gap_analysis_id = ?
       ORDER BY question_id ASC`
    ).bind(analysisId).all();

    return c.json({
      ...analyses[0],
      identified_gaps_and_flags: JSON.parse(analyses[0].identified_gaps_and_flags as string),
      next_steps: JSON.parse(analyses[0].next_steps as string),
      answers,
    }, 201);
  } catch (error) {
    console.error('Error creating gap analysis:', error);
    return c.json({ error: 'Failed to create gap analysis' }, 500);
  }
});

/**
 * PATCH /api/gap-analyses/:id/answer
 * Update answer to a specific question
 *
 * Body:
 * {
 *   question_id: number,
 *   answer: string
 * }
 */
app.patch('/:id/answer', authenticateUser, async (c: HonoContext) => {
  const userId = getUserId(c);
  const analysisId = c.req.param('id');

  try {
    const { question_id, answer } = await c.req.json();

    if (!question_id || answer === undefined) {
      return c.json({ error: 'question_id and answer are required' }, 400);
    }

    // Verify analysis belongs to user
    const { results: analyses } = await c.env.DB.prepare(
      'SELECT id FROM gap_analyses WHERE id = ? AND user_id = ?'
    ).bind(analysisId, userId).all();

    if (analyses.length === 0) {
      return c.json({ error: 'Gap analysis not found' }, 404);
    }

    // Update answer
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `UPDATE gap_analysis_answers
       SET answer = ?, updated_at = ?
       WHERE gap_analysis_id = ? AND question_id = ?`
    ).bind(answer, now, analysisId, question_id).run();

    // Also update gap_analyses updated_at
    await c.env.DB.prepare(
      'UPDATE gap_analyses SET updated_at = ? WHERE id = ?'
    ).bind(now, analysisId).run();

    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('Error updating answer:', error);
    return c.json({ error: 'Failed to update answer' }, 500);
  }
});

/**
 * DELETE /api/gap-analyses/:id
 * Delete gap analysis and all associated answers
 */
app.delete('/:id', authenticateUser, async (c: HonoContext) => {
  const userId = getUserId(c);
  const analysisId = c.req.param('id');

  try {
    // Verify analysis belongs to user
    const { results: analyses } = await c.env.DB.prepare(
      'SELECT id FROM gap_analyses WHERE id = ? AND user_id = ?'
    ).bind(analysisId, userId).all();

    if (analyses.length === 0) {
      return c.json({ error: 'Gap analysis not found' }, 404);
    }

    // Delete answers (cascades automatically via foreign key, but explicit is clearer)
    await c.env.DB.prepare(
      'DELETE FROM gap_analysis_answers WHERE gap_analysis_id = ?'
    ).bind(analysisId).run();

    // Delete analysis
    await c.env.DB.prepare(
      'DELETE FROM gap_analyses WHERE id = ?'
    ).bind(analysisId).run();

    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('Error deleting gap analysis:', error);
    return c.json({ error: 'Failed to delete gap analysis' }, 500);
  }
});

export default app;
