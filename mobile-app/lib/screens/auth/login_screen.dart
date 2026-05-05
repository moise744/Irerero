// lib/screens/auth/login_screen.dart
//
// Login screen — username + password + language selector.
// FR-001: secure login. FR-004: offline login.
// NFR-013: default Kinyarwanda. NFR-014: plain error messages.
// NFR-015: min 48x48 dp touch targets. Material Design 3.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../sync/sync_service.dart';
import '../home/home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form       = GlobalKey<FormState>();
  final _userCtrl   = TextEditingController();
  final _passCtrl   = TextEditingController();
  final _pinCtrl    = TextEditingController();
  bool  _loading    = false;
  bool  _obscure    = true;
  bool  _pinObscure = true;
  bool  _hasPin     = false;
  String? _error;
  String _selectedLang = 'rw'; // Default Kinyarwanda — NFR-013

  final _labels = {
    'rw': {
      'title':    'Irerero',
      'subtitle': 'Gufata neza Abana b\'Inshuke',
      'username': 'Amazina y\'ukwinjira',
      'password': 'Ijambo banga',
      'login':    'Injira',
      'pinLogin': 'Injira ukoresheje PIN',
      'offline':  '(Ukoresha amakuru ashyinguwe)',
    },
    'en': {
      'title':    'Irerero',
      'subtitle': 'Early Childhood Development Platform',
      'username': 'Username',
      'password': 'Password',
      'login':    'Log In',
      'pinLogin': 'Log In with PIN',
      'offline':  '(Using saved credentials)',
    },
  };

  Map<String, String> get _t => _labels[_selectedLang]!;

  @override
  void initState() {
    super.initState();
    _loadPinAvailability();
  }

  Future<void> _loadPinAvailability() async {
    final hasPin = await context.read<AuthService>().hasPin();
    if (mounted) setState(() => _hasPin = hasPin);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: cs.surface,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Form(
                key: _form,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Language selector — NFR-013
                    Align(
                      alignment: Alignment.centerRight,
                      child: SegmentedButton<String>(
                        segments: const [
                          ButtonSegment(value: 'rw', label: Text('RW')),
                          ButtonSegment(value: 'en', label: Text('EN')),
                        ],
                        selected: {_selectedLang},
                        onSelectionChanged: (v) {
                          setState(() => _selectedLang = v.first);
                          context.read<AuthService>().setLocale(
                            Locale(_selectedLang));
                        },
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Logo / branding
                    Icon(Icons.child_care, size: 64, color: cs.primary),
                    const SizedBox(height: 8),
                    Text(_t['title']!,
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold,
                            color: cs.primary)),
                    Text(_t['subtitle']!,
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 14, color: cs.onSurfaceVariant)),
                    const SizedBox(height: 32),

                    // Error display — NFR-014 plain language
                    if (_error != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: cs.errorContainer,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(children: [
                          Icon(Icons.error_outline, color: cs.error, size: 20),
                          const SizedBox(width: 8),
                          Expanded(child: Text(_error!,
                              style: TextStyle(color: cs.onErrorContainer))),
                        ]),
                      ),
                    if (_error != null) const SizedBox(height: 16),

                    // Username field — NFR-015: 48dp+ touch target
                    TextFormField(
                      controller: _userCtrl,
                      decoration: InputDecoration(
                        labelText: _t['username'],
                        prefixIcon: const Icon(Icons.person_outline),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: cs.outlineVariant),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: cs.outlineVariant),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: cs.primary, width: 2),
                        ),
                        filled: true,
                        fillColor: Colors.white,
                      ),
                      validator: (v) => v == null || v.isEmpty
                          ? (_selectedLang == 'rw' ? 'Uzuza iri gace.' : 'This field is required.')
                          : null,
                    ),
                    const SizedBox(height: 16),

                    // Password field
                    TextFormField(
                      controller: _passCtrl,
                      obscureText: _obscure,
                      decoration: InputDecoration(
                        labelText: _t['password'],
                        prefixIcon: const Icon(Icons.lock_outline),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: cs.outlineVariant),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: cs.outlineVariant),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: cs.primary, width: 2),
                        ),
                        filled: true,
                        fillColor: Colors.white,
                        suffixIcon: IconButton(
                          icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
                          onPressed: () => setState(() => _obscure = !_obscure),
                          tooltip: _obscure ? 'Show password' : 'Hide password',
                        ),
                      ),
                      validator: (v) => v == null || v.isEmpty
                          ? (_selectedLang == 'rw' ? 'Uzuza iri gace.' : 'This field is required.')
                          : null,
                    ),
                    const SizedBox(height: 24),

                    // Login button — NFR-015: 48dp minimum height
                    Container(
                      height: 52,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFef295d), Color(0xFFa22891)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFef295d).withOpacity(0.3),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          )
                        ],
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: _loading ? null : _submit,
                          child: Center(
                            child: _loading
                                ? const SizedBox(width: 20, height: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : Text(
                                    _t['login']!, 
                                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 1.1)
                                  ),
                          ),
                        ),
                      ),
                    ),

                    if (_hasPin) ...[
                      const SizedBox(height: 14),
                      const Divider(),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _pinCtrl,
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        obscureText: _pinObscure,
                        decoration: InputDecoration(
                          labelText: 'PIN',
                          prefixIcon: const Icon(Icons.pin),
                          border: const OutlineInputBorder(),
                          suffixIcon: IconButton(
                            icon: Icon(_pinObscure ? Icons.visibility_off : Icons.visibility),
                            onPressed: () => setState(() => _pinObscure = !_pinObscure),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 52,
                        child: OutlinedButton.icon(
                          onPressed: _loading ? null : _submitPin,
                          icon: const Icon(Icons.fingerprint),
                          label: Text(_t['pinLogin']!, style: const TextStyle(fontSize: 16)),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    final auth   = context.read<AuthService>();
    final result = await auth.login(_userCtrl.text.trim(), _passCtrl.text);

    setState(() => _loading = false);

    if (result['success'] == true) {
      context.read<SyncService>().startMonitor(auth);
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute<void>(builder: (_) => const HomeScreen()),
          (route) => false,
        );
      }
    } else {
      setState(() => _error = result['error'] as String?);
    }
  }

  Future<void> _submitPin() async {
    final pin = _pinCtrl.text.trim();
    if (pin.length < 4 || pin.length > 6) {
      setState(() => _error = 'PIN must be 4-6 digits.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    final auth = context.read<AuthService>();
    final result = await auth.loginWithPin(pin);
    setState(() => _loading = false);

    if (result['success'] == true) {
      context.read<SyncService>().startMonitor(auth);
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute<void>(builder: (_) => const HomeScreen()),
          (route) => false,
        );
      }
    } else {
      setState(() => _error = result['error'] as String?);
    }
  }

  @override
  void dispose() {
    _userCtrl.dispose();
    _passCtrl.dispose();
    _pinCtrl.dispose();
    super.dispose();
  }
}
