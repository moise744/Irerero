// lib/screens/children/child_profile_screen.dart
//
// 7-tab child profile — FR-062.
// Tabs: Growth, Attendance, Nutrition, Referrals, Alerts, Immunisation, Notes.

import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../../db/database_helper.dart';
import '../../services/auth_service.dart';
import '../../sync/sync_service.dart';
import '../../widgets/status_badge.dart';
import '../measurements/measurement_screen.dart';
import '../referrals/referral_screen.dart';
import '../nutrition/nutrition_screen.dart';
import '../../ai/zscore_calculator.dart';

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

  // 7 tabs — FR-062, SRS §5.1
  static const _tabLabels = ['Imikurire', 'Ibarura', 'Indyo', 'Guhanura', 'Iburira', 'Inkingo', 'Inyandiko'];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 7, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    final childId = widget.child['uuid'] as String;
    final meas = await DatabaseHelper.instance.query('measurements',
        where: 'child_uuid = ?', whereArgs: [childId],
        orderBy: 'recorded_at DESC', limit: 2);

    if (meas.isNotEmpty) {
      final last = meas.first;
      // Trend arrow — PUD §6.2
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
    final child = widget.child;

    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(child['full_name'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
          Text(child['irerero_id'] as String? ?? '', style: const TextStyle(fontSize: 12)),
        ]),
        actions: [
          // Trend arrow on all profile screens — PUD §6.2
          if (_trendArrow != null) Padding(
            padding: const EdgeInsets.all(8),
            child: Chip(label: Text(_trendArrow!, style: TextStyle(
              color: _trendArrow == '↑' ? Colors.green : _trendArrow == '↓' ? Colors.red : Colors.orange,
              fontSize: 18, fontWeight: FontWeight.bold))),
          ),
          IconButton(icon: const Icon(Icons.monitor_weight_outlined), tooltip: 'Record measurement',
              onPressed: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => MeasurementScreen(child: child)))),
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

          // FR-024: growth curve chart with WHO reference percentile lines.
          Expanded(
            child: _WhoGrowthChart(child: child),
          ),
        ],
      ),
    );
  }
}

class _WhoGrowthChart extends StatefulWidget {
  final Map<String, dynamic> child;
  const _WhoGrowthChart({required this.child});

  @override
  State<_WhoGrowthChart> createState() => _WhoGrowthChartState();
}

class _WhoGrowthChartState extends State<_WhoGrowthChart> {
  bool _showWeight = true; // toggle between weight-for-age and height-for-age

  @override
  Widget build(BuildContext context) {
    final child = widget.child;
    final dob = DateTime.tryParse(child['date_of_birth'] as String? ?? '');
    final sex = (child['sex'] as String?) ?? 'male';
    final childUuid = (child['uuid'] as String?) ?? '';
    final cs = Theme.of(context).colorScheme;

    if (dob == null || childUuid.isEmpty) {
      return const Center(child: Text('Missing child DOB/ID for chart.'));
    }

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
          final y = _showWeight
              ? (m['weight_kg'] as num?)?.toDouble()
              : (m['height_cm'] as num?)?.toDouble();
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
                      child: Text(
                        _showWeight ? 'Weight-for-Age (kg)' : 'Height-for-Age (cm)',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    SegmentedButton<bool>(
                      segments: const [
                        ButtonSegment(value: true, label: Text('Weight')),
                        ButtonSegment(value: false, label: Text('Height')),
                      ],
                      selected: {_showWeight},
                      onSelectionChanged: (v) => setState(() => _showWeight = v.first),
                      style: ButtonStyle(
                        visualDensity: VisualDensity.compact,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        padding: const WidgetStatePropertyAll(
                          EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Expanded(
                  child: FutureBuilder<_CurveBundle>(
                    future: _buildCurves(sex: sex, isWeight: _showWeight),
                    builder: (ctx, curveSnap) {
                      if (!curveSnap.hasData) {
                        return const Center(child: CircularProgressIndicator());
                      }
                      final curves = curveSnap.data!;
                      final allY = [
                        ...curves.p3.map((e) => e.y),
                        ...curves.p97.map((e) => e.y),
                        ...points.map((e) => e.y),
                      ];
                      final minY = (allY.isEmpty ? 0.0 : allY.reduce((a, b) => a < b ? a : b)) * 0.95;
                      final maxY = (allY.isEmpty ? 10.0 : allY.reduce((a, b) => a > b ? a : b)) * 1.05;

                      return LineChart(
                        LineChartData(
                          minX: 0,
                          maxX: 60,
                          minY: minY.isFinite ? minY : 0,
                          maxY: maxY.isFinite ? maxY : 10,
                          gridData: const FlGridData(show: true),
                          borderData: FlBorderData(
                            show: true,
                            border: Border.all(color: cs.outlineVariant),
                          ),
                          titlesData: FlTitlesData(
                            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                            bottomTitles: AxisTitles(
                              sideTitles: SideTitles(
                                showTitles: true,
                                reservedSize: 28,
                                interval: 12,
                                getTitlesWidget: (v, meta) =>
                                    Padding(padding: const EdgeInsets.only(top: 6), child: Text('${v.toInt()}m', style: const TextStyle(fontSize: 10))),
                              ),
                            ),
                            leftTitles: AxisTitles(
                              sideTitles: SideTitles(
                                showTitles: true,
                                reservedSize: 40,
                                interval: _showWeight ? 2 : 5,
                                getTitlesWidget: (v, meta) =>
                                    Text(v.toStringAsFixed(0), style: const TextStyle(fontSize: 10)),
                              ),
                            ),
                          ),
                          lineBarsData: [
                            _curveLine(curves.p3, Colors.grey.shade400),
                            _curveLine(curves.p15, Colors.grey.shade500),
                            _curveLine(curves.p50, Colors.grey.shade700),
                            _curveLine(curves.p85, Colors.grey.shade500),
                            _curveLine(curves.p97, Colors.grey.shade400),
                            LineChartBarData(
                              spots: points,
                              isCurved: false,
                              color: cs.primary,
                              barWidth: 3,
                              dotData: const FlDotData(show: true),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  points.isEmpty
                      ? 'No measurements yet to plot.'
                      : 'WHO reference curves: P3, P15, P50, P85, P97',
                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  LineChartBarData _curveLine(List<FlSpot> spots, Color c) => LineChartBarData(
        spots: spots,
        isCurved: true,
        color: c,
        barWidth: 1.5,
        dotData: const FlDotData(show: false),
      );

  Future<_CurveBundle> _buildCurves({required String sex, required bool isWeight}) async {
    final indicator = isWeight ? 'waz' : 'haz';
    final z = ZScoreCalculator.percentileZ;
    final p3 = <FlSpot>[];
    final p15 = <FlSpot>[];
    final p50 = <FlSpot>[];
    final p85 = <FlSpot>[];
    final p97 = <FlSpot>[];

    for (int m = 0; m <= 60; m++) {
      final row = await ZScoreCalculator.instance.getNearestLmsRow(
        indicator: indicator,
        sex: sex,
        indexVal: m.toDouble(),
      );
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
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: const TextStyle(color: Colors.grey)),
      Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
    ]),
  );
}

// ── Tab 2: Attendance ──────────────────────────────────────────────────────
class _AttendanceTab extends StatefulWidget {
  final Map<String, dynamic> child;
  const _AttendanceTab({required this.child});
  @override State<_AttendanceTab> createState() => _AttendanceTabState();
}
class _AttendanceTabState extends State<_AttendanceTab> {
  List<Map<String, dynamic>> _records = [];
  @override
  void initState() {
    super.initState();
    DatabaseHelper.instance.query('attendance',
        where: 'child_uuid = ?', whereArgs: [widget.child['uuid']],
        orderBy: 'date DESC', limit: 30)
        .then((r) { if (mounted) setState(() => _records = r); });
  }
  @override
  Widget build(BuildContext context) => _records.isEmpty
      ? const Center(child: Text('No attendance records yet'))
      : ListView.builder(itemCount: _records.length, itemBuilder: (_, i) {
          final r = _records[i];
          return ListTile(
            leading: Icon(r['status'] == 'present' ? Icons.check_circle : Icons.cancel,
                color: r['status'] == 'present' ? Colors.green : Colors.red),
            title: Text(r['date'] as String? ?? ''),
            subtitle: r['absence_reason'] != null && (r['absence_reason'] as String).isNotEmpty
                ? Text(r['absence_reason'] as String) : null,
          );
        });
}

// ── Tabs 3-7: Stubs (full implementation in Phase 3+) ─────────────────────
class _NutritionTab extends StatelessWidget {
  final Map<String, dynamic> child;
  const _NutritionTab({required this.child});
  @override
  Widget build(BuildContext context) {
    // Centre-level nutrition module lives in NutritionScreen.
    // Child-level nutrition programme status is still visible there via enrolments.
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.restaurant, size: 48, color: Colors.green),
          const SizedBox(height: 8),
          const Text('Indyo / Nutrition Programme',
              style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text(
            'Reba gahunda z’indyo (SFP/TFP) n’amafunguro y’aho muri centre.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const NutritionScreen()),
            ),
            icon: const Icon(Icons.open_in_new),
            label: const Text('Fungura Indyo'),
          ),
        ]),
      ),
    );
  }
}

class _ReferralsTab extends StatelessWidget {
  final Map<String, dynamic> child;
  const _ReferralsTab({required this.child});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.local_hospital, size: 48, color: Colors.blue),
          const SizedBox(height: 8),
          const Text('Guhanura / Referrals',
              style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text(
            'Kora referral nshya, ukurikirane “Pending/Attended/Treatment/Closed”, kandi wandike ibisubizo.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const ReferralScreen()),
            ),
            icon: const Icon(Icons.open_in_new),
            label: const Text('Fungura Referrals'),
          ),
        ]),
      ),
    );
  }
}

class _AlertsTab extends StatelessWidget {
  final Map<String, dynamic> child;
  const _AlertsTab({required this.child});
  @override
  Widget build(BuildContext context) {
    // Child-specific alert history (offline-first): filter local alerts by child_uuid.
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: DatabaseHelper.instance.query(
        'alerts',
        where: 'child_uuid = ?',
        whereArgs: [child['uuid']],
        orderBy:
            "CASE severity WHEN 'urgent' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END ASC, generated_at DESC",
      ),
      builder: (ctx, snap) {
        if (!snap.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final rows = snap.data!;
        if (rows.isEmpty) {
          return const Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.check_circle_outline, size: 48, color: Colors.green),
              SizedBox(height: 8),
              Text('Nta burira kuri uyu mwana.'),
            ]),
          );
        }
        Color colour(String s) =>
            s == 'urgent' ? Colors.red : s == 'warning' ? Colors.orange : Colors.blue;
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: rows.length,
          itemBuilder: (_, i) {
            final a = rows[i];
            final sev = a['severity'] as String? ?? 'warning';
            final exp = a['explanation_rw'] as String? ??
                a['explanation_en'] as String? ??
                '';
            final rec = a['recommendation_rw'] as String? ??
                a['recommendation_en'] as String? ??
                '';
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ExpansionTile(
                leading: Icon(Icons.warning_rounded, color: colour(sev)),
                title: Text(exp,
                    maxLines: 2, overflow: TextOverflow.ellipsis),
                subtitle: Text(sev.toUpperCase(),
                    style: TextStyle(
                        color: colour(sev),
                        fontWeight: FontWeight.bold,
                        fontSize: 11)),
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Ingamba:',
                            style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text(rec),
                      ],
                    ),
                  )
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _ImmunisationTab extends StatelessWidget {
  final Map<String, dynamic> child;
  const _ImmunisationTab({required this.child});
  @override
  Widget build(BuildContext context) {
    // Minimal offline view: show immunisation rows from local DB if present.
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: DatabaseHelper.instance.query(
        'immunisation',
        where: 'child_uuid = ?',
        whereArgs: [child['uuid']],
        orderBy: 'scheduled_date ASC',
      ),
      builder: (ctx, snap) {
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final rows = snap.data!;
        if (rows.isEmpty) {
          return const Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.vaccines, size: 48, color: Colors.teal),
              SizedBox(height: 8),
              Text('No immunisation records yet.'),
            ]),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: rows.length,
          itemBuilder: (_, i) {
            final v = rows[i];
            final status = (v['status'] as String?) ?? 'due';
            final colour = status == 'administered'
                ? Colors.green
                : status == 'overdue'
                    ? Colors.red
                    : Colors.orange;
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                leading: Icon(Icons.vaccines, color: colour),
                title: Text(v['vaccine_name'] as String? ?? ''),
                subtitle: Text(
                  'Scheduled: ${v['scheduled_date'] ?? '—'}'
                  '${(v['administered_date'] as String?)?.isNotEmpty == true ? '\nGiven: ${v['administered_date']}' : ''}',
                ),
                trailing: Text(status.toUpperCase(),
                    style: TextStyle(
                        color: colour,
                        fontWeight: FontWeight.bold,
                        fontSize: 11)),
              ),
            );
          },
        );
      },
    );
  }
}

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
      Expanded(child: TextField(controller: _ctrl, maxLines: null, expands: true,
          textAlignVertical: TextAlignVertical.top,
          decoration: const InputDecoration(hintText: 'Add any observations here…', border: OutlineInputBorder()))),
      const SizedBox(height: 8),
      FilledButton(onPressed: () async {
        final auth = context.read<AuthService>();
        final sync = context.read<SyncService>();
        final messenger = ScaffoldMessenger.of(context);

        await DatabaseHelper.instance.update('children', {'notes': _ctrl.text},
            where: 'uuid = ?', whereArgs: [widget.child['uuid']]);

        // Queue notes update for server sync (works online or later).
        await sync.enqueue(
          entityType: 'child',
          entityUuid: (widget.child['uuid'] ?? '').toString(),
          operation: 'update',
          payload: {
            'notes': _ctrl.text,
            // centre_id omitted intentionally; backend keeps existing centre_id for updates.
          },
        );
        await sync.syncIfConnected(auth: auth);

        if (!mounted) return;
        messenger.showSnackBar(
          const SnackBar(content: Text('Notes saved'), backgroundColor: Colors.green),
        );
      }, child: const Text('Save Notes')),
    ]),
  );
  @override void dispose() { _ctrl.dispose(); super.dispose(); }
}
