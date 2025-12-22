-- Migration: Storage RLS Policies for Profile Photos
-- Description: Allow authenticated users to upload/manage their profile photos in the avatars bucket
-- Created: 2025-12-21

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to upload files to their own folder
-- Path pattern: users/{userId}/profile/*
CREATE POLICY "Users can upload own profile photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy 2: Allow authenticated users to read their own files
CREATE POLICY "Users can view own profile photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy 3: Allow authenticated users to update their own files
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

-- Policy 4: Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own profile photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy 5: Allow public read access to avatars bucket (since it's marked as public)
-- This allows anyone to view profile photos via the public URL
CREATE POLICY "Public can view avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Verify policies were created
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
