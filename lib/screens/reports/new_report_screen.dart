import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../config/supabase_config.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';
import 'reports_screen.dart';

/// Farms list for dropdown
final farmsForReportProvider = FutureProvider.autoDispose<List<Farm>>((ref) async {
  final orgId = ref.watch(organizationProvider).activeOrg?.id;
  if (orgId == null) return [];
  
  final response = await SupabaseConfig.client
      .from('farms')
      .select()
      .eq('organization_id', orgId)
      .order('name');
  
  return (response as List).map((e) => Farm.fromJson(e as Map<String, dynamic>)).toList();
});

class NewReportScreen extends ConsumerStatefulWidget {
  const NewReportScreen({super.key});

  @override
  ConsumerState<NewReportScreen> createState() => _NewReportScreenState();
}

class _NewReportScreenState extends ConsumerState<NewReportScreen> {
  final _formKey = GlobalKey<FormState>();
  int _currentStep = 0;
  bool _isSubmitting = false;

  // Form data
  String? _selectedFarmId;
  String _animalSpecies = 'Poultry';
  String? _animalCategory;
  int? _totalPopulation;
  String? _ageStage;
  DateTime? _onsetDate;
  String? _diseaseName;
  String? _strainSubtype;
  Severity? _severity;
  int? _sickCount;
  int? _deathCount;
  String? _vaccinationHistory;
  String? _vaccineName;
  DateTime? _vaccinationDate;
  String? _suspectedSource;
  bool _sampleSent = false;
  String? _sampleType;
  String? _notes;

  final _populationController = TextEditingController();
  final _sickCountController = TextEditingController();
  final _deathCountController = TextEditingController();
  final _notesController = TextEditingController();

  @override
  void dispose() {
    _populationController.dispose();
    _sickCountController.dispose();
    _deathCountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    final orgId = ref.read(organizationProvider).activeOrg?.id;
    if (orgId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No organization selected')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      // Calculate rates
      double? morbidityRate;
      double? mortalityRate;
      if (_totalPopulation != null && _totalPopulation! > 0) {
        if (_sickCount != null) {
          morbidityRate = (_sickCount! / _totalPopulation!) * 100;
        }
        if (_deathCount != null) {
          mortalityRate = (_deathCount! / _totalPopulation!) * 100;
        }
      }

      await SupabaseConfig.client.from('disease_reports').insert({
        'organization_id': orgId,
        'farm_id': _selectedFarmId,
        'animal_species': _animalSpecies,
        'animal_category': _animalCategory,
        'total_population': _totalPopulation,
        'age_stage': _ageStage,
        'onset_date': _onsetDate?.toIso8601String().split('T').first,
        'disease_name': _diseaseName,
        'strain_subtype': _strainSubtype,
        'severity': _severity?.value,
        'sick_count': _sickCount,
        'death_count': _deathCount,
        'morbidity_rate': morbidityRate,
        'mortality_rate': mortalityRate,
        'vaccination_history': _vaccinationHistory,
        'vaccine_name': _vaccineName,
        'vaccination_date': _vaccinationDate?.toIso8601String().split('T').first,
        'suspected_source': _suspectedSource,
        'sample_sent': _sampleSent,
        'sample_type': _sampleType,
        'notes': _notes,
      });

      ref.invalidate(reportsProvider);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Report created successfully')),
        );
        context.pop();
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

  @override
  Widget build(BuildContext context) {
    final farmsAsync = ref.watch(farmsForReportProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
        title: const Text('New Disease Report'),
      ),
      body: Form(
        key: _formKey,
        child: Stepper(
          currentStep: _currentStep,
          onStepContinue: () {
            if (_currentStep < 3) {
              setState(() => _currentStep++);
            } else {
              _handleSubmit();
            }
          },
          onStepCancel: () {
            if (_currentStep > 0) {
              setState(() => _currentStep--);
            } else {
              context.pop();
            }
          },
          controlsBuilder: (context, details) {
            return Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Row(
                children: [
                  if (_currentStep < 3)
                    ElevatedButton(
                      onPressed: details.onStepContinue,
                      child: const Text('Continue'),
                    )
                  else
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : details.onStepContinue,
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20, height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Submit Report'),
                    ),
                  const SizedBox(width: 12),
                  TextButton(
                    onPressed: details.onStepCancel,
                    child: Text(_currentStep == 0 ? 'Cancel' : 'Back'),
                  ),
                ],
              ),
            );
          },
          steps: [
            // Step 1: Basic Info
            Step(
              title: const Text('Basic Information'),
              isActive: _currentStep >= 0,
              state: _currentStep > 0 ? StepState.complete : StepState.indexed,
              content: Column(
                children: [
                  // Farm selection
                  farmsAsync.when(
                    loading: () => const LinearProgressIndicator(),
                    error: (_, __) => const Text('Error loading farms'),
                    data: (farms) => DropdownButtonFormField<String>(
                      value: _selectedFarmId,
                      decoration: const InputDecoration(
                        labelText: 'Farm *',
                        prefixIcon: Icon(Icons.business),
                      ),
                      items: farms.map((f) => DropdownMenuItem(
                        value: f.id,
                        child: Text(f.name),
                      )).toList(),
                      onChanged: (v) => setState(() => _selectedFarmId = v),
                      validator: (v) => v == null ? 'Please select a farm' : null,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Animal species
                  DropdownButtonFormField<String>(
                    value: _animalSpecies,
                    decoration: const InputDecoration(
                      labelText: 'Animal Species *',
                      prefixIcon: Icon(Icons.pets),
                    ),
                    items: ['Poultry', 'Swine'].map((s) => DropdownMenuItem(
                      value: s,
                      child: Text(s),
                    )).toList(),
                    onChanged: (v) => setState(() => _animalSpecies = v!),
                  ),
                  const SizedBox(height: 16),

                  // Population
                  TextFormField(
                    controller: _populationController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Total Population',
                      prefixIcon: Icon(Icons.groups),
                    ),
                    onChanged: (v) => _totalPopulation = int.tryParse(v),
                  ),
                ],
              ),
            ),

            // Step 2: Disease Info
            Step(
              title: const Text('Disease Information'),
              isActive: _currentStep >= 1,
              state: _currentStep > 1 ? StepState.complete : StepState.indexed,
              content: Column(
                children: [
                  TextFormField(
                    decoration: const InputDecoration(
                      labelText: 'Disease Name',
                      prefixIcon: Icon(Icons.bug_report),
                    ),
                    onChanged: (v) => _diseaseName = v,
                  ),
                  const SizedBox(height: 16),

                  TextFormField(
                    decoration: const InputDecoration(
                      labelText: 'Strain/Subtype',
                      prefixIcon: Icon(Icons.science),
                    ),
                    onChanged: (v) => _strainSubtype = v,
                  ),
                  const SizedBox(height: 16),

                  DropdownButtonFormField<Severity>(
                    value: _severity,
                    decoration: const InputDecoration(
                      labelText: 'Severity *',
                      prefixIcon: Icon(Icons.warning_amber),
                    ),
                    items: Severity.values.map((s) => DropdownMenuItem(
                      value: s,
                      child: Text(s.value),
                    )).toList(),
                    onChanged: (v) => setState(() => _severity = v),
                    validator: (v) => v == null ? 'Please select severity' : null,
                  ),
                  const SizedBox(height: 16),

                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.calendar_today),
                    title: Text(_onsetDate == null
                        ? 'Select Onset Date'
                        : 'Onset: ${_onsetDate!.toString().split(' ')[0]}'),
                    onTap: () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: _onsetDate ?? DateTime.now(),
                        firstDate: DateTime(2020),
                        lastDate: DateTime.now(),
                      );
                      if (date != null) setState(() => _onsetDate = date);
                    },
                  ),
                ],
              ),
            ),

            // Step 3: Clinical Presentation
            Step(
              title: const Text('Clinical Data'),
              isActive: _currentStep >= 2,
              state: _currentStep > 2 ? StepState.complete : StepState.indexed,
              content: Column(
                children: [
                  TextFormField(
                    controller: _sickCountController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Number of Sick Animals',
                      prefixIcon: Icon(Icons.sick),
                    ),
                    onChanged: (v) => _sickCount = int.tryParse(v),
                  ),
                  const SizedBox(height: 16),

                  TextFormField(
                    controller: _deathCountController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Number of Deaths',
                      prefixIcon: Icon(Icons.dangerous),
                    ),
                    onChanged: (v) => _deathCount = int.tryParse(v),
                  ),
                  const SizedBox(height: 16),

                  SwitchListTile(
                    title: const Text('Sample Sent to Lab'),
                    value: _sampleSent,
                    onChanged: (v) => setState(() => _sampleSent = v),
                  ),

                  if (_sampleSent) ...[
                    const SizedBox(height: 16),
                    TextFormField(
                      decoration: const InputDecoration(
                        labelText: 'Sample Type',
                        prefixIcon: Icon(Icons.biotech),
                      ),
                      onChanged: (v) => _sampleType = v,
                    ),
                  ],
                ],
              ),
            ),

            // Step 4: Notes
            Step(
              title: const Text('Additional Notes'),
              isActive: _currentStep >= 3,
              state: _currentStep > 3 ? StepState.complete : StepState.indexed,
              content: Column(
                children: [
                  TextFormField(
                    controller: _notesController,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Notes',
                      hintText: 'Any additional information...',
                      alignLabelWithHint: true,
                    ),
                    onChanged: (v) => _notes = v,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
