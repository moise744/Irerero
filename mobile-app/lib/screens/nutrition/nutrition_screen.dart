// screens/nutrition/nutrition_screen.dart
//
// Nutrition programme management — enrolment tracking and meal recording.
// FR-051 to FR-060.

import 'package:flutter/material.dart';
import '../../db/database_helper.dart';
import 'package:uuid/uuid.dart';

class NutritionScreen extends StatefulWidget {
  const NutritionScreen({super.key});

  @override
  State<NutritionScreen> createState() => _NutritionScreenState();
}

class _NutritionScreenState extends State<NutritionScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  List<Map<String, dynamic>> _enrolments = [];
  List<Map<String, dynamic>> _meals = [];
  final Map<String, String> _childNameByUuid = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    final db = DatabaseHelper.instance;
    try {
      final enrolments = await db.query('nutrition_programmes',
          orderBy: 'enrolment_date DESC');
      final meals = await db.query('meal_records', orderBy: 'date DESC');

      // Resolve child names for nicer display.
      _childNameByUuid.clear();
      final children = await db.query('children', orderBy: 'full_name ASC');
      for (final c in children) {
        final id = (c['uuid'] as String?) ?? '';
        final name = (c['full_name'] as String?) ?? '';
        if (id.isNotEmpty && name.isNotEmpty) _childNameByUuid[id] = name;
      }

      if (!mounted) return;
      setState(() {
        _enrolments = enrolments;
        _meals = meals;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nutrition Programme'),
        bottom: TabBar(
          controller: _tabCtrl,
          tabs: const [
            Tab(icon: Icon(Icons.person_add), text: 'Enrolments'),
            Tab(icon: Icon(Icons.restaurant), text: 'Meals'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabCtrl,
              children: [
                _buildEnrolmentsTab(),
                _buildMealsTab(),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.restaurant_menu),
        label: const Text('Record Meal'),
        onPressed: () => _showRecordMealDialog(context),
      ),
    );
  }

  Widget _buildEnrolmentsTab() {
    if (_enrolments.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.no_food, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text('No nutrition programme enrolments',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
            const SizedBox(height: 8),
            Text('Children with SAM/MAM are auto-enrolled',
                style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _enrolments.length,
        itemBuilder: (ctx, i) {
          final e = _enrolments[i];
          final type = e['programme_type'] ?? 'sfp';
          final colour = type == 'tfp' ? Colors.red : Colors.orange;
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: colour.withOpacity(0.15),
                child: Icon(
                  type == 'tfp'
                      ? Icons.medical_services
                      : Icons.food_bank,
                  color: colour,
                ),
              ),
              title: Text(_childNameByUuid[(e['child_uuid'] as String?) ?? ''] ?? 'Child'),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    type == 'tfp'
                        ? 'Therapeutic Feeding Programme'
                        : 'Supplementary Feeding Programme',
                    style: TextStyle(fontSize: 12, color: colour),
                  ),
                  Text(
                    'Enrolled: ${e['enrolment_date'] ?? '—'}',
                    style:
                        TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
              trailing: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: (e['outcome'] == 'recovered'
                          ? Colors.green
                          : Colors.orange)
                      .withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  e['outcome'] ?? 'active',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: e['outcome'] == 'recovered'
                        ? Colors.green
                        : Colors.orange,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildMealsTab() {
    if (_meals.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.restaurant, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text('No meals recorded',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _meals.length,
        itemBuilder: (ctx, i) {
          final m = _meals[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.restaurant_menu,
                          color: Colors.teal),
                      const SizedBox(width: 8),
                      Text(m['date'] ?? '',
                          style: Theme.of(context).textTheme.titleMedium),
                      const Spacer(),
                      Chip(
                        label: Text(
                          '${m['children_fed_count'] ?? 0} children fed',
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(m['menu_description'] ?? 'No description',
                      style: const TextStyle(color: Colors.black87)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _showRecordMealDialog(BuildContext context) async {
    final saved = await showModalBottomSheet<bool>(
          context: context,
          isScrollControlled: true,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          builder: (ctx) => const _RecordMealSheet(),
        ) ??
        false;

    if (saved && mounted) {
      _loadData();
    }
  }
}

class _RecordMealSheet extends StatefulWidget {
  const _RecordMealSheet();

  @override
  State<_RecordMealSheet> createState() => _RecordMealSheetState();
}

class _RecordMealSheetState extends State<_RecordMealSheet> {
  late final TextEditingController _menuCtrl;
  late final TextEditingController _countCtrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _menuCtrl = TextEditingController();
    _countCtrl = TextEditingController();
  }

  @override
  void dispose() {
    _menuCtrl.dispose();
    _countCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Record Meal', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          TextField(
            controller: _menuCtrl,
            decoration: const InputDecoration(
              labelText: 'Menu Description',
              hintText: 'e.g. Porridge, beans, banana',
            ),
            maxLines: 2,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _countCtrl,
            decoration: const InputDecoration(labelText: 'Children Fed'),
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _saving
                  ? null
                  : () async {
                      setState(() => _saving = true);
                      await DatabaseHelper.instance.insert('meal_records', {
                        'uuid': const Uuid().v4(),
                        'centre_code': '',
                        'date': DateTime.now().toIso8601String().substring(0, 10),
                        'menu_description': _menuCtrl.text,
                        'children_fed_count': int.tryParse(_countCtrl.text) ?? 0,
                        'recorded_by': '',
                        'synced_at': null,
                      });
                      if (context.mounted) {
                        Navigator.pop(context, true);
                      }
                    },
              child: Text(_saving ? 'Saving…' : 'Save Meal'),
            ),
          ),
        ],
      ),
    );
  }
}
