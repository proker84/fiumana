import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:integration_test/integration_test.dart';
import 'package:fiumana_mobile/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('App Integration Tests', () {
    testWidgets('app starts and shows splash screen', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: FiumanaApp(),
        ),
      );

      // Verify splash screen is shown
      expect(find.text('Fiumana Immobiliare'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('navigates to login when not authenticated', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: FiumanaApp(),
        ),
      );

      // Wait for auth check
      await tester.pumpAndSettle(const Duration(seconds: 2));

      // Should be on login screen
      expect(find.text('Accedi per continuare'), findsOneWidget);
    });

    testWidgets('login form validates empty fields', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: FiumanaApp(),
        ),
      );

      await tester.pumpAndSettle(const Duration(seconds: 2));

      // Tap login button without entering data
      await tester.tap(find.text('Accedi'));
      await tester.pumpAndSettle();

      // Verify validation errors
      expect(find.text('Inserisci la tua email'), findsOneWidget);
      expect(find.text('Inserisci la tua password'), findsOneWidget);
    });

    testWidgets('login form validates email format', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: FiumanaApp(),
        ),
      );

      await tester.pumpAndSettle(const Duration(seconds: 2));

      // Enter invalid email
      await tester.enterText(
        find.byType(TextFormField).first,
        'invalid-email',
      );
      await tester.enterText(
        find.byType(TextFormField).last,
        'password123',
      );

      // Tap login button
      await tester.tap(find.text('Accedi'));
      await tester.pumpAndSettle();

      // Verify email validation error
      expect(find.text("Inserisci un'email valida"), findsOneWidget);
    });
  });
}
