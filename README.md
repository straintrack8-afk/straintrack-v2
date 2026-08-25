# StrainTrack V2 - Flutter

Disease surveillance system for livestock farms - monitoring and tracking disease outbreaks across poultry and swine farms.

## 🚀 Now Multi-Platform!

This application has been migrated from Next.js to **Flutter** for multi-platform support:
- ✅ **Android** - Mobile app
- ✅ **iOS** - Mobile app  
- ✅ **Web** - Browser app

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
- **Member Invitations** - Invite new members via share code
- **Flexible Strain Input** - Select from predefined strains or enter custom variants

## Tech Stack

- **Frontend:** Flutter 3.24+, Dart 3.5+
- **State Management:** Riverpod
- **Navigation:** GoRouter
- **Backend:** Supabase (PostgreSQL, Authentication, RLS)
- **Maps:** flutter_map (OpenStreetMap tiles)
- **Charts:** fl_chart

## Getting Started

### Prerequisites
- Flutter 3.24+ ([Install Flutter](https://docs.flutter.dev/get-started/install))
- Supabase account

### Installation

1. Clone the repository
```bash
git clone https://github.com/straintrack8-afk/straintrack-v2.git
cd straintrack-v2
```

2. Install dependencies
```bash
flutter pub get
```

3. Run the app
```bash
# Web
flutter run -d chrome

# Android
flutter run -d android

# iOS
flutter run -d ios
```

### Building for Production

```bash
# Web
flutter build web

# Android APK
flutter build apk

# Android App Bundle
flutter build appbundle

# iOS
flutter build ios
```

## Project Structure

```
lib/
├── main.dart              # App entry point
├── config/
│   ├── supabase_config.dart   # Supabase setup
│   └── theme.dart             # App theme
├── router/
│   └── app_router.dart        # Navigation routes
├── models/
│   ├── user.dart
│   ├── organization.dart
│   ├── farm.dart
│   └── disease_report.dart
├── providers/
│   ├── auth_provider.dart
│   ├── organization_provider.dart
│   └── dashboard_provider.dart
└── screens/
    ├── auth/           # Login, Signup
    ├── onboarding/     # Onboarding flow
    ├── organization/   # Create/Join org
    ├── dashboard/      # Main dashboard
    ├── farms/          # Farm management
    ├── reports/        # Disease reports
    ├── maps/           # Interactive maps
    └── settings/       # Settings & members
```

## Demo Accounts

- **Super Admin:** straintrack8@gmail.com
- **Organizations:** 
  - Vaksindo Vietnam Animal Health
  - Street Fighter (demo data)

## Environment Variables

For production builds, set these environment variables:

```bash
flutter build web \
  --dart-define=SUPABASE_URL=your_url \
  --dart-define=SUPABASE_ANON_KEY=your_key
```

## License

Proprietary - All rights reserved

---

**Last Updated:** January 12, 2026  
**Version:** 2.0.0 (Flutter)
