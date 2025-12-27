# Railway Environment Variables Setup Guide

This directory contains `.env` files for each Railway environment. Simply copy/paste the contents into Railway Dashboard.

## Files

- `backend-development.env` - Backend development environment
- `backend-staging.env` - Backend staging environment
- `backend-production.env` - Backend production environment
- `frontend-development.env` - Frontend development environment
- `frontend-staging.env` - Frontend staging environment
- `frontend-production.env` - Frontend production environment

## Setup Steps

### 1. Get Supabase Service Role Keys

Before pasting, you need to get the service role keys:

**For Development Branch** (`wpupbucinufbaiphwogc`):
1. Go to https://supabase.com/dashboard/project/wpupbucinufbaiphwogc
2. Settings → API → Project API keys
3. Copy the `service_role` secret key
4. Replace `GET_FROM_SUPABASE_DASHBOARD` in `backend-development.env`

**For Staging Branch** (`awupxbzzabtzqowjcnsa`):
1. Go to https://supabase.com/dashboard/project/awupxbzzabtzqowjcnsa
2. Settings → API → Project API keys
3. Copy the `service_role` secret key
4. Replace `GET_FROM_SUPABASE_DASHBOARD` in `backend-staging.env`

### 2. Copy Variables to Railway

**Backend Environments:**

1. **Development**:
   - Railway Dashboard → backend1 → Development → Variables
   - Click "Raw Editor" button
   - Paste contents of `backend-development.env`
   - Save

2. **Staging**:
   - Railway Dashboard → backend1 → Staging → Variables
   - Click "Raw Editor" button
   - Paste contents of `backend-staging.env`
   - Save

3. **Production**:
   - Railway Dashboard → backend1 → Production → Variables
   - Click "Raw Editor" button
   - Paste contents of `backend-production.env`
   - Save

**Frontend Environments:**

1. **Development**:
   - Railway Dashboard → Frontend → Development → Variables
   - Click "Raw Editor" button
   - Paste contents of `frontend-development.env`
   - Save

2. **Staging**:
   - Railway Dashboard → Frontend → Staging → Variables
   - Click "Raw Editor" button
   - Paste contents of `frontend-staging.env`
   - Save

3. **Production**:
   - Railway Dashboard → Frontend → Production → Variables
   - Click "Raw Editor" button
   - Paste contents of `frontend-production.env`
   - Save

### 3. Verify Deployments

After saving variables, Railway will automatically redeploy. Wait for deployments to complete and test:

**Development**:
- Backend: https://backend1-development.up.railway.app/health
- Frontend: Should stay on development URL after login

**Staging**:
- Backend: https://backend1-staging.up.railway.app/health
- Frontend: Should stay on staging URL after login

**Production**:
- Backend: https://backend1-production.up.railway.app/health
- Frontend: Should work as before

## What This Fixes

✅ **No more redirect to production** - Each environment uses its own Supabase branch
✅ **Isolated data** - Development/staging data won't affect production
✅ **Safe testing** - Test changes on dev/staging before production

## Important Notes

- ⚠️ **DO NOT COMMIT** the `railway-env/` directory - it contains secrets
- ✅ This directory is already in `.gitignore`
- ✅ Service role keys are sensitive - treat them like passwords
