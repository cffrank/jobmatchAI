# Storage Policies Setup Guide

## Problem
Profile photo uploads fail with error: "new row violates row-level security policy"

## Root Cause
The `avatars` storage bucket has no Row Level Security (RLS) policies, preventing users from uploading files.

## Solution
Create RLS policies for the `avatars` bucket to allow authenticated users to manage their profile photos.

## Method 1: Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/storage/buckets/avatars
2. Click on the **Policies** tab
3. Click **New Policy** for each policy below

### Policy 1: Upload Own Profile Photos
- **Policy Name**: `Users can upload own profile photos`
- **Target Roles**: `authenticated`
- **Policy Command**: `INSERT`
- **Policy Definition**:
```sql
bucket_id = 'avatars' AND
(storage.foldername(name))[1] = 'users' AND
(storage.foldername(name))[2] = auth.uid()::text
```

### Policy 2: View Own Profile Photos
- **Policy Name**: `Users can view own profile photos`
- **Target Roles**: `authenticated`
- **Policy Command**: `SELECT`
- **USING Expression**:
```sql
bucket_id = 'avatars' AND
(storage.foldername(name))[1] = 'users' AND
(storage.foldername(name))[2] = auth.uid()::text
```

### Policy 3: Update Own Profile Photos
- **Policy Name**: `Users can update own profile photos`
- **Target Roles**: `authenticated`
- **Policy Command**: `UPDATE`
- **USING Expression**:
```sql
bucket_id = 'avatars' AND
(storage.foldername(name))[1] = 'users' AND
(storage.foldername(name))[2] = auth.uid()::text
```
- **WITH CHECK Expression**:
```sql
bucket_id = 'avatars' AND
(storage.foldername(name))[1] = 'users' AND
(storage.foldername(name))[2] = auth.uid()::text
```

### Policy 4: Delete Own Profile Photos
- **Policy Name**: `Users can delete own profile photos`
- **Target Roles**: `authenticated`
- **Policy Command**: `DELETE`
- **USING Expression**:
```sql
bucket_id = 'avatars' AND
(storage.foldername(name))[1] = 'users' AND
(storage.foldername(name))[2] = auth.uid()::text
```

### Policy 5: Public Read Access
- **Policy Name**: `Public can view avatars`
- **Target Roles**: `public`
- **Policy Command**: `SELECT`
- **USING Expression**:
```sql
bucket_id = 'avatars'
```

## Method 2: SQL Editor (Alternative)

If the dashboard doesn't work, run this SQL in the Supabase SQL Editor:

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Upload
CREATE POLICY "Users can upload own profile photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy 2: View Own
CREATE POLICY "Users can view own profile photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy 3: Update
CREATE POLICY "Users can update own profile photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy 4: Delete
CREATE POLICY "Users can delete own profile photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy 5: Public Read
CREATE POLICY "Public can view avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
```

## How It Works

The policies check that:
1. Files are uploaded to the `avatars` bucket
2. Files are stored in the pattern: `users/{userId}/profile/avatar.{ext}`
3. The `{userId}` matches the authenticated user's ID (`auth.uid()`)
4. Public read access allows anyone to view avatars via public URLs

## Verification

After creating the policies, verify with:

```sql
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
```

You should see 5 policies listed.

## Testing

1. Log in to your app: https://jobmatchai-production.up.railway.app
2. Try uploading a profile photo
3. Upload should succeed and photo should appear
