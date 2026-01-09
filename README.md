# StrainTrack V2

Disease surveillance system for livestock farms - monitoring and tracking disease outbreaks across poultry and swine farms.

## Features

### Super Admin Capabilities
- **Global View** - View consolidated data from all organizations
- **Organization Switching** - Switch between organizations to view specific data
- **Member Management** - Invite, promote, and manage members across organizations

### Core Features
- **Dashboard** - Real-time overview of farms, disease reports, and outbreaks
- **Farm Management** - Track farm locations, types, and animal populations
- **Disease Reporting** - Record and monitor disease outbreaks with severity levels
- **Interactive Maps** - Visualize farm locations and outbreak hotspots
- **Email Invitations** - Invite new members via email (Resend integration)
- **Flexible Strain Input** - Select from predefined strains or enter custom variants

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Authentication, RLS)
- **Maps:** Leaflet
- **Email:** Resend
- **Deployment:** Vercel

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Resend account (for email invitations)

### Installation

1. Clone the repository
```bash
git clone https://github.com/straintrack8-afk/straintrack-v2.git
cd straintrack-v2
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL`

4. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database Setup

Run the SQL migration files in Supabase SQL Editor:
1. `FARM-ENHANCEMENT-MIGRATION.sql` - Farm schema
2. `MEMBER-INVITATIONS-MIGRATION.sql` - Invitations system
3. `DUMMY-DATA.sql` - Sample data (optional)

## Demo Accounts

- **Super Admin:** straintrack8@gmail.com
- **Organizations:** 
  - Vaksindo Vietnam Animal Health
  - Street Fighter (demo data)

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard pages
│   │   ├── farms/        # Farm management
│   │   ├── reports/      # Disease reports
│   │   ├── maps/         # Interactive maps
│   │   └── settings/     # Organization settings
│   └── api/              # API routes
├── components/            # Reusable components
├── contexts/             # React contexts
├── lib/                  # Utilities and types
└── public/               # Static assets
```

## Contributing

This is a private project for demonstration purposes.

## License

Proprietary - All rights reserved

---

**Last Updated:** January 9, 2026
**Version:** 2.0.0
