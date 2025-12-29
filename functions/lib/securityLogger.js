/**
 * Security-focused Structured Logging Utility
 *
 * Provides structured logging for security events with proper severity levels
 * and context. All logs are sent to Cloud Logging with appropriate labels
 * for alerting and monitoring.
 *
 * Log Levels:
 * - DEBUG: Detailed debugging information
 * - INFO: General informational messages
 * - WARNING: Warning messages (potential issues)
 * - ERROR: Error messages (actual problems)
 * - CRITICAL: Critical security events requiring immediate attention
 *
 * Security Event Types:
 * - AUTH: Authentication events (login, logout, failures)
 * - AUTHZ: Authorization events (permission checks, access denied)
 * - RATE_LIMIT: Rate limiting events
 * - VALIDATION: Input validation failures
 * - OAUTH: OAuth flow events
 * - FUNCTION: Cloud Function invocations
 * - DATA: Data access and modifications
 */

/**
 * Sanitize data to remove sensitive information from logs
 * Prevents accidental logging of passwords, tokens, API keys, etc.
 *
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
function sanitize(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'access_token',
    'refresh_token',
    'apiKey',
    'api_key',
    'secret',
    'clientSecret',
    'client_secret',
    'authorization',
    'cookie',
    'sessionId',
    'session_id',
    'ssn',
    'creditCard',
    'credit_card',
    'cvv',
    'pin'
  ];

  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();

    // Check if key contains sensitive terms
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitize(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Format log entry with consistent structure
 *
 * @param {string} level - Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
 * @param {string} message - Log message
 * @param {Object} context - Additional context data
 * @returns {Object} Formatted log entry
 */
function formatLogEntry(level, message, context = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitize(context)
  };

  // Add severity for Cloud Logging
  entry.severity = context.severity || level;

  return entry;
}

/**
 * Write log entry to console (Cloud Logging ingests console output)
 *
 * @param {Object} entry - Formatted log entry
 */
function writeLog(entry) {
  // Use appropriate console method based on level
  switch (entry.level) {
    case 'DEBUG':
      console.debug(JSON.stringify(entry));
      break;
    case 'INFO':
      console.info(JSON.stringify(entry));
      break;
    case 'WARNING':
      console.warn(JSON.stringify(entry));
      break;
    case 'ERROR':
    case 'CRITICAL':
      console.error(JSON.stringify(entry));
      break;
    default:
      console.log(JSON.stringify(entry));
  }
}

/**
 * Security Logger Class
 */
class SecurityLogger {
  /**
   * Log debug message
   */
  debug(message, context = {}) {
    const entry = formatLogEntry('DEBUG', message, context);
    writeLog(entry);
  }

  /**
   * Log info message
   */
  info(message, context = {}) {
    const entry = formatLogEntry('INFO', message, context);
    writeLog(entry);
  }

  /**
   * Log warning message
   */
  warn(message, context = {}) {
    const entry = formatLogEntry('WARNING', message, context);
    writeLog(entry);
  }

  /**
   * Log error message
   */
  error(message, context = {}) {
    const entry = formatLogEntry('ERROR', message, context);
    writeLog(entry);
  }

  /**
   * Log critical security event
   */
  critical(message, context = {}) {
    const entry = formatLogEntry('CRITICAL', message, context);
    writeLog(entry);
  }

  /**
   * Log authentication event
   *
   * @param {string} message - Event description
   * @param {Object} context - Event context
   * @param {string} context.userId - User ID (if available)
   * @param {string} context.email - User email (if available)
   * @param {boolean} context.success - Whether authentication succeeded
   * @param {string} context.method - Authentication method (password, oauth, etc.)
   * @param {string} context.ip - IP address
   */
  auth(message, context = {}) {
    const entry = formatLogEntry('INFO', message, {
      ...context,
      eventType: 'AUTH',
      severity: context.success ? 'INFO' : 'WARNING'
    });
    writeLog(entry);
  }

  /**
   * Log authorization event (permission check)
   *
   * @param {string} message - Event description
   * @param {Object} context - Event context
   * @param {string} context.userId - User ID
   * @param {string} context.resource - Resource being accessed
   * @param {string} context.action - Action being performed
   * @param {boolean} context.allowed - Whether access was granted
   * @param {string} context.reason - Reason for decision
   */
  authz(message, context = {}) {
    const entry = formatLogEntry('INFO', message, {
      ...context,
      eventType: 'AUTHZ',
      severity: context.allowed ? 'INFO' : 'WARNING'
    });
    writeLog(entry);
  }

  /**
   * Log security event (general security-related events)
   *
   * @param {string} message - Event description
   * @param {Object} context - Event context
   */
  security(message, context = {}) {
    const entry = formatLogEntry('WARNING', message, {
      ...context,
      eventType: 'SECURITY'
    });
    writeLog(entry);
  }

  /**
   * Log validation failure
   *
   * @param {string} message - Validation error description
   * @param {Object} context - Validation context
   * @param {string} context.userId - User ID (if available)
   * @param {string} context.field - Field that failed validation
   * @param {string} context.value - Value that failed (sanitized)
   * @param {string} context.reason - Validation failure reason
   */
  validation(message, context = {}) {
    const entry = formatLogEntry('WARNING', message, {
      ...context,
      eventType: 'VALIDATION'
    });
    writeLog(entry);
  }

  /**
   * Log OAuth event
   *
   * @param {string} message - OAuth event description
   * @param {Object} context - OAuth context
   * @param {string} context.userId - User ID
   * @param {string} context.provider - OAuth provider (linkedin, google, etc.)
   * @param {string} context.stage - OAuth flow stage (initiate, callback, token_exchange, etc.)
   * @param {boolean} context.success - Whether the stage succeeded
   */
  oauth(message, context = {}) {
    const entry = formatLogEntry('INFO', message, {
      ...context,
      eventType: 'OAUTH',
      severity: context.success ? 'INFO' : 'WARNING'
    });
    writeLog(entry);
  }

  /**
   * Log Cloud Function invocation
   *
   * @param {string} functionName - Function name
   * @param {Object} context - Invocation context
   * @param {string} context.userId - User ID (if authenticated)
   * @param {Object} context.params - Function parameters (sanitized)
   * @param {number} context.duration - Execution duration in ms (if completed)
   * @param {boolean} context.success - Whether function succeeded
   * @param {string} context.error - Error message (if failed)
   */
  functionCall(functionName, context = {}) {
    const entry = formatLogEntry('INFO', `Function invocation: ${functionName}`, {
      ...context,
      functionName,
      eventType: 'FUNCTION',
      severity: context.success === false ? 'ERROR' : 'INFO'
    });
    writeLog(entry);
  }

  /**
   * Log data access event
   *
   * @param {string} message - Data access description
   * @param {Object} context - Access context
   * @param {string} context.userId - User ID
   * @param {string} context.collection - Firestore collection
   * @param {string} context.documentId - Document ID
   * @param {string} context.operation - Operation (read, write, delete)
   * @param {boolean} context.success - Whether operation succeeded
   */
  dataAccess(message, context = {}) {
    const entry = formatLogEntry('INFO', message, {
      ...context,
      eventType: 'DATA',
      severity: context.success === false ? 'ERROR' : 'INFO'
    });
    writeLog(entry);
  }

  /**
   * Log suspicious activity
   *
   * @param {string} message - Description of suspicious activity
   * @param {Object} context - Activity context
   * @param {string} context.userId - User ID (if available)
   * @param {string} context.ip - IP address
   * @param {string} context.userAgent - User agent string
   * @param {string} context.suspicionReason - Why this is flagged as suspicious
   */
  suspicious(message, context = {}) {
    const entry = formatLogEntry('CRITICAL', message, {
      ...context,
      eventType: 'SUSPICIOUS',
      severity: 'CRITICAL'
    });
    writeLog(entry);
  }
}

// Export singleton instance
const securityLogger = new SecurityLogger();

module.exports = {
  securityLogger,
  SecurityLogger,
  sanitize
};
