/**
 * OAuth Profile Management Routes
 *
 * Handles OAuth-based user profile creation and updates.
 * Used during LinkedIn OAuth flow to auto-populate user profiles
 * with data from OAuth providers (LinkedIn, Google).
 *
 * Storage: Cloudflare D1 (users table)
 * - Profile creation on first OAuth login
 * - Enrichment of existing profiles with missing OAuth data
 *
 * Endpoints:
 * - GET /api/users/:userId/exists - Check if user profile exists
 * - POST /api/users/oauth-profile - Create profile from OAuth data
 * - PATCH /api/users/:userId/oauth-enrich - Enrich profile with OAuth data
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, HonoContext } from '../types';
import { authenticateUser, getUserId } from '../middleware/auth';
import { createValidationError } from '../middleware/errorHandler';

const app = new Hono<{ Bindings: Env }>();

// =============================================================================
// Validation Schemas
// =============================================================================

const createOAuthProfileSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  photo_url: z.string().url().nullable().optional(),
  linkedin_url: z.string().url().nullable().optional(),
});

const enrichOAuthProfileSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  photo_url: z.string().url().nullable().optional(),
  linkedin_url: z.string().url().nullable().optional(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/users/:userId/exists
 * Check if user profile exists in database
 *
 * Response:
 * {
 *   exists: boolean
 * }
 */
app.get('/:userId/exists', authenticateUser, async (c: HonoContext) => {
  const requestedUserId = c.req.param('userId');
  const authenticatedUserId = getUserId(c);

  // Verify user can only check their own profile
  if (requestedUserId !== authenticatedUserId) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id FROM users WHERE id = ? LIMIT 1'
    )
      .bind(requestedUserId)
      .all();

    return c.json({ exists: results.length > 0 }, 200);
  } catch (error) {
    console.error('Error checking user existence:', error);
    return c.json({ error: 'Failed to check user existence' }, 500);
  }
});

/**
 * POST /api/users/oauth-profile
 * Create user profile from OAuth data (first-time login)
 *
 * Body:
 * {
 *   user_id: string (UUID),
 *   email: string,
 *   first_name?: string,
 *   last_name?: string,
 *   photo_url?: string,
 *   linkedin_url?: string
 * }
 */
app.post('/oauth-profile', authenticateUser, async (c: HonoContext) => {
  const authenticatedUserId = getUserId(c);

  try {
    const body = await c.req.json();
    const parseResult = createOAuthProfileSchema.safeParse(body);

    if (!parseResult.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { user_id, email, first_name, last_name, photo_url, linkedin_url } =
      parseResult.data;

    // Verify authenticated user matches the user_id being created
    if (user_id !== authenticatedUserId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const now = new Date().toISOString();

    // Insert user profile
    await c.env.DB.prepare(
      `INSERT INTO users (
        id, email, first_name, last_name, photo_url, linkedin_url,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        user_id,
        email,
        first_name ?? null,
        last_name ?? null,
        photo_url ?? null,
        linkedin_url ?? null,
        now,
        now
      )
      .run();

    return c.json({ success: true, message: 'Profile created from OAuth data' }, 201);
  } catch (error) {
    console.error('Error creating OAuth profile:', error);
    return c.json({ error: 'Failed to create OAuth profile' }, 500);
  }
});

/**
 * PATCH /api/users/:userId/oauth-enrich
 * Enrich existing profile with OAuth data (only updates empty fields)
 *
 * Body:
 * {
 *   first_name?: string,
 *   last_name?: string,
 *   photo_url?: string,
 *   linkedin_url?: string
 * }
 */
app.patch('/:userId/oauth-enrich', authenticateUser, async (c: HonoContext) => {
  const requestedUserId = c.req.param('userId');
  const authenticatedUserId = getUserId(c);

  // Verify user can only update their own profile
  if (requestedUserId !== authenticatedUserId) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  try {
    const body = await c.req.json();
    const parseResult = enrichOAuthProfileSchema.safeParse(body);

    if (!parseResult.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { first_name, last_name, photo_url, linkedin_url } = parseResult.data;

    // Get existing profile to check what's empty
    const { results } = await c.env.DB.prepare(
      'SELECT id, first_name, last_name, photo_url, linkedin_url FROM users WHERE id = ?'
    )
      .bind(requestedUserId)
      .all();

    if (results.length === 0) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    const existingProfile = results[0] as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      photo_url: string | null;
      linkedin_url: string | null;
    };

    // Build update query for only empty fields
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (!existingProfile.first_name && first_name) {
      updates.push('first_name = ?');
      values.push(first_name);
    }

    if (!existingProfile.last_name && last_name) {
      updates.push('last_name = ?');
      values.push(last_name);
    }

    if (!existingProfile.photo_url && photo_url) {
      updates.push('photo_url = ?');
      values.push(photo_url);
    }

    if (!existingProfile.linkedin_url && linkedin_url) {
      updates.push('linkedin_url = ?');
      values.push(linkedin_url);
    }

    // If nothing to update, return success
    if (updates.length === 0) {
      return c.json({ success: true, message: 'No fields to update', updated: false }, 200);
    }

    // Always update updated_at timestamp
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    // Add user_id for WHERE clause
    values.push(requestedUserId);

    // Execute update
    await c.env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();

    return c.json({ success: true, message: 'Profile enriched with OAuth data', updated: true }, 200);
  } catch (error) {
    console.error('Error enriching OAuth profile:', error);
    return c.json({ error: 'Failed to enrich OAuth profile' }, 500);
  }
});

export default app;
