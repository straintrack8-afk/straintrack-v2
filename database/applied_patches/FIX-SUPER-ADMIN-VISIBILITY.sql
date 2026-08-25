-- FIX SUPER ADMIN VISIBILITY
-- The Super Admin needs to see "Created By" (user email) for ALL organizations.
-- Currently, RLS on 'users' table restricts visibility to own organization only.

-- ==============================================================================
-- 1. Create Helper Function to check Super Admin status (Bypasses RLS)
--    To avoid infinite recursion when querying 'users' table inside a 'users' policy.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  );
$$;

-- ==============================================================================
-- 2. Update 'users' Policy to include Super Admin access
-- ==============================================================================

DROP POLICY IF EXISTS "Users can read organization members" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;

CREATE POLICY "Users can read organization members"
ON public.users FOR SELECT
USING (
  -- 1. Super Admins can see EVERYONE
  public.is_super_admin()
  OR
  -- 2. Can see own profile
  auth.uid() = id
  OR 
  -- 3. Can see users who are in my organizations
  organization_id IN (SELECT public.get_my_org_ids())
);
