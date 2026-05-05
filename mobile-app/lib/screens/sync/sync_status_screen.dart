// lib/screens/sync/sync_status_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../sync/sync_service.dart';
import '../../services/auth_service.dart';
import '../../db/database_helper.dart';

class SyncStatusScreen extends StatefulWidget {
  const SyncStatusScreen({super.key});

  @override
  State<SyncStatusScreen> createState() => _SyncStatusScreenState();
}

class _SyncStatusScreenState extends State<SyncStatusScreen> {
  List<Map<String, dynamic>> _pendingRecords = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadQueue();
  }

  Future<void> _loadQueue() async {
    if (!mounted) return;
    setState(() => _loading = true);
    final rows = await DatabaseHelper.instance.query(
      'sync_queue',
      where: 'status = ?',
      whereArgs: ['pending'],
      orderBy: 'created_at DESC',
    );
    if (mounted) setState(() { _pendingRecords = rows; _loading = false; });
  }

  Future<void> _clearQueue() async {
    await DatabaseHelper.instance.rawExecute("DELETE FROM sync_queue WHERE status = 'pending'");
    _loadQueue();
    if (mounted) {
      context.read<SyncService>().syncIfConnected(); // forces refresh of pending count
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pending queue cleared. Local data preserved.'), backgroundColor: Colors.orange));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<SyncService, AuthService>(
      builder: (context, sync, auth, _) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
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
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: sync.isSyncing ? null : () async {
                          await sync.syncIfConnected(auth: auth);
                          _loadQueue();
                        },
                        icon: sync.isSyncing
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Icon(Icons.sync),
                        label: Text(sync.isSyncing ? 'Birasuzumwa...' : 'Suzuma Ubu'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          const Divider(),
          const Padding(
            padding: EdgeInsets.all(8.0),
            child: Text('Pending Queue & Conflicts (For Managers)', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
          ),
          
          Expanded(
            child: _loading ? const Center(child: CircularProgressIndicator()) 
            : _pendingRecords.isEmpty 
              ? const Center(child: Text('No pending records.', style: TextStyle(color: Colors.grey)))
              : ListView.builder(
                  itemCount: _pendingRecords.length,
                  itemBuilder: (ctx, i) {
                    final r = _pendingRecords[i];
                    return ListTile(
                      leading: const Icon(Icons.queue_play_next, color: Colors.orange),
                      title: Text('${r['entity_type']} (${r['operation']})'),
                      subtitle: Text('ID: ${r['entity_uuid']}\nQueued: ${r['created_at']}'),
                      isThreeLine: true,
                    );
                  },
                ),
          ),

          if (_pendingRecords.isNotEmpty && auth.role == 'centre_mgr')
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: OutlinedButton.icon(
                icon: const Icon(Icons.delete_sweep, color: Colors.red),
                label: const Text('Force Clear Queue (Resolve Conflict)', style: TextStyle(color: Colors.red)),
                onPressed: () {
                  showDialog(context: context, builder: (ctx) => AlertDialog(
                    title: const Text('Clear Queue?'),
                    content: const Text('If records are stuck due to server conflict, you can clear the queue. Local data remains safe on your device.'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                      FilledButton(onPressed: () { Navigator.pop(ctx); _clearQueue(); }, style: FilledButton.styleFrom(backgroundColor: Colors.red), child: const Text('Clear Queue')),
                    ],
                  ));
                },
              ),
            ),
        ],
      ),
    );
  }
}