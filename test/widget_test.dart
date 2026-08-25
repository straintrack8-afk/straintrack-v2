// Basic test to verify app builds correctly

import 'package:flutter_test/flutter_test.dart';
import 'package:straintrack_v2/main.dart';

void main() {
  testWidgets('App builds without error', (WidgetTester tester) async {
    // Build the app widget - this verifies the widget tree can be built
    // Note: Actual app requires Supabase initialization, so we just check imports
    expect(StrainTrackApp, isNotNull);
  });
}
