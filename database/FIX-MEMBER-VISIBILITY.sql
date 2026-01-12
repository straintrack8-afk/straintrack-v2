-- FIX MEMBER VISIBILITY ISSUES
-- This script updates RLS policies to allow members to see other members in their organization

-- ==============================================================================
-- 1. Fix 'users' table policies
-- ==============================================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can read own data" ON public.users;

-- Create new policy: Users can see themselves AND other users in their organization
CREATE POLICY "Users can read organization members"
ON public.users FOR SELECT
USING (
  -- Can see own profile
  auth.uid() = id
  OR 
  -- Can see users who belong to the same organization
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ==============================================================================
-- 2. Fix 'user_organizations' table policies
-- ==============================================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can read own memberships" ON public.user_organizations;

-- Create new policy: Users can see ALL memberships for their organizations
CREATE POLICY "Users can read organization memberships"
ON public.user_organizations FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Note: We don't need to change the Organizations table policy because accessing 
-- specific users is done via querying the 'users' and 'user_organizations' tables,
-- not by querying the 'organizations' table repeatedly for each user.
-- The existing policy "Users can read own organizations" is likely sufficient for 
-- fetching the organization details itself.

-- ==============================================================================
-- Verification Query (Run this after applying policies to test)
-- ==============================================================================
/*
  SELECT * FROM public.user_organizations 
  WHERE organization_id = (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  );
*/
