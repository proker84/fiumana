import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/config/app_theme.dart';
import '../../data/models/user_model.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import 'widgets.dart';
import 'legal_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final isDarkMode = ref.watch(isDarkModeProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profilo'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Avatar and name
            _buildProfileHeader(context, user),
            const SizedBox(height: 24),

            // Settings
            _buildSettingsSection(context, ref, isDarkMode),
            const SizedBox(height: 24),

            // Info
            _buildInfoSection(context),
            const SizedBox(height: 24),

            // Logout button
            _buildLogoutButton(context, ref),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader(BuildContext context, UserModel? user) {
    return GlassCard(
      margin: EdgeInsets.zero,
      child: Column(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppTheme.primaryCyan.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                _getInitials(user?.name ?? 'U'),
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: AppTheme.primaryCyan,
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            user?.name ?? 'Utente',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 4),
          Text(
            user?.email ?? '',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.color
                      ?.withValues(alpha: 0.7),
                ),
          ),
          const SizedBox(height: 8),
          StatusBadge(
            text: _getRoleDisplayName(user?.role),
            color: _getRoleColor(user?.role),
            icon: _getRoleIcon(user?.role),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsSection(BuildContext context, WidgetRef ref, bool isDarkMode) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Impostazioni'),
        GlassCard(
          margin: EdgeInsets.zero,
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              ListTile(
                leading: Icon(
                  isDarkMode ? Icons.dark_mode : Icons.light_mode,
                  color: AppTheme.primaryCyan,
                ),
                title: const Text('Tema scuro'),
                trailing: Switch(
                  value: isDarkMode,
                  onChanged: (_) {
                    ref.read(themeProvider.notifier).toggleTheme();
                  },
                  activeColor: AppTheme.primaryCyan,
                ),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.notifications_outlined),
                title: const Text('Notifiche'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  // TODO: Navigate to notifications settings
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.language),
                title: const Text('Lingua'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Italiano',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.chevron_right),
                  ],
                ),
                onTap: () {
                  // TODO: Navigate to language settings
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInfoSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Informazioni'),
        GlassCard(
          margin: EdgeInsets.zero,
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.info_outline),
                title: const Text('Versione app'),
                trailing: Text(
                  '1.0.0',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.description_outlined),
                title: const Text('Privacy Policy'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const LegalScreen(
                        documentType: LegalDocumentType.privacyPolicy,
                      ),
                    ),
                  );
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.article_outlined),
                title: const Text('Termini di servizio'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const LegalScreen(
                        documentType: LegalDocumentType.termsOfService,
                      ),
                    ),
                  );
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.help_outline),
                title: const Text('Supporto'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () async {
                  final uri = Uri.parse('mailto:support@fiumanaimmobiliare.it');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri);
                  }
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLogoutButton(BuildContext context, WidgetRef ref) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () => _handleLogout(context, ref),
        icon: const Icon(Icons.logout, color: Colors.redAccent),
        label: const Text(
          'Esci',
          style: TextStyle(color: Colors.redAccent),
        ),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Colors.redAccent),
          padding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }

  Future<void> _handleLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Conferma logout'),
        content: const Text('Sei sicuro di voler uscire?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annulla'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
            ),
            child: const Text('Esci'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(authProvider.notifier).logout();
    }
  }

  String _getInitials(String name) {
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.substring(0, name.length >= 2 ? 2 : 1).toUpperCase();
  }

  String _getRoleDisplayName(UserRole? role) {
    switch (role) {
      case UserRole.admin:
        return 'Amministratore';
      case UserRole.cleaner:
        return 'Personale Pulizie';
      case UserRole.guest:
        return 'Ospite';
      default:
        return 'Utente';
    }
  }

  Color _getRoleColor(UserRole? role) {
    switch (role) {
      case UserRole.admin:
        return AppTheme.primaryCyan;
      case UserRole.cleaner:
        return Colors.orange;
      case UserRole.guest:
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  IconData _getRoleIcon(UserRole? role) {
    switch (role) {
      case UserRole.admin:
        return Icons.admin_panel_settings;
      case UserRole.cleaner:
        return Icons.cleaning_services;
      case UserRole.guest:
        return Icons.person;
      default:
        return Icons.person;
    }
  }
}
