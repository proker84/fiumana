import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_theme.dart';
import '../../routing/app_router.dart';

class GuestShell extends ConsumerStatefulWidget {
  final Widget child;

  const GuestShell({super.key, required this.child});

  @override
  ConsumerState<GuestShell> createState() => _GuestShellState();
}

class _GuestShellState extends ConsumerState<GuestShell> {
  int _currentIndex = 0;

  final _tabs = [
    (route: AppRoutes.guestHome, icon: Icons.home_outlined, activeIcon: Icons.home, label: 'Home'),
    (route: AppRoutes.guestCheckin, icon: Icons.login_outlined, activeIcon: Icons.login, label: 'Check-in'),
    (route: AppRoutes.guestFaq, icon: Icons.help_outline, activeIcon: Icons.help, label: 'FAQ'),
    (route: AppRoutes.guestProfile, icon: Icons.person_outline, activeIcon: Icons.person, label: 'Profilo'),
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _updateIndexFromLocation();
  }

  void _updateIndexFromLocation() {
    final location = GoRouterState.of(context).matchedLocation;

    for (int i = 0; i < _tabs.length; i++) {
      final tabRoute = _tabs[i].route;
      if (location == tabRoute || location.startsWith('$tabRoute/')) {
        if (_currentIndex != i) {
          setState(() => _currentIndex = i);
        }
        break;
      }
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
    return Scaffold(
      body: widget.child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: _onTabTapped,
        backgroundColor: Theme.of(context).brightness == Brightness.dark
            ? AppTheme.darkSurface
            : AppTheme.lightSurface,
        indicatorColor: AppTheme.primaryCyan.withValues(alpha: 0.2),
        destinations: _tabs.map((tab) {
          return NavigationDestination(
            icon: Icon(tab.icon),
            selectedIcon: Icon(tab.activeIcon),
            label: tab.label,
          );
        }).toList(),
      ),
    );
  }
}
