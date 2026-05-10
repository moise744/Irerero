// lib/screens/children/child_list_screen.dart
// Child register — searchable, filterable — FR-015
import 'package:flutter/material.dart';
import '../../db/database_helper.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/child_avatar.dart';
import 'child_profile_screen.dart';
import 'register_child_screen.dart';

class ChildListScreen extends StatefulWidget {
  const ChildListScreen({super.key});
  @override State<ChildListScreen> createState() => _ChildListScreenState();
}

class _ChildListScreenState extends State<ChildListScreen> {
  List<Map<String, dynamic>> _children = [];
  final Map<String, String> _statusByChild = {}; // childUuid -> nutritional_status
  String _search = '';
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    final rows = await DatabaseHelper.instance.query('children',
        where: _search.isNotEmpty ? "full_name LIKE ? OR irerero_id LIKE ?" : null,
        whereArgs: _search.isNotEmpty ? ['%$_search%', '%$_search%'] : null,
        orderBy: 'full_name ASC');

    // FR-023: nutritional status visible on lists/dashboards.
    // Compute each child's last known nutritional_status from local measurements.
    _statusByChild.clear();
    for (final c in rows) {
      final childUuid = c['uuid'] as String?;
      if (childUuid == null || childUuid.isEmpty) continue;
      final lastM = await DatabaseHelper.instance.query(
        'measurements',
        where: 'child_uuid = ?',
        whereArgs: [childUuid],
        orderBy: 'recorded_at DESC',
        limit: 1,
      );
      if (lastM.isNotEmpty) {
        final s = lastM.first['nutritional_status'] as String?;
        if (s != null && s.isNotEmpty) _statusByChild[childUuid] = s;
      }
    }

    if (mounted) setState(() { _children = rows; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFFef295d), Color(0xFFa22891)]),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFef295d).withOpacity(0.3),
              blurRadius: 8,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: FloatingActionButton.extended(
          backgroundColor: Colors.transparent,
          elevation: 0,
          onPressed: () async {
            await Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const RegisterChildScreen()),
            );
            _load();
          },
          icon: const Icon(Icons.person_add_alt_1, color: Colors.white),
          label: const Text('Andika Umwana', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: SearchBar(
            hintText: 'Shakisha umwana...',
            leading: Icon(Icons.search, color: Theme.of(context).colorScheme.primary),
            backgroundColor: WidgetStateProperty.all(Colors.white),
            elevation: WidgetStateProperty.all(1),
            shape: WidgetStateProperty.all(RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant.withOpacity(0.5)),
            )),
            onChanged: (v) { _search = v; _load(); },
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  itemCount: _children.length,
                  itemBuilder: (ctx, i) {
                    final c = _children[i];
                    final childUuid = (c['uuid'] as String?) ?? '';
                    final status = _statusByChild[childUuid] ?? 'unmeasured';
                    return ListTile(
                      leading: ChildAvatar(child: c),
                      title: Text(c['full_name'] as String? ?? ''),
                      subtitle: Text(c['irerero_id'] as String? ?? ''),
                      trailing: StatusBadge(status: status, compact: true),
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => ChildProfileScreen(child: c),
                          ),
                        );
                      },
                    );
                  },
                ),
        ),
      ]),
    );
  }
}
