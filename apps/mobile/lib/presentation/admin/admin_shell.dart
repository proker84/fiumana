import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_theme.dart';
import '../../routing/app_router.dart';
import '../providers/stock_provider.dart';

class AdminShell extends ConsumerStatefulWidget {
  final Widget child;

  const AdminShell({super.key, required this.child});

  @override
  ConsumerState<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends ConsumerState<AdminShell> {
  int _currentIndex = 0;

  final _tabs = [
    (route: AppRoutes.adminDashboard, icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard, label: 'Dashboard'),
    (route: AppRoutes.adminProperties, icon: Icons.home_outlined, activeIcon: Icons.home, label: 'Immobili'),
    (route: AppRoutes.adminCleanings, icon: Icons.cleaning_services_outlined, activeIcon: Icons.cleaning_services, label: 'Pulizie'),
    (route: AppRoutes.adminStock, icon: Icons.inventory_2_outlined, activeIcon: Icons.inventory_2, label: 'Stock'),
    (route: AppRoutes.adminProfile, icon: Icons.person_outline, activeIcon: Icons.person, label: 'Profilo'),
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _updateIndexFromLocation();
  }

  void _updateIndexFromLocation() {
    final location = GoRouterState.of(context).matchedLocation;
    for (int i = 0; i < _tabs.length; i++) {
      if (location.startsWith(_tabs[i].route.replaceAll('/:id', ''))) {
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
    final lowStockCount = ref.watch(lowStockCountProvider);

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
          Widget icon = Icon(tab.icon);
          Widget activeIcon = Icon(tab.activeIcon);

          // Add badge for stock alerts
          if (tab.route == AppRoutes.adminStock && lowStockCount > 0) {
            icon = Badge(
              label: Text('$lowStockCount'),
              child: icon,
            );
            activeIcon = Badge(
              label: Text('$lowStockCount'),
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
