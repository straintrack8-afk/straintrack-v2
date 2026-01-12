-- Fix for "Could not choose the best candidate function" error
-- This error happens because there are duplicate functions with different parameter types (varchar vs text)

-- 1. Drop ALL existing variations of the function to clean up
DROP FUNCTION IF EXISTS public.join_organization(text, uuid);
DROP FUNCTION IF EXISTS public.join_organization(character varying, uuid);
DROP FUNCTION IF EXISTS public.join_organization(varchar, uuid);

-- 2. Recreate the function with a single, clear definition using TEXT (best for Supabase RPC)
CREATE OR REPLACE FUNCTION public.join_organization(
  share_code TEXT,
  invited_by UUID DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, message TEXT, org_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_org_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find organization by share code
  SELECT id INTO target_org_id
  FROM public.organizations
  WHERE organizations.share_code = join_organization.share_code;

  IF target_org_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invalid share code', NULL::UUID;
    RETURN;
  END IF;

  -- Update user's organization_id
  UPDATE public.users
  SET organization_id = target_org_id
  WHERE id = current_user_id;

  -- Insert into user_organizations (if not exists)
  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES (current_user_id, target_org_id, 'member')
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  
  -- If invited_by is provided, update the invitation status
  IF invited_by IS NOT NULL THEN
    -- Find pending invitation for this user's email
    UPDATE public.organization_invitations
    SET status = 'accepted'
    WHERE email = (SELECT email FROM auth.users WHERE id = current_user_id)
    AND organization_id = target_org_id
    AND status = 'pending';
  END IF;

  RETURN QUERY SELECT TRUE, 'Successfully joined organization', target_org_id;
END;
$$;
