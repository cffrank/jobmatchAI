/**
 * JobMatch AI - Cloudflare Workers Backend
 *
 * Main Hono application that provides REST API endpoints for:
 * - Application generation (AI-powered resume/cover letter)
 * - Job listing and management
 * - Email sending via SendGrid
 * - LinkedIn OAuth integration
 * - PDF/DOCX export generation (client-side assisted)
 * - Resume parsing using AI Vision
 * - Scheduled background jobs
 *
 * All endpoints are secured with Supabase JWT authentication
 * and PostgreSQL-backed rate limiting.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

import type { Env, Variables } from './types';
import { errorHandler } from './middleware/errorHandler';
import { ipRateLimiter, cleanupIpRateLimits } from './middleware/rateLimiter';

// Route imports
import applicationsRouter from './routes/applications';
import jobsRouter from './routes/jobs';
import emailsRouter from './routes/emails';
import authRouter from './routes/auth';
import exportsRouter from './routes/exports';
import resumeRouter from './routes/resume';
import profileRouter from './routes/profile';
import analyticsRouter from './routes/analytics';
import filesRouter from './routes/files';

// Scheduled jobs
import { handleScheduledJobs } from '../scheduled';

// =============================================================================
// App Setup
// =============================================================================

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// =============================================================================
// Global Middleware
// =============================================================================

// Request logging
app.use('*', logger());

// Secure headers (like Helmet for Express)
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https://api.openai.com', 'https://api.sendgrid.com'],
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: 'cross-origin',
}));

// CORS configuration
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  const appUrl = c.env.APP_URL || 'http://localhost:5173';
  const isDev = c.env.ENVIRONMENT === 'development';

  // Build allowed origins
  const allowedOrigins: string[] = [appUrl];

  if (isDev) {
    // Allow common development ports
    allowedOrigins.push(
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    );
  }

  // Check if origin is allowed
  const isAllowed = !origin || allowedOrigins.includes(origin);

  if (!isAllowed) {
    console.warn(`CORS blocked origin: ${origin}`);
  }

  return cors({
    origin: isAllowed ? origin || '*' : '',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
    maxAge: 86400,
  })(c, next);
});

// Global error handler
app.onError(errorHandler);

// =============================================================================
// Health Check (before rate limiting)
// =============================================================================

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: c.env.ENVIRONMENT || 'production',
    runtime: 'Cloudflare Workers',
  });
});

// =============================================================================
// Global IP Rate Limiting
// =============================================================================

// Apply IP-based rate limiting to all API routes
app.use('/api/*', ipRateLimiter(100, 60 * 1000)); // 100 requests per minute per IP

// =============================================================================
// API Routes
// =============================================================================

app.route('/api/applications', applicationsRouter);
app.route('/api/emails', emailsRouter);
app.route('/api/auth', authRouter);
app.route('/api/jobs', jobsRouter);
app.route('/api/exports', exportsRouter);
app.route('/api/resume', resumeRouter);
app.route('/api/profile', profileRouter);
app.route('/api/analytics', analyticsRouter);
app.route('/api/files', filesRouter); // Phase 3.3: File download endpoints

// =============================================================================
// API Documentation (development only)
// =============================================================================

app.get('/api', (c) => {
  if (c.env.ENVIRONMENT !== 'development') {
    return c.json({ message: 'API documentation available in development mode' }, 403);
  }

  return c.json({
    name: 'JobMatch AI API',
    version: '1.0.0',
    runtime: 'Cloudflare Workers',
    endpoints: {
      applications: {
        'POST /api/applications/generate': 'Generate application variants for a job',
        'GET /api/applications': 'List user applications',
        'GET /api/applications/:id': 'Get application by ID',
        'PATCH /api/applications/:id': 'Update application',
        'DELETE /api/applications/:id': 'Delete application',
      },
      jobs: {
        'GET /api/jobs': 'List user jobs with filters',
        'GET /api/jobs/:id': 'Get job by ID',
        'POST /api/jobs/scrape': 'Scrape jobs from sources (coming soon)',
        'PATCH /api/jobs/:id': 'Update job (save/archive)',
        'DELETE /api/jobs/:id': 'Delete job',
      },
      emails: {
        'POST /api/emails/send': 'Send application email',
        'GET /api/emails/history': 'Get email history',
        'GET /api/emails/remaining': 'Get remaining emails in rate limit window',
      },
      auth: {
        'GET /api/auth/linkedin/initiate': 'Start LinkedIn OAuth flow',
        'GET /api/auth/linkedin/callback': 'Handle LinkedIn OAuth callback',
      },
      exports: {
        'POST /api/exports/pdf': 'Export application as PDF (client-side)',
        'POST /api/exports/docx': 'Export application as DOCX (client-side)',
        'POST /api/exports/text': 'Export application as plain text',
      },
      resume: {
        'POST /api/resume/parse': 'Parse resume file using AI',
        'GET /api/resume/supported-formats': 'Get supported file formats',
      },
      profile: {
        'PUT /api/profile': 'Update user profile (auto-triggers embedding update)',
        'POST /api/profile/work-experience': 'Add work experience',
        'PUT /api/profile/work-experience/:id': 'Update work experience',
        'DELETE /api/profile/work-experience/:id': 'Delete work experience',
        'POST /api/profile/skills': 'Add skill',
        'PUT /api/profile/skills/:id': 'Update skill',
        'DELETE /api/profile/skills/:id': 'Delete skill',
      },
      analytics: {
        'GET /api/analytics/workers-ai': 'Workers AI usage metrics and monitoring guide',
        'GET /api/analytics/cache': 'Cache efficiency metrics',
        'GET /api/analytics/models': 'Model performance comparison',
        'GET /api/analytics/cost-savings': 'Cost savings estimates',
      },
    },
    authentication: 'Bearer token in Authorization header',
    rateLimit: {
      global: '100 requests/minute per IP',
      emails: '10 emails/hour per user',
      applications: '20 generations/hour per user',
      scraping: '10 scrapes/hour per user',
    },
    notes: [
      'PDF/DOCX export returns data for client-side generation',
      'Resume parsing works best with image files (PNG, JPEG)',
      'Job scraping feature is coming soon',
    ],
  });
});

// =============================================================================
// 404 Handler
// =============================================================================

app.notFound((c) => {
  return c.json(
    {
      code: 'NOT_FOUND',
      message: `Route ${c.req.method} ${c.req.path} not found`,
      statusCode: 404,
    },
    404
  );
});

// =============================================================================
// Cloudflare Workers Entry Point
// =============================================================================

export default {
  /**
   * Handle HTTP requests
   */
  fetch: app.fetch,

  /**
   * Handle scheduled events (Cron Triggers)
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Clean up in-memory rate limits
    cleanupIpRateLimits();

    // Run scheduled jobs
    ctx.waitUntil(handleScheduledJobs(event, env));
  },
};
