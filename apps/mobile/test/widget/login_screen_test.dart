import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fiumana_mobile/presentation/common/login_screen.dart';
import 'package:fiumana_mobile/core/config/app_theme.dart';

void main() {
  group('LoginScreen', () {
    testWidgets('renders login form correctly', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.darkTheme,
            home: const LoginScreen(),
          ),
        ),
      );

      // Verify logo/title is displayed
      expect(find.text('Fiumana\nImmobiliare'), findsOneWidget);
      expect(find.text('Accedi per continuare'), findsOneWidget);

      // Verify form fields exist
      expect(find.byType(TextFormField), findsNWidgets(2));
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);

      // Verify login button exists
      expect(find.text('Accedi'), findsOneWidget);
    });

    testWidgets('shows validation errors for empty fields', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.darkTheme,
            home: const LoginScreen(),
          ),
        ),
      );

      // Tap login button without entering data
      await tester.tap(find.text('Accedi'));
      await tester.pumpAndSettle();

      // Verify validation errors are shown
      expect(find.text('Inserisci la tua email'), findsOneWidget);
      expect(find.text('Inserisci la tua password'), findsOneWidget);
    });

    testWidgets('shows error for invalid email format', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.darkTheme,
            home: const LoginScreen(),
          ),
        ),
      );

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

    testWidgets('password visibility toggle works', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.darkTheme,
            home: const LoginScreen(),
          ),
        ),
      );

      // Find password field - initially obscured
      final passwordField = find.byType(TextFormField).last;
      expect(passwordField, findsOneWidget);

      // Find visibility toggle button
      final visibilityButton = find.byIcon(Icons.visibility_outlined);
      expect(visibilityButton, findsOneWidget);

      // Tap to show password
      await tester.tap(visibilityButton);
      await tester.pump();

      // Verify icon changed
      expect(find.byIcon(Icons.visibility_off_outlined), findsOneWidget);
    });

    testWidgets('version number is displayed', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.darkTheme,
            home: const LoginScreen(),
          ),
        ),
      );

      expect(find.text('Versione 1.0.0'), findsOneWidget);
    });
  });
}
