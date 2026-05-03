// models/alert.dart — Typed alert model
// Mirrors backend alerts.models.Alert

class Alert {
  final String id;
  final String childId;
  final String? centreId;
  final String alertType;
  final String severity;
  final String status;
  final String explanationEn;
  final String explanationRw;
  final String recommendationEn;
  final String recommendationRw;
  final String? actionTaken;
  final String generatedAt;

  Alert({
    required this.id,
    required this.childId,
    this.centreId,
    required this.alertType,
    required this.severity,
    this.status = 'active',
    required this.explanationEn,
    required this.explanationRw,
    required this.recommendationEn,
    required this.recommendationRw,
    this.actionTaken,
    required this.generatedAt,
  });

  factory Alert.fromMap(Map<String, dynamic> map) {
    return Alert(
      id: map['id'] ?? '',
      childId: map['child_id'] ?? map['child'] ?? '',
      centreId: map['centre_id'] ?? map['centre'],
      alertType: map['alert_type'] ?? '',
      severity: map['severity'] ?? 'information',
      status: map['status'] ?? 'active',
      explanationEn: map['explanation_en'] ?? '',
      explanationRw: map['explanation_rw'] ?? '',
      recommendationEn: map['recommendation_en'] ?? '',
      recommendationRw: map['recommendation_rw'] ?? '',
      actionTaken: map['action_taken'],
      generatedAt: map['generated_at'] ?? '',
    );
  }

  factory Alert.fromJson(Map<String, dynamic> json) => Alert.fromMap(json);

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'child_id': childId,
      'centre_id': centreId,
      'alert_type': alertType,
      'severity': severity,
      'status': status,
      'explanation_en': explanationEn,
      'explanation_rw': explanationRw,
      'recommendation_en': recommendationEn,
      'recommendation_rw': recommendationRw,
      'action_taken': actionTaken,
      'generated_at': generatedAt,
    };
  }

  bool get isUrgent => severity == 'urgent';
  bool get isActive => status == 'active';

  String displayType() => alertType.replaceAll('_', ' ');
}
