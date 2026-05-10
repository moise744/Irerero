import 'package:flutter/material.dart';
import 'measurement_screen.dart';

class BatchMeasurementScreen extends StatefulWidget {
  final List<Map<String, dynamic>> children;
  const BatchMeasurementScreen({super.key, required this.children});

  @override
  State<BatchMeasurementScreen> createState() => _BatchMeasurementScreenState();
}

class _BatchMeasurementScreenState extends State<BatchMeasurementScreen> {
  int _currentIndex = 0;

  void _next() {
    if (_currentIndex < widget.children.length - 1) {
      setState(() => _currentIndex++);
    } else {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Batch measurement yarangiye.'), backgroundColor: Colors.blue),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.children.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Batch Measurement')),
        body: const Center(child: Text('Nta bana bari muri sisitemu.')),
      );
    }

    final currentChild = widget.children[_currentIndex];

    return Scaffold(
      appBar: AppBar(
        title: Text('Batch: ${_currentIndex + 1} of ${widget.children.length}'),
        actions: [
          TextButton(
            onPressed: _next,
            child: const Text('Simbutuka', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
      body: MeasurementScreen(
        key: ValueKey(currentChild['uuid']),
        child: currentChild,
        isBatchMode: true,
        onSaved: _next,
      ),
    );
  }
}
