import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/supabase_config.dart';
import '../../config/theme.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';

/// Farms list provider
final farmsProvider = FutureProvider.autoDispose<List<Farm>>((ref) async {
  final orgState = ref.watch(organizationProvider);
  final orgId = orgState.activeOrg?.id;
  final isGlobal = orgState.isGlobalView;

  var query = SupabaseConfig.client.from('farms').select();
  
  if (!isGlobal && orgId != null) {
    query = query.eq('organization_id', orgId);
  }

  final response = await query.order('created_at', ascending: false);
  return (response as List).map((e) => Farm.fromJson(e as Map<String, dynamic>)).toList();
});

class FarmsScreen extends ConsumerStatefulWidget {
  const FarmsScreen({super.key});

  @override
  ConsumerState<FarmsScreen> createState() => _FarmsScreenState();
}

class _FarmsScreenState extends ConsumerState<FarmsScreen> {
  bool _showAddForm = false;
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _locationController = TextEditingController();
  final _latController = TextEditingController();
  final _lngController = TextEditingController();
  AnimalType? _selectedAnimalType;
  String? _selectedFarmType;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    _locationController.dispose();
    _latController.dispose();
    _lngController.dispose();
    super.dispose();
  }

  void _resetForm() {
    _nameController.clear();
    _locationController.clear();
    _latController.clear();
    _lngController.clear();
    _selectedAnimalType = null;
    _selectedFarmType = null;
  }

  Future<void> _handleAddFarm() async {
    if (!_formKey.currentState!.validate()) return;

    final orgId = ref.read(organizationProvider).activeOrg?.id;
    if (orgId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an organization first')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      await SupabaseConfig.client.from('farms').insert({
        'organization_id': orgId,
        'name': _nameController.text.trim(),
        'location': _locationController.text.trim().isNotEmpty 
            ? _locationController.text.trim() 
            : null,
        'latitude': _latController.text.isNotEmpty 
            ? double.tryParse(_latController.text) 
            : null,
        'longitude': _lngController.text.isNotEmpty 
            ? double.tryParse(_lngController.text) 
            : null,
        'animal_type': _selectedAnimalType?.value,
        'farm_type': _selectedFarmType,
      });

      _resetForm();
      setState(() => _showAddForm = false);
      ref.invalidate(farmsProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Farm added successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  Future<void> _handleDeleteFarm(Farm farm) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Farm'),
        content: Text('Are you sure you want to delete "${farm.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await SupabaseConfig.client.from('farms').delete().eq('id', farm.id);
        ref.invalidate(farmsProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Farm deleted successfully')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final farmsAsync = ref.watch(farmsProvider);
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
                        'Farm Management',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Manage your farms and locations',
                        style: TextStyle(color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
                if (!orgState.isGlobalView)
                  ElevatedButton.icon(
                    onPressed: () => setState(() => _showAddForm = !_showAddForm),
                    icon: Icon(_showAddForm ? Icons.close : Icons.add),
                    label: Text(_showAddForm ? 'Cancel' : 'Add Farm'),
                  ),
              ],
            ),
          ),

          // Add form
          if (_showAddForm)
            Card(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Add New Farm',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: TextFormField(
                              controller: _nameController,
                              decoration: const InputDecoration(
                                labelText: 'Farm Name *',
                                hintText: 'e.g., Farm A',
                              ),
                              validator: (v) => v?.isEmpty == true ? 'Required' : null,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: DropdownButtonFormField<AnimalType>(
                              value: _selectedAnimalType,
                              decoration: const InputDecoration(labelText: 'Animal Type'),
                              items: AnimalType.values.map((t) => DropdownMenuItem(
                                value: t,
                                child: Text(t.value),
                              )).toList(),
                              onChanged: (v) => setState(() => _selectedAnimalType = v),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _locationController,
                        decoration: const InputDecoration(
                          labelText: 'Location/Address',
                          hintText: 'e.g., District 7, Ho Chi Minh City',
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _latController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'Latitude',
                                hintText: 'e.g., 10.762622',
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: TextFormField(
                              controller: _lngController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'Longitude',
                                hintText: 'e.g., 106.660172',
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton(
                            onPressed: () {
                              _resetForm();
                              setState(() => _showAddForm = false);
                            },
                            child: const Text('Cancel'),
                          ),
                          const SizedBox(width: 12),
                          ElevatedButton(
                            onPressed: _isSubmitting ? null : _handleAddFarm,
                            child: _isSubmitting
                                ? const SizedBox(
                                    width: 20, height: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Text('Add Farm'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),

          const SizedBox(height: 16),

          // Farms list
          Expanded(
            child: farmsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline, size: 48, color: AppTheme.error),
                    const SizedBox(height: 12),
                    Text('Error loading farms'),
                    TextButton(
                      onPressed: () => ref.invalidate(farmsProvider),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
              data: (farms) {
                if (farms.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.business_outlined, size: 64, color: AppTheme.textSecondary),
                        const SizedBox(height: 16),
                        Text(
                          'No farms yet',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Add your first farm to get started',
                          style: TextStyle(color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: farms.length,
                  itemBuilder: (context, index) {
                    final farm = farms[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            farm.animalType == AnimalType.swine
                                ? Icons.pets
                                : Icons.egg_alt,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                        title: Text(
                          farm.name,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (farm.location != null)
                              Text(farm.location!),
                            Row(
                              children: [
                                if (farm.animalType != null) ...[
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppTheme.info.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      farm.animalType!.value,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: AppTheme.info,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                ],
                                if (farm.hasCoordinates)
                                  Icon(Icons.location_on, size: 14, color: AppTheme.success),
                              ],
                            ),
                          ],
                        ),
                        trailing: !orgState.isGlobalView ? IconButton(
                          icon: const Icon(Icons.delete_outline),
                          color: AppTheme.error,
                          onPressed: () => _handleDeleteFarm(farm),
                        ) : null,
                        isThreeLine: farm.location != null,
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
