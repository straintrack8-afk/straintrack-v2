import 'farm.dart';
import 'user.dart';

/// Disease severity levels
enum Severity {
  low('Low'),
  medium('Medium'),
  high('High'),
  critical('Critical');

  final String value;
  const Severity(this.value);

  static Severity? fromString(String? value) {
    if (value == null) return null;
    switch (value.toLowerCase()) {
      case 'low':
        return Severity.low;
      case 'medium':
        return Severity.medium;
      case 'high':
        return Severity.high;
      case 'critical':
        return Severity.critical;
      default:
        return null;
    }
  }
}

/// Disease report model matching the database schema
class DiseaseReport {
  final String id;
  final String organizationId;
  final String? farmId;
  final String createdBy;

  // Basic Info
  final String animalSpecies;
  final String? animalCategory;
  final String? animalSubcategory;
  final String? outbreakLocation;
  final int? totalPopulation;
  final String? ageStage;

  // Disease Info
  final DateTime? onsetDate;
  final String? diseaseName;
  final String? strainSubtype;
  final Severity? severity;
  final String? pathologyFindings;

  // Clinical Presentation
  final int? sickCount;
  final int? deathCount;
  final double? morbidityRate;
  final double? mortalityRate;

  // Vaccination
  final String? vaccinationHistory;
  final String? vaccineName;
  final DateTime? vaccinationDate;

  // Source & Response
  final String? suspectedSource;

  // Lab Testing
  final bool sampleSent;
  final String? sampleType;
  final String? labDestination;
  final DateTime? sampleShipDate;

  // Documentation
  final String? notes;

  final DateTime createdAt;
  final DateTime updatedAt;

  // Relations (loaded separately)
  Farm? farm;
  List<ClinicalSign>? clinicalSigns;
  List<EmergencyAction>? emergencyActions;
  AppUser? creator;

  DiseaseReport({
    required this.id,
    required this.organizationId,
    this.farmId,
    required this.createdBy,
    required this.animalSpecies,
    this.animalCategory,
    this.animalSubcategory,
    this.outbreakLocation,
    this.totalPopulation,
    this.ageStage,
    this.onsetDate,
    this.diseaseName,
    this.strainSubtype,
    this.severity,
    this.pathologyFindings,
    this.sickCount,
    this.deathCount,
    this.morbidityRate,
    this.mortalityRate,
    this.vaccinationHistory,
    this.vaccineName,
    this.vaccinationDate,
    this.suspectedSource,
    this.sampleSent = false,
    this.sampleType,
    this.labDestination,
    this.sampleShipDate,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
    this.farm,
    this.clinicalSigns,
    this.emergencyActions,
    this.creator,
  });

  factory DiseaseReport.fromJson(Map<String, dynamic> json) {
    return DiseaseReport(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      farmId: json['farm_id'] as String?,
      createdBy: json['created_by'] as String,
      animalSpecies: json['animal_species'] as String,
      animalCategory: json['animal_category'] as String?,
      animalSubcategory: json['animal_subcategory'] as String?,
      outbreakLocation: json['outbreak_location'] as String?,
      totalPopulation: json['total_population'] as int?,
      ageStage: json['age_stage'] as String?,
      onsetDate: json['onset_date'] != null
          ? DateTime.parse(json['onset_date'] as String)
          : null,
      diseaseName: json['disease_name'] as String?,
      strainSubtype: json['strain_subtype'] as String?,
      severity: Severity.fromString(json['severity'] as String?),
      pathologyFindings: json['pathology_findings'] as String?,
      sickCount: json['sick_count'] as int?,
      deathCount: json['death_count'] as int?,
      morbidityRate: (json['morbidity_rate'] as num?)?.toDouble(),
      mortalityRate: (json['mortality_rate'] as num?)?.toDouble(),
      vaccinationHistory: json['vaccination_history'] as String?,
      vaccineName: json['vaccine_name'] as String?,
      vaccinationDate: json['vaccination_date'] != null
          ? DateTime.parse(json['vaccination_date'] as String)
          : null,
      suspectedSource: json['suspected_source'] as String?,
      sampleSent: json['sample_sent'] as bool? ?? false,
      sampleType: json['sample_type'] as String?,
      labDestination: json['lab_destination'] as String?,
      sampleShipDate: json['sample_ship_date'] != null
          ? DateTime.parse(json['sample_ship_date'] as String)
          : null,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      farm: json['farm'] != null
          ? Farm.fromJson(json['farm'] as Map<String, dynamic>)
          : null,
      clinicalSigns: json['clinical_signs'] != null
          ? (json['clinical_signs'] as List)
              .map((e) => ClinicalSign.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
      emergencyActions: json['emergency_actions'] != null
          ? (json['emergency_actions'] as List)
              .map((e) => EmergencyAction.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'organization_id': organizationId,
      'farm_id': farmId,
      'animal_species': animalSpecies,
      'animal_category': animalCategory,
      'animal_subcategory': animalSubcategory,
      'outbreak_location': outbreakLocation,
      'total_population': totalPopulation,
      'age_stage': ageStage,
      'onset_date': onsetDate?.toIso8601String().split('T').first,
      'disease_name': diseaseName,
      'strain_subtype': strainSubtype,
      'severity': severity?.value,
      'pathology_findings': pathologyFindings,
      'sick_count': sickCount,
      'death_count': deathCount,
      'morbidity_rate': morbidityRate,
      'mortality_rate': mortalityRate,
      'vaccination_history': vaccinationHistory,
      'vaccine_name': vaccineName,
      'vaccination_date': vaccinationDate?.toIso8601String().split('T').first,
      'suspected_source': suspectedSource,
      'sample_sent': sampleSent,
      'sample_type': sampleType,
      'lab_destination': labDestination,
      'sample_ship_date': sampleShipDate?.toIso8601String().split('T').first,
      'notes': notes,
    };
  }
}

/// Clinical sign model
class ClinicalSign {
  final String id;
  final String reportId;
  final String signName;
  final DateTime createdAt;

  const ClinicalSign({
    required this.id,
    required this.reportId,
    required this.signName,
    required this.createdAt,
  });

  factory ClinicalSign.fromJson(Map<String, dynamic> json) {
    return ClinicalSign(
      id: json['id'] as String,
      reportId: json['report_id'] as String,
      signName: json['sign_name'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

/// Emergency action model
class EmergencyAction {
  final String id;
  final String reportId;
  final String actionName;
  final DateTime createdAt;

  const EmergencyAction({
    required this.id,
    required this.reportId,
    required this.actionName,
    required this.createdAt,
  });

  factory EmergencyAction.fromJson(Map<String, dynamic> json) {
    return EmergencyAction(
      id: json['id'] as String,
      reportId: json['report_id'] as String,
      actionName: json['action_name'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

/// Attachment model
class Attachment {
  final String id;
  final String reportId;
  final String fileName;
  final int? fileSize;
  final String? fileType;
  final String storagePath;
  final String uploadedBy;
  final DateTime createdAt;

  const Attachment({
    required this.id,
    required this.reportId,
    required this.fileName,
    this.fileSize,
    this.fileType,
    required this.storagePath,
    required this.uploadedBy,
    required this.createdAt,
  });

  factory Attachment.fromJson(Map<String, dynamic> json) {
    return Attachment(
      id: json['id'] as String,
      reportId: json['report_id'] as String,
      fileName: json['file_name'] as String,
      fileSize: json['file_size'] as int?,
      fileType: json['file_type'] as String?,
      storagePath: json['storage_path'] as String,
      uploadedBy: json['uploaded_by'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
