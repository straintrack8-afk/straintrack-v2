-- FIX INFINITE RECURSION IN RLS POLICIES
-- The previous RLS policy caused an infinite loop which broke login.
-- We will fix this by using a helper function to fetch organization IDs safely.

-- ==============================================================================
-- 1. Create Helper Function (Bypasses RLS)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id 
  FROM public.user_organizations 
  WHERE user_id = auth.uid();
$$;

-- ==============================================================================
-- 2. Update 'user_organizations' Policy
-- ==============================================================================

DROP POLICY IF EXISTS "Users can read organization memberships" ON public.user_organizations;
DROP POLICY IF EXISTS "Users can read own memberships" ON public.user_organizations;

CREATE POLICY "Users can read organization memberships"
ON public.user_organizations FOR SELECT
USING (
  -- Users can see their own membership
  user_id = auth.uid()
  OR 
  -- Users can see memberships matching their organizations (using the safe function)
  organization_id IN (SELECT public.get_my_org_ids())
);

-- ==============================================================================
-- 3. Update 'users' Policy
-- ==============================================================================

DROP POLICY IF EXISTS "Users can read organization members" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;

CREATE POLICY "Users can read organization members"
ON public.users FOR SELECT
USING (
  -- Can see own profile
  auth.uid() = id
  OR 
  -- Can see users who are in my organizations
  organization_id IN (SELECT public.get_my_org_ids())
);
