/// Farm model matching the database schema
class Farm {
  final String id;
  final String organizationId;
  final String name;
  final String? location;
  final double? latitude;
  final double? longitude;
  final AnimalType? animalType;
  final String? farmType;
  final String? chickenType;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Farm({
    required this.id,
    required this.organizationId,
    required this.name,
    this.location,
    this.latitude,
    this.longitude,
    this.animalType,
    this.farmType,
    this.chickenType,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Farm.fromJson(Map<String, dynamic> json) {
    return Farm(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      name: json['name'] as String,
      location: json['location'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      animalType: AnimalType.fromString(json['animal_type'] as String?),
      farmType: json['farm_type'] as String?,
      chickenType: json['chicken_type'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'organization_id': organizationId,
      'name': name,
      'location': location,
      'latitude': latitude,
      'longitude': longitude,
      'animal_type': animalType?.value,
      'farm_type': farmType,
      'chicken_type': chickenType,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  /// Check if farm has valid coordinates for map
  bool get hasCoordinates => latitude != null && longitude != null;

  Farm copyWith({
    String? id,
    String? organizationId,
    String? name,
    String? location,
    double? latitude,
    double? longitude,
    AnimalType? animalType,
    String? farmType,
    String? chickenType,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Farm(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      name: name ?? this.name,
      location: location ?? this.location,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      animalType: animalType ?? this.animalType,
      farmType: farmType ?? this.farmType,
      chickenType: chickenType ?? this.chickenType,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Animal type enum
enum AnimalType {
  swine('Swine'),
  poultry('Poultry');

  final String value;
  const AnimalType(this.value);

  static AnimalType? fromString(String? value) {
    if (value == null) return null;
    switch (value.toLowerCase()) {
      case 'swine':
        return AnimalType.swine;
      case 'poultry':
        return AnimalType.poultry;
      default:
        return null;
    }
  }
}
