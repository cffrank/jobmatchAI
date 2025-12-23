/**
 * SEC-005: Input Sanitization for Stored XSS Prevention
 *
 * This module provides sanitization functions to prevent stored XSS attacks
 * by cleaning user input before storing in the database.
 *
 * Features:
 * - HTML sanitization with configurable tag/attribute allowlists
 * - Plain text sanitization (strips all HTML)
 * - URL sanitization
 * - Email sanitization
 * - Special handling for rich text fields
 */

import sanitizeHtml from 'sanitize-html';
import type { Request, Response, NextFunction } from 'express';

// =============================================================================
// Sanitization Configurations
// =============================================================================

/**
 * Strict sanitization - allows no HTML tags
 * Use for: names, job titles, skills, locations
 */
const STRICT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [], // No HTML tags allowed
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
  textFilter: (text) => text.trim(),
};

/**
 * Basic formatting - allows minimal safe HTML tags
 * Use for: professional summaries, work descriptions, cover letters
 */
const BASIC_FORMAT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'b', 'i', 'em', 'strong', 'u', 's',
    'p', 'br', 'span',
    'ul', 'ol', 'li',
    'h3', 'h4', 'h5', 'h6', // No h1/h2 (reserved for app structure)
  ],
  allowedAttributes: {
    // No attributes allowed (prevents onclick, style, etc.)
  },
  allowedSchemes: [], // No links allowed
  disallowedTagsMode: 'discard',
  textFilter: (text) => text.trim(),
  // Enforce closing tags
  enforceHtmlBoundary: true,
};

/**
 * Rich text - allows links and more formatting
 * Use for: resumes, detailed descriptions (if needed in future)
 */
const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'b', 'i', 'em', 'strong', 'u', 's',
    'p', 'br', 'span',
    'ul', 'ol', 'li',
    'h3', 'h4', 'h5', 'h6',
    'a', // Links allowed
    'blockquote',
  ],
  allowedAttributes: {
    'a': ['href', 'title'], // Only href and title for links
  },
  allowedSchemes: ['https', 'mailto'], // Only HTTPS and mailto links
  allowedSchemesByTag: {
    'a': ['https', 'mailto'],
  },
  // Prevent javascript: and data: URLs
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  textFilter: (text) => text.trim(),
  enforceHtmlBoundary: true,
  // Transform relative URLs to absolute (if needed)
  transformTags: {
    'a': (tagName, attribs) => {
      // Ensure links open in new tab and have noopener
      return {
        tagName: tagName,
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      };
    },
  },
};

// =============================================================================
// Sanitization Functions
// =============================================================================

/**
 * Sanitize plain text (no HTML allowed)
 * Use for most user input fields
 *
 * @param input - Raw user input
 * @returns Sanitized string with all HTML stripped
 *
 * @example
 * sanitizePlainText('<script>alert("XSS")</script>Hello') // Returns: 'Hello'
 * sanitizePlainText('John <b>Doe</b>') // Returns: 'John Doe'
 */
export function sanitizePlainText(input: string | null | undefined): string {
  if (!input) return '';

  // Strip all HTML tags and trim
  const sanitized = sanitizeHtml(input, STRICT_OPTIONS);

  // Additional cleanup: remove extra whitespace
  return sanitized.replace(/\s+/g, ' ').trim();
}

/**
 * Sanitize text with basic formatting (limited HTML tags)
 * Use for descriptions, summaries, work experience
 *
 * @param input - Raw user input
 * @returns Sanitized HTML with only safe tags
 *
 * @example
 * sanitizeBasicFormat('<script>alert()</script><p>Hello <b>world</b></p>')
 * // Returns: '<p>Hello <b>world</b></p>'
 */
export function sanitizeBasicFormat(input: string | null | undefined): string {
  if (!input) return '';

  const sanitized = sanitizeHtml(input, BASIC_FORMAT_OPTIONS);

  // Remove extra newlines and whitespace
  return sanitized.trim();
}

/**
 * Sanitize rich text (allows links and more formatting)
 * Use for resume content, detailed descriptions
 *
 * @param input - Raw user input
 * @returns Sanitized HTML with links and formatting
 *
 * @example
 * sanitizeRichText('<a href="https://example.com">Link</a>')
 * // Returns: '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>'
 */
export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return '';

  const sanitized = sanitizeHtml(input, RICH_TEXT_OPTIONS);

  return sanitized.trim();
}

/**
 * Sanitize email address
 * Ensures email is valid format and not an injection attempt
 *
 * @param email - Raw email input
 * @returns Sanitized email or empty string if invalid
 *
 * @example
 * sanitizeEmail('user@example.com') // Returns: 'user@example.com'
 * sanitizeEmail('<script>@example.com') // Returns: ''
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';

  // Strip HTML first
  const stripped = sanitizePlainText(email);

  // Validate email format (basic check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(stripped)) {
    return '';
  }

  return stripped.toLowerCase().trim();
}

/**
 * Sanitize URL
 * Ensures URL is safe (HTTPS only) and not a javascript: or data: URL
 *
 * @param url - Raw URL input
 * @returns Sanitized URL or empty string if invalid
 *
 * @example
 * sanitizeURL('https://example.com') // Returns: 'https://example.com'
 * sanitizeURL('javascript:alert(1)') // Returns: ''
 */
export function sanitizeURL(url: string | null | undefined): string {
  if (!url) return '';

  // Strip HTML first
  const stripped = sanitizePlainText(url);

  // Allow only https:// and mailto: URLs
  try {
    const parsed = new URL(stripped);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'mailto:') {
      return '';
    }
    return parsed.toString();
  } catch {
    // Invalid URL
    return '';
  }
}

/**
 * Sanitize phone number
 * Removes non-numeric characters except + - ( ) and spaces
 *
 * @param phone - Raw phone input
 * @returns Sanitized phone number
 *
 * @example
 * sanitizePhone('+1 (555) 123-4567') // Returns: '+1 (555) 123-4567'
 * sanitizePhone('<script>555</script>') // Returns: '555'
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';

  // Strip HTML first
  const stripped = sanitizePlainText(phone);

  // Allow only numbers, +, -, (, ), and spaces
  const cleaned = stripped.replace(/[^0-9+\-() ]/g, '');

  return cleaned.trim();
}

/**
 * Sanitize array of strings (plain text)
 * Use for tags, skills lists, locations
 *
 * @param items - Array of raw strings
 * @returns Array of sanitized strings
 *
 * @example
 * sanitizeArray(['React', '<script>alert()</script>', 'TypeScript'])
 * // Returns: ['React', '', 'TypeScript']
 */
export function sanitizeArray(items: string[] | null | undefined): string[] {
  if (!items || !Array.isArray(items)) return [];

  return items
    .map(item => sanitizePlainText(item))
    .filter(item => item.length > 0); // Remove empty strings
}

/**
 * Sanitize JSON object (recursively sanitize all string values)
 * Use for complex user-submitted data structures
 *
 * @param obj - Object to sanitize
 * @returns Object with all string values sanitized
 *
 * @example
 * sanitizeObject({ name: '<script>alert()</script>John', age: 30 })
 * // Returns: { name: 'John', age: 30 }
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  sanitizeFn: (input: string) => string = sanitizePlainText
): T | Record<string, never> {
  if (!obj || typeof obj !== 'object') return {};

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeFn(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeFn(item) : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, sanitizeFn);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

// =============================================================================
// Field-Specific Sanitizers (for common use cases)
// =============================================================================

/**
 * Sanitize user profile data
 */
export interface UserProfileInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  professional_summary?: string;
  profile_image_url?: string;
}

export function sanitizeUserProfile(input: UserProfileInput): UserProfileInput {
  return {
    first_name: input.first_name ? sanitizePlainText(input.first_name) : undefined,
    last_name: input.last_name ? sanitizePlainText(input.last_name) : undefined,
    email: input.email ? sanitizeEmail(input.email) : undefined,
    phone: input.phone ? sanitizePhone(input.phone) : undefined,
    location: input.location ? sanitizePlainText(input.location) : undefined,
    linkedin_url: input.linkedin_url ? sanitizeURL(input.linkedin_url) : undefined,
    professional_summary: input.professional_summary
      ? sanitizeBasicFormat(input.professional_summary)
      : undefined,
    profile_image_url: input.profile_image_url
      ? sanitizeURL(input.profile_image_url)
      : undefined,
  };
}

/**
 * Sanitize work experience data
 */
export interface WorkExperienceInput {
  job_title?: string;
  company?: string;
  location?: string;
  description?: string;
}

export function sanitizeWorkExperience(input: WorkExperienceInput): WorkExperienceInput {
  return {
    job_title: input.job_title ? sanitizePlainText(input.job_title) : undefined,
    company: input.company ? sanitizePlainText(input.company) : undefined,
    location: input.location ? sanitizePlainText(input.location) : undefined,
    description: input.description ? sanitizeBasicFormat(input.description) : undefined,
  };
}

/**
 * Sanitize resume/cover letter content
 */
export interface ApplicationContentInput {
  resume_text?: string;
  cover_letter_text?: string;
}

export function sanitizeApplicationContent(
  input: ApplicationContentInput
): ApplicationContentInput {
  return {
    resume_text: input.resume_text ? sanitizeBasicFormat(input.resume_text) : undefined,
    cover_letter_text: input.cover_letter_text
      ? sanitizeBasicFormat(input.cover_letter_text)
      : undefined,
  };
}

// =============================================================================
// Express Middleware (optional)
// =============================================================================

/**
 * Express middleware to sanitize request body
 * Apply to routes that accept user input
 *
 * @example
 * router.post('/profile', sanitizeBody, async (req, res) => {
 *   // req.body is now sanitized
 * });
 */
export function sanitizeBodyMiddleware(
  req: Request<unknown, unknown, Record<string, unknown>>,
  _res: Response,
  next: NextFunction
): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

// =============================================================================
// Export all sanitization functions
// =============================================================================

export default {
  sanitizePlainText,
  sanitizeBasicFormat,
  sanitizeRichText,
  sanitizeEmail,
  sanitizeURL,
  sanitizePhone,
  sanitizeArray,
  sanitizeObject,
  sanitizeUserProfile,
  sanitizeWorkExperience,
  sanitizeApplicationContent,
  sanitizeBodyMiddleware,
};
