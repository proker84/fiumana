import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/config/app_theme.dart';

enum LegalDocumentType {
  privacyPolicy,
  termsOfService,
}

class LegalScreen extends StatefulWidget {
  final LegalDocumentType documentType;

  const LegalScreen({
    super.key,
    required this.documentType,
  });

  @override
  State<LegalScreen> createState() => _LegalScreenState();
}

class _LegalScreenState extends State<LegalScreen> {
  String _content = '';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDocument();
  }

  Future<void> _loadDocument() async {
    final assetPath = widget.documentType == LegalDocumentType.privacyPolicy
        ? 'assets/legal/privacy_policy.md'
        : 'assets/legal/terms_of_service.md';

    try {
      final content = await rootBundle.loadString(assetPath);
      setState(() {
        _content = content;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _content = 'Errore nel caricamento del documento.';
        _isLoading = false;
      });
    }
  }

  String get _title {
    return widget.documentType == LegalDocumentType.privacyPolicy
        ? 'Privacy Policy'
        : 'Termini e Condizioni';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_title),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                color: AppTheme.primaryCyan,
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: MarkdownText(content: _content),
            ),
    );
  }
}

class MarkdownText extends StatelessWidget {
  final String content;

  const MarkdownText({super.key, required this.content});

  @override
  Widget build(BuildContext context) {
    final lines = content.split('\n');
    final widgets = <Widget>[];

    for (final line in lines) {
      if (line.startsWith('# ')) {
        // H1
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 24, bottom: 8),
            child: Text(
              line.substring(2),
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryCyan,
                  ),
            ),
          ),
        );
      } else if (line.startsWith('## ')) {
        // H2
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 20, bottom: 8),
            child: Text(
              line.substring(3),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ),
        );
      } else if (line.startsWith('### ')) {
        // H3
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 16, bottom: 4),
            child: Text(
              line.substring(4),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
        );
      } else if (line.startsWith('- ') || line.startsWith('• ')) {
        // Bullet point
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(left: 16, top: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '• ',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.primaryCyan,
                      ),
                ),
                Expanded(
                  child: Text(
                    line.substring(2),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
          ),
        );
      } else if (line.startsWith('|')) {
        // Table row - simplified rendering
        final cells = line
            .split('|')
            .where((c) => c.trim().isNotEmpty)
            .map((c) => c.trim())
            .toList();
        if (!line.contains('---')) {
          widgets.add(
            Container(
              padding: const EdgeInsets.symmetric(vertical: 4),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: Theme.of(context).dividerColor,
                    width: 0.5,
                  ),
                ),
              ),
              child: Row(
                children: cells
                    .map(
                      (cell) => Expanded(
                        child: Text(
                          cell,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          );
        }
      } else if (line.startsWith('**') && line.endsWith('**')) {
        // Bold text
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              line.replaceAll('**', ''),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ),
        );
      } else if (line.startsWith('*') && line.endsWith('*')) {
        // Italic text
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              line.replaceAll('*', ''),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontStyle: FontStyle.italic,
                  ),
            ),
          ),
        );
      } else if (line.startsWith('---')) {
        // Horizontal rule
        widgets.add(
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Divider(
              color: Theme.of(context).dividerColor,
            ),
          ),
        );
      } else if (line.trim().isEmpty) {
        // Empty line
        widgets.add(const SizedBox(height: 8));
      } else {
        // Regular paragraph
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              line,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        );
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: widgets,
    );
  }
}
