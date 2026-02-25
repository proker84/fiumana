import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/config/app_config.dart';
import '../../core/config/app_theme.dart';
import '../common/widgets.dart';

class GuestCheckinScreen extends ConsumerWidget {
  const GuestCheckinScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // In production, this would come from the booking data
    const bookingId = 'current-booking-id';
    final checkInUrl = '${AppConfig.apiBaseUrl.replaceAll('/api', '')}/checkin/$bookingId';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Check-in'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header illustration
            Expanded(
              flex: 2,
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 120,
                      height: 120,
                      decoration: BoxDecoration(
                        color: AppTheme.primaryCyan.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.how_to_reg,
                        size: 60,
                        color: AppTheme.primaryCyan,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Check-in Online',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Completa il check-in prima del tuo arrivo\nper un ingresso rapido e senza attese',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.color
                                ?.withValues(alpha: 0.7),
                          ),
                    ),
                  ],
                ),
              ),
            ),

            // Steps
            Expanded(
              flex: 3,
              child: Column(
                children: [
                  _CheckinStep(
                    number: 1,
                    title: 'Dati personali',
                    description: 'Inserisci i dati di tutti gli ospiti',
                    icon: Icons.person,
                  ),
                  _CheckinStep(
                    number: 2,
                    title: 'Documento',
                    description: 'Carica un documento di identità valido',
                    icon: Icons.badge,
                  ),
                  _CheckinStep(
                    number: 3,
                    title: 'Conferma',
                    description: 'Accetta i termini e conferma',
                    icon: Icons.check_circle,
                  ),
                ],
              ),
            ),

            // Privacy notice
            GlassCard(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  const Icon(Icons.security, color: Colors.green, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'I tuoi dati sono al sicuro. Utilizziamo crittografia end-to-end e rispettiamo il GDPR.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ),

            // Main CTA
            LargeActionButton(
              icon: Icons.open_in_browser,
              label: 'Inizia Check-in',
              onPressed: () => _openCheckinWebApp(context, checkInUrl),
            ),

            const SizedBox(height: 12),

            // Secondary info
            TextButton(
              onPressed: () => _showInfoDialog(context),
              child: const Text('Perché devo fare il check-in online?'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openCheckinWebApp(BuildContext context, String url) async {
    final uri = Uri.parse(url);

    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Impossibile aprire il link del check-in'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  void _showInfoDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Check-in Online'),
        content: const SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Il check-in online ci permette di:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 12),
              _InfoPoint(
                icon: Icons.speed,
                text: 'Velocizzare il tuo arrivo',
              ),
              _InfoPoint(
                icon: Icons.gavel,
                text: 'Rispettare gli obblighi di legge (Portale Alloggiati)',
              ),
              _InfoPoint(
                icon: Icons.security,
                text: 'Proteggere i tuoi dati con massima sicurezza',
              ),
              _InfoPoint(
                icon: Icons.contact_support,
                text: 'Prepararci meglio per il tuo soggiorno',
              ),
              SizedBox(height: 16),
              Text(
                'I tuoi dati personali e documenti vengono criptati e cancellati automaticamente dopo 30 giorni, come richiesto dalla normativa.',
                style: TextStyle(fontSize: 12),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Ho capito'),
          ),
        ],
      ),
    );
  }
}

class _CheckinStep extends StatelessWidget {
  final int number;
  final String title;
  final String description;
  final IconData icon;

  const _CheckinStep({
    required this.number,
    required this.title,
    required this.description,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.primaryCyan.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                '$number',
                style: const TextStyle(
                  color: AppTheme.primaryCyan,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
            ),
          ),
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
                  description,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Icon(
            icon,
            color: AppTheme.primaryCyan.withValues(alpha: 0.5),
          ),
        ],
      ),
    );
  }
}

class _InfoPoint extends StatelessWidget {
  final IconData icon;
  final String text;

  const _InfoPoint({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.primaryCyan),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}
