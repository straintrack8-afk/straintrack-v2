-- ============================================
-- FIX: ALLOW SUPER ADMINS TO MANAGE FARMS
-- ============================================
-- The current policies only allow Super Admins to SELECT (view) farms.
-- This script adds a policy to allow them to INSERT, UPDATE, and DELETE.

CREATE POLICY "Super admins can manage all farms"
ON public.farms FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);
