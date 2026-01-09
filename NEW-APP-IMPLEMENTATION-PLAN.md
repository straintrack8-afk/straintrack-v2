# StrainTrack - New App Implementation Plan
**Complete Guide for Building from Scratch**

---

## Table of Contents
1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Database Schema](#database-schema)
4. [Authentication & Authorization](#authentication--authorization)
5. [Feature Implementation](#feature-implementation)
6. [Testing Checklist](#testing-checklist)
7. [Deployment](#deployment)

---

## Overview

### Application Purpose
StrainTrack is a multi-tenant disease surveillance system for veterinary organizations to track and manage disease outbreaks in farms.

### User Roles
1. **Super Admin** - Full system access, can view all organizations
2. **Organization Admin** - Manage organization settings, members, farms, and reports
3. **Organization Member** - View and create reports within their organization

### Core Features
1. ✅ Super Admin role and display
2. ❌ New user onboarding (signup → create/join org → dashboard)
3. ✅ Dashboard display
4. ✅ Farms management
5. ✅ Disease reports submission
6. ⏳ Map view (not yet built)
7. ✅ Settings page

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components + shadcn/ui
- **Icons**: Lucide React
- **State Management**: React Context API

### Backend
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **API**: Supabase Client (RPC functions)

### Development Tools
- **Package Manager**: npm
- **Dev Server**: Next.js dev server (port 3002)
- **Database GUI**: Supabase Dashboard

---

## Database Schema

### 1. Core Tables

#### `public.users`
Extends `auth.users` with application-specific data.

```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'admin' 
        CHECK (role IN ('admin', 'member', 'super_admin')),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_organization_id ON public.users(organization_id);
```

**Key Points:**
- `id` matches `auth.users.id` (auto-created via trigger)
- `role` defaults to `'admin'` for new users
- `organization_id` is NULL until user creates/joins organization
- Super admin email: `straintrack8@gmail.com`

---

#### `public.organizations`
Stores organization data.

```sql
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

CREATE INDEX idx_organizations_share_code ON public.organizations(share_code);
CREATE INDEX idx_organizations_name ON public.organizations(LOWER(name));
```

**Key Points:**
- `share_code` is 8-character unique code for joining organization
- `name` must be unique (case-insensitive check recommended)
- `created_by` tracks who created the organization

---

#### `public.user_organizations`
Junction table for many-to-many relationship between users and organizations.

```sql
CREATE TABLE public.user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' 
        CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_user_organizations_user_id ON public.user_organizations(user_id);
CREATE INDEX idx_user_organizations_org_id ON public.user_organizations(organization_id);
```

**Key Points:**
- Tracks which users belong to which organizations
- `role` is organization-specific (different from `users.role`)
- Creator of organization gets `'admin'` role

---

#### `public.farms`
Stores farm data for each organization.

```sql
CREATE TABLE public.farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_name VARCHAR(255) NOT NULL,
    location TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_farms_organization_id ON public.farms(organization_id);
```

**Key Points:**
- Each farm belongs to one organization
- Latitude/longitude for map view
- Farm name is NOT globally unique (only within organization)

---

#### `public.disease_reports`
Main table for disease outbreak reports.

```sql
CREATE TABLE public.disease_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.users(id),
    
    -- Basic Info
    animal_type VARCHAR(50) NOT NULL CHECK (animal_type IN ('Poultry', 'Swine')),
    category VARCHAR(100),
    animal_category VARCHAR(100),
    animal_subcategory VARCHAR(100),
    outbreak_location TEXT,
    total_population INTEGER,
    age_stage VARCHAR(50),
    
    -- Disease Info
    reported_date DATE NOT NULL,
    onset_date DATE,
    disease_name VARCHAR(255) NOT NULL,
    strain_subtype VARCHAR(100),
    severity VARCHAR(50) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    pathology_findings TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'monitoring')),
    
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

CREATE INDEX idx_disease_reports_organization_id ON public.disease_reports(organization_id);
CREATE INDEX idx_disease_reports_farm_id ON public.disease_reports(farm_id);
CREATE INDEX idx_disease_reports_created_by ON public.disease_reports(created_by);
CREATE INDEX idx_disease_reports_reported_date ON public.disease_reports(reported_date);
```

**Key Points:**
- Comprehensive 22-field form
- `animal_type` determines which clinical signs are available
- `status` for tracking outbreak lifecycle
- Morbidity/mortality rates auto-calculated on frontend

---

#### `public.clinical_signs`
Stores clinical signs for each report (many-to-many).

```sql
CREATE TABLE public.clinical_signs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.disease_reports(id) ON DELETE CASCADE,
    sign_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clinical_signs_report_id ON public.clinical_signs(report_id);
```

---

#### `public.emergency_actions`
Stores emergency actions taken for each report.

```sql
CREATE TABLE public.emergency_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.disease_reports(id) ON DELETE CASCADE,
    action_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emergency_actions_report_id ON public.emergency_actions(report_id);
```

---

#### `public.attachments`
Stores file attachments for reports.

```sql
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

CREATE INDEX idx_attachments_report_id ON public.attachments(report_id);
```

**Key Points:**
- `storage_path` points to Supabase Storage bucket
- Files stored in `disease-report-attachments` bucket

---

### 2. Database Triggers

#### Auto-create user in `public.users` when signup

```sql
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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Critical:** This trigger MUST be active for signup to work properly.

---

#### Auto-update `updated_at` timestamp

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
```

---

### 3. RPC Functions

#### Create Organization

```sql
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
  VALUES (current_user_id, new_org_id, 'admin')
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  RETURN QUERY SELECT new_org_id, new_share_code;
END;
$$;
```

**Critical Steps:**
1. Generate unique share code
2. Insert organization
3. **Update user's `organization_id`** (this is often missed!)
4. Insert into `user_organizations` with `'admin'` role

---

#### Join Organization

```sql
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
```

**Critical Steps:**
1. Validate share code
2. **Update user's `organization_id`**
3. Insert into `user_organizations` with `'member'` role

---

### 4. Row Level Security (RLS) Policies

#### Enable RLS on all tables

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
```

---

#### Users Table Policies

```sql
-- Users can read own data
CREATE POLICY "Users can read own data"
ON public.users FOR SELECT
USING (auth.uid() = id);

-- Users can update own data
CREATE POLICY "Users can update own data"
ON public.users FOR UPDATE
USING (auth.uid() = id);
```

---

#### Organizations Table Policies

```sql
-- Users can read organizations they belong to
CREATE POLICY "Users can read own organizations"
ON public.organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Super admins can read all organizations
CREATE POLICY "Super admins can read all organizations"
ON public.organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Admins can update own organizations
CREATE POLICY "Admins can update own organizations"
ON public.organizations FOR UPDATE
USING (
  id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

---

#### Disease Reports Table Policies

```sql
-- Users can read reports in their organization
CREATE POLICY "Users can read own org reports"
ON public.disease_reports FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Super admins can read all reports
CREATE POLICY "Super admins can read all reports"
ON public.disease_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Users can create reports in their organization
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

-- Users can update own reports
CREATE POLICY "Users can update own reports"
ON public.disease_reports FOR UPDATE
USING (created_by = auth.uid());
```

---

## Authentication & Authorization

### 1. Supabase Auth Configuration

**Settings → Authentication → URL Configuration:**
- **Site URL**: `http://localhost:3002` (dev) or `https://yourdomain.com` (prod)
- **Redirect URLs**:
  - `http://localhost:3002/**`
  - `http://localhost:3002/auth/callback`
  - `http://localhost:3002/auth/update-password`
  - `http://localhost:3002/onboarding`

**Settings → Authentication → Providers → Email:**
- **Enable Email Provider**: ✅
- **Confirm email**: ❌ DISABLED (for development)
- **Secure email change**: ✅
- **Double confirm email changes**: ❌

---

### 2. User Roles & Permissions

#### Super Admin
- **Email**: `straintrack8@gmail.com`
- **Role**: `super_admin` in `public.users.role`
- **Permissions**:
  - View all organizations
  - View all reports (global view)
  - Access admin panel
  - Cannot be restricted by RLS

#### Organization Admin
- **Role**: `admin` in `public.user_organizations.role`
- **Permissions**:
  - Manage organization settings
  - Invite/remove members
  - Promote/demote members
  - Create/edit farms
  - Create/edit reports

#### Organization Member
- **Role**: `member` in `public.user_organizations.role`
- **Permissions**:
  - View organization data
  - Create reports
  - Edit own reports
  - Cannot manage organization or members

---

### 3. Frontend Auth Checks

#### Check if user is Super Admin

```typescript
const SUPER_ADMIN_EMAILS = new Set([
  'straintrack8@gmail.com',
])

const isSuperAdmin = (email: string) => {
  return SUPER_ADMIN_EMAILS.has(email.toLowerCase())
}
```

#### Check if user is Organization Admin

```typescript
const isOrgAdmin = (userOrgs: any[], orgId: string) => {
  const membership = userOrgs.find(o => o.id === orgId)
  return membership?.role === 'admin'
}
```

---

## Feature Implementation

### 1. Super Admin Role and Display ✅

#### Requirements
- Super admin can view all organizations
- Super admin can view all reports (global view)
- Super admin has access to admin panel
- Super admin email: `straintrack8@gmail.com`

#### Implementation

**Frontend Check:**
```typescript
// In any component
const SUPER_ADMIN_EMAILS = new Set(['straintrack8@gmail.com'])

const [isSuperAdmin, setIsSuperAdmin] = useState(false)

useEffect(() => {
  const checkSuperAdmin = async () => {
    const { data } = await supabase.auth.getUser()
    const email = data.user?.email?.toLowerCase() || ''
    setIsSuperAdmin(SUPER_ADMIN_EMAILS.has(email))
  }
  checkSuperAdmin()
}, [])
```

**Database Setup:**
```sql
-- Set user as super admin
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'straintrack8@gmail.com';
```

**Display Logic:**
- Show "Super Admin View (All Organizations)" in dashboard title
- Show "Organizations" tab in dashboard
- Show admin panel link in settings
- Allow viewing all reports without organization filter

---

### 2. New User Onboarding ❌ **CRITICAL - NOT WORKING**

#### Requirements
1. User signs up → Auto-created in `public.users` via trigger
2. User redirected to `/onboarding`
3. User chooses "Create Organization" or "Join Organization"
4. After creating/joining → User's `organization_id` updated
5. User redirected to `/dashboard`
6. Dashboard shows organization name (NOT "No organization")

#### Current Issues
- ❌ Trigger `on_auth_user_created` may not be active
- ❌ RPC `create_organization` may not update `user.organization_id`
- ❌ User sees "No organization" after creating organization
- ❌ Button "Join/Create Organization" still shows after user has organization

#### Implementation Steps

**Step 1: Verify Trigger Exists**
```sql
-- Check if trigger exists
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- If not exists, create it (see Database Triggers section)
```

**Step 2: Verify RPC Function**
```sql
-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'create_organization';

-- If not exists or wrong, recreate it (see RPC Functions section)
```

**Step 3: Test Signup Flow**
```sql
-- After signup, check if user created in public.users
SELECT id, email, full_name, role, organization_id
FROM public.users
WHERE email = 'newuser@example.com';

-- Should return:
-- - id: matches auth.users.id
-- - email: newuser@example.com
-- - role: admin
-- - organization_id: NULL (until they create/join org)
```

**Step 4: Test Create Organization**
```sql
-- After creating organization, check if user updated
SELECT u.id, u.email, u.organization_id, o.name as org_name
FROM public.users u
LEFT JOIN public.organizations o ON u.organization_id = o.id
WHERE u.email = 'newuser@example.com';

-- Should return:
-- - organization_id: NOT NULL
-- - org_name: (the organization name they created)
```

**Step 5: Frontend Redirect Logic**

`app/auth/signup/page.tsx`:
```typescript
// After successful signup
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName,
    },
  },
})

if (!error && data.user) {
  // Redirect to onboarding
  router.push('/onboarding')
}
```

`app/organization/create/page.tsx`:
```typescript
// After successful organization creation
const result = await createOrganization(orgName, orgDescription)

if (result.success) {
  // Show success message with share code
  setCreatedShareCode(result.share_code)
  
  // User clicks "Go to Dashboard" button
  // Redirect to /dashboard
}
```

`app/dashboard/page.tsx`:
```typescript
// Check if user has organization
const showNoOrg = !orgLoading && !currentOrganization && (!myOrgs || myOrgs.length === 0)

if (showNoOrg) {
  // Show "Join or Create Organization" buttons
} else {
  // Show dashboard content with organization name
}
```

---

### 3. Dashboard Display ✅

#### Requirements
- Show organization name in header
- Show stats: Total Members, Total Farms, Total Reports, Active Outbreaks
- Show recent reports table
- Show tabs: Overview, Members, Analytics
- Super admin sees "Organizations" tab

#### Implementation
- ✅ Organization name displayed correctly
- ✅ Stats cards working
- ✅ Recent reports table working
- ✅ Tabs working
- ✅ Super admin sees Organizations tab

---

### 4. Farms Management ✅

#### Requirements
- List all farms in organization
- Add new farm with name, location, lat/long
- Edit farm details
- Delete farm
- Search/filter farms

#### Implementation
- ✅ Farm list page working
- ✅ Add farm form working
- ✅ Edit farm working
- ✅ Delete farm working
- ✅ RLS policies working

---

### 5. Disease Reports Submission ✅

#### Requirements
- 22-field comprehensive form
- Dynamic clinical signs based on animal type
- Auto-calculate morbidity/mortality rates
- Upload attachments
- Submit to database with related tables

#### Implementation
- ✅ 22-field form working
- ✅ Clinical signs checkboxes dynamic
- ✅ Auto-calculation working
- ✅ File upload working
- ✅ Submission to all tables working
- ✅ RLS policies working

---

### 6. Map View ⏳ **NOT YET BUILT**

#### Requirements
- Show all farms on map (Google Maps or Mapbox)
- Show disease reports as markers
- Color-code by severity
- Click marker to see report details
- Filter by date range, disease, severity

#### Implementation Plan

**Step 1: Choose Map Library**
- Option A: Google Maps API (requires API key)
- Option B: Mapbox (requires API key)
- Option C: Leaflet (open source, no API key)

**Recommendation**: Leaflet + OpenStreetMap (free, no API key)

**Step 2: Install Dependencies**
```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

**Step 3: Create Map Component**
```typescript
// components/DiseaseMap.tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export default function DiseaseMap({ reports }: { reports: any[] }) {
  return (
    <MapContainer 
      center={[0, 0]} 
      zoom={2} 
      style={{ height: '600px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {reports.map(report => (
        <Marker 
          key={report.id} 
          position={[report.farm.latitude, report.farm.longitude]}
        >
          <Popup>
            <div>
              <h3>{report.disease_name}</h3>
              <p>Farm: {report.farm.farm_name}</p>
              <p>Severity: {report.severity}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
```

**Step 4: Create Map Page**
```typescript
// app/map/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import DiseaseMap from '@/components/DiseaseMap'

export default function MapPage() {
  const [reports, setReports] = useState([])

  useEffect(() => {
    const loadReports = async () => {
      const { data } = await supabase
        .from('disease_reports')
        .select(`
          *,
          farm:farms(farm_name, latitude, longitude)
        `)
        .not('farm.latitude', 'is', null)
        .not('farm.longitude', 'is', null)
      
      setReports(data || [])
    }
    loadReports()
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Disease Map</h1>
        <DiseaseMap reports={reports} />
      </div>
    </main>
  )
}
```

**Step 5: Add Severity Color Coding**
```typescript
const getSeverityColor = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'red'
    case 'high': return 'orange'
    case 'medium': return 'yellow'
    case 'low': return 'green'
    default: return 'gray'
  }
}
```

---

### 7. Settings Page ✅

#### Requirements
- Organization tab: Edit name, description, view share code
- Members tab: List members, promote/demote, remove
- Preferences tab: Language, date format, timezone
- Account tab: Email, password, delete account

#### Implementation
- ✅ Organization tab working
- ✅ Members tab working
- ✅ Share code regeneration working
- ✅ Promote/demote members working
- ✅ Remove members working
- ⏳ Preferences tab (UI only, not functional)
- ⏳ Account tab (UI only, not functional)

---

## Testing Checklist

### Pre-Deployment Testing

#### 1. Database Setup
- [ ] All tables created
- [ ] All indexes created
- [ ] All triggers active
- [ ] All RPC functions created
- [ ] All RLS policies enabled
- [ ] Super admin user created
- [ ] Super admin organization created

#### 2. Authentication
- [ ] Signup creates user in `auth.users`
- [ ] Trigger creates user in `public.users`
- [ ] User role defaults to `'admin'`
- [ ] User `organization_id` is NULL initially
- [ ] Login redirects to `/onboarding` if no organization
- [ ] Login redirects to `/dashboard` if has organization

#### 3. Onboarding Flow
- [ ] Signup → Redirect to `/onboarding`
- [ ] Create organization → User `organization_id` updated
- [ ] Create organization → Entry in `user_organizations` with `'admin'` role
- [ ] Create organization → Redirect to `/dashboard`
- [ ] Dashboard shows organization name (not "No organization")
- [ ] Join organization → User `organization_id` updated
- [ ] Join organization → Entry in `user_organizations` with `'member'` role

#### 4. Dashboard
- [ ] Organization name displayed in header
- [ ] Stats cards show correct numbers
- [ ] Recent reports table shows data
- [ ] Tabs switch correctly
- [ ] Super admin sees "Organizations" tab
- [ ] No "Join/Create Organization" buttons if user has org

#### 5. Farms
- [ ] List farms in organization
- [ ] Add new farm
- [ ] Edit farm
- [ ] Delete farm
- [ ] RLS prevents viewing other org's farms

#### 6. Reports
- [ ] 22-field form loads
- [ ] Clinical signs change based on animal type
- [ ] Morbidity/mortality auto-calculated
- [ ] Submit report creates entries in all tables
- [ ] File upload works
- [ ] RLS prevents viewing other org's reports

#### 7. Settings
- [ ] Organization tab shows correct data
- [ ] Edit organization name/description
- [ ] Regenerate share code
- [ ] Members tab lists all members
- [ ] Promote/demote members
- [ ] Remove members
- [ ] No "Join/Create Organization" buttons if user has org

#### 8. Super Admin
- [ ] Super admin can view all organizations
- [ ] Super admin can view all reports
- [ ] Super admin sees "Organizations" tab
- [ ] Super admin can access admin panel

---

## Deployment

### 1. Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Build and Deploy

**Local Build:**
```bash
npm run build
npm run start
```

**Deploy to Netlify:**
1. Connect GitHub repo
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables
5. Deploy

**Update Supabase URLs:**
- Site URL: `https://yourdomain.netlify.app`
- Redirect URLs: `https://yourdomain.netlify.app/**`

---

## Common Issues & Solutions

### Issue: User not created in `public.users` after signup
**Cause**: Trigger `on_auth_user_created` not active
**Solution**: Run trigger creation SQL (see Database Triggers section)

### Issue: "No organization" after creating organization
**Cause**: RPC `create_organization` not updating `user.organization_id`
**Solution**: Recreate RPC function (see RPC Functions section)

### Issue: "Organization name already taken"
**Cause**: Organization name must be unique
**Solution**: Use different name or add organization ID suffix

### Issue: RLS blocking access to data
**Cause**: RLS policies too restrictive
**Solution**: Check user is in `user_organizations` table

### Issue: Button "Join/Create Organization" still shows
**Cause**: Frontend not checking if user has organizations
**Solution**: Check `myOrgs.length > 0` before showing buttons

---

## Summary

This implementation plan provides a complete guide for building StrainTrack from scratch with:

1. ✅ **Complete database schema** with all tables, triggers, RPC functions, and RLS policies
2. ✅ **Authentication & authorization** setup with Supabase Auth
3. ✅ **Feature implementation** guides for all 7 core features
4. ✅ **Testing checklist** to verify everything works
5. ✅ **Deployment guide** for production

**Critical Focus Areas:**
- ❌ **New User Onboarding** - This is the main issue that needs fixing
  - Verify trigger `on_auth_user_created` is active
  - Verify RPC `create_organization` updates `user.organization_id`
  - Test complete signup → create org → dashboard flow

**Next Steps:**
1. Use this plan to build new app from scratch
2. Follow testing checklist step-by-step
3. Fix onboarding flow issues before moving to other features
4. Build Map View feature (currently missing)

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-07  
**Status**: Ready for implementation
