// lib/screens/children/edit_child_profile_screen.dart
import 'package:flutter/material.dart';
import '../../db/database_helper.dart';
import '../../sync/sync_service.dart';
import 'package:provider/provider.dart';

class EditChildProfileScreen extends StatefulWidget {
  final Map<String, dynamic> child;

  const EditChildProfileScreen({super.key, required this.child});

  @override
  State<EditChildProfileScreen> createState() => _EditChildProfileScreenState();
}

class _EditChildProfileScreenState extends State<EditChildProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameCtrl;
  late TextEditingController _guardianCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _villageCtrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.child['full_name']);
    _guardianCtrl = TextEditingController(text: widget.child['guardian_name']);
    _phoneCtrl = TextEditingController(text: widget.child['guardian_phone']);
    _villageCtrl = TextEditingController(text: widget.child['home_village']);
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _guardianCtrl.dispose();
    _phoneCtrl.dispose();
    _villageCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final updatedData = {
      'full_name': _nameCtrl.text,
      'guardian_name': _guardianCtrl.text,
      'guardian_phone': _phoneCtrl.text,
      'home_village': _villageCtrl.text,
      'updated_at': DateTime.now().toIso8601String(),
      'synced_at': null,
    };

    final uuid = widget.child['uuid'] as String;

    await DatabaseHelper.instance.update(
      'children',
      updatedData,
      where: 'uuid = ?',
      whereArgs: [uuid],
    );

    final syncPayload = {
      'full_name': _nameCtrl.text,
      'guardian_name': _guardianCtrl.text,
      'guardian_phone': _phoneCtrl.text,
      'home_village': _villageCtrl.text,
    };

    if (mounted) {
      await context.read<SyncService>().enqueue(
        entityType: 'child',
        entityUuid: uuid,
        payload: syncPayload,
      );
      Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Child Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(labelText: 'Full Name'),
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _guardianCtrl,
                decoration: const InputDecoration(labelText: 'Guardian Name'),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phoneCtrl,
                decoration: const InputDecoration(labelText: 'Guardian Phone'),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _villageCtrl,
                decoration: const InputDecoration(labelText: 'Home Village'),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: FilledButton(
                  onPressed: _saving ? null : _saveProfile,
                  child: _saving
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Save Changes', style: TextStyle(fontSize: 18)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
