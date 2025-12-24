/**
 * Authentication Middleware Unit Tests
 * Tests for JWT verification, OPTIONS bypass, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { AuthResponse } from '@supabase/supabase-js';
import { authenticateUser, optionalAuth } from '../../src/middleware/auth';
import { supabase } from '../../src/config/supabase';

// Mock the Supabase client
vi.mock('../../src/config/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      headers: {},
      path: '/api/test',
      ip: '127.0.0.1',
      get: vi.fn(),
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn();

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('authenticateUser', () => {
    it('should bypass authentication for OPTIONS requests (CORS preflight)', async () => {
      mockRequest.method = 'OPTIONS';

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(supabase.auth.getUser).not.toHaveBeenCalled();
    });

    it('should return 401 when no authorization header is provided', async () => {
      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MISSING_AUTH_HEADER',
          statusCode: 401,
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header format is invalid', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token123',
      };

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_AUTH_FORMAT',
        })
      );
    });

    it('should return 401 when token is missing', async () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MISSING_TOKEN',
        })
      );
    });

    it('should attach user to request when token is valid', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as AuthResponse);

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toEqual(mockUser);
      expect(mockRequest.userId).toBe('user-123');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 when token is expired', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token',
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: new Error('Token has expired'),
      } as AuthResponse);

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'TOKEN_EXPIRED',
        })
      );
    });

    it('should return 401 when token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token'),
      } as AuthResponse);

      await authenticateUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_TOKEN',
        })
      );
    });
  });

  describe('optionalAuth', () => {
    it('should continue without user when no auth header provided', async () => {
      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should attach user when valid token provided', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'optional@example.com',
        app_metadata: {},
        user_metadata: {},
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as AuthResponse);

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toEqual(mockUser);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should continue without user when token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token'),
      } as AuthResponse);

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
