/**
 * JobMatch AI Backend Server
 *
 * Express.js server (migrated from legacy Firebase Cloud Functions).
 * Provides REST API endpoints for:
 * - Application generation (AI-powered resume/cover letter)
 * - Job scraping from LinkedIn and Indeed
 * - Email sending via SendGrid
 * - LinkedIn OAuth integration
 * - PDF/DOCX export generation
 * - Scheduled background jobs
 *
 * All endpoints are secured with Supabase JWT authentication
 * and PostgreSQL-backed rate limiting.
 */

import 'dotenv/config';
import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Route imports
import applicationsRouter from './routes/applications';
import emailsRouter from './routes/emails';
import authRouter from './routes/auth';
import jobsRouter from './routes/jobs';
import exportsRouter from './routes/exports';
import resumeRouter from './routes/resume';
import spamDetectionRouter from './routes/spamDetection';
import searchPreferencesRouter from './routes/searchPreferences';
import profileRouter from './routes/profile';
import skillsRouter from './routes/skills';
import usageRouter from './routes/usage';
import trackedApplicationsRouter from './routes/trackedApplications';
import billingRouter from './routes/billing';

// Middleware imports
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { ipRateLimiter } from './middleware/rateLimiter';

// Scheduled jobs
import { initializeScheduledJobs } from './jobs/scheduled';

// =============================================================================
// Configuration
// =============================================================================

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// =============================================================================
// Express App Setup
// =============================================================================

const app: Application = express();

// =============================================================================
// Health Check Endpoint (Before Security Middleware)
// =============================================================================

// Health endpoint must be defined BEFORE global CORS middleware
// This ensures it can use permissive CORS for monitoring tools and Railway
const healthCorsOptions = {
  origin: '*',
  credentials: true,
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
  maxAge: 86400,
};

app.options('/health', cors(healthCorsOptions)); // Explicit preflight handler
app.get('/health', cors(healthCorsOptions), (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: NODE_ENV,
  });
});

// =============================================================================
// Security Middleware
// =============================================================================

// Helmet for security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.openai.com', 'https://api.sendgrid.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
// SEC-011: Strict CORS configuration with environment-based origin whitelisting
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    // SEC-011: Strict development mode CORS - only allow specific ports
    // This prevents attackers from running malicious localhost sites on different ports
    if (NODE_ENV === 'development') {
      const ALLOWED_DEV_PORTS = ['5173', '3000', '4173']; // Vite dev, backend dev, Vite preview
      const portMatch = origin.match(/:(\d+)$/);

      const capturedPort = portMatch?.[1];
      if (portMatch && capturedPort && ALLOWED_DEV_PORTS.includes(capturedPort)) {
        const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
        if (isLocalhost) {
          callback(null, true);
          return;
        }
      }

      console.warn(`[SEC-011] CORS blocked development origin: ${origin}`);
      console.warn(`Allowed ports: ${ALLOWED_DEV_PORTS.join(', ')}`);
    }

    // Multi-environment CORS: Use APP_URL and ALLOWED_ORIGINS environment variables
    // This allows each environment (dev, staging, production) to have its own frontend URL
    // ALLOWED_ORIGINS supports comma-separated list for multiple frontends (e.g., Cloudflare Pages, Vercel, local)
    const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(o => o.trim())
      .filter(o => o.length > 0);

    const allAllowedOrigins = [APP_URL, ...ALLOWED_ORIGINS];

    // Check for exact match first
    if (allAllowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Support wildcard patterns for Cloudflare Pages preview deployments
    // Pattern: https://*.jobmatch-ai-dev.pages.dev or https://*.jobmatch-ai.pages.dev
    const wildcardPatterns = allAllowedOrigins.filter(o => o.includes('*'));
    for (const pattern of wildcardPatterns) {
      // Convert wildcard pattern to regex: https://*.example.com -> ^https://[^/]+\.example\.com$
      const regexPattern = pattern
        .replace(/\./g, '\\.') // Escape dots
        .replace(/\*/g, '[^/]+'); // Replace * with non-slash characters
      const regex = new RegExp(`^${regexPattern}$`);

      if (regex.test(origin)) {
        callback(null, true);
        return;
      }
    }

    console.warn(`CORS blocked origin: ${origin}`);
    console.warn(`Allowed origins: ${allAllowedOrigins.join(', ')}`);
    console.warn(`Set APP_URL or ALLOWED_ORIGINS environment variable to allow this origin`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// Global rate limiting for all requests (IP-based)
app.use(ipRateLimiter(100, 60 * 1000)); // 100 requests per minute per IP

// =============================================================================
// Body Parsing
// =============================================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================================================
// Request Logging
// =============================================================================

// Log all requests in both development and production for debugging
app.use((req: Request, _res: Response, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// =============================================================================
// API Routes
// =============================================================================

app.use('/api/applications', applicationsRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/auth', authRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/spam-detection', spamDetectionRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/resume', resumeRouter);
app.use('/api/profile', profileRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/usage', usageRouter);
app.use('/api/tracked-applications', trackedApplicationsRouter);
app.use('/api/billing', billingRouter);

// Search preferences, history, templates, and manual trigger
// All routes are defined in searchPreferencesRouter with their full paths
app.use('/api', searchPreferencesRouter);

// =============================================================================
// API Documentation (development only)
// =============================================================================

if (NODE_ENV === 'development') {
  app.get('/api', (_req: Request, res: Response) => {
    res.json({
      name: 'JobMatch AI API',
      version: '1.0.0',
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
          'POST /api/jobs/scrape': 'Scrape jobs from sources',
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
          'POST /api/exports/pdf': 'Export application as PDF',
          'POST /api/exports/docx': 'Export application as DOCX',
        },
        resume: {
          'GET /api/resume': 'Fetch user resumes',
          'POST /api/resume': 'Create new resume',
          'PATCH /api/resume/:id': 'Update resume',
          'DELETE /api/resume/:id': 'Delete resume',
          'POST /api/resume/parse': 'Parse resume file using AI',
        },
        profile: {
          'GET /api/profile': 'Get current user profile',
          'PATCH /api/profile': 'Update current user profile',
        },
        skills: {
          'GET /api/skills': 'Get current user skills',
          'POST /api/skills': 'Create a new skill',
          'PATCH /api/skills/:id': 'Update a skill',
          'DELETE /api/skills/:id': 'Delete a skill',
        },
        usage: {
          'GET /api/usage/metrics': 'Get current user usage metrics',
        },
        searchPreferences: {
          'GET /api/search-preferences': 'Get user search preferences',
          'POST /api/search-preferences': 'Create/update search preferences',
          'DELETE /api/search-preferences': 'Delete search preferences',
          'POST /api/search-preferences/blacklist': 'Add to blacklist',
          'DELETE /api/search-preferences/blacklist/:type/:value': 'Remove from blacklist',
          'PATCH /api/search-preferences/sources': 'Enable/disable sources',
        },
        searchHistory: {
          'GET /api/search-history': 'Get search history (paginated)',
          'GET /api/search-history/stats': 'Get search statistics',
          'GET /api/search-history/last': 'Get last search details',
        },
        searchTemplates: {
          'GET /api/search-templates': 'List templates',
          'POST /api/search-templates': 'Create template',
          'GET /api/search-templates/:id': 'Get template',
          'PUT /api/search-templates/:id': 'Update template',
          'DELETE /api/search-templates/:id': 'Delete template',
          'POST /api/search-templates/:id/use': 'Use template (trigger search)',
        },
        manualSearch: {
          'POST /api/jobs/trigger-search': 'Manually trigger job search',
        },
      },
      authentication: 'Bearer token in Authorization header',
      rateLimit: {
        global: '100 requests/minute per IP',
        emails: '10 emails/hour per user',
        applications: '20 generations/hour per user',
        scraping: '10 scrapes/hour per user',
        manualSearch: '10 searches/hour per user',
      },
    });
  });
}

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// =============================================================================
// Server Startup
// =============================================================================

function startServer(): void {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log(`JobMatch AI Backend Server`);
    console.log('='.repeat(60));
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`Port: ${PORT}`);
    console.log(`Listening on: 0.0.0.0:${PORT}`);
    if (NODE_ENV === 'development') {
      console.log(`API docs: http://localhost:${PORT}/api`);
    }
    console.log('='.repeat(60));

    // Initialize scheduled jobs
    initializeScheduledJobs();
  });
}

// =============================================================================
// Graceful Shutdown
// =============================================================================

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// =============================================================================
// Start Server
// =============================================================================

startServer();

export default app;
