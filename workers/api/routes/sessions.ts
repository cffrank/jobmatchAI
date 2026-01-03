/**
 * Session Management Routes
 *
 * Handles user session management using Cloudflare KV storage.
 * Sessions are stored with automatic expiration (TTL) and indexed by user ID.
 *
 * KV Key Pattern: `user:${userId}:${sessionId}`
 * - Enables efficient user-scoped session listing via prefix queries
 * - Automatic expiration via KV TTL (no cleanup job needed)
 * - Edge-distributed for global performance
 *
 * Endpoints:
 * - POST /api/sessions - Create or update session
 * - PATCH /api/sessions/:sessionId - Update last activity
 * - GET /api/sessions - List active sessions for user
 * - DELETE /api/sessions/:sessionId - Revoke session
 * - GET /api/users/:userId/2fa-settings - Get 2FA settings
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, HonoContext } from '../types';
import { authenticateUser, getUserId } from '../middleware/auth';
import { createValidationError, createNotFoundError } from '../middleware/errorHandler';

const app = new Hono<{ Bindings: Env }>();

// =============================================================================
// Types
// =============================================================================

interface SessionData {
  session_id: string;
  user_id: string;
  device_type: string | null;
  device_os: string | null;
  browser: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_active: string;
  expires_at: string;
  created_at: string;
}

interface TwoFactorSettings {
  two_factor_enabled: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const SESSION_TTL = 604800; // 7 days in seconds

// =============================================================================
// Validation Schemas
// =============================================================================

const createSessionSchema = z.object({
  session_id: z.string().min(1),
  device_type: z.string().nullable().optional(),
  device_os: z.string().nullable().optional(),
  browser: z.string().nullable().optional(),
  ip_address: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/sessions
 * Create or update session (upsert behavior)
 *
 * Body:
 * {
 *   session_id: string,
 *   device_type?: string,
 *   device_os?: string,
 *   browser?: string,
 *   ip_address?: string,
 *   user_agent?: string
 * }
 */
app.post('/', authenticateUser, async (c: HonoContext) => {
  const userId = getUserId(c);

  try {
    const body = await c.req.json();
    const parseResult = createSessionSchema.safeParse(body);

    if (!parseResult.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { session_id, ...deviceInfo } = parseResult.data;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL * 1000);

    // Check if session already exists (for updated_at logic)
    const kvKey = `user:${userId}:${session_id}`;
    const existingSessionJson = await c.env.SESSIONS.get(kvKey);
    const existingSession = existingSessionJson ? JSON.parse(existingSessionJson) as SessionData : null;

    const sessionData: SessionData = {
      session_id,
      user_id: userId,
      device_type: deviceInfo.device_type ?? null,
      device_os: deviceInfo.device_os ?? null,
      browser: deviceInfo.browser ?? null,
      ip_address: deviceInfo.ip_address ?? null,
      user_agent: deviceInfo.user_agent ?? null,
      last_active: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      created_at: existingSession?.created_at || now.toISOString(),
    };

    // Store in KV with automatic expiration
    await c.env.SESSIONS.put(
      kvKey,
      JSON.stringify(sessionData),
      { expirationTtl: SESSION_TTL }
    );

    return c.json({ success: true, session: sessionData }, existingSession ? 200 : 201);
  } catch (error) {
    console.error('Error creating/updating session:', error);
    return c.json({ error: 'Failed to create/update session' }, 500);
  }
});

/**
 * PATCH /api/sessions/:sessionId
 * Update session last_active timestamp
 */
app.patch('/:sessionId', authenticateUser, async (c: HonoContext) => {
  const userId = getUserId(c);
  const sessionId = c.req.param('sessionId');

  try {
    const kvKey = `user:${userId}:${sessionId}`;
    const sessionJson = await c.env.SESSIONS.get(kvKey);
    const session = sessionJson ? JSON.parse(sessionJson) as SessionData : null;

    if (!session) {
      return c.json(createNotFoundError('Session not found'), 404);
    }

    // Verify session belongs to user
    if (session.user_id !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Update last_active
    const updatedSession: SessionData = {
      ...session,
      last_active: new Date().toISOString(),
    };

    // Re-put with same TTL (refreshes expiration)
    await c.env.SESSIONS.put(
      kvKey,
      JSON.stringify(updatedSession),
      { expirationTtl: SESSION_TTL }
    );

    return c.json({ success: true, session: updatedSession }, 200);
  } catch (error) {
    console.error('Error updating session activity:', error);
    return c.json({ error: 'Failed to update session activity' }, 500);
  }
});

/**
 * GET /api/sessions
 * List all active sessions for authenticated user
 *
 * Query params:
 * - active: boolean (optional, defaults to true)
 */
app.get('/', authenticateUser, async (c: HonoContext) => {
  const userId = getUserId(c);
  const activeOnly = c.req.query('active') !== 'false'; // Default to active only

  try {
    // List all keys with user prefix
    const prefix = `user:${userId}:`;
    const { keys } = await c.env.SESSIONS.list({ prefix });

    // Fetch all sessions
    const sessions: SessionData[] = [];
    for (const key of keys) {
      const sessionJson = await c.env.SESSIONS.get(key.name);
      if (sessionJson) {
        const session = JSON.parse(sessionJson) as SessionData;
        // Filter by active status if requested
        if (!activeOnly || new Date(session.expires_at) > new Date()) {
          sessions.push(session);
        }
      }
    }

    // Sort by last_active descending
    sessions.sort((a, b) =>
      new Date(b.last_active).getTime() - new Date(a.last_active).getTime()
    );

    // Limit to 20 most recent (matching Supabase behavior)
    const limitedSessions = sessions.slice(0, 20);

    return c.json(limitedSessions, 200);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return c.json({ error: 'Failed to fetch sessions' }, 500);
  }
});

/**
 * DELETE /api/sessions/:sessionId
 * Revoke (delete) a specific session
 */
app.delete('/:sessionId', authenticateUser, async (c: HonoContext) => {
  const userId = getUserId(c);
  const sessionId = c.req.param('sessionId');

  try {
    const kvKey = `user:${userId}:${sessionId}`;
    const sessionJson = await c.env.SESSIONS.get(kvKey);
    const session = sessionJson ? JSON.parse(sessionJson) as SessionData : null;

    if (!session) {
      return c.json(createNotFoundError('Session not found'), 404);
    }

    // Verify session belongs to user
    if (session.user_id !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Delete from KV
    await c.env.SESSIONS.delete(kvKey);

    return c.json({ success: true, message: 'Session revoked' }, 200);
  } catch (error) {
    console.error('Error revoking session:', error);
    return c.json({ error: 'Failed to revoke session' }, 500);
  }
});

/**
 * GET /api/users/:userId/2fa-settings
 * Get two-factor authentication settings for user
 *
 * Note: This queries D1 database, not KV
 */
app.get('/users/:userId/2fa-settings', authenticateUser, async (c: HonoContext) => {
  const requestedUserId = c.req.param('userId');
  const authenticatedUserId = getUserId(c);

  // Verify user can only access their own 2FA settings
  if (requestedUserId !== authenticatedUserId) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT two_factor_enabled FROM users WHERE id = ?'
    ).bind(requestedUserId).all();

    if (results.length === 0) {
      return c.json(createNotFoundError('User not found'), 404);
    }

    const settings: TwoFactorSettings = {
      two_factor_enabled: Boolean(results[0].two_factor_enabled),
    };

    return c.json(settings, 200);
  } catch (error) {
    console.error('Error fetching 2FA settings:', error);
    return c.json({ error: 'Failed to fetch 2FA settings' }, 500);
  }
});

export default app;
