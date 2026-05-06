-- =============================================
-- FitLink Database Schema + Seed Data
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================

-- ==================== TABLES ====================

-- 1. Trainers (linked to auth.users)
CREATE TABLE IF NOT EXISTS trainers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  specializations TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  referral_code TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Plans (subscription tiers created by trainer)
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  period TEXT DEFAULT 'month',
  features JSONB DEFAULT '[]',
  color TEXT DEFAULT '#5B8DEF',
  is_popular BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'trial', 'inactive')),
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  joined_date TIMESTAMPTZ DEFAULT now(),
  last_session TIMESTAMPTZ,
  referred_by UUID REFERENCES clients(id) ON DELETE SET NULL,
  progress JSONB DEFAULT '{"weight":[],"dates":[],"workoutsThisMonth":0,"streak":0}',
  notes TEXT DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  group_name TEXT,
  date TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,
  type TEXT DEFAULT '1-on-1' CHECK (type IN ('1-on-1', 'Group', 'Virtual')),
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  referred_name TEXT NOT NULL,
  referred_by UUID REFERENCES clients(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'signed_up', 'pending', 'expired')),
  reward NUMERIC(10,2) DEFAULT 0,
  date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Activities (feed)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'general',
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== ROW LEVEL SECURITY ====================

ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Trainers: can read/update own profile
CREATE POLICY "trainers_select_own" ON trainers FOR SELECT USING (id = auth.uid());
CREATE POLICY "trainers_insert_own" ON trainers FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "trainers_update_own" ON trainers FOR UPDATE USING (id = auth.uid());

-- Plans: trainer owns their plans
CREATE POLICY "plans_select" ON plans FOR SELECT USING (trainer_id = auth.uid());
CREATE POLICY "plans_insert" ON plans FOR INSERT WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "plans_update" ON plans FOR UPDATE USING (trainer_id = auth.uid());
CREATE POLICY "plans_delete" ON plans FOR DELETE USING (trainer_id = auth.uid());

-- Clients: trainer owns their clients
CREATE POLICY "clients_select" ON clients FOR SELECT USING (trainer_id = auth.uid());
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (trainer_id = auth.uid());
CREATE POLICY "clients_delete" ON clients FOR DELETE USING (trainer_id = auth.uid());

-- Sessions: trainer owns their sessions
CREATE POLICY "sessions_select" ON sessions FOR SELECT USING (trainer_id = auth.uid());
CREATE POLICY "sessions_insert" ON sessions FOR INSERT WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "sessions_update" ON sessions FOR UPDATE USING (trainer_id = auth.uid());
CREATE POLICY "sessions_delete" ON sessions FOR DELETE USING (trainer_id = auth.uid());

-- Referrals: trainer owns their referrals
CREATE POLICY "referrals_select" ON referrals FOR SELECT USING (trainer_id = auth.uid());
CREATE POLICY "referrals_insert" ON referrals FOR INSERT WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "referrals_update" ON referrals FOR UPDATE USING (trainer_id = auth.uid());

-- Activities: trainer owns their activity feed
CREATE POLICY "activities_select" ON activities FOR SELECT USING (trainer_id = auth.uid());
CREATE POLICY "activities_insert" ON activities FOR INSERT WITH CHECK (trainer_id = auth.uid());

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_clients_trainer ON clients(trainer_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(trainer_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_trainer ON sessions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(trainer_id, date);
CREATE INDEX IF NOT EXISTS idx_referrals_trainer ON referrals(trainer_id);
CREATE INDEX IF NOT EXISTS idx_activities_trainer ON activities(trainer_id, timestamp DESC);

-- ==================== FUNCTIONS ====================

-- Auto-create trainer profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.trainers (id, name, email, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    UPPER(REPLACE(split_part(NEW.email, '@', 1), '.', '-')) || '-' || SUBSTRING(NEW.id::TEXT, 1, 4)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: run after auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
