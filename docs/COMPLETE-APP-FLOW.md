# StrainTrack - Complete Application Flow Documentation

## Overview
StrainTrack adalah aplikasi untuk tracking dan monitoring strain data di farm/organization. Aplikasi ini mendukung multi-tenancy dengan organization-based access control.

---

## User Roles

### 1. Super Admin
- Email: `straintrack8@gmail.com`
- Role: `super_admin`
- Access: Global view semua organizations
- Can: View all data, manage all organizations

### 2. Organization Admin
- Role: `admin`
- Access: Full access ke organization mereka
- Can: Create reports, manage farms, invite members

### 3. Organization Member
- Role: `member`
- Access: Limited access ke organization mereka
- Can: View reports, create reports (tergantung permission)

---

## Complete User Flow

### A. NEW USER SIGNUP FLOW

```
1. User buka /auth/signup
   ↓
2. User isi form (Full Name, Email, Password)
   ↓
3. Submit → Create account di auth.users
   ↓
4. Database Trigger: on_auth_user_created
   - Auto-create entry di public.users
   - Set role = 'admin'
   - Set organization_id = NULL
   ↓
5. Auto-redirect ke /onboarding
   ↓
6. User pilih:
   - Create New Organization → /organization/create
   - Join Existing Organization → /organization/join
```

#### A1. Create New Organization Flow

```
1. User di /organization/create
   ↓
2. User isi form:
   - Organization Name (required)
   - Description (optional)
   ↓
3. Submit → Call RPC: create_organization()
   ↓
4. RPC Function:
   - Insert ke organizations table
   - Generate unique share_code (8 chars)
   - Update users.organization_id = new_org_id
   - Insert ke user_organizations (role: admin)
   - Return: org_id, share_code
   ↓
5. Show success page dengan share_code
   ↓
6. User klik "Go to Dashboard"
   ↓
7. Redirect ke /dashboard
   ↓
8. Dashboard load:
   - Fetch user organizations
   - Set active organization
   - Show organization name di header
```

#### A2. Join Existing Organization Flow

```
1. User di /organization/join
   ↓
2. User masukkan share_code (8 chars)
   ↓
3. Submit → Call RPC: join_organization()
   ↓
4. RPC Function:
   - Validate share_code exists
   - Update users.organization_id = org_id
   - Insert ke user_organizations (role: member)
   - Return: success, org_id
   ↓
5. Redirect ke /dashboard
   ↓
6. Dashboard load dengan organization baru
```

### B. EXISTING USER LOGIN FLOW

```
1. User buka /login
   ↓
2. User isi email & password
   ↓
3. Submit → Supabase Auth login
   ↓
4. Check user di public.users:
   - If NOT EXISTS → Error: "User not properly configured"
   - If EXISTS → Continue
   ↓
5. Check organization_id:
   - If NULL (no organization):
     → Redirect ke /onboarding
   - If NOT NULL (has organization):
     → Redirect ke /dashboard
   ↓
6. Dashboard load:
   - Fetch user organizations
   - Set active organization
   - Show organization data
```

### C. SUPER ADMIN LOGIN FLOW

```
1. Super Admin login (straintrack8@gmail.com)
   ↓
2. Check role = 'super_admin'
   ↓
3. Redirect ke /dashboard
   ↓
4. Dashboard load:
   - Fetch ALL organizations (not just user's)
   - Show "Super Admin Organization" di dropdown
   - Can switch between organizations
   - Global view of all data
```

---

## Database Schema

### Core Tables

#### 1. auth.users (Supabase Auth)
```sql
- id: UUID (PK)
- email: VARCHAR
- encrypted_password: VARCHAR
- email_confirmed_at: TIMESTAMP
- created_at: TIMESTAMP
- raw_user_meta_data: JSONB
  - full_name: TEXT
```

#### 2. public.users
```sql
- id: UUID (PK, FK to auth.users.id)
- email: VARCHAR (UNIQUE)
- full_name: VARCHAR
- role: VARCHAR ('admin', 'member', 'super_admin')
- organization_id: UUID (FK to organizations.id, NULLABLE)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 3. organizations
```sql
- id: UUID (PK)
- name: VARCHAR(255) (UNIQUE)
- description: TEXT
- share_code: VARCHAR(8) (UNIQUE)
- address: TEXT
- phone: VARCHAR
- created_by: UUID (FK to users.id)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 4. user_organizations (Junction Table)
```sql
- id: UUID (PK)
- user_id: UUID (FK to users.id)
- organization_id: UUID (FK to organizations.id)
- role: VARCHAR ('admin', 'member')
- joined_at: TIMESTAMP
- UNIQUE(user_id, organization_id)
```

### Supporting Tables

#### 5. farms
```sql
- id: UUID (PK)
- organization_id: UUID (FK to organizations.id)
- name: VARCHAR
- location: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 6. disease_reports
```sql
- id: UUID (PK)
- organization_id: UUID (FK to organizations.id)
- farm_id: UUID (FK to farms.id)
- created_by: UUID (FK to users.id)
- animal_species: VARCHAR
- disease_name: VARCHAR
- onset_date: DATE
- sick_count: INTEGER
- death_count: INTEGER
- ... (22 fields total)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

---

## Database Triggers

### 1. on_auth_user_created
**Purpose**: Auto-create user di public.users saat signup

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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## RPC Functions

### 1. create_organization
**Purpose**: Create organization dan link user sebagai admin

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
  VALUES (current_user_id, new_org_id, 'admin');

  RETURN QUERY SELECT new_org_id, new_share_code;
END;
$$;
```

### 2. join_organization
**Purpose**: Join existing organization menggunakan share code

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

---

## Row Level Security (RLS) Policies

### users table
```sql
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data"
ON public.users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
ON public.users FOR UPDATE
USING (auth.uid() = id);
```

### organizations table
```sql
-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

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
```

### disease_reports table
```sql
-- Enable RLS
ALTER TABLE public.disease_reports ENABLE ROW LEVEL SECURITY;

-- Users can read reports from their organization
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
```

---

## Frontend Components

### Key Files

#### 1. `/app/auth/signup/page.tsx`
- Signup form
- Auto-logout existing session on load
- Create user via Supabase Auth
- Redirect to /onboarding after success

#### 2. `/app/login/page.tsx`
- Login form
- Check user exists in public.users
- Redirect based on organization_id:
  - NULL → /onboarding
  - NOT NULL → /dashboard

#### 3. `/app/onboarding/page.tsx`
- Show 2 options:
  - Create Organization
  - Join Organization

#### 4. `/app/organization/create/page.tsx`
- Create organization form
- Call createOrganization() RPC
- Show share code
- Redirect to /dashboard

#### 5. `/app/organization/join/page.tsx`
- Join organization form
- Enter share code
- Call joinOrganization() RPC
- Redirect to /dashboard

#### 6. `/app/dashboard/page.tsx`
- Main dashboard
- Show organization selector
- Display organization data
- Check user has organization

---

## Common Issues & Solutions

### Issue 1: "User account not properly configured"
**Cause**: User exists in auth.users but not in public.users
**Solution**: 
- Ensure trigger on_auth_user_created exists and active
- Manually insert user if needed

### Issue 2: "No organization" shown after creating organization
**Cause**: create_organization RPC not updating users.organization_id
**Solution**:
- Fix RPC function to update users.organization_id
- Insert into user_organizations table

### Issue 3: Organization name conflict
**Cause**: Organization name already exists (unique constraint)
**Solution**:
- Use different organization name
- Clean up test data

### Issue 4: Email confirmation not received
**Cause**: Supabase email rate limit or SMTP issue
**Solution**:
- Disable email confirmation for development
- Use manual confirmation via SQL
- Configure custom SMTP for production

---

## Development Setup Checklist

### 1. Supabase Configuration
- [ ] Site URL: `http://localhost:3002`
- [ ] Redirect URLs: `http://localhost:3002/**`
- [ ] Email confirmation: DISABLED (for development)
- [ ] RLS: ENABLED on all tables

### 2. Database Setup
- [ ] Run schema migration (tables, indexes)
- [ ] Create trigger: on_auth_user_created
- [ ] Create RPC: create_organization
- [ ] Create RPC: join_organization
- [ ] Setup RLS policies
- [ ] Create super admin user

### 3. Test Data
- [ ] Super Admin: straintrack8@gmail.com
- [ ] Super Admin Organization (id: 4200094de-6fc8-4acb-a559-95ea0d2d807)
- [ ] Test user accounts
- [ ] Test organizations

---

## Testing Checklist

### Signup Flow
- [ ] Signup with new email
- [ ] User created in auth.users
- [ ] User auto-created in public.users (via trigger)
- [ ] Redirect to /onboarding
- [ ] Create organization
- [ ] Organization created in database
- [ ] User organization_id updated
- [ ] Entry created in user_organizations
- [ ] Redirect to /dashboard
- [ ] Dashboard shows organization name

### Login Flow
- [ ] Login with existing user (has organization)
- [ ] Redirect to /dashboard
- [ ] Dashboard shows correct organization
- [ ] Login with user (no organization)
- [ ] Redirect to /onboarding

### Super Admin Flow
- [ ] Login as super admin
- [ ] Can view all organizations
- [ ] Can switch between organizations
- [ ] Global view works

---

## Next Steps for Clean Rebuild

1. **Backup current database** (export data if needed)
2. **Drop and recreate tables** (clean slate)
3. **Run all SQL scripts** in order:
   - Schema creation
   - Triggers
   - RPC functions
   - RLS policies
4. **Create super admin user**
5. **Test signup flow** with new user
6. **Test login flow** with existing user
7. **Test super admin flow**

---

**Last Updated**: 2026-01-07
**Status**: Ready for clean rebuild
