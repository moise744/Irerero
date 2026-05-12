// lib/widgets/sync_indicator.dart
//
// Connectivity and sync status indicator shown on ALL screens — FR-086.
// Colour + icon (never colour alone) — NFR-016.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../sync/sync_service.dart';
import '../theme/irerero_colors.dart';

class SyncIndicator extends StatelessWidget {
  const SyncIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<SyncService>(builder: (context, sync, _) {
      IconData icon;
      Color colour;
      String tooltip;

      switch (sync.status) {
        case SyncStatus.synced:
          icon = Icons.cloud_done;
          colour = IrereroColors.sage;
          tooltip = 'All data synced';
        case SyncStatus.syncing:
          icon = Icons.cloud_sync;
          colour = IrereroColors.forest;
          tooltip = 'Syncing…';
        case SyncStatus.error:
          icon = Icons.cloud_off;
          colour = IrereroColors.coral;
          tooltip = 'Sync error — will retry';
        case SyncStatus.idle:
          if (sync.pendingCount > 0) {
            icon = Icons.cloud_upload;
            colour = IrereroColors.amber;
            tooltip = '${sync.pendingCount} record(s) pending upload';
          } else {
            icon = Icons.cloud_done;
            colour = IrereroColors.sage;
            tooltip = 'All data synced';
          }
      }

      return Tooltip(
        message: tooltip,
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: colour, size: 20),
          if (sync.pendingCount > 0) ...[
            const SizedBox(width: 4),
            Text('${sync.pendingCount}',
                style: TextStyle(color: colour, fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ]),
      );
    });
  }
}
