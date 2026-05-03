// lib/device/http_adapter.dart
//
// Local HTTP listener for optional hardware or lab tools POSTing measurements
// to this device on port 8765 (`/device-input`).
// ES-FR-006: graceful fallback if connection lost.

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'device_interface.dart';

class HttpDeviceAdapter implements DeviceInterface {
  final _controller = StreamController<MeasurementPayload>.broadcast();
  HttpServer? _server;
  bool _connected = false;

  @override
  Stream<MeasurementPayload> get measurementStream => _controller.stream;

  @override
  bool get isConnected => _connected;

  @override
  String get deviceId => 'http-adapter-localhost-8765';

  @override
  Future<void> connect() async {
    try {
      _server = await HttpServer.bind(InternetAddress.anyIPv4, 8765);
      _connected = true;
      _listen();
    } catch (_) {
      _connected = false;
    }
  }

  void _listen() {
    _server?.listen((request) async {
      if (request.method == 'POST' && request.uri.path == '/device-input') {
        final body = await utf8.decoder.bind(request).join();
        try {
          final json    = jsonDecode(body) as Map<String, dynamic>;
          final payload = MeasurementPayloadImpl.fromJson(json);
          _controller.add(payload);
          request.response
            ..statusCode = 200
            ..write('{"status":"received"}')
            ..close();
        } catch (_) {
          request.response..statusCode = 400..close();
        }
      } else {
        request.response..statusCode = 404..close();
      }
    });
  }

  @override
  Future<void> disconnect() async {
    await _server?.close(force: true);
    _connected = false;
  }
}
