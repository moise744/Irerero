// lib/services/auth_service.dart
//
// Authentication service — handles login, offline login, JWT tokens.
// FR-001, FR-004, FR-005, FR-006.

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:crypto/crypto.dart';
import '../db/database_helper.dart';

class AuthService extends ChangeNotifier {
  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL', defaultValue: 'https://irerero-api.onrender.com/api/v1',
  );

  final _storage = const FlutterSecureStorage();
  Map<String, dynamic>? _user;
  String? _accessToken;
  // Flutter's built-in Material/Cupertino localizations do not currently ship
  // with Kinyarwanda (`rw`), so the app UI uses English framework strings
  // while feature screens can still display Kinyarwanda text.
  Locale _locale = const Locale('en');
  static const String _offlineHashPrefix = 'sha256:';
  static const String _pinStorageKey = 'pin_hash_v1';

  bool get isLoggedIn   => _accessToken != null && _user != null;
  Map<String, dynamic>? get user => _user;
  String? get accessToken => _accessToken;
  String? get centreId    => _user?['centre_id'];
  String? get userId      => _user?['id']?.toString();
  String? get role        => _user?['role'];
  Locale get preferredLocale => _locale;

  /// Online login — FR-001.
  /// Render free tier can take 30-60s to wake from sleep, so we allow up to
  /// 90 seconds and show a "waking up" message on first attempt.
  Future<Map<String, dynamic>> login(String username, String password) async {
    // Try up to 2 times — first attempt may hit Render cold start
    for (int attempt = 1; attempt <= 2; attempt++) {
      try {
        final res = await http.post(
          Uri.parse('$_baseUrl/auth/login/'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'username': username, 'password': password}),
        ).timeout(const Duration(seconds: 90));

        if (res.statusCode == 200) {
          final data  = jsonDecode(res.body) as Map<String, dynamic>;
          _accessToken = data['access'] as String;
          _user        = data['user'] as Map<String, dynamic>;
          await _storage.write(key: 'access_token',  value: _accessToken);
          await _storage.write(key: 'refresh_token', value: data['refresh'] as String);
          await _storage.write(key: 'user',          value: jsonEncode(_user));
          // Cache credentials for offline login — FR-004
          await _cacheForOffline(username, password, _user!);
          notifyListeners();
          return {'success': true, 'user': _user};
        }

        // Parse server error — NFR-014: plain language error messages
        final err = jsonDecode(res.body);
        return {'success': false, 'error': err['detail'] ?? 'Login failed.'};
      } catch (e) {
        if (attempt == 1) {
          // First attempt timed out — server may be waking up, try once more
          continue;
        }
        // Both attempts failed — try offline login — FR-004
        return _offlineLogin(username, password);
      }
    }
    return _offlineLogin(username, password);
  }

  /// Offline login using cached credential fingerprint — FR-004.
  Future<Map<String, dynamic>> _offlineLogin(String username, String password) async {
    final rows = await DatabaseHelper.instance.query(
      'users_cache', where: 'username = ?', whereArgs: [username],
    );
    if (rows.isEmpty) {
      return {'success': false, 'error': 'No cached credentials found. Please connect to the internet to log in for the first time.'};
    }
    // Offline verification uses a one-way local fingerprint.
    // Server passwords remain Django-hashed only on backend (never stored locally).
    final cached = rows.first;
    final stored = cached['password_hash'] as String?;
    final incomingHash = _credentialHash(username, password);
    bool matched = false;
    bool legacyPlaintext = false;
    if (stored != null) {
      if (stored.startsWith(_offlineHashPrefix)) {
        matched = stored == incomingHash;
      } else {
        // Backward compatibility for already-cached devices.
        matched = stored == password;
        legacyPlaintext = matched;
      }
    }

    if (matched) {
      // One-time migration from legacy plaintext snapshot to hashed fingerprint.
      if (legacyPlaintext) {
        await DatabaseHelper.instance.update(
          'users_cache',
          {'password_hash': incomingHash},
          where: 'user_id = ?',
          whereArgs: [cached['user_id']],
        );
      }
      _accessToken = await _storage.read(key: 'access_token');
      _user = {
        'id':          cached['user_id'],
        'username':    cached['username'],
        'full_name':   cached['full_name'],
        'role':        cached['role'],
        'centre_id':   cached['centre_code'],
      };
      notifyListeners();
      return {'success': true, 'user': _user, 'offline': true};
    }
    return {'success': false, 'error': 'Incorrect username or password.'};
  }

  Future<void> _cacheForOffline(String username, String password, Map<String, dynamic> user) async {
    await DatabaseHelper.instance.insert('users_cache', {
      'user_id':      user['id'].toString(),
      'username':     username,
      'full_name':    user['full_name'] ?? '',
      'role':         user['role'] ?? '',
      'centre_code':  user['centre_id']?.toString() ?? '',
      // Store only a one-way fingerprint (never plaintext credential).
      'password_hash': _credentialHash(username, password),
      'last_login':   DateTime.now().toIso8601String(),
      'phone_number': user['phone_number'] ?? '',
      'email':        user['email'] ?? '',
    });
  }

  String _credentialHash(String username, String password) {
    final bytes = utf8.encode('irerero-offline-v1|$username|$password');
    final digest = sha256.convert(bytes).toString();
    return '$_offlineHashPrefix$digest';
  }

  Future<void> logout() async {
    _user = null;
    _accessToken = null;
    await _storage.deleteAll();
    notifyListeners();
  }

  Future<void> restoreSession() async {
    _accessToken = await _storage.read(key: 'access_token');
    final userJson = await _storage.read(key: 'user');
    if (userJson != null) {
      _user = jsonDecode(userJson) as Map<String, dynamic>;
    }
    notifyListeners();
  }

  void setLocale(Locale locale) {
    _locale = locale;
    notifyListeners();
  }

  Map<String, String> get authHeaders => {
    'Content-Type': 'application/json',
    if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
  };

  Future<bool> hasPin() async {
    final pinHash = await _storage.read(key: _pinStorageKey);
    return pinHash != null && pinHash.isNotEmpty;
  }

  Future<void> setPin(String pin) async {
    await _storage.write(key: _pinStorageKey, value: _pinHash(pin));
  }

  Future<void> clearPin() async {
    await _storage.delete(key: _pinStorageKey);
  }

  Future<Map<String, dynamic>> loginWithPin(String pin) async {
    final stored = await _storage.read(key: _pinStorageKey);
    if (stored == null || stored.isEmpty) {
      return {'success': false, 'error': 'No PIN configured on this device.'};
    }
    if (stored != _pinHash(pin)) {
      return {'success': false, 'error': 'Incorrect PIN.'};
    }

    await restoreSession();
    if (_user == null) {
      return {
        'success': false,
        'error': 'No saved session found. Please log in with username and password first.',
      };
    }
    return {'success': true, 'user': _user, 'pin': true};
  }

  Future<bool> refreshToken() async {
    try {
      final refresh = await _storage.read(key: 'refresh_token');
      if (refresh == null) return false;

      final res = await http.post(
        Uri.parse('$_baseUrl/auth/refresh/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh': refresh}),
      ).timeout(const Duration(seconds: 15));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        _accessToken = data['access'];
        await _storage.write(key: 'access_token', value: _accessToken);
        if (data.containsKey('refresh')) {
          await _storage.write(key: 'refresh_token', value: data['refresh']);
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  String _pinHash(String pin) {
    final digest = sha256.convert(utf8.encode('irerero-pin-v1|$pin')).toString();
    return 'sha256:$digest';
  }
}
