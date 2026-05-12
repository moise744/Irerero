// lib/screens/children/register_child_screen.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import 'package:image_picker/image_picker.dart'; 

import '../../db/database_helper.dart';
import '../../services/auth_service.dart';
import '../../sync/sync_service.dart';
import '../../theme/irerero_colors.dart';

class RegisterChildScreen extends StatefulWidget {
  const RegisterChildScreen({super.key});

  @override
  State<RegisterChildScreen> createState() => _RegisterChildScreenState();
}

class _RegisterChildScreenState extends State<RegisterChildScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _guardianCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _villageCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  DateTime? _dob;
  String _sex = 'female';
  bool _saving = false;
  bool _consentGiven = false; 
  bool _consentScreenShown = true;
  XFile? _photo; 
  final ImagePicker _picker = ImagePicker();

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

  Future<void> _takePhoto() async {
    final XFile? photo = await _picker.pickImage(source: ImageSource.camera, maxWidth: 600);
    if (photo != null && mounted) setState(() => _photo = photo);
  }

  String _isoDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_dob == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Hitamo itariki y’amavuko (DOB).'), backgroundColor: IrereroColors.amber),
      );
      return;
    }
    if (!_consentGiven) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ugomba kwemeza uburenganzira bw\'umubyeyi.'), backgroundColor: IrereroColors.coral),
      );
      return;
    }

    final auth = context.read<AuthService>();
    final sync = context.read<SyncService>();

    if (!auth.isLoggedIn || auth.centreId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ntushobora kwandika umwana utinjiye (login) neza.'), backgroundColor: IrereroColors.coral),
      );
      return;
    }

    setState(() => _saving = true);

    // P15: Duplicate child detection
    final existingChildren = await DatabaseHelper.instance.query(
      'children',
      where: 'full_name = ? AND date_of_birth = ?',
      whereArgs: [_nameCtrl.text.trim(), _isoDate(_dob!)],
    );
    if (existingChildren.isNotEmpty && mounted) {
      final proceed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('⚠️ Umwana ashobora kuba yaranditswe'),
          content: Text(
            'Umwana ufite izina "${_nameCtrl.text.trim()}" n\'itariki y\'amavuko ${_isoDate(_dob!)} asanzwe mu bubiko.\n\n'
            'Urashaka gukomeza kwandika?',
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Oya')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yego, komeza')),
          ],
        ),
      );
      if (proceed != true) {
        if (mounted) setState(() => _saving = false);
        return;
      }
    }

    final now = DateTime.now();
    final childUuid = const Uuid().v4();
    final nowIso = now.toIso8601String();

    await DatabaseHelper.instance.insert('children', {
      'uuid': childUuid,
      'irerero_id': 'LOCAL-$childUuid',
      'centre_code': auth.centreId!.toString(),
      'full_name': _nameCtrl.text.trim(),
      'date_of_birth': _isoDate(_dob!),
      'sex': _sex,
      'guardian_name': _guardianCtrl.text.trim(),
      'guardian_phone': _phoneCtrl.text.trim(),
      'home_village': _villageCtrl.text.trim(),
      'enrolment_date': _isoDate(now),
      'status': 'active',
      'photo_path': _photo?.path ?? '',
      'notes': _notesCtrl.text.trim(),
      'created_by': auth.userId ?? '',
      'synced_at': '',
      'created_at': nowIso,
      'updated_at': nowIso,
    });

    await sync.enqueue(
      entityType: 'child',
      entityUuid: childUuid,
      payload: {
        'centre_id': auth.centreId,
        'full_name': _nameCtrl.text.trim(),
        'date_of_birth': _isoDate(_dob!),
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
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    if (_consentScreenShown) {
      return Scaffold(
        appBar: AppBar(title: const Text('Uburenganzira')),
        body: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.privacy_tip, size: 64, color: IrereroColors.forest),
              const SizedBox(height: 24),
              const Text('Kwemeza Uburenganzira bw\'Umubyeyi', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              const Text('Hakurikijwe itegeko rya Rwanda Law No. 058/2021, ugomba gusaba umubyeyi cyangwa umurera uburenganzira mbere yo kwinjiza amakuru y\'umwana muri sisitemu.', textAlign: TextAlign.center),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton(
                  onPressed: () => setState(() { _consentGiven = true; _consentScreenShown = false; }),
                  child: const Text('Nabyumvise, Umubyeyi yabyemeye'),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Simbifitiye uburenganzira'),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Andika Umwana')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Center(
              child: GestureDetector(
                onTap: _takePhoto,
                child: CircleAvatar(
                  radius: 50,
                  backgroundColor: IrereroColors.mint.withOpacity(0.5),
                  backgroundImage: _photo != null ? FileImage(File(_photo!.path)) : null,
                  child: _photo == null ? const Icon(Icons.camera_alt, size: 40, color: IrereroColors.inkMuted) : null,
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameCtrl,
              decoration: const InputDecoration(labelText: 'Amazina y’umwana', border: OutlineInputBorder()),
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
                    value: _sex,
                    decoration: const InputDecoration(labelText: 'Igitsina', border: OutlineInputBorder()),
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
              decoration: const InputDecoration(labelText: 'Izina ry’umurera/umubyeyi', border: OutlineInputBorder()),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Andika izina ry’umurera.' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Telefoni y’umurera', border: OutlineInputBorder()),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Andika telefoni.' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _villageCtrl,
              decoration: const InputDecoration(labelText: 'Umudugudu', border: OutlineInputBorder()),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Andika umudugudu.' : null,
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 52,
              child: FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving ? const CircularProgressIndicator(color: Colors.white) : const Icon(Icons.save),
                label: Text(_saving ? 'Biri kubikwa…' : 'Bika'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}