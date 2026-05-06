-- =============================================
-- FitLink v2: Messaging + Workout Builder Tables
-- Run this in Supabase SQL Editor AFTER the initial migration
-- =============================================

-- ==================== MESSAGING ====================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  last_message TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ DEFAULT now(),
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trainer_id, client_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('trainer', 'client')),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (trainer_id = auth.uid());
CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "conversations_update" ON conversations FOR UPDATE USING (trainer_id = auth.uid());

-- RLS for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (conversation_id IN (SELECT id FROM conversations WHERE trainer_id = auth.uid()));
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (conversation_id IN (SELECT id FROM conversations WHERE trainer_id = auth.uid()));
CREATE POLICY "messages_update" ON messages FOR UPDATE
  USING (conversation_id IN (SELECT id FROM conversations WHERE trainer_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_trainer ON conversations(trainer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- Enable Realtime on messages (for live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ==================== WORKOUT BUILDER ====================

CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'full_body')),
  muscle_group TEXT DEFAULT '',
  equipment TEXT DEFAULT 'bodyweight' CHECK (equipment IN ('barbell', 'dumbbell', 'machine', 'bodyweight', 'cable', 'kettlebell', 'bands', 'other')),
  instructions TEXT DEFAULT '',
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'strength' CHECK (category IN ('strength', 'cardio', 'flexibility', 'hiit', 'circuit')),
  estimated_duration INTEGER DEFAULT 45,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  sets INTEGER DEFAULT 3,
  reps TEXT DEFAULT '10',
  rest_seconds INTEGER DEFAULT 60,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  assigned_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'completed', 'skipped')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for exercises
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises_select" ON exercises FOR SELECT
  USING (trainer_id = auth.uid() OR trainer_id IS NULL);
CREATE POLICY "exercises_insert" ON exercises FOR INSERT WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "exercises_update" ON exercises FOR UPDATE USING (trainer_id = auth.uid());
CREATE POLICY "exercises_delete" ON exercises FOR DELETE USING (trainer_id = auth.uid());

-- RLS for workouts
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workouts_select" ON workouts FOR SELECT USING (trainer_id = auth.uid());
CREATE POLICY "workouts_insert" ON workouts FOR INSERT WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "workouts_update" ON workouts FOR UPDATE USING (trainer_id = auth.uid());
CREATE POLICY "workouts_delete" ON workouts FOR DELETE USING (trainer_id = auth.uid());

-- RLS for workout_exercises
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "we_select" ON workout_exercises FOR SELECT
  USING (workout_id IN (SELECT id FROM workouts WHERE trainer_id = auth.uid()));
CREATE POLICY "we_insert" ON workout_exercises FOR INSERT
  WITH CHECK (workout_id IN (SELECT id FROM workouts WHERE trainer_id = auth.uid()));
CREATE POLICY "we_update" ON workout_exercises FOR UPDATE
  USING (workout_id IN (SELECT id FROM workouts WHERE trainer_id = auth.uid()));
CREATE POLICY "we_delete" ON workout_exercises FOR DELETE
  USING (workout_id IN (SELECT id FROM workouts WHERE trainer_id = auth.uid()));

-- RLS for client_workouts
ALTER TABLE client_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cw_select" ON client_workouts FOR SELECT USING (trainer_id = auth.uid());
CREATE POLICY "cw_insert" ON client_workouts FOR INSERT WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "cw_update" ON client_workouts FOR UPDATE USING (trainer_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_workouts_trainer ON workouts(trainer_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id, order_index);
CREATE INDEX IF NOT EXISTS idx_client_workouts_client ON client_workouts(client_id, assigned_date DESC);

-- ==================== SEED: COMMON EXERCISES ====================

INSERT INTO exercises (name, category, muscle_group, equipment, is_custom, trainer_id) VALUES
  -- Chest
  ('Bench Press', 'chest', 'Pectorals', 'barbell', false, NULL),
  ('Incline Dumbbell Press', 'chest', 'Upper Chest', 'dumbbell', false, NULL),
  ('Cable Fly', 'chest', 'Pectorals', 'cable', false, NULL),
  ('Push-Up', 'chest', 'Pectorals', 'bodyweight', false, NULL),
  ('Dumbbell Fly', 'chest', 'Pectorals', 'dumbbell', false, NULL),
  -- Back
  ('Deadlift', 'back', 'Lower Back', 'barbell', false, NULL),
  ('Pull-Up', 'back', 'Lats', 'bodyweight', false, NULL),
  ('Barbell Row', 'back', 'Upper Back', 'barbell', false, NULL),
  ('Lat Pulldown', 'back', 'Lats', 'cable', false, NULL),
  ('Seated Cable Row', 'back', 'Mid Back', 'cable', false, NULL),
  -- Legs
  ('Barbell Squat', 'legs', 'Quadriceps', 'barbell', false, NULL),
  ('Romanian Deadlift', 'legs', 'Hamstrings', 'barbell', false, NULL),
  ('Leg Press', 'legs', 'Quadriceps', 'machine', false, NULL),
  ('Leg Curl', 'legs', 'Hamstrings', 'machine', false, NULL),
  ('Calf Raise', 'legs', 'Calves', 'machine', false, NULL),
  ('Walking Lunge', 'legs', 'Quadriceps', 'dumbbell', false, NULL),
  ('Bulgarian Split Squat', 'legs', 'Quadriceps', 'dumbbell', false, NULL),
  -- Shoulders
  ('Overhead Press', 'shoulders', 'Deltoids', 'barbell', false, NULL),
  ('Lateral Raise', 'shoulders', 'Side Delts', 'dumbbell', false, NULL),
  ('Face Pull', 'shoulders', 'Rear Delts', 'cable', false, NULL),
  ('Arnold Press', 'shoulders', 'Deltoids', 'dumbbell', false, NULL),
  ('Reverse Fly', 'shoulders', 'Rear Delts', 'dumbbell', false, NULL),
  -- Arms
  ('Barbell Curl', 'arms', 'Biceps', 'barbell', false, NULL),
  ('Tricep Pushdown', 'arms', 'Triceps', 'cable', false, NULL),
  ('Hammer Curl', 'arms', 'Biceps', 'dumbbell', false, NULL),
  ('Skull Crusher', 'arms', 'Triceps', 'barbell', false, NULL),
  ('Concentration Curl', 'arms', 'Biceps', 'dumbbell', false, NULL),
  -- Core
  ('Plank', 'core', 'Abs', 'bodyweight', false, NULL),
  ('Hanging Leg Raise', 'core', 'Lower Abs', 'bodyweight', false, NULL),
  ('Cable Crunch', 'core', 'Abs', 'cable', false, NULL),
  ('Russian Twist', 'core', 'Obliques', 'bodyweight', false, NULL),
  ('Ab Wheel Rollout', 'core', 'Abs', 'other', false, NULL),
  -- Cardio
  ('Treadmill Run', 'cardio', 'Full Body', 'machine', false, NULL),
  ('Rowing Machine', 'cardio', 'Full Body', 'machine', false, NULL),
  ('Jump Rope', 'cardio', 'Full Body', 'other', false, NULL),
  ('Battle Ropes', 'cardio', 'Full Body', 'other', false, NULL),
  ('Box Jump', 'cardio', 'Legs', 'bodyweight', false, NULL),
  -- Full Body
  ('Clean and Press', 'full_body', 'Full Body', 'barbell', false, NULL),
  ('Kettlebell Swing', 'full_body', 'Full Body', 'kettlebell', false, NULL),
  ('Burpee', 'full_body', 'Full Body', 'bodyweight', false, NULL),
  ('Turkish Get-Up', 'full_body', 'Full Body', 'kettlebell', false, NULL),
  ('Thruster', 'full_body', 'Full Body', 'barbell', false, NULL);
