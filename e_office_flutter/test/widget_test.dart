import 'package:flutter_test/flutter_test.dart';
import 'package:e_office_flutter/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const GSVOfficeApp());
    expect(find.byType(GSVOfficeApp), findsOneWidget);
  });
}
