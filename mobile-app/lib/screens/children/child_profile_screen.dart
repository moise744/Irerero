// lib/screens/children/child_profile_screen.dart
import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../db/database_helper.dart';
import '../../services/auth_service.dart';
import '../../sync/sync_service.dart';
import '../../widgets/status_badge.dart';
import '../measurements/measurement_screen.dart';
import '../referrals/referral_screen.dart';
import '../nutrition/nutrition_screen.dart';
import '../../ai/zscore_calculator.dart';

import 'edit_child_profile_screen.dart';

class ChildProfileScreen extends StatefulWidget {
  final Map<String, dynamic> child;
  const ChildProfileScreen({super.key, required this.child});
  @override State<ChildProfileScreen> createState() => _ChildProfileScreenState();
}

class _ChildProfileScreenState extends State<ChildProfileScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  Map<String, dynamic>? _lastMeasurement;
  String _currentStatus = 'normal';
  String? _trendArrow;
  late Map<String, dynamic> _childData;

  // 8 tabs now including Milestones (Ibimenyetso)
  static const _tabLabels = ['Imikurire', 'Ibarura', 'Indyo', 'Guhanura', 'Iburira', 'Inkingo', 'Ibimenyetso', 'Inyandiko'];

  @override
  void initState() {
    super.initState();
    _childData = widget.child;
    _tabs = TabController(length: 8, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    final childId = _childData['uuid'] as String;
    final meas = await DatabaseHelper.instance.query('measurements',
        where: 'child_uuid = ?', whereArgs: [childId],
        orderBy: 'recorded_at DESC', limit: 2);

    if (meas.isNotEmpty) {
      final last = meas.first;
      String? arrow;
      if (meas.length >= 2) {
        final curr = (last['weight_kg'] as num?)?.toDouble() ?? 0;
        final prev = (meas[1]['weight_kg'] as num?)?.toDouble() ?? 0;
        if (curr > prev + 0.1) arrow = '↑';
        else if (curr < prev - 0.1) arrow = '↓';
        else arrow = '→';
      }
      if (mounted) setState(() {
        _lastMeasurement = last;
        _currentStatus   = last['nutritional_status'] as String? ?? 'normal';
        _trendArrow      = arrow;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final child = _childData;

    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(child['full_name'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
          Text(child['irerero_id'] as String? ?? '', style: const TextStyle(fontSize: 12)),
        ]),
        actions: [
          if (_trendArrow != null) Padding(
            padding: const EdgeInsets.all(8),
            child: Chip(label: Text(_trendArrow!, style: TextStyle(
              color: _trendArrow == '↑' ? const Color(0xFF00d084) : _trendArrow == '↓' ? const Color(0xFFe21e5a) : Colors.orange,
              fontSize: 18, fontWeight: FontWeight.bold))),
          ),
          IconButton(icon: const Icon(Icons.edit), tooltip: 'Edit Profile',
              onPressed: () async {
                final updated = await Navigator.push(context, MaterialPageRoute(
                    builder: (_) => EditChildProfileScreen(child: _childData)));
                if (updated == true) {
                  final dbData = await DatabaseHelper.instance.query('children', where: 'uuid = ?', whereArgs: [child['uuid']]);
                  if (dbData.isNotEmpty && mounted) {
                    setState(() => _childData = dbData.first);
                  }
                }
              }),
          IconButton(icon: const Icon(Icons.monitor_weight_outlined), tooltip: 'Record measurement',
              onPressed: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => MeasurementScreen(child: _childData)))),
        ],
        bottom: TabBar(controller: _tabs,
            isScrollable: true,
            tabs: _tabLabels.map((t) => Tab(text: t)).toList()),
      ),
      body: TabBarView(controller: _tabs, children: [
        _GrowthTab(child: child, lastMeasurement: _lastMeasurement, currentStatus: _currentStatus),
        _AttendanceTab(child: child),
        _NutritionTab(child: child),
        _ReferralsTab(child: child),
        _AlertsTab(child: child),
        _ImmunisationTab(child: child),
        _MilestonesTab(child: child),
        _NotesTab(child: child),
      ]),
    );
  }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }
}

// ── Tab 1: Growth ──────────────────────────────────────────────────────────
class _GrowthTab extends StatelessWidget {
  final Map<String, dynamic> child;
  final Map<String, dynamic>? lastMeasurement;
  final String currentStatus;
  const _GrowthTab({required this.child, required this.lastMeasurement, required this.currentStatus});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StatusBadge(status: currentStatus),
          const SizedBox(height: 16),
          if (lastMeasurement != null) ...[
            const Text('Ibipimo bya Nyuma',
                style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            _MeasRow('Ibiro', '${lastMeasurement!['weight_kg'] ?? '—'} kg'),
            _MeasRow('Uburebure', '${lastMeasurement!['height_cm'] ?? '—'} cm'),
            _MeasRow('MUAC', '${lastMeasurement!['muac_cm'] ?? '—'} cm'),
            _MeasRow(
                'Ubushyuhe', '${lastMeasurement!['temperature_c'] ?? '—'} °C'),
            _MeasRow('Umutwe', '${lastMeasurement!['head_circ_cm'] ?? '—'} cm'),
          ],
          const SizedBox(height: 16),
          Expanded(child: _WhoGrowthChart(child: child)),
        ],
      ),
    );
  }
}

class _WhoGrowthChart extends StatefulWidget {
  final Map<String, dynamic> child;
  const _WhoGrowthChart({required this.child});
  @override State<_WhoGrowthChart> createState() => _WhoGrowthChartState();
}

class _WhoGrowthChartState extends State<_WhoGrowthChart> {
  bool _showWeight = true;

  @override
  Widget build(BuildContext context) {
    final child = widget.child;
    final dob = DateTime.tryParse(child['date_of_birth'] as String? ?? '');
    final sex = (child['sex'] as String?) ?? 'male';
    final childUuid = (child['uuid'] as String?) ?? '';
    final cs = Theme.of(context).colorScheme;

    if (dob == null || childUuid.isEmpty) return const Center(child: Text('Missing child DOB/ID.'));

    return FutureBuilder<List<Map<String, dynamic>>>(
      future: DatabaseHelper.instance.query(
        'measurements',
        where: 'child_uuid = ? AND biv_flagged = 0',
        whereArgs: [childUuid],
        orderBy: 'recorded_at ASC',
        limit: 120,
      ),
      builder: (ctx, snap) {
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final rows = snap.data!;
        final points = <FlSpot>[];
        for (final m in rows) {
          final recordedAt = DateTime.tryParse(m['recorded_at'] as String? ?? '');
          if (recordedAt == null) continue;
          final ageMonths = (recordedAt.difference(dob).inDays / 30.4375);
          if (ageMonths < 0 || ageMonths > 60) continue;
          final y = _showWeight ? (m['weight_kg'] as num?)?.toDouble() : (m['height_cm'] as num?)?.toDouble();
          if (y == null) continue;
          points.add(FlSpot(double.parse(ageMonths.toStringAsFixed(2)), y));
        }

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(_showWeight ? 'Weight-for-Age (kg)' : 'Height-for-Age (cm)', style: const TextStyle(fontWeight: FontWeight.bold))),
                    SegmentedButton<bool>(
                      segments: const [
                        ButtonSegment(value: true, label: Text('W')),
                        ButtonSegment(value: false, label: Text('H')),
                      ],
                      selected: {_showWeight},
                      onSelectionChanged: (v) => setState(() => _showWeight = v.first),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Expanded(
                  child: FutureBuilder<_CurveBundle>(
                    future: _buildCurves(sex: sex, isWeight: _showWeight),
                    builder: (ctx, curveSnap) {
                      if (!curveSnap.hasData) return const Center(child: CircularProgressIndicator());
                      final curves = curveSnap.data!;
                      final allY = [...curves.p3.map((e) => e.y), ...curves.p97.map((e) => e.y), ...points.map((e) => e.y)];
                      final minY = (allY.isEmpty ? 0.0 : allY.reduce((a, b) => a < b ? a : b)) * 0.95;
                      final maxY = (allY.isEmpty ? 10.0 : allY.reduce((a, b) => a > b ? a : b)) * 1.05;

                      return LineChart(
                        LineChartData(
                          minX: 0, maxX: 60, minY: minY.isFinite ? minY : 0, maxY: maxY.isFinite ? maxY : 10,
                          gridData: const FlGridData(show: true),
                          borderData: FlBorderData(show: true, border: Border.all(color: cs.outlineVariant)),
                          titlesData: FlTitlesData(
                            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                            bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 28, interval: 12, getTitlesWidget: (v, meta) => Padding(padding: const EdgeInsets.only(top: 6), child: Text('${v.toInt()}m', style: const TextStyle(fontSize: 10))))),
                            leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40, interval: _showWeight ? 2 : 5, getTitlesWidget: (v, meta) => Text(v.toStringAsFixed(0), style: const TextStyle(fontSize: 10)))),
                          ),
                          lineBarsData: [
                            _curveLine(curves.p3, Colors.grey.shade400), _curveLine(curves.p15, Colors.grey.shade500),
                            _curveLine(curves.p50, Colors.grey.shade700), _curveLine(curves.p85, Colors.grey.shade500),
                            _curveLine(curves.p97, Colors.grey.shade400),
                            LineChartBarData(spots: points, isCurved: false, color: cs.primary, barWidth: 3, dotData: const FlDotData(show: true)),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  LineChartBarData _curveLine(List<FlSpot> spots, Color c) => LineChartBarData(spots: spots, isCurved: true, color: c, barWidth: 1.5, dotData: const FlDotData(show: false));

  Future<_CurveBundle> _buildCurves({required String sex, required bool isWeight}) async {
    final indicator = isWeight ? 'waz' : 'haz';
    final z = ZScoreCalculator.percentileZ;
    final p3 = <FlSpot>[]; final p15 = <FlSpot>[]; final p50 = <FlSpot>[]; final p85 = <FlSpot>[]; final p97 = <FlSpot>[];

    for (int m = 0; m <= 60; m++) {
      final row = await ZScoreCalculator.instance.getNearestLmsRow(indicator: indicator, sex: sex, indexVal: m.toDouble());
      if (row == null) continue;
      final x = m.toDouble();
      p3.add(FlSpot(x, ZScoreCalculator.instance.lmsInverse(z[3]!, row.l, row.m, row.s)));
      p15.add(FlSpot(x, ZScoreCalculator.instance.lmsInverse(z[15]!, row.l, row.m, row.s)));
      p50.add(FlSpot(x, ZScoreCalculator.instance.lmsInverse(z[50]!, row.l, row.m, row.s)));
      p85.add(FlSpot(x, ZScoreCalculator.instance.lmsInverse(z[85]!, row.l, row.m, row.s)));
      p97.add(FlSpot(x, ZScoreCalculator.instance.lmsInverse(z[97]!, row.l, row.m, row.s)));
    }
    return _CurveBundle(p3: p3, p15: p15, p50: p50, p85: p85, p97: p97);
  }
}

class _CurveBundle {
  final List<FlSpot> p3, p15, p50, p85, p97;
  const _CurveBundle({required this.p3, required this.p15, required this.p50, required this.p85, required this.p97});
}

class _MeasRow extends StatelessWidget {
  final String label, value;
  const _MeasRow(this.label, this.value);
  @override Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(label, style: const TextStyle(color: Colors.grey)), Text(value, style: const TextStyle(fontWeight: FontWeight.bold))]));
}

// ── Tab 2: Attendance ──────────────────────────────────────────────────────
class _AttendanceTab extends StatefulWidget {
  final Map<String, dynamic> child;
  const _AttendanceTab({required this.child});
  @override State<_AttendanceTab> createState() => _AttendanceTabState();
}
class _AttendanceTabState extends State<_AttendanceTab> {
  List<Map<String, dynamic>> _records = [];
  @override void initState() {
    super.initState();
    DatabaseHelper.instance.query('attendance', where: 'child_uuid = ?', whereArgs: [widget.child['uuid']], orderBy: 'date DESC', limit: 30)
        .then((r) { if (mounted) setState(() => _records = r); });
  }
  @override Widget build(BuildContext context) => _records.isEmpty
      ? const Center(child: Text('No attendance records yet'))
      : ListView.builder(itemCount: _records.length, itemBuilder: (_, i) {
          final r = _records[i];
          return ListTile(
            leading: Icon(r['status'] == 'present' ? Icons.check_circle : Icons.cancel, color: r['status'] == 'present' ? const Color(0xFF00d084) : const Color(0xFFe21e5a)),
            title: Text(r['date'] as String? ?? ''),
            subtitle: r['absence_reason'] != null && (r['absence_reason'] as String).isNotEmpty ? Text(r['absence_reason'] as String) : null,
          );
        });
}

// ── Tab 3: Nutrition ─────────────────────────────────────────────────────
class _NutritionTab extends StatelessWidget {
  final Map<String, dynamic> child;
  const _NutritionTab({required this.child});
  @override Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        const Icon(Icons.restaurant, size: 48, color: Color(0xFF00d084)),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => NutritionScreen(childUuid: child['uuid']))),
          icon: const Icon(Icons.open_in_new), label: const Text('Fungura Indyo'),
        ),
        const SizedBox(height: 24),
        // P17: Flag poor food intake button
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFFe21e5a),
            side: const BorderSide(color: Color(0xFFe21e5a)),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          ),
          onPressed: () async {
            final confirm = await showDialog<bool>(
              context: context,
              builder: (ctx) => AlertDialog(
                icon: const Icon(Icons.no_food, color: Color(0xFFe21e5a), size: 40),
                title: const Text('Andika ibiryo bibi'),
                content: const Text('Urashaka gushyira ikimenyetso ko uyu mwana adashobora kurya neza?'),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Oya')),
                  FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: const Color(0xFFe21e5a)),
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('Yego'),
                  ),
                ],
              ),
            );
            if (confirm == true) {
              // Record in local DB
              final auth = context.read<AuthService>();
              await DatabaseHelper.instance.insert('food_intake_flags', {
                'uuid': const Uuid().v4(),
                'child_uuid': child['uuid'],
                'meal_uuid': 'manual-flag',
                'poor_intake': 1,
                'notes': 'Poor food intake flagged by caregiver',
                'recorded_by': auth.userId ?? 'unknown',
                'recorded_at': DateTime.now().toIso8601String(),
                'synced_at': '',
              });
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Ikimenyetso cy\'ibiryo bibi cyashyizweho.'),
                    backgroundColor: Color(0xFFe21e5a),
                  ),
                );
              }
            }
          },
          icon: const Icon(Icons.no_food),
          label: const Text('Andika Ibiryo bibi'),
        ),
      ]),
    );
  }
}

// ── Tab 4: Referrals ─────────────────────────────────────────────────────
class _ReferralsTab extends StatelessWidget {
  final Map<String, dynamic> child;
  const _ReferralsTab({required this.child});
  @override Widget build(BuildContext context) {
    return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.local_hospital, size: 48, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ReferralScreen(childUuid: child['uuid']))),
          icon: const Icon(Icons.open_in_new), label: const Text('Fungura Referrals'),
        ),
      ]),
    );
  }
}

// ── Tab 5: Alerts ────────────────────────────────────────────────────────
class _AlertsTab extends StatefulWidget {
  final Map<String, dynamic> child;
  const _AlertsTab({required this.child});
  @override State<_AlertsTab> createState() => _AlertsTabState();
}

class _AlertsTabState extends State<_AlertsTab> {
  @override Widget build(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: DatabaseHelper.instance.query('alerts', where: 'child_uuid = ?', whereArgs: [widget.child['uuid']], orderBy: "CASE status WHEN 'resolved' THEN 3 WHEN 'active' THEN 0 ELSE 1 END ASC, CASE severity WHEN 'urgent' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END ASC, generated_at DESC"),
      builder: (ctx, snap) {
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final rows = snap.data!;
        if (rows.isEmpty) return const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.check_circle_outline, size: 48, color: Color(0xFF00d084)), SizedBox(height: 8), Text('Nta burira kuri uyu mwana.')]));
        Color colour(String s, String status) => status == 'resolved' ? Colors.grey : (s == 'urgent' ? const Color(0xFFe21e5a) : s == 'warning' ? Colors.orange : const Color(0xFF3E35A5));
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: rows.length,
          itemBuilder: (_, i) {
            final a = rows[i];
            final sev = a['severity'] as String? ?? 'warning';
            final status = a['status'] as String? ?? 'active';
            final isResolved = status == 'resolved';
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ExpansionTile(
                leading: Icon(isResolved ? Icons.check_circle : Icons.warning_rounded, color: colour(sev, status)),
                title: Text(a['explanation_rw'] as String? ?? a['explanation_en'] as String? ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(decoration: isResolved ? TextDecoration.lineThrough : null)),
                subtitle: Text(isResolved ? 'RESOLVED' : sev.toUpperCase(), style: TextStyle(color: colour(sev, status), fontWeight: FontWeight.bold, fontSize: 11)),
                children: [
                  Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Ingamba:', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4), Text(a['recommendation_rw'] as String? ?? a['recommendation_en'] as String? ?? ''),
                    if (!isResolved) ...[
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: () async {
                           await DatabaseHelper.instance.update('alerts', {'status': 'resolved', 'synced_at': null}, where: 'uuid = ?', whereArgs: [a['uuid']]);
                           setState(() {});
                        },
                        icon: const Icon(Icons.check),
                        label: const Text('Mark Actioned'),
                      )
                    ]
                  ]))
                ],
              ),
            );
          },
        );
      },
    );
  }
}

// ── Tab 6: Immunisation ──────────────────────────────────────────────────
class _ImmunisationTab extends StatefulWidget {
  final Map<String, dynamic> child;
  const _ImmunisationTab({required this.child});
  @override State<_ImmunisationTab> createState() => _ImmunisationTabState();
}
class _ImmunisationTabState extends State<_ImmunisationTab> {
  Future<void> _markAdministered(String uuid) async {
    await DatabaseHelper.instance.update('immunisation', 
      {'status': 'administered', 'administered_date': DateTime.now().toIso8601String().substring(0, 10), 'synced_at': null},
      where: 'uuid = ?', whereArgs: [uuid]);
    setState(() {});
  }
  @override Widget build(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: DatabaseHelper.instance.query('immunisation', where: 'child_uuid = ?', whereArgs: [widget.child['uuid']], orderBy: 'scheduled_date ASC'),
      builder: (ctx, snap) {
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final rows = snap.data!;
        if (rows.isEmpty) {
          return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.vaccines, size: 48, color: Theme.of(context).colorScheme.primary.withOpacity(0.5)),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () async {
                final vaccines = [
                  'BCG (Birth)', 'OPV 0 (Birth)',
                  'OPV 1 (6w)', 'Pentavalent 1 (6w)', 'PCV 1 (6w)', 'Rota 1 (6w)',
                  'OPV 2 (10w)', 'Pentavalent 2 (10w)', 'PCV 2 (10w)', 'Rota 2 (10w)',
                  'OPV 3 (14w)', 'Pentavalent 3 (14w)', 'PCV 3 (14w)', 'Rota 3 (14w)',
                  'Measles/Rubella 1 (9m)',
                  'Measles/Rubella 2 (15m)',
                ];
                final intervals = [0, 0, 42, 42, 42, 42, 70, 70, 70, 70, 98, 98, 98, 98, 274, 456];
                
                final dobStr = widget.child['date_of_birth'] as String?;
                final dob = dobStr != null ? DateTime.tryParse(dobStr) ?? DateTime.now() : DateTime.now();
                
                for (int i=0; i<vaccines.length; i++) {
                  await DatabaseHelper.instance.insert('immunisation', {
                    'uuid': const Uuid().v4(), 'child_uuid': widget.child['uuid'],
                    'vaccine_name': vaccines[i], 'status': 'due',
                    'scheduled_date': dob.add(Duration(days: intervals[i])).toIso8601String().substring(0, 10)
                  });
                }
                setState(() {});
              },
              icon: const Icon(Icons.add), label: const Text('Initialize EPI Schedule'),
            )
          ]));
        }
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: rows.length,
          itemBuilder: (_, i) {
            final v = rows[i];
            final status = (v['status'] as String?) ?? 'due';
            final colour = status == 'administered' ? const Color(0xFF00d084) : (status == 'overdue' ? const Color(0xFFe21e5a) : Colors.orange);
            return Card(margin: const EdgeInsets.only(bottom: 10), child: ListTile(
              leading: Icon(Icons.vaccines, color: colour),
              title: Text(v['vaccine_name'] as String? ?? ''),
              subtitle: Text('Scheduled: ${v['scheduled_date'] ?? '—'} ${(v['administered_date'] as String?)?.isNotEmpty == true ? '\nGiven: ${v['administered_date']}' : ''}'),
              trailing: status == 'administered' ? Text('GIVEN', style: TextStyle(color: colour, fontWeight: FontWeight.bold, fontSize: 12))
                  : OutlinedButton(onPressed: () => _markAdministered(v['uuid']), child: const Text('Mark Given')),
            ));
          },
        );
      },
    );
  }
}

// ── Tab 7: Milestones ────────────────────────────────────────────────────
class _MilestonesTab extends StatefulWidget {
  final Map<String, dynamic> child;
  const _MilestonesTab({required this.child});
  @override State<_MilestonesTab> createState() => _MilestonesTabState();
}
class _MilestonesTabState extends State<_MilestonesTab> {
  Future<void> _toggleMilestone(String uuid, int achieved) async {
    await DatabaseHelper.instance.update('milestones', 
      {'achieved': achieved, 'assessed_at': DateTime.now().toIso8601String().substring(0, 10), 'synced_at': null},
      where: 'uuid = ?', whereArgs: [uuid]);
    setState(() {});
  }

  @override Widget build(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: DatabaseHelper.instance.query('milestones', where: 'child_uuid = ?', whereArgs: [widget.child['uuid']], orderBy: 'age_band ASC'),
      builder: (ctx, snap) {
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final rows = snap.data!;
        
        if (rows.isEmpty) {
          return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.child_care, size: 48, color: Theme.of(context).colorScheme.primary.withOpacity(0.5)),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () async {
                final bands = {
                  '0-6m': 'Social smile, Head control, Reaches for objects',
                  '6-12m': 'Sitting, Crawling, Stands with support, Pincer grasp',
                  '12-24m': 'Walking alone, First words, Points to things',
                  '24-36m': 'Runs well, Two-word phrases, Helps undress',
                  '3-4y': 'Hops on one foot, Names colours, Plays with others',
                  '4-5y': 'Draws a person, Counts to 10, Dresses self',
                  '5-6y': 'Catches a ball, Knows alphabet, Follows rules'
                };
                final now = DateTime.now().toIso8601String().substring(0, 10);
                for (final band in bands.entries) {
                  await DatabaseHelper.instance.insert('milestones', {
                    'uuid': const Uuid().v4(), 'child_uuid': widget.child['uuid'],
                    'age_band': band.key, 'milestone_item': band.value, 'achieved': 0,
                    'assessed_at': now, 'assessed_by': 'local_user'
                  });
                }
                setState(() {});
              },
              icon: const Icon(Icons.add), label: const Text('Initialize Milestones'),
            )
          ]));
        }

        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: rows.length,
          itemBuilder: (_, i) {
            final m = rows[i];
            final achieved = (m['achieved'] as int?) == 1;
            return Card(margin: const EdgeInsets.only(bottom: 10), child: CheckboxListTile(
              title: Text('[${m['age_band']}] ${m['milestone_item']}'),
              subtitle: Text('Assessed: ${m['assessed_at']}'),
              value: achieved,
              onChanged: (val) => _toggleMilestone(m['uuid'], val == true ? 1 : 0),
            ));
          },
        );
      },
    );
  }
}

// ── Tab 8: Notes ─────────────────────────────────────────────────────────
class _NotesTab extends StatefulWidget {
  final Map<String, dynamic> child;
  const _NotesTab({required this.child});
  @override State<_NotesTab> createState() => _NotesTabState();
}
class _NotesTabState extends State<_NotesTab> {
  late TextEditingController _ctrl;
  @override void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.child['notes'] as String? ?? '');
  }
  @override Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Text('Caregiver Notes', style: TextStyle(fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      Expanded(child: TextField(controller: _ctrl, maxLines: null, expands: true, textAlignVertical: TextAlignVertical.top, decoration: const InputDecoration(hintText: 'Add any observations here…', border: OutlineInputBorder()))),
      const SizedBox(height: 8),
      FilledButton(onPressed: () async {
        await DatabaseHelper.instance.update('children', {'notes': _ctrl.text}, where: 'uuid = ?', whereArgs: [widget.child['uuid']]);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Notes saved'), backgroundColor: Color(0xFF00d084)));
      }, child: const Text('Save Notes')),
    ]),
  );
  @override void dispose() { _ctrl.dispose(); super.dispose(); }
}