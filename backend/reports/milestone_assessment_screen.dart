import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../sync/sync_service.dart';

class MilestoneAssessmentScreen extends StatefulWidget {
  final String childId;
  final int ageMonths;

  const MilestoneAssessmentScreen({super.key, required this.childId, required this.ageMonths});

  @override
  State<MilestoneAssessmentScreen> createState() => _MilestoneAssessmentScreenState();
}

class _MilestoneAssessmentScreenState extends State<MilestoneAssessmentScreen> {
  final Map<String, bool> _results = {
    'gross_motor': false,
    'fine_motor': false,
    'language': false,
    'social': false,
  };

  @override
  Widget build(BuildContext context) {
    final syncService = Provider.of<SyncService>(context, listen: false);

    return Scaffold(
      app_bar: AppBar(title: const Text('Developmental Assessment')),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Text('Age Band: ${widget.ageMonths} Months', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 16),
          _buildMilestoneTile('Gross Motor', 'Does the child sit or walk as expected?'),
          _buildMilestoneTile('Fine Motor', 'Can the child pick up small objects?'),
          _buildMilestoneTile('Language', 'Does the child make sounds or follow gestures?'),
          _buildMilestoneTile('Social', 'Does the child smile or show preferences?'),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () => _saveAssessment(syncService),
            style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
            child: const Text('Save Assessment'),
          ),
        ],
      ),
    );
  }

  Widget _buildMilestoneTile(String key, String description) {
    return CheckboxListTile(
      title: Text(key),
      subtitle: Text(description),
      value: _results[key.toLowerCase().replaceAll(' ', '_')],
      onChanged: (val) {
        setState(() {
          _results[key.toLowerCase().replaceAll(' ', '_')] = val ?? false;
        });
      },
    );
  }

  Future<void> _saveAssessment(SyncService syncService) async {
    final payload = {
      'child': widget.childId,
      'assessment_date': DateTime.now().toIso8601String().substring(0, 10),
      'age_band_months': widget.ageMonths,
      'results': _results,
    };

    await syncService.enqueue(
      entityType: 'milestone',
      entityUuid: DateTime.now().millisecondsSinceEpoch.toString(), // Simple temp UUID
      payload: payload,
    );

    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Milestone assessment saved offline.')),
      );
    }
  }
}