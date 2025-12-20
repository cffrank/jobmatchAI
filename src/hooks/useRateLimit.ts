/**
 * Client-side rate limiting hook
 *
 * SECURITY: This hook provides user-friendly rate limit enforcement
 * Note: Server-side enforcement is the primary security control
 */

import { useState, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  resetAt: string;
}

interface RateLimitError {
  code: string;
  message: string;
}

export function useRateLimit() {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const checkRateLimit = useCallback(async (endpoint: string): Promise<boolean> => {
    try {
      const functions = getFunctions();
      const checkLimit = httpsCallable<{ endpoint: string }, RateLimitResponse>(
        functions,
        'checkRateLimit'
      );

      const result = await checkLimit({ endpoint });

      setRemaining(result.data.remaining);
      setIsRateLimited(false);
      return true;

    } catch (error: any) {
      const rateLimitError = error as RateLimitError;

      if (rateLimitError.code === 'functions/resource-exhausted') {
        setIsRateLimited(true);
        toast.error('Rate limit exceeded', {
          description: rateLimitError.message || 'Please try again later.',
        });
        return false;
      }

      if (rateLimitError.code === 'functions/permission-denied') {
        toast.error('Access blocked', {
          description: 'Your access has been temporarily restricted.',
        });
        return false;
      }

      // Other errors - allow request but log
      console.error('Rate limit check failed:', error);
      return true;
    }
  }, []);

  return {
    checkRateLimit,
    isRateLimited,
    remaining,
  };
}
