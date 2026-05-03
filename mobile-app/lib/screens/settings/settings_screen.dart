// lib/screens/settings/settings_screen.dart
// Language toggle (EN/Kinyarwanda), PIN setup, device mode, WHO LMS version — NFR-013 / FR-008
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _pinConfigured = false;

  @override
  void initState() {
    super.initState();
    _loadPinStatus();
  }

  Future<void> _loadPinStatus() async {
    final auth = context.read<AuthService>();
    final hasPin = await auth.hasPin();
    if (mounted) setState(() => _pinConfigured = hasPin);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    return Scaffold(
      appBar: AppBar(title: const Text('Settings / Igenamiterere')),
      body: ListView(children: [
        // Language toggle — NFR-013: switchable at any time
        ListTile(
          leading: const Icon(Icons.language),
          title: const Text('Language / Ururimi'),
          subtitle: Text(auth.preferredLocale.languageCode == 'rw' ? 'Kinyarwanda' : 'English'),
          trailing: SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'rw', label: Text('RW')),
              ButtonSegment(value: 'en', label: Text('EN')),
            ],
            selected: {auth.preferredLocale.languageCode},
            onSelectionChanged: (v) => auth.setLocale(Locale(v.first)),
          ),
        ),
        const Divider(),
        // PIN setup — FR-008
        ListTile(
          leading: const Icon(Icons.pin),
          title: const Text('PIN Quick Login'),
          subtitle: Text(
            _pinConfigured
                ? 'PIN configured (tap to change or remove)'
                : 'Set a 4-6 digit PIN for fast login',
          ),
          trailing: const Icon(Icons.chevron_right),
          onTap: _showPinDialog,
        ),
        const Divider(),
        // Device mode — BLE or HTTP
        ListTile(
          leading: const Icon(Icons.bluetooth),
          title: const Text('Measurement Device Mode'),
          subtitle: const Text('HTTP (emulator) — switch to BLE for real device'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () {},
        ),
        const Divider(),
        // WHO LMS version — NFR-026
        const ListTile(
          leading: Icon(Icons.info_outline),
          title: Text('WHO Growth Standards'),
          subtitle: Text('WHO Child Growth Standards 2006 / WHO 2007 (5-19y)\nLMS tables: v1.0 — updatable without app release'),
        ),
        const Divider(),
        ListTile(
          leading: const Icon(Icons.logout, color: Colors.red),
          title: const Text('Logout', style: TextStyle(color: Colors.red)),
          onTap: () => auth.logout(),
        ),
      ]),
    );
  }

  Future<void> _showPinDialog() async {
    final auth = context.read<AuthService>();
    final changed = await showDialog<bool>(
          context: context,
          builder: (ctx) => _PinDialog(
            pinConfigured: _pinConfigured,
            auth: auth,
          ),
        ) ??
        false;

    if (changed && mounted) {
      _loadPinStatus();
    }
  }
}

class _PinDialog extends StatefulWidget {
  final bool pinConfigured;
  final AuthService auth;
  const _PinDialog({required this.pinConfigured, required this.auth});

  @override
  State<_PinDialog> createState() => _PinDialogState();
}

class _PinDialogState extends State<_PinDialog> {
  late final TextEditingController _pinCtrl;
  late final TextEditingController _confirmCtrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _pinCtrl = TextEditingController();
    _confirmCtrl = TextEditingController();
  }

  @override
  void dispose() {
    _pinCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  bool _isValidPin(String pin) {
    final validLen = pin.length >= 4 && pin.length <= 6;
    final digitsOnly = RegExp(r'^\d+$').hasMatch(pin);
    return validLen && digitsOnly;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.pinConfigured ? 'Change PIN' : 'Set PIN'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _pinCtrl,
            keyboardType: TextInputType.number,
            maxLength: 6,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'PIN (4-6 digits)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _confirmCtrl,
            keyboardType: TextInputType.number,
            maxLength: 6,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Confirm PIN',
              border: OutlineInputBorder(),
            ),
          ),
        ],
      ),
      actions: [
        if (widget.pinConfigured)
          TextButton(
            onPressed: _saving
                ? null
                : () async {
                    setState(() => _saving = true);
                    await widget.auth.clearPin();
                    if (context.mounted) Navigator.pop(context, true);
                  },
            child: const Text('Remove PIN'),
          ),
        TextButton(
          onPressed: _saving ? null : () => Navigator.pop(context, false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saving
              ? null
              : () async {
                  final pin = _pinCtrl.text.trim();
                  final confirm = _confirmCtrl.text.trim();

                  if (!_isValidPin(pin)) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('PIN must be 4-6 digits.')),
                    );
                    return;
                  }
                  if (pin != confirm) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('PIN confirmation does not match.')),
                    );
                    return;
                  }

                  setState(() => _saving = true);
                  await widget.auth.setPin(pin);
                  if (context.mounted) Navigator.pop(context, true);
                },
          child: Text(_saving ? 'Saving…' : 'Save PIN'),
        ),
      ],
    );
  }
}
