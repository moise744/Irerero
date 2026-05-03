// models/measurement.dart — Typed measurement model
// Mirrors backend measurements.models.Measurement

class Measurement {
  final String id;
  final String childId;
  final double? weightKg;
  final double? heightCm;
  final double? muacCm;
  final double? temperatureC;
  final double? headCircCm;
  final String measurementPosition;
  final String source;
  final String? deviceId;
  final double? wazScore;
  final double? hazScore;
  final double? whzScore;
  final String nutritionalStatus;
  final bool bivFlagged;
  final String recordedAt;
  final bool synced;

  Measurement({
    required this.id,
    required this.childId,
    this.weightKg,
    this.heightCm,
    this.muacCm,
    this.temperatureC,
    this.headCircCm,
    this.measurementPosition = 'standing',
    this.source = 'manual',
    this.deviceId,
    this.wazScore,
    this.hazScore,
    this.whzScore,
    this.nutritionalStatus = 'normal',
    this.bivFlagged = false,
    required this.recordedAt,
    this.synced = false,
  });

  factory Measurement.fromMap(Map<String, dynamic> map) {
    return Measurement(
      id: map['id'] ?? '',
      childId: map['child_id'] ?? '',
      weightKg: _toDouble(map['weight_kg']),
      heightCm: _toDouble(map['height_cm']),
      muacCm: _toDouble(map['muac_cm']),
      temperatureC: _toDouble(map['temperature_c']),
      headCircCm: _toDouble(map['head_circ_cm']),
      measurementPosition: map['measurement_position'] ?? 'standing',
      source: map['source'] ?? 'manual',
      deviceId: map['device_id'],
      wazScore: _toDouble(map['waz_score']),
      hazScore: _toDouble(map['haz_score']),
      whzScore: _toDouble(map['whz_score']),
      nutritionalStatus: map['nutritional_status'] ?? 'normal',
      bivFlagged: map['biv_flagged'] == 1 || map['biv_flagged'] == true,
      recordedAt: map['recorded_at'] ?? '',
      synced: map['synced'] == 1 || map['synced'] == true,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'child_id': childId,
      'weight_kg': weightKg,
      'height_cm': heightCm,
      'muac_cm': muacCm,
      'temperature_c': temperatureC,
      'head_circ_cm': headCircCm,
      'measurement_position': measurementPosition,
      'source': source,
      'device_id': deviceId,
      'waz_score': wazScore,
      'haz_score': hazScore,
      'whz_score': whzScore,
      'nutritional_status': nutritionalStatus,
      'biv_flagged': bivFlagged ? 1 : 0,
      'recorded_at': recordedAt,
      'synced': synced ? 1 : 0,
    };
  }

  static double? _toDouble(dynamic v) {
    if (v == null) return null;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    return double.tryParse(v.toString());
  }
}
