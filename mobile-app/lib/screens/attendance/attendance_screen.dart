// lib/screens/attendance/attendance_screen.dart
// Daily attendance — default all absent, tap to mark present — FR-042
// Absence reason dropdown — FR-046
// Max 35 taps for 30 children — NFR-017
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../db/database_helper.dart';
import '../../services/auth_service.dart';
import '../../sync/sync_service.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});
  @override State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  List<Map<String, dynamic>> _children = [];
  Map<String, String> _status = {};   // childUuid -> 'present'|'absent'
  Map<String, String> _reasons = {};  // childUuid -> reason
  bool _loading = true;
  bool _saving  = false;
  final _today  = DateTime.now().toIso8601String().substring(0, 10);

  // Absence reasons — FR-046
  static const _reasonOptions = [
    ('sick',              'Arwaye'),
    ('family_emergency',  'Ikibazo cya Familiya'),
    ('seasonal_farming',  'Akazi k\'Ubuhinzi'),
    ('parent_travel',     'Urugendo rw\'Umubyeyi'),
    ('unknown',           'Ntizwi'),
  ];

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    final rows = await DatabaseHelper.instance.query('children',
        where: "status = 'active'", orderBy: 'full_name ASC');
    // Default: all absent — FR-042
    final statusMap  = {for (final r in rows) r['uuid'] as String: 'absent'};
    final reasonsMap = <String, String>{};
    // Load today's existing records
    final today = await DatabaseHelper.instance.query('attendance',
        where: 'date = ?', whereArgs: [_today]);
    for (final a in today) {
      statusMap[a['child_uuid'] as String]  = a['status'] as String;
      reasonsMap[a['child_uuid'] as String] = a['absence_reason'] as String? ?? '';
    }
    if (mounted) setState(() { _children = rows; _status = statusMap; _reasons = reasonsMap; _loading = false; });
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final auth = context.read<AuthService>();
    final sync = context.read<SyncService>();
    final uuid = const Uuid();
    for (final child in _children) {
      final childId = child['uuid'] as String;
      final record  = {
        'uuid':           uuid.v4(),
        'child_uuid':     childId,
        'date':           _today,
        'status':         _status[childId] ?? 'absent',
        'absence_reason': _reasons[childId] ?? '',
        'recorded_by':    auth.userId ?? '',
        'recorded_at':    DateTime.now().toIso8601String(),
      };
      await DatabaseHelper.instance.insert('attendance', record);
      await sync.enqueue(entityType: 'attendance', entityUuid: record['uuid']!, payload: {
        'child_id': childId, 'date': _today,
        'status': record['status'], 'absence_reason': record['absence_reason'],
      });
    }
    if (mounted) {
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ibarura ryatunganijwe!'), backgroundColor: Colors.green),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return Column(children: [
      Padding(padding: const EdgeInsets.all(12),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('$_today — ${_children.length} abana',
              style: const TextStyle(fontWeight: FontWeight.bold)),
          FilledButton.icon(
            onPressed: _saving ? null : _save,
            icon: _saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.save),
            label: Text(_saving ? 'Bitungwa...' : 'Bika Ibarura'),
          ),
        ]),
      ),
      Expanded(child: ListView.builder(
        itemCount: _children.length,
        itemBuilder: (ctx, i) {
          final child   = _children[i];
          final id      = child['uuid'] as String;
          final present = _status[id] == 'present';
          return ListTile(
            leading: GestureDetector(
              // Single tap marks present/absent — NFR-017: 1 tap per child
              onTap: () => setState(() => _status[id] = present ? 'absent' : 'present'),
              child: CircleAvatar(
                backgroundColor: present ? Colors.green : Colors.red,
                child: Icon(present ? Icons.check : Icons.close, color: Colors.white, size: 20),
              ),
            ),
            title: Text(child['full_name'] as String? ?? ''),
            trailing: !present
                ? DropdownButton<String>(
                    value: _reasons[id]?.isNotEmpty == true ? _reasons[id] : null,
                    hint: const Text('Impamvu', style: TextStyle(fontSize: 12)),
                    underline: const SizedBox(),
                    items: _reasonOptions.map((r) =>
                      DropdownMenuItem(value: r.$1, child: Text(r.$2, style: const TextStyle(fontSize: 12)))).toList(),
                    onChanged: (v) => setState(() => _reasons[id] = v ?? ''),
                  )
                : null,
          );
        },
      )),
    ]);
  }
}
