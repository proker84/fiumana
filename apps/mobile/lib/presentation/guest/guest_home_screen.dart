import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_theme.dart';
import '../../routing/app_router.dart';
import '../common/widgets.dart';
import '../providers/auth_provider.dart';
import '../providers/properties_provider.dart';

class GuestHomeScreen extends ConsumerStatefulWidget {
  const GuestHomeScreen({super.key});

  @override
  ConsumerState<GuestHomeScreen> createState() => _GuestHomeScreenState();
}

class _GuestHomeScreenState extends ConsumerState<GuestHomeScreen> {
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    await ref.read(propertiesProvider.notifier).loadProperties();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final propertiesState = ref.watch(propertiesProvider);
    // For now, show the first vacation property
    final property = propertiesState.vacationProperties.isNotEmpty
        ? propertiesState.vacationProperties.first
        : null;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Custom App Bar
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                'Benvenuto${user?.name != null ? ', ${user!.name}' : ''}!',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppTheme.primaryTeal,
                      AppTheme.primaryCyan.withValues(alpha: 0.7),
                    ],
                  ),
                ),
                child: const Center(
                  child: Icon(
                    Icons.beach_access,
                    size: 80,
                    color: Colors.white24,
                  ),
                ),
              ),
            ),
          ),

          // Content
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Property info
                if (property != null) ...[
                  _buildPropertyCard(property),
                  const SizedBox(height: 24),
                ],

                // Quick actions
                const SectionHeader(title: 'Azioni rapide'),
                const SizedBox(height: 12),
                _buildQuickActions(context),
                const SizedBox(height: 24),

                // Useful info
                const SectionHeader(title: 'Informazioni utili'),
                const SizedBox(height: 12),
                _buildInfoCards(context),
                const SizedBox(height: 24),

                // Emergency contact
                _buildEmergencyCard(context),
                const SizedBox(height: 32),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPropertyCard(property) {
    return GlassCard(
      margin: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppTheme.primaryCyan.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: property.coverImageUrl.isNotEmpty
                    ? AppNetworkImage(
                        url: property.coverImageUrl,
                        borderRadius: BorderRadius.circular(12),
                      )
                    : const Icon(Icons.home, color: AppTheme.primaryCyan, size: 40),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Il tuo soggiorno',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.primaryCyan,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      property.title,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    if (property.location != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.location_on, size: 14),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              property.location.fullAddress,
                              style: Theme.of(context).textTheme.bodySmall,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _PropertyStat(
                icon: Icons.bed,
                value: '${property.bedrooms ?? '-'}',
                label: 'Camere',
              ),
              _PropertyStat(
                icon: Icons.bathtub,
                value: '${property.bathrooms ?? '-'}',
                label: 'Bagni',
              ),
              _PropertyStat(
                icon: Icons.people,
                value: '${property.sleeps ?? '-'}',
                label: 'Ospiti max',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _QuickActionCard(
            icon: Icons.login,
            label: 'Check-in',
            color: Colors.orange,
            onTap: () => context.go(AppRoutes.guestCheckin),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _QuickActionCard(
            icon: Icons.help_outline,
            label: 'FAQ',
            color: AppTheme.primaryCyan,
            onTap: () => context.go(AppRoutes.guestFaq),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _QuickActionCard(
            icon: Icons.wifi,
            label: 'WiFi',
            color: Colors.blue,
            onTap: () {
              // Show WiFi info
              _showWifiDialog(context);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildInfoCards(BuildContext context) {
    return Column(
      children: [
        _InfoCard(
          icon: Icons.access_time,
          title: 'Check-in / Check-out',
          subtitle: 'Check-in: 15:00 | Check-out: 10:00',
          onTap: () => context.go(AppRoutes.guestFaq),
        ),
        const SizedBox(height: 8),
        _InfoCard(
          icon: Icons.local_parking,
          title: 'Parcheggio',
          subtitle: 'Parcheggio gratuito disponibile',
          onTap: () => context.go(AppRoutes.guestFaq),
        ),
        const SizedBox(height: 8),
        _InfoCard(
          icon: Icons.rule,
          title: 'Regole della casa',
          subtitle: 'Leggi le regole per il tuo soggiorno',
          onTap: () => context.go(AppRoutes.guestFaq),
        ),
      ],
    );
  }

  Widget _buildEmergencyCard(BuildContext context) {
    return GlassCard(
      margin: EdgeInsets.zero,
      onTap: () => context.go(AppRoutes.guestFaq),
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
              Icons.emergency,
              color: Colors.redAccent,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Emergenze',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Colors.redAccent,
                      ),
                ),
                Text(
                  'Numeri utili e contatti',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }

  void _showWifiDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.wifi, color: AppTheme.primaryCyan),
            SizedBox(width: 8),
            Text('WiFi'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Nome rete:',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            Text(
              'Fiumana_Guest',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            Text(
              'Password:',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            Row(
              children: [
                Text(
                  'Welcome2024',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.copy, size: 20),
                  onPressed: () {
                    // TODO: Copy to clipboard
                  },
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Chiudi'),
          ),
        ],
      ),
    );
  }
}

class _PropertyStat extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;

  const _PropertyStat({
    required this.icon,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: AppTheme.primaryCyan),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
      onTap: onTap,
      child: Column(
        children: [
          Icon(icon, size: 32, color: color),
          const SizedBox(height: 8),
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
          ),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _InfoCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      margin: EdgeInsets.zero,
      onTap: onTap,
      child: Row(
        children: [
          Icon(icon, color: AppTheme.primaryCyan),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }
}
