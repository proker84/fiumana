import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_theme.dart';
import '../../routing/app_router.dart';
import '../providers/properties_provider.dart';
import '../common/widgets.dart';
import '../../data/models/property_model.dart';

class AdminPropertiesScreen extends ConsumerStatefulWidget {
  const AdminPropertiesScreen({super.key});

  @override
  ConsumerState<AdminPropertiesScreen> createState() => _AdminPropertiesScreenState();
}

class _AdminPropertiesScreenState extends ConsumerState<AdminPropertiesScreen> {
  @override
  void initState() {
    super.initState();
    Future(() {
      ref.read(propertiesProvider.notifier).loadProperties();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(propertiesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Immobili'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.go(AppRoutes.adminAirbnbImport),
            tooltip: 'Importa da Airbnb',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(propertiesProvider.notifier).loadProperties(),
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(state.error!),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => ref.read(propertiesProvider.notifier).loadProperties(),
                        child: const Text('Riprova'),
                      ),
                    ],
                  ),
                )
              : state.properties.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: () => ref.read(propertiesProvider.notifier).loadProperties(),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: state.properties.length,
                        itemBuilder: (context, index) {
                          return _PropertyCard(
                            property: state.properties[index],
                            onTap: () => context.go('/admin/properties/${state.properties[index].id}'),
                          );
                        },
                      ),
                    ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go(AppRoutes.adminAirbnbImport),
        icon: const Icon(Icons.add_home_work),
        label: const Text('Importa'),
        backgroundColor: AppTheme.primaryCyan,
        foregroundColor: Colors.black,
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.home_work_outlined,
            size: 80,
            color: Colors.grey.shade600,
          ),
          const SizedBox(height: 24),
          Text(
            'Nessun immobile',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'Importa il primo immobile da Airbnb',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey,
                ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => context.go(AppRoutes.adminAirbnbImport),
            icon: const Icon(Icons.add),
            label: const Text('Importa da Airbnb'),
          ),
        ],
      ),
    );
  }
}

class _PropertyCard extends StatelessWidget {
  final PropertyModel property;
  final VoidCallback onTap;

  const _PropertyCard({
    required this.property,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final hasImage = property.media.isNotEmpty;
    String imageUrl = '';
    if (hasImage) {
      imageUrl = property.media.first.url;
      // Se è un URL relativo, aggiungi il base URL
      if (imageUrl.startsWith('/uploads/')) {
        imageUrl = 'https://api-production-c77b.up.railway.app$imageUrl';
      }
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            AspectRatio(
              aspectRatio: 16 / 9,
              child: hasImage
                  ? Image.network(
                      imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _buildPlaceholder(),
                    )
                  : _buildPlaceholder(),
            ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  Text(
                    property.title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),

                  // Location
                  if (property.location != null)
                    Row(
                      children: [
                        const Icon(Icons.location_on, size: 16, color: AppTheme.primaryCyan),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            '${property.location!.city}, ${property.location!.province}',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Colors.grey,
                                ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 12),

                  // Details chips
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (property.bedrooms != null)
                        _DetailChip(
                          icon: Icons.bed,
                          label: '${property.bedrooms} camere',
                        ),
                      if (property.bathrooms != null)
                        _DetailChip(
                          icon: Icons.bathroom,
                          label: '${property.bathrooms} bagni',
                        ),
                      if (property.sleeps != null)
                        _DetailChip(
                          icon: Icons.person,
                          label: '${property.sleeps} ospiti',
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Badges row
                  Row(
                    children: [
                      // Airbnb badge
                      if (property.airbnbId != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.pink.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.home, size: 14, color: Colors.pink.shade300),
                              const SizedBox(width: 4),
                              Text(
                                'Airbnb',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.pink.shade300,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      if (property.airbnbId != null) const SizedBox(width: 8),

                      // CIN badge
                      if (property.cin != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryCyan.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'CIN: ${property.cin}',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppTheme.primaryCyan,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),

                      const Spacer(),

                      // Arrow
                      const Icon(Icons.chevron_right, color: Colors.grey),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: Colors.grey.shade800,
      child: const Center(
        child: Icon(
          Icons.home_work,
          size: 48,
          color: Colors.grey,
        ),
      ),
    );
  }
}

class _DetailChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _DetailChip({
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey.shade800,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppTheme.primaryCyan),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(fontSize: 12),
          ),
        ],
      ),
    );
  }
}
