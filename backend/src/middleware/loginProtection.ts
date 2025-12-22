/**
 * SEC-004: Login Protection Middleware
 *
 * Implements account lockout after failed login attempts to prevent brute force attacks.
 *
 * Features:
 * - Tracks failed login attempts per email and IP
 * - Locks account after 5 failed attempts within 15 minutes
 * - Auto-unlocks after 30 minutes
 * - Clears attempts after successful login
 */

import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { HttpError } from '../types';

// =============================================================================
// Types
// =============================================================================

interface LockoutResult {
  locked: boolean;
  failed_attempts: number;
  attempts_remaining?: number;
  locked_until?: string;
  message: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get client IP address from request
 * Handles proxies and load balancers
 */
function getClientIP(req: Request): string {
  // Check common proxy headers
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, use the first one
    const ips = (forwarded as string).split(',');
    const firstIP = ips[0];
    if (firstIP) {
      return firstIP.trim();
    }
  }

  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP as string;
  }

  // Fallback to req.ip (Express default)
  return req.ip || '0.0.0.0';
}

/**
 * Get user agent from request
 */
function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

// =============================================================================
// Middleware Functions
// =============================================================================

/**
 * Check if account is currently locked
 * Call this BEFORE attempting authentication
 *
 * Usage:
 * router.post('/login', checkAccountLockout, async (req, res) => { ... })
 */
export async function checkAccountLockout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      // No email provided, let the auth handler deal with it
      next();
      return;
    }

    // Check if account is locked
    const { data, error } = await supabaseAdmin.rpc('is_account_locked', {
      user_email: email.toLowerCase().trim(),
    });

    if (error) {
      console.error('[SEC-004] Error checking account lockout:', error);
      // Don't block login on database errors, but log for investigation
      next();
      return;
    }

    if (data === true) {
      // Account is locked
      // Get lockout details for error message
      const { data: lockoutData } = await supabaseAdmin
        .from('account_lockouts')
        .select('locked_until, failed_attempt_count')
        .eq('email', email.toLowerCase().trim())
        .is('unlocked_at', null)
        .order('locked_at', { ascending: false })
        .limit(1)
        .single();

      const lockedUntil = lockoutData?.locked_until
        ? new Date(lockoutData.locked_until)
        : new Date(Date.now() + 30 * 60 * 1000);

      const minutesRemaining = Math.ceil(
        (lockedUntil.getTime() - Date.now()) / (60 * 1000)
      );

      console.warn('[SEC-004] Account lockout prevented login:', {
        email: email.substring(0, 3) + '***', // Partial email for privacy
        ip: getClientIP(req),
        minutesRemaining,
      });

      throw new HttpError(
        429,
        `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minute(s).`,
        'ACCOUNT_LOCKED'
      );
    }

    // Account not locked, proceed
    next();
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json(error.toJSON());
      return;
    }

    console.error('[SEC-004] Unexpected error in checkAccountLockout:', error);
    next(); // Don't block login on unexpected errors
  }
}

/**
 * Record failed login attempt
 * Call this AFTER authentication fails
 *
 * Usage:
 * if (authError) {
 *   await recordFailedLogin(req, email);
 *   return res.status(401).json({ error: 'Invalid credentials' });
 * }
 */
export async function recordFailedLogin(
  req: Request,
  email: string
): Promise<LockoutResult | null> {
  try {
    const clientIP = getClientIP(req);
    const userAgent = getUserAgent(req);

    const { data, error } = await supabaseAdmin.rpc('record_failed_login', {
      user_email: email.toLowerCase().trim(),
      client_ip: clientIP,
      user_agent_string: userAgent,
    });

    if (error) {
      console.error('[SEC-004] Error recording failed login:', error);
      return null;
    }

    const result = data as LockoutResult;

    if (result.locked) {
      console.warn('[SEC-004] Account locked after failed attempts:', {
        email: email.substring(0, 3) + '***',
        ip: clientIP,
        failed_attempts: result.failed_attempts,
        locked_until: result.locked_until,
      });
    } else {
      console.log('[SEC-004] Failed login attempt recorded:', {
        email: email.substring(0, 3) + '***',
        ip: clientIP,
        attempts_remaining: result.attempts_remaining,
      });
    }

    return result;
  } catch (error) {
    console.error('[SEC-004] Unexpected error recording failed login:', error);
    return null;
  }
}

/**
 * Clear failed login attempts after successful login
 * Call this AFTER successful authentication
 *
 * Usage:
 * if (authSuccess) {
 *   await clearFailedAttempts(email);
 * }
 */
export async function clearFailedAttempts(email: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.rpc('clear_failed_login_attempts', {
      user_email: email.toLowerCase().trim(),
    });

    if (error) {
      console.error('[SEC-004] Error clearing failed attempts:', error);
      // Don't throw - this shouldn't block successful login
    } else {
      console.log('[SEC-004] Cleared failed attempts after successful login:', {
        email: email.substring(0, 3) + '***',
      });
    }
  } catch (error) {
    console.error('[SEC-004] Unexpected error clearing failed attempts:', error);
  }
}

/**
 * Manually unlock account (admin function)
 *
 * Usage:
 * router.post('/admin/unlock-account', authenticateUser, requireAdmin, async (req, res) => {
 *   const { email } = req.body;
 *   const result = await unlockAccount(email, req.userId!);
 *   res.json({ success: result });
 * });
 */
export async function unlockAccount(
  email: string,
  adminUserId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('unlock_account', {
      user_email: email.toLowerCase().trim(),
      admin_user_id: adminUserId,
    });

    if (error) {
      console.error('[SEC-004] Error unlocking account:', error);
      return false;
    }

    console.log('[SEC-004] Account manually unlocked:', {
      email: email.substring(0, 3) + '***',
      admin: adminUserId,
    });

    return data === true;
  } catch (error) {
    console.error('[SEC-004] Unexpected error unlocking account:', error);
    return false;
  }
}

// =============================================================================
// Scheduled Cleanup Functions
// =============================================================================

/**
 * Clean up old failed login attempts (older than 24 hours)
 * Should be called by a scheduled job
 */
export async function cleanupOldFailedLogins(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin.rpc('cleanup_old_failed_logins');

    if (error) {
      console.error('[SEC-004] Error cleaning up old failed logins:', error);
      return 0;
    }

    const deletedCount = data as number;
    if (deletedCount > 0) {
      console.log(`[SEC-004] Cleaned up ${deletedCount} old failed login attempts`);
    }

    return deletedCount;
  } catch (error) {
    console.error('[SEC-004] Unexpected error in cleanup:', error);
    return 0;
  }
}

/**
 * Clean up expired lockouts
 * Should be called by a scheduled job
 */
export async function cleanupExpiredLockouts(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin.rpc('cleanup_expired_lockouts');

    if (error) {
      console.error('[SEC-004] Error cleaning up expired lockouts:', error);
      return 0;
    }

    const updatedCount = data as number;
    if (updatedCount > 0) {
      console.log(`[SEC-004] Auto-unlocked ${updatedCount} expired account lockouts`);
    }

    return updatedCount;
  } catch (error) {
    console.error('[SEC-004] Unexpected error in cleanup:', error);
    return 0;
  }
}

// =============================================================================
// Export all functions
// =============================================================================

export default {
  checkAccountLockout,
  recordFailedLogin,
  clearFailedAttempts,
  unlockAccount,
  cleanupOldFailedLogins,
  cleanupExpiredLockouts,
};
