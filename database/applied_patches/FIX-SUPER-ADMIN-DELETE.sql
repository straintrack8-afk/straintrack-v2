-- ALLOW SUPER ADMINS TO DELETE ORGANIZATIONS AND MEMBERS

-- ==============================================================================
-- 1. Organizations Policy: Allow Super Admin to DELETE
-- ==============================================================================

CREATE POLICY "Super admins can delete organizations"
ON public.organizations FOR DELETE
USING (public.is_super_admin());

-- ==============================================================================
-- 2. User Organizations Policy: Allow Super Admin to DELETE (remove members)
-- ==============================================================================

CREATE POLICY "Super admins can delete memberships"
ON public.user_organizations FOR DELETE
USING (public.is_super_admin());

-- Note: We generally don't delete from 'public.users' directly to preserve history,
-- but removing them from 'user_organizations' effectively removes them from the org.
