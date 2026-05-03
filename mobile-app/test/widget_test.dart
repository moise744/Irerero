// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Widget test placeholder', (WidgetTester tester) async {
    // The Irerero app is not a template counter app; its bootstrap depends on
    // local DB + secure storage + network, so the default Flutter template test
    // is replaced with a minimal smoke test.
    await tester.pumpWidget(const TestPlaceholderApp());
    expect(find.text('Irerero test'), findsOneWidget);
  });
}

class TestPlaceholderApp extends StatelessWidget {
  const TestPlaceholderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const Directionality(
      textDirection: TextDirection.ltr,
      child: Center(child: Text('Irerero test')),
    );
  }
}
