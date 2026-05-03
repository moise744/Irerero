// lib/db/database_helper.dart
// Local SQLite storage (SQLCipher encrypted at rest).
// NFR-018: encryption key is stored in secure storage and used to open DB.
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:sqflite/sqflite.dart' as sqflite_plain;
import 'package:sqflite_sqlcipher/sqflite.dart';
import 'package:path/path.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._();
  static Database? _db;
  static const int _version = 1;
  static const String _dbName = 'irerero_secure.db';
  static const String _legacyDbName = 'irerero.db';
  static const String _dbKeyStorageKey = 'irerero_db_key_v1';
  static const String _dbMigratedStorageKey = 'irerero_db_migrated_v1';
  static const _secureStorage = FlutterSecureStorage();

  DatabaseHelper._();

  Future<void> init() async { _db = await _initDatabase(); }

  Future<Database> get database async {
    _db ??= await _initDatabase();
    return _db!;
  }

  Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, _dbName);
    final legacyPath = join(dbPath, _legacyDbName);
    final key = await _getOrCreateDbKey();

    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        final db = await openDatabase(
          path,
          password: key,
          version: _version,
          onConfigure: _onConfigure,
          onCreate: _onCreate,
        );
        await _migrateLegacyDatabaseIfNeeded(
          encryptedDb: db,
          legacyPath: legacyPath,
        );
        return db;
      } catch (_) {
        if (attempt == 0) {
          await _deleteSecureDbFiles(path);
          continue;
        }
        rethrow;
      }
    }
    throw StateError('Failed to open encrypted database');
  }

  /// Removes the encrypted DB and SQLite sidecar files after a failed open
  /// (wrong key, corrupt file, or plaintext DB left from an older build).
  Future<void> _deleteSecureDbFiles(String path) async {
    try {
      // Prefer sqflite's deleteDatabase which handles locking semantics better.
      await deleteDatabase(path);
      // Also remove any remaining files if they still exist (best-effort).
      final main = File(path);
      if (await main.exists()) await main.delete();
      for (final ext in ['-wal', '-shm', '-journal']) {
        final side = File('$path$ext');
        if (await side.exists()) await side.delete();
      }
    } catch (_) {
      // best effort — second open attempt may still fail clearly
    }
  }

  Future<String> _getOrCreateDbKey() async {
    final existing = await _secureStorage.read(key: _dbKeyStorageKey);
    if (existing != null && existing.isNotEmpty) return existing;

    final rnd = Random.secure();
    final bytes = List<int>.generate(32, (_) => rnd.nextInt(256));
    final generated = base64UrlEncode(bytes);
    await _secureStorage.write(key: _dbKeyStorageKey, value: generated);
    return generated;
  }

  Future<void> _migrateLegacyDatabaseIfNeeded({
    required Database encryptedDb,
    required String legacyPath,
  }) async {
    final migrated = await _secureStorage.read(key: _dbMigratedStorageKey);
    if (migrated == 'true') return;

    final legacyExists = await sqflite_plain.databaseExists(legacyPath);
    if (!legacyExists) {
      await _secureStorage.write(key: _dbMigratedStorageKey, value: 'true');
      return;
    }

    sqflite_plain.Database? legacyDb;
    try {
      legacyDb = await sqflite_plain.openDatabase(legacyPath, readOnly: true);
      final tableRows = await legacyDb.rawQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      );
      final tableNames =
          tableRows.map((e) => e['name']).whereType<String>().toSet();

      for (final table in tableNames) {
        final existsInEncrypted = await encryptedDb.rawQuery(
          "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
          [table],
        );
        if (existsInEncrypted.isEmpty) continue;

        final rows = await legacyDb.query(table);
        if (rows.isEmpty) continue;

        await encryptedDb.transaction((txn) async {
          for (final row in rows) {
            await txn.insert(
              table,
              row,
              conflictAlgorithm: ConflictAlgorithm.replace,
            );
          }
        });
      }
      await _secureStorage.write(key: _dbMigratedStorageKey, value: 'true');
    } catch (_) {
      // Keep app usable even if migration fails.
      // New encrypted DB will still work for fresh data.
    } finally {
      await legacyDb?.close();
    }
  }

  Future<void> _onConfigure(Database db) async {
    // PRAGMAs must run outside onCreate transaction on some Android devices.
    await db.execute('PRAGMA foreign_keys=ON');
    await db.rawQuery('PRAGMA journal_mode=WAL');
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''CREATE TABLE IF NOT EXISTS children (
      uuid TEXT PRIMARY KEY, irerero_id TEXT UNIQUE, centre_code TEXT NOT NULL,
      full_name TEXT NOT NULL, date_of_birth TEXT NOT NULL, sex TEXT NOT NULL,
      guardian_name TEXT NOT NULL, guardian_phone TEXT NOT NULL, home_village TEXT NOT NULL,
      enrolment_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
      photo_path TEXT, notes TEXT DEFAULT '',
      is_orphan INTEGER, has_disability INTEGER, hiv_exposure_status INTEGER,
      chronic_conditions TEXT DEFAULT '', created_by TEXT, synced_at TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL)''');

    await db.execute('''CREATE TABLE IF NOT EXISTS measurements (
      uuid TEXT PRIMARY KEY, child_uuid TEXT NOT NULL REFERENCES children(uuid),
      weight_kg REAL, height_cm REAL, muac_cm REAL, temperature_c REAL, head_circ_cm REAL,
      measurement_position TEXT DEFAULT 'standing',
      waz_score REAL, haz_score REAL, whz_score REAL,
      nutritional_status TEXT DEFAULT 'normal', biv_flagged INTEGER DEFAULT 0,
      biv_confirmed INTEGER DEFAULT 0, source TEXT DEFAULT 'manual', device_id TEXT DEFAULT '',
      recorded_by TEXT NOT NULL, recorded_at TEXT NOT NULL, synced_at TEXT, created_at TEXT NOT NULL)''');

    await db.execute('''CREATE TABLE IF NOT EXISTS attendance (
      uuid TEXT PRIMARY KEY, child_uuid TEXT NOT NULL REFERENCES children(uuid),
      date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'absent',
      absence_reason TEXT DEFAULT '', recorded_by TEXT NOT NULL, recorded_at TEXT NOT NULL,
      synced_at TEXT, UNIQUE(child_uuid, date))''');

    await db.execute('''CREATE TABLE IF NOT EXISTS alerts (
      uuid TEXT PRIMARY KEY, child_uuid TEXT NOT NULL REFERENCES children(uuid),
      alert_type TEXT NOT NULL, severity TEXT NOT NULL,
      trigger_data_json TEXT NOT NULL DEFAULT '{}',
      explanation_en TEXT NOT NULL DEFAULT '', explanation_rw TEXT NOT NULL DEFAULT '',
      recommendation_en TEXT NOT NULL DEFAULT '', recommendation_rw TEXT NOT NULL DEFAULT '',
      generated_at TEXT NOT NULL, actioned_by TEXT, actioned_at TEXT,
      action_taken TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'active',
      consecutive_days_absent INTEGER, synced_at TEXT)''');

    await db.execute('''CREATE TABLE IF NOT EXISTS referrals (
      uuid TEXT PRIMARY KEY, child_uuid TEXT NOT NULL REFERENCES children(uuid),
      referral_date TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      health_centre_name TEXT NOT NULL, outcome_date TEXT,
      diagnosis TEXT DEFAULT '', treatment TEXT DEFAULT '',
      hospitalised INTEGER, follow_up_instructions TEXT DEFAULT '',
      referred_by TEXT NOT NULL, pdf_path TEXT, synced_at TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL)''');

    await db.execute('''CREATE TABLE IF NOT EXISTS nutrition_programmes (
      uuid TEXT PRIMARY KEY, child_uuid TEXT NOT NULL REFERENCES children(uuid),
      programme_type TEXT NOT NULL, enrolment_date TEXT NOT NULL,
      expected_end_date TEXT, outcome TEXT DEFAULT 'ongoing',
      synced_at TEXT, created_at TEXT NOT NULL)''');

    await db.execute('''CREATE TABLE IF NOT EXISTS meal_records (
      uuid TEXT PRIMARY KEY, centre_code TEXT NOT NULL, date TEXT NOT NULL,
      menu_description TEXT NOT NULL, children_fed_count INTEGER DEFAULT 0,
      recorded_by TEXT NOT NULL, synced_at TEXT, UNIQUE(centre_code, date))''');

    await db.execute('''CREATE TABLE IF NOT EXISTS food_intake_flags (
      uuid TEXT PRIMARY KEY, child_uuid TEXT NOT NULL REFERENCES children(uuid),
      meal_uuid TEXT NOT NULL, poor_intake INTEGER NOT NULL DEFAULT 1,
      notes TEXT DEFAULT '', recorded_by TEXT NOT NULL, recorded_at TEXT NOT NULL, synced_at TEXT)''');

    await db.execute('''CREATE TABLE IF NOT EXISTS immunisation (
      uuid TEXT PRIMARY KEY, child_uuid TEXT NOT NULL REFERENCES children(uuid),
      vaccine_name TEXT NOT NULL, scheduled_date TEXT NOT NULL,
      administered_date TEXT, status TEXT NOT NULL DEFAULT 'due', synced_at TEXT)''');

    await db.execute('''CREATE TABLE IF NOT EXISTS milestones (
      uuid TEXT PRIMARY KEY, child_uuid TEXT NOT NULL REFERENCES children(uuid),
      age_band TEXT NOT NULL, milestone_item TEXT NOT NULL, achieved INTEGER NOT NULL DEFAULT 0,
      assessed_at TEXT NOT NULL, assessed_by TEXT NOT NULL, synced_at TEXT)''');

    await db.execute('''CREATE TABLE IF NOT EXISTS sync_queue (
      uuid TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_uuid TEXT NOT NULL,
      operation TEXT NOT NULL DEFAULT 'create', payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL, synced_at TEXT, status TEXT NOT NULL DEFAULT 'pending')''');

    await db.execute('''CREATE TABLE IF NOT EXISTS users_cache (
      user_id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL,
      role TEXT NOT NULL, centre_code TEXT, password_hash TEXT NOT NULL,
      last_login TEXT, token_expiry TEXT, phone_number TEXT DEFAULT '', email TEXT DEFAULT '')''');

    await db.execute('''CREATE TABLE IF NOT EXISTS lms_tables (
      indicator TEXT NOT NULL, sex TEXT NOT NULL, index_value REAL NOT NULL,
      l_value REAL NOT NULL, m_value REAL NOT NULL, s_value REAL NOT NULL,
      PRIMARY KEY (indicator, sex, index_value))''');

    // Performance indexes — NFR-001
    await db.execute('CREATE INDEX IF NOT EXISTS idx_meas_child ON measurements(child_uuid, recorded_at DESC)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_alerts_child ON alerts(child_uuid, status)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_att_child ON attendance(child_uuid, date DESC)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status, created_at)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_children_centre ON children(centre_code, status)');
  }

  Future<int> insert(String table, Map<String, dynamic> row) async {
    final db = await database;
    return db.insert(table, row, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> query(String table,
      {String? where, List<dynamic>? whereArgs, String? orderBy, int? limit}) async {
    final db = await database;
    return db.query(table, where: where, whereArgs: whereArgs, orderBy: orderBy, limit: limit);
  }

  Future<int> update(String table, Map<String, dynamic> values,
      {required String where, required List<dynamic> whereArgs}) async {
    final db = await database;
    return db.update(table, values, where: where, whereArgs: whereArgs);
  }

  Future<void> rawExecute(String sql, [List<dynamic>? args]) async {
    final db = await database;
    await db.execute(sql, args);
  }
}
