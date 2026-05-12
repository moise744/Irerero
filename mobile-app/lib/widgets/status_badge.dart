// lib/widgets/status_badge.dart
//
// Nutritional status badge — colour + text label + icon.
// Never colour alone — NFR-016 accessibility requirement.

import 'package:flutter/material.dart';
import '../theme/irerero_colors.dart';

enum NutritionalStatus {
  normal, atRisk, mam, sam, stunted, severelystunted, underweight, unknown,
}

class StatusBadge extends StatelessWidget {
  final String status;
  final bool compact;

  const StatusBadge({super.key, required this.status, this.compact = false});

  @override
  Widget build(BuildContext context) {
    final config = _config(status);
    if (compact) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: config.bgColour,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: config.textColour.withOpacity(0.35)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(config.icon, color: config.textColour, size: 14),
          const SizedBox(width: 4),
          Text(config.shortLabel,
              style: TextStyle(
                  color: config.textColour, fontSize: 12, fontWeight: FontWeight.bold)),
        ]),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: config.bgColour,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(config.icon, color: config.textColour, size: 18),
        const SizedBox(width: 8),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(config.label,
              style: TextStyle(
                  color: config.textColour, fontWeight: FontWeight.bold, fontSize: 14)),
          if (!compact)
            Text(config.sublabel,
                style: TextStyle(color: config.textColour.withOpacity(0.85), fontSize: 11)),
        ]),
      ]),
    );
  }

  _StatusConfig _config(String s) {
    switch (s) {
      case 'sam':
        return _StatusConfig(
          bgColour: IrereroColors.blush.withOpacity(0.95),
          textColour: IrereroColors.coral,
          icon: Icons.warning_rounded,
          label: 'Severe Malnutrition',
          shortLabel: 'SAM',
          sublabel: 'Needs urgent medical care',
        );
      case 'mam':
        return _StatusConfig(
          bgColour: IrereroColors.cream.withOpacity(0.95),
          textColour: IrereroColors.forest,
          icon: Icons.warning_amber_rounded,
          label: 'Moderate Malnutrition',
          shortLabel: 'MAM',
          sublabel: 'Needs feeding support',
        );
      case 'severely_stunted':
        return _StatusConfig(
          bgColour: IrereroColors.blush.withOpacity(0.95),
          textColour: IrereroColors.coral,
          icon: Icons.height,
          label: 'Severely Stunted',
          shortLabel: 'Sev. Stunted',
          sublabel: 'Refer to health centre',
        );
      case 'stunted':
        return _StatusConfig(
          bgColour: IrereroColors.cream.withOpacity(0.95),
          textColour: IrereroColors.forest,
          icon: Icons.height,
          label: 'Stunted',
          shortLabel: 'Stunted',
          sublabel: 'Check nutrition and feeding',
        );
      case 'underweight':
        return _StatusConfig(
          bgColour: IrereroColors.cream.withOpacity(0.95),
          textColour: IrereroColors.forest,
          icon: Icons.scale,
          label: 'Underweight',
          shortLabel: 'Underweight',
          sublabel: 'Review diet and feeding',
        );
      case 'at_risk':
        return _StatusConfig(
          bgColour: IrereroColors.cream.withOpacity(0.95),
          textColour: IrereroColors.amber,
          icon: Icons.info_outline,
          label: 'Watch Closely',
          shortLabel: 'At Risk',
          sublabel: 'Slightly below healthy range',
        );
      default:
        return _StatusConfig(
          bgColour: IrereroColors.mint.withOpacity(0.85),
          textColour: IrereroColors.forest,
          icon: Icons.check_circle_outline,
          label: 'Healthy',
          shortLabel: 'Normal',
          sublabel: 'Growing well',
        );
    }
  }
}

class _StatusConfig {
  final Color bgColour, textColour;
  final IconData icon;
  final String label, shortLabel, sublabel;
  const _StatusConfig({
    required this.bgColour,
    required this.textColour,
    required this.icon,
    required this.label,
    required this.shortLabel,
    required this.sublabel,
  });
}
