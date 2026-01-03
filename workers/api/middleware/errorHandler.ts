/**
 * Error Handler Middleware for Cloudflare Workers
 *
 * Centralizes error handling for the Hono application.
 * Provides consistent error responses and logging.
 */

import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';
import { HttpError, type Env, type Variables } from '../types';

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
 * Global error handling middleware for Hono
 */
export const errorHandler: ErrorHandler<{ Bindings: Env; Variables: Variables }> = (err, c) => {
  // Log error with request context
  console.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    method: c.req.method,
    path: c.req.path,
    userId: c.get('userId'),
  });

  // Build error response
  const response = buildErrorResponse(err, c.env.ENVIRONMENT === 'development');

  // Send response
  return c.json(response, response.statusCode as 400 | 401 | 403 | 404 | 500);
};

// =============================================================================
// Error Response Builder
// =============================================================================

function buildErrorResponse(err: Error, isDevelopment: boolean): ErrorResponse {
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
// Error Factory Functions
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
