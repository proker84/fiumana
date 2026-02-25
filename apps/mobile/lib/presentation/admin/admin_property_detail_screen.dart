import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_theme.dart';
import '../../data/models/property_model.dart';
import '../../data/models/cleaner_model.dart';
import '../providers/properties_provider.dart';
import '../providers/cleaners_provider.dart';
import '../common/widgets.dart';

class AdminPropertyDetailScreen extends ConsumerStatefulWidget {
  final String propertyId;

  const AdminPropertyDetailScreen({super.key, required this.propertyId});

  @override
  ConsumerState<AdminPropertyDetailScreen> createState() =>
      _AdminPropertyDetailScreenState();
}

class _AdminPropertyDetailScreenState
    extends ConsumerState<AdminPropertyDetailScreen> {
  @override
  void initState() {
    super.initState();
    Future(() {
      ref.read(propertiesProvider.notifier).selectProperty(widget.propertyId);
      ref.read(cleanersProvider.notifier).loadCleaners();
    });
  }

  @override
  Widget build(BuildContext context) {
    final property = ref.watch(selectedPropertyProvider);
    final cleanersState = ref.watch(cleanersProvider);
    final propertiesState = ref.watch(propertiesProvider);

    if (property == null || propertiesState.isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Dettaglio Immobile')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Hero image with app bar
          SliverAppBar(
            expandedHeight: 250,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                property.title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  shadows: [Shadow(blurRadius: 4, color: Colors.black54)],
                ),
              ),
              background: _buildHeroImage(property),
            ),
          ),

          // Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Badges
                  _buildBadges(property),
                  const SizedBox(height: 16),

                  // Location
                  if (property.location != null) ...[
                    _buildLocationCard(property),
                    const SizedBox(height: 16),
                  ],

                  // Details
                  _buildDetailsCard(property),
                  const SizedBox(height: 16),

                  // Description
                  _buildDescriptionCard(property),
                  const SizedBox(height: 24),

                  // Assigned Cleaners Section
                  _buildCleanersSection(property, cleanersState),
                  const SizedBox(height: 24),

                  // Amenities
                  if (property.amenities.isNotEmpty) ...[
                    _buildAmenitiesCard(property),
                    const SizedBox(height: 24),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroImage(PropertyModel property) {
    if (property.media.isEmpty) {
      return Container(
        color: Colors.grey.shade800,
        child: const Center(
          child: Icon(Icons.home_work, size: 80, color: Colors.grey),
        ),
      );
    }

    String imageUrl = property.media.first.url;
    if (imageUrl.startsWith('/uploads/')) {
      imageUrl = 'https://api-production-c77b.up.railway.app$imageUrl';
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        Image.network(
          imageUrl,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            color: Colors.grey.shade800,
            child: const Center(
              child: Icon(Icons.home_work, size: 80, color: Colors.grey),
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.transparent,
                Colors.black.withOpacity(0.7),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBadges(PropertyModel property) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        if (property.airbnbId != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.pink.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.home, size: 16, color: Colors.pink.shade300),
                const SizedBox(width: 6),
                Text(
                  'Airbnb',
                  style: TextStyle(
                    color: Colors.pink.shade300,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        if (property.cin != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppTheme.primaryCyan.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              'CIN: ${property.cin}',
              style: const TextStyle(
                color: AppTheme.primaryCyan,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildLocationCard(PropertyModel property) {
    return GlassCard(
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppTheme.primaryCyan.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.location_on, color: AppTheme.primaryCyan),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  property.location!.fullAddress,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: 4),
                Text(
                  '${property.location!.city}, ${property.location!.province}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailsCard(PropertyModel property) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Dettagli',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _DetailItem(
                icon: Icons.bed,
                value: '${property.bedrooms ?? 0}',
                label: 'Camere',
              ),
              _DetailItem(
                icon: Icons.bathroom,
                value: '${property.bathrooms ?? 0}',
                label: 'Bagni',
              ),
              _DetailItem(
                icon: Icons.person,
                value: '${property.sleeps ?? 0}',
                label: 'Ospiti',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDescriptionCard(PropertyModel property) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Descrizione',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 12),
          Text(
            property.description.isNotEmpty
                ? property.description
                : 'Nessuna descrizione disponibile',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey.shade300,
                  height: 1.5,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildCleanersSection(PropertyModel property, CleanersState cleanersState) {
    final assignedCleaners = property.assignedCleaners;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Personale Pulizie Assegnato',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            IconButton(
              icon: const Icon(Icons.person_add, color: AppTheme.primaryCyan),
              onPressed: () => _showAssignCleanerDialog(
                property,
                cleanersState.cleaners,
                assignedCleaners,
              ),
              tooltip: 'Assegna personale',
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (assignedCleaners.isEmpty)
          GlassCard(
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.grey.shade400),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Nessun personale assegnato.\nTocca + per assegnare il personale delle pulizie.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey.shade400,
                        ),
                  ),
                ),
              ],
            ),
          )
        else
          ...assignedCleaners.map((cleaner) => _buildCleanerCard(property, cleaner)),
      ],
    );
  }

  Widget _buildCleanerCard(PropertyModel property, CleanerModel cleaner) {
    return GlassCard(
      margin: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: AppTheme.primaryCyan.withOpacity(0.2),
            child: Text(
              cleaner.name.isNotEmpty ? cleaner.name[0].toUpperCase() : 'C',
              style: const TextStyle(
                color: AppTheme.primaryCyan,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  cleaner.name,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                if (cleaner.phone != null)
                  Text(
                    cleaner.phone!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey,
                        ),
                  ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.remove_circle_outline, color: Colors.redAccent),
            onPressed: () => _confirmRemoveCleaner(property, cleaner),
            tooltip: 'Rimuovi',
          ),
        ],
      ),
    );
  }

  void _showAssignCleanerDialog(
    PropertyModel property,
    List<CleanerModel> allCleaners,
    List<CleanerModel> assignedCleaners,
  ) {
    final assignedIds = assignedCleaners.map((c) => c.id).toSet();
    final availableCleaners =
        allCleaners.where((c) => !assignedIds.contains(c.id)).toList();

    if (availableCleaners.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Tutti i cleaner sono già assegnati a questa proprietà'),
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.cardBackground,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Seleziona Personale',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...availableCleaners.map((cleaner) => ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppTheme.primaryCyan.withOpacity(0.2),
                    child: Text(
                      cleaner.name.isNotEmpty ? cleaner.name[0].toUpperCase() : 'C',
                      style: const TextStyle(
                        color: AppTheme.primaryCyan,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  title: Text(cleaner.name),
                  subtitle: Text(cleaner.email),
                  onTap: () async {
                    Navigator.pop(context);
                    await _assignCleaner(property, cleaner);
                  },
                )),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Future<void> _assignCleaner(PropertyModel property, CleanerModel cleaner) async {
    try {
      await ref.read(propertiesProvider.notifier).assignCleaner(
            property.id,
            cleaner.id,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${cleaner.name} assegnato con successo')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Errore: ${e.toString()}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  void _confirmRemoveCleaner(PropertyModel property, CleanerModel cleaner) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.cardBackground,
        title: const Text('Conferma rimozione'),
        content: Text(
          'Vuoi rimuovere ${cleaner.name} da questa proprietà?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annulla'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await _removeCleaner(property, cleaner);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
            ),
            child: const Text('Rimuovi'),
          ),
        ],
      ),
    );
  }

  Future<void> _removeCleaner(PropertyModel property, CleanerModel cleaner) async {
    try {
      await ref.read(propertiesProvider.notifier).removeCleaner(
            property.id,
            cleaner.id,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${cleaner.name} rimosso')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Errore: ${e.toString()}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  Widget _buildAmenitiesCard(PropertyModel property) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Servizi',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: property.amenities.map((amenity) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.grey.shade800,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check, size: 16, color: AppTheme.primaryCyan),
                    const SizedBox(width: 6),
                    Text(amenity.name),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _DetailItem extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;

  const _DetailItem({
    required this.icon,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: AppTheme.primaryCyan, size: 28),
        const SizedBox(height: 8),
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey,
              ),
        ),
      ],
    );
  }
}
