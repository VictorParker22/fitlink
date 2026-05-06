-- =============================================
-- FitLink v6: Fix trigger for phone-based signups
-- Run this in Supabase SQL Editor AFTER previous migrations
-- =============================================

-- 1. Allow email to be nullable on trainers (phone users won't have one)
ALTER TABLE trainers ALTER COLUMN email DROP NOT NULL;
ALTER TABLE trainers ALTER COLUMN email SET DEFAULT '';

-- 2. Update the auto-create trigger to handle phone signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check if this is a client signup (skip trainer creation for clients)
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'trainer');
  
  IF user_role = 'client' THEN
    RETURN NEW;
  END IF;

  -- Create trainer profile — works for both email and phone signups
  INSERT INTO public.trainers (id, name, email, phone, referral_code)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      CASE WHEN NEW.email IS NOT NULL THEN split_part(NEW.email, '@', 1) ELSE '' END
    ),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.phone, ''),
    UPPER(
      CASE 
        WHEN NEW.email IS NOT NULL THEN REPLACE(split_part(NEW.email, '@', 1), '.', '-')
        WHEN NEW.phone IS NOT NULL THEN REPLACE(RIGHT(NEW.phone, 4), '+', '')
        ELSE 'USER'
      END
    ) || '-' || SUBSTRING(NEW.id::TEXT, 1, 4)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger itself doesn't need to be recreated — it already points to handle_new_user()
