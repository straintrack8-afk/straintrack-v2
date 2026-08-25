-- TRACK LAST ACTIVE DATE (LAST SIGN IN)
-- Syncs auth.users.last_sign_in_at to public.users table

-- ==============================================================================
-- 1. Add column to public.users
-- ==============================================================================

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- ==============================================================================
-- 2. Create Trigger Function to Sync from auth.users
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_user_login() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET last_sign_in_at = NEW.last_sign_in_at,
      updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 3. Create Trigger on auth.users
-- ==============================================================================

DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_login();
