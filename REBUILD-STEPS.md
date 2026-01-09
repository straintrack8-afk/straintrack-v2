# StrainTrack - Step-by-Step Rebuild Guide

## Prerequisites
- Supabase project active
- Local development server running (`npm run dev`)
- Access to Supabase SQL Editor
- Backup of current data (if needed)

---

## Phase 1: Database Clean Rebuild

### Step 1: Run Clean Rebuild SQL Script

1. **Open Supabase Dashboard** → **SQL Editor**
2. **Copy entire content** dari file `CLEAN-REBUILD.sql`
3. **Paste** ke SQL Editor
4. **Run** script (ini akan drop semua tables dan recreate dari awal)
5. **Verify** tidak ada error
6. **Check verification queries** di akhir script untuk confirm semua ter-create

**Expected Result:**
- ✅ All tables created
- ✅ All indexes created
- ✅ All triggers created
- ✅ All RPC functions created
- ✅ All RLS policies created

---

### Step 2: Create Super Admin User

#### 2a. Create in Supabase Auth

1. **Supabase Dashboard** → **Authentication** → **Users**
2. **Click "Add User"**
3. Fill form:
   - **Email**: `straintrack8@gmail.com`
   - **Password**: (your secure password)
   - **Auto Confirm User**: ✅ CHECK THIS
   - **User Metadata**: 
     ```json
     {
       "full_name": "Super Admin"
     }
     ```
4. **Click "Create User"**

#### 2b. Update User Role to Super Admin

**Run this SQL:**

```sql
-- Update user role to super_admin
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'straintrack8@gmail.com';

-- Verify
SELECT id, email, full_name, role, organization_id
FROM public.users
WHERE email = 'straintrack8@gmail.com';
```

**Expected Result:**
- ✅ User exists in `public.users`
- ✅ Role = `super_admin`
- ✅ organization_id = NULL (will be set in next step)

---

### Step 3: Create Super Admin Organization

**Run this SQL:**

```sql
-- Get super admin user ID
SELECT id FROM public.users WHERE email = 'straintrack8@gmail.com';

-- Create Super Admin Organization (ganti USER_ID dengan ID dari query di atas)
INSERT INTO public.organizations (id, name, share_code, address, phone, created_by)
VALUES (
  '4200094de-6fc8-4acb-a559-95ea0d2d807c',
  'Super Admin Organization',
  'SADMIN',
  'Admin Office',
  '-',
  'USER_ID_DARI_QUERY_DI_ATAS'  -- Ganti dengan actual user ID
);

-- Update super admin user organization_id
UPDATE public.users
SET organization_id = '4200094de-6fc8-4acb-a559-95ea0d2d807c'
WHERE email = 'straintrack8@gmail.com';

-- Insert into user_organizations
INSERT INTO public.user_organizations (user_id, organization_id, role)
VALUES (
  (SELECT id FROM public.users WHERE email = 'straintrack8@gmail.com'),
  '4200094de-6fc8-4acb-a559-95ea0d2d807c',
  'admin'
);

-- Verify
SELECT u.id, u.email, u.role, u.organization_id, o.name as org_name
FROM public.users u
LEFT JOIN public.organizations o ON u.organization_id = o.id
WHERE u.email = 'straintrack8@gmail.com';
```

**Expected Result:**
- ✅ Super Admin Organization created
- ✅ Super admin user linked to organization
- ✅ Entry in user_organizations table

---

## Phase 2: Configure Supabase Settings

### Step 4: Update Supabase Auth Settings

**Supabase Dashboard** → **Authentication** → **URL Configuration**:

1. **Site URL**: `http://localhost:3002`
2. **Redirect URLs**: Add these:
   - `http://localhost:3002/**`
   - `http://localhost:3002/auth/callback`
   - `http://localhost:3002/auth/update-password`
   - `http://localhost:3002/onboarding`
3. **Save changes**

**Supabase Dashboard** → **Authentication** → **Providers** → **Email**:

1. **Confirm email**: DISABLE (for development)
2. **Save changes**

**Expected Result:**
- ✅ Site URL = `http://localhost:3002`
- ✅ Redirect URLs configured
- ✅ Email confirmation disabled

---

## Phase 3: Test Flows

### Step 5: Test Super Admin Login

1. **Open browser** → `http://localhost:3002/login`
2. **Login** with:
   - Email: `straintrack8@gmail.com`
   - Password: (your password)
3. **Expected**: Redirect to `/dashboard`
4. **Verify**:
   - ✅ Dashboard loads
   - ✅ Header shows "Super Admin Organization"
   - ✅ No errors in console

---

### Step 6: Test New User Signup Flow

#### 6a. Signup

1. **Logout** dari super admin
2. **Open** `http://localhost:3002/auth/signup`
3. **Fill form**:
   - Full Name: Test User
   - Email: testuser@example.com
   - Password: testpass123
4. **Submit**
5. **Expected**: Redirect to `/onboarding`
6. **Verify in Supabase**:
   ```sql
   -- Check user created in auth.users
   SELECT id, email, email_confirmed_at
   FROM auth.users
   WHERE email = 'testuser@example.com';
   
   -- Check user created in public.users (via trigger)
   SELECT id, email, full_name, role, organization_id
   FROM public.users
   WHERE email = 'testuser@example.com';
   ```
7. **Expected**:
   - ✅ User in auth.users
   - ✅ User in public.users
   - ✅ role = 'admin'
   - ✅ organization_id = NULL

#### 6b. Create Organization

1. **On onboarding page**, click "Create Organization"
2. **Fill form**:
   - Organization Name: Test Organization 2026
   - Description: (optional)
3. **Submit**
4. **Expected**: Success page with share code
5. **Click** "Go to Dashboard"
6. **Expected**: Redirect to `/dashboard`
7. **Verify**:
   - ✅ Dashboard loads
   - ✅ Header shows "Test Organization 2026"
   - ✅ No "No organization" message
8. **Verify in Supabase**:
   ```sql
   -- Check organization created
   SELECT id, name, share_code, created_by
   FROM public.organizations
   WHERE name = 'Test Organization 2026';
   
   -- Check user updated
   SELECT id, email, organization_id
   FROM public.users
   WHERE email = 'testuser@example.com';
   
   -- Check user_organizations entry
   SELECT user_id, organization_id, role
   FROM public.user_organizations
   WHERE user_id = (SELECT id FROM public.users WHERE email = 'testuser@example.com');
   ```
9. **Expected**:
   - ✅ Organization created
   - ✅ User organization_id updated
   - ✅ Entry in user_organizations

---

### Step 7: Test Existing User Login

1. **Logout** dari test user
2. **Login** with:
   - Email: testuser@example.com
   - Password: testpass123
3. **Expected**: Redirect to `/dashboard` (not /onboarding)
4. **Verify**:
   - ✅ Dashboard loads
   - ✅ Shows "Test Organization 2026"
   - ✅ Can access all features

---

### Step 8: Test Join Organization Flow

#### 8a. Create Second User

1. **Logout**
2. **Signup** with new email: testuser2@example.com
3. **Expected**: Redirect to `/onboarding`

#### 8b. Join Existing Organization

1. **On onboarding page**, click "Join Organization"
2. **Get share code** from first user's organization:
   ```sql
   SELECT share_code FROM public.organizations WHERE name = 'Test Organization 2026';
   ```
3. **Enter share code** in form
4. **Submit**
5. **Expected**: Redirect to `/dashboard`
6. **Verify**:
   - ✅ Dashboard shows "Test Organization 2026"
   - ✅ User can see organization data
7. **Verify in Supabase**:
   ```sql
   -- Check user updated
   SELECT id, email, organization_id
   FROM public.users
   WHERE email = 'testuser2@example.com';
   
   -- Check user_organizations entry
   SELECT user_id, organization_id, role
   FROM public.user_organizations
   WHERE user_id = (SELECT id FROM public.users WHERE email = 'testuser2@example.com');
   ```
8. **Expected**:
   - ✅ User organization_id updated
   - ✅ Entry in user_organizations with role = 'member'

---

## Phase 4: Test Core Features

### Step 9: Test Create Farm

1. **Login** as test user (admin)
2. **Navigate** to `/farms`
3. **Click** "Add Farm"
4. **Fill form** and submit
5. **Verify**:
   - ✅ Farm created
   - ✅ Farm visible in list
   - ✅ Farm linked to organization

---

### Step 10: Test Create Disease Report

1. **Navigate** to `/reports/new`
2. **Fill form** with all required fields
3. **Submit**
4. **Verify**:
   - ✅ Report created
   - ✅ Report visible in `/reports`
   - ✅ Report linked to organization and farm

---

## Troubleshooting

### Issue: "User account not properly configured"
**Cause**: User not in public.users
**Solution**:
```sql
-- Check if trigger is active
SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';

-- If trigger missing, recreate it (see CLEAN-REBUILD.sql)
```

### Issue: "No organization" after creating organization
**Cause**: create_organization RPC not updating user
**Solution**:
```sql
-- Check if RPC function exists
SELECT proname, prosrc FROM pg_proc WHERE proname = 'create_organization';

-- If missing or wrong, recreate it (see CLEAN-REBUILD.sql)
```

### Issue: Organization name conflict
**Cause**: Organization name already exists
**Solution**: Use different organization name or clean up test data

### Issue: RLS blocking access
**Cause**: RLS policies too restrictive
**Solution**:
```sql
-- Temporarily disable RLS for debugging
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- Re-enable after fixing
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
```

---

## Success Criteria

### ✅ All Tests Pass:
- [ ] Super admin can login
- [ ] Super admin can view all organizations
- [ ] New user can signup
- [ ] Trigger creates user in public.users
- [ ] User can create organization
- [ ] RPC updates user organization_id
- [ ] User can see organization in dashboard
- [ ] Existing user can login
- [ ] User redirects to dashboard (not onboarding)
- [ ] Second user can join organization
- [ ] Users can create farms
- [ ] Users can create disease reports
- [ ] RLS policies work correctly

### ✅ No Errors:
- [ ] No console errors
- [ ] No SQL errors
- [ ] No authentication errors
- [ ] No RLS policy errors

---

## Next Steps After Successful Rebuild

1. **Deploy to production** (update Site URL to production domain)
2. **Enable email confirmation** for production
3. **Setup custom SMTP** for reliable email delivery
4. **Add more test data** for realistic testing
5. **Implement additional features**

---

**Last Updated**: 2026-01-07
**Status**: Ready for execution
