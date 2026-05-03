// lib/ai/zscore_calculator.dart
//
// WHO LMS Z-score calculation — runs fully offline.
// Mirror of the Python ai/zscore.py implementation.
// AI-FR-001, AI-FR-002, AI-FR-003, AI-FR-004.
// LMS tables loaded from assets/lms_data/ JSON files — NFR-026.

import 'dart:convert';
import 'dart:math';
import 'package:flutter/services.dart';

class LmsRow {
  final double index;
  final double l, m, s;
  const LmsRow({required this.index, required this.l, required this.m, required this.s});

  factory LmsRow.fromJson(Map<String, dynamic> j) => LmsRow(
    index: (j['index'] as num).toDouble(),
    l:     (j['L']     as num).toDouble(),
    m:     (j['M']     as num).toDouble(),
    s:     (j['S']     as num).toDouble(),
  );
}

class ZScoreResult {
  final double? waz;
  final double? haz;
  final double? whz;
  final bool bivFlagged;
  final List<String> bivDetails;
  final String nutritionalStatus;

  const ZScoreResult({
    this.waz, this.haz, this.whz,
    required this.bivFlagged,
    this.bivDetails = const [],
    required this.nutritionalStatus,
  });
}

class ZScoreCalculator {
  static final ZScoreCalculator instance = ZScoreCalculator._();
  ZScoreCalculator._();

  // In-memory LMS table cache — loaded once from assets
  final Map<String, List<LmsRow>> _cache = {};

  // BIV thresholds — AI-FR-003
  static const Map<String, List<double>> _biv = {
    'waz': [-6.0, 6.0],
    'haz': [-6.0, 6.0],
    'whz': [-5.0, 5.0],
  };

  Future<List<LmsRow>> _loadTable(String indicator, String sex) async {
    final key = '${indicator}_$sex';
    if (_cache.containsKey(key)) return _cache[key]!;

    try {
      final raw  = await rootBundle.loadString('assets/lms_data/$key.json');
      final list = (jsonDecode(raw) as List)
          .map((e) => LmsRow.fromJson(e as Map<String, dynamic>))
          .toList();
      _cache[key] = list;
      return list;
    } catch (_) {
      return [];
    }
  }

  LmsRow? _findRow(List<LmsRow> table, double indexVal) {
    if (table.isEmpty) return null;
    return table.reduce(
      (a, b) => (a.index - indexVal).abs() < (b.index - indexVal).abs() ? a : b,
    );
  }

  /// Expose a safe LMS row lookup for charting/percentiles.
  Future<LmsRow?> getNearestLmsRow({
    required String indicator, // 'waz','haz','whz', etc.
    required String sex,       // 'male'|'female'
    required double indexVal,  // age months for waz/haz; height cm for whz
  }) async {
    final sexLabel = sex == 'male' ? 'boys' : 'girls';
    final table = await _loadTable(indicator, sexLabel);
    return _findRow(table, indexVal);
  }

  /// WHO LMS formula — exact implementation from AI-FR-001.
  double _lmsFormula(double x, double l, double m, double s) {
    if (m <= 0 || x <= 0) return 0.0;
    if (l.abs() < 0.0001) return log(x / m) / s;
    return (pow(x / m, l) - 1) / (l * s);
  }

  /// Inverse LMS formula: given z-score and LMS row, return measurement value.
  /// Used for FR-024 growth chart reference curves (percentile lines).
  double lmsInverse(double z, double l, double m, double s) {
    if (m <= 0) return 0.0;
    if (l.abs() < 0.0001) return m * exp(s * z);
    final inner = 1 + l * s * z;
    if (inner <= 0) return 0.0;
    return m * pow(inner, 1 / l).toDouble();
  }

  /// Reference z-scores for WHO percentile curves.
  static const Map<int, double> percentileZ = {
    3:  -1.8807936081512509,
    15: -1.0364333894937896,
    50: 0.0,
    85: 1.0364333894937896,
    97: 1.8807936081512509,
  };

  bool _isBiv(double z, String indicator) {
    final bounds = _biv[indicator];
    if (bounds == null) return false;
    return z < bounds[0] || z > bounds[1];
  }

  /// Compute all Z-scores for a measurement session — AI-FR-004 (offline).
  Future<ZScoreResult> compute({
    double? weightKg,
    double? heightCm,
    double? muacCm,
    required int ageMonths,
    required String sex, // 'male' or 'female'
  }) async {
    final sexLabel = sex == 'male' ? 'boys' : 'girls';
    double? waz, haz, whz;
    bool bivFlagged = false;
    final bivDetails = <String>[];

    // WAZ — 0-60 months
    if (weightKg != null && ageMonths >= 0 && ageMonths <= 60) {
      final table = await _loadTable('waz', sexLabel);
      final row   = _findRow(table, ageMonths.toDouble());
      if (row != null) {
        final z = double.parse(_lmsFormula(weightKg, row.l, row.m, row.s).toStringAsFixed(3));
        if (_isBiv(z, 'waz')) { bivFlagged = true; bivDetails.add('waz'); }
        else waz = z;
      }
    }

    // HAZ — 0-60 months
    if (heightCm != null && ageMonths >= 0 && ageMonths <= 60) {
      final table = await _loadTable('haz', sexLabel);
      final row   = _findRow(table, ageMonths.toDouble());
      if (row != null) {
        final z = double.parse(_lmsFormula(heightCm, row.l, row.m, row.s).toStringAsFixed(3));
        if (_isBiv(z, 'haz')) { bivFlagged = true; bivDetails.add('haz'); }
        else haz = z;
      }
    }

    // WHZ — 45-110 cm
    if (weightKg != null && heightCm != null && heightCm >= 45 && heightCm <= 110) {
      final table = await _loadTable('whz', sexLabel);
      final row   = _findRow(table, heightCm);
      if (row != null) {
        final z = double.parse(_lmsFormula(weightKg, row.l, row.m, row.s).toStringAsFixed(3));
        if (_isBiv(z, 'whz')) { bivFlagged = true; bivDetails.add('whz'); }
        else whz = z;
      }
    }

    final status = _classify(waz: waz, haz: haz, whz: whz, muacCm: muacCm);

    return ZScoreResult(
      waz: waz, haz: haz, whz: whz,
      bivFlagged: bivFlagged,
      bivDetails: bivDetails,
      nutritionalStatus: status,
    );
  }

  /// Nutritional status classification — FR-022, SRS Appendix C.
  String _classify({double? waz, double? haz, double? whz, double? muacCm}) {
    // SAM
    if ((whz != null && whz < -3) || (muacCm != null && muacCm < 11.5)) return 'sam';
    // MAM
    if ((whz != null && whz < -2) || (muacCm != null && muacCm < 12.5)) return 'mam';
    // Stunting
    if (haz != null && haz < -3) return 'severely_stunted';
    if (haz != null && haz < -2) return 'stunted';
    // Underweight
    if (waz != null && waz < -2) return 'underweight';
    // At risk
    final zScores = [waz, haz, whz].whereType<double>();
    if (zScores.any((z) => z < -1.5) || (muacCm != null && muacCm <= 13.0)) return 'at_risk';
    return 'normal';
  }
}
