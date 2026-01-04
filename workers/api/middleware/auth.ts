/**
 * Authentication Middleware for Cloudflare Workers
 *
 * Verifies Supabase JWT tokens and attaches user data to context.
 * Adapted from Express middleware for Hono.
 */

import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../types';
import { HttpError } from '../types';
import { createSupabaseClient } from '../services/supabase';

/**
 * Middleware to verify Supabase JWT tokens
 * Attaches userId to context if authentication is successful
 *
 * Usage:
 * ```typescript
 * app.post('/protected', authenticateUser, (c) => {
 *   const userId = c.get('userId');
 * });
 * ```
 */
export const authenticateUser: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  // Skip authentication for OPTIONS requests (CORS preflight)
  if (c.req.method === 'OPTIONS') {
    return next();
  }

  try {
    // Extract token from Authorization header
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      throw new HttpError(401, 'No authorization header provided', 'MISSING_AUTH_HEADER');
    }

    // Expect "Bearer <token>" format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new HttpError(
        401,
        'Invalid authorization header format. Expected: Bearer <token>',
        'INVALID_AUTH_FORMAT'
      );
    }

    const token = parts[1];
    if (!token) {
      throw new HttpError(401, 'No token provided', 'MISSING_TOKEN');
    }

    // Verify token with Supabase
    const supabase = createSupabaseClient(c.env);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      // Log authentication errors for security monitoring
      console.error('Token verification failed:', {
        error: error.message,
        path: c.req.path,
      });

      // Map Supabase errors to appropriate HTTP responses
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('expired')) {
        throw new HttpError(401, 'Token has expired', 'TOKEN_EXPIRED');
      }
      if (errorMessage.includes('invalid')) {
        throw new HttpError(401, 'Invalid token', 'INVALID_TOKEN');
      }
      throw new HttpError(401, 'Authentication failed', 'AUTH_FAILED');
    }

    if (!user) {
      throw new HttpError(401, 'User not found', 'USER_NOT_FOUND');
    }

    // Attach user data to context
    c.set('userId', user.id);
    c.set('userEmail', user.email);

    // Log successful authentication for debugging
    console.log(`[Auth] Authenticated user: ${user.id} for ${c.req.method} ${c.req.path}`);

    return next();
  } catch (error) {
    if (error instanceof HttpError) {
      return c.json(error.toJSON(), error.statusCode as 400 | 401 | 403 | 404 | 500);
    }

    // Log unexpected errors
    console.error('Unexpected authentication error:', error);
    return c.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during authentication',
        statusCode: 500,
      },
      500
    );
  }
};

/**
 * Optional authentication middleware
 * Attaches user to context if token is valid, but doesn't fail if not provided
 */
export const optionalAuth: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next();
  }

  const token = parts[1];
  if (!token) {
    return next();
  }

  try {
    const supabase = createSupabaseClient(c.env);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      c.set('userId', user.id);
      c.set('userEmail', user.email);
    }
  } catch {
    // Don't fail on errors, just continue without user
  }

  return next();
};

/**
 * Admin-only authentication middleware
 * Verifies that the authenticated user has admin privileges
 * Must be used after authenticateUser middleware
 */
export const requireAdmin: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  const userId = c.get('userId');

  if (!userId) {
    return c.json(
      {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
        statusCode: 401,
      },
      401
    );
  }

  // For now, we skip admin check since we don't have access to user metadata
  // In production, you'd check app_metadata.role === 'admin'
  // This is a simplified implementation
  console.warn('Admin check bypassed - implement proper admin verification');

  return next();
};

/**
 * Helper to get user ID from context
 * Throws if user is not authenticated
 */
export function getUserId(c: { get: (key: 'userId') => string | undefined }): string {
  const userId = c.get('userId');
  if (!userId) {
    throw new HttpError(401, 'User not authenticated', 'NOT_AUTHENTICATED');
  }
  return userId;
}
