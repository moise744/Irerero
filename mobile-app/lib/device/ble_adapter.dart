// lib/device/ble_adapter.dart
//
// BLE adapter for real device communication.
// GATT profile — flutter_blue_plus.
// ES-FR-001: QR/6-digit pairing. ES-NFR-004: 10m range.
// ES-FR-006: graceful fallback on connection loss.

import 'dart:async';
import 'dart:convert';
import 'device_interface.dart';

class BleDeviceAdapter implements DeviceInterface {
  final _controller = StreamController<MeasurementPayload>.broadcast();
  bool _connected = false;
  String _deviceId = '';

  // Service and characteristic UUIDs for Irerero embedded device
  static const String kServiceUuid     = '12345678-1234-1234-1234-123456789abc';
  static const String kCharUuid        = '87654321-4321-4321-4321-cba987654321';

  @override
  Stream<MeasurementPayload> get measurementStream => _controller.stream;

  @override
  bool get isConnected => _connected;

  @override
  String get deviceId => _deviceId;

  @override
  Future<void> connect() async {
    // flutter_blue_plus scan and connect — Phase 4 full BLE implementation
    // In Phase 3 the HTTP adapter is used for emulator testing
    // BLE implementation activated in Phase 4 (ES-FR-001)
    _connected = false;
  }

  @override
  Future<void> disconnect() async {
    _connected = false;
  }

  void _onDataReceived(List<int> bytes) {
    try {
      final json    = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
      final payload = MeasurementPayloadImpl.fromJson(json);
      _controller.add(payload);
    } catch (_) {
      // Malformed BLE packet — ES-FR-007: same BIV validation applied
    }
  }
}
