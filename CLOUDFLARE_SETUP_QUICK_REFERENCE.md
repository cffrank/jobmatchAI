# Cloudflare Pages Setup - Quick Reference Card

**Copy and paste these exact values when setting up Cloudflare Pages**

---

## Project Configuration

```
Project name: jobmatch-ai-dev
Production branch: develop
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: (leave blank)
```

---

## Environment Variables (Copy-Paste Ready)

### Variable 1: NODE_VERSION
```
NODE_VERSION
```
```
22.12.0
```

### Variable 2: VITE_SUPABASE_URL
```
VITE_SUPABASE_URL
```
```
https://wpupbucinufbaiphwogc.supabase.co
```

### Variable 3: VITE_SUPABASE_ANON_KEY
```
VITE_SUPABASE_ANON_KEY
```
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdXBidWNpbnVmYmFpcGh3b2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjI1NjcsImV4cCI6MjA4MjIzODU2N30.LRfdYAz08eKp5oZoQJ7MbK-VCluud2YlIRw0GumcAp8
```

### Variable 4: VITE_BACKEND_URL
```
VITE_BACKEND_URL
```
```
https://backend1-development.up.railway.app
```

---

## Post-Deployment: Update Railway CORS

After Cloudflare deploys, update Railway backend environment variable:

```
CORS_ORIGIN
```
```
https://jobmatch-ai-dev.pages.dev
```

**Where to set this:**
1. Go to https://railway.app/dashboard
2. Select jobmatch-ai project
3. Switch to **development** environment
4. Click **backend** service
5. Go to **Variables** tab
6. Find `CORS_ORIGIN`
7. Add Cloudflare URL (comma-separated with existing values)

---

## Setup Steps Summary

1. ✅ Cloudflare Dashboard → Workers & Pages
2. ✅ Create application → Pages → Connect to Git
3. ✅ Connect GitHub → Select `cffrank/jobmatchAI`
4. ✅ Configure project settings (see above)
5. ✅ Add 4 environment variables (see above)
6. ✅ Click "Save and Deploy"
7. ✅ Wait 2-5 minutes
8. ✅ Test deployment URL
9. ✅ Update Railway CORS
10. ✅ Verify full functionality

---

## Expected Results

**Deployment URL:**
```
https://jobmatch-ai-dev.pages.dev
```

**Build Time:** ~9 seconds
**Total Deployment:** 2-5 minutes

---

## Verification Tests

After deployment, test:
- [ ] Site loads at https://jobmatch-ai-dev.pages.dev
- [ ] Can sign up / login (Supabase works)
- [ ] Can view jobs
- [ ] Can create application
- [ ] Can upload resume (backend connection works)
- [ ] No CORS errors in browser console (F12)

---

## Troubleshooting Quick Fixes

**CORS Error:**
→ Update `CORS_ORIGIN` in Railway backend (see above)

**Blank Page:**
→ Check browser console (F12) for errors
→ Verify all 4 environment variables are set

**Build Failed:**
→ Check `NODE_VERSION=22.12.0` is set
→ Review build logs in Cloudflare

---

**Need detailed instructions?** See `docs/CLOUDFLARE_PAGES_SETUP.md`
