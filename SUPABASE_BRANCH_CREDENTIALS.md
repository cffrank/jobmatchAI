# Supabase Branch Credentials

## Development Branch

**Project Ref**: `wpupbucinufbaiphwogc`

**Supabase URL**:
```
https://wpupbucinufbaiphwogc.supabase.co
```

**Anon Key** (use for frontend VITE_SUPABASE_ANON_KEY):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdXBidWNpbnVmYmFpcGh3b2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjI1NjcsImV4cCI6MjA4MjIzODU2N30.LRfdYAz08eKp5oZoQJ7MbK-VCluud2YlIRw0GumcAp8
```

---

## Staging Branch

**Project Ref**: `awupxbzzabtzqowjcnsa`

**Supabase URL**:
```
https://awupxbzzabtzqowjcnsa.supabase.co
```

**Anon Key** (use for frontend VITE_SUPABASE_ANON_KEY):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dXB4Ynp6YWJ0enFvd2pjbnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2Njc5NDAsImV4cCI6MjA4MjI0Mzk0MH0.Rxpwhhy7_oreAO-c_6yflzKNdXqgGxsiOl6aQ-2Hs9s
```

---

## Get Service Role Keys

**You need to get the service role keys from Supabase Dashboard:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. **For Development**:
   - Select the `wpupbucinufbaiphwogc` project
   - Go to: Settings → API → Project API Keys
   - Copy the `service_role` secret key
3. **For Staging**:
   - Select the `awupxbzzabtzqowjcnsa` project
   - Go to: Settings → API → Project API Keys
   - Copy the `service_role` secret key

---

## Railway Environment Variables to Update

### Development Environment (backend1-development)

Update these in Railway Dashboard → backend1 → Development → Variables:

```
SUPABASE_URL=https://wpupbucinufbaiphwogc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdXBidWNpbnVmYmFpcGh3b2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjI1NjcsImV4cCI6MjA4MjIzODU2N30.LRfdYAz08eKp5oZoQJ7MbK-VCluud2YlIRw0GumcAp8
SUPABASE_SERVICE_ROLE_KEY=<get from dashboard>
```

### Staging Environment (backend1-staging)

Update these in Railway Dashboard → backend1 → Staging → Variables:

```
SUPABASE_URL=https://awupxbzzabtzqowjcnsa.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dXB4Ynp6YWJ0enFvd2pjbnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2Njc5NDAsImV4cCI6MjA4MjI0Mzk0MH0.Rxpwhhy7_oreAO-c_6yflzKNdXqgGxsiOl6aQ-2Hs9s
SUPABASE_SERVICE_ROLE_KEY=<get from dashboard>
```

### Frontend Environment Variables

**Development Frontend**:
```
VITE_SUPABASE_URL=https://wpupbucinufbaiphwogc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdXBidWNpbnVmYmFpcGh3b2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjI1NjcsImV4cCI6MjA4MjIzODU2N30.LRfdYAz08eKp5oZoQJ7MbK-VCluud2YlIRw0GumcAp8
VITE_BACKEND_URL=https://backend1-development.up.railway.app
```

**Staging Frontend**:
```
VITE_SUPABASE_URL=https://awupxbzzabtzqowjcnsa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dXB4Ynp6YWJ0enFvd2pjbnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2Njc5NDAsImV4cCI6MjA4MjI0Mzk0MH0.Rxpwhhy7_oreAO-c_6yflzKNdXqgGxsiOl6aQ-2Hs9s
VITE_BACKEND_URL=https://backend1-staging.up.railway.app
```

---

## Next Steps

1. ✅ Get service role keys from Supabase Dashboard
2. ✅ Update Railway backend environment variables
3. ✅ Update Railway frontend environment variables
4. ✅ Redeploy each environment
5. ✅ Test login on development frontend - should stay on dev, not redirect to production

---

## Benefits of This Setup

✅ **Isolated data**: Development/staging data won't affect production
✅ **Safe testing**: Test schema changes on dev/staging before production
✅ **Same schema**: All branches start with production schema
✅ **Easy merging**: Can merge schema changes from dev → staging → production
