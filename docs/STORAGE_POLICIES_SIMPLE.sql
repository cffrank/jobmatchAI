-- Simple Storage Policies for Avatars Bucket
-- Copy and paste into Supabase SQL Editor and run

-- Policy 1: Upload
CREATE POLICY "Users can upload own profile photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy 2: View Own
CREATE POLICY "Users can view own profile photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy 3: Update
CREATE POLICY "Users can update own profile photos"
  ON storage.objects FOR UPDATE TO authenticated
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
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy 5: Public Read
CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
