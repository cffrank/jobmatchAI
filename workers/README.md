# JobMatch AI - Cloudflare Workers Backend

This directory contains the Cloudflare Workers implementation of the JobMatch AI backend, migrated from Express.js/Railway to run on Cloudflare's edge network using the Hono framework.

## Architecture Overview

```
workers/
├── api/
│   ├── index.ts              # Main Hono application & Workers entry point
│   ├── types.ts              # TypeScript types & environment bindings
│   ├── middleware/
│   │   ├── auth.ts           # JWT authentication via Supabase
│   │   ├── rateLimiter.ts    # PostgreSQL-backed rate limiting
│   │   └── errorHandler.ts   # Global error handling
│   ├── routes/
│   │   ├── applications.ts   # AI-powered resume generation
│   │   ├── jobs.ts           # Job listing & management
│   │   ├── emails.ts         # SendGrid email integration
│   │   ├── auth.ts           # LinkedIn OAuth flow
│   │   ├── exports.ts        # PDF/DOCX export (client-side assisted)
│   │   └── resume.ts         # Resume parsing via Vision API
│   └── services/
│       ├── openai.ts         # OpenAI GPT-4o & Vision API
│       └── supabase.ts       # Supabase client factories
├── scheduled/
│   └── index.ts              # Cron-triggered background jobs
├── wrangler.toml             # Cloudflare Workers configuration
├── .dev.vars.example         # Environment variables template
├── package.json              # Workers-specific dependencies
└── README.md                 # This file
```

## Prerequisites

- Node.js >= 18.0.0
- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)
- Supabase project with database and storage configured
- OpenAI API key
- SendGrid API key (optional, for email features)
- LinkedIn Developer App (optional, for LinkedIn OAuth)

## Quick Start

### 1. Install Dependencies

```bash
cd workers
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .dev.vars.example .dev.vars
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (secret)
- `OPENAI_API_KEY` - Your OpenAI API key
- `APP_URL` - Frontend application URL (for CORS)

Optional variables:
- `SENDGRID_API_KEY` - For email sending functionality
- `SENDGRID_FROM_EMAIL` - Default sender email address
- `LINKEDIN_CLIENT_ID` - LinkedIn OAuth client ID
- `LINKEDIN_CLIENT_SECRET` - LinkedIn OAuth client secret
- `LINKEDIN_REDIRECT_URI` - LinkedIn OAuth callback URL
- `APIFY_API_TOKEN` - For job scraping (not yet implemented)

### 3. Start Development Server

```bash
npm run dev
```

This starts a local development server at `http://localhost:8787`.

### 4. Test the API

```bash
# Health check
curl http://localhost:8787/health

# API documentation (development only)
curl http://localhost:8787/api
```

## Deployment

### Configure Secrets

Before deploying, add your secrets to Cloudflare:

```bash
# Required secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put APP_URL

# Optional secrets
wrangler secret put SENDGRID_API_KEY
wrangler secret put SENDGRID_FROM_EMAIL
wrangler secret put LINKEDIN_CLIENT_ID
wrangler secret put LINKEDIN_CLIENT_SECRET
wrangler secret put LINKEDIN_REDIRECT_URI
wrangler secret put APIFY_API_TOKEN
```

### Deploy to Production

```bash
# Deploy to production
npm run deploy

# Or deploy to specific environment
npm run deploy:staging
npm run deploy:production
```

### Environment-Specific Deployments

```bash
# Development
wrangler deploy --env development

# Staging
wrangler deploy --env staging

# Production
wrangler deploy --env production
```

## API Endpoints

### Health & Documentation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api` | GET | API documentation (dev only) |

### Applications

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/applications/generate` | POST | Required | Generate AI resume variants |
| `/api/applications` | GET | Required | List user applications |
| `/api/applications/:id` | GET | Required | Get single application |
| `/api/applications/:id` | PATCH | Required | Update application |
| `/api/applications/:id` | DELETE | Required | Delete application |

### Jobs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/jobs` | GET | Required | List jobs with filters |
| `/api/jobs/:id` | GET | Required | Get single job |
| `/api/jobs/:id` | PATCH | Required | Update job (save/archive) |
| `/api/jobs/:id` | DELETE | Required | Delete job |
| `/api/jobs/scrape` | POST | Required | Scrape jobs (coming soon) |

### Emails

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/emails/send` | POST | Required | Send application email |
| `/api/emails/history` | GET | Required | Get email history |
| `/api/emails/remaining` | GET | Required | Get remaining quota |

### Authentication

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/linkedin/initiate` | GET | Required | Start LinkedIn OAuth |
| `/api/auth/linkedin/callback` | GET | None | OAuth callback handler |

### Exports

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/exports/pdf` | POST | Required | Export as PDF (client-side) |
| `/api/exports/docx` | POST | Required | Export as DOCX (client-side) |
| `/api/exports/text` | POST | Required | Export as plain text |

### Resume

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/resume/parse` | POST | Required | Parse resume with Vision API |
| `/api/resume/supported-formats` | GET | None | List supported formats |

## Rate Limits

| Scope | Limit | Window |
|-------|-------|--------|
| Global (IP-based) | 100 requests | 1 minute |
| Email sending | 10 emails | 1 hour |
| AI generation | 20 generations | 1 hour |
| Job scraping | 10 scrapes | 1 hour |
| Exports | 30 exports | 1 hour |

## Scheduled Jobs (Cron Triggers)

| Schedule | Job | Description |
|----------|-----|-------------|
| `*/15 * * * *` | Account Unlock | Auto-unlock expired account lockouts |
| `0 * * * *` | Hourly Cleanup | Rate limits, OAuth states, failed logins |
| `0 2 * * *` | Job Search | Automated job search (coming soon) |
| `0 3 * * *` | Archive Jobs | Archive jobs older than 90 days |

## Known Limitations

### PDF Parsing
PDF parsing is not available in Cloudflare Workers due to Node.js-specific dependencies in pdf-parse. Users should upload resume images (PNG, JPG, JPEG, GIF, WebP) for best results.

### PDF/DOCX Generation
Full PDF and DOCX generation (using pdfkit/docx libraries) is not available in Workers. The API returns structured data that can be used for client-side document generation using libraries like jsPDF or docx.js.

### Job Scraping
Apify integration for job scraping is not yet implemented for Workers. This endpoint returns a placeholder response.

### Rate Limiting
IP-based rate limiting uses an in-memory Map that resets on Worker deployment. For production, consider migrating to KV Namespace or Durable Objects (configured but commented out in wrangler.toml).

## Migration from Express.js

Key differences from the Express.js implementation:

| Feature | Express.js | Cloudflare Workers |
|---------|------------|-------------------|
| Framework | Express | Hono |
| Runtime | Node.js | V8 Isolates |
| Context | `req`, `res`, `next` | `c` (Hono Context) |
| Env vars | `process.env` | `c.env` |
| Request state | `req.userId` | `c.get('userId')` |
| Response | `res.json()` | `c.json()` |
| PDF parsing | pdf-parse | Not available |
| PDF generation | pdfkit | Client-side |
| Cron jobs | node-cron | Cron Triggers |
| File system | fs module | Not available |

## Troubleshooting

### Common Issues

**1. CORS Errors**
Ensure `APP_URL` is correctly set to your frontend URL. In development, localhost URLs are automatically whitelisted.

**2. Authentication Failures**
Verify your Supabase keys are correct and the user token is being passed in the `Authorization: Bearer <token>` header.

**3. Rate Limit Exceeded**
Wait for the window to reset or check the `Retry-After` header for timing.

**4. OpenAI API Errors**
Verify your API key has GPT-4 and Vision API access. Check your usage limits.

**5. Build Failures**
Ensure you have `nodejs_compat` flag in wrangler.toml for Node.js API compatibility.

### Debug Logging

In development, the Hono logger middleware logs all requests. For production debugging, use:

```bash
wrangler tail
```

## Development

### Running Tests

```bash
npm test
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

## Security Considerations

1. **Never commit `.dev.vars`** - Contains sensitive secrets
2. **Use service role key sparingly** - Only for admin operations
3. **JWT verification** - All authenticated endpoints verify Supabase JWT
4. **Rate limiting** - Prevents abuse of AI and email endpoints
5. **CORS** - Restricts origins to configured APP_URL
6. **Input validation** - Zod schemas validate all request bodies

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and type checking
4. Submit a pull request

## License

MIT
