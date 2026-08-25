import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/providers.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/signup_screen.dart';
import '../screens/onboarding/onboarding_screen.dart';
import '../screens/organization/create_organization_screen.dart';
import '../screens/organization/join_organization_screen.dart';
import '../screens/dashboard/dashboard_shell.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/farms/farms_screen.dart';
import '../screens/reports/reports_screen.dart';
import '../screens/reports/new_report_screen.dart';
import '../screens/reports/report_detail_screen.dart';
import '../screens/maps/maps_screen.dart';
import '../screens/settings/settings_screen.dart';

/// Router provider
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/dashboard',
    debugLogDiagnostics: true,
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final isLoading = authState.isLoading;
      final hasOrg = authState.user?.organizationId != null;
      
      final path = state.matchedLocation;
      
      // Auth routes
      final isAuthRoute = path == '/login' || path == '/signup';
      final isOnboardingRoute = path.startsWith('/onboarding') || 
                                 path.startsWith('/organization');
      
      // Still loading auth state - don't redirect yet
      if (isLoading) return null;
      
      // Not logged in - redirect to login
      if (!isLoggedIn) {
        if (isAuthRoute) return null;
        return '/login';
      }
      
      // Logged in but on auth route - redirect appropriately
      if (isAuthRoute) {
        return hasOrg ? '/dashboard' : '/onboarding';
      }
      
      // Logged in without org - must complete onboarding
      if (!hasOrg && !isOnboardingRoute) {
        return '/onboarding';
      }
      
      return null;
    },
    routes: [
      // Root route - redirects based on auth state
      GoRoute(
        path: '/',
        redirect: (context, state) => '/dashboard',
      ),
      
      // Auth routes
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/signup',
        name: 'signup',
        builder: (context, state) => const SignupScreen(),
      ),
      
      // Onboarding routes
      GoRoute(
        path: '/onboarding',
        name: 'onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/organization/create',
        name: 'createOrg',
        builder: (context, state) => const CreateOrganizationScreen(),
      ),
      GoRoute(
        path: '/organization/join',
        name: 'joinOrg',
        builder: (context, state) => const JoinOrganizationScreen(),
      ),
      
      // Dashboard shell with nested routes
      ShellRoute(
        builder: (context, state, child) => DashboardShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            name: 'dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/farms',
            name: 'farms',
            builder: (context, state) => const FarmsScreen(),
          ),
          GoRoute(
            path: '/reports',
            name: 'reports',
            builder: (context, state) => const ReportsScreen(),
          ),
          GoRoute(
            path: '/reports/new',
            name: 'newReport',
            builder: (context, state) => const NewReportScreen(),
          ),
          GoRoute(
            path: '/reports/:id',
            name: 'reportDetail',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return ReportDetailScreen(reportId: id);
            },
          ),
          GoRoute(
            path: '/maps',
            name: 'maps',
            builder: (context, state) => const MapsScreen(),
          ),
          GoRoute(
            path: '/settings',
            name: 'settings',
            builder: (context, state) => const SettingsScreen(),
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Page not found',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text('Path: ${state.matchedLocation}'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.go('/dashboard'),
              child: const Text('Go to Dashboard'),
            ),
          ],
        ),
      ),
    ),
  );
});
