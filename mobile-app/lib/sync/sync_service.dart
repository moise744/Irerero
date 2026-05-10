// lib/sync/sync_service.dart
//
// Background sync engine — runs as a Dart isolate.
// All core features work offline — sync happens when connectivity is detected.
// FR-084, FR-085, FR-086, FR-087, FR-088, FR-089.

import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../db/database_helper.dart';
import '../services/auth_service.dart';
import '../services/notification_service.dart';

enum SyncStatus { idle, syncing, synced, error }

class SyncService extends ChangeNotifier {
  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL', defaultValue: 'https://irerero-api.onrender.com/api/v1',
  );

  SyncStatus _status     = SyncStatus.idle;
  DateTime?  _lastSyncAt;
  int        _pendingCount = 0;
  String?    _lastError;

  SyncStatus get status      => _status;
  DateTime?  get lastSyncAt  => _lastSyncAt;
  int        get pendingCount => _pendingCount;
  bool       get isSyncing   => _status == SyncStatus.syncing;
  String?    get lastError   => _lastError;

  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;

  void startMonitor(AuthService auth) {
    _connectivitySub?.cancel();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final online = results.any((r) => r != ConnectivityResult.none);
      if (online && auth.isLoggedIn) {
        syncIfConnected(auth: auth);
      }
    });
    _refreshPendingCount();
  }

  Future<void> syncIfConnected({AuthService? auth}) async {
    final connectivity = await Connectivity().checkConnectivity();
    final online = connectivity.any((r) => r != ConnectivityResult.none);
    if (!online) return;
    if (auth != null) await sync(auth);
  }

  Future<void> pullChildrenFromServer(AuthService auth) async {
    if (!auth.isLoggedIn || auth.accessToken == null) return;
    try {
      var nextUri = Uri.parse('$_baseUrl/children/');
      while (true) {
        final res = await http
            .get(nextUri, headers: auth.authHeaders)
            .timeout(const Duration(seconds: 45));
        if (res.statusCode != 200) break;
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        final results = body['results'] as List? ?? [];
        final now = DateTime.now().toIso8601String();

        String isoDate(dynamic v) {
          if (v == null) return '';
          final s = v.toString();
          return s.length >= 10 ? s.substring(0, 10) : s;
        }

        for (final raw in results) {
          final m = raw as Map<String, dynamic>;
          final id = m['id']?.toString();
          if (id == null || id.isEmpty) continue;

          final dob = isoDate(m['date_of_birth']);
          var enrol = isoDate(m['enrolment_date']);
          if (enrol.isEmpty) enrol = dob;

          final photo = m['photo'];

          await DatabaseHelper.instance.insert('children', {
            'uuid': id,
            'irerero_id': (m['irerero_id'] ?? '').toString(),
            'centre_code': (m['centre_code'] ?? '').toString(),
            'full_name': (m['full_name'] ?? '').toString(),
            'date_of_birth': dob,
            'sex': (m['sex'] ?? 'male').toString(),
            'guardian_name': (m['guardian_name'] ?? '').toString(),
            'guardian_phone': (m['guardian_phone'] ?? '').toString(),
            'home_village': (m['home_village'] ?? '').toString(),
            'enrolment_date': enrol,
            'status': (m['status'] ?? 'active').toString(),
            'photo_path': photo?.toString(),
            'notes': (m['notes'] ?? '').toString(),
            'created_by': (m['created_by'] ?? '').toString(),
            'synced_at': now,
            'created_at': now,
            'updated_at': now,
          });
        }

        final next = body['next'];
        if (next == null || next.toString().isEmpty) break;
        nextUri = _apiUriFromServerLink(next.toString());
      }
      await _refreshPendingCount();
      notifyListeners();
    } catch (e) {
      print('PULL ERROR: $e');
    }
  }

  Uri _apiUriFromServerLink(String absoluteUrl) {
    final base = Uri.parse(_baseUrl);
    final u = Uri.parse(absoluteUrl);
    return u.replace(scheme: base.scheme, host: base.host, port: base.port);
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }

  Future<Map<String, dynamic>> sync(AuthService auth) async {
    if (_status == SyncStatus.syncing) return {'skipped': true};

    _status = SyncStatus.syncing;
    notifyListeners();

    try {
      final pending = await DatabaseHelper.instance.query(
        'sync_queue',
        where: 'status = ?',
        whereArgs: ['pending'],
        orderBy: 'created_at ASC',
        limit: 200,
      );

      if (pending.isEmpty) {
        _status = SyncStatus.synced;
        _lastSyncAt = DateTime.now();
        _pendingCount = 0;
        notifyListeners();
        return {'accepted': [], 'conflicts': []};
      }

      final records = pending.map((row) {
        final payload = jsonDecode(row['payload_json'] as String);
        return {
          'uuid':  row['entity_uuid'],
          'type':  row['entity_type'],
          'data':  payload,
        };
      }).toList();

      // FIXED: Added Content-Type so Django understands the JSON payload
      final res = await http.post(
        Uri.parse('$_baseUrl/sync/'),
        headers: {
          ...auth.authHeaders,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'records':   records,
          'device_id': 'irerero-mobile-${auth.userId ?? "unknown"}',
        }),
      ).timeout(const Duration(seconds: 30));

      if (res.statusCode == 200) {
        final data     = jsonDecode(res.body) as Map<String, dynamic>;
        final accepted = List<String>.from(data['accepted'] ?? []);
        final conflicts= List<dynamic>.from(data['conflicts'] ?? []);

        for (final uuid in accepted) {
          await DatabaseHelper.instance.update(
            'sync_queue',
            {'status': 'synced', 'synced_at': DateTime.now().toIso8601String()},
            where: 'entity_uuid = ?',
            whereArgs: [uuid],
          );
        }

        final serverAlerts = data['server_alerts'] as List? ?? [];
        for (final alert in serverAlerts) {
          await _storeServerAlert(alert as Map<String, dynamic>);
        }

        _lastSyncAt   = DateTime.now();
        _pendingCount = await _getPendingCount();
        _status       = SyncStatus.synced;
        _lastError    = null;
        notifyListeners();
        return {'accepted': accepted, 'conflicts': conflicts};
      }

      throw Exception('Server returned ${res.statusCode}: ${res.body}');
    } catch (e) {
      print('================ SYNC ERROR ================');
      print(e.toString());
      print('============================================');
      _lastError = e.toString();
      _status    = SyncStatus.error;
      notifyListeners();
      return {'error': e.toString()};
    }
  }

  Future<void> enqueue({
    required String entityType,
    required String entityUuid,
    required Map<String, dynamic> payload,
    String operation = 'create',
  }) async {
    await DatabaseHelper.instance.insert('sync_queue', {
      'uuid':         _generateUuid(),
      'entity_type':  entityType,
      'entity_uuid':  entityUuid,
      'operation':    operation,
      'payload_json': jsonEncode(payload),
      'created_at':   DateTime.now().toIso8601String(),
      'status':       'pending',
    });
    _pendingCount++;
    notifyListeners();
  }

  Future<void> _storeServerAlert(Map<String, dynamic> alert) async {
    await DatabaseHelper.instance.insert('alerts', {
      'uuid':              alert['id'] ?? _generateUuid(),
      'child_uuid':        alert['child'] ?? '',
      'alert_type':        alert['alert_type'] ?? '',
      'severity':          alert['severity'] ?? 'warning',
      'trigger_data_json': jsonEncode(alert['trigger_data'] ?? {}),
      'explanation_en':    alert['explanation_en'] ?? '',
      'explanation_rw':    alert['explanation_rw'] ?? '',
      'recommendation_en': alert['recommendation_en'] ?? '',
      'recommendation_rw': alert['recommendation_rw'] ?? '',
      'generated_at':      alert['generated_at'] ?? DateTime.now().toIso8601String(),
      'status':            'active',
    });

    final alertType = alert['alert_type'] ?? 'New Alert';
    final severity = alert['severity'] ?? 'warning';
    final explanation = alert['explanation_en'] ?? 'Please check the app for details.';

    // Only notify if it's an urgent or new alert (we notify on all active ones received in this batch)
    await NotificationService().showNotification(
      id: alert['id'].hashCode,
      title: 'Irerero Alert: $alertType',
      body: explanation,
    );
  }

  Future<void> _refreshPendingCount() async {
    _pendingCount = await _getPendingCount();
    notifyListeners();
  }

  Future<int> _getPendingCount() async {
    final rows = await DatabaseHelper.instance.query(
      'sync_queue', where: 'status = ?', whereArgs: ['pending'],
    );
    return rows.length;
  }

  String _generateUuid() {
    final now = DateTime.now().millisecondsSinceEpoch;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replaceAllMapped(
      RegExp(r'[xy]'),
      (m) {
        final r = (now + (m.start * 16)) % 16;
        return (m.group(0) == 'x' ? r : (r & 0x3 | 0x8)).toRadixString(16);
      },
    );
  }
}