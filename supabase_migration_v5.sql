-- =============================================
-- FitLink v5: Progress Photos
-- Run this in Supabase SQL Editor AFTER migration v4
-- =============================================

-- 1. Progress photos metadata table
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'front' CHECK (category IN ('front', 'side', 'back', 'other')),
  notes TEXT DEFAULT '',
  taken_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

-- Trainers can CRUD their clients' photos
CREATE POLICY "pp_trainer_select" ON progress_photos FOR SELECT USING (trainer_id = auth.uid());
CREATE POLICY "pp_trainer_insert" ON progress_photos FOR INSERT WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "pp_trainer_delete" ON progress_photos FOR DELETE USING (trainer_id = auth.uid());

-- Clients can view their own photos
CREATE POLICY "pp_client_select" ON progress_photos FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_progress_photos_client ON progress_photos(client_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_photos_trainer ON progress_photos(trainer_id);

-- 2. Storage bucket (run this separately if it fails — some Supabase plans require dashboard creation)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', true)
-- ON CONFLICT (id) DO NOTHING;

-- NOTE: You may need to create the bucket manually in Supabase Dashboard → Storage → New Bucket
-- Name: progress-photos, Public: Yes
-- Then add these storage policies in Dashboard → Storage → Policies:
--
-- Policy 1 (SELECT - anyone can read public bucket): 
--   Allowed operation: SELECT, Target roles: authenticated
--   Policy: true
--
-- Policy 2 (INSERT - trainers can upload):
--   Allowed operation: INSERT, Target roles: authenticated  
--   Policy: true
--
-- Policy 3 (DELETE - trainers can delete):
--   Allowed operation: DELETE, Target roles: authenticated
--   Policy: (bucket_id = 'progress-photos')
