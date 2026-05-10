// lib/screens/referrals/referral_screen.dart
//
// Referral management screen — create new referrals and track existing ones.
// FR-040 to FR-050.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import 'package:url_launcher/url_launcher.dart'; // Added for PDF downloads

import '../../db/database_helper.dart';
import '../../services/auth_service.dart';
import '../../sync/sync_service.dart';
import '../../widgets/empty_state.dart';

class ReferralScreen extends StatefulWidget {
  final String? childUuid;
  const ReferralScreen({super.key, this.childUuid});

  @override
  State<ReferralScreen> createState() => _ReferralScreenState();
}

class _ReferralScreenState extends State<ReferralScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  List<Map<String, dynamic>> _pending = [];
  List<Map<String, dynamic>> _completed = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _loadReferrals();
  }

  Future<void> _loadReferrals() async {
    final db = DatabaseHelper.instance;
    final all = widget.childUuid != null
        ? await db.query('referrals', where: 'child_uuid = ?', whereArgs: [widget.childUuid], orderBy: 'referral_date DESC')
        : await db.query('referrals', orderBy: 'referral_date DESC');
    if (!mounted) return;
    setState(() {
      _pending = all.where((r) => r['status'] == 'pending').toList();
      _completed =
          all.where((r) => r['status'] != 'pending').toList();
      _loading = false;
    });
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
        title: const Text('Referrals'),
        bottom: TabBar(
          controller: _tabCtrl,
          tabs: [
            Tab(text: 'Pending (${_pending.length})'),
            Tab(text: 'Completed (${_completed.length})'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: const Text('New Referral'),
        onPressed: () => _showNewReferralDialog(context),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabCtrl,
              children: [
                _buildReferralList(_pending, isPending: true),
                _buildReferralList(_completed, isPending: false),
              ],
            ),
    );
  }

  Widget _buildReferralList(List<Map<String, dynamic>> referrals,
      {required bool isPending}) {
    if (referrals.isEmpty) {
      return EmptyStateWidget(
        icon: isPending ? Icons.hourglass_empty : Icons.check_circle_outline,
        title: isPending ? 'No pending referrals' : 'No completed referrals',
        message: isPending 
            ? 'There are currently no referrals awaiting outcomes.' 
            : 'You haven\'t completed any referrals yet.',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadReferrals,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: referrals.length,
        itemBuilder: (ctx, i) {
          final r = referrals[i];
          return _ReferralCard(
            referral: r,
            onRecordOutcome: isPending
                ? () => _showOutcomeDialog(context, r)
                : null,
          );
        },
      ),
    );
  }

  Future<void> _showNewReferralDialog(BuildContext context) async {
    final children = widget.childUuid != null
        ? await DatabaseHelper.instance.query('children', where: 'uuid = ?', whereArgs: [widget.childUuid])
        : await DatabaseHelper.instance.query('children', orderBy: 'full_name ASC');

    if (!context.mounted) return;

    final created = await showModalBottomSheet<bool>(
          context: context,
          isScrollControlled: true,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          builder: (ctx) => _NewReferralSheet(children: children, initialChildUuid: widget.childUuid),
        ) ??
        false;

    if (created && mounted) {
      _loadReferrals();
    }
  }

  Future<void> _showOutcomeDialog(BuildContext context, Map<String, dynamic> referral) async {
    final saved = await showDialog<bool>(
          context: context,
          builder: (ctx) => _OutcomeDialog(referral: referral),
        ) ??
        false;

    if (saved && mounted) {
      _loadReferrals();
    }
  }
}

class _NewReferralSheet extends StatefulWidget {
  final List<Map<String, dynamic>> children;
  final String? initialChildUuid;
  const _NewReferralSheet({required this.children, this.initialChildUuid});

  @override
  State<_NewReferralSheet> createState() => _NewReferralSheetState();
}

class _NewReferralSheetState extends State<_NewReferralSheet> {
  late final TextEditingController _reasonCtrl;
  late final TextEditingController _centreCtrl;
  String? _selectedChildId;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _reasonCtrl = TextEditingController();
    _centreCtrl = TextEditingController();
    _selectedChildId = widget.initialChildUuid;
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    _centreCtrl.dispose();
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
          Text('New Referral', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            decoration: const InputDecoration(labelText: 'Select Child'),
            value: _selectedChildId,
            items: widget.children
                .where((c) => ((c['uuid'] as String?) ?? '').isNotEmpty)
                .map(
                  (c) => DropdownMenuItem<String>(
                    value: c['uuid'] as String,
                    child: Text(c['full_name'] as String? ?? ''),
                  ),
                )
                .toList(),
            onChanged: widget.initialChildUuid != null ? null : (v) => setState(() => _selectedChildId = v),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _centreCtrl,
            decoration: const InputDecoration(labelText: 'Health Centre Name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _reasonCtrl,
            decoration: const InputDecoration(labelText: 'Reason for Referral'),
            maxLines: 3,
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: (_selectedChildId == null || _saving)
                  ? null
                  : () async {
                      setState(() => _saving = true);
                      final uuid = const Uuid().v4();
                      final date = DateTime.now().toIso8601String().substring(0, 10);
                      final now = DateTime.now().toIso8601String();
                      final auth = context.read<AuthService>();
                      final sync = context.read<SyncService>();

                      await DatabaseHelper.instance.insert('referrals', {
                        'uuid': uuid,
                        'child_uuid': _selectedChildId,
                        'referral_date': date,
                        'reason': _reasonCtrl.text,
                        'health_centre_name': _centreCtrl.text,
                        'status': 'pending',
                        'referred_by': auth.userId ?? '',
                        'created_at': now,
                        'updated_at': now,
                      });

                      await sync.enqueue(
                        entityType: 'referral',
                        entityUuid: uuid,
                        payload: {
                          'child_id': _selectedChildId,
                          'referral_date': date,
                          'reason': _reasonCtrl.text,
                          'health_centre_name': _centreCtrl.text,
                          'status': 'pending',
                        },
                      );

                      if (context.mounted) Navigator.pop(context, true);
                    },
              child: Text(_saving ? 'Saving…' : 'Create Referral'),
            ),
          ),
        ],
      ),
    );
  }
}

class _OutcomeDialog extends StatefulWidget {
  final Map<String, dynamic> referral;
  const _OutcomeDialog({required this.referral});

  @override
  State<_OutcomeDialog> createState() => _OutcomeDialogState();
}

class _OutcomeDialogState extends State<_OutcomeDialog> {
  late final TextEditingController _diagCtrl;
  late final TextEditingController _treatCtrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _diagCtrl = TextEditingController();
    _treatCtrl = TextEditingController();
  }

  @override
  void dispose() {
    _diagCtrl.dispose();
    _treatCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Record Outcome'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _diagCtrl,
            decoration: const InputDecoration(labelText: 'Diagnosis'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _treatCtrl,
            decoration: const InputDecoration(labelText: 'Treatment Given'),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.pop(context, false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saving
              ? null
              : () async {
                  setState(() => _saving = true);
                  await DatabaseHelper.instance.update(
                    'referrals',
                    {
                      'status': 'treatment_given',
                      'diagnosis': _diagCtrl.text,
                      'treatment': _treatCtrl.text,
                      'outcome_date': DateTime.now().toIso8601String().substring(0, 10),
                      'synced_at': null,
                    },
                    where: 'uuid = ?',
                    whereArgs: [widget.referral['uuid']],
                  );
                  if (context.mounted) Navigator.pop(context, true);
                },
          child: Text(_saving ? 'Saving…' : 'Save'),
        ),
      ],
    );
  }
}

class _ReferralCard extends StatelessWidget {
  final Map<String, dynamic> referral;
  final VoidCallback? onRecordOutcome;

  const _ReferralCard({required this.referral, this.onRecordOutcome});

  Future<void> _downloadPdf(BuildContext context) async {
    final String baseUrl = const String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:8000/api/v1');
    final String pdfUrl = '${baseUrl.replaceAll('/api/v1', '')}/media/pdfs/referral_${referral['uuid']}.pdf';
    
    final Uri url = Uri.parse(pdfUrl);
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open PDF. Please ensure backend is running.'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = referral['status'] ?? 'pending';
    final statusColor = {
          'pending': Colors.orange,
          'attended': Colors.blue,
          'treatment_given': Colors.green,
          'closed': Colors.grey,
        }[status] ??
        Colors.grey;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.local_hospital, color: statusColor),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    referral['health_centre_name'] ?? 'Health Centre',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    status.replaceAll('_', ' '),
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: statusColor),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(referral['reason'] ?? '',
                style: const TextStyle(color: Colors.black87)),
            const SizedBox(height: 4),
            Text(
              'Date: ${referral['referral_date'] ?? ''}',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            if (referral['diagnosis'] != null && referral['diagnosis'].toString().isNotEmpty) ...[
              const Divider(),
              Text('Diagnosis: ${referral['diagnosis']}',
                  style: const TextStyle(fontSize: 13)),
              if (referral['treatment'] != null)
                Text('Treatment: ${referral['treatment']}',
                    style: const TextStyle(fontSize: 13)),
            ],
            const SizedBox(height: 12),
            // Replaced the overflowing Row with a Wrap widget
            Wrap(
              spacing: 8.0,
              runSpacing: 8.0,
              alignment: WrapAlignment.end,
              children: [
                OutlinedButton.icon(
                  icon: const Icon(Icons.picture_as_pdf, size: 18, color: Colors.red),
                  label: const Text('Download PDF', style: TextStyle(color: Colors.red)),
                  onPressed: () => _downloadPdf(context),
                ),
                if (onRecordOutcome != null)
                  FilledButton.icon(
                    icon: const Icon(Icons.edit_note, size: 18),
                    label: const Text('Outcome'),
                    onPressed: onRecordOutcome,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}