/**
 * Authentication Routes
 *
 * Handles OAuth authentication flows.
 *
 * Endpoints:
 * - GET /api/auth/linkedin/initiate - Start LinkedIn OAuth flow
 * - GET /api/auth/linkedin/callback - Handle LinkedIn OAuth callback
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin, TABLES } from '../config/supabase';
import { authenticateUser, getUserId } from '../middleware/auth';
import { rateLimiter, ipRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { HttpError } from '../types';

// =============================================================================
// Router Setup
// =============================================================================

const router = Router();

// =============================================================================
// Configuration
// =============================================================================

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// OAuth state expiration (10 minutes)
const STATE_EXPIRATION_MS = 10 * 60 * 1000;

// =============================================================================
// Validation Schemas
// =============================================================================

const callbackSchema = z.object({
  code: z.string().min(10).max(500),
  state: z.string().min(20).max(500),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/auth/linkedin/initiate
 * Start LinkedIn OAuth flow - returns authorization URL
 * Requires authentication to link LinkedIn to existing account
 */
router.get(
  '/linkedin/initiate',
  authenticateUser,
  rateLimiter({ maxRequests: 5, windowMs: 15 * 60 * 1000 }), // 5 per 15 minutes
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    if (!LINKEDIN_CLIENT_ID) {
      throw new HttpError(
        503,
        'LinkedIn integration is not configured',
        'LINKEDIN_NOT_CONFIGURED'
      );
    }

    // Generate and store state token for CSRF protection
    const state = uuidv4() + '-' + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + STATE_EXPIRATION_MS);

    await supabaseAdmin.from(TABLES.OAUTH_STATES).insert({
      user_id: userId,
      provider: 'linkedin',
      state,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });

    // Build LinkedIn authorization URL
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', LINKEDIN_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', LINKEDIN_REDIRECT_URI || '');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'openid profile email');

    console.log(`LinkedIn auth initiated for user ${userId}`);

    res.json({
      authUrl: authUrl.toString(),
      state,
      expiresAt: expiresAt.toISOString(),
    });
  })
);

/**
 * GET /api/auth/linkedin/callback
 * Handle LinkedIn OAuth callback
 * Exchanges code for access token and imports profile data
 */
router.get(
  '/linkedin/callback',
  ipRateLimiter(10, 15 * 60 * 1000), // 10 per 15 minutes per IP
  asyncHandler(async (req: Request, res: Response) => {
    // Handle OAuth errors from LinkedIn
    if (req.query.error) {
      console.warn('LinkedIn OAuth error:', req.query.error, req.query.error_description);
      return redirectWithError(res, req.query.error === 'user_cancelled_authorize' ? 'user_cancelled' : 'oauth_error');
    }

    // Validate callback parameters
    const parseResult = callbackSchema.safeParse(req.query);
    if (!parseResult.success) {
      console.warn('Invalid callback parameters:', parseResult.error);
      return redirectWithError(res, 'invalid_parameters');
    }

    const { code, state } = parseResult.data;

    // Verify state token
    const { data: stateRecord, error: stateError } = await supabaseAdmin
      .from(TABLES.OAUTH_STATES)
      .select('*')
      .eq('state', state)
      .eq('provider', 'linkedin')
      .single();

    if (stateError || !stateRecord) {
      console.warn('Invalid state token:', state.substring(0, 20));
      return redirectWithError(res, 'invalid_state');
    }

    // Check if state is expired
    if (new Date(stateRecord.expires_at) < new Date()) {
      console.warn('Expired state token');
      await supabaseAdmin.from(TABLES.OAUTH_STATES).delete().eq('id', stateRecord.id);
      return redirectWithError(res, 'expired_state');
    }

    const userId = stateRecord.user_id;

    // Delete used state token
    await supabaseAdmin.from(TABLES.OAUTH_STATES).delete().eq('id', stateRecord.id);

    try {
      // Exchange code for access token
      const tokenData = await exchangeCodeForToken(code);
      if (!tokenData?.access_token) {
        console.error('Token exchange failed');
        return redirectWithError(res, 'token_exchange_failed');
      }

      // Fetch LinkedIn profile
      const profileData = await fetchLinkedInProfile(tokenData.access_token);
      if (!profileData) {
        console.error('Profile fetch failed');
        return redirectWithError(res, 'profile_fetch_failed');
      }

      // Import profile to database
      await importProfileToDatabase(userId, profileData);

      console.log(`Successfully imported LinkedIn data for user ${userId}`);

      // Redirect to success page
      return redirectWithSuccess(res);
    } catch (error) {
      console.error('LinkedIn callback error:', error);
      return redirectWithError(res, 'internal_error');
    }
  })
);

// =============================================================================
// LinkedIn API Functions
// =============================================================================

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

async function exchangeCodeForToken(code: string): Promise<TokenResponse | null> {
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET || !LINKEDIN_REDIRECT_URI) {
    throw new Error('LinkedIn credentials not configured');
  }

  const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: LINKEDIN_CLIENT_ID,
    client_secret: LINKEDIN_CLIENT_SECRET,
    redirect_uri: LINKEDIN_REDIRECT_URI,
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange failed:', response.status, errorText);
      return null;
    }

    return (await response.json()) as TokenResponse;
  } catch (error) {
    console.error('Token exchange error:', error);
    return null;
  }
}

interface LinkedInUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  locale?: string;
}

interface LinkedInProfileData {
  userInfo: LinkedInUserInfo;
  limitedAccess: boolean;
  importedAt: string;
}

async function fetchLinkedInProfile(accessToken: string): Promise<LinkedInProfileData | null> {
  try {
    // Fetch from OpenID Connect UserInfo endpoint
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error('UserInfo fetch failed:', response.status);
      return null;
    }

    const userInfo = (await response.json()) as LinkedInUserInfo;

    return {
      userInfo,
      limitedAccess: true, // Standard OAuth doesn't include work experience
      importedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Profile fetch error:', error);
    return null;
  }
}

async function importProfileToDatabase(
  userId: string,
  linkedInData: LinkedInProfileData
): Promise<void> {
  const { userInfo, limitedAccess } = linkedInData;

  // Build profile update
  const profileUpdate: Record<string, unknown> = {
    linkedin_imported: true,
    linkedin_imported_at: new Date().toISOString(),
    linkedin_limited_access: limitedAccess,
    updated_at: new Date().toISOString(),
  };

  if (userInfo.given_name) {
    profileUpdate.first_name = userInfo.given_name;
  }

  if (userInfo.family_name) {
    profileUpdate.last_name = userInfo.family_name;
  }

  if (userInfo.email) {
    profileUpdate.email = userInfo.email;
  }

  if (userInfo.picture) {
    profileUpdate.profile_image_url = userInfo.picture;
  }

  // Construct LinkedIn profile URL
  if (userInfo.sub) {
    const profileId = userInfo.sub.includes(':')
      ? userInfo.sub.split(':').pop()
      : userInfo.sub;
    profileUpdate.linkedin_url = `https://www.linkedin.com/in/${profileId}`;
  }

  if (userInfo.locale) {
    profileUpdate.locale = userInfo.locale;
  }

  // Update user profile
  const { error } = await supabaseAdmin
    .from(TABLES.USERS)
    .update(profileUpdate)
    .eq('id', userId);

  if (error) {
    console.error('Profile update error:', error);
    throw error;
  }

  // Create notification about limited data import
  if (limitedAccess) {
    await supabaseAdmin.from(TABLES.NOTIFICATIONS).insert({
      user_id: userId,
      type: 'linkedin_import_limited',
      title: 'LinkedIn Import Completed',
      message:
        'Basic profile information has been imported from LinkedIn. To add work experience, education, and skills, please enter them manually in your profile or upload your resume.',
      read: false,
      action_url: '/profile/edit',
      action_text: 'Complete Profile',
      created_at: new Date().toISOString(),
    });
  }
}

// =============================================================================
// Redirect Helpers
// =============================================================================

function redirectWithSuccess(res: Response): void {
  const successUrl = new URL(`${APP_URL}/profile`);
  successUrl.searchParams.set('linkedin', 'success');
  res.redirect(302, successUrl.toString());
}

function redirectWithError(res: Response, errorCode: string): void {
  const errorUrl = new URL(`${APP_URL}/profile`);
  errorUrl.searchParams.set('linkedin', 'error');
  errorUrl.searchParams.set('error_code', errorCode);
  res.redirect(302, errorUrl.toString());
}

export default router;
