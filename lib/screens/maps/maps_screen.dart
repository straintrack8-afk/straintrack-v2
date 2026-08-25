import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../config/supabase_config.dart';
import '../../config/theme.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';

/// Farms with locations provider for map
final farmsWithLocationsProvider = FutureProvider.autoDispose<List<Farm>>((ref) async {
  final orgState = ref.watch(organizationProvider);
  final orgId = orgState.activeOrg?.id;
  final isGlobal = orgState.isGlobalView;

  var query = SupabaseConfig.client
      .from('farms')
      .select()
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);
  
  if (!isGlobal && orgId != null) {
    query = query.eq('organization_id', orgId);
  }

  final response = await query;
  return (response as List)
      .map((e) => Farm.fromJson(e as Map<String, dynamic>))
      .where((f) => f.hasCoordinates)
      .toList();
});

/// Reports with locations provider
final reportsWithLocationsProvider = FutureProvider.autoDispose<List<DiseaseReport>>((ref) async {
  final orgState = ref.watch(organizationProvider);
  final orgId = orgState.activeOrg?.id;
  final isGlobal = orgState.isGlobalView;

  var query = SupabaseConfig.client
      .from('disease_reports')
      .select('*, farm:farms(*)');
  
  if (!isGlobal && orgId != null) {
    query = query.eq('organization_id', orgId);
  }

  final response = await query.order('created_at', ascending: false).limit(100);
  return (response as List)
      .map((e) => DiseaseReport.fromJson(e as Map<String, dynamic>))
      .where((r) => r.farm?.hasCoordinates == true)
      .toList();
});

class MapsScreen extends ConsumerStatefulWidget {
  const MapsScreen({super.key});

  @override
  ConsumerState<MapsScreen> createState() => _MapsScreenState();
}

class _MapsScreenState extends ConsumerState<MapsScreen> {
  final MapController _mapController = MapController();
  bool _showFarms = true;
  bool _showReports = true;
  String? _selectedFilter;

  @override
  Widget build(BuildContext context) {
    final farmsAsync = ref.watch(farmsWithLocationsProvider);
    final reportsAsync = ref.watch(reportsWithLocationsProvider);

    return Scaffold(
      body: Column(
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
                        'Farm & Outbreak Map',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'View farm locations and disease hotspots',
                        style: TextStyle(color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Filters
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                FilterChip(
                  label: const Text('Farms'),
                  selected: _showFarms,
                  onSelected: (v) => setState(() => _showFarms = v),
                  avatar: Icon(
                    Icons.business,
                    size: 18,
                    color: _showFarms ? Colors.white : AppTheme.primaryColor,
                  ),
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('Reports'),
                  selected: _showReports,
                  onSelected: (v) => setState(() => _showReports = v),
                  avatar: Icon(
                    Icons.bug_report,
                    size: 18,
                    color: _showReports ? Colors.white : AppTheme.error,
                  ),
                ),
                const Spacer(),
                // Legend
                Row(
                  children: [
                    _LegendItem(color: AppTheme.primaryColor, label: 'Farm'),
                    const SizedBox(width: 12),
                    _LegendItem(color: AppTheme.error, label: 'Outbreak'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Map
          Expanded(
            child: farmsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline, size: 48, color: AppTheme.error),
                    const SizedBox(height: 12),
                    const Text('Error loading map data'),
                    TextButton(
                      onPressed: () {
                        ref.invalidate(farmsWithLocationsProvider);
                        ref.invalidate(reportsWithLocationsProvider);
                      },
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
              data: (farms) {
                final reports = reportsAsync.valueOrNull ?? [];
                
                if (farms.isEmpty && reports.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.map_outlined, size: 64, color: AppTheme.textSecondary),
                        const SizedBox(height: 16),
                        Text(
                          'No locations available',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Add farms with coordinates to see them on the map',
                          style: TextStyle(color: AppTheme.textSecondary),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  );
                }

                // Calculate center from data
                LatLng center = const LatLng(10.8231, 106.6297); // Default: Ho Chi Minh City
                if (farms.isNotEmpty) {
                  final avgLat = farms.map((f) => f.latitude!).reduce((a, b) => a + b) / farms.length;
                  final avgLng = farms.map((f) => f.longitude!).reduce((a, b) => a + b) / farms.length;
                  center = LatLng(avgLat, avgLng);
                }

                return FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: center,
                    initialZoom: 8,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.straintrack.straintrack_v2',
                    ),
                    
                    // Farm markers
                    if (_showFarms)
                      MarkerLayer(
                        markers: farms.map((farm) => Marker(
                          point: LatLng(farm.latitude!, farm.longitude!),
                          width: 40,
                          height: 40,
                          child: GestureDetector(
                            onTap: () => _showFarmInfo(farm),
                            child: Container(
                              decoration: BoxDecoration(
                                color: AppTheme.primaryColor,
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.2),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.business,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                          ),
                        )).toList(),
                      ),

                    // Report markers
                    if (_showReports)
                      MarkerLayer(
                        markers: reports.where((r) => r.farm?.hasCoordinates == true).map((report) => Marker(
                          point: LatLng(report.farm!.latitude!, report.farm!.longitude!),
                          width: 36,
                          height: 36,
                          child: GestureDetector(
                            onTap: () => _showReportInfo(report),
                            child: Container(
                              decoration: BoxDecoration(
                                color: AppTheme.getSeverityColor(report.severity?.value),
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.2),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.bug_report,
                                color: Colors.white,
                                size: 18,
                              ),
                            ),
                          ),
                        )).toList(),
                      ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showFarmInfo(Farm farm) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(Icons.business, color: AppTheme.primaryColor),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        farm.name,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (farm.animalType != null)
                        Text(
                          farm.animalType!.value,
                          style: TextStyle(color: AppTheme.textSecondary),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            if (farm.location != null) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  Icon(Icons.location_on, size: 16, color: AppTheme.textSecondary),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      farm.location!,
                      style: TextStyle(color: AppTheme.textSecondary),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 8),
            Text(
              'Coordinates: ${farm.latitude?.toStringAsFixed(4)}, ${farm.longitude?.toStringAsFixed(4)}',
              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  void _showReportInfo(DiseaseReport report) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppTheme.getSeverityColor(report.severity?.value).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.bug_report,
                    color: AppTheme.getSeverityColor(report.severity?.value),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        report.diseaseName ?? 'Unknown Disease',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '${report.animalSpecies} • ${report.farm?.name ?? 'Unknown'}',
                        style: TextStyle(color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.getSeverityColor(report.severity?.value).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    report.severity?.value ?? 'N/A',
                    style: TextStyle(
                      color: AppTheme.getSeverityColor(report.severity?.value),
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (report.sickCount != null || report.deathCount != null)
              Row(
                children: [
                  if (report.sickCount != null)
                    Chip(
                      avatar: const Icon(Icons.sick, size: 16),
                      label: Text('${report.sickCount} sick'),
                      visualDensity: VisualDensity.compact,
                    ),
                  if (report.deathCount != null) ...[
                    const SizedBox(width: 8),
                    Chip(
                      avatar: const Icon(Icons.dangerous, size: 16),
                      label: Text('${report.deathCount} deaths'),
                      visualDensity: VisualDensity.compact,
                    ),
                  ],
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 12)),
      ],
    );
  }
}
