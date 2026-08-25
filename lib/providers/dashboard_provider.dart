import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/supabase_config.dart';
import '../models/models.dart';
import 'organization_provider.dart';

/// Dashboard statistics
class DashboardStats {
  final int totalFarms;
  final int totalReports;
  final int activeOutbreaks;
  final List<DiseaseReport> recentReports;

  const DashboardStats({
    this.totalFarms = 0,
    this.totalReports = 0,
    this.activeOutbreaks = 0,
    this.recentReports = const [],
  });
}

/// Dashboard state
class DashboardState {
  final DashboardStats stats;
  final bool isLoading;
  final String? error;

  const DashboardState({
    this.stats = const DashboardStats(),
    this.isLoading = false,
    this.error,
  });

  DashboardState copyWith({
    DashboardStats? stats,
    bool? isLoading,
    String? error,
  }) {
    return DashboardState(
      stats: stats ?? this.stats,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Dashboard notifier
class DashboardNotifier extends StateNotifier<DashboardState> {
  final Ref _ref;

  DashboardNotifier(this._ref) : super(const DashboardState());

  final _supabase = SupabaseConfig.client;

  /// Load dashboard data
  Future<void> loadDashboardData() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final orgState = _ref.read(organizationProvider);
      final orgId = orgState.activeOrg?.id;
      final isGlobal = orgState.isGlobalView;

      // Build query based on organization context
      var farmsQuery = _supabase.from('farms').select('id');
      var reportsQuery = _supabase.from('disease_reports').select('*, farm:farms(*)');
      
      if (!isGlobal && orgId != null) {
        farmsQuery = farmsQuery.eq('organization_id', orgId);
        reportsQuery = reportsQuery.eq('organization_id', orgId);
      }

      // Fetch data in parallel
      final results = await Future.wait([
        farmsQuery,
        reportsQuery.order('created_at', ascending: false).limit(10),
      ]);

      final farmsData = results[0] as List;
      final reportsData = results[1] as List;

      // Parse reports
      final reports = reportsData
          .map((e) => DiseaseReport.fromJson(e as Map<String, dynamic>))
          .toList();

      // Count active outbreaks (High/Critical severity in last 30 days)
      final thirtyDaysAgo = DateTime.now().subtract(const Duration(days: 30));
      final activeOutbreaks = reports.where((r) =>
          (r.severity == Severity.high || r.severity == Severity.critical) &&
          r.createdAt.isAfter(thirtyDaysAgo)).length;

      state = DashboardState(
        stats: DashboardStats(
          totalFarms: farmsData.length,
          totalReports: reportsData.length,
          activeOutbreaks: activeOutbreaks,
          recentReports: reports.take(5).toList(),
        ),
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Refresh dashboard data
  Future<void> refresh() async {
    await loadDashboardData();
  }
}

/// Dashboard provider
final dashboardProvider = StateNotifierProvider<DashboardNotifier, DashboardState>((ref) {
  return DashboardNotifier(ref);
});
