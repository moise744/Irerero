import 'dart:io';
import 'package:flutter/material.dart';

class ChildAvatar extends StatelessWidget {
  final Map<String, dynamic>? child;
  final double radius;

  const ChildAvatar({super.key, this.child, this.radius = 20});

  @override
  Widget build(BuildContext context) {
    final photoPath = child?['photo_path'] as String?;
    final name = child?['full_name'] as String? ?? '?';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return CircleAvatar(
      radius: radius,
      backgroundColor: Theme.of(context).colorScheme.primaryContainer,
      foregroundColor: Theme.of(context).colorScheme.onPrimaryContainer,
      backgroundImage: photoPath != null && photoPath.isNotEmpty ? FileImage(File(photoPath)) : null,
      child: photoPath != null && photoPath.isNotEmpty ? null : Text(initial, style: const TextStyle(fontWeight: FontWeight.bold)),
    );
  }
}
