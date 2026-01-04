/**
 * Example: Fully Secured Cloud Function
 *
 * This file demonstrates how to implement all security features:
 * - Rate limiting
 * - Security logging
 * - Input validation
 * - Authentication checks
 * - Error handling
 *
 * Use this as a reference when updating other functions.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { withRateLimit } = require('./lib/rateLimiter');
const { securityLogger } = require('./lib/securityLogger');
const { validateInput, generateApplicationSchema } = require('./lib/validation');

/**
 * Generate Application - SECURED EXAMPLE
 *
 * Demonstrates all security features in one function
 */
exports.generateApplicationSecure = onCall(
  {
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: ['OPENAI_API_KEY']
  },
  // Wrap with rate limiting middleware
  withRateLimit('generateApplication', async (request) => {
    const startTime = Date.now();
    const userId = request.auth?.uid;
    const requestIp = request.rawRequest?.ip;

    // Log function invocation (before any processing)
    securityLogger.functionCall('generateApplication', {
      userId,
      ip: requestIp,
      params: { jobId: request.data?.jobId }
    });

    // Authentication check
    if (!userId) {
      // Log failed authentication attempt
      securityLogger.auth('Unauthenticated generateApplication attempt', {
        success: false,
        ip: requestIp,
        endpoint: 'generateApplication',
        severity: 'WARNING'
      });

      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Log successful authentication
    securityLogger.auth('Authenticated request', {
      userId,
      success: true,
      method: 'firebase',
      endpoint: 'generateApplication',
      ip: requestIp
    });

    try {
      // Input validation
      const validatedData = validateInput(
        request.data,
        generateApplicationSchema,
        'generateApplication'
      );

      const { jobId } = validatedData;

      // Log data access
      securityLogger.dataAccess('Fetching job and user data', {
        userId,
        collection: 'jobs',
        documentId: jobId,
        operation: 'read'
      });

      // Fetch data from Firestore
      const [jobDoc, userDoc, workExpSnap, eduSnap, skillsSnap] = await Promise.all([
        admin.firestore().collection('jobs').doc(jobId).get(),
        admin.firestore().collection('users').doc(userId).get(),
        admin.firestore().collection('users').doc(userId).collection('workExperience').orderBy('startDate', 'desc').get(),
        admin.firestore().collection('users').doc(userId).collection('education').orderBy('endDate', 'desc').get(),
        admin.firestore().collection('users').doc(userId).collection('skills').orderBy('endorsements', 'desc').get()
      ]);

      // Authorization check (verify user can access this job)
      if (!jobDoc.exists) {
        securityLogger.authz('Job not found', {
          userId,
          resource: 'job',
          resourceId: jobId,
          action: 'read',
          allowed: false,
          reason: 'job does not exist'
        });

        throw new HttpsError('not-found', 'Job not found');
      }

      if (!userDoc.exists) {
        securityLogger.authz('User profile not found', {
          userId,
          resource: 'user',
          action: 'read',
          allowed: false,
          reason: 'user does not exist'
        });

        throw new HttpsError('not-found', 'Profile not found');
      }

      // Log successful authorization
      securityLogger.authz('Access granted to job data', {
        userId,
        resource: 'job',
        resourceId: jobId,
        action: 'read',
        allowed: true
      });

      const job = jobDoc.data();
      const profile = userDoc.data();
      const workExperience = workExpSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const education = eduSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const skills = skillsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Business logic validation
      if (workExperience.length === 0) {
        securityLogger.validation('Missing required work experience', {
          userId,
          field: 'workExperience',
          reason: 'User must have at least one work experience entry'
        });

        throw new HttpsError('failed-precondition', 'Add work experience first');
      }

      // Call AI service (example - replace with actual logic)
      securityLogger.info('Calling AI service for application generation', {
        userId,
        jobId,
        jobTitle: job.title,
        company: job.company
      });

      // Simulate AI generation (replace with actual OpenAI call)
      const variants = [
        {
          id: '1',
          name: 'Variant 1',
          resume: { /* resume data */ },
          coverLetter: 'Sample cover letter',
          aiRationale: ['Reason 1', 'Reason 2']
        }
      ];

      // Save to Firestore
      securityLogger.dataAccess('Creating application document', {
        userId,
        collection: 'applications',
        operation: 'write'
      });

      const appRef = await admin.firestore()
        .collection('users').doc(userId)
        .collection('applications')
        .add({
          jobId,
          jobTitle: job.title,
          company: job.company,
          status: 'draft',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          submittedAt: null,
          variants,
          selectedVariantId: variants[0].id,
          editHistory: []
        });

      securityLogger.dataAccess('Application created successfully', {
        userId,
        collection: 'applications',
        documentId: appRef.id,
        operation: 'write',
        success: true
      });

      const result = {
        id: appRef.id,
        jobId,
        jobTitle: job.title,
        company: job.company,
        status: 'draft',
        variants
      };

      // Log successful function completion
      const duration = Date.now() - startTime;
      securityLogger.functionCall('generateApplication', {
        userId,
        params: { jobId },
        duration,
        success: true,
        result: { applicationId: appRef.id }
      });

      return result;

    } catch (error) {
      // Log function failure
      const duration = Date.now() - startTime;

      if (error instanceof HttpsError) {
        // Known error - log as warning
        securityLogger.functionCall('generateApplication', {
          userId,
          params: { jobId: request.data?.jobId },
          duration,
          success: false,
          error: error.message,
          errorCode: error.code
        });

        throw error;
      }

      // Unexpected error - log as error
      securityLogger.error('Unexpected error in generateApplication', {
        userId,
        params: { jobId: request.data?.jobId },
        duration,
        error: error.message,
        stack: error.stack,
        severity: 'ERROR'
      });

      throw new HttpsError(
        'internal',
        'Failed to generate application',
        { originalError: error.message }
      );
    }
  })
);

/**
 * Example: OAuth Callback with Redirect Validation
 */
const { onRequest } = require('firebase-functions/v2/https');
const { checkRateLimit } = require('./lib/rateLimiter');
const {
  getSafeRedirectUrl,
  buildErrorRedirectUrl,
  buildSuccessRedirectUrl
} = require('./lib/redirectValidator');

exports.linkedInCallbackSecure = onRequest(
  {
    secrets: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
    cors: true,
    timeoutSeconds: 60
  },
  async (req, res) => {
    const requestIp = req.ip;
    const identifier = req.query.state || requestIp || 'anonymous';

    // Manual rate limiting check (can't use wrapper for onRequest)
    try {
      await checkRateLimit(identifier, 'linkedInCallback');
    } catch (error) {
      securityLogger.security('linkedInCallback rate limit exceeded', {
        identifier,
        ip: requestIp,
        severity: 'WARNING'
      });

      const appUrl = process.env.APP_URL || 'https://ai-career-os-139db.web.app';
      const safeUrl = getSafeRedirectUrl(appUrl);
      const errorUrl = buildErrorRedirectUrl(safeUrl, 'rate_limit_exceeded', { ip: requestIp });

      return res.redirect(302, errorUrl);
    }

    let userId = null;

    try {
      const { code, state, error, error_description } = req.query;

      // Log OAuth callback received
      securityLogger.oauth('LinkedIn callback received', {
        hasCode: !!code,
        hasState: !!state,
        hasError: !!error,
        provider: 'linkedin',
        stage: 'callback',
        ip: requestIp
      });

      // Handle OAuth errors from LinkedIn
      if (error) {
        securityLogger.oauth('LinkedIn OAuth error', {
          error,
          description: error_description,
          provider: 'linkedin',
          stage: 'callback',
          success: false,
          severity: 'WARNING',
          ip: requestIp
        });

        const appUrl = process.env.APP_URL || 'https://ai-career-os-139db.web.app';
        const safeUrl = getSafeRedirectUrl(appUrl);
        const errorUrl = buildErrorRedirectUrl(
          safeUrl,
          error === 'user_cancelled_authorize' ? 'user_cancelled' : 'oauth_error',
          { ip: requestIp }
        );

        return res.redirect(302, errorUrl);
      }

      // Validate required parameters
      if (!code || !state) {
        securityLogger.validation('Missing OAuth parameters', {
          hasCode: !!code,
          hasState: !!state,
          provider: 'linkedin',
          severity: 'WARNING',
          ip: requestIp
        });

        const appUrl = process.env.APP_URL || 'https://ai-career-os-139db.web.app';
        const safeUrl = getSafeRedirectUrl(appUrl);
        const errorUrl = buildErrorRedirectUrl(safeUrl, 'missing_parameters', { ip: requestIp });

        return res.redirect(302, errorUrl);
      }

      // Verify state token to prevent CSRF
      const stateDoc = await admin.firestore().collection('_oauth_states').doc(state).get();

      if (!stateDoc.exists) {
        securityLogger.security('Invalid OAuth state token', {
          state: state.substring(0, 20),
          provider: 'linkedin',
          severity: 'WARNING',
          ip: requestIp,
          suspicionReason: 'State token not found - possible CSRF attempt'
        });

        const appUrl = process.env.APP_URL || 'https://ai-career-os-139db.web.app';
        const safeUrl = getSafeRedirectUrl(appUrl);
        const errorUrl = buildErrorRedirectUrl(safeUrl, 'invalid_state', { ip: requestIp });

        return res.redirect(302, errorUrl);
      }

      const stateData = stateDoc.data();
      userId = stateData.userId;

      // Delete used state token (one-time use)
      await stateDoc.ref.delete().catch(err => {
        securityLogger.warn('Failed to delete state token', {
          error: err.message,
          userId,
          severity: 'WARNING'
        });
      });

      // Check if state has expired (10 minute window)
      if (stateData.expiresAt.toDate() < new Date()) {
        securityLogger.security('Expired OAuth state token', {
          userId,
          provider: 'linkedin',
          severity: 'WARNING',
          ip: requestIp,
          ageMinutes: Math.round((Date.now() - stateData.expiresAt.toDate().getTime()) / 60000)
        });

        const appUrl = process.env.APP_URL || 'https://ai-career-os-139db.web.app';
        const safeUrl = getSafeRedirectUrl(appUrl);
        const errorUrl = buildErrorRedirectUrl(safeUrl, 'expired_state', { userId, ip: requestIp });

        return res.redirect(302, errorUrl);
      }

      securityLogger.oauth('OAuth state validated successfully', {
        userId,
        provider: 'linkedin',
        stage: 'state_validation',
        success: true
      });

      // Exchange code for token (example - implement actual exchange)
      securityLogger.oauth('Exchanging code for token', {
        userId,
        provider: 'linkedin',
        stage: 'token_exchange'
      });

      // ... token exchange logic ...

      // On success
      securityLogger.oauth('LinkedIn OAuth completed successfully', {
        userId,
        provider: 'linkedin',
        stage: 'complete',
        success: true,
        ip: requestIp
      });

      securityLogger.auth('User authenticated via LinkedIn', {
        userId,
        success: true,
        method: 'oauth_linkedin',
        ip: requestIp
      });

      // Build validated success redirect
      const appUrl = process.env.APP_URL || 'https://ai-career-os-139db.web.app';
      const safeUrl = getSafeRedirectUrl(appUrl);
      const successUrl = buildSuccessRedirectUrl(safeUrl, {}, { userId, ip: requestIp });

      res.redirect(302, successUrl);

    } catch (error) {
      securityLogger.error('LinkedIn callback error', {
        userId,
        error: error.message,
        stack: error.stack,
        provider: 'linkedin',
        severity: 'ERROR',
        ip: requestIp
      });

      const appUrl = process.env.APP_URL || 'https://ai-career-os-139db.web.app';
      const safeUrl = getSafeRedirectUrl(appUrl);
      const errorUrl = buildErrorRedirectUrl(safeUrl, 'internal_error', { userId, ip: requestIp });

      res.redirect(302, errorUrl);
    }
  }
);
