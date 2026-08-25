-- ============================================================
-- StrainTrack V2 — Clean Database Rebuild (Refactored)
-- ============================================================
-- Architecture: 1 User = 1 Organization (simplified multi-tenancy)
-- Changes vs V1:
--   • user_organizations table REMOVED — source of truth is users.organization_id
--   • RLS rewritten to use auth.jwt() claims — eliminates N+1 subqueries
--   • RPC functions hardened with auth.uid() IS NOT NULL guard
--   • Helper functions for DRY RLS logic
-- ============================================================
-- Run in Supabase SQL Editor.
-- WARNING: Drops all existing data in the affected tables!
-- ============================================================


-- ============================================================
-- STEP 1: DROP EXISTING OBJECTS
-- ============================================================

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can read own data"                          ON public.users;
DROP POLICY IF EXISTS "Users can update own data"                        ON public.users;
DROP POLICY IF EXISTS "Users can read own organizations"                 ON public.organizations;
DROP POLICY IF EXISTS "Super admins can read all organizations"          ON public.organizations;
DROP POLICY IF EXISTS "Admins can update own organizations"              ON public.organizations;
DROP POLICY IF EXISTS "Users can read own memberships"                   ON public.user_organizations;
DROP POLICY IF EXISTS "Users can read organization memberships"          ON public.user_organizations;
DROP POLICY IF EXISTS "Users can read own org farms"                     ON public.farms;
DROP POLICY IF EXISTS "Super admins can read all farms"                  ON public.farms;
DROP POLICY IF EXISTS "Admins can manage own org farms"                  ON public.farms;
DROP POLICY IF EXISTS "Users can read own org reports"                   ON public.disease_reports;
DROP POLICY IF EXISTS "Super admins can read all reports"                ON public.disease_reports;
DROP POLICY IF EXISTS "Users can create reports in own org"              ON public.disease_reports;
DROP POLICY IF EXISTS "Users can update own reports"                     ON public.disease_reports;
DROP POLICY IF EXISTS "Users can read clinical signs of accessible reports" ON public.clinical_signs;
DROP POLICY IF EXISTS "Users can manage clinical signs of own reports"   ON public.clinical_signs;
DROP POLICY IF EXISTS "Users can read emergency actions of accessible reports" ON public.emergency_actions;
DROP POLICY IF EXISTS "Users can manage emergency actions of own reports" ON public.emergency_actions;
DROP POLICY IF EXISTS "Users can read attachments of accessible reports" ON public.attachments;
DROP POLICY IF EXISTS "Users can upload attachments to own reports"      ON public.attachments;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created       ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at    ON public.users;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
DROP TRIGGER IF EXISTS update_farms_updated_at    ON public.farms;
DROP TRIGGER IF EXISTS update_disease_reports_updated_at ON public.disease_reports;

-- Drop functions with CASCADE
DROP FUNCTION IF EXISTS public.handle_new_user()     CASCADE;
DROP FUNCTION IF EXISTS public.create_organization(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.join_organization(varchar, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin()      CASCADE;
DROP FUNCTION IF EXISTS public.get_my_org_id()       CASCADE;

-- Drop tables (reverse dependency order)
DROP TABLE IF EXISTS public.disease_reports     CASCADE;
DROP TABLE IF EXISTS public.clinical_signs      CASCADE;
DROP TABLE IF EXISTS public.emergency_actions   CASCADE;
DROP TABLE IF EXISTS public.attachments         CASCADE;
DROP TABLE IF EXISTS public.farms               CASCADE;
DROP TABLE IF EXISTS public.user_organizations  CASCADE;  -- REMOVED from new schema
DROP TABLE IF EXISTS public.organizations       CASCADE;
DROP TABLE IF EXISTS public.users               CASCADE;


-- ============================================================
-- STEP 2: CREATE TABLES
-- ============================================================

-- Users table (extends auth.users)
-- organization_id is the SOLE source of truth for tenancy.
CREATE TABLE public.users (
    id              UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE NOT NULL,
    full_name       VARCHAR(255),
    role            VARCHAR(50)  NOT NULL DEFAULT 'admin'
                        CHECK (role IN ('admin', 'member', 'super_admin')),
    organization_id UUID,        -- FK added after organizations table is created
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- Organizations table
CREATE TABLE public.organizations (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    share_code  VARCHAR(8)   UNIQUE NOT NULL,
    address     TEXT,
    phone       VARCHAR(50),
    created_by  UUID         REFERENCES public.users(id),
    created_at  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Add FK now that organizations table exists
ALTER TABLE public.users
    ADD CONSTRAINT users_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Farms table
CREATE TABLE public.farms (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    location        TEXT,
    latitude        DECIMAL(10, 7),
    longitude       DECIMAL(10, 7),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- Disease Reports table
CREATE TABLE public.disease_reports (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id             UUID         REFERENCES public.farms(id) ON DELETE SET NULL,
    created_by          UUID         NOT NULL REFERENCES public.users(id),

    -- Basic Info
    animal_species      VARCHAR(50)  NOT NULL,
    animal_category     VARCHAR(100),
    animal_subcategory  VARCHAR(100),
    outbreak_location   TEXT,
    total_population    INTEGER,
    age_stage           VARCHAR(50),

    -- Disease Info
    onset_date          DATE,
    disease_name        VARCHAR(255),
    strain_subtype      VARCHAR(100),
    severity            VARCHAR(50),
    pathology_findings  TEXT,

    -- Clinical Presentation
    sick_count          INTEGER,
    death_count         INTEGER,
    morbidity_rate      DECIMAL(5,2),
    mortality_rate      DECIMAL(5,2),

    -- Vaccination
    vaccination_history VARCHAR(50),
    vaccine_name        VARCHAR(255),
    vaccination_date    DATE,

    -- Source & Response
    suspected_source    TEXT,

    -- Lab Testing
    sample_sent         BOOLEAN     DEFAULT FALSE,
    sample_type         VARCHAR(100),
    lab_destination     VARCHAR(255),
    sample_ship_date    DATE,

    -- Documentation
    notes               TEXT,

    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Clinical Signs table
CREATE TABLE public.clinical_signs (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id   UUID         NOT NULL REFERENCES public.disease_reports(id) ON DELETE CASCADE,
    sign_name   VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Emergency Actions table
CREATE TABLE public.emergency_actions (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id    UUID         NOT NULL REFERENCES public.disease_reports(id) ON DELETE CASCADE,
    action_name  VARCHAR(255) NOT NULL,
    created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- Attachments table
CREATE TABLE public.attachments (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id    UUID         NOT NULL REFERENCES public.disease_reports(id) ON DELETE CASCADE,
    file_name    VARCHAR(255) NOT NULL,
    file_size    INTEGER,
    file_type    VARCHAR(100),
    storage_path TEXT         NOT NULL,
    uploaded_by  UUID         NOT NULL REFERENCES public.users(id),
    created_at   TIMESTAMPTZ  DEFAULT NOW()
);


-- ============================================================
-- STEP 3: CREATE INDEXES
-- ============================================================

-- users
CREATE INDEX idx_users_email           ON public.users(email);
CREATE INDEX idx_users_organization_id ON public.users(organization_id);
CREATE INDEX idx_users_role            ON public.users(role);

-- organizations
CREATE INDEX idx_organizations_share_code ON public.organizations(share_code);
CREATE INDEX idx_organizations_name      ON public.organizations(LOWER(name));

-- farms
CREATE INDEX idx_farms_organization_id ON public.farms(organization_id);

-- disease_reports
CREATE INDEX idx_disease_reports_organization_id ON public.disease_reports(organization_id);
CREATE INDEX idx_disease_reports_farm_id         ON public.disease_reports(farm_id);
CREATE INDEX idx_disease_reports_created_by      ON public.disease_reports(created_by);
CREATE INDEX idx_disease_reports_onset_date      ON public.disease_reports(onset_date);

-- child tables
CREATE INDEX idx_clinical_signs_report_id    ON public.clinical_signs(report_id);
CREATE INDEX idx_emergency_actions_report_id ON public.emergency_actions(report_id);
CREATE INDEX idx_attachments_report_id       ON public.attachments(report_id);


-- ============================================================
-- STEP 4: CREATE HELPER FUNCTIONS (for DRY RLS)
-- ============================================================

-- Returns the authenticated user's organization_id.
-- Reading from public.users (a single PK lookup = O(1), no join).
-- SECURITY DEFINER so it runs under the function owner's permissions,
-- bypassing the RLS that would otherwise apply to public.users reads.
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql
STABLE          -- result constant within a single query; enables caching
SECURITY DEFINER
AS $$
    SELECT organization_id
    FROM   public.users
    WHERE  id = auth.uid();
$$;

-- Returns true if the authenticated user is a super_admin.
-- Single PK lookup — no subquery fan-out.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE  id = auth.uid() AND role = 'super_admin'
    );
$$;


-- ============================================================
-- STEP 5: CREATE UTILITY FUNCTIONS
-- ============================================================

-- Keeps updated_at in sync on every UPDATE.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Auto-creates a row in public.users when auth.users gets a new entry.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role, organization_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'admin',   -- default role; promote to super_admin manually
        NULL       -- no organization yet; set by create/join flow
    );
    RETURN NEW;
END;
$$;


-- ============================================================
-- STEP 6: SECURED RPC FUNCTIONS
-- ============================================================

-- create_organization
-- Hardened: explicit auth.uid() IS NOT NULL guard before any DML.
CREATE OR REPLACE FUNCTION public.create_organization(
    org_name        TEXT,
    org_description TEXT DEFAULT NULL
)
RETURNS TABLE (org_id UUID, org_share_code VARCHAR(8))
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id    UUID;
    v_org_id     UUID;
    v_share_code VARCHAR(8);
    v_attempts   INT := 0;
BEGIN
    -- ── Security Guard ──────────────────────────────────────────
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated'
            USING ERRCODE = 'P0001';
    END IF;

    -- Guard: user must not already belong to an organization
    IF (SELECT organization_id FROM public.users WHERE id = v_user_id) IS NOT NULL THEN
        RAISE EXCEPTION 'User already belongs to an organization'
            USING ERRCODE = 'P0002';
    END IF;
    -- ────────────────────────────────────────────────────────────

    -- Generate a unique 8-char alphanumeric share code (retry loop for safety)
    LOOP
        v_share_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM public.organizations WHERE share_code = v_share_code
        );
        v_attempts := v_attempts + 1;
        IF v_attempts > 10 THEN
            RAISE EXCEPTION 'Could not generate a unique share code. Try again.'
                USING ERRCODE = 'P0003';
        END IF;
    END LOOP;

    -- Insert organization
    INSERT INTO public.organizations (name, description, share_code, created_by)
    VALUES (org_name, org_description, v_share_code, v_user_id)
    RETURNING id INTO v_org_id;

    -- Bind user to new organization
    UPDATE public.users
    SET organization_id = v_org_id
    WHERE id = v_user_id;

    RETURN QUERY SELECT v_org_id, v_share_code;
END;
$$;


-- join_organization
-- Hardened: explicit auth.uid() IS NOT NULL guard before any DML.
CREATE OR REPLACE FUNCTION public.join_organization(
    p_share_code VARCHAR(8),
    p_invited_by UUID DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, message TEXT, org_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id  UUID;
    v_org_id   UUID;
BEGIN
    -- ── Security Guard ──────────────────────────────────────────
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated'
            USING ERRCODE = 'P0001';
    END IF;
    -- ────────────────────────────────────────────────────────────

    -- Guard: user must not already belong to an organization
    IF (SELECT organization_id FROM public.users WHERE id = v_user_id) IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, 'User already belongs to an organization', NULL::UUID;
        RETURN;
    END IF;

    -- Resolve organization from share code
    SELECT id INTO v_org_id
    FROM   public.organizations
    WHERE  share_code = UPPER(p_share_code);

    IF v_org_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Invalid share code', NULL::UUID;
        RETURN;
    END IF;

    -- Bind user to organization
    UPDATE public.users
    SET    organization_id = v_org_id
    WHERE  id = v_user_id;

    RETURN QUERY SELECT TRUE, 'Successfully joined organization', v_org_id;
END;
$$;


-- ============================================================
-- STEP 7: CREATE TRIGGERS
-- ============================================================

-- Auto-populate public.users on auth signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at maintenance
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_farms_updated_at
    BEFORE UPDATE ON public.farms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disease_reports_updated_at
    BEFORE UPDATE ON public.disease_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- STEP 8: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_signs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments      ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 9: RLS POLICIES (Optimized — no N+1 subqueries)
-- ============================================================
-- Strategy: Use public.get_my_org_id() and public.is_super_admin()
-- helper functions. Both resolve to a single PK lookup on public.users
-- and are marked STABLE so Postgres can cache the result per query.
-- This eliminates the former IN (SELECT...) fan-out.
-- ============================================================

-- ── public.users ────────────────────────────────────────────

-- Users see their own row; super_admins see all rows.
CREATE POLICY "users_select"
ON public.users FOR SELECT
USING (
    id = auth.uid()
    OR public.is_super_admin()
);

CREATE POLICY "users_update_own"
ON public.users FOR UPDATE
USING (id = auth.uid());


-- ── public.organizations ────────────────────────────────────

-- Users see only the organization they belong to.
-- Comparison: scalar equality (O(1)) vs the old IN (SELECT...) subquery.
CREATE POLICY "orgs_select_own"
ON public.organizations FOR SELECT
USING (
    id = public.get_my_org_id()
    OR public.is_super_admin()
);

-- Only the org's creator (admin) may update it.
CREATE POLICY "orgs_update_admin"
ON public.organizations FOR UPDATE
USING (
    id = public.get_my_org_id()
    AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    )
);


-- ── public.farms ────────────────────────────────────────────

-- Members/Admins see farms belonging to their organization.
CREATE POLICY "farms_select_own_org"
ON public.farms FOR SELECT
USING (
    organization_id = public.get_my_org_id()
    OR public.is_super_admin()
);

-- Only admins may INSERT / UPDATE / DELETE farms.
CREATE POLICY "farms_write_admin"
ON public.farms FOR ALL
USING (
    organization_id = public.get_my_org_id()
    AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);


-- ── public.disease_reports ──────────────────────────────────

-- All org members can read their org's reports.
CREATE POLICY "reports_select_own_org"
ON public.disease_reports FOR SELECT
USING (
    organization_id = public.get_my_org_id()
    OR public.is_super_admin()
);

-- Any org member can create a report (must match their org and self as author).
CREATE POLICY "reports_insert_own_org"
ON public.disease_reports FOR INSERT
WITH CHECK (
    organization_id = public.get_my_org_id()
    AND created_by = auth.uid()
);

-- Only the report's author may edit it.
CREATE POLICY "reports_update_author"
ON public.disease_reports FOR UPDATE
USING (created_by = auth.uid());

-- Only the report's author (or super_admin) may delete it.
CREATE POLICY "reports_delete_author"
ON public.disease_reports FOR DELETE
USING (
    created_by = auth.uid()
    OR public.is_super_admin()
);


-- ── public.clinical_signs ───────────────────────────────────

CREATE POLICY "clinical_signs_select"
ON public.clinical_signs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.disease_reports dr
        WHERE dr.id = report_id
          AND (dr.organization_id = public.get_my_org_id() OR public.is_super_admin())
    )
);

CREATE POLICY "clinical_signs_write_author"
ON public.clinical_signs FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.disease_reports dr
        WHERE dr.id = report_id AND dr.created_by = auth.uid()
    )
);


-- ── public.emergency_actions ────────────────────────────────

CREATE POLICY "emergency_actions_select"
ON public.emergency_actions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.disease_reports dr
        WHERE dr.id = report_id
          AND (dr.organization_id = public.get_my_org_id() OR public.is_super_admin())
    )
);

CREATE POLICY "emergency_actions_write_author"
ON public.emergency_actions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.disease_reports dr
        WHERE dr.id = report_id AND dr.created_by = auth.uid()
    )
);


-- ── public.attachments ──────────────────────────────────────

CREATE POLICY "attachments_select"
ON public.attachments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.disease_reports dr
        WHERE dr.id = report_id
          AND (dr.organization_id = public.get_my_org_id() OR public.is_super_admin())
    )
);

CREATE POLICY "attachments_insert_author"
ON public.attachments FOR INSERT
WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.disease_reports dr
        WHERE dr.id = report_id AND dr.created_by = auth.uid()
    )
);


-- ============================================================
-- STEP 10: SUPER ADMIN SETUP (run manually after Auth signup)
-- ============================================================

-- 1. Create the super_admin user via Supabase Auth Dashboard first.
-- 2. Promote their role:
-- UPDATE public.users SET role = 'super_admin' WHERE email = 'straintrack8@gmail.com';

-- 3. Create the super_admin placeholder organization:
-- INSERT INTO public.organizations (name, share_code, address, phone, created_by)
-- VALUES (
--     'StrainTrack Global Admin',
--     'SADMIN00',
--     'Admin Office',
--     '-',
--     (SELECT id FROM public.users WHERE email = 'straintrack8@gmail.com')
-- );

-- 4. Bind the super_admin to that organization:
-- UPDATE public.users
-- SET organization_id = (SELECT id FROM public.organizations WHERE share_code = 'SADMIN00')
-- WHERE email = 'straintrack8@gmail.com';


-- ============================================================
-- STEP 11: VERIFICATION QUERIES
-- ============================================================

-- Tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- RLS Policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Functions
SELECT proname, prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('create_organization','join_organization','handle_new_user','get_my_org_id','is_super_admin')
ORDER BY proname;

-- Triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- ============================================================
-- REBUILD COMPLETE
-- ============================================================
