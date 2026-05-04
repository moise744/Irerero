import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../sync/sync_service.dart';
import '../../db/database_helper.dart';

class ConflictResolutionScreen extends StatefulWidget {
  const ConflictResolutionScreen({super.key});

  @override
  State<ConflictResolutionScreen> createState() => _ConflictResolutionScreenState();
}

class _ConflictResolutionScreenState extends State<ConflictResolutionScreen> {
  List<Map<String, dynamic>> _conflicts = [];

  @override
  void initState() {
    super.initState();
    _loadConflicts();
  }

  Future<void> _loadConflicts() async {
    final db = DatabaseHelper.instance;
    final rows = await db.query('sync_queue', where: 'status = ?', whereArgs: ['conflict']);
    setState(() => _conflicts = rows);
  }

  @override
  Widget build(BuildContext context) {
    final syncService = Provider.of<SyncService>(context);

    return Scaffold(
      app_bar: AppBar(title: const Text('Resolve Data Conflicts')),
      body: _conflicts.isEmpty
          ? const Center(child: Text('No unresolved conflicts found.'))
          : ListView.builder(
              itemCount: _conflicts.length,
              itemBuilder: (context, index) {
                final conflict = _conflicts[index];
                final serverData = jsonDecode(conflict['payload_json']);
                final entityUuid = conflict['entity_uuid'];

                return Card(
                  margin: const EdgeInsets.all(8.0),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Entity: ${conflict['entity_type']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        const Text('The server has a newer version of this record. Which version should we keep?'),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            ElevatedButton(
                              onPressed: () => _resolve(syncService, entityUuid, 'local'),
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.teal),
                              child: const Text('Keep My Version'),
                            ),
                            ElevatedButton(
                              onPressed: () => _resolve(syncService, entityUuid, 'remote'),
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
                              child: const Text('Use Server Version'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  Future<void> _resolve(SyncService syncService, String uuid, String resolution) async {
    await syncService.resolveConflict(uuid, resolution);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Resolved using $resolution version.')),
    );
    _loadConflicts();
  }
}