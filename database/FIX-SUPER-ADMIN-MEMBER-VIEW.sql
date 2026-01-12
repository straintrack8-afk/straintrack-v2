-- FIX SUPER ADMIN MEMBER VISIBILITY
-- Currently, Super Admins cannot see members of organizations they don't belong to.
-- We need to update the RLS on 'user_organizations' to allow global read access for Super Admins.

-- ==============================================================================
-- Update 'user_organizations' Policy
-- ==============================================================================

DROP POLICY IF EXISTS "Users can read organization memberships" ON public.user_organizations;

CREATE POLICY "Users can read organization memberships"
ON public.user_organizations FOR SELECT
USING (
  -- 1. Super Admins can see EVERYTHING
  public.is_super_admin()
  OR
  -- 2. Users can see their own membership
  user_id = auth.uid()
  OR 
  -- 3. Users can see memberships matching their organizations
  organization_id IN (SELECT public.get_my_org_ids())
);
