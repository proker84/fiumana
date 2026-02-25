import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/config/app_theme.dart';
import '../data/models/user_model.dart';
import '../presentation/providers/auth_provider.dart';

// Import screens
import '../presentation/common/login_screen.dart';
import '../presentation/common/profile_screen.dart';
import '../presentation/admin/admin_shell.dart';
import '../presentation/admin/admin_dashboard_screen.dart';
import '../presentation/cleaner/cleaner_shell.dart';
import '../presentation/cleaner/cleaner_calendar_screen.dart';
import '../presentation/cleaner/cleaner_cleaning_detail_screen.dart';
import '../presentation/guest/guest_shell.dart';
import '../presentation/guest/guest_home_screen.dart';
import '../presentation/guest/guest_checkin_screen.dart';
import '../presentation/guest/guest_faq_screen.dart';
import '../presentation/admin/admin_payments_screen.dart';

// Route names
class AppRoutes {
  static const splash = '/';
  static const login = '/login';

  // Admin routes
  static const adminDashboard = '/admin';
  static const adminProperties = '/admin/properties';
  static const adminPropertyDetail = '/admin/properties/:id';
  static const adminCleanings = '/admin/cleanings';
  static const adminCleaningDetail = '/admin/cleanings/:id';
  static const adminStock = '/admin/stock';
  static const adminBookings = '/admin/bookings';
  static const adminPayments = '/admin/payments';
  static const adminProfile = '/admin/profile';

  // Cleaner routes
  static const cleanerCalendar = '/cleaner';
  static const cleanerCleaningDetail = '/cleaner/cleaning/:id';
  static const cleanerPhotoUpload = '/cleaner/cleaning/:id/photos';
  static const cleanerProfile = '/cleaner/profile';

  // Guest routes
  static const guestHome = '/guest';
  static const guestPropertyInfo = '/guest/property';
  static const guestCheckin = '/guest/checkin';
  static const guestFaq = '/guest/faq';
  static const guestFaqDetail = '/guest/faq/:id';
  static const guestProfile = '/guest/profile';
}

final routerProvider = Provider<GoRouter>((ref) {
  final refreshNotifier = GoRouterRefreshStream(ref);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: true,
    refreshListenable: refreshNotifier,
    redirect: (context, state) {
      // Read auth state inside redirect to get current value
      final authState = ref.read(authProvider);
      final isLoggedIn = authState.isAuthenticated;
      final isLoggingIn = state.matchedLocation == AppRoutes.login;
      final isSplash = state.matchedLocation == AppRoutes.splash;

      // Show splash while checking auth
      if (authState.status == AuthStatus.initial) {
        return isSplash ? null : AppRoutes.splash;
      }

      // Redirect to login if not authenticated
      if (!isLoggedIn) {
        return isLoggingIn ? null : AppRoutes.login;
      }

      // Redirect away from login/splash if authenticated
      if (isLoggedIn && (isLoggingIn || isSplash)) {
        return _getHomeRouteForRole(authState.user?.role);
      }

      // Check role-based access
      final currentPath = state.matchedLocation;
      final userRole = authState.user?.role;

      if (currentPath.startsWith('/admin') && userRole != UserRole.admin) {
        return _getHomeRouteForRole(userRole);
      }
      if (currentPath.startsWith('/cleaner') && userRole != UserRole.cleaner) {
        return _getHomeRouteForRole(userRole);
      }
      if (currentPath.startsWith('/guest') && userRole != UserRole.guest) {
        return _getHomeRouteForRole(userRole);
      }

      return null;
    },
    routes: [
      // Splash
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const SplashScreen(),
      ),

      // Login
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),

      // Admin Shell
      ShellRoute(
        builder: (context, state, child) => AdminShell(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.adminDashboard,
            builder: (context, state) => const AdminDashboardScreen(),
          ),
          GoRoute(
            path: AppRoutes.adminProperties,
            builder: (context, state) => const AdminPropertiesScreen(),
          ),
          GoRoute(
            path: AppRoutes.adminPropertyDetail,
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return AdminPropertyDetailScreen(propertyId: id);
            },
          ),
          GoRoute(
            path: AppRoutes.adminCleanings,
            builder: (context, state) => const AdminCleaningsScreen(),
          ),
          GoRoute(
            path: AppRoutes.adminCleaningDetail,
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return AdminCleaningDetailScreen(cleaningId: id);
            },
          ),
          GoRoute(
            path: AppRoutes.adminStock,
            builder: (context, state) => const AdminStockScreen(),
          ),
          GoRoute(
            path: AppRoutes.adminBookings,
            builder: (context, state) => const AdminBookingsScreen(),
          ),
          GoRoute(
            path: AppRoutes.adminPayments,
            builder: (context, state) => const AdminPaymentsScreen(),
          ),
          GoRoute(
            path: AppRoutes.adminProfile,
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),

      // Cleaner Shell
      ShellRoute(
        builder: (context, state, child) => CleanerShell(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.cleanerCalendar,
            builder: (context, state) => const CleanerCalendarScreen(),
          ),
          GoRoute(
            path: AppRoutes.cleanerCleaningDetail,
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return CleanerCleaningDetailScreen(cleaningId: id);
            },
          ),
          GoRoute(
            path: AppRoutes.cleanerPhotoUpload,
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return CleanerCleaningDetailScreen(cleaningId: id);
            },
          ),
          GoRoute(
            path: AppRoutes.cleanerProfile,
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),

      // Guest Shell
      ShellRoute(
        builder: (context, state, child) => GuestShell(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.guestHome,
            builder: (context, state) => const GuestHomeScreen(),
          ),
          GoRoute(
            path: AppRoutes.guestPropertyInfo,
            builder: (context, state) => const GuestPropertyInfoScreen(),
          ),
          GoRoute(
            path: AppRoutes.guestCheckin,
            builder: (context, state) => const GuestCheckinScreen(),
          ),
          GoRoute(
            path: AppRoutes.guestFaq,
            builder: (context, state) => const GuestFaqScreen(),
          ),
          GoRoute(
            path: AppRoutes.guestFaqDetail,
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return GuestFaqDetailScreen(faqId: id);
            },
          ),
          GoRoute(
            path: AppRoutes.guestProfile,
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => ErrorScreen(error: state.error),
  );
});

String _getHomeRouteForRole(UserRole? role) {
  switch (role) {
    case UserRole.admin:
      return AppRoutes.adminDashboard;
    case UserRole.cleaner:
      return AppRoutes.cleanerCalendar;
    case UserRole.guest:
      return AppRoutes.guestHome;
    default:
      return AppRoutes.login;
  }
}

// Refresh stream for GoRouter
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(this._ref) {
    _ref.listen(authProvider, (previous, next) {
      notifyListeners();
    });
  }

  final Ref _ref;
}

// Splash Screen
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.home_work_rounded,
              size: 80,
              color: AppTheme.primaryCyan,
            ),
            const SizedBox(height: 24),
            Text(
              'Fiumana Immobiliare',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 32),
            const CircularProgressIndicator(
              color: AppTheme.primaryCyan,
            ),
          ],
        ),
      ),
    );
  }
}

// Placeholder screens for admin (to be fully implemented)
class AdminPropertiesScreen extends StatelessWidget {
  const AdminPropertiesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Immobili')),
      body: const Center(child: Text('Lista immobili - Da implementare')),
    );
  }
}

class AdminPropertyDetailScreen extends StatelessWidget {
  final String propertyId;
  const AdminPropertyDetailScreen({super.key, required this.propertyId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dettaglio Immobile')),
      body: Center(child: Text('Immobile: $propertyId')),
    );
  }
}

class AdminCleaningsScreen extends StatelessWidget {
  const AdminCleaningsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pulizie')),
      body: const Center(child: Text('Lista pulizie - Da implementare')),
    );
  }
}

class AdminCleaningDetailScreen extends StatelessWidget {
  final String cleaningId;
  const AdminCleaningDetailScreen({super.key, required this.cleaningId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dettaglio Pulizia')),
      body: Center(child: Text('Pulizia: $cleaningId')),
    );
  }
}

class AdminStockScreen extends StatelessWidget {
  const AdminStockScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Stock')),
      body: const Center(child: Text('Gestione stock - Da implementare')),
    );
  }
}

class AdminBookingsScreen extends StatelessWidget {
  const AdminBookingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Prenotazioni')),
      body: const Center(child: Text('Lista prenotazioni - Da implementare')),
    );
  }
}

// Guest placeholder screens
class GuestPropertyInfoScreen extends StatelessWidget {
  const GuestPropertyInfoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Info Proprietà')),
      body: const Center(child: Text('Info proprietà - Da implementare')),
    );
  }
}

class GuestFaqDetailScreen extends StatelessWidget {
  final String faqId;
  const GuestFaqDetailScreen({super.key, required this.faqId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('FAQ')),
      body: Center(child: Text('FAQ: $faqId')),
    );
  }
}

class ErrorScreen extends StatelessWidget {
  final Exception? error;
  const ErrorScreen({super.key, this.error});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.redAccent),
            const SizedBox(height: 16),
            Text(
              'Errore',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(error?.toString() ?? 'Pagina non trovata'),
          ],
        ),
      ),
    );
  }
}
