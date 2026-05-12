import 'package:flutter/material.dart';

/// Irerero brand palette (warm ECD) — keep in sync with web-dashboard tokens.
abstract final class IrereroColors {
  static const coral = Color(0xFFE8573A);
  static const forest = Color(0xFF2D6B4F);
  static const forestDeep = Color(0xFF1C3A2C);
  static const sage = Color(0xFF3DAF8A);
  static const amber = Color(0xFFF5A462);
  static const canvas = Color(0xFFFDF6EE);
  static const surfaceCard = Color(0xFFFFFBF7);
  static const blush = Color(0xFFFCEEE7);
  static const mint = Color(0xFFEBF7E0);
  static const cream = Color(0xFFFEF5E4);
  static const flex = Color(0xFFE0F5EE);
  static const ink = Color(0xFF4A4A3F);
  static const inkMuted = Color(0xFF7A7A6E);
  static const inkPlaceholder = Color(0xFFA8A89A);
  static const borderWarm = Color(0xFFC8C8B8);
  static const borderSubtle = Color(0xFFE8E4DC);

  static const success = sage;
  static const warning = amber;
  static const urgent = coral;
  static const info = forest;

  /// Primary CTA / FAB style gradient (no neon — coral → forest).
  static const LinearGradient primaryGradient = LinearGradient(
    colors: <Color>[coral, forest],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
