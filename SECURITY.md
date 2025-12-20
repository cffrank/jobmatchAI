# Security Implementation Documentation

## Overview

This document outlines the comprehensive security measures implemented in JobMatch AI to protect against common web vulnerabilities and attacks.

## Security Headers

### Content Security Policy (CSP)

**Status**: ENFORCED (Production)

The application implements a strict Content Security Policy to prevent XSS attacks and unauthorized resource loading.

**Rationale**:
- script-src: Nonce-based scripts prevent inline script injection
- style-src: unsafe-inline required for Tailwind CSS dynamic styles
- object-src none: Blocks Flash and other plugins
- frame-ancestors none: Prevents clickjacking

**Known Limitations**:
- Style-src allows unsafe-inline due to Tailwind CSS v4 requirement
- This is mitigated by comprehensive input sanitization

### HTTP Strict Transport Security (HSTS)

Strict-Transport-Security: max-age=63072000; includeSubDomains; preload

- Forces HTTPS for 2 years
- Applies to all subdomains
- Eligible for browser preload list

### Additional Security Headers

- X-Frame-Options: DENY (prevents clickjacking)
- X-Content-Type-Options: nosniff (prevents MIME-sniffing)
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: Disables camera, microphone, geolocation
- X-XSS-Protection: 1; mode=block
- X-Download-Options: noopen

## File Upload Security

### Storage Rules

**Location**: /storage.rules

**Controls**:

1. Authentication: All uploads require authenticated users
2. Ownership: Users can only access their own files
3. File Type Validation: Images and documents only
4. File Size Limits: 2MB for photos, 5MB for documents
5. Path Traversal Prevention: Blocks .. and hidden file paths

### Malware Scanning

**Location**: /functions/src/fileScanning.ts

**Cloud Function**: scanUploadedFile

Automatically triggered on all file uploads to scan for:

1. Magic Number Verification: Validates file signatures match declared types
2. Malicious Signatures: Detects executable files and malware containers
3. Content Pattern Scanning: Searches for suspicious patterns
4. File Hash Tracking: Calculates SHA-256 hashes for audit trail
5. Automatic Quarantine: Moves suspicious files to quarantine directory

**Quarantine Process**:
- Suspicious files moved to /quarantine/ directory
- Security event logged to Firestore
- Manual review required before restoration

**Future Enhancements**:
- Integration with VirusTotal API
- ClamAV integration
- Machine learning-based threat detection

## Rate Limiting

**Location**: /functions/src/rateLimiting.ts

**Cloud Function**: checkRateLimit

### Endpoint-Specific Limits

| Endpoint | Max Requests | Window | Ban Threshold |
|----------|--------------|--------|---------------|
| AI Generation | 10 | 1 minute | 50 total |
| Job Scraping | 20 | 1 minute | 100 total |
| File Upload | 5 | 1 minute | 20 total |
| Authentication | 5 | 5 minutes | 10 total |
| Default | 100 | 1 minute | 500 total |

**Features**:
- Per-user and per-IP tracking
- Automatic ban on threshold violation
- Temporary bans with configurable duration
- Security event logging
- Automatic cleanup of expired records

## API Security

**Location**: /functions/src/secureProxy.ts

### Secure API Proxy Pattern

All external API calls are proxied through Cloud Functions to:

1. Protect API Keys: Never exposed to client-side code
2. Input Validation: Zod schemas validate all inputs
3. Output Sanitization: HTML encoding, URL validation
4. Request Logging: Audit trail for compliance
5. Error Handling: Generic errors prevent information disclosure

### Supported APIs

1. OpenAI Proxy (proxyOpenAI):
   - Input validation: prompt length, model selection
   - Output sanitization: removes sensitive metadata
   - Token usage tracking

2. Job Search Proxy (proxyJobSearch):
   - Query sanitization: removes HTML/script characters
   - URL validation: HTTPS only, whitelisted domains
   - Result sanitization: HTML encoding

## Deployment Checklist

Before deploying to production:

- CSP is in enforce mode (not report-only)
- HSTS preload submitted to browsers
- API keys stored in Firebase Config
- Security rules deployed to Firestore and Storage
- Cloud Functions deployed with proper IAM roles
- Rate limiting enabled on all public endpoints
- File scanning enabled for all uploads
- Security event monitoring configured
- SSL/TLS certificate valid and auto-renewing

## Configuration

### Setting API Keys

firebase functions:config:set openai.key="sk-..."
firebase functions:config:set apify.key="apify_api_..."

### Deploying Security Updates

firebase deploy --only firestore:rules
firebase deploy --only storage:rules
firebase deploy --only functions
firebase deploy --only hosting

## References

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Firebase Security Rules: https://firebase.google.com/docs/rules
- Content Security Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- Security Headers: https://securityheaders.com/

## Contact

For security issues, please email: security@jobmatch-ai.com

Do NOT create public GitHub issues for security vulnerabilities.
