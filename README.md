# StrainTrack V2 - Disease Surveillance System

Multi-tenant disease surveillance system for veterinary organizations to track and manage disease outbreaks in farms.

## 🚀 Features

- **Multi-tenant Architecture**: Organization-based access control with RLS
- **Super Admin Role**: Global view of all organizations and data
- **User Onboarding**: Seamless signup → create/join organization → dashboard flow
- **Farm Management**: Add, edit, and manage farm locations
- **Disease Reports**: Comprehensive 22-field disease outbreak reporting
- **Real-time Dashboard**: Analytics, stats, and recent reports
- **Member Management**: Invite team members with share codes

## 🛠 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## 📋 Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Git (optional)

## 🔧 Setup Instructions

### 1. Database Setup

1. **Run Clean Rebuild SQL**
   - Open Supabase Dashboard → SQL Editor
   - Copy entire content from `CLEAN-REBUILD.sql`
   - Paste and execute
   - Verify no errors

2. **Create Super Admin User**
   - Follow instructions in `SUPER-ADMIN-SETUP.md`
   - Create user in Supabase Auth
   - Run SQL to set role and create organization

3. **Configure Supabase Auth**
   - Site URL: `http://localhost:3002`
   - Add redirect URLs (see `SUPER-ADMIN-SETUP.md`)
   - Disable email confirmation for development

### 2. Application Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Get Supabase credentials from: Dashboard → Project Settings → API
   - Fill in:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   - Open http://localhost:3002
   - Application should be running!

## 📖 User Guide

### For Super Admin

1. Login with `straintrack8@gmail.com`
2. Access all organizations via organization selector
3. View global stats and reports
4. Access Admin Panel in Settings

### For New Users

1. **Signup**: Create account at `/signup`
2. **Onboarding**: Choose to create or join organization
3. **Create Organization**: 
   - Enter organization name
   - Get share code
   - Share with team members
4. **Join Organization**:
   - Enter 8-character share code
   - Join existing organization

### Core Features

- **Dashboard**: View stats, recent reports, quick actions
- **Farms**: Add and manage farm locations
- **Reports**: Create comprehensive disease outbreak reports
- **Settings**: Manage profile, organization, and members

## 🗂 Project Structure

```
├── app/
│   ├── (auth)/
│   │   ├── login/          # Login page
│   │   └── signup/         # Signup page
│   ├── onboarding/         # Onboarding flow
│   ├── organization/
│   │   ├── create/         # Create organization
│   │   └── join/           # Join organization
│   ├── dashboard/          # Main dashboard
│   ├── farms/              # Farm management
│   ├── reports/            # Disease reports
│   │   └── new/            # New report form
│   └── settings/           # Settings page
├── lib/
│   ├── supabase/           # Supabase client
│   ├── types.ts            # TypeScript types
│   └── utils.ts            # Utility functions
├── CLEAN-REBUILD.sql       # Database setup script
├── SUPER-ADMIN-SETUP.md    # Super admin setup guide
└── README.md               # This file
```

## 🔐 User Roles

### Super Admin
- Email: `straintrack8@gmail.com`
- Access: All organizations, global view
- Permissions: View all data, manage all organizations

### Organization Admin
- Access: Full access to their organization
- Permissions: Manage settings, invite members, create reports

### Organization Member
- Access: View organization data
- Permissions: Create reports, view farms

## 📊 Database Schema

### Core Tables
- `users` - User accounts (extends auth.users)
- `organizations` - Organization data
- `user_organizations` - User-organization relationships
- `farms` - Farm locations
- `disease_reports` - Disease outbreak reports (22 fields)
- `clinical_signs` - Clinical signs for reports
- `emergency_actions` - Emergency actions taken
- `attachments` - File attachments

### Key Features
- Row Level Security (RLS) enabled on all tables
- Automatic user creation via database trigger
- RPC functions for organization create/join
- Multi-tenant data isolation

## 🧪 Testing

### Manual Testing Checklist

1. **Signup Flow**
   - Create new account
   - Verify redirect to onboarding
   - Check user created in database

2. **Organization Creation**
   - Create new organization
   - Verify share code generated
   - Check redirect to dashboard

3. **Organization Join**
   - Signup with new user
   - Use share code to join
   - Verify access to organization data

4. **Farm Management**
   - Add new farm
   - Edit farm details
   - Delete farm

5. **Disease Reports**
   - Create comprehensive report
   - Verify all 22 fields saved
   - Check clinical signs and actions

6. **Super Admin**
   - Login as super admin
   - Verify global view
   - Check admin panel access

## 🚀 Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

```
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
```

### Post-Deployment

1. Update Supabase Auth settings:
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com/**`
2. Enable email confirmation for production
3. Configure custom SMTP (optional)

## 📝 Documentation

- `CLEAN-REBUILD.sql` - Complete database setup script
- `SUPER-ADMIN-SETUP.md` - Super admin setup guide
- `COMPLETE-APP-FLOW.md` - Application flow documentation
- `NEW-APP-IMPLEMENTATION-PLAN.md` - Implementation details
- `REBUILD-STEPS.md` - Step-by-step rebuild guide

## 🐛 Troubleshooting

### "User account not properly configured"
- Check if trigger `on_auth_user_created` exists
- Manually insert user in `public.users` if needed

### "No organization" after creating
- Verify RPC function `create_organization` updates `users.organization_id`
- Check `user_organizations` table has entry

### RLS blocking access
- Verify user has entry in `user_organizations`
- Check RLS policies are correctly configured

## 📄 License

MIT License - See LICENSE file for details

## 👥 Support

For issues or questions, contact: straintrack8@gmail.com
