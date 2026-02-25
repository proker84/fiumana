import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/config/app_theme.dart';
import '../../data/models/cleaning_model.dart';
import '../common/widgets.dart';
import '../providers/cleanings_provider.dart';

class CleanerCleaningDetailScreen extends ConsumerStatefulWidget {
  final String cleaningId;

  const CleanerCleaningDetailScreen({super.key, required this.cleaningId});

  @override
  ConsumerState<CleanerCleaningDetailScreen> createState() =>
      _CleanerCleaningDetailScreenState();
}

class _CleanerCleaningDetailScreenState
    extends ConsumerState<CleanerCleaningDetailScreen> {
  bool _isUploading = false;

  @override
  void initState() {
    super.initState();
    _loadCleaning();
  }

  Future<void> _loadCleaning() async {
    await ref.read(cleaningsProvider.notifier).selectCleaning(widget.cleaningId);
  }

  Future<void> _startCleaning() async {
    final success = await ref
        .read(cleaningsProvider.notifier)
        .startCleaning(widget.cleaningId);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pulizia iniziata!'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  Future<void> _completeCleaning() async {
    final cleaning = ref.read(selectedCleaningProvider);
    if (cleaning != null && !cleaning.hasAfterPhotos) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Devi caricare almeno una foto "dopo" per completare'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Conferma completamento'),
        content: const Text('Sei sicuro di voler completare questa pulizia?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annulla'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Conferma'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await ref
          .read(cleaningsProvider.notifier)
          .completeCleaning(widget.cleaningId);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Pulizia completata!'),
            backgroundColor: Colors.green,
          ),
        );
        context.go('/cleaner');
      }
    }
  }

  Future<void> _takePhoto(PhotoType type) async {
    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1920,
      maxHeight: 1080,
      imageQuality: 85,
    );

    if (image != null) {
      setState(() => _isUploading = true);
      final success = await ref.read(cleaningsProvider.notifier).uploadPhoto(
            widget.cleaningId,
            image.path,
            type,
            null,
          );
      setState(() => _isUploading = false);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success ? 'Foto caricata!' : 'Errore nel caricamento'),
            backgroundColor: success ? Colors.green : Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cleaning = ref.watch(selectedCleaningProvider);
    final isLoading = ref.watch(cleaningsProvider).isLoading;

    if (isLoading && cleaning == null) {
      return const Scaffold(
        body: LoadingIndicator(message: 'Caricamento...'),
      );
    }

    if (cleaning == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Pulizia')),
        body: const ErrorDisplay(message: 'Pulizia non trovata'),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(cleaning.property?.title ?? 'Pulizia'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/cleaner'),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Property info card
            _buildPropertyCard(cleaning),
            const SizedBox(height: 24),

            // Status and actions
            _buildStatusSection(cleaning),
            const SizedBox(height: 24),

            // Photos section
            _buildPhotosSection(cleaning),
            const SizedBox(height: 24),

            // Checklist section
            if (cleaning.checklist.isNotEmpty) ...[
              _buildChecklistSection(cleaning),
              const SizedBox(height: 24),
            ],

            // Main action button
            _buildMainActionButton(cleaning),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildPropertyCard(CleaningModel cleaning) {
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
                child: const Icon(
                  Icons.home,
                  color: AppTheme.primaryCyan,
                  size: 40,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      cleaning.property?.title ?? 'Proprietà',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.location_on, size: 16),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            cleaning.property?.location?.fullAddress ?? '-',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (cleaning.notes != null && cleaning.notes!.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),
            Text(
              'Note:',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 4),
            Text(
              cleaning.notes!,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatusSection(CleaningModel cleaning) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Stato'),
        GlassCard(
          margin: EdgeInsets.zero,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _StatusStep(
                icon: Icons.schedule,
                label: 'In attesa',
                isActive: cleaning.status == CleaningStatus.pending,
                isCompleted: cleaning.status != CleaningStatus.pending,
              ),
              _StatusStep(
                icon: Icons.play_arrow,
                label: 'In corso',
                isActive: cleaning.status == CleaningStatus.inProgress,
                isCompleted: cleaning.status == CleaningStatus.completed,
              ),
              _StatusStep(
                icon: Icons.check,
                label: 'Completata',
                isActive: cleaning.status == CleaningStatus.completed,
                isCompleted: false,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPhotosSection(CleaningModel cleaning) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Foto'),

        // Before photos
        GlassCard(
          margin: const EdgeInsets.only(bottom: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Prima',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  if (cleaning.status == CleaningStatus.inProgress)
                    IconButton(
                      icon: const Icon(Icons.add_a_photo),
                      onPressed: _isUploading ? null : () => _takePhoto(PhotoType.before),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              if (cleaning.beforePhotos.isEmpty)
                Text(
                  'Nessuna foto',
                  style: Theme.of(context).textTheme.bodySmall,
                )
              else
                SizedBox(
                  height: 100,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: cleaning.beforePhotos.length,
                    itemBuilder: (context, index) {
                      final photo = cleaning.beforePhotos[index];
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: AppNetworkImage(
                          url: photo.url,
                          width: 100,
                          height: 100,
                          borderRadius: BorderRadius.circular(8),
                        ),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),

        // After photos
        GlassCard(
          margin: EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Dopo',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  if (cleaning.status == CleaningStatus.inProgress)
                    IconButton(
                      icon: const Icon(Icons.add_a_photo),
                      onPressed: _isUploading ? null : () => _takePhoto(PhotoType.after),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              if (cleaning.afterPhotos.isEmpty)
                Text(
                  'Nessuna foto',
                  style: Theme.of(context).textTheme.bodySmall,
                )
              else
                SizedBox(
                  height: 100,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: cleaning.afterPhotos.length,
                    itemBuilder: (context, index) {
                      final photo = cleaning.afterPhotos[index];
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: AppNetworkImage(
                          url: photo.url,
                          width: 100,
                          height: 100,
                          borderRadius: BorderRadius.circular(8),
                        ),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),

        if (_isUploading)
          const Padding(
            padding: EdgeInsets.only(top: 16),
            child: Center(child: CircularProgressIndicator()),
          ),
      ],
    );
  }

  Widget _buildChecklistSection(CleaningModel cleaning) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Checklist'),
        GlassCard(
          margin: EdgeInsets.zero,
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            children: cleaning.checklist.map((item) {
              return CheckboxListTile(
                value: item.completed,
                onChanged: cleaning.status == CleaningStatus.inProgress
                    ? (value) {
                        // TODO: Update checklist item
                      }
                    : null,
                title: Text(item.task),
                subtitle: item.room != null ? Text(item.room!) : null,
                controlAffinity: ListTileControlAffinity.leading,
                activeColor: AppTheme.primaryCyan,
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildMainActionButton(CleaningModel cleaning) {
    switch (cleaning.status) {
      case CleaningStatus.pending:
        return LargeActionButton(
          icon: Icons.play_arrow,
          label: 'Inizia pulizia',
          onPressed: _startCleaning,
          color: Colors.orange,
        );
      case CleaningStatus.inProgress:
        return LargeActionButton(
          icon: Icons.check,
          label: 'Completa pulizia',
          onPressed: _completeCleaning,
          color: Colors.green,
        );
      case CleaningStatus.completed:
        return LargeActionButton(
          icon: Icons.arrow_back,
          label: 'Torna al calendario',
          onPressed: () => context.go('/cleaner'),
          color: AppTheme.primaryCyan,
        );
      default:
        return const SizedBox.shrink();
    }
  }
}

class _StatusStep extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final bool isCompleted;

  const _StatusStep({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.isCompleted,
  });

  @override
  Widget build(BuildContext context) {
    Color color;
    if (isActive) {
      color = AppTheme.primaryCyan;
    } else if (isCompleted) {
      color = Colors.green;
    } else {
      color = Colors.grey;
    }

    return Column(
      children: [
        Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.2),
            shape: BoxShape.circle,
            border: isActive ? Border.all(color: color, width: 2) : null,
          ),
          child: Icon(
            isCompleted ? Icons.check : icon,
            color: color,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: color,
                fontWeight: isActive ? FontWeight.bold : null,
              ),
        ),
      ],
    );
  }
}
