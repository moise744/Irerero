// lib/screens/home/home_screen.dart
//
// Home Dashboard — the caregiver's main screen.
// FR-061: 4 required items:
//   (1) Today's attendance (present/absent count)
//   (2) Active alerts ordered by urgency (red/urgent first)
//   (3) Children due for measurement today or overdue (>30 days)
//   (4) Quick-access buttons: Take Attendance, Record Measurement, View Alerts, View Child
//
// Bottom navigation — SRS §5.1: max 5 items.
// SyncIndicator visible on all screens — FR-086.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../sync/sync_service.dart';
import '../../db/database_helper.dart';
import '../../widgets/sync_indicator.dart';
import '../../widgets/status_badge.dart';
import '../children/child_list_screen.dart';
import '../attendance/attendance_screen.dart';
import '../alerts/alerts_screen.dart';
import '../sync/sync_status_screen.dart';
import '../measurements/measurement_screen.dart';
import '../settings/settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  List<Map<String, dynamic>> _activeAlerts = [];
  List<Map<String, dynamic>> _dueOrOverdue = [];
  int _presentToday = 0;
  int _absentToday  = 0;
  bool _loading     = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrapHome());
  }

  Future<void> _bootstrapHome() async {
    final auth = context.read<AuthService>();
    if (auth.isLoggedIn) {
      final sync = context.read<SyncService>();
      await sync.pullChildrenFromServer(auth);
      await sync.syncIfConnected(auth: auth);
    }
    if (mounted) await _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() => _loading = true);
    final today = DateTime.now().toIso8601String().substring(0, 10);

    // (2) Active alerts ordered by urgency — FR-061
    // urgency ordering: urgent=0, warning=1, information=2
    final alerts = await DatabaseHelper.instance.query('alerts',
        where: 'status = ?', whereArgs: ['active'],
        orderBy: "CASE severity WHEN 'urgent' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END ASC, generated_at DESC",
        limit: 20);

    // (1) Today's attendance count — FR-061
    final presentRows = await DatabaseHelper.instance.query('attendance',
        where: "date = ? AND status = 'present'", whereArgs: [today]);
    final absentRows  = await DatabaseHelper.instance.query('attendance',
        where: "date = ? AND status = 'absent'",  whereArgs: [today]);

    // (3) Children due or overdue — FR-061
    final children = await DatabaseHelper.instance.query('children',
        where: "status = 'active'");
    final overdue = <Map<String, dynamic>>[];
    for (final child in children) {
      final lastM = await DatabaseHelper.instance.query('measurements',
          where: 'child_uuid = ?', whereArgs: [child['uuid']],
          orderBy: 'recorded_at DESC', limit: 1);
      int daysSince = 999;
      if (lastM.isNotEmpty) {
        final dt = DateTime.tryParse(lastM.first['recorded_at'] as String);
        if (dt != null) daysSince = DateTime.now().difference(dt).inDays;
      }
      if (daysSince >= 30) {
        overdue.add({
          ...child,
          'days_since': daysSince,
          'reason': daysSince >= 60 ? 'overdue' : 'due',
        });
      }
    }
    overdue.sort((a, b) => (b['days_since'] as int).compareTo(a['days_since'] as int));

    if (mounted) {
      setState(() {
        _activeAlerts = alerts;
        _presentToday = presentRows.length;
        _absentToday  = absentRows.length;
        _dueOrOverdue = overdue.take(15).toList();
        _loading      = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    final pages = [
      _DashboardTab(
        alerts:       _activeAlerts,
        presentToday: _presentToday,
        absentToday:  _absentToday,
        dueOrOverdue: _dueOrOverdue,
        loading:      _loading,
        onRefresh:    _loadDashboardData,
        onOpenAttendance: () => setState(() => _selectedIndex = 2),
        onOpenMeasure: _openMeasurementPicker,
        onOpenAlerts:     () => setState(() => _selectedIndex = 3),
        onOpenChildren:   () => setState(() => _selectedIndex = 1),
      ),
      const ChildListScreen(),
      const AttendanceScreen(),
      const AlertsScreen(),
      const SyncStatusScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Irerero', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          const SyncIndicator(),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: 'Settings',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const SettingsScreen()),
            ),
          ),
          const SizedBox(width: 8),
        ],
        backgroundColor: cs.surface,
        surfaceTintColor: Colors.transparent,
      ),
      body: pages[_selectedIndex],
      // SRS §5.1: bottom navigation bar, max 5 items
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (i) => setState(() => _selectedIndex = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined),    selectedIcon: Icon(Icons.home),        label: 'Ahabanza'),
          NavigationDestination(icon: Icon(Icons.group_outlined),   selectedIcon: Icon(Icons.group),       label: 'Abana'),
          NavigationDestination(icon: Icon(Icons.checklist_outlined),selectedIcon: Icon(Icons.checklist),  label: 'Ibarura'),
          NavigationDestination(icon: Icon(Icons.notifications_outlined), selectedIcon: Icon(Icons.notifications), label: 'Iburira'),
          NavigationDestination(icon: Icon(Icons.cloud_outlined),   selectedIcon: Icon(Icons.cloud),       label: 'Sync'),
        ],
      ),
    );
  }

  Future<void> _openMeasurementPicker() async {
    final children = await DatabaseHelper.instance.query(
      'children',
      where: "status = 'active'",
      orderBy: 'full_name ASC',
    );
    if (!mounted) return;
    if (children.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Nta bana bari muri sisitemu. Banza wandike umwana.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final selected = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ListTile(
              title: Text('Hitamo umwana wo gupima',
                  style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            SizedBox(
              height: 420,
              child: ListView.builder(
                itemCount: children.length,
                itemBuilder: (_, i) {
                  final c = children[i];
                  return ListTile(
                    leading: CircleAvatar(
                      child: Text(
                        ((c['full_name'] as String?)?.isNotEmpty == true
                                ? (c['full_name'] as String).substring(0, 1)
                                : '?')
                            .toUpperCase(),
                      ),
                    ),
                    title: Text(c['full_name'] as String? ?? ''),
                    subtitle: Text(c['irerero_id'] as String? ?? ''),
                    onTap: () => Navigator.pop(ctx, c),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );

    if (!mounted || selected == null) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => MeasurementScreen(child: selected),
      ),
    );
    if (mounted) await _loadDashboardData();
  }
}

class _DashboardTab extends StatelessWidget {
  final List<Map<String, dynamic>> alerts;
  final int presentToday, absentToday;
  final List<Map<String, dynamic>> dueOrOverdue;
  final bool loading;
  final VoidCallback onRefresh;
  final VoidCallback onOpenAttendance;
  final VoidCallback onOpenMeasure;
  final VoidCallback onOpenAlerts;
  final VoidCallback onOpenChildren;

  const _DashboardTab({
    required this.alerts, required this.presentToday, required this.absentToday,
    required this.dueOrOverdue, required this.loading, required this.onRefresh,
    required this.onOpenAttendance,
    required this.onOpenMeasure,
    required this.onOpenAlerts,
    required this.onOpenChildren,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    final cs = Theme.of(context).colorScheme;

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // (1) Attendance summary — FR-061
          Card(child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Ibarura ry\'Uyu Munsi', style: TextStyle(fontWeight: FontWeight.bold, color: cs.primary)),
              const SizedBox(height: 12),
              Row(children: [
                _StatChip(icon: Icons.check_circle, colour: Colors.green, label: 'Bari hano', value: presentToday),
                const SizedBox(width: 12),
                _StatChip(icon: Icons.cancel, colour: Colors.red, label: 'Batahari', value: absentToday),
              ]),
            ]),
          )),
          const SizedBox(height: 12),

          // (4) Quick-action buttons — SRS §5.1: Take Attendance, Record Measurement, View Alerts, View Child
          Text('Ingamba Zihutirwa', style: TextStyle(fontWeight: FontWeight.bold, color: cs.onSurface)),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: _QuickActionButton(icon: Icons.checklist, label: 'Ibarura', onTap: onOpenAttendance)),
            const SizedBox(width: 8),
            Expanded(child: _QuickActionButton(icon: Icons.monitor_weight, label: 'Gupima', onTap: onOpenMeasure)),
            const SizedBox(width: 8),
            Expanded(child: _QuickActionButton(icon: Icons.notifications_active, label: 'Iburira', onTap: onOpenAlerts)),
            const SizedBox(width: 8),
            Expanded(child: _QuickActionButton(icon: Icons.search, label: 'Abana', onTap: onOpenChildren)),
          ]),
          const SizedBox(height: 16),

          // (2) Active alerts — urgency order, urgent first — FR-061
          if (alerts.isNotEmpty) ...[
            Text('Iburira Rishyizwe Mbere (${alerts.length})',
                style: TextStyle(fontWeight: FontWeight.bold, color: cs.error)),
            const SizedBox(height: 8),
            ...alerts.take(5).map((a) => _AlertCard(alert: a)),
            const SizedBox(height: 16),
          ],

          // (3) Due or overdue measurement — FR-061
          if (dueOrOverdue.isNotEmpty) ...[
            Text('Bakwiriye Gupimwa (${dueOrOverdue.length})',
                style: TextStyle(fontWeight: FontWeight.bold, color: cs.onSurface)),
            const SizedBox(height: 8),
            ...dueOrOverdue.take(8).map((c) => _OverdueCard(child: c)),
          ],
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final IconData icon;
  final Color colour;
  final String label;
  final int value;
  const _StatChip({required this.icon, required this.colour, required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    return Chip(
      avatar: Icon(icon, color: colour, size: 18),
      label: Text('$value $label', style: TextStyle(color: colour, fontWeight: FontWeight.bold)),
      backgroundColor: colour.withOpacity(0.1),
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _QuickActionButton({required this.icon, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: cs.primaryContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: cs.onPrimaryContainer, size: 26),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(color: cs.onPrimaryContainer, fontSize: 11),
              textAlign: TextAlign.center),
        ]),
      ),
    );
  }
}

class _AlertCard extends StatelessWidget {
  final Map<String, dynamic> alert;
  const _AlertCard({required this.alert});
  @override
  Widget build(BuildContext context) {
    final severity = alert['severity'] as String? ?? 'warning';
    final colour   = severity == 'urgent' ? Colors.red : (severity == 'warning' ? Colors.orange : Colors.blue);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(Icons.warning_rounded, color: colour),
        title: Text(alert['explanation_rw'] as String? ?? alert['explanation_en'] as String? ?? '',
            maxLines: 2, overflow: TextOverflow.ellipsis),
        subtitle: Text(alert['alert_type']?.toString().replaceAll('_', ' ').toUpperCase() ?? ''),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(color: colour.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
          child: Text(severity.toUpperCase(), style: TextStyle(color: colour, fontWeight: FontWeight.bold, fontSize: 11)),
        ),
      ),
    );
  }
}

class _OverdueCard extends StatelessWidget {
  final Map<String, dynamic> child;
  const _OverdueCard({required this.child});
  @override
  Widget build(BuildContext context) {
    final days   = child['days_since'] as int? ?? 0;
    final reason = child['reason'] as String? ?? 'due';
    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      child: ListTile(
        leading: Icon(Icons.schedule, color: reason == 'overdue' ? Colors.red : Colors.orange),
        title: Text(child['full_name'] as String? ?? ''),
        subtitle: Text('$days days since last measurement'),
        trailing: StatusBadge(status: reason == 'overdue' ? 'at_risk' : 'normal', compact: true),
      ),
    );
  }
}
