// lib/screens/alerts/alerts_screen.dart
// Active alerts list — urgent first, stays until actioned — FR-034
// No Z-scores in display — AI-FR-017
import 'package:flutter/material.dart';
import '../../db/database_helper.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});
  @override State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  List<Map<String, dynamic>> _alerts = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() => _loading = true);
    final rows = await DatabaseHelper.instance.query('alerts',
        where: "status = 'active'",
        orderBy: "CASE severity WHEN 'urgent' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END ASC, generated_at DESC");
    if (!mounted) return;
    setState(() { _alerts = rows; _loading = false; });
  }

  Color _severityColour(String s) =>
      s == 'urgent' ? const Color(0xFFe21e5a) : s == 'warning' ? Colors.orange : const Color(0xFF3E35A5);

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_alerts.isEmpty) return const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.check_circle_outline, size: 48, color: Color(0xFF00d084)),
      SizedBox(height: 12), Text('Nta burira bushya. Byose ni byiza!', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black54)),
    ]));
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _alerts.length,
      itemBuilder: (ctx, i) {
        final a       = _alerts[i];
        final sev     = a['severity'] as String? ?? 'warning';
        final colour  = _severityColour(sev);
        // Show Kinyarwanda explanation — AI-FR-016, AI-FR-017 (no Z-scores)
        final explanation = a['explanation_rw'] as String? ??
                            a['explanation_en'] as String? ?? '';
        final recommendation = a['recommendation_rw'] as String? ??
                               a['recommendation_en'] as String? ?? '';
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: ExpansionTile(
            leading: CircleAvatar(backgroundColor: colour.withOpacity(0.15),
                child: Icon(Icons.warning_rounded, color: colour)),
            title: Text(explanation, maxLines: 2, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13)),
            subtitle: Text(sev.toUpperCase(),
                style: TextStyle(color: colour, fontWeight: FontWeight.bold, fontSize: 11)),
            children: [
              Padding(padding: const EdgeInsets.all(16), child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Ingamba:', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(recommendation),
                  const SizedBox(height: 12),
                  SizedBox(width: double.infinity,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [Color(0xFFef295d), Color(0xFFa22891)]),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          foregroundColor: Colors.white,
                        ),
                        onPressed: () => _showActionDialog(a),
                        icon: const Icon(Icons.check),
                        label: const Text('Yemera & Andika Ingamba Wafashe', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ),
                ],
              )),
            ],
          ),
        );
      },
    );
  }

  Future<void> _showActionDialog(Map<String, dynamic> alert) async {
    final ctrl = TextEditingController();
    try {
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Andika Ingamba Wafashe'),
          content: TextField(
            controller: ctrl,
            decoration: const InputDecoration(
              hintText: 'Urugero: Nahamagaye umubyeyi, nayobye ku kigo cy\'ubuzima...',
            ),
            maxLines: 3,
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Reka')),
            FilledButton(
              onPressed: () async {
                await _markActioned(alert, ctrl.text.trim());
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Bika'),
            ),
          ],
        ),
      );
    } finally {
      ctrl.dispose();
    }
  }

  Future<void> _markActioned(Map<String, dynamic> alert, String action) async {
    await DatabaseHelper.instance.update('alerts',
        {'status': 'actioned', 'actioned_at': DateTime.now().toIso8601String(), 'action_taken': action},
        where: 'uuid = ?', whereArgs: [alert['uuid']]);
    _load();
  }
}
