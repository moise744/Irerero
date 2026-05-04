// lib/screens/settings/settings_screen.dart
//
// Settings & Profile screen for Caregivers and Managers.
// Allows logging out and checking system version.
// FR-001 (Logout)

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../auth/login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    return Scaffold(
      appBar: AppBar(title: const Text('Igenamiterere (Settings)')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SizedBox(height: 20),
          const CircleAvatar(
            radius: 50,
            backgroundColor: Colors.teal,
            child: Icon(Icons.person, size: 50, color: Colors.white),
          ),
          const SizedBox(height: 16),
          Text(
            auth.userId ?? 'Umukozi (User)',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          Text(
            auth.role?.toUpperCase() ?? 'CAREGIVER',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.grey, fontSize: 16),
          ),
          const SizedBox(height: 40),
          
          Card(
            child: ListTile(
              leading: const Icon(Icons.business, color: Colors.teal),
              title: const Text('Ikigo (Centre Code)'),
              subtitle: Text(auth.centreId ?? 'Nta kigo gihari'),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: const Icon(Icons.info_outline, color: Colors.blue),
              title: const Text('Irerero App Version'),
              subtitle: const Text('v1.0.0 (Offline-First Edition)'),
            ),
          ),
          
          const SizedBox(height: 40),
          
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red.shade700,
              padding: const EdgeInsets.all(16),
            ),
            onPressed: () async {
              // Show confirmation dialog before logging out
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Sohoka (Logout)?'),
                  content: const Text('Urifuza gusohoka muri Irerero?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('Oya (Cancel)'),
                    ),
                    FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: Colors.red),
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text('Yego (Logout)'),
                    ),
                  ],
                ),
              );

              if (confirm == true && context.mounted) {
                // Clear the session using AuthService
                await context.read<AuthService>().logout();
                
                // Navigate back to the Login Screen and clear history
                if (context.mounted) {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                    (route) => false,
                  );
                }
              }
            },
            icon: const Icon(Icons.logout),
            label: const Text('Sohoka (Logout)', style: TextStyle(fontSize: 18)),
          ),
        ],
      ),
    );
  }
}