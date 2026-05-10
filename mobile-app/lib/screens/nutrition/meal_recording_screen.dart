import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../db/database_helper.dart';
import '../../services/auth_service.dart';
import '../../sync/sync_service.dart';

class MealRecordingScreen extends StatefulWidget {
  const MealRecordingScreen({super.key});

  @override
  State<MealRecordingScreen> createState() => _MealRecordingScreenState();
}

class _MealRecordingScreenState extends State<MealRecordingScreen> {
  final _mealTypeCtrl = TextEditingController();
  final _ingredientsCtrl = TextEditingController();
  int _childrenFed = 0;
  bool _saving = false;
  final DateTime _today = DateTime.now();
  List<Map<String, dynamic>> _recentMeals = [];

  @override
  void initState() {
    super.initState();
    _loadMeals();
  }

  Future<void> _loadMeals() async {
    final auth = context.read<AuthService>();
    final meals = await DatabaseHelper.instance.query(
      'meal_records',
      where: 'centre_code = ?',
      whereArgs: [auth.centreId?.toString() ?? ''],
      orderBy: 'date DESC',
      limit: 10,
    );
    if (mounted) setState(() => _recentMeals = meals);
  }

  Future<void> _saveMeal() async {
    if (_mealTypeCtrl.text.trim().isEmpty || _ingredientsCtrl.text.trim().isEmpty || _childrenFed <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Uzuza imyirondoro yose neza.'), backgroundColor: Colors.orange),
      );
      return;
    }

    setState(() => _saving = true);
    final auth = context.read<AuthService>();
    final sync = context.read<SyncService>();
    final uuid = const Uuid().v4();
    final dateStr = '${_today.year}-${_today.month.toString().padLeft(2, '0')}-${_today.day.toString().padLeft(2, '0')}';

    final payload = {
      'uuid': uuid,
      'centre_code': auth.centreId?.toString() ?? '',
      'date': dateStr,
      'meal_type': _mealTypeCtrl.text.trim(),
      'ingredients': _ingredientsCtrl.text.trim(),
      'children_fed_count': _childrenFed,
      'recorded_by': auth.userId ?? '',
      'synced_at': '',
    };

    await DatabaseHelper.instance.insert('meal_records', payload);
    
    await sync.enqueue(
      entityType: 'meal_record',
      entityUuid: uuid,
      payload: {
        'centre_id': auth.centreId,
        'date': dateStr,
        'meal_type': payload['meal_type'],
        'ingredients': payload['ingredients'],
        'children_fed_count': payload['children_fed_count'],
      },
    );

    _mealTypeCtrl.clear();
    _ingredientsCtrl.clear();
    _childrenFed = 0;
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ifunguro ryabitswe!'), backgroundColor: Color(0xFF00d084)),
      );
    }
    await _loadMeals();
    setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Kwandika Ifunguro')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    TextField(
                      controller: _mealTypeCtrl,
                      decoration: const InputDecoration(labelText: 'Ubwoko bw\'Ifunguro (Urugero: Igikoma, Ibiryo)'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _ingredientsCtrl,
                      decoration: const InputDecoration(labelText: 'Ibigize Ifunguro (Urugero: Kawunga, Isukari)'),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Expanded(child: Text('Umubare w\'abana bagaburiwe:')),
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline),
                          onPressed: () => setState(() { if (_childrenFed > 0) _childrenFed--; }),
                        ),
                        Text('$_childrenFed', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline),
                          onPressed: () => setState(() => _childrenFed++),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: FilledButton.icon(
                        onPressed: _saving ? null : _saveMeal,
                        icon: _saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(Icons.save),
                        label: Text(_saving ? 'Biri kubikwa...' : 'Bika Ifunguro'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Text('Amafunguro Aherutse:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            Expanded(
              child: _recentMeals.isEmpty
                  ? const Center(child: Text('Nta funguro ryanditswe.'))
                  : ListView.builder(
                      itemCount: _recentMeals.length,
                      itemBuilder: (ctx, i) {
                        final m = _recentMeals[i];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: const Icon(Icons.restaurant, color: Color(0xFF00d084)),
                            title: Text(m['meal_type'] ?? ''),
                            subtitle: Text('Ibigize: ${m['ingredients']}\nAbana: ${m['children_fed_count']}'),
                            trailing: Text(m['date'] ?? '', style: const TextStyle(fontSize: 12)),
                            isThreeLine: true,
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _mealTypeCtrl.dispose();
    _ingredientsCtrl.dispose();
    super.dispose();
  }
}
