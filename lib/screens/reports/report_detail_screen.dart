import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../config/supabase_config.dart';
import '../../config/theme.dart';
import '../../models/models.dart';

class ReportDetailScreen extends ConsumerWidget {
  final String reportId;

  const ReportDetailScreen({super.key, required this.reportId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Report Details'),
      ),
      body: FutureBuilder(
        future: _loadReport(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError || snapshot.data == null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: AppTheme.error),
                  const SizedBox(height: 12),
                  const Text('Error loading report'),
                  TextButton(
                    onPressed: () => context.pop(),
                    child: const Text('Go Back'),
                  ),
                ],
              ),
            );
          }

          final report = snapshot.data!;
          final severityColor = AppTheme.getSeverityColor(report.severity?.value);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header card
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                color: severityColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(Icons.bug_report, color: severityColor, size: 28),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    report.diseaseName ?? 'Unknown Disease',
                                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  if (report.strainSubtype != null)
                                    Text(
                                      report.strainSubtype!,
                                      style: TextStyle(color: AppTheme.textSecondary),
                                    ),
                                ],
                              ),
                            ),
                            _SeverityBadge(severity: report.severity?.value),
                          ],
                        ),
                        const Divider(height: 32),
                        Row(
                          children: [
                            _InfoChip(
                              icon: Icons.pets,
                              label: report.animalSpecies,
                            ),
                            const SizedBox(width: 8),
                            _InfoChip(
                              icon: Icons.business,
                              label: report.farm?.name ?? 'Unknown Farm',
                            ),
                            const SizedBox(width: 8),
                            _InfoChip(
                              icon: Icons.calendar_today,
                              label: DateFormat('MMM d, yyyy').format(report.createdAt),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Stats
                if (report.sickCount != null || report.deathCount != null || report.totalPopulation != null)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Clinical Statistics',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              if (report.totalPopulation != null)
                                Expanded(
                                  child: _StatBox(
                                    label: 'Total Population',
                                    value: report.totalPopulation.toString(),
                                    color: AppTheme.info,
                                  ),
                                ),
                              if (report.sickCount != null)
                                Expanded(
                                  child: _StatBox(
                                    label: 'Sick',
                                    value: report.sickCount.toString(),
                                    color: AppTheme.warning,
                                  ),
                                ),
                              if (report.deathCount != null)
                                Expanded(
                                  child: _StatBox(
                                    label: 'Deaths',
                                    value: report.deathCount.toString(),
                                    color: AppTheme.error,
                                  ),
                                ),
                            ],
                          ),
                          if (report.morbidityRate != null || report.mortalityRate != null) ...[
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                if (report.morbidityRate != null)
                                  Expanded(
                                    child: _StatBox(
                                      label: 'Morbidity Rate',
                                      value: '${report.morbidityRate!.toStringAsFixed(1)}%',
                                      color: AppTheme.warning,
                                    ),
                                  ),
                                if (report.mortalityRate != null)
                                  Expanded(
                                    child: _StatBox(
                                      label: 'Mortality Rate',
                                      value: '${report.mortalityRate!.toStringAsFixed(1)}%',
                                      color: AppTheme.error,
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 16),

                // Details
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Details',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        if (report.onsetDate != null)
                          _DetailRow(
                            label: 'Onset Date',
                            value: DateFormat('MMMM d, yyyy').format(report.onsetDate!),
                          ),
                        if (report.ageStage != null)
                          _DetailRow(label: 'Age Stage', value: report.ageStage!),
                        if (report.suspectedSource != null)
                          _DetailRow(label: 'Suspected Source', value: report.suspectedSource!),
                        _DetailRow(
                          label: 'Sample Sent',
                          value: report.sampleSent ? 'Yes' : 'No',
                        ),
                        if (report.sampleSent && report.sampleType != null)
                          _DetailRow(label: 'Sample Type', value: report.sampleType!),
                        if (report.vaccineName != null)
                          _DetailRow(label: 'Vaccine Used', value: report.vaccineName!),
                        if (report.notes != null && report.notes!.isNotEmpty) ...[
                          const Divider(height: 24),
                          Text(
                            'Notes',
                            style: TextStyle(
                              color: AppTheme.textSecondary,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(report.notes!),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<DiseaseReport?> _loadReport() async {
    try {
      final response = await SupabaseConfig.client
          .from('disease_reports')
          .select('*, farm:farms(*)')
          .eq('id', reportId)
          .single();
      return DiseaseReport.fromJson(response);
    } catch (e) {
      return null;
    }
  }
}

class _SeverityBadge extends StatelessWidget {
  final String? severity;
  const _SeverityBadge({this.severity});

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.getSeverityColor(severity);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        severity ?? 'N/A',
        style: TextStyle(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppTheme.textSecondary),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _StatBox({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.1)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: AppTheme.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}
