/**
 * Authentication Middleware
 *
 * Verifies Supabase JWT tokens and attaches user data to requests.
 *
 * Security features:
 * - JWT token verification via Supabase Auth
 * - Token expiration validation
 * - User existence verification
 * - Request logging for security auditing
 */

import type { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { HttpError } from '../types';

// =============================================================================
// Type Extensions
// =============================================================================

/**
 * Extend Express Request to include authenticated user
 */
declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
    }
  }
}

// =============================================================================
// Authentication Middleware
// =============================================================================

/**
 * Middleware to verify Supabase JWT tokens
 * Attaches user object to request if authentication is successful
 *
 * Usage:
 * ```typescript
 * router.post('/protected', authenticateUser, (req, res) => {
 *   // req.user and req.userId are available here
 * });
 * ```
 */
export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip authentication for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

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
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) {
      // Log authentication errors for security monitoring
      console.error('Token verification failed:', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        path: req.path,
      });

      // Map Supabase errors to appropriate HTTP responses
      if (error.message.includes('expired')) {
        throw new HttpError(401, 'Token has expired', 'TOKEN_EXPIRED');
      }
      if (error.message.includes('invalid')) {
        throw new HttpError(401, 'Invalid token', 'INVALID_TOKEN');
      }
      throw new HttpError(401, 'Authentication failed', 'AUTH_FAILED');
    }

    if (!user) {
      throw new HttpError(401, 'User not found', 'USER_NOT_FOUND');
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    // Log successful authentication (for auditing, not in production logs)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Authenticated user: ${user.id} for ${req.method} ${req.path}`);
    }

    next();
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json(error.toJSON());
      return;
    }

    // Log unexpected errors
    console.error('Unexpected authentication error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred during authentication',
      statusCode: 500,
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't fail if not provided
 * Useful for endpoints that have different behavior for authenticated vs anonymous users
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No auth header, continue without user
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      // Invalid format, continue without user
      next();
      return;
    }

    const token = parts[1];
    if (!token) {
      next();
      return;
    }

    // Try to verify token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = user;
      req.userId = user.id;
    }

    next();
  } catch {
    // Don't fail on errors, just continue without user
    next();
  }
}

/**
 * Admin-only authentication middleware
 * Verifies that the authenticated user has admin privileges
 * Must be used after authenticateUser middleware
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.userId) {
      throw new HttpError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    // Check admin status in user metadata or database
    // For now, check if user has admin role in app_metadata
    const isAdmin = req.user.app_metadata?.role === 'admin';

    if (!isAdmin) {
      // Log unauthorized admin access attempts
      console.warn('Unauthorized admin access attempt:', {
        userId: req.userId,
        ip: req.ip,
        path: req.path,
      });
      throw new HttpError(403, 'Admin privileges required', 'ADMIN_REQUIRED');
    }

    next();
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json(error.toJSON());
      return;
    }

    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    });
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract user ID from request (for use in routes after authentication)
 * Throws if user is not authenticated
 */
export function getUserId(req: Request): string {
  if (!req.userId) {
    throw new HttpError(401, 'User not authenticated', 'NOT_AUTHENTICATED');
  }
  return req.userId;
}

/**
 * Extract user from request (for use in routes after authentication)
 * Throws if user is not authenticated
 */
export function getUser(req: Request): User {
  if (!req.user) {
    throw new HttpError(401, 'User not authenticated', 'NOT_AUTHENTICATED');
  }
  return req.user;
}
