// lib/device/device_interface.dart
//
// Abstract DeviceInterface — plug-and-replace contract.
// The measurement form only talks to DeviceInterface.
// BleDeviceAdapter and HttpDeviceAdapter implement identical contracts.
// Switching is one config value — ES-FR-001, architecture §3.4.1.

abstract class MeasurementPayload {
  String get childId;
  String get sessionId;
  double? get weightKg;
  double? get heightCm;
  double? get muacCm;
  double? get tempC;
  double? get headCircumferenceCm;
  String get measurementPosition; // 'standing' | 'lying'
  String get source;              // 'simulation' | 'real_device'
  String get deviceId;
  DateTime get timestamp;
}

class MeasurementPayloadImpl implements MeasurementPayload {
  @override final String childId;
  @override final String sessionId;
  @override final double? weightKg;
  @override final double? heightCm;
  @override final double? muacCm;
  @override final double? tempC;
  @override final double? headCircumferenceCm;
  @override final String measurementPosition;
  @override final String source;
  @override final String deviceId;
  @override final DateTime timestamp;

  const MeasurementPayloadImpl({
    required this.childId, required this.sessionId,
    this.weightKg, this.heightCm, this.muacCm, this.tempC, this.headCircumferenceCm,
    this.measurementPosition = 'standing', this.source = 'manual',
    this.deviceId = '', required this.timestamp,
  });

  factory MeasurementPayloadImpl.fromJson(Map<String, dynamic> j) => MeasurementPayloadImpl(
    childId:              j['child_id'] ?? '',
    sessionId:            j['session_id'] ?? '',
    weightKg:             (j['weight_kg'] as num?)?.toDouble(),
    heightCm:             (j['height_cm'] as num?)?.toDouble(),
    muacCm:               (j['muac_cm'] as num?)?.toDouble(),
    tempC:                (j['temp_c'] as num?)?.toDouble(),
    headCircumferenceCm:  (j['head_circumference_cm'] as num?)?.toDouble(),
    measurementPosition:  j['measurement_position'] ?? 'standing',
    source:               j['source'] ?? 'manual',
    deviceId:             j['device_id'] ?? '',
    timestamp:            DateTime.tryParse(j['timestamp'] ?? '') ?? DateTime.now(),
  );
}

abstract class DeviceInterface {
  Stream<MeasurementPayload> get measurementStream;
  Future<void> connect();
  Future<void> disconnect();
  bool get isConnected;
  String get deviceId;
}
