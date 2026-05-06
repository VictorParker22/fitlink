-- =============================================
-- FitLink v3: Client Portal Support
-- Run this in Supabase SQL Editor AFTER migration v2
-- =============================================

-- Add auth_user_id to clients (links client's auth account to their record)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_clients_auth_user ON clients(auth_user_id);

-- ==================== CLIENT RLS POLICIES ====================
-- Clients can read their own record
CREATE POLICY "clients_self_read" ON clients FOR SELECT
  USING (auth_user_id = auth.uid());

-- Clients can read their own sessions
CREATE POLICY "sessions_client_read" ON sessions FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

-- Clients can read their assigned workouts
CREATE POLICY "cw_client_read" ON client_workouts FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));
CREATE POLICY "cw_client_update" ON client_workouts FOR UPDATE
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

-- Clients can read workout details (for their assigned workouts)
CREATE POLICY "workouts_client_read" ON workouts FOR SELECT
  USING (id IN (
    SELECT workout_id FROM client_workouts
    WHERE client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  ));

-- Clients can read exercises in their workouts
CREATE POLICY "exercises_client_read" ON exercises FOR SELECT
  USING (
    trainer_id IS NULL  -- global exercises
    OR id IN (
      SELECT exercise_id FROM workout_exercises
      WHERE workout_id IN (
        SELECT workout_id FROM client_workouts
        WHERE client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
      )
    )
  );

CREATE POLICY "we_client_read" ON workout_exercises FOR SELECT
  USING (workout_id IN (
    SELECT workout_id FROM client_workouts
    WHERE client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  ));

-- Clients can read their conversations
CREATE POLICY "conversations_client_read" ON conversations FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));
CREATE POLICY "conversations_client_update" ON conversations FOR UPDATE
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

-- Clients can read/write messages in their conversations
CREATE POLICY "messages_client_read" ON messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM conversations
    WHERE client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  ));
CREATE POLICY "messages_client_insert" ON messages FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM conversations
    WHERE client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  ));

-- Clients can read their trainer's profile
CREATE POLICY "trainers_client_read" ON trainers FOR SELECT
  USING (id IN (
    SELECT trainer_id FROM clients WHERE auth_user_id = auth.uid()
  ));
