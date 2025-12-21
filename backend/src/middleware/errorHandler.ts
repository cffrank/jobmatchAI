/**
 * Global Error Handler Middleware
 *
 * Centralizes error handling for the Express application.
 * Provides consistent error responses and logging.
 *
 * Features:
 * - Consistent error response format
 * - Environment-aware error details (stack traces only in development)
 * - Error logging with context
 * - Support for custom HttpError class
 */

import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { HttpError } from '../types';
import { ZodError } from 'zod';

// =============================================================================
// Error Response Interface
// =============================================================================

interface ErrorResponse {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  stack?: string;
}

// =============================================================================
// Global Error Handler
// =============================================================================

/**
 * Global error handling middleware
 * Must be registered LAST in the middleware chain
 *
 * Usage:
 * ```typescript
 * app.use(errorHandler);
 * ```
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Log error with request context
  console.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    userId: req.userId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: sanitizeBody(req.body),
  });

  // Build error response
  const response = buildErrorResponse(err);

  // Send response
  res.status(response.statusCode).json(response);
};

// =============================================================================
// Error Response Builder
// =============================================================================

/**
 * Build a standardized error response from any error type
 */
function buildErrorResponse(err: Error): ErrorResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Handle custom HttpError
  if (err instanceof HttpError) {
    return {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      details: err.details,
      ...(isDevelopment && { stack: err.stack }),
    };
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));

    return {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      statusCode: 400,
      details: { errors },
      ...(isDevelopment && { stack: err.stack }),
    };
  }

  // Handle common error types by name
  switch (err.name) {
    case 'ValidationError':
      return {
        code: 'VALIDATION_ERROR',
        message: err.message,
        statusCode: 400,
        ...(isDevelopment && { stack: err.stack }),
      };

    case 'UnauthorizedError':
      return {
        code: 'UNAUTHORIZED',
        message: err.message || 'Authentication required',
        statusCode: 401,
        ...(isDevelopment && { stack: err.stack }),
      };

    case 'ForbiddenError':
      return {
        code: 'FORBIDDEN',
        message: err.message || 'Access denied',
        statusCode: 403,
        ...(isDevelopment && { stack: err.stack }),
      };

    case 'NotFoundError':
      return {
        code: 'NOT_FOUND',
        message: err.message || 'Resource not found',
        statusCode: 404,
        ...(isDevelopment && { stack: err.stack }),
      };

    default:
      // Generic server error - hide details in production
      return {
        code: 'INTERNAL_ERROR',
        message: isDevelopment ? err.message : 'An unexpected error occurred',
        statusCode: 500,
        ...(isDevelopment && { stack: err.stack }),
      };
  }
}

// =============================================================================
// Request Body Sanitizer
// =============================================================================

/**
 * Sanitize request body for logging
 * Removes sensitive fields like passwords, tokens, etc.
 */
function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'authorization',
    'creditCard',
    'ssn',
    'socialSecurityNumber',
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeBody(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// =============================================================================
// 404 Not Found Handler
// =============================================================================

/**
 * Handler for routes that don't exist
 * Should be registered after all routes but before error handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
  });
}

// =============================================================================
// Async Handler Wrapper
// =============================================================================

/**
 * Wrapper for async route handlers to catch errors
 * Eliminates the need for try-catch in every route
 *
 * Usage:
 * ```typescript
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await getUsers();
 *   res.json(users);
 * }));
 * ```
 */
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// =============================================================================
// Validation Error Factory
// =============================================================================

/**
 * Create a validation error with field-specific details
 */
export function createValidationError(
  message: string,
  fields: Record<string, string>
): HttpError {
  return new HttpError(400, message, 'VALIDATION_ERROR', { fields });
}

/**
 * Create a not found error
 */
export function createNotFoundError(resource: string, id?: string): HttpError {
  const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
  return new HttpError(404, message, 'NOT_FOUND', { resource, id });
}

/**
 * Create a forbidden error
 */
export function createForbiddenError(message: string = 'Access denied'): HttpError {
  return new HttpError(403, message, 'FORBIDDEN');
}

/**
 * Create a conflict error (e.g., duplicate resource)
 */
export function createConflictError(
  message: string,
  details?: Record<string, unknown>
): HttpError {
  return new HttpError(409, message, 'CONFLICT', details);
}
