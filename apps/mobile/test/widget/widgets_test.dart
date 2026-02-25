import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fiumana_mobile/presentation/common/widgets.dart';
import 'package:fiumana_mobile/core/config/app_theme.dart';

void main() {
  group('GlassCard', () {
    testWidgets('renders child correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: Scaffold(
            body: GlassCard(
              child: const Text('Test Content'),
            ),
          ),
        ),
      );

      expect(find.text('Test Content'), findsOneWidget);
    });

    testWidgets('handles tap callback', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: Scaffold(
            body: GlassCard(
              onTap: () => tapped = true,
              child: const Text('Tap Me'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Tap Me'));
      expect(tapped, true);
    });

    testWidgets('handles long press callback', (tester) async {
      var longPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: Scaffold(
            body: GlassCard(
              onLongPress: () => longPressed = true,
              child: const Text('Long Press Me'),
            ),
          ),
        ),
      );

      await tester.longPress(find.text('Long Press Me'));
      expect(longPressed, true);
    });
  });

  group('StatusBadge', () {
    testWidgets('renders text and color correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: 'Pending',
              color: Colors.orange,
            ),
          ),
        ),
      );

      expect(find.text('Pending'), findsOneWidget);
    });

    testWidgets('shows icon when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: 'Active',
              color: Colors.green,
              icon: Icons.check,
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.check), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
    });
  });

  group('LoadingIndicator', () {
    testWidgets('shows circular progress indicator', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LoadingIndicator(),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows message when provided', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LoadingIndicator(message: 'Loading data...'),
          ),
        ),
      );

      expect(find.text('Loading data...'), findsOneWidget);
    });
  });

  group('ErrorDisplay', () {
    testWidgets('shows error message', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: const Scaffold(
            body: ErrorDisplay(message: 'Something went wrong'),
          ),
        ),
      );

      expect(find.text('Something went wrong'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });

    testWidgets('shows retry button when callback provided', (tester) async {
      var retried = false;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: Scaffold(
            body: ErrorDisplay(
              message: 'Error',
              onRetry: () => retried = true,
            ),
          ),
        ),
      );

      expect(find.text('Riprova'), findsOneWidget);
      await tester.tap(find.text('Riprova'));
      expect(retried, true);
    });
  });

  group('EmptyState', () {
    testWidgets('renders icon and title', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: const Scaffold(
            body: EmptyState(
              icon: Icons.inbox,
              title: 'No items',
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.inbox), findsOneWidget);
      expect(find.text('No items'), findsOneWidget);
    });

    testWidgets('shows subtitle when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: const Scaffold(
            body: EmptyState(
              icon: Icons.inbox,
              title: 'No items',
              subtitle: 'Add some items to get started',
            ),
          ),
        ),
      );

      expect(find.text('Add some items to get started'), findsOneWidget);
    });

    testWidgets('shows action widget when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: Scaffold(
            body: EmptyState(
              icon: Icons.inbox,
              title: 'No items',
              action: ElevatedButton(
                onPressed: () {},
                child: const Text('Add Item'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('Add Item'), findsOneWidget);
    });
  });

  group('LargeActionButton', () {
    testWidgets('renders icon and label', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: Scaffold(
            body: LargeActionButton(
              icon: Icons.camera_alt,
              label: 'Take Photo',
              onPressed: () {},
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.camera_alt), findsOneWidget);
      expect(find.text('Take Photo'), findsOneWidget);
    });

    testWidgets('shows loading indicator when isLoading is true', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: Scaffold(
            body: LargeActionButton(
              icon: Icons.camera_alt,
              label: 'Take Photo',
              onPressed: () {},
              isLoading: true,
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.byIcon(Icons.camera_alt), findsNothing);
    });

    testWidgets('handles tap when not loading', (tester) async {
      var pressed = false;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: Scaffold(
            body: LargeActionButton(
              icon: Icons.save,
              label: 'Save',
              onPressed: () => pressed = true,
            ),
          ),
        ),
      );

      await tester.tap(find.text('Save'));
      expect(pressed, true);
    });
  });

  group('SectionHeader', () {
    testWidgets('renders title', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: const Scaffold(
            body: SectionHeader(title: 'Section Title'),
          ),
        ),
      );

      expect(find.text('Section Title'), findsOneWidget);
    });

    testWidgets('shows action widget when provided', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: Scaffold(
            body: SectionHeader(
              title: 'Section',
              action: TextButton(
                onPressed: () {},
                child: const Text('View All'),
              ),
            ),
          ),
        ),
      );

      expect(find.text('View All'), findsOneWidget);
    });
  });

  group('StatCard', () {
    testWidgets('renders icon, value and label', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.darkTheme,
          home: const Scaffold(
            body: StatCard(
              icon: Icons.home,
              value: '15',
              label: 'Properties',
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.home), findsOneWidget);
      expect(find.text('15'), findsOneWidget);
      expect(find.text('Properties'), findsOneWidget);
    });
  });
}
