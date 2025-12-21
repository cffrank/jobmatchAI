/**
 * Client-side rate limiting hook using Supabase Edge Functions
 *
 * SECURITY: This hook provides user-friendly rate limit enforcement
 * Note: Server-side enforcement is the primary security control
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
}

type RateLimitOperation = 'ai_generation' | 'job_search' | 'email_send';

export function useRateLimit() {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const checkRateLimit = useCallback(async (operation: RateLimitOperation): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke<RateLimitResponse>('rate-limit', {
        body: { operation },
      });

      if (error) throw error;

      if (!data) {
        throw new Error('No response from rate limit service');
      }

      setRemaining(data.remaining);

      if (!data.allowed) {
        setIsRateLimited(true);
        toast.error('Rate limit exceeded', {
          description: `You have reached your limit. Resets at ${new Date(data.resetAt).toLocaleString()}`,
        });
        return false;
      }

      setIsRateLimited(false);
      return true;

    } catch (error: unknown) {
      console.error('Rate limit check failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        toast.error('Authentication required', {
          description: 'Please sign in to continue.',
        });
        return false;
      }

      // Other errors - allow request but log
      console.error('Rate limit check error:', error);
      return true;
    }
  }, []);

  return {
    checkRateLimit,
    isRateLimited,
    remaining,
  };
}
