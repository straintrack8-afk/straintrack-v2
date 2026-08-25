import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../config/supabase_config.dart';
import '../../config/theme.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';

/// Reports list provider
final reportsProvider = FutureProvider.autoDispose<List<DiseaseReport>>((ref) async {
  final orgState = ref.watch(organizationProvider);
  final orgId = orgState.activeOrg?.id;
  final isGlobal = orgState.isGlobalView;

  var query = SupabaseConfig.client.from('disease_reports').select('*, farm:farms(*)');
  
  if (!isGlobal && orgId != null) {
    query = query.eq('organization_id', orgId);
  }

  final response = await query.order('created_at', ascending: false);
  return (response as List).map((e) => DiseaseReport.fromJson(e as Map<String, dynamic>)).toList();
});

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportsAsync = ref.watch(reportsProvider);
    final orgState = ref.watch(organizationProvider);

    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Disease Reports',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Track and manage disease outbreaks',
                        style: TextStyle(color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
                if (!orgState.isGlobalView)
                  ElevatedButton.icon(
                    onPressed: () => context.push('/reports/new'),
                    icon: const Icon(Icons.add),
                    label: const Text('New Report'),
                  ),
              ],
            ),
          ),

          // Reports list
          Expanded(
            child: reportsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline, size: 48, color: AppTheme.error),
                    const SizedBox(height: 12),
                    const Text('Error loading reports'),
                    TextButton(
                      onPressed: () => ref.invalidate(reportsProvider),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
              data: (reports) {
                if (reports.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.description_outlined, size: 64, color: AppTheme.textSecondary),
                        const SizedBox(height: 16),
                        Text(
                          'No reports yet',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Create your first disease report',
                          style: TextStyle(color: AppTheme.textSecondary),
                        ),
                        if (!orgState.isGlobalView) ...[
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: () => context.push('/reports/new'),
                            icon: const Icon(Icons.add),
                            label: const Text('New Report'),
                          ),
                        ],
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(reportsProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: reports.length,
                    itemBuilder: (context, index) {
                      final report = reports[index];
                      return _ReportCard(
                        report: report,
                        onTap: () => context.push('/reports/${report.id}'),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final DiseaseReport report;
  final VoidCallback onTap;

  const _ReportCard({required this.report, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final severityColor = AppTheme.getSeverityColor(report.severity?.value);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: severityColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(Icons.bug_report, color: severityColor),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          report.diseaseName ?? 'Unknown Disease',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          '${report.animalSpecies} • ${report.farm?.name ?? 'Unknown Farm'}',
                          style: TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      _SeverityBadge(severity: report.severity?.value),
                      const SizedBox(height: 4),
                      Text(
                        DateFormat('MMM d, yyyy').format(report.createdAt),
                        style: TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              if (report.sickCount != null || report.deathCount != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    if (report.sickCount != null)
                      _StatChip(
                        icon: Icons.sick,
                        label: '${report.sickCount} sick',
                        color: AppTheme.warning,
                      ),
                    if (report.deathCount != null) ...[
                      const SizedBox(width: 8),
                      _StatChip(
                        icon: Icons.dangerous,
                        label: '${report.deathCount} deaths',
                        color: AppTheme.error,
                      ),
                    ],
                    if (report.totalPopulation != null) ...[
                      const SizedBox(width: 8),
                      _StatChip(
                        icon: Icons.groups,
                        label: '${report.totalPopulation} total',
                        color: AppTheme.info,
                      ),
                    ],
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _SeverityBadge extends StatelessWidget {
  final String? severity;

  const _SeverityBadge({this.severity});

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.getSeverityColor(severity);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        severity ?? 'N/A',
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _StatChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
