/**
 * Security Events Routes
 *
 * Handles security event logging and retrieval using D1 database.
 * Security events track user actions like logins, logouts, session changes,
 * and security-related activities for audit trail and monitoring.
 *
 * Storage: Cloudflare D1 (permanent audit logs)
 * - Events are never auto-deleted (permanent audit trail)
 * - Indexed by user_id and timestamp for fast queries
 * - Supports optional metadata for additional context
 *
 * Endpoints:
 * - POST /api/security-events - Log a security event
 * - GET /api/security-events - Get recent events for authenticated user
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, HonoContext } from '../types';
import { authenticateUser, getUserId } from '../middleware/auth';
import { createValidationError } from '../middleware/errorHandler';

const app = new Hono<{ Bindings: Env }>();

// =============================================================================
// Types
// =============================================================================

interface SecurityEventRow {
  id: string;
  user_id: string;
  action: string;
  device: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  ip_address: string | null;
  user_agent: string | null;
  status: 'success' | 'failed';
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

// =============================================================================
// Validation Schemas
// =============================================================================

const logEventSchema = z.object({
  action: z.string().min(1).max(100),
  device: z.string().nullable().optional(),
  browser: z.string().nullable().optional(),
  os: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  ip_address: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  status: z.enum(['success', 'failed']),
  metadata: z.record(z.unknown()).nullable().optional(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/security-events
 * Log a security event
 *
 * Body:
 * {
 *   action: string,
 *   device?: string,
 *   browser?: string,
 *   os?: string,
 *   location?: string,
 *   ip_address?: string,
 *   user_agent?: string,
 *   status: 'success' | 'failed',
 *   metadata?: Record<string, unknown>
 * }
 */
app.post('/', authenticateUser, async (c: HonoContext) => {
  const userId = getUserId(c);

  try {
    const body = await c.req.json();
    const parseResult = logEventSchema.safeParse(body);

    if (!parseResult.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const {
      action,
      device,
      browser,
      os,
      location,
      ip_address,
      user_agent,
      status,
      metadata,
    } = parseResult.data;

    const timestamp = new Date().toISOString();
    const eventId = crypto.randomUUID();

    // Insert security event into D1
    await c.env.DB.prepare(
      `INSERT INTO security_events (
        id, user_id, action, device, browser, os, location,
        ip_address, user_agent, status, metadata, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        eventId,
        userId,
        action,
        device ?? null,
        browser ?? null,
        os ?? null,
        location ?? null,
        ip_address ?? null,
        user_agent ?? null,
        status,
        metadata ? JSON.stringify(metadata) : null,
        timestamp
      )
      .run();

    const event: SecurityEventRow = {
      id: eventId,
      user_id: userId,
      action,
      device: device ?? null,
      browser: browser ?? null,
      os: os ?? null,
      location: location ?? null,
      ip_address: ip_address ?? null,
      user_agent: user_agent ?? null,
      status,
      metadata: metadata ?? null,
      timestamp,
    };

    return c.json({ success: true, event }, 201);
  } catch (error) {
    console.error('Error logging security event:', error);
    return c.json({ error: 'Failed to log security event' }, 500);
  }
});

/**
 * GET /api/security-events
 * Get recent security events for authenticated user
 *
 * Query params:
 * - limit: number (optional, defaults to 20, max 100)
 */
app.get('/', authenticateUser, async (c: HonoContext) => {
  const userId = getUserId(c);
  const limitParam = c.req.query('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20;

  try {
    // Query security events for user, ordered by timestamp descending
    const { results } = await c.env.DB.prepare(
      `SELECT
        id, user_id, action, device, browser, os, location,
        ip_address, user_agent, status, metadata, timestamp
      FROM security_events
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?`
    )
      .bind(userId, limit)
      .all();

    // Parse metadata JSON strings back to objects
    const events: SecurityEventRow[] = results.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      action: row.action,
      device: row.device,
      browser: row.browser,
      os: row.os,
      location: row.location,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      status: row.status as 'success' | 'failed',
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      timestamp: row.timestamp,
    }));

    return c.json(events, 200);
  } catch (error) {
    console.error('Error fetching security events:', error);
    return c.json({ error: 'Failed to fetch security events' }, 500);
  }
});

export default app;
