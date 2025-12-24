# JobMatch AI

AI-powered job search and application tracking platform built with Express, React, Supabase, and Railway.

## Quick Links

- **Production:** [Your Production URL]
- **Staging:** [Your Staging URL]
- **Documentation:** [`docs/`](./docs/)
- **Contributing:** [`CONTRIBUTING.md`](./CONTRIBUTING.md)

---

## Features

- **Job Discovery:** AI-powered job matching based on your profile
- **Application Tracking:** Track applications through the entire hiring process
- **Resume Management:** Create and manage multiple resume versions
- **Automated Search:** LinkedIn integration for automated job discovery
- **Email Templates:** Generate professional application emails
- **Export Options:** Export applications to PDF/DOCX

---

## Tech Stack

### Backend
- **Runtime:** Node.js + Express + TypeScript
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Railway
- **AI:** OpenAI GPT-4
- **Email:** SendGrid
- **Job Scraping:** Apify

### Frontend
- **Framework:** React 19 + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Hosting:** [Vercel/Netlify/Other]

---

## Development Workflow

JobMatch AI uses a **three-environment deployment pipeline** for safe, tested releases:

```
develop → development environment (integration testing)
   ↓
staging → staging environment (QA testing)
   ↓
main → production environment (live users)
```

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/cffrank/jobmatchAI.git
cd jobmatchAI

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Start development servers
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3000

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for detailed contribution guidelines.

### Quick Contribution Flow

```bash
# 1. Create feature branch from develop
git checkout develop
git checkout -b feature/your-feature

# 2. Make changes and test
npm run lint
cd backend && npm run test

# 3. Push and create PR to develop
git push origin feature/your-feature
gh pr create --base develop

# 4. After merge, feature deploys to development environment
# 5. Test in dev → promote to staging → promote to production
```

---

## Deployment

### Automatic Deployments

All deployments are automatic via GitHub Actions:

| Branch | Triggers | Deploys To | Purpose |
|--------|----------|------------|---------|
| `develop` | Push | Development env | Integration testing |
| `staging` | Push | Staging env | Pre-production QA |
| `main` | Push | Production env | Live users |

### Environment URLs

- **Development:** [Backend Dev URL]
- **Staging:** [Backend Staging URL]
- **Production:** [Backend Production URL]

See [`docs/DEPLOYMENT-WORKFLOW-EXPLAINED.md`](./docs/DEPLOYMENT-WORKFLOW-EXPLAINED.md) for details.

---

## Documentation

### Essential Docs

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to contribute
- **[docs/DEPLOYMENT-WORKFLOW-EXPLAINED.md](./docs/DEPLOYMENT-WORKFLOW-EXPLAINED.md)** - Deployment pipeline overview
- **[docs/RAILWAY-MULTI-ENVIRONMENT-SETUP.md](./docs/RAILWAY-MULTI-ENVIRONMENT-SETUP.md)** - Railway environment setup
- **[docs/GITHUB-ACTIONS-MULTI-ENV.md](./docs/GITHUB-ACTIONS-MULTI-ENV.md)** - GitHub Actions workflows
- **[docs/BRANCH-PROTECTION-SETUP.md](./docs/BRANCH-PROTECTION-SETUP.md)** - Branch protection rules

### Feature Documentation

- **[docs/LINKEDIN_IMPORT_GUIDE.md](./docs/LINKEDIN_IMPORT_GUIDE.md)** - LinkedIn integration
- **[docs/USER_SPECIFIC_JOB_MATCHING.md](./docs/USER_SPECIFIC_JOB_MATCHING.md)** - AI job matching
- **[docs/OAUTH_SETUP_GUIDE.md](./docs/OAUTH_SETUP_GUIDE.md)** - OAuth configuration

---

## Testing

```bash
# Backend tests
cd backend
npm run test           # All tests
npm run test:unit      # Unit tests only
npm run test:integration  # Integration tests
npm run test:coverage  # Coverage report

# Frontend tests
npm run lint           # ESLint
npm run build:check    # TypeScript check

# E2E tests
npm run test:e2e       # Playwright E2E tests
```

---

## Environment Variables

### Backend (.env in backend/)

```bash
NODE_ENV=development
PORT=3000
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
APIFY_API_TOKEN=your-apify-token
SENDGRID_API_KEY=your-sendgrid-key
APP_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env.local)

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3000
```

See [`.env.example`](./.env.example) for complete list.

---

## Project Structure

```
jobmatchAI/
├── backend/              # Express backend
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Auth, CORS, error handling
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utilities
│   └── tests/            # Backend tests
├── src/                  # React frontend
│   ├── components/       # Reusable components
│   ├── sections/         # Feature modules
│   ├── lib/              # Utilities
│   └── types/            # TypeScript types
├── docs/                 # Documentation
├── .github/workflows/    # CI/CD workflows
└── supabase/             # Database migrations
```

---

## License

[Your License Here]

---

## Support

- **Issues:** https://github.com/cffrank/jobmatchAI/issues
- **Discussions:** https://github.com/cffrank/jobmatchAI/discussions
- **Documentation:** [`docs/`](./docs/)

---

**Built with ❤️ using Express, React, Supabase, and Railway**
