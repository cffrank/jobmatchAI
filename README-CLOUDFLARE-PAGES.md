# JobMatch AI - Cloudflare Pages Deployment Guide

This guide covers deploying the JobMatch AI frontend to Cloudflare Pages.

## Prerequisites

- Cloudflare account
- Git repository connected to Cloudflare Pages
- Backend API deployed (Cloudflare Workers or other)
- Supabase project configured

## Build Configuration

| Setting | Value |
|---------|-------|
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (project root) |
| **Node.js version** | `22` |

## Environment Variables

Set these in Cloudflare Dashboard > Pages > Your Project > Settings > Environment Variables.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://wpupbucinufbaiphwogc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable key | `sb_publishable_h6erYLL-...` |
| `VITE_BACKEND_URL` | Backend API URL | `https://jobmatch-api.workers.dev` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_LINKEDIN_CLIENT_ID` | LinkedIn OAuth client ID | - |
| `VITE_LINKEDIN_REDIRECT_URI` | LinkedIn OAuth redirect | - |
| `VITE_APP_NAME` | Application name | `JobMatch AI` |
| `VITE_ENV` | Environment identifier | `production` |
| `NODE_VERSION` | Node.js version for build | `22` |

## Deployment Methods

### Method 1: Git Integration (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) > Pages
2. Click "Create a project" > "Connect to Git"
3. Select your repository and branch (`cloudflare-migration` or `main`)
4. Configure build settings:
   - **Framework preset**: None
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Add environment variables (see above)
6. Click "Save and Deploy"

### Method 2: Direct Upload

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build the project
npm run build

# Deploy to Pages
wrangler pages deploy dist --project-name=jobmatch-ai
```

### Method 3: Wrangler CLI with Git

```bash
# Install dependencies and build
npm ci
npm run build

# Deploy
wrangler pages deploy dist --project-name=jobmatch-ai --branch=production
```

## Project Structure

```
jobmatch-ai/
├── dist/                    # Build output (do not commit)
│   ├── index.html
│   ├── _redirects           # SPA routing
│   ├── _headers             # Security headers
│   └── assets/
│       ├── index-*.css
│       ├── index-*.js
│       ├── vendor-react-*.js
│       ├── vendor-ui-*.js
│       ├── vendor-supabase-*.js
│       └── vendor-utils-*.js
├── public/
│   ├── _redirects           # SPA routing rules
│   └── _headers             # Custom HTTP headers
├── src/                     # Source code
├── vite.config.ts           # Vite configuration
├── .env.cloudflare          # Environment template
└── README-CLOUDFLARE-PAGES.md
```

## SPA Routing

The `_redirects` file handles client-side routing:

```
/*    /index.html   200
```

This ensures all routes are handled by the React Router.

## Custom Headers

The `_headers` file configures security and caching:

- **Security headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **CORS for OAuth**: Cross-Origin-Opener-Policy for popup-based auth
- **Asset caching**: 1 year for immutable assets, 24 hours for images

## Bundle Optimization

The build is optimized with code splitting:

| Chunk | Contents | Purpose |
|-------|----------|---------|
| `vendor-react` | React, React DOM, Router | Core framework |
| `vendor-ui` | Radix UI components | UI primitives |
| `vendor-supabase` | Supabase client | Database/auth |
| `vendor-utils` | clsx, tailwind-merge, etc. | Utilities |
| `index` | Application code | Main bundle |

## Preview Deployments

Cloudflare Pages automatically creates preview deployments for:
- Pull requests
- Non-production branches

Preview URLs follow the pattern:
```
https://<commit-hash>.<project-name>.pages.dev
```

For previews, you may need to set different environment variables (e.g., pointing to a staging backend).

## Custom Domains

1. Go to Pages > Your Project > Custom domains
2. Add your domain (e.g., `app.jobmatch.ai`)
3. Follow DNS configuration instructions
4. SSL is automatically provisioned

## Troubleshooting

### Build Fails with Node Version Error

Set the `NODE_VERSION` environment variable:
```
NODE_VERSION=22
```

### 404 on Page Refresh

Ensure `_redirects` file exists in the `dist` folder. This is copied automatically from `public/_redirects` during build.

### CORS Errors

1. Verify `VITE_BACKEND_URL` points to your Workers API
2. Ensure Workers backend has proper CORS headers
3. Check browser console for specific CORS error messages

### OAuth Popup Blocked

The `_headers` file includes `Cross-Origin-Opener-Policy: same-origin-allow-popups` for OAuth compatibility.

### Environment Variables Not Working

- Variables must start with `VITE_` to be exposed to the frontend
- Rebuild after changing environment variables
- Check Cloudflare Pages build logs for variable injection

## CI/CD with GitHub Actions

Create `.github/workflows/cloudflare-pages.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main, cloudflare-migration]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
          VITE_BACKEND_URL: ${{ vars.VITE_BACKEND_URL }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: jobmatch-ai
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token with Pages edit permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

### Required GitHub Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable key |
| `VITE_BACKEND_URL` | Backend API URL |

## Comparison: Railway vs Cloudflare Pages

| Feature | Railway | Cloudflare Pages |
|---------|---------|------------------|
| **Pricing** | Usage-based | Free tier generous |
| **Build Time** | ~2-3 min | ~1-2 min |
| **Edge Locations** | Regional | Global (300+) |
| **Custom Domains** | Included | Included |
| **Preview Deploys** | Yes | Yes |
| **Static Assets** | Served via Node.js | Edge-optimized CDN |
| **Server Required** | Yes (server.js) | No (static hosting) |

## Migration Checklist

- [x] Update `vite.config.ts` with build optimization
- [x] Create `public/_redirects` for SPA routing
- [x] Create `public/_headers` for security headers
- [x] Create `.env.cloudflare` template
- [x] Test build locally with `npm run build`
- [ ] Create Cloudflare Pages project
- [ ] Configure environment variables
- [ ] Deploy and verify
- [ ] Configure custom domain (if applicable)
- [ ] Update LinkedIn OAuth redirect URIs

## Support

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#cloudflare-pages)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
