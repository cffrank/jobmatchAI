# Backend Architecture Review - Task List

**Review Date**: December 21, 2025
**Reviewer**: Backend Architecture Specialist Agent
**Scope**: Express.js, TypeScript, Railway deployment, OpenAI, SendGrid, Apify

---

## Summary

The backend is cleanly organized with proper middleware stacking, authentication, and rate limiting. Total backend LOC: ~5,478 lines across 17 files. However, there are opportunities for improvement in error handling, logging, monitoring, and service architecture.

**Key Findings**:
- ✅ Good: Clear middleware pattern, proper authentication, PostgreSQL-backed rate limiting
- ⚠️  Concerns: No structured logging, limited error recovery, no request validation middleware
- ❌ Issues: No health checks for dependencies, missing request ID tracking, no circuit breakers

---

## Phase 1: Critical Reliability Issues

### BA-001: Implement Request ID Tracking
**Priority**: Critical
**Category**: Observability
**Estimated Effort**: Small

**Description**:
No request ID tracking exists. This makes debugging distributed issues nearly impossible.

**Current State**:
```typescript
// index.ts line 127-131
if (NODE_ENV === 'development') {
  app.use((req: Request, _res: Response, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}
```

**Recommended Solution**:
- Add `uuid` middleware to generate request IDs
- Attach to `req.id` and `X-Request-ID` header
- Include in all logs and error responses

**Files Affected**:
- `/backend/src/index.ts`
- `/backend/src/middleware/requestId.ts` (new)
- All error logging

**Dependencies**: None

---

### BA-002: Add Structured Logging with Winston or Pino
**Priority**: High
**Category**: Observability
**Estimated Effort**: Medium

**Description**:
Current logging uses console.log/error with no structure, levels, or context.

**Current Issues**:
- No log levels (debug, info, warn, error)
- No structured format (JSON)
- No correlation with request IDs
- No log aggregation

**Recommended Solution**:
- Implement Pino (high-performance) or Winston
- Add request ID to all logs
- Include user ID, endpoint, duration
- Send to log aggregation service (Papertrail, Loggly, DataDog)

**Files Affected**:
- Create `/backend/src/lib/logger.ts`
- Update all `console.log` calls across backend
- `/backend/src/middleware/logging.ts` (new)

**Dependencies**: BA-001 (request ID)

---

### BA-003: Implement Health Check for Dependencies
**Priority**: High
**Category**: Reliability
**Estimated Effort**: Medium

**Description**:
Current health check (`/health` endpoint) only verifies server is running, not that dependencies are healthy.

**Current Implementation** (index.ts lines 137-144):
```typescript
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: NODE_ENV,
  });
});
```

**Recommended Solution**:
- Check Supabase connection (simple query)
- Check OpenAI API availability
- Check SendGrid API availability
- Return 503 if any dependency unhealthy
- Add `/health/ready` and `/health/live` endpoints (Kubernetes pattern)

**Files Affected**:
- `/backend/src/routes/health.ts` (new)
- `/backend/src/index.ts`

**Dependencies**: None

---

### BA-004: Add Circuit Breaker for External APIs
**Priority**: High
**Category**: Resilience
**Estimated Effort**: Large

**Description**:
No circuit breaker pattern exists for external API calls (OpenAI, SendGrid, Apify). If these services are down, requests will hang or timeout.

**Recommended Solution**:
- Implement circuit breaker library (opossum)
- Wrap all external API calls
- Configure thresholds: 5 failures in 10s → open circuit for 30s
- Return meaningful errors when circuit is open

**Files Affected**:
- Create `/backend/src/lib/circuitBreaker.ts`
- `/backend/src/services/openai.service.ts`
- `/backend/src/services/sendgrid.service.ts`
- `/backend/src/services/jobScraper.service.ts`

**Dependencies**: None

---

## Phase 2: Error Handling and Validation

### BA-005: Centralize Request Validation Middleware
**Priority**: Medium
**Category**: Code Quality
**Estimated Effort**: Medium

**Description**:
Each route manually validates with Zod. This is repetitive and error-prone.

**Current Pattern** (applications.ts lines 76-85):
```typescript
const parseResult = generateApplicationSchema.safeParse(req.body);
if (!parseResult.success) {
  throw createValidationError(
    'Invalid request body',
    Object.fromEntries(
      parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
    )
  );
}
```

**Recommended Solution**:
- Create validation middleware factory: `validate(schema, source: 'body' | 'query' | 'params')`
- Automatic error formatting
- Type inference for validated data

**Files Affected**:
- Create `/backend/src/middleware/validation.ts`
- Refactor all routes to use validation middleware

**Dependencies**: None

---

### BA-006: Improve Error Context in Production
**Priority**: Medium
**Category**: Security / Debugging
**Estimated Effort**: Small

**Description**:
Error responses may leak sensitive information in production. Need better error sanitization.

**Recommended Solution**:
- Never expose stack traces in production
- Log full error details server-side
- Return generic messages to client
- Include request ID for support

**Files Affected**:
- `/backend/src/middleware/errorHandler.ts`
- All service files

**Dependencies**: BA-001 (request ID), BA-002 (structured logging)

---

### BA-007: Add Input Sanitization for XSS Prevention
**Priority**: High
**Category**: Security
**Estimated Effort**: Small

**Description**:
No input sanitization exists for user-provided text (cover letters, descriptions, etc.) before storing in database.

**Recommended Solution**:
- Install `dompurify` or `validator` library
- Sanitize all text inputs before database writes
- Particularly important for fields displayed in UI

**Files Affected**:
- Create `/backend/src/middleware/sanitize.ts`
- All routes accepting user input

**Dependencies**: None

---

## Phase 3: Performance and Scalability

### BA-008: Implement Response Caching Strategy
**Priority**: Medium
**Category**: Performance
**Estimated Effort**: Medium

**Description**:
No caching layer exists. Repeated requests for the same data hit database/APIs unnecessarily.

**Recommended Caching Strategy**:
- User profile data: Cache for 5 minutes (Redis or in-memory)
- Job search results: Cache for 1 hour
- Application templates: Cache for 24 hours
- Rate limit data: Already in DB, consider Redis for better performance

**Recommended Solution**:
- Implement Redis for distributed caching (Railway addon)
- Add cache-control headers
- Implement cache invalidation strategy

**Files Affected**:
- Create `/backend/src/lib/cache.ts`
- All data-fetching services

**Dependencies**: None (can use in-memory cache initially)

---

### BA-009: Add Database Query Performance Monitoring
**Priority**: Medium
**Category**: Performance
**Estimated Effort**: Small

**Description**:
No query performance monitoring. Slow queries could go undetected.

**Recommended Solution**:
- Log all queries > 100ms
- Add query timing to structured logs
- Consider Supabase slow query log integration
- Add database connection pool monitoring

**Files Affected**:
- `/backend/src/config/supabase.ts`
- Structured logging implementation

**Dependencies**: BA-002 (structured logging)

---

### BA-010: Optimize OpenAI API Usage
**Priority**: Medium
**Category**: Cost / Performance
**Estimated Effort**: Medium

**Description**:
Current implementation generates 3 variants in parallel. This is expensive and slow.

**Current Implementation** (openai.service.ts lines 59-62):
```typescript
const variantPromises = GENERATION_STRATEGIES.map((strategy) =>
  generateVariant(job, profile, workExperience, education, skills, strategy)
);
const results = await Promise.allSettled(variantPromises);
```

**Issues**:
- 3 OpenAI API calls per application generation
- No caching for similar jobs
- No batching

**Recommended Solution**:
- Generate all variants in single API call with better prompting
- Cache similar job/profile combinations
- Add option for user to generate only selected variants

**Files Affected**:
- `/backend/src/services/openai.service.ts`
- `/backend/src/config/openai.ts`

**Dependencies**: BA-008 (caching)

---

## Phase 4: API Design and Documentation

### BA-011: Add OpenAPI/Swagger Documentation
**Priority**: Medium
**Category**: Developer Experience
**Estimated Effort**: Large

**Description**:
Current API documentation is in comments only (index.ts lines 166-206). No interactive docs.

**Recommended Solution**:
- Add `swagger-jsdoc` and `swagger-ui-express`
- Generate OpenAPI 3.0 spec from JSDoc comments
- Host at `/api/docs`
- Auto-generate from Zod schemas

**Files Affected**:
- Create `/backend/src/lib/swagger.ts`
- Update `/backend/src/index.ts`
- Add JSDoc to all routes

**Dependencies**: None

---

### BA-012: Implement API Versioning
**Priority**: Low
**Category**: Architecture
**Estimated Effort**: Medium

**Description**:
No API versioning exists. Breaking changes will break clients.

**Current State**:
All routes at `/api/*` with no version prefix.

**Recommended Solution**:
- Add `/api/v1/` prefix to all routes
- Create `/api/v2/` for future changes
- Support both versions during transition period

**Files Affected**:
- `/backend/src/index.ts`
- All route files
- Frontend API client

**Dependencies**: None

---

### BA-013: Add Request/Response Compression
**Priority**: Low
**Category**: Performance
**Estimated Effort**: Small

**Description**:
No response compression. Large JSON responses (job lists, applications) waste bandwidth.

**Recommended Solution**:
- Add `compression` middleware
- Configure for responses > 1KB
- Support gzip and brotli

**Files Affected**:
- `/backend/src/index.ts`

**Dependencies**: None

---

## Phase 5: Testing and Quality

### BA-014: Add Integration Tests for API Endpoints
**Priority**: High
**Category**: Testing
**Estimated Effort**: Large

**Description**:
No backend tests exist. Critical flows should be tested.

**Recommended Solution**:
- Set up Jest or Vitest for backend
- Test each route with supertest
- Mock Supabase, OpenAI, SendGrid
- Achieve >70% coverage

**Files Affected**:
- Create `/backend/src/tests/` directory
- Add `test` script to package.json

**Dependencies**: None

---

### BA-015: Add Load Testing Suite
**Priority**: Medium
**Category**: Performance
**Estimated Effort**: Medium

**Description**:
No load testing. Don't know how system performs under stress.

**Recommended Solution**:
- Create k6 or Artillery load tests
- Test critical paths:
  - Application generation (most expensive)
  - Job scraping
  - Email sending
- Define SLAs (e.g., 95% of requests < 2s)

**Files Affected**:
- Create `/backend/tests/load/` directory

**Dependencies**: None

---

## Phase 6: Security Hardening

### BA-016: Implement Rate Limit Improvements
**Priority**: Medium
**Category**: Security
**Estimated Effort**: Medium

**Description**:
Current rate limiting has gaps:
- IP-based limiting uses in-memory store (doesn't scale)
- No distributed rate limiting for multiple instances
- No rate limit bypass for admin/support

**Current Issue** (rateLimiter.ts lines 293-347):
In-memory Map for IP rate limiting won't work across multiple Railway instances.

**Recommended Solution**:
- Move IP rate limiting to PostgreSQL or Redis
- Add rate limit bypass for specific IPs (support, monitoring)
- Add rate limit analytics/alerting

**Files Affected**:
- `/backend/src/middleware/rateLimiter.ts`

**Dependencies**: None (or BA-008 for Redis)

---

### BA-017: Add CORS Origin Validation Improvements
**Priority**: High
**Category**: Security
**Estimated Effort**: Small

**Description**:
Current CORS config has hardcoded origins and development bypass that could be risky.

**Current Implementation** (index.ts lines 82-87):
```typescript
if (NODE_ENV === 'development') {
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    callback(null, true);
    return;
  }
}
```

**Issues**:
- Development mode allows any localhost origin (potential SSRF)
- Hardcoded production domains

**Recommended Solution**:
- Read allowed origins from environment variable
- Validate origin more strictly in development
- Log blocked CORS attempts

**Files Affected**:
- `/backend/src/index.ts`
- `/backend/.env.example`

**Dependencies**: None

---

### BA-018: Add Security Headers Enhancements
**Priority**: Medium
**Category**: Security
**Estimated Effort**: Small

**Description**:
Helmet is configured but could be stricter.

**Recommended Enhancements**:
- Add Strict-Transport-Security header
- Implement CSP reporting endpoint
- Add X-Content-Type-Options: nosniff
- Review CSP directives for necessary domains only

**Files Affected**:
- `/backend/src/index.ts`

**Dependencies**: None

---

## Phase 7: Operational Excellence

### BA-019: Implement Graceful Shutdown Improvements
**Priority**: Medium
**Category**: Reliability
**Estimated Effort**: Medium

**Description**:
Current shutdown handlers are basic. Need proper connection draining.

**Current Implementation** (index.ts lines 245-264):
```typescript
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});
```

**Issues**:
- No connection draining
- No active request completion
- No database connection cleanup

**Recommended Solution**:
- Close server to new requests
- Wait for active requests to complete (with timeout)
- Close database connections
- Flush logs

**Files Affected**:
- `/backend/src/index.ts`

**Dependencies**: None

---

### BA-020: Add Metrics and Monitoring
**Priority**: High
**Category**: Observability
**Estimated Effort**: Large

**Description**:
No application metrics. Need to track:
- Request duration (p50, p95, p99)
- Error rates by endpoint
- OpenAI API usage and costs
- SendGrid email delivery rates
- Rate limit hits

**Recommended Solution**:
- Add `prom-client` for Prometheus metrics
- Expose `/metrics` endpoint
- Integrate with Grafana or Railway metrics
- Add custom business metrics

**Files Affected**:
- Create `/backend/src/lib/metrics.ts`
- `/backend/src/middleware/metrics.ts`
- All services

**Dependencies**: None

---

## Summary Statistics

**Total Tasks**: 20
**Critical Priority**: 1 task
**High Priority**: 7 tasks
**Medium Priority**: 11 tasks
**Low Priority**: 1 task

**Total Estimated Effort**:
- Large: 5 tasks
- Medium: 12 tasks
- Small: 3 tasks

**Recommended Execution Order**:
1. Phase 1 (Critical Reliability) - BA-001, BA-002, BA-003, BA-004
2. Phase 2 (Error Handling) - BA-005, BA-006, BA-007
3. Phase 6 (Security) - BA-017, BA-018
4. Phase 7 (Monitoring) - BA-020
5. Phase 3 (Performance) - BA-008, BA-009, BA-010
6. Phase 5 (Testing) - BA-014, BA-015
7. Phase 4 (API Design) - BA-011, BA-012, BA-013
8. Phase 6 (Security) - BA-016
9. Phase 7 (Operations) - BA-019

