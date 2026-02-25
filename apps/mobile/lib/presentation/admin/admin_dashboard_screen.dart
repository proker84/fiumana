import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_theme.dart';
import '../../routing/app_router.dart';
import '../common/widgets.dart';
import '../providers/auth_provider.dart';
import '../providers/cleanings_provider.dart';
import '../providers/stock_provider.dart';
import '../providers/properties_provider.dart';
import '../providers/payments_provider.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    await Future.wait([
      ref.read(cleaningsProvider.notifier).loadCleanings(),
      ref.read(stockProvider.notifier).loadStock(),
      ref.read(stockProvider.notifier).loadLowStockAlerts(),
      ref.read(propertiesProvider.notifier).loadProperties(),
      ref.read(paymentsProvider.notifier).loadPayments(),
      ref.read(paymentsProvider.notifier).loadSummary(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final cleaningsState = ref.watch(cleaningsProvider);
    final stockState = ref.watch(stockProvider);
    final propertiesState = ref.watch(propertiesProvider);
    final paymentsState = ref.watch(paymentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Welcome message
              Text(
                'Ciao, ${user?.name ?? 'Admin'}!',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 4),
              Text(
                _getGreeting(),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.color
                          ?.withValues(alpha: 0.7),
                    ),
              ),
              const SizedBox(height: 24),

              // Stats grid
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.3,
                children: [
                  StatCard(
                    icon: Icons.home,
                    value: '${propertiesState.properties.length}',
                    label: 'Immobili',
                    color: AppTheme.primaryCyan,
                  ),
                  StatCard(
                    icon: Icons.cleaning_services,
                    value: '${cleaningsState.pendingCleanings.length}',
                    label: 'Pulizie in attesa',
                    color: Colors.orange,
                  ),
                  StatCard(
                    icon: Icons.play_circle,
                    value: '${cleaningsState.inProgressCleanings.length}',
                    label: 'In corso',
                    color: Colors.blue,
                  ),
                  StatCard(
                    icon: Icons.warning_amber,
                    value: '${stockState.lowStockAlerts.length}',
                    label: 'Stock bassi',
                    color: stockState.lowStockAlerts.isEmpty
                        ? Colors.green
                        : Colors.redAccent,
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Payments summary card
              GlassCard(
                onTap: () => context.go(AppRoutes.adminPayments),
                child: Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: Colors.purple.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.euro,
                        color: Colors.purple,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Pagamenti in attesa',
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${paymentsState.pendingPayments.length} pulizie da pagare',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.color
                                      ?.withValues(alpha: 0.7),
                                ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '€${paymentsState.pendingAmount.toStringAsFixed(0)}',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.purple,
                          ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.chevron_right),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Today's cleanings
              SectionHeader(
                title: 'Pulizie di oggi',
                action: TextButton(
                  onPressed: () => context.go(AppRoutes.adminCleanings),
                  child: const Text('Vedi tutte'),
                ),
              ),
              const SizedBox(height: 8),
              _buildTodayCleanings(cleaningsState),

              const SizedBox(height: 24),

              // Stock alerts
              if (stockState.lowStockAlerts.isNotEmpty) ...[
                SectionHeader(
                  title: 'Avvisi Stock',
                  action: TextButton(
                    onPressed: () => context.go(AppRoutes.adminStock),
                    child: const Text('Gestisci'),
                  ),
                ),
                const SizedBox(height: 8),
                _buildStockAlerts(stockState),
              ],

              const SizedBox(height: 24),

              // Import from Airbnb
              GlassCard(
                onTap: () => context.go(AppRoutes.adminAirbnbImport),
                child: Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: Colors.pink.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.add_home_work,
                        color: Colors.pink,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Importa da Airbnb',
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Aggiungi immobile da link Airbnb',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.color
                                      ?.withValues(alpha: 0.7),
                                ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Quick actions
              const SectionHeader(title: 'Azioni rapide'),
              const SizedBox(height: 8),
              _buildQuickActions(),
            ],
          ),
        ),
      ),
    );
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  }

  Widget _buildTodayCleanings(CleaningsState state) {
    final todayCleanings = state.getCleaningsForDate(DateTime.now());

    if (todayCleanings.isEmpty) {
      return GlassCard(
        margin: EdgeInsets.zero,
        child: Row(
          children: [
            Icon(
              Icons.check_circle,
              color: Colors.green,
              size: 40,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Nessuna pulizia oggi',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    'Tutte le proprietà sono in ordine',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: todayCleanings.take(3).map((cleaning) {
        return GlassCard(
          margin: const EdgeInsets.only(bottom: 8),
          onTap: () => context.go('/admin/cleanings/${cleaning.id}'),
          child: Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: _getStatusColor(cleaning.status).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getStatusIcon(cleaning.status),
                  color: _getStatusColor(cleaning.status),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      cleaning.property?.title ?? 'Proprietà',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    Text(
                      cleaning.cleaner?.name ?? 'Non assegnata',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              StatusBadge(
                text: _getStatusText(cleaning.status),
                color: _getStatusColor(cleaning.status),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildStockAlerts(StockState state) {
    return Column(
      children: state.lowStockAlerts.take(3).map((item) {
        return GlassCard(
          margin: const EdgeInsets.only(bottom: 8),
          onTap: () => context.go(AppRoutes.adminStock),
          child: Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.redAccent.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.warning_amber,
                  color: Colors.redAccent,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name,
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    Text(
                      '${item.quantity} / ${item.minQuantity} minimo',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              Text(
                item.categoryDisplayName,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.color
                          ?.withValues(alpha: 0.7),
                    ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildQuickActions() {
    return Row(
      children: [
        Expanded(
          child: _QuickActionCard(
            icon: Icons.add_home,
            label: 'Nuova\nPulizia',
            onTap: () {
              // TODO: Show create cleaning dialog
            },
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _QuickActionCard(
            icon: Icons.euro,
            label: 'Gestisci\nPagamenti',
            onTap: () => context.go(AppRoutes.adminPayments),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _QuickActionCard(
            icon: Icons.add_shopping_cart,
            label: 'Aggiungi\nStock',
            onTap: () => context.go(AppRoutes.adminStock),
          ),
        ),
      ],
    );
  }

  Color _getStatusColor(status) {
    switch (status.toString()) {
      case 'CleaningStatus.pending':
        return Colors.orange;
      case 'CleaningStatus.inProgress':
        return Colors.blue;
      case 'CleaningStatus.completed':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(status) {
    switch (status.toString()) {
      case 'CleaningStatus.pending':
        return Icons.schedule;
      case 'CleaningStatus.inProgress':
        return Icons.play_arrow;
      case 'CleaningStatus.completed':
        return Icons.check;
      default:
        return Icons.help;
    }
  }

  String _getStatusText(status) {
    switch (status.toString()) {
      case 'CleaningStatus.pending':
        return 'In attesa';
      case 'CleaningStatus.inProgress':
        return 'In corso';
      case 'CleaningStatus.completed':
        return 'Completata';
      default:
        return 'Sconosciuto';
    }
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      onTap: onTap,
      child: Column(
        children: [
          Icon(icon, size: 32, color: AppTheme.primaryCyan),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
