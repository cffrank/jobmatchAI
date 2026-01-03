/**
 * Authentication Routes for Cloudflare Workers
 *
 * Handles OAuth authentication flows.
 *
 * Endpoints:
 * - GET /api/auth/linkedin/initiate - Start LinkedIn OAuth flow
 * - GET /api/auth/linkedin/callback - Handle LinkedIn OAuth callback
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { HttpError } from '../types';
import { authenticateUser, getUserId } from '../middleware/auth';
import { rateLimiter, ipRateLimiter } from '../middleware/rateLimiter';

// =============================================================================
// Router Setup
// =============================================================================

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// OAuth state expiration (10 minutes)
// KV TTL handles automatic cleanup (Phase 2.3)
const STATE_EXPIRATION_MS = 10 * 60 * 1000;
const STATE_TTL_SECONDS = 600; // 10 minutes in seconds for KV TTL

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
 *
 * OAuth state storage migrated to KV (Phase 2.3):
 * - Key: oauth:{state}
 * - Value: JSON { userId, provider, createdAt }
 * - TTL: 10 minutes (automatic expiry via KV)
 */
app.get('/linkedin/initiate', authenticateUser, rateLimiter({ maxRequests: 5, windowMs: 15 * 60 * 1000 }), async (c) => {
  const userId = getUserId(c);

  if (!c.env.LINKEDIN_CLIENT_ID) {
    throw new HttpError(503, 'LinkedIn integration is not configured', 'LINKEDIN_NOT_CONFIGURED');
  }

  // Generate state token for CSRF protection
  const state = crypto.randomUUID() + '-' + Date.now().toString(36);
  const expiresAt = new Date(Date.now() + STATE_EXPIRATION_MS);

  // Store state in KV with automatic 10-minute expiry
  const stateData = {
    userId,
    provider: 'linkedin',
    createdAt: new Date().toISOString(),
  };

  await c.env.OAUTH_STATES.put(`oauth:${state}`, JSON.stringify(stateData), {
    expirationTtl: STATE_TTL_SECONDS, // 10 minutes
  });

  // Build LinkedIn authorization URL
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', c.env.LINKEDIN_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', c.env.LINKEDIN_REDIRECT_URI || '');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', 'openid profile email');

  console.log(`[OAuth] LinkedIn auth initiated for user ${userId}, state stored in KV`);

  return c.json({
    authUrl: authUrl.toString(),
    state,
    expiresAt: expiresAt.toISOString(),
  });
});

/**
 * GET /api/auth/linkedin/callback
 * Handle LinkedIn OAuth callback
 * Exchanges code for access token and imports profile data
 */
app.get('/linkedin/callback', ipRateLimiter(10, 15 * 60 * 1000), async (c) => {
  // Handle OAuth errors from LinkedIn
  if (c.req.query('error')) {
    console.warn('LinkedIn OAuth error:', c.req.query('error'), c.req.query('error_description'));
    return redirectWithError(c, c.req.query('error') === 'user_cancelled_authorize' ? 'user_cancelled' : 'oauth_error');
  }

  // Validate callback parameters
  const parseResult = callbackSchema.safeParse({
    code: c.req.query('code'),
    state: c.req.query('state'),
    error: c.req.query('error'),
    error_description: c.req.query('error_description'),
  });

  if (!parseResult.success) {
    console.warn('Invalid callback parameters:', parseResult.error);
    return redirectWithError(c, 'invalid_parameters');
  }

  const { code, state } = parseResult.data;

  // Verify state token from KV (Phase 2.3)
  const stateKey = `oauth:${state}`;
  const stateJson = await c.env.OAUTH_STATES.get(stateKey);

  if (!stateJson) {
    console.warn('[OAuth] Invalid or expired state token:', state.substring(0, 20));
    return redirectWithError(c, 'invalid_state');
  }

  const stateData = JSON.parse(stateJson) as { userId: string; provider: string; createdAt: string };

  // Verify provider matches
  if (stateData.provider !== 'linkedin') {
    console.warn('[OAuth] State token provider mismatch');
    return redirectWithError(c, 'invalid_state');
  }

  const userId = stateData.userId;

  // Delete used state token from KV
  await c.env.OAUTH_STATES.delete(stateKey);
  console.log(`[OAuth] State token verified and deleted for user ${userId}`);

  try {
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(c.env, code);
    if (!tokenData?.access_token) {
      console.error('[OAuth] Token exchange failed');
      return redirectWithError(c, 'token_exchange_failed');
    }

    // Fetch LinkedIn profile
    const profileData = await fetchLinkedInProfile(tokenData.access_token);
    if (!profileData) {
      console.error('[OAuth] Profile fetch failed');
      return redirectWithError(c, 'profile_fetch_failed');
    }

    // Import profile to database (migrated to D1)
    await importProfileToDatabase(c.env.DB, userId, profileData);

    console.log(`Successfully imported LinkedIn data for user ${userId}`);

    // Redirect to success page
    return redirectWithSuccess(c);
  } catch (error) {
    console.error('LinkedIn callback error:', error);
    return redirectWithError(c, 'internal_error');
  }
});

// =============================================================================
// LinkedIn API Functions
// =============================================================================

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

async function exchangeCodeForToken(env: Env, code: string): Promise<TokenResponse | null> {
  if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_CLIENT_SECRET || !env.LINKEDIN_REDIRECT_URI) {
    throw new Error('LinkedIn credentials not configured');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: env.LINKEDIN_CLIENT_ID,
    client_secret: env.LINKEDIN_CLIENT_SECRET,
    redirect_uri: env.LINKEDIN_REDIRECT_URI,
  });

  try {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
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
  db: D1Database,
  userId: string,
  linkedInData: LinkedInProfileData
): Promise<void> {
  const { userInfo, limitedAccess } = linkedInData;
  const now = new Date().toISOString();

  // Build update parts
  const updateParts: string[] = [];
  const params: (string | boolean)[] = [];

  updateParts.push('linkedin_imported = ?');
  params.push(true);

  updateParts.push('linkedin_imported_at = ?');
  params.push(now);

  updateParts.push('linkedin_limited_access = ?');
  params.push(limitedAccess);

  if (userInfo.given_name) {
    updateParts.push('first_name = ?');
    params.push(userInfo.given_name);
  }

  if (userInfo.family_name) {
    updateParts.push('last_name = ?');
    params.push(userInfo.family_name);
  }

  if (userInfo.email) {
    updateParts.push('email = ?');
    params.push(userInfo.email);
  }

  if (userInfo.picture) {
    updateParts.push('profile_image_url = ?');
    params.push(userInfo.picture);
  }

  if (userInfo.sub) {
    const profileId = userInfo.sub.includes(':') ? userInfo.sub.split(':').pop() : userInfo.sub;
    updateParts.push('linkedin_url = ?');
    params.push(`https://www.linkedin.com/in/${profileId}`);
  }

  if (userInfo.locale) {
    updateParts.push('locale = ?');
    params.push(userInfo.locale);
  }

  updateParts.push('updated_at = ?');
  params.push(now);

  // Execute update
  params.push(userId); // WHERE clause parameter

  const { meta } = await db.prepare(
    `UPDATE users SET ${updateParts.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  if (meta.changes === 0) {
    console.error('[OAuth] Profile update failed: user not found');
    throw new Error('User profile not found');
  }

  // Note: Notifications table doesn't exist in D1 schema yet
  // Frontend will show LinkedIn import status via query parameters in redirect URL
  if (limitedAccess) {
    console.log(`[OAuth] Limited access import completed for user ${userId}. Frontend will display notification.`);
  }
}

// =============================================================================
// Redirect Helpers
// =============================================================================

function redirectWithSuccess(c: Context<{ Bindings: Env; Variables: Variables }>): Response {
  const successUrl = new URL(`${c.env.APP_URL}/profile`);
  successUrl.searchParams.set('linkedin', 'success');
  return c.redirect(successUrl.toString(), 302);
}

function redirectWithError(c: Context<{ Bindings: Env; Variables: Variables }>, errorCode: string): Response {
  const errorUrl = new URL(`${c.env.APP_URL}/profile`);
  errorUrl.searchParams.set('linkedin', 'error');
  errorUrl.searchParams.set('error_code', errorCode);
  return c.redirect(errorUrl.toString(), 302);
}

export default app;
