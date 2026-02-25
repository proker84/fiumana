import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/config/app_theme.dart';
import '../providers/auth_provider.dart';

class AirbnbImportScreen extends ConsumerStatefulWidget {
  const AirbnbImportScreen({super.key});

  @override
  ConsumerState<AirbnbImportScreen> createState() => _AirbnbImportScreenState();
}

class _AirbnbImportScreenState extends ConsumerState<AirbnbImportScreen> {
  final _urlController = TextEditingController();
  bool _isLoading = false;
  bool _isImporting = false;
  Map<String, dynamic>? _preview;
  String? _error;

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _pasteFromClipboard() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    if (data?.text != null && data!.text!.contains('airbnb')) {
      _urlController.text = data.text!;
      _loadPreview();
    }
  }

  Future<void> _loadPreview() async {
    if (_urlController.text.isEmpty) return;

    setState(() {
      _isLoading = true;
      _error = null;
      _preview = null;
    });

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.previewAirbnbListing(_urlController.text);
      setState(() {
        _preview = response.data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Impossibile caricare i dati: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  Future<void> _importProperty() async {
    setState(() {
      _isImporting = true;
      _error = null;
    });

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.importFromAirbnb(_urlController.text);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Immobile importato con successo!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop(response.data);
      }
    } catch (e) {
      setState(() {
        _error = 'Errore durante l\'importazione: ${e.toString()}';
        _isImporting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Importa da Airbnb'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // URL Input Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Link Airbnb',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Inserisci il link dell\'annuncio Airbnb da importare',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey,
                          ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _urlController,
                      decoration: InputDecoration(
                        hintText: 'https://www.airbnb.it/rooms/...',
                        prefixIcon: const Icon(Icons.link),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.paste),
                          onPressed: _pasteFromClipboard,
                          tooltip: 'Incolla',
                        ),
                      ),
                      keyboardType: TextInputType.url,
                      onSubmitted: (_) => _loadPreview(),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _isLoading ? null : _loadPreview,
                        icon: _isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.search),
                        label: Text(_isLoading ? 'Caricamento...' : 'Carica Anteprima'),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: 16),
              Card(
                color: Colors.red.shade900,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      const Icon(Icons.error, color: Colors.white),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            if (_preview != null) ...[
              const SizedBox(height: 24),
              // Preview Card
              Card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Photos
                    if (_preview!['photos'] != null &&
                        (_preview!['photos'] as List).isNotEmpty)
                      SizedBox(
                        height: 200,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: (_preview!['photos'] as List).length,
                          itemBuilder: (context, index) {
                            return Padding(
                              padding: EdgeInsets.only(
                                left: index == 0 ? 0 : 8,
                              ),
                              child: ClipRRect(
                                borderRadius: index == 0
                                    ? const BorderRadius.only(
                                        topLeft: Radius.circular(12),
                                      )
                                    : BorderRadius.zero,
                                child: Image.network(
                                  _preview!['photos'][index],
                                  width: 300,
                                  height: 200,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    width: 300,
                                    height: 200,
                                    color: Colors.grey.shade800,
                                    child: const Icon(Icons.image_not_supported),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),

                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _preview!['title'] ?? 'Senza titolo',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          const SizedBox(height: 8),

                          // Location
                          if (_preview!['location'] != null)
                            Row(
                              children: [
                                const Icon(Icons.location_on,
                                    size: 16, color: AppTheme.primaryCyan),
                                const SizedBox(width: 4),
                                Text(
                                  '${_preview!['location']['city']}, ${_preview!['location']['province']}',
                                  style: TextStyle(color: Colors.grey.shade400),
                                ),
                              ],
                            ),
                          const SizedBox(height: 16),

                          // Details
                          Wrap(
                            spacing: 16,
                            runSpacing: 8,
                            children: [
                              if (_preview!['bedrooms'] != null)
                                _buildDetailChip(
                                  Icons.bed,
                                  '${_preview!['bedrooms']} camere',
                                ),
                              if (_preview!['bathrooms'] != null)
                                _buildDetailChip(
                                  Icons.bathroom,
                                  '${_preview!['bathrooms']} bagni',
                                ),
                              if (_preview!['sleeps'] != null)
                                _buildDetailChip(
                                  Icons.person,
                                  '${_preview!['sleeps']} ospiti',
                                ),
                            ],
                          ),

                          if (_preview!['cin'] != null) ...[
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryCyan.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'CIN: ${_preview!['cin']}',
                                style: const TextStyle(
                                  color: AppTheme.primaryCyan,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],

                          const SizedBox(height: 16),
                          Text(
                            _preview!['description'] ?? '',
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: Colors.grey.shade400),
                          ),

                          // Amenities
                          if (_preview!['amenities'] != null &&
                              (_preview!['amenities'] as List).isNotEmpty) ...[
                            const SizedBox(height: 16),
                            Text(
                              'Servizi',
                              style: Theme.of(context).textTheme.titleSmall,
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: (_preview!['amenities'] as List)
                                  .map((a) => Chip(
                                        label: Text(a),
                                        backgroundColor: Colors.grey.shade800,
                                      ))
                                  .toList(),
                            ),
                          ],

                          const SizedBox(height: 24),

                          // Import summary
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade900,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.info_outline,
                                    color: AppTheme.primaryCyan),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    'Verranno importate ${(_preview!['photos'] as List?)?.length ?? 0} foto',
                                    style: TextStyle(color: Colors.grey.shade400),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 16),

                          // Import button
                          SizedBox(
                            width: double.infinity,
                            height: 56,
                            child: ElevatedButton.icon(
                              onPressed: _isImporting ? null : _importProperty,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryCyan,
                                foregroundColor: Colors.black,
                              ),
                              icon: _isImporting
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.black,
                                      ),
                                    )
                                  : const Icon(Icons.download),
                              label: Text(
                                _isImporting
                                    ? 'Importazione in corso...'
                                    : 'Importa Immobile',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDetailChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey.shade800,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppTheme.primaryCyan),
          const SizedBox(width: 6),
          Text(label),
        ],
      ),
    );
  }
}
