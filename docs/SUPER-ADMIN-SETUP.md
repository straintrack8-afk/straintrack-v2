# Super Admin Setup Guide

## Step 1: Create Super Admin User in Supabase Auth

1. **Buka Supabase Dashboard** → **Authentication** → **Users**
2. **Click "Add User"**
3. **Fill form**:
   - **Email**: `straintrack8@gmail.com`
   - **Password**: (your secure password - simpan password ini!)
   - **Auto Confirm User**: ✅ **CHECK THIS BOX**
   - **User Metadata** (click "Show advanced settings"):
     ```json
     {
       "full_name": "Super Admin"
     }
     ```
4. **Click "Create User"**

---

## Step 2: Update User Role to Super Admin

**Buka Supabase Dashboard** → **SQL Editor** → **New Query**

**Copy dan run SQL ini**:

```sql
-- Update user role to super_admin
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'straintrack8@gmail.com';

-- Verify user created
SELECT id, email, full_name, role, organization_id
FROM public.users
WHERE email = 'straintrack8@gmail.com';
```

**Expected Result**: 
- User dengan email `straintrack8@gmail.com`
- Role = `super_admin`
- organization_id = NULL (akan diisi di step berikutnya)

---

## Step 3: Create Super Admin Organization

**Run SQL ini** (masih di SQL Editor):

```sql
-- Create Super Admin Organization
INSERT INTO public.organizations (id, name, share_code, address, phone, created_by)
VALUES (
  '4200094d-e6fc-8acb-a559-95ea0d2d807c',
  'Super Admin Organization',
  'SADMIN',
  'Admin Office',
  '-',
  (SELECT id FROM public.users WHERE email = 'straintrack8@gmail.com')
);

-- Link super admin to organization
UPDATE public.users
SET organization_id = '4200094d-e6fc-8acb-a559-95ea0d2d807c'
WHERE email = 'straintrack8@gmail.com';

-- Add to user_organizations table
INSERT INTO public.user_organizations (user_id, organization_id, role)
VALUES (
  (SELECT id FROM public.users WHERE email = 'straintrack8@gmail.com'),
  '4200094d-e6fc-8acb-a559-95ea0d2d807c',
  'admin'
);

-- Verify everything
SELECT 
  u.id, 
  u.email, 
  u.full_name,
  u.role as user_role, 
  o.name as org_name,
  uo.role as org_role
FROM public.users u
LEFT JOIN public.organizations o ON u.organization_id = o.id
LEFT JOIN public.user_organizations uo ON u.id = uo.user_id
WHERE u.email = 'straintrack8@gmail.com';
```

**Expected Result**:
- Organization "Super Admin Organization" created
- User linked to organization
- Entry in user_organizations table

---

## Step 4: Configure Supabase Auth Settings

### A. URL Configuration

**Supabase Dashboard** → **Authentication** → **URL Configuration**

Update these settings:
- **Site URL**: `http://localhost:3002`
- **Redirect URLs** (add all):
  - `http://localhost:3002/**`
  - `http://localhost:3002/auth/callback`
  - `http://localhost:3002/onboarding`

**Click "Save"**

### B. Email Provider Settings

**Supabase Dashboard** → **Authentication** → **Providers** → **Email**

Update these settings:
- **Enable Email Provider**: ✅ ON
- **Confirm email**: ❌ **DISABLE** (for development)
- **Secure email change**: ✅ ON
- **Double confirm email changes**: ❌ OFF

**Click "Save"**

---

## ✅ Setup Complete!

Super Admin user sudah siap. Setelah aplikasi Next.js selesai dibuat, Anda bisa login dengan:
- **Email**: `straintrack8@gmail.com`
- **Password**: (password yang Anda buat di Step 1)

---

## Next Steps

1. Build Next.js application
2. Setup environment variables (.env.local)
3. Run development server
4. Test super admin login
