-- Migration v7: Avatar storage support
-- Adds avatar_url column to trainers and creates public avatars storage bucket

-- 1. Add avatar_url column to trainers table
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create public storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies: Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars are publicly readable" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'avatars');
