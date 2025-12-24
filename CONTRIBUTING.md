# Contributing to JobMatch AI

Welcome! This document provides guidelines for contributing to JobMatch AI.

## Table of Contents

- [Development Workflow](#development-workflow)
- [Branch Strategy](#branch-strategy)
- [Getting Started](#getting-started)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Environment Setup](#environment-setup)

---

## Development Workflow

JobMatch AI uses a **three-environment deployment pipeline**:

```
develop → development environment (integration testing)
   ↓
staging → staging environment (QA testing)
   ↓
main → production environment (live users)
```

### Environment Purpose

- **Development:** Test integrated features from multiple branches
- **Staging:** Pre-production QA and testing with production-like configuration
- **Production:** Live application serving real users

---

## Branch Strategy

### Protected Branches

1. **main** - Production code only
   - Requires PR with 1 approval
   - All tests must pass
   - Auto-deploys to production

2. **staging** - Pre-production code
   - Requires PR with 1 approval
   - All tests must pass
   - Auto-deploys to staging environment

3. **develop** - Integration testing
   - Requires PR (approvals optional for solo dev)
   - Tests must pass
   - Auto-deploys to development environment

### Branch Naming Convention

```bash
feature/description      # New features
bugfix/description       # Bug fixes
hotfix/description       # Urgent production fixes
refactor/description     # Code refactoring
docs/description         # Documentation updates
test/description         # Test additions or fixes
```

Examples:
- `feature/job-matching-ai`
- `bugfix/login-validation`
- `hotfix/cors-headers`
- `refactor/auth-middleware`

---

## Getting Started

### 1. Fork and Clone

```bash
# Clone the repository
git clone https://github.com/cffrank/jobmatchAI.git
cd jobmatchAI
```

### 2. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

### 3. Set Up Environment Variables

```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local with your local development credentials
# See docs/ENVIRONMENT-SETUP.md for details
```

### 4. Start Development Servers

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3000

---

## Making Changes

### 1. Create Feature Branch from Develop

```bash
# Ensure develop is up to date
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run backend tests
cd backend
npm run test
npm run lint

# Run frontend tests
cd ..
npm run lint
npm run build:check

# Run E2E tests (optional for large changes)
npm run test:e2e
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add job matching feature"
```

**Commit Message Format:**

```
type: brief description

Optional longer description

Fixes #123
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

---

## Pull Request Process

### 1. Push Your Branch

```bash
git push origin feature/your-feature-name
```

### 2. Create Pull Request to Develop

```bash
# Using GitHub CLI
gh pr create --base develop --title "feat: your feature description"

# Or use GitHub web interface
# Go to repository → Pull Requests → New Pull Request
# Base: develop
# Compare: feature/your-feature-name
```

### 3. PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests for new functionality
- [ ] Tested in development environment (after merge to develop)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated (if needed)
- [ ] No new warnings or errors
```

### 4. Review Process

- GitHub Actions will automatically run tests
- PR preview environment will be created (for backend changes)
- Reviewer will provide feedback
- Address feedback with new commits
- Once approved and tests pass, PR can be merged

### 5. Merge to Develop

- Click "Merge pull request" on GitHub
- Delete feature branch after merge
- Develop branch automatically deploys to development environment
- Test your feature in the development environment

---

## Promotion Flow

### Develop → Staging

After testing in development environment:

```bash
# Create PR from develop to staging
gh pr create --base staging --head develop --title "Release: promote features to staging"
```

- Reviewer approves
- Merge to staging
- Auto-deploys to staging environment
- QA team tests in staging

### Staging → Production

After QA approval in staging:

```bash
# Create PR from staging to main
gh pr create --base main --head staging --title "Release: deploy to production"
```

- Requires approval
- All tests must pass
- Merge to main
- Auto-deploys to production
- Monitor production for issues

---

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types (avoid `any`)
- Use interfaces for object shapes
- Export types from dedicated files

### Code Style

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  name: string;
}

async function getUser(id: string): Promise<User> {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return user;
}

// ❌ Bad
function getUser(id: any) {
  return db.query('SELECT * FROM users WHERE id = $1', [id]);
}
```

### React Components

```typescript
// ✅ Good: Props interface, typed component
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// ❌ Bad: No types
export function Button(props) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### Backend API Routes

```typescript
// ✅ Good: Proper error handling, validation
router.post('/api/jobs', authMiddleware, async (req, res) => {
  try {
    const { title, company } = req.body;

    if (!title || !company) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const job = await createJob({ title, company, userId: req.user.id });
    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## Testing Requirements

### Backend Tests

```bash
cd backend

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

**Required:**
- New features must include unit tests
- API endpoints must have integration tests
- Aim for >80% code coverage

### Frontend Tests

```bash
# Type checking
npm run build:check

# Linting
npm run lint
```

**Required:**
- All TypeScript must compile without errors
- No ESLint errors (warnings acceptable)

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e
```

**Required for:**
- Major features affecting user flows
- Authentication/authorization changes
- Critical business logic

---

## Environment Setup

### Local Development

See `docs/ENVIRONMENT-SETUP.md` for detailed setup instructions.

**Required services:**
- Supabase (or local Supabase instance)
- OpenAI API key (for AI features)
- SendGrid API key (for emails)

### Environment Variables

```bash
# Backend (.env in backend/)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
OPENAI_API_KEY=your-openai-key
SENDGRID_API_KEY=your-sendgrid-key

# Frontend (.env.local)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3000
```

---

## Deployment

### Automatic Deployment

All deployments are automatic via GitHub Actions:

- Push to **develop** → Deploys to development environment
- Push to **staging** → Deploys to staging environment
- Push to **main** → Deploys to production environment

### Manual Deployment

Only use in emergencies:

```bash
# Via GitHub Actions UI
# Go to Actions → Deploy Backend to Railway → Run workflow
# Select environment: development/staging/production
```

---

## Getting Help

### Documentation

- `docs/` - Full documentation directory
- `README.md` - Project overview
- `docs/DEPLOYMENT-WORKFLOW-EXPLAINED.md` - Deployment details
- `docs/RAILWAY-MULTI-ENVIRONMENT-SETUP.md` - Railway setup
- `docs/BRANCH-PROTECTION-SETUP.md` - Branch protection details

### Issues

- Check existing issues: https://github.com/cffrank/jobmatchAI/issues
- Create new issue with:
  - Clear description
  - Steps to reproduce (for bugs)
  - Expected vs actual behavior
  - Screenshots (if applicable)

### Questions

- Open a GitHub Discussion
- Tag issues with `question` label
- Reach out to maintainers

---

## Code of Conduct

### Be Respectful

- Respect different viewpoints
- Provide constructive feedback
- Help others learn and grow

### Be Professional

- Keep discussions professional
- Focus on code quality
- Document your decisions

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

## Quick Reference

### Common Commands

```bash
# Start development
npm run dev                  # Frontend
cd backend && npm run dev    # Backend

# Run tests
npm run lint                 # Frontend lint
cd backend && npm run test   # Backend tests

# Create PR
gh pr create --base develop --title "feat: description"

# Check deployment
git push origin develop      # Deploy to development
git push origin staging      # Deploy to staging
git push origin main         # Deploy to production
```

### Workflow Summary

```
1. Create feature branch from develop
2. Make changes and commit
3. Push and create PR to develop
4. After approval, merge to develop (auto-deploys to development)
5. Test in development environment
6. Create PR: develop → staging (auto-deploys to staging)
7. QA tests in staging
8. Create PR: staging → main (auto-deploys to production)
```

---

**Thank you for contributing to JobMatch AI!**
