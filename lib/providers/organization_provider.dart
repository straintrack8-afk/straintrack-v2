import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/supabase_config.dart';
import '../models/models.dart';
import 'auth_provider.dart';

/// Super admin emails (matching the original implementation)
const Set<String> superAdminEmails = {'straintrack8@gmail.com'};

/// Organization state
class OrganizationState {
  final OrganizationWithRole? activeOrg;
  final List<OrganizationWithRole> organizations;
  final bool isLoading;
  final String? error;
  final bool isSuperAdmin;

  const OrganizationState({
    this.activeOrg,
    this.organizations = const [],
    this.isLoading = false,
    this.error,
    this.isSuperAdmin = false,
  });

  OrganizationState copyWith({
    OrganizationWithRole? activeOrg,
    List<OrganizationWithRole>? organizations,
    bool? isLoading,
    String? error,
    bool? isSuperAdmin,
  }) {
    return OrganizationState(
      activeOrg: activeOrg ?? this.activeOrg,
      organizations: organizations ?? this.organizations,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      isSuperAdmin: isSuperAdmin ?? this.isSuperAdmin,
    );
  }

  /// Check if viewing global (all organizations)
  bool get isGlobalView => activeOrg == null && isSuperAdmin;
}

/// Organization notifier
class OrganizationNotifier extends StateNotifier<OrganizationState> {
  final Ref _ref;
  
  OrganizationNotifier(this._ref) : super(const OrganizationState(isLoading: true)) {
    _init();
  }

  final _supabase = SupabaseConfig.client;

  Future<void> _init() async {
    // Watch auth state and load organizations when authenticated
    _ref.listen(authProvider, (previous, next) {
      if (next.isAuthenticated && next.user != null) {
        loadOrganizations();
      } else {
        state = const OrganizationState();
      }
    });

    // Initial load if already authenticated
    final authState = _ref.read(authProvider);
    if (authState.isAuthenticated && authState.user != null) {
      await loadOrganizations();
    }
  }

  /// Load user's organizations
  Future<void> loadOrganizations() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final authState = _ref.read(authProvider);
      final user = authState.user;
      if (user == null) return;

      // Check if super admin
      final isSuperAdmin = superAdminEmails.contains(user.email);

      // Get organizations using RPC function
      final response = await _supabase.rpc('get_my_organizations');
      
      final organizations = (response as List)
          .map((e) => OrganizationWithRole.fromJson(e as Map<String, dynamic>))
          .toList();

      // Set active org (first one if available)
      final activeOrg = organizations.isNotEmpty ? organizations.first : null;

      state = OrganizationState(
        activeOrg: activeOrg,
        organizations: organizations,
        isLoading: false,
        isSuperAdmin: isSuperAdmin,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Switch active organization
  void switchOrganization(OrganizationWithRole? org) {
    state = state.copyWith(activeOrg: org);
  }

  /// Set to global view (super admin only)
  void setGlobalView() {
    if (state.isSuperAdmin) {
      state = OrganizationState(
        activeOrg: null,
        organizations: state.organizations,
        isLoading: false,
        isSuperAdmin: true,
      );
    }
  }

  /// Create new organization
  Future<String?> createOrganization({
    required String name,
    String? description,
    String? address,
    String? phone,
  }) async {
    try {
      final response = await _supabase.rpc('create_organization', params: {
        'org_name': name,
        'org_description': description,
        'org_address': address,
        'org_phone': phone,
      });

      // Reload organizations
      await loadOrganizations();

      return response['org_id'] as String?;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }

  /// Join organization with share code
  Future<bool> joinOrganization(String shareCode) async {
    try {
      final response = await _supabase.rpc('join_organization', params: {
        'share_code_input': shareCode,
      });

      if (response['success'] == true) {
        await loadOrganizations();
        return true;
      }
      
      state = state.copyWith(error: response['message'] as String?);
      return false;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }

  /// Clear error
  void clearError() {
    state = state.copyWith(error: null);
  }
}

/// Organization provider
final organizationProvider = StateNotifierProvider<OrganizationNotifier, OrganizationState>((ref) {
  return OrganizationNotifier(ref);
});

/// Active organization ID provider
final activeOrgIdProvider = Provider<String?>((ref) {
  return ref.watch(organizationProvider).activeOrg?.id;
});
