// lib/screens/children/register_child_screen.dart
//
// Child registration form — mobile caregiver workflow.
// Saves locally first (offline-first) then enqueues for /api/v1/sync/ as type "child".

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../../db/database_helper.dart';
import '../../services/auth_service.dart';
import '../../sync/sync_service.dart';

class RegisterChildScreen extends StatefulWidget {
  const RegisterChildScreen({super.key});

  @override
  State<RegisterChildScreen> createState() => _RegisterChildScreenState();
}

class _RegisterChildScreenState extends State<RegisterChildScreen> {
  final _formKey = GlobalKey<FormState>();

  final _nameCtrl     = TextEditingController();
  final _guardianCtrl = TextEditingController();
  final _phoneCtrl    = TextEditingController();
  final _villageCtrl  = TextEditingController();
  final _notesCtrl    = TextEditingController();

  DateTime? _dob;
  String _sex = 'female';
  bool _saving = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _guardianCtrl.dispose();
    _phoneCtrl.dispose();
    _villageCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 2, now.month, now.day),
      firstDate: DateTime(now.year - 8, 1, 1),
      lastDate: now,
    );
    if (picked != null && mounted) setState(() => _dob = picked);
  }

  String _isoDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_dob == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Hitamo itariki y’amavuko (DOB).'), backgroundColor: Colors.orange),
      );
      return;
    }

    final auth = context.read<AuthService>();
    final sync = context.read<SyncService>();

    if (!auth.isLoggedIn || auth.centreId == null || auth.centreId!.toString().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ntushobora kwandika umwana utinjiye (login) neza.'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _saving = true);
    final now = DateTime.now();
    final childUuid = const Uuid().v4();
    final nowIso = now.toIso8601String();
    final dobIso = _isoDate(_dob!);
    final enrolIso = _isoDate(now);

    // Local child record (offline-first). We store centre_code as centre UUID string
    // so it is non-empty and stable; server is authoritative for centre metadata.
    await DatabaseHelper.instance.insert('children', {
      'uuid': childUuid,
      'irerero_id': 'LOCAL-$childUuid', // replaced after first server sync/pull if needed
      'centre_code': auth.centreId!.toString(),
      'full_name': _nameCtrl.text.trim(),
      'date_of_birth': dobIso,
      'sex': _sex,
      'guardian_name': _guardianCtrl.text.trim(),
      'guardian_phone': _phoneCtrl.text.trim(),
      'home_village': _villageCtrl.text.trim(),
      'enrolment_date': enrolIso,
      'status': 'active',
      'photo_path': '',
      'notes': _notesCtrl.text.trim(),
      'created_by': auth.userId ?? '',
      'synced_at': '',
      'created_at': nowIso,
      'updated_at': nowIso,
    });

    // Queue server upsert via /sync/ (backend supports type == "child")
    await sync.enqueue(
      entityType: 'child',
      entityUuid: childUuid,
      payload: {
        'centre_id': auth.centreId,
        'full_name': _nameCtrl.text.trim(),
        'date_of_birth': dobIso,
        'sex': _sex,
        'guardian_name': _guardianCtrl.text.trim(),
        'guardian_phone': _phoneCtrl.text.trim(),
        'home_village': _villageCtrl.text.trim(),
        'notes': _notesCtrl.text.trim(),
      },
    );

    await sync.syncIfConnected(auth: auth);

    if (!mounted) return;
    setState(() => _saving = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Umwana yanditswe (offline-first).'), backgroundColor: Colors.green),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Andika Umwana'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Amazina y’umwana',
                border: OutlineInputBorder(),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Andika amazina.' : null,
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickDob,
                    icon: const Icon(Icons.cake_outlined),
                    label: Text(_dob == null ? 'DOB' : _isoDate(_dob!)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _sex,
                    decoration: const InputDecoration(
                      labelText: 'Igitsina',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'female', child: Text('Gore')),
                      DropdownMenuItem(value: 'male', child: Text('Gabo')),
                    ],
                    onChanged: (v) => setState(() => _sex = v ?? 'female'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            TextFormField(
              controller: _guardianCtrl,
              decoration: const InputDecoration(
                labelText: 'Izina ry’umurera/umubyeyi',
                border: OutlineInputBorder(),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Andika izina ry’umurera.' : null,
            ),
            const SizedBox(height: 12),

            TextFormField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Telefoni y’umurera',
                border: OutlineInputBorder(),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Andika telefoni.' : null,
            ),
            const SizedBox(height: 12),

            TextFormField(
              controller: _villageCtrl,
              decoration: const InputDecoration(
                labelText: 'Umudugudu',
                border: OutlineInputBorder(),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Andika umudugudu.' : null,
            ),
            const SizedBox(height: 12),

            TextFormField(
              controller: _notesCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Ibisobanuro (notes) (optional)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),

            SizedBox(
              height: 52,
              child: FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.save),
                label: Text(_saving ? 'Biri kubikwa…' : 'Bika'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

