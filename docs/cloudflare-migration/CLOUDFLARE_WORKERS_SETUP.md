# Cloudflare Workers Setup Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [Wrangler CLI Installation](#wrangler-cli-installation)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Local Development](#local-development)
- [Express to Hono Migration](#express-to-hono-migration)
- [Environment Variables & Secrets](#environment-variables--secrets)
- [Testing Strategy](#testing-strategy)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

**Required:**
- Node.js 18+ (recommended: 22.12.0 to match current setup)
- npm 10.0.0+
- Git
- Cloudflare account (free tier is sufficient for development)

**Recommended:**
- VS Code with TypeScript extension
- Postman or Thunder Client for API testing
- pnpm or npm for package management

---

## Wrangler CLI Installation

### Step 1: Install Wrangler Globally

```bash
npm install -g wrangler
# or
pnpm add -g wrangler
```

### Step 2: Verify Installation

```bash
wrangler --version
# Should output: wrangler 3.x.x
```

### Step 3: Authenticate with Cloudflare

```bash
wrangler login
```

This will:
1. Open your browser to Cloudflare login page
2. Ask for permission to access your account
3. Store authentication token locally in `~/.wrangler/config/default.toml`

### Step 4: Verify Authentication

```bash
wrangler whoami
```

Should display your Cloudflare account email and account ID.

---

## Project Structure

### Recommended Directory Layout

```
jobmatchAI/
├── backend/                    # Existing Express backend (keep for reference)
│   └── src/
├── workers/                    # NEW: Cloudflare Workers implementation
│   ├── src/
│   │   ├── index.ts           # Main Workers entry point
│   │   ├── routes/            # Route handlers (Hono)
│   │   │   ├── applications.ts
│   │   │   ├── jobs.ts
│   │   │   ├── emails.ts
│   │   │   ├── auth.ts
│   │   │   ├── exports.ts
│   │   │   └── resume.ts
│   │   ├── middleware/        # Middleware (adapted for Hono)
│   │   │   ├── auth.ts
│   │   │   ├── rateLimiter.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── cors.ts
│   │   ├── services/          # Service layer (mostly unchanged)
│   │   │   ├── openai.service.ts
│   │   │   ├── jobScraper.service.ts
│   │   │   └── sendgrid.service.ts
│   │   ├── config/            # Configuration
│   │   │   ├── supabase.ts
│   │   │   └── openai.ts
│   │   ├── lib/               # Utilities
│   │   │   └── sanitize.ts
│   │   └── types/             # TypeScript types
│   │       └── index.ts
│   ├── cron/                  # NEW: Scheduled jobs Worker
│   │   └── index.ts           # Cron triggers handler
│   ├── wrangler.toml          # Workers configuration
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts       # Testing configuration
└── docs/
    └── cloudflare-migration/
```

### Create Workers Directory

```bash
cd /home/carl-f-frank/projects/jobmatchAI
mkdir -p workers/src/{routes,middleware,services,config,lib,types}
mkdir -p workers/cron
cd workers
```

---

## Configuration

### Step 1: Initialize Wrangler Project

```bash
cd workers
wrangler init
```

This creates:
- `wrangler.toml` - Workers configuration file
- Basic project structure

### Step 2: Install Dependencies

```bash
npm init -y
npm install hono @cloudflare/workers-types
npm install --save-dev typescript @types/node vitest wrangler
```

**Key Dependencies:**
- `hono` - Web framework (Express replacement)
- `@cloudflare/workers-types` - TypeScript types for Workers runtime
- `typescript` - TypeScript compiler
- `vitest` - Testing framework (Vite-based, faster than Jest)

### Step 3: Configure wrangler.toml

Create/update `workers/wrangler.toml`:

```toml
name = "jobmatch-ai-backend"
main = "src/index.ts"
compatibility_date = "2024-12-27"
node_compat = true  # Enable Node.js compatibility layer

# Workers Paid plan (required for longer CPU time)
# Free plan has 10ms CPU time limit per request
# Paid plan has 30s CPU time limit (essential for AI generation)
workers_dev = true

# Account details (get from Cloudflare dashboard)
account_id = "YOUR_ACCOUNT_ID"  # Replace with your account ID

# Routes (production)
routes = [
  { pattern = "api.jobmatch-ai.com/*", zone_name = "jobmatch-ai.com" }
]

# Environment variables (non-sensitive)
[vars]
NODE_ENV = "production"
APP_URL = "https://jobmatch-ai.com"

# Development environment
[env.development]
name = "jobmatch-ai-backend-dev"
vars = { NODE_ENV = "development", APP_URL = "http://localhost:5173" }

# Staging environment
[env.staging]
name = "jobmatch-ai-backend-staging"
vars = { NODE_ENV = "staging", APP_URL = "https://staging.jobmatch-ai.com" }

# KV Namespaces (for rate limiting, caching)
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "YOUR_KV_NAMESPACE_ID"  # Create via: wrangler kv:namespace create RATE_LIMIT_KV

[[kv_namespaces]]
binding = "CACHE_KV"
id = "YOUR_CACHE_KV_NAMESPACE_ID"

[env.development.kv_namespaces]
binding = "RATE_LIMIT_KV"
id = "YOUR_DEV_KV_NAMESPACE_ID"

# Secrets (set via: wrangler secret put SECRET_NAME)
# DO NOT put actual secrets here - use wrangler secret put
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - OPENAI_API_KEY
# - APIFY_API_TOKEN
# - SENDGRID_API_KEY
# - LINKEDIN_CLIENT_ID
# - LINKEDIN_CLIENT_SECRET
# - LINKEDIN_REDIRECT_URI

# Build configuration
[build]
command = "npm run build"

[build.upload]
format = "service-worker"
```

### Step 4: Get Your Account ID

```bash
wrangler whoami
```

Copy the `Account ID` and update `wrangler.toml`.

### Step 5: Create KV Namespaces

KV (Key-Value) storage for rate limiting and caching:

```bash
# Production KV namespaces
wrangler kv:namespace create RATE_LIMIT_KV
wrangler kv:namespace create CACHE_KV

# Development KV namespaces
wrangler kv:namespace create RATE_LIMIT_KV --preview
wrangler kv:namespace create CACHE_KV --preview
```

Copy the namespace IDs and update `wrangler.toml`.

### Step 6: Configure TypeScript

Create `workers/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["@cloudflare/workers-types", "node"],
    "jsx": "react",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### Step 7: Update package.json Scripts

Create `workers/package.json` with:

```json
{
  "name": "jobmatch-ai-workers",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "dev:remote": "wrangler dev --remote",
    "build": "tsc",
    "deploy": "wrangler deploy",
    "deploy:dev": "wrangler deploy --env development",
    "deploy:staging": "wrangler deploy --env staging",
    "deploy:production": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "tail": "wrangler tail",
    "tail:dev": "wrangler tail --env development"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "@supabase/supabase-js": "^2.47.10",
    "openai": "^4.77.3",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241127.0",
    "@types/node": "^22.10.5",
    "typescript": "^5.9.3",
    "vitest": "^4.0.16",
    "wrangler": "^3.86.0"
  }
}
```

---

## Local Development

### Step 1: Create Basic Workers Entry Point

Create `workers/src/index.ts`:

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Define environment bindings
export interface Env {
  // Environment variables
  NODE_ENV: string;
  APP_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
  APIFY_API_TOKEN: string;
  SENDGRID_API_KEY: string;

  // KV namespaces
  RATE_LIMIT_KV: KVNamespace;
  CACHE_KV: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => {
    // Same CORS logic as Express
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://jobmatch-ai-dev.pages.dev',
      'https://jobmatch-ai.com',
    ];
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400,
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: c.env.NODE_ENV,
  });
});

// API routes
app.get('/api', (c) => {
  return c.json({
    name: 'JobMatch AI API',
    version: '1.0.0',
    message: 'Running on Cloudflare Workers',
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({
    code: 'NOT_FOUND',
    message: 'Route not found',
    statusCode: 404,
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    code: 'INTERNAL_ERROR',
    message: err.message || 'Internal server error',
    statusCode: 500,
  }, 500);
});

export default app;
```

### Step 2: Start Development Server

```bash
npm run dev
```

This starts the Workers development server on `http://localhost:8787`.

**Test the health endpoint:**
```bash
curl http://localhost:8787/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-27T...",
  "version": "1.0.0",
  "environment": "development"
}
```

### Step 3: Set Local Secrets for Development

Create `.dev.vars` file in `workers/` directory (gitignored):

```bash
# workers/.dev.vars
SUPABASE_URL=https://wpupbucinufbaiphwogc.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
APIFY_API_TOKEN=your-apify-token
SENDGRID_API_KEY=your-sendgrid-key
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_REDIRECT_URI=http://localhost:8787/api/auth/linkedin/callback
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**IMPORTANT:** Add `.dev.vars` to `.gitignore`:
```bash
echo ".dev.vars" >> .gitignore
```

### Step 4: Test with Remote Resources

For testing with real Cloudflare infrastructure:

```bash
npm run dev:remote
```

This runs your Worker on Cloudflare's edge but accessible locally.

---

## Express to Hono Migration

### Key Differences Cheat Sheet

| Express | Hono | Notes |
|---------|------|-------|
| `req, res` | `c` (Context) | Context object contains both request and response |
| `req.body` | `await c.req.json()` | Must await JSON parsing |
| `req.params.id` | `c.req.param('id')` | Use param() method |
| `req.query.page` | `c.req.query('page')` | Use query() method |
| `req.headers.authorization` | `c.req.header('Authorization')` | Use header() method |
| `req.userId` (custom) | `c.get('userId')` | Use context variables |
| `res.json(data)` | `c.json(data)` | Similar syntax |
| `res.status(404).json()` | `c.json(data, 404)` | Status as second arg |
| `res.setHeader()` | `c.header()` | Set response headers |
| `next()` | `await next()` | Middleware continuation |

### Example: Authentication Middleware Migration

**Before (Express):**
```typescript
// backend/src/middleware/auth.ts
export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'No authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Authentication failed' });
      return;
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
}
```

**After (Hono):**
```typescript
// workers/src/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import { createClient } from '@supabase/supabase-js';
import type { Env } from '../index';

export const authenticateUser = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.split(' ')[1];

    // Create Supabase client with environment variables
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_ANON_KEY
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: 'Authentication failed' }, 401);
    }

    // Store user in context
    c.set('user', user);
    c.set('userId', user.id);

    await next();
  } catch (error) {
    return c.json({ error: 'Internal error' }, 500);
  }
});
```

### Example: Route Handler Migration

**Before (Express):**
```typescript
// backend/src/routes/jobs.ts
router.get('/', authenticateUser, async (req: Request, res: Response) => {
  const userId = req.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const { data: jobs, error } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
    return;
  }

  res.json({ jobs, page, limit });
});
```

**After (Hono):**
```typescript
// workers/src/routes/jobs.ts
import { Hono } from 'hono';
import { authenticateUser } from '../middleware/auth';
import { createClient } from '@supabase/supabase-js';
import type { Env } from '../index';

const jobs = new Hono<{ Bindings: Env }>();

jobs.get('/', authenticateUser, async (c) => {
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  // Create Supabase admin client
  const supabase = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    return c.json({ error: 'Failed to fetch jobs' }, 500);
  }

  return c.json({ jobs, page, limit });
});

export default jobs;
```

### Example: Mounting Routes in Main App

**After (Hono):**
```typescript
// workers/src/index.ts
import { Hono } from 'hono';
import jobs from './routes/jobs';
import applications from './routes/applications';
import emails from './routes/emails';
import auth from './routes/auth';

const app = new Hono<{ Bindings: Env }>();

// Mount routes
app.route('/api/jobs', jobs);
app.route('/api/applications', applications);
app.route('/api/emails', emails);
app.route('/api/auth', auth);

export default app;
```

---

## Environment Variables & Secrets

### Development Secrets (.dev.vars)

For local development, use `.dev.vars` file (already covered above).

### Production Secrets

Set secrets using Wrangler CLI:

```bash
# Set production secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put APIFY_API_TOKEN
wrangler secret put SENDGRID_API_KEY
wrangler secret put LINKEDIN_CLIENT_ID
wrangler secret put LINKEDIN_CLIENT_SECRET
wrangler secret put LINKEDIN_REDIRECT_URI

# Set staging secrets
wrangler secret put SUPABASE_URL --env staging
wrangler secret put SUPABASE_ANON_KEY --env staging
# ... repeat for all secrets

# Set development secrets
wrangler secret put SUPABASE_URL --env development
wrangler secret put SUPABASE_ANON_KEY --env development
# ... repeat for all secrets
```

When prompted, paste the secret value.

### List Secrets

```bash
# List production secrets
wrangler secret list

# List staging secrets
wrangler secret list --env staging
```

### Delete Secrets

```bash
wrangler secret delete SECRET_NAME
wrangler secret delete SECRET_NAME --env staging
```

### Access Secrets in Code

```typescript
// All secrets are available via c.env
const supabaseUrl = c.env.SUPABASE_URL;
const openaiKey = c.env.OPENAI_API_KEY;
```

---

## Testing Strategy

### Step 1: Configure Vitest

Create `workers/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'miniflare', // Workers environment simulator
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
});
```

### Step 2: Install Testing Dependencies

```bash
npm install --save-dev vitest @vitest/ui @cloudflare/vitest-pool-workers
```

### Step 3: Create Test File

Create `workers/src/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import app from './index';

describe('Health Endpoint', () => {
  it('should return healthy status', async () => {
    const req = new Request('http://localhost/health');
    const res = await app.fetch(req, {
      NODE_ENV: 'test',
      APP_URL: 'http://localhost',
    } as any);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const req = new Request('http://localhost/unknown');
    const res = await app.fetch(req, {
      NODE_ENV: 'test',
    } as any);

    expect(res.status).toBe(404);
  });
});
```

### Step 4: Run Tests

```bash
npm run test
npm run test:watch
npm run test:coverage
```

### Step 5: Integration Tests

Create `workers/src/routes/jobs.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../index';

describe('Jobs API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Get auth token from Supabase for testing
    // Or use a test token
    authToken = 'test-jwt-token';
  });

  it('should require authentication', async () => {
    const req = new Request('http://localhost/api/jobs');
    const res = await app.fetch(req, getMockEnv());

    expect(res.status).toBe(401);
  });

  it('should list jobs for authenticated user', async () => {
    const req = new Request('http://localhost/api/jobs', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    const res = await app.fetch(req, getMockEnv());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('jobs');
  });
});

function getMockEnv() {
  return {
    NODE_ENV: 'test',
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    // ... other env vars
  } as any;
}
```

---

## Deployment

### Development Deployment

```bash
npm run deploy:dev
```

This deploys to `jobmatch-ai-backend-dev.workers.dev`.

### Staging Deployment

```bash
npm run deploy:staging
```

### Production Deployment

```bash
npm run deploy:production
```

### View Deployment Logs

```bash
# Tail production logs
npm run tail

# Tail development logs
npm run tail:dev

# Tail with filters
wrangler tail --status error
wrangler tail --method POST
```

### Rollback Deployment

```bash
# List deployments
wrangler deployments list

# Rollback to previous deployment
wrangler rollback
```

---

## Troubleshooting

### Issue: "Error: Missing account_id in wrangler.toml"

**Solution:**
```bash
wrangler whoami
# Copy Account ID and add to wrangler.toml
```

### Issue: "Error: Module not found"

**Solution:**
- Ensure `node_compat = true` in wrangler.toml
- Check import paths (use relative paths)
- Verify package is installed

### Issue: "CPU time limit exceeded"

**Solution:**
- Upgrade to Workers Paid plan ($5/month)
- Optimize long-running operations
- Use Durable Objects for CPU-intensive tasks
- Consider offloading to external service

### Issue: "KV namespace not found"

**Solution:**
```bash
# Create KV namespace
wrangler kv:namespace create RATE_LIMIT_KV
# Copy ID to wrangler.toml
```

### Issue: "Secrets not accessible in development"

**Solution:**
- Use `.dev.vars` file for local development
- Don't use `wrangler secret put` for local dev

### Issue: "CORS errors in development"

**Solution:**
- Ensure `credentials: true` in CORS config
- Verify origin is in allowed list
- Check preflight OPTIONS handling

### Issue: "Database connection errors"

**Solution:**
- Verify Supabase secrets are set correctly
- Check Supabase project is not paused
- Test connection with curl:
```bash
curl -H "apikey: YOUR_ANON_KEY" \
     https://wpupbucinufbaiphwogc.supabase.co/rest/v1/users?limit=1
```

---

## Next Steps

1. **Complete Basic Setup:**
   - Follow all steps above
   - Verify health endpoint works
   - Test Supabase connection

2. **Start Route Migration:**
   - Begin with simplest route (health check)
   - Migrate one route at a time
   - Test thoroughly after each migration

3. **Set Up CI/CD:**
   - Configure GitHub Actions for automated deployment
   - See deployment workflow documentation

4. **Monitor and Optimize:**
   - Set up Cloudflare Workers Analytics
   - Monitor error rates and latency
   - Optimize based on metrics

---

## Additional Resources

- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/commands/)
- [Workers Tutorials](https://developers.cloudflare.com/workers/tutorials/)
- [Node.js Compatibility Matrix](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)

---

**Last Updated:** 2025-12-27
