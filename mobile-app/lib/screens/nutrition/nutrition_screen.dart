// lib/screens/nutrition/nutrition_screen.dart
import 'package:flutter/material.dart';
import '../../db/database_helper.dart';
import 'package:uuid/uuid.dart';
import '../../widgets/child_avatar.dart';

class NutritionScreen extends StatefulWidget {
  final String? childUuid;
  const NutritionScreen({super.key, this.childUuid});

  @override
  State<NutritionScreen> createState() => _NutritionScreenState();
}

class _NutritionScreenState extends State<NutritionScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  List<Map<String, dynamic>> _enrolments = [];
  List<Map<String, dynamic>> _meals = [];
  List<Map<String, dynamic>> _intakeFlags = [];
  final Map<String, String> _childNameByUuid = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    final db = DatabaseHelper.instance;
    try {
      final enrolments = widget.childUuid != null
          ? await db.query('nutrition_programmes', where: 'child_uuid = ?', whereArgs: [widget.childUuid], orderBy: 'enrolment_date DESC')
          : await db.query('nutrition_programmes', orderBy: 'enrolment_date DESC');
      final meals = await db.query('meal_records', orderBy: 'date DESC');
      final intakeFlags = widget.childUuid != null
          ? await db.query('food_intake_flags', where: 'child_uuid = ?', whereArgs: [widget.childUuid], orderBy: 'recorded_at DESC')
          : await db.query('food_intake_flags', orderBy: 'recorded_at DESC');

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
        _intakeFlags = intakeFlags;
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
          isScrollable: true,
          tabs: const [
            Tab(icon: Icon(Icons.person_add), text: 'Enrolments'),
            Tab(icon: Icon(Icons.restaurant), text: 'Meals'),
            Tab(icon: Icon(Icons.warning_amber), text: 'Poor Intake'),
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
                _buildIntakeFlagsTab(),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: const Text('Actions'),
        onPressed: () {
          showModalBottomSheet(context: context, builder: (ctx) => SafeArea(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              ListTile(
                leading: const Icon(Icons.restaurant_menu),
                title: const Text('Record Daily Meal'),
                onTap: () { Navigator.pop(ctx); _showRecordMealDialog(context); },
              ),
              ListTile(
                leading: const Icon(Icons.person_add),
                title: const Text('Enrol Child in Programme'),
                onTap: () { Navigator.pop(ctx); _showEnrolmentDialog(context); },
              ),
              ListTile(
                leading: const Icon(Icons.warning_amber, color: Colors.orange),
                title: const Text('Flag Poor Food Intake'),
                onTap: () { Navigator.pop(ctx); _showPoorIntakeDialog(context); },
              ),
            ]),
          ));
        },
      ),
    );
  }

  Widget _buildEnrolmentsTab() {
    if (_enrolments.isEmpty) return const Center(child: Text('No nutrition programme enrolments'));
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
              leading: CircleAvatar(backgroundColor: colour.withOpacity(0.15), child: Icon(Icons.medical_services, color: colour)),
              title: Text(_childNameByUuid[(e['child_uuid'] as String?) ?? ''] ?? 'Child'),
              subtitle: Text('${type.toString().toUpperCase()} - Enrolled: ${e['enrolment_date']}'),
              trailing: Text(e['outcome'] ?? 'active', style: TextStyle(fontWeight: FontWeight.bold, color: colour)),
            ),
          );
        },
      ),
    );
  }

  Widget _buildMealsTab() {
    if (_meals.isEmpty) return const Center(child: Text('No meals recorded'));
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _meals.length,
        itemBuilder: (ctx, i) {
          final m = _meals[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: const Icon(Icons.restaurant_menu, color: Colors.teal),
              title: Text(m['date'] ?? ''),
              subtitle: Text(m['menu_description'] ?? 'No description'),
              trailing: Chip(label: Text('${m['children_fed_count'] ?? 0} fed')),
            ),
          );
        },
      ),
    );
  }

  Widget _buildIntakeFlagsTab() {
    if (_intakeFlags.isEmpty) return const Center(child: Text('No poor intake flags recorded'));
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _intakeFlags.length,
        itemBuilder: (ctx, i) {
          final f = _intakeFlags[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: const Icon(Icons.warning, color: Colors.orange),
              title: Text(_childNameByUuid[(f['child_uuid'] as String?) ?? ''] ?? 'Child'),
              subtitle: Text('Notes: ${f['notes'] ?? 'None'}'),
              trailing: const Text('POOR INTAKE', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 10)),
            ),
          );
        },
      ),
    );
  }

  Future<void> _showEnrolmentDialog(BuildContext context) async {
    final children = widget.childUuid != null 
        ? await DatabaseHelper.instance.query('children', where: 'uuid = ?', whereArgs: [widget.childUuid])
        : await DatabaseHelper.instance.query('children');
    String? selectedChild = widget.childUuid;
    String progType = 'sfp';

    if (!context.mounted) return;
    await showDialog(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Enrol Child'),
      content: StatefulBuilder(builder: (ctx, setDialogState) {
        return Column(mainAxisSize: MainAxisSize.min, children: [
          DropdownButtonFormField<String>(
            hint: const Text('Select Child'),
            value: selectedChild,
            items: children.map((c) => DropdownMenuItem(value: c['uuid'].toString(), child: Row(mainAxisSize: MainAxisSize.min, children: [ChildAvatar(child: c, radius: 12), const SizedBox(width: 8), Text(c['full_name'].toString())]))).toList(),
            onChanged: widget.childUuid != null ? null : (v) => setDialogState(() => selectedChild = v),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            value: progType,
            items: const [
              DropdownMenuItem(value: 'sfp', child: Text('SFP (MAM)')),
              DropdownMenuItem(value: 'tfp', child: Text('TFP (SAM)')),
              DropdownMenuItem(value: 'rutf', child: Text('RUTF (SAM Outpatient)')),
            ],
            onChanged: (v) => setDialogState(() => progType = v!),
          ),
        ]);
      }),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        FilledButton(onPressed: () async {
          if (selectedChild == null) return;
          await DatabaseHelper.instance.insert('nutrition_programmes', {
            'uuid': const Uuid().v4(),
            'child_uuid': selectedChild,
            'programme_type': progType,
            'enrolment_date': DateTime.now().toIso8601String().substring(0, 10),
            'outcome': 'ongoing',
            'created_at': DateTime.now().toIso8601String()
          });
          Navigator.pop(ctx);
          _loadData();
        }, child: const Text('Enrol'))
      ],
    ));
  }

  Future<void> _showRecordMealDialog(BuildContext context) async {
    final menuCtrl = TextEditingController();
    final countCtrl = TextEditingController();
    await showDialog(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Record Meal'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: menuCtrl, decoration: const InputDecoration(labelText: 'Menu Description (e.g. Porridge)')),
        TextField(controller: countCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Children Fed Count')),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        FilledButton(onPressed: () async {
          await DatabaseHelper.instance.insert('meal_records', {
            'uuid': const Uuid().v4(),
            'centre_code': 'LOCAL',
            'date': DateTime.now().toIso8601String().substring(0, 10),
            'menu_description': menuCtrl.text,
            'children_fed_count': int.tryParse(countCtrl.text) ?? 0,
            'recorded_by': 'local_user',
          });
          Navigator.pop(ctx);
          _loadData();
        }, child: const Text('Save'))
      ],
    ));
  }

  Future<void> _showPoorIntakeDialog(BuildContext context) async {
    final children = widget.childUuid != null 
        ? await DatabaseHelper.instance.query('children', where: 'uuid = ?', whereArgs: [widget.childUuid])
        : await DatabaseHelper.instance.query('children');
    String? selectedChild = widget.childUuid;
    final notesCtrl = TextEditingController();

    if (!context.mounted) return;
    await showDialog(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Flag Poor Food Intake'),
      content: StatefulBuilder(builder: (ctx, setDialogState) {
        return Column(mainAxisSize: MainAxisSize.min, children: [
          DropdownButtonFormField<String>(
            hint: const Text('Select Child'),
            value: selectedChild,
            items: children.map((c) => DropdownMenuItem(value: c['uuid'].toString(), child: Row(mainAxisSize: MainAxisSize.min, children: [ChildAvatar(child: c, radius: 12), const SizedBox(width: 8), Text(c['full_name'].toString())]))).toList(),
            onChanged: widget.childUuid != null ? null : (v) => setDialogState(() => selectedChild = v),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: notesCtrl,
            decoration: const InputDecoration(labelText: 'Notes (Optional)'),
            maxLines: 2,
          ),
        ]);
      }),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        FilledButton(onPressed: () async {
          if (selectedChild == null) return;
          await DatabaseHelper.instance.insert('food_intake_flags', {
            'uuid': const Uuid().v4(),
            'child_uuid': selectedChild,
            'meal_uuid': 'unspecified', // In a full app, link to specific meal
            'poor_intake': 1,
            'notes': notesCtrl.text,
            'recorded_by': 'local_user',
            'recorded_at': DateTime.now().toIso8601String(),
          });
          Navigator.pop(ctx);
          _loadData();
        }, child: const Text('Save Flag'))
      ],
    ));
  }
}