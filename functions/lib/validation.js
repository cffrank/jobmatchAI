/**
 * Input Validation & Sanitization Module
 *
 * This module provides comprehensive validation using Zod schemas
 * to prevent injection attacks, path traversal, and malformed input.
 *
 * Security Features:
 * - Firestore document ID validation (alphanumeric + - _)
 * - Email validation (proper RFC 5322 format)
 * - URL validation and sanitization
 * - HTML/XSS prevention
 * - SQL/NoSQL injection prevention
 * - Path traversal prevention
 * - String length limits
 */

const { z } = require('zod');
const { HttpsError } = require('firebase-functions/v2/https');

// =============================================================================
// Common Validation Schemas
// =============================================================================

/**
 * Firestore Document ID Validation
 * - Alphanumeric, hyphens, underscores only
 * - 1-128 characters
 * - No path traversal characters
 */
const firestoreIdSchema = z.string()
  .regex(/^[a-zA-Z0-9_-]{1,128}$/, {
    message: 'Invalid ID format. Must be 1-128 alphanumeric characters, hyphens, or underscores'
  })
  .refine(id => !id.includes('..'), {
    message: 'ID cannot contain path traversal sequences'
  });

/**
 * Email Address Validation
 * - Proper email format
 * - Maximum 254 characters (RFC 5321)
 * - No special characters that could be used in injection
 */
const emailSchema = z.string()
  .email({ message: 'Invalid email address format' })
  .max(254, { message: 'Email address too long' })
  .toLowerCase()
  .refine(email => !email.includes('<') && !email.includes('>'), {
    message: 'Email cannot contain angle brackets'
  })
  .refine(email => !email.includes(';') && !email.includes('\\'), {
    message: 'Email contains invalid characters'
  });

/**
 * URL Validation
 * - Must be valid HTTP/HTTPS URL
 * - Maximum 2048 characters
 * - Prevent javascript:, data:, file: protocols
 */
const urlSchema = z.string()
  .url({ message: 'Invalid URL format' })
  .max(2048, { message: 'URL too long' })
  .refine(url => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, {
    message: 'Only HTTP and HTTPS URLs are allowed'
  })
  .refine(url => !url.toLowerCase().includes('javascript:'), {
    message: 'JavaScript URLs are not allowed'
  });

/**
 * Search Query String Validation
 * - Limit length to prevent DoS
 * - Remove dangerous SQL/NoSQL operators
 * - Sanitize special regex characters
 */
const searchQuerySchema = z.string()
  .min(1, { message: 'Search query cannot be empty' })
  .max(500, { message: 'Search query too long' })
  .refine(query => {
    // Block common SQL injection patterns
    const sqlPatterns = [
      /(\bor\b|\band\b).*[=<>]/i,
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /update\s+\w+\s+set/i,
      /;.*--/,
      /\/\*.*\*\//
    ];
    return !sqlPatterns.some(pattern => pattern.test(query));
  }, {
    message: 'Search query contains invalid patterns'
  })
  .refine(query => {
    // Block NoSQL injection patterns
    const noSqlPatterns = [
      /\$where/i,
      /\$ne/i,
      /\$gt/i,
      /\$regex/i,
      /function\s*\(/i
    ];
    return !noSqlPatterns.some(pattern => pattern.test(query));
  }, {
    message: 'Search query contains NoSQL injection patterns'
  })
  .refine(query => {
    // Block XSS patterns
    return !query.includes('<script') && !query.includes('<iframe');
  }, {
    message: 'Search query contains XSS patterns'
  })
  .transform(query => {
    // Remove potentially dangerous characters while preserving normal search terms
    return query
      .replace(/[<>]/g, '') // Remove angle brackets (XSS prevention)
      .replace(/[{}[\]]/g, '') // Remove brackets (injection prevention)
      .replace(/[$]/g, '') // Remove $ (MongoDB operator)
      .trim();
  });

/**
 * OAuth State Token Validation
 * - Base64url encoded format
 * - Reasonable length (not too short or suspiciously long)
 */
const oauthStateSchema = z.string()
  .regex(/^[A-Za-z0-9_-]+$/, {
    message: 'Invalid state token format'
  })
  .min(20, { message: 'State token too short' })
  .max(500, { message: 'State token too long' });

/**
 * OAuth Code Validation
 * - Alphanumeric, hyphens, underscores
 * - Reasonable length
 */
const oauthCodeSchema = z.string()
  .regex(/^[A-Za-z0-9_-]+$/, {
    message: 'Invalid authorization code format'
  })
  .min(10, { message: 'Authorization code too short' })
  .max(500, { message: 'Authorization code too long' });

/**
 * Location String Validation
 * - City, State, Country format
 * - Alphanumeric with spaces, commas, hyphens
 */
const locationSchema = z.string()
  .max(200, { message: 'Location string too long' })
  .regex(/^[a-zA-Z0-9\s,.-]+$/, {
    message: 'Location contains invalid characters'
  })
  .transform(loc => loc.trim());

/**
 * Work Arrangement Validation
 */
const workArrangementSchema = z.enum(['Remote', 'Hybrid', 'On-site', 'Unknown'], {
  errorMap: () => ({ message: 'Invalid work arrangement. Must be Remote, Hybrid, On-site, or Unknown' })
});

/**
 * Salary Range Validation
 */
const salarySchema = z.number()
  .int({ message: 'Salary must be a whole number' })
  .min(0, { message: 'Salary cannot be negative' })
  .max(10000000, { message: 'Salary value unreasonably high' });

/**
 * Text Content Validation (with HTML sanitization)
 * - Limit length
 * - Remove potentially dangerous HTML
 */
const sanitizedTextSchema = z.string()
  .max(50000, { message: 'Text content too long' })
  .transform(text => {
    // HTML escape to prevent XSS
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  });

/**
 * Job Title Validation
 */
const jobTitleSchema = z.string()
  .min(1, { message: 'Job title is required' })
  .max(200, { message: 'Job title too long' })
  .regex(/^[a-zA-Z0-9\s.,-/()&]+$/, {
    message: 'Job title contains invalid characters'
  });

/**
 * Company Name Validation
 */
const companyNameSchema = z.string()
  .min(1, { message: 'Company name is required' })
  .max(200, { message: 'Company name too long' })
  .regex(/^[a-zA-Z0-9\s.,&'()-]+$/, {
    message: 'Company name contains invalid characters'
  });

/**
 * Skill Name Validation
 */
const skillNameSchema = z.string()
  .min(1, { message: 'Skill name is required' })
  .max(100, { message: 'Skill name too long' })
  .regex(/^[a-zA-Z0-9\s.#+-]+$/, {
    message: 'Skill name contains invalid characters'
  });

/**
 * File Format Validation
 */
const fileFormatSchema = z.enum(['pdf', 'docx'], {
  errorMap: () => ({ message: 'File format must be pdf or docx' })
});

// =============================================================================
// Function-Specific Validation Schemas
// =============================================================================

/**
 * generateApplication Validation
 */
const generateApplicationSchema = z.object({
  jobId: firestoreIdSchema
});

/**
 * exportApplication Validation
 */
const exportApplicationSchema = z.object({
  applicationId: firestoreIdSchema,
  format: fileFormatSchema
});

/**
 * sendApplicationEmail Validation
 */
const sendApplicationEmailSchema = z.object({
  applicationId: firestoreIdSchema,
  recipientEmail: emailSchema.optional().default('carl.f.frank@gmail.com')
});

/**
 * linkedInCallback Validation
 */
const linkedInCallbackSchema = z.object({
  code: oauthCodeSchema,
  state: oauthStateSchema,
  error: z.string().optional(),
  error_description: z.string().optional()
});

/**
 * Job Scraping Query Validation
 */
const jobScrapingQuerySchema = z.object({
  keywords: z.array(searchQuerySchema)
    .min(1, { message: 'At least one keyword is required' })
    .max(10, { message: 'Too many keywords' }),
  location: locationSchema.optional(),
  workArrangement: workArrangementSchema.optional(),
  experienceLevel: z.string()
    .max(50, { message: 'Experience level string too long' })
    .optional(),
  salaryMin: salarySchema.optional(),
  salaryMax: salarySchema.optional(),
  maxResults: z.number()
    .int()
    .min(1)
    .max(100, { message: 'Maximum 100 results per query' })
    .default(20)
});

// =============================================================================
// Validation Helper Functions
// =============================================================================

/**
 * Validate input and throw HttpsError if invalid
 *
 * @param {z.ZodSchema} schema - Zod validation schema
 * @param {any} data - Data to validate
 * @param {string} errorPrefix - Error message prefix
 * @returns {any} Validated and sanitized data
 * @throws {HttpsError} If validation fails
 */
function validateInput(schema, data, errorPrefix = 'Validation failed') {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      console.error(`Validation error: ${errors}`, { data });
      throw new HttpsError('invalid-argument', `${errorPrefix}: ${errors}`);
    }
    throw error;
  }
}

/**
 * Sanitize HTML to prevent XSS attacks
 *
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize filename to prevent path traversal
 *
 * @param {string} filename - Filename to sanitize
 * @returns {string} Safe filename
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return 'untitled';

  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid characters
    .replace(/\.\./g, '_') // Remove path traversal
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255); // Limit length
}

/**
 * Validate array of IDs
 *
 * @param {string[]} ids - Array of Firestore document IDs
 * @param {string} fieldName - Field name for error messages
 * @returns {string[]} Validated IDs
 */
function validateIdArray(ids, fieldName = 'IDs') {
  const schema = z.array(firestoreIdSchema).max(100, {
    message: `Too many ${fieldName}`
  });
  return validateInput(schema, ids, `Invalid ${fieldName}`);
}

/**
 * Deep sanitize object (recursive)
 * Removes potential injection payloads from all string values
 *
 * @param {any} obj - Object to sanitize
 * @returns {any} Sanitized object
 */
function deepSanitize(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Remove dangerous patterns
    return obj
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .substring(0, 100000); // Limit string length
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      // Sanitize keys to prevent prototype pollution
      const safeKey = key.replace(/^__|prototype|constructor/i, '_sanitized_');
      sanitized[safeKey] = deepSanitize(obj[key]);
    }
    return sanitized;
  }

  return obj;
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  // Validation schemas
  firestoreIdSchema,
  emailSchema,
  urlSchema,
  searchQuerySchema,
  oauthStateSchema,
  oauthCodeSchema,
  locationSchema,
  workArrangementSchema,
  salarySchema,
  sanitizedTextSchema,
  jobTitleSchema,
  companyNameSchema,
  skillNameSchema,
  fileFormatSchema,

  // Function-specific schemas
  generateApplicationSchema,
  exportApplicationSchema,
  sendApplicationEmailSchema,
  linkedInCallbackSchema,
  jobScrapingQuerySchema,

  // Helper functions
  validateInput,
  validateIdArray,
  sanitizeHtml,
  sanitizeFilename,
  deepSanitize
};
