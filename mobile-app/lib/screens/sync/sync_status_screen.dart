// lib/screens/sync/sync_status_screen.dart
// Sync status — last sync time, pending queue count — FR-086, FR-087
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../sync/sync_service.dart';
import '../../services/auth_service.dart';

class SyncStatusScreen extends StatelessWidget {
  const SyncStatusScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer2<SyncService, AuthService>(
      builder: (context, sync, auth, _) => ListView(
        padding: const EdgeInsets.all(20),
        children: [
          ListTile(
            leading: Icon(Icons.cloud_done,
                color: sync.status == SyncStatus.synced ? Colors.green : Colors.orange),
            title: const Text('Aho Bihagaze'),
            subtitle: Text(sync.status.name.toUpperCase()),
          ),
          ListTile(
            leading: const Icon(Icons.schedule),
            title: const Text('Isync ya nyuma'),
            subtitle: Text(sync.lastSyncAt?.toLocal().toString() ?? 'Ntiyasyzwa na rimwe'),
          ),
          ListTile(
            leading: const Icon(Icons.pending_actions),
            title: const Text('Gutegereje Koherezwa'),
            subtitle: Text('${sync.pendingCount} inyandiko'),
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: sync.isSyncing ? null : () => sync.syncIfConnected(auth: auth),
            icon: sync.isSyncing
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.sync),
            label: Text(sync.isSyncing ? 'Birasuzumwa...' : 'Suzuma Ubu'),
          ),
        ],
      ),
    );
  }
}
