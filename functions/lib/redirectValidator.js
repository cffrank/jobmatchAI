/**
 * Redirect URL Validation for OAuth Callbacks
 *
 * Prevents open redirect vulnerabilities by validating redirect URLs
 * against a whitelist of allowed domains and patterns.
 *
 * Security Requirements:
 * - Only allow redirects to known, trusted domains
 * - Validate URL format to prevent injection attacks
 * - Log all redirect attempts for monitoring
 * - Fail securely (deny by default)
 *
 * Vulnerability Fixed: H7 - Unvalidated Redirects
 */

const { securityLogger } = require('./securityLogger');

/**
 * Allowed redirect URL patterns
 * These are the only domains/patterns that can be used for OAuth redirects
 */
const ALLOWED_REDIRECT_PATTERNS = [
  // Production Firebase Hosting
  /^https:\/\/ai-career-os-139db\.web\.app(\/.*)?$/,
  /^https:\/\/ai-career-os-139db\.firebaseapp\.com(\/.*)?$/,

  // Custom domain (if you have one - update this)
  /^https:\/\/app\.jobmatch-ai\.com(\/.*)?$/,

  // Development environments
  /^http:\/\/localhost:\d+(\/.*)?$/,
  /^http:\/\/127\.0\.0\.1:\d+(\/.*)?$/,

  // Firebase emulator
  /^http:\/\/localhost:5173(\/.*)?$/,

  // Staging environment (update if you have one)
  /^https:\/\/staging-ai-career-os\.web\.app(\/.*)?$/
];

/**
 * Default safe redirect URL (used when validation fails)
 */
const DEFAULT_SAFE_REDIRECT = 'https://ai-career-os-139db.web.app';

/**
 * Validate a redirect URL against the whitelist
 *
 * @param {string} url - URL to validate
 * @param {Object} context - Additional context for logging
 * @returns {boolean} True if URL is allowed, false otherwise
 */
function isAllowedRedirectUrl(url, context = {}) {
  if (!url || typeof url !== 'string') {
    securityLogger.validation('Invalid redirect URL format', {
      url: String(url),
      reason: 'URL is not a string',
      ...context,
      severity: 'WARNING'
    });
    return false;
  }

  // Trim and normalize
  const normalizedUrl = url.trim();

  // Basic URL format validation
  try {
    const parsedUrl = new URL(normalizedUrl);

    // Ensure protocol is http or https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      securityLogger.validation('Invalid redirect URL protocol', {
        url: normalizedUrl,
        protocol: parsedUrl.protocol,
        reason: 'Only HTTP/HTTPS protocols allowed',
        ...context,
        severity: 'WARNING'
      });
      return false;
    }

    // Check against whitelist patterns
    const isAllowed = ALLOWED_REDIRECT_PATTERNS.some(pattern => pattern.test(normalizedUrl));

    if (!isAllowed) {
      securityLogger.security('Redirect URL not in whitelist', {
        url: normalizedUrl,
        hostname: parsedUrl.hostname,
        reason: 'URL does not match any allowed patterns',
        ...context,
        severity: 'WARNING'
      });
    }

    return isAllowed;
  } catch (error) {
    // URL parsing failed
    securityLogger.validation('Malformed redirect URL', {
      url: normalizedUrl,
      error: error.message,
      reason: 'Failed to parse URL',
      ...context,
      severity: 'WARNING'
    });
    return false;
  }
}

/**
 * Get a safe redirect URL
 * Validates the provided URL and returns it if allowed, otherwise returns default safe URL
 *
 * @param {string} url - URL to validate
 * @param {string} fallback - Fallback URL if validation fails (optional)
 * @param {Object} context - Additional context for logging
 * @returns {string} Validated URL or safe fallback
 */
function getSafeRedirectUrl(url, fallback = DEFAULT_SAFE_REDIRECT, context = {}) {
  if (isAllowedRedirectUrl(url, context)) {
    securityLogger.debug('Redirect URL validated successfully', {
      url,
      ...context
    });
    return url;
  }

  securityLogger.warn('Using fallback redirect URL', {
    requestedUrl: url,
    fallbackUrl: fallback,
    reason: 'Requested URL failed validation',
    ...context,
    severity: 'WARNING'
  });

  return fallback;
}

/**
 * Build OAuth error redirect URL with validated base
 *
 * @param {string} baseUrl - Base URL to redirect to (will be validated)
 * @param {string} errorCode - Error code to include in redirect
 * @param {Object} context - Additional context for logging
 * @returns {string} Safe redirect URL with error parameters
 */
function buildErrorRedirectUrl(baseUrl, errorCode, context = {}) {
  // Validate and get safe base URL
  const safeBaseUrl = getSafeRedirectUrl(baseUrl, DEFAULT_SAFE_REDIRECT, context);

  try {
    const url = new URL(safeBaseUrl);

    // Add error parameters
    url.searchParams.set('linkedin', 'error');
    url.searchParams.set('error', errorCode);

    return url.toString();
  } catch (error) {
    // This shouldn't happen since we validated the URL, but handle it safely
    securityLogger.error('Failed to build error redirect URL', {
      baseUrl: safeBaseUrl,
      errorCode,
      error: error.message,
      ...context,
      severity: 'ERROR'
    });

    return `${DEFAULT_SAFE_REDIRECT}?linkedin=error&error=${encodeURIComponent(errorCode)}`;
  }
}

/**
 * Build OAuth success redirect URL with validated base
 *
 * @param {string} baseUrl - Base URL to redirect to (will be validated)
 * @param {Object} params - Additional parameters to include
 * @param {Object} context - Additional context for logging
 * @returns {string} Safe redirect URL with parameters
 */
function buildSuccessRedirectUrl(baseUrl, params = {}, context = {}) {
  // Validate and get safe base URL
  const safeBaseUrl = getSafeRedirectUrl(baseUrl, DEFAULT_SAFE_REDIRECT, context);

  try {
    const url = new URL(safeBaseUrl);

    // Add parameters
    url.searchParams.set('linkedin', 'success');
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  } catch (error) {
    securityLogger.error('Failed to build success redirect URL', {
      baseUrl: safeBaseUrl,
      params,
      error: error.message,
      ...context,
      severity: 'ERROR'
    });

    return `${DEFAULT_SAFE_REDIRECT}?linkedin=success`;
  }
}

/**
 * Extract and validate redirect URL from environment or request
 *
 * @param {Object} options - Options
 * @param {Object} options.env - Environment variables
 * @param {Object} options.query - Request query parameters
 * @param {string} options.fallback - Fallback URL
 * @param {Object} context - Additional context for logging
 * @returns {string} Validated redirect URL
 */
function getValidatedRedirectUrl({ env = {}, query = {}, fallback = DEFAULT_SAFE_REDIRECT }, context = {}) {
  // Check multiple sources in order of preference
  const candidates = [
    query.redirect_uri,
    query.redirect_url,
    env.APP_URL,
    env.FIREBASE_CONFIG?.appUrl,
    fallback
  ].filter(Boolean);

  // Try each candidate until we find a valid one
  for (const candidate of candidates) {
    if (isAllowedRedirectUrl(candidate, context)) {
      return candidate;
    }
  }

  securityLogger.warn('No valid redirect URL found, using default', {
    candidates: candidates.map(c => typeof c === 'string' ? c : '[object]'),
    defaultUrl: fallback,
    ...context,
    severity: 'WARNING'
  });

  return fallback;
}

/**
 * Middleware to validate redirect_uri parameter in requests
 * Use this in OAuth initiation endpoints
 *
 * @param {Object} request - Cloud Function request
 * @param {string} paramName - Parameter name to validate (default: 'redirect_uri')
 * @returns {Object} Validation result { valid: boolean, url: string }
 */
function validateRedirectParameter(request, paramName = 'redirect_uri') {
  const redirectUrl = request.data?.[paramName] || request.query?.[paramName];

  const context = {
    userId: request.auth?.uid,
    functionName: 'redirectParameterValidation',
    paramName
  };

  if (!redirectUrl) {
    // No redirect URL provided, use default
    return {
      valid: true,
      url: DEFAULT_SAFE_REDIRECT,
      wasValidated: false
    };
  }

  const isValid = isAllowedRedirectUrl(redirectUrl, context);

  return {
    valid: isValid,
    url: isValid ? redirectUrl : DEFAULT_SAFE_REDIRECT,
    wasValidated: true,
    originalUrl: redirectUrl
  };
}

module.exports = {
  isAllowedRedirectUrl,
  getSafeRedirectUrl,
  buildErrorRedirectUrl,
  buildSuccessRedirectUrl,
  getValidatedRedirectUrl,
  validateRedirectParameter,
  ALLOWED_REDIRECT_PATTERNS,
  DEFAULT_SAFE_REDIRECT
};
