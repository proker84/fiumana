import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';
import '../../core/config/app_theme.dart';
import '../../data/models/faq_model.dart';
import '../common/widgets.dart';
import '../providers/faq_provider.dart';

class GuestFaqScreen extends ConsumerStatefulWidget {
  const GuestFaqScreen({super.key});

  @override
  ConsumerState<GuestFaqScreen> createState() => _GuestFaqScreenState();
}

class _GuestFaqScreenState extends ConsumerState<GuestFaqScreen> {
  @override
  void initState() {
    super.initState();
    _loadFaqs();
  }

  Future<void> _loadFaqs() async {
    await ref.read(faqProvider.notifier).loadFaqs();
  }

  @override
  Widget build(BuildContext context) {
    final faqState = ref.watch(faqProvider);
    final faqsByCategory = ref.watch(faqsByCategoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('FAQ'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadFaqs,
          ),
        ],
      ),
      body: faqState.isLoading
          ? const LoadingIndicator(message: 'Caricamento FAQ...')
          : faqState.error != null
              ? ErrorDisplay(
                  message: faqState.error!,
                  onRetry: _loadFaqs,
                )
              : faqsByCategory.isEmpty
                  ? const EmptyState(
                      icon: Icons.help_outline,
                      title: 'Nessuna FAQ disponibile',
                      subtitle: 'Le FAQ saranno disponibili a breve',
                    )
                  : _buildFaqList(faqsByCategory),
    );
  }

  Widget _buildFaqList(Map<FaqCategory, List<FaqModel>> faqsByCategory) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: faqsByCategory.length,
      itemBuilder: (context, index) {
        final category = faqsByCategory.keys.elementAt(index);
        final faqs = faqsByCategory[category]!;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (index > 0) const SizedBox(height: 24),
            _buildCategoryHeader(category),
            const SizedBox(height: 12),
            ...faqs.map((faq) => _FaqCard(faq: faq)),
          ],
        );
      },
    );
  }

  Widget _buildCategoryHeader(FaqCategory category) {
    IconData icon;
    switch (category) {
      case FaqCategory.checkin:
        icon = Icons.login;
        break;
      case FaqCategory.checkout:
        icon = Icons.logout;
        break;
      case FaqCategory.wifi:
        icon = Icons.wifi;
        break;
      case FaqCategory.parking:
        icon = Icons.local_parking;
        break;
      case FaqCategory.amenities:
        icon = Icons.room_service;
        break;
      case FaqCategory.rules:
        icon = Icons.gavel;
        break;
      case FaqCategory.emergency:
        icon = Icons.emergency;
        break;
      case FaqCategory.other:
        icon = Icons.help_outline;
        break;
    }

    return Row(
      children: [
        Icon(icon, color: AppTheme.primaryCyan),
        const SizedBox(width: 8),
        Text(
          _getCategoryName(category),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
      ],
    );
  }

  String _getCategoryName(FaqCategory category) {
    switch (category) {
      case FaqCategory.checkin:
        return 'Check-in';
      case FaqCategory.checkout:
        return 'Check-out';
      case FaqCategory.wifi:
        return 'WiFi e Connessione';
      case FaqCategory.parking:
        return 'Parcheggio';
      case FaqCategory.amenities:
        return 'Servizi e Comfort';
      case FaqCategory.rules:
        return 'Regole della Casa';
      case FaqCategory.emergency:
        return 'Emergenze';
      case FaqCategory.other:
        return 'Altro';
    }
  }
}

class _FaqCard extends StatefulWidget {
  final FaqModel faq;

  const _FaqCard({required this.faq});

  @override
  State<_FaqCard> createState() => _FaqCardState();
}

class _FaqCardState extends State<_FaqCard> {
  bool _isExpanded = false;
  VideoPlayerController? _videoController;

  @override
  void dispose() {
    _videoController?.dispose();
    super.dispose();
  }

  void _initVideoIfNeeded() {
    if (widget.faq.hasVideo && _videoController == null) {
      _videoController = VideoPlayerController.networkUrl(
        Uri.parse(widget.faq.videoUrl!),
      )..initialize().then((_) {
          setState(() {});
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: EdgeInsets.zero,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          title: Text(
            widget.faq.question,
            style: Theme.of(context).textTheme.titleSmall,
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (widget.faq.hasMedia)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Icon(
                    widget.faq.hasVideo
                        ? Icons.play_circle
                        : widget.faq.hasAudio
                            ? Icons.audiotrack
                            : Icons.image,
                    size: 20,
                    color: AppTheme.primaryCyan,
                  ),
                ),
              Icon(
                _isExpanded ? Icons.expand_less : Icons.expand_more,
              ),
            ],
          ),
          onExpansionChanged: (expanded) {
            setState(() => _isExpanded = expanded);
            if (expanded) {
              _initVideoIfNeeded();
            }
          },
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.faq.answer,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  if (widget.faq.hasVideo) ...[
                    const SizedBox(height: 16),
                    _buildVideoPlayer(),
                  ],
                  if (widget.faq.hasImages) ...[
                    const SizedBox(height: 16),
                    _buildImageGallery(),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVideoPlayer() {
    if (_videoController == null || !_videoController!.value.isInitialized) {
      return Container(
        height: 200,
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: AspectRatio(
            aspectRatio: _videoController!.value.aspectRatio,
            child: VideoPlayer(_videoController!),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(
              icon: Icon(
                _videoController!.value.isPlaying
                    ? Icons.pause
                    : Icons.play_arrow,
              ),
              onPressed: () {
                setState(() {
                  _videoController!.value.isPlaying
                      ? _videoController!.pause()
                      : _videoController!.play();
                });
              },
            ),
            IconButton(
              icon: const Icon(Icons.replay),
              onPressed: () {
                _videoController!.seekTo(Duration.zero);
                _videoController!.play();
              },
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildImageGallery() {
    return SizedBox(
      height: 150,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: widget.faq.imageUrls.length,
        itemBuilder: (context, index) {
          final url = widget.faq.imageUrls[index];
          return Padding(
            padding: EdgeInsets.only(
              right: index < widget.faq.imageUrls.length - 1 ? 8 : 0,
            ),
            child: GestureDetector(
              onTap: () => _showImageFullScreen(url),
              child: AppNetworkImage(
                url: url,
                width: 200,
                height: 150,
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          );
        },
      ),
    );
  }

  void _showImageFullScreen(String url) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Stack(
          children: [
            Center(
              child: InteractiveViewer(
                child: AppNetworkImage(
                  url: url,
                  fit: BoxFit.contain,
                ),
              ),
            ),
            Positioned(
              top: 16,
              right: 16,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 32),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
