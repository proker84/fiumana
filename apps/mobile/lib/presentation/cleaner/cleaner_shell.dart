import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_theme.dart';
import '../../routing/app_router.dart';
import '../providers/cleanings_provider.dart';

class CleanerShell extends ConsumerStatefulWidget {
  final Widget child;

  const CleanerShell({super.key, required this.child});

  @override
  ConsumerState<CleanerShell> createState() => _CleanerShellState();
}

class _CleanerShellState extends ConsumerState<CleanerShell> {
  int _currentIndex = 0;

  final _tabs = [
    (route: AppRoutes.cleanerCalendar, icon: Icons.calendar_month_outlined, activeIcon: Icons.calendar_month, label: 'Calendario'),
    (route: AppRoutes.cleanerProfile, icon: Icons.person_outline, activeIcon: Icons.person, label: 'Profilo'),
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _updateIndexFromLocation();
  }

  void _updateIndexFromLocation() {
    final location = GoRouterState.of(context).matchedLocation;

    // Check for calendar or profile root routes
    if (location == AppRoutes.cleanerCalendar || location.startsWith('/cleaner/cleaning')) {
      if (_currentIndex != 0) setState(() => _currentIndex = 0);
    } else if (location == AppRoutes.cleanerProfile) {
      if (_currentIndex != 1) setState(() => _currentIndex = 1);
    }
  }

  void _onTabTapped(int index) {
    if (index != _currentIndex) {
      setState(() => _currentIndex = index);
      context.go(_tabs[index].route);
    }
  }

  @override
  Widget build(BuildContext context) {
    final pendingCount = ref.watch(pendingCleaningsCountProvider);

    return Scaffold(
      body: widget.child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: _onTabTapped,
        backgroundColor: Theme.of(context).brightness == Brightness.dark
            ? AppTheme.darkSurface
            : AppTheme.lightSurface,
        indicatorColor: AppTheme.primaryCyan.withValues(alpha: 0.2),
        destinations: _tabs.asMap().entries.map((entry) {
          final index = entry.key;
          final tab = entry.value;
          Widget icon = Icon(tab.icon);
          Widget activeIcon = Icon(tab.activeIcon);

          // Add badge for pending cleanings
          if (index == 0 && pendingCount > 0) {
            icon = Badge(
              label: Text('$pendingCount'),
              child: icon,
            );
            activeIcon = Badge(
              label: Text('$pendingCount'),
              child: activeIcon,
            );
          }

          return NavigationDestination(
            icon: icon,
            selectedIcon: activeIcon,
            label: tab.label,
          );
        }).toList(),
      ),
    );
  }
}
