/// Organization model matching the database schema
class Organization {
  final String id;
  final String name;
  final String? description;
  final String shareCode;
  final String? address;
  final String? phone;
  final String? createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Organization({
    required this.id,
    required this.name,
    this.description,
    required this.shareCode,
    this.address,
    this.phone,
    this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      shareCode: json['share_code'] as String,
      address: json['address'] as String?,
      phone: json['phone'] as String?,
      createdBy: json['created_by'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'share_code': shareCode,
      'address': address,
      'phone': phone,
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

/// Organization with user's role
class OrganizationWithRole extends Organization {
  final String userRole;

  OrganizationWithRole({
    required super.id,
    required super.name,
    super.description,
    required super.shareCode,
    super.address,
    super.phone,
    super.createdBy,
    required super.createdAt,
    required super.updatedAt,
    required this.userRole,
  });

  factory OrganizationWithRole.fromJson(Map<String, dynamic> json) {
    return OrganizationWithRole(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      shareCode: json['share_code'] as String,
      address: json['address'] as String?,
      phone: json['phone'] as String?,
      createdBy: json['created_by'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      userRole: json['role'] as String? ?? 'member',
    );
  }

  bool get isAdmin => userRole == 'admin';
}

/// User organization membership
class UserOrganization {
  final String id;
  final String userId;
  final String organizationId;
  final String role;
  final DateTime joinedAt;

  const UserOrganization({
    required this.id,
    required this.userId,
    required this.organizationId,
    required this.role,
    required this.joinedAt,
  });

  factory UserOrganization.fromJson(Map<String, dynamic> json) {
    return UserOrganization(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      organizationId: json['organization_id'] as String,
      role: json['role'] as String,
      joinedAt: DateTime.parse(json['joined_at'] as String),
    );
  }
}
