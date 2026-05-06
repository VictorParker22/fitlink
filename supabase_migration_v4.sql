-- =============================================
-- FitLink v4: Onboarding + Workout Logging
-- Run this in Supabase SQL Editor AFTER migration v3
-- =============================================

-- 1. Add onboarding flag to trainers
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- 2. Workout Logs — clients log actual weight/reps per exercise
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_workout_id UUID NOT NULL REFERENCES client_workouts(id) ON DELETE CASCADE,
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL DEFAULT 1,
  weight NUMERIC(8,2) DEFAULT 0,
  reps INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  notes TEXT DEFAULT '',
  logged_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for workout_logs
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

-- Trainers can see their clients' logs
CREATE POLICY "wl_trainer_select" ON workout_logs FOR SELECT USING (trainer_id = auth.uid());
CREATE POLICY "wl_trainer_insert" ON workout_logs FOR INSERT WITH CHECK (trainer_id = auth.uid());

-- Clients can read/write their own logs
CREATE POLICY "wl_client_select" ON workout_logs FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));
CREATE POLICY "wl_client_insert" ON workout_logs FOR INSERT
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));
CREATE POLICY "wl_client_update" ON workout_logs FOR UPDATE
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workout_logs_client ON workout_logs(client_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_logs_cw ON workout_logs(client_workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_trainer ON workout_logs(trainer_id, logged_at DESC);
