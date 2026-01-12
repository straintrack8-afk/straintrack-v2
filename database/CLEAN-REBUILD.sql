-- ============================================
-- StrainTrack - Clean Database Rebuild Script
-- ============================================
-- Run this script in Supabase SQL Editor to rebuild database from scratch
-- WARNING: This will delete all existing data!

-- ============================================
-- STEP 1: DROP EXISTING OBJECTS (if any)
-- ============================================

-- Drop RLS policies first
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can read own organizations" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can read all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can read own org reports" ON public.disease_reports;
DROP POLICY IF EXISTS "Super admins can read all reports" ON public.disease_reports;

-- Drop all triggers from current schema
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
DROP TRIGGER IF EXISTS update_farms_updated_at ON public.farms;
DROP TRIGGER IF EXISTS update_disease_reports_updated_at ON public.disease_reports;

-- Drop functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_organization(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.join_organization(varchar, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop tables (in reverse dependency order) with CASCADE
DROP TABLE IF EXISTS public.disease_reports CASCADE;
DROP TABLE IF EXISTS public.clinical_signs CASCADE;
DROP TABLE IF EXISTS public.emergency_actions CASCADE;
DROP TABLE IF EXISTS public.attachments CASCADE;
DROP TABLE IF EXISTS public.farms CASCADE;
DROP TABLE IF EXISTS public.user_organizations CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================
-- STEP 2: CREATE TABLES
-- ============================================

-- Users table (extends auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'member', 'super_admin')),
    organization_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations table
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    share_code VARCHAR(8) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for users.organization_id
ALTER TABLE public.users
ADD CONSTRAINT users_organization_id_fkey
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- User Organizations junction table
CREATE TABLE public.user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Farms table
CREATE TABLE public.farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disease Reports table
CREATE TABLE public.disease_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.users(id),
    
    -- Basic Info
    animal_species VARCHAR(50) NOT NULL,
    animal_category VARCHAR(100),
    animal_subcategory VARCHAR(100),
    outbreak_location TEXT,
    total_population INTEGER,
    age_stage VARCHAR(50),
    
    -- Disease Info
    onset_date DATE,
    disease_name VARCHAR(255),
    strain_subtype VARCHAR(100),
    severity VARCHAR(50),
    pathology_findings TEXT,
    
    -- Clinical Presentation
    sick_count INTEGER,
    death_count INTEGER,
    morbidity_rate DECIMAL(5,2),
    mortality_rate DECIMAL(5,2),
    
    -- Vaccination
    vaccination_history VARCHAR(50),
    vaccine_name VARCHAR(255),
    vaccination_date DATE,
    
    -- Source & Response
    suspected_source TEXT,
    
    -- Lab Testing
    sample_sent BOOLEAN DEFAULT FALSE,
    sample_type VARCHAR(100),
    lab_destination VARCHAR(255),
    sample_ship_date DATE,
    
    -- Documentation
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinical Signs table
CREATE TABLE public.clinical_signs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.disease_reports(id) ON DELETE CASCADE,
    sign_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency Actions table
CREATE TABLE public.emergency_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.disease_reports(id) ON DELETE CASCADE,
    action_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attachments table
CREATE TABLE public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.disease_reports(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    storage_path TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 3: CREATE INDEXES
-- ============================================

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_organization_id ON public.users(organization_id);
CREATE INDEX idx_organizations_share_code ON public.organizations(share_code);
CREATE INDEX idx_organizations_name ON public.organizations(LOWER(name));
CREATE INDEX idx_user_organizations_user_id ON public.user_organizations(user_id);
CREATE INDEX idx_user_organizations_org_id ON public.user_organizations(organization_id);
CREATE INDEX idx_farms_organization_id ON public.farms(organization_id);
CREATE INDEX idx_disease_reports_organization_id ON public.disease_reports(organization_id);
CREATE INDEX idx_disease_reports_farm_id ON public.disease_reports(farm_id);
CREATE INDEX idx_disease_reports_created_by ON public.disease_reports(created_by);
CREATE INDEX idx_clinical_signs_report_id ON public.clinical_signs(report_id);
CREATE INDEX idx_emergency_actions_report_id ON public.emergency_actions(report_id);
CREATE INDEX idx_attachments_report_id ON public.attachments(report_id);

-- ============================================
-- STEP 4: CREATE FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'admin',
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create organization
CREATE OR REPLACE FUNCTION public.create_organization(
  org_name TEXT,
  org_description TEXT DEFAULT NULL
)
RETURNS TABLE (org_id UUID, org_share_code VARCHAR(8))
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  new_share_code VARCHAR(8);
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate unique share code
  new_share_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

  -- Insert new organization
  INSERT INTO public.organizations (name, description, share_code, created_by)
  VALUES (org_name, org_description, new_share_code, current_user_id)
  RETURNING id INTO new_org_id;

  -- Update user's organization_id
  UPDATE public.users
  SET organization_id = new_org_id
  WHERE id = current_user_id;

  -- Insert into user_organizations (user as admin)
  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES (current_user_id, new_org_id, 'admin');

  RETURN QUERY SELECT new_org_id, new_share_code;
END;
$$;

-- Function to join organization
CREATE OR REPLACE FUNCTION public.join_organization(
  share_code VARCHAR(8),
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

  -- Insert into user_organizations (user as member)
  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES (current_user_id, target_org_id, 'member')
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  RETURN QUERY SELECT TRUE, 'Successfully joined organization', target_org_id;
END;
$$;

-- ============================================
-- STEP 5: CREATE TRIGGERS
-- ============================================

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_farms_updated_at
    BEFORE UPDATE ON public.farms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disease_reports_updated_at
    BEFORE UPDATE ON public.disease_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 7: CREATE RLS POLICIES
-- ============================================

-- Users table policies
CREATE POLICY "Users can read own data"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- Organizations table policies
CREATE POLICY "Users can read own organizations"
ON public.organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can read all organizations"
ON public.organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Admins can update own organizations"
ON public.organizations FOR UPDATE
USING (
  id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- User Organizations table policies
CREATE POLICY "Users can read own memberships"
ON public.user_organizations FOR SELECT
USING (user_id = auth.uid());

-- Farms table policies
CREATE POLICY "Users can read own org farms"
ON public.farms FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can read all farms"
ON public.farms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Admins can manage own org farms"
ON public.farms FOR ALL
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Disease Reports table policies
CREATE POLICY "Users can read own org reports"
ON public.disease_reports FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can read all reports"
ON public.disease_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Users can create reports in own org"
ON public.disease_reports FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update own reports"
ON public.disease_reports FOR UPDATE
USING (created_by = auth.uid());

-- Clinical Signs table policies
CREATE POLICY "Users can read clinical signs of accessible reports"
ON public.clinical_signs FOR SELECT
USING (
  report_id IN (
    SELECT id FROM public.disease_reports
    WHERE organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage clinical signs of own reports"
ON public.clinical_signs FOR ALL
USING (
  report_id IN (
    SELECT id FROM public.disease_reports
    WHERE created_by = auth.uid()
  )
);

-- Emergency Actions table policies
CREATE POLICY "Users can read emergency actions of accessible reports"
ON public.emergency_actions FOR SELECT
USING (
  report_id IN (
    SELECT id FROM public.disease_reports
    WHERE organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage emergency actions of own reports"
ON public.emergency_actions FOR ALL
USING (
  report_id IN (
    SELECT id FROM public.disease_reports
    WHERE created_by = auth.uid()
  )
);

-- Attachments table policies
CREATE POLICY "Users can read attachments of accessible reports"
ON public.attachments FOR SELECT
USING (
  report_id IN (
    SELECT id FROM public.disease_reports
    WHERE organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can upload attachments to own reports"
ON public.attachments FOR INSERT
WITH CHECK (
  report_id IN (
    SELECT id FROM public.disease_reports
    WHERE created_by = auth.uid()
  )
  AND uploaded_by = auth.uid()
);

-- ============================================
-- STEP 8: CREATE SUPER ADMIN USER
-- ============================================

-- Note: Super admin user must be created in Supabase Auth first
-- Then run this to update role in public.users:

-- UPDATE public.users
-- SET role = 'super_admin'
-- WHERE email = 'straintrack8@gmail.com';

-- ============================================
-- STEP 9: CREATE SUPER ADMIN ORGANIZATION
-- ============================================

-- Note: Run this after super admin user exists in public.users:

-- INSERT INTO public.organizations (id, name, share_code, address, phone, created_by)
-- VALUES (
--   '4200094de-6fc8-4acb-a559-95ea0d2d807c',
--   'Super Admin Organization',
--   'SADMIN',
--   'Admin Office',
--   '-',
--   (SELECT id FROM public.users WHERE email = 'straintrack8@gmail.com')
-- );

-- UPDATE public.users
-- SET organization_id = '4200094de-6fc8-4acb-a559-95ea0d2d807c'
-- WHERE email = 'straintrack8@gmail.com';

-- INSERT INTO public.user_organizations (user_id, organization_id, role)
-- VALUES (
--   (SELECT id FROM public.users WHERE email = 'straintrack8@gmail.com'),
--   '4200094de-6fc8-4acb-a559-95ea0d2d807c',
--   'admin'
-- );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check triggers
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- Check RPC functions
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('create_organization', 'join_organization', 'handle_new_user')
ORDER BY proname;

-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- REBUILD COMPLETE!
-- ============================================
-- Next steps:
-- 1. Create super admin user in Supabase Auth Dashboard
-- 2. Run Step 8 & 9 SQL to setup super admin
-- 3. Test signup flow with new user
-- 4. Test create organization flow
-- 5. Test login flow
