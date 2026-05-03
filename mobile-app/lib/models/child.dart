// models/child.dart — Typed child model for the mobile app
// Mirrors backend children.models.Child

class Child {
  final String id;
  final String ireroId;
  final String fullName;
  final String dateOfBirth;
  final String sex;
  final String guardianName;
  final String guardianPhone;
  final String homeVillage;
  final String centreId;
  final String status;
  final String? notes;
  final String? photo;
  final String? nutritionalStatus;
  final bool synced;

  Child({
    required this.id,
    required this.ireroId,
    required this.fullName,
    required this.dateOfBirth,
    required this.sex,
    required this.guardianName,
    required this.guardianPhone,
    required this.homeVillage,
    required this.centreId,
    this.status = 'active',
    this.notes,
    this.photo,
    this.nutritionalStatus,
    this.synced = false,
  });

  factory Child.fromMap(Map<String, dynamic> map) {
    return Child(
      id: map['id'] ?? '',
      ireroId: map['irerero_id'] ?? '',
      fullName: map['full_name'] ?? '',
      dateOfBirth: map['date_of_birth'] ?? '',
      sex: map['sex'] ?? 'male',
      guardianName: map['guardian_name'] ?? '',
      guardianPhone: map['guardian_phone'] ?? '',
      homeVillage: map['home_village'] ?? '',
      centreId: map['centre_id'] ?? '',
      status: map['status'] ?? 'active',
      notes: map['notes'],
      photo: map['photo'],
      nutritionalStatus: map['nutritional_status'],
      synced: map['synced'] == 1 || map['synced'] == true,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'irerero_id': ireroId,
      'full_name': fullName,
      'date_of_birth': dateOfBirth,
      'sex': sex,
      'guardian_name': guardianName,
      'guardian_phone': guardianPhone,
      'home_village': homeVillage,
      'centre_id': centreId,
      'status': status,
      'notes': notes,
      'photo': photo,
      'nutritional_status': nutritionalStatus,
      'synced': synced ? 1 : 0,
    };
  }

  /// Age in months from date of birth
  int get ageInMonths {
    try {
      final dob = DateTime.parse(dateOfBirth);
      final now = DateTime.now();
      return (now.year - dob.year) * 12 + (now.month - dob.month);
    } catch (_) {
      return 0;
    }
  }

  /// Human-readable age string
  String get ageDisplay {
    final months = ageInMonths;
    if (months < 12) return '$months months';
    final years = months ~/ 12;
    final rem = months % 12;
    return rem > 0 ? '$years yr $rem mo' : '$years yr';
  }

  factory Child.fromJson(Map<String, dynamic> json) {
    return Child(
      id: json['id'] ?? '',
      ireroId: json['irerero_id'] ?? '',
      fullName: json['full_name'] ?? '',
      dateOfBirth: json['date_of_birth'] ?? '',
      sex: json['sex'] ?? 'male',
      guardianName: json['guardian_name'] ?? '',
      guardianPhone: json['guardian_phone'] ?? '',
      homeVillage: json['home_village'] ?? '',
      centreId: json['centre']?.toString() ?? json['centre_id'] ?? '',
      status: json['status'] ?? 'active',
      notes: json['notes'],
      photo: json['photo'],
      nutritionalStatus: json['nutritional_status'],
      synced: true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'full_name': fullName,
      'date_of_birth': dateOfBirth,
      'sex': sex,
      'guardian_name': guardianName,
      'guardian_phone': guardianPhone,
      'home_village': homeVillage,
      'centre_id': centreId,
      'notes': notes,
    };
  }
}
