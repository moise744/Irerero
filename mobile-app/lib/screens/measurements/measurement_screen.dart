// lib/screens/measurements/measurement_screen.dart
//
// Measurement entry form — manual + embedded device mode.
// BIV validation with warning — FR-025, ES-FR-007.
// Z-score computed offline — AI-FR-004.
// Embedded values highlighted blue — ES-FR-004.
// Human confirmation required before save — SRS §6.1 design principle.
// Temperature alerts shown immediately — PUD §3.4.
// Trend arrow shown after save — PUD §6.2.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../ai/zscore_calculator.dart';
import '../../db/database_helper.dart';
import '../../device/device_interface.dart';
import '../../device/http_adapter.dart';
import '../../services/auth_service.dart';
import '../../sync/sync_service.dart';
import '../../widgets/status_badge.dart';

class MeasurementScreen extends StatefulWidget {
  final Map<String, dynamic> child;
  const MeasurementScreen({super.key, required this.child});

  @override
  State<MeasurementScreen> createState() => _MeasurementScreenState();
}

class _MeasurementScreenState extends State<MeasurementScreen> {
  final _weightCtrl = TextEditingController();
  final _heightCtrl = TextEditingController();
  final _muacCtrl   = TextEditingController();
  final _tempCtrl   = TextEditingController();
  final _headCtrl   = TextEditingController();
  String _position  = 'standing';

  final Set<String> _fromDevice = {};

  ZScoreResult? _result;
  bool _saving   = false;
  bool _bivWarn  = false;
  String? _tempAlertMsg;
  String? _trendArrow; 

  DeviceInterface? _device;
  StreamSubscription<MeasurementPayload>? _deviceSub;
  bool _deviceConnected = false;

  @override
  void initState() {
    super.initState();
    _initDevice();
  }

  Future<void> _initDevice() async {
    _device = HttpDeviceAdapter();
    await _device!.connect();
    _deviceSub = _device!.measurementStream.listen(_onDevicePayload);
    if (mounted) setState(() => _deviceConnected = _device!.isConnected);
  }

  void _onDevicePayload(MeasurementPayload p) {
    final expectedIrereroId = (widget.child['irerero_id'] as String? ?? '').trim();
    final expectedUuid      = (widget.child['uuid'] as String? ?? '').trim();
    final incoming          = p.childId.trim();
    final matchesChild = incoming.isNotEmpty &&
        (incoming == expectedIrereroId || incoming == expectedUuid);

    if (!matchesChild) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Device reading ignored: child_id "$incoming" does not match this child (${expectedIrereroId.isNotEmpty ? expectedIrereroId : expectedUuid}).',
          ),
          backgroundColor: Colors.orange,
          duration: const Duration(seconds: 4),
        ),
      );
      return;
    }

    setState(() {
      if (p.weightKg != null) { _weightCtrl.text = p.weightKg!.toStringAsFixed(1); _fromDevice.add('weight'); }
      if (p.heightCm != null) { _heightCtrl.text = p.heightCm!.toStringAsFixed(1); _fromDevice.add('height'); }
      if (p.muacCm != null)   { _muacCtrl.text   = p.muacCm!.toStringAsFixed(1);   _fromDevice.add('muac'); }
      if (p.tempC != null)    { _tempCtrl.text    = p.tempC!.toStringAsFixed(1);    _fromDevice.add('temp'); }
      if (p.headCircumferenceCm != null) { _headCtrl.text = p.headCircumferenceCm!.toStringAsFixed(1); _fromDevice.add('head'); }
      _position = p.measurementPosition;
    });
    _computePreview();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('✓ Values received from device — please confirm'), backgroundColor: Colors.blue, duration: Duration(seconds: 3)),
    );
  }

  Future<void> _computePreview() async {
    final w = double.tryParse(_weightCtrl.text);
    final h = double.tryParse(_heightCtrl.text);
    final m = double.tryParse(_muacCtrl.text);
    final t = double.tryParse(_tempCtrl.text);
    if (w == null && h == null) return;

    final child     = widget.child;
    final dob       = DateTime.tryParse(child['date_of_birth'] as String? ?? '');
    final ageMonths = dob == null ? 12 : DateTime.now().difference(dob).inDays ~/ 30;

    final result = await ZScoreCalculator.instance.compute(
      weightKg: w, heightCm: h, muacCm: m,
      ageMonths: ageMonths, sex: child['sex'] as String? ?? 'male',
    );

    String? tempAlert;
    if (t != null) {
      if (t < 36.0) tempAlert = '⚠ Hypothermia risk — temperature below 36°C. Wrap child warmly and seek urgent care.';
      else if (t >= 38.0) tempAlert = '⚠ Fever — temperature ${t.toStringAsFixed(1)}°C. Investigate cause.';
    }

    if (mounted) setState(() { _result = result; _bivWarn = result.bivFlagged; _tempAlertMsg = tempAlert; });
  }

  Future<void> _save() async {
    if (_result == null) { await _computePreview(); if (_result == null) return; }
    if (_bivWarn && !await _confirmBiv()) return;

    setState(() => _saving = true);

    final auth  = context.read<AuthService>();
    final sync  = context.read<SyncService>();
    final uuid  = const Uuid().v4();
    final now   = DateTime.now().toIso8601String();

    await _computeTrendArrow();

    final record = {
      'uuid':                   uuid,
      'child_uuid':             widget.child['uuid'],
      'weight_kg':              double.tryParse(_weightCtrl.text),
      'height_cm':              double.tryParse(_heightCtrl.text),
      'muac_cm':                double.tryParse(_muacCtrl.text),
      'temperature_c':          double.tryParse(_tempCtrl.text),
      'head_circ_cm':           double.tryParse(_headCtrl.text),
      'measurement_position':   _position,
      'waz_score':              _result?.waz,
      'haz_score':              _result?.haz,
      'whz_score':              _result?.whz,
      'nutritional_status':     _result?.nutritionalStatus ?? 'normal',
      'biv_flagged':            _bivWarn ? 1 : 0,
      'source':                 _fromDevice.isNotEmpty ? 'embedded' : 'manual',
      'device_id':              _fromDevice.isNotEmpty ? 'irerero-sim' : '',
      'recorded_by':            auth.userId ?? '',
      'recorded_at':            now,
      'created_at':             now,
    };

    await DatabaseHelper.instance.insert('measurements', record);
    await sync.enqueue(
      entityType: 'measurement', entityUuid: uuid,
      payload: {
        'child_id': widget.child['uuid'], ...record,
        'weight_kg': record['weight_kg']?.toString(),
        'height_cm': record['height_cm']?.toString(),
        'muac_cm':   record['muac_cm']?.toString(),
        'temperature_c': record['temperature_c']?.toString(),
        'head_circ_cm':  record['head_circ_cm']?.toString(),
      },
    );

    if (mounted) {
      setState(() => _saving = false);
      _showResult();
    }
  }

  Future<bool> _confirmBiv() async {
    return await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Check Measurement Values'),
      content: const Text('One or more values appear outside the normal range. This could mean the reading was taken incorrectly.\n\nDo the values look correct on the scale? If yes, save anyway. If not, retake the measurement.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Retake')),
        FilledButton(onPressed: () => Navigator.pop(ctx, true),  child: const Text('Values are correct — Save')),
      ],
    )) ?? false;
  }

  Future<void> _computeTrendArrow() async {
    final prev = await DatabaseHelper.instance.query('measurements',
        where: 'child_uuid = ? AND biv_flagged = 0',
        whereArgs: [widget.child['uuid']],
        orderBy: 'recorded_at DESC', limit: 2);
    if (prev.length >= 2) {
      final curr = double.tryParse(_weightCtrl.text) ?? 0;
      final last = (prev.first['weight_kg'] as num?)?.toDouble() ?? 0;
      if (curr > last + 0.1) _trendArrow = '↑';
      else if (curr < last - 0.1) _trendArrow = '↓';
      else _trendArrow = '→';
    }
  }

  void _showResult() {
    final status = _result?.nutritionalStatus ?? 'normal';
    showDialog(context: context, barrierDismissible: false, builder: (ctx) => AlertDialog(
      title: Row(children: [
        const Icon(Icons.check_circle, color: Colors.green),
        const SizedBox(width: 8),
        const Text('Measurement Saved'),
        if (_trendArrow != null) ...[
          const SizedBox(width: 8),
          Text(_trendArrow!, style: TextStyle(
            color: _trendArrow == '↑' ? Colors.green : _trendArrow == '↓' ? Colors.red : Colors.orange,
            fontSize: 20, fontWeight: FontWeight.bold,
          )),
        ],
      ]),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        StatusBadge(status: status),
        if (_tempAlertMsg != null) ...[
          const SizedBox(height: 12),
          Container(padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(8)),
            child: Text(_tempAlertMsg!, style: const TextStyle(color: Colors.deepOrange))),
        ],
      ]),
      actions: [
        FilledButton(onPressed: () { Navigator.pop(ctx); Navigator.pop(context); },
            child: const Text('Done')),
      ],
    ));
  }

  Color _fieldColor(String key) =>
      _fromDevice.contains(key) ? Colors.blue.shade50 : Colors.transparent;

  OutlineInputBorder _fieldBorder(String key) => OutlineInputBorder(
    borderSide: BorderSide(color: _fromDevice.contains(key) ? Colors.blue : Colors.grey.shade400),
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Measure — ${widget.child['full_name']}')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [

          Row(children: [
            Icon(_deviceConnected ? Icons.bluetooth_connected : Icons.bluetooth_disabled,
                color: _deviceConnected ? Colors.blue : Colors.grey),
            const SizedBox(width: 8),
            Expanded(
              child: Text(_deviceConnected
                  ? 'Local listener on port 8765 (optional hardware / integrations)'
                  : 'Manual entry — device listener unavailable',
                  style: const TextStyle(fontSize: 12)),
            ),
          ]),
          const SizedBox(height: 12),

          if (_fromDevice.isNotEmpty)
            Container(padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.blue.shade50,
                  border: Border.all(color: Colors.blue), borderRadius: BorderRadius.circular(8)),
              child: const Row(children: [
                Icon(Icons.bluetooth, color: Colors.blue, size: 16),
                SizedBox(width: 8),
                Expanded(
                  child: Text('Blue fields were received from device', style: TextStyle(color: Colors.blue, fontSize: 12)),
                ),
              ])),
          const SizedBox(height: 16),

          Row(children: [
            Expanded(child: TextField(controller: _weightCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: (_) => _computePreview(),
                decoration: InputDecoration(labelText: 'Weight (kg)', border: _fieldBorder('weight'), filled: true, fillColor: _fieldColor('weight')))),
            const SizedBox(width: 10),
            Expanded(child: TextField(controller: _heightCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: (_) => _computePreview(),
                decoration: InputDecoration(labelText: 'Height (cm)', border: _fieldBorder('height'), filled: true, fillColor: _fieldColor('height')))),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: TextField(controller: _muacCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: (_) => _computePreview(),
                decoration: InputDecoration(labelText: 'MUAC', border: _fieldBorder('muac'), filled: true, fillColor: _fieldColor('muac')))),
            const SizedBox(width: 8),
            Expanded(child: TextField(controller: _tempCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: (_) => _computePreview(),
                decoration: InputDecoration(labelText: 'Temp', border: _fieldBorder('temp'), filled: true, fillColor: _fieldColor('temp')))),
            const SizedBox(width: 8),
            Expanded(child: TextField(controller: _headCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: (_) => _computePreview(),
                decoration: InputDecoration(labelText: 'Head', border: _fieldBorder('head'), filled: true, fillColor: _fieldColor('head')))),
          ]),
          const SizedBox(height: 12),

          // FIXED: Wrapped the SegmentedButton in a FittedBox to prevent the 47-pixel overflow
          FittedBox(
            fit: BoxFit.scaleDown,
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'lying',    icon: Icon(Icons.bed),              label: Text('Aryamye')),
                ButtonSegment(value: 'standing', icon: Icon(Icons.accessibility_new), label: Text('Ahagarare')),
              ],
              selected: {_position},
              onSelectionChanged: (v) => setState(() => _position = v.first),
            ),
          ),
          const SizedBox(height: 16),

          if (_result != null) ...[
            StatusBadge(status: _result!.nutritionalStatus),
            const SizedBox(height: 8),
            if (_bivWarn) Container(padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(8)),
              child: const Text('⚠ One value appears unusual. Please recheck before saving.',
                  style: TextStyle(color: Colors.deepOrange))),
            if (_tempAlertMsg != null) Container(padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(8)),
              child: Text(_tempAlertMsg!, style: TextStyle(color: Colors.red.shade800))),
            const SizedBox(height: 8),
          ],

          SizedBox(height: 52,
            child: FilledButton.icon(
              onPressed: _saving ? null : _save,
              icon: _saving ? const SizedBox(width: 20, height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.check),
              label: Text(_saving ? 'Saving…' : 'Confirm & Save Measurement',
                  style: const TextStyle(fontSize: 15)),
            ),
          ),
        ]),
      ),
    );
  }

  @override
  void dispose() {
    _deviceSub?.cancel();
    _device?.disconnect();
    for (final c in [_weightCtrl, _heightCtrl, _muacCtrl, _tempCtrl, _headCtrl]) c.dispose();
    super.dispose();
  }
}