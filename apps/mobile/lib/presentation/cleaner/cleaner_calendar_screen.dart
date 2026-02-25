import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../core/config/app_theme.dart';
import '../../data/models/cleaning_model.dart';
import '../common/widgets.dart';
import '../providers/cleanings_provider.dart';

class CleanerCalendarScreen extends ConsumerStatefulWidget {
  const CleanerCalendarScreen({super.key});

  @override
  ConsumerState<CleanerCalendarScreen> createState() => _CleanerCalendarScreenState();
}

class _CleanerCalendarScreenState extends ConsumerState<CleanerCalendarScreen> {
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  @override
  void initState() {
    super.initState();
    _selectedDay = DateTime.now();
    _loadCleanings();
  }

  Future<void> _loadCleanings() async {
    await ref.read(cleaningsProvider.notifier).loadMyCleanings();
  }

  @override
  Widget build(BuildContext context) {
    final cleaningsState = ref.watch(cleaningsProvider);
    final selectedDayCleanings = _selectedDay != null
        ? cleaningsState.getCleaningsForDate(_selectedDay!)
        : <CleaningModel>[];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Le mie pulizie'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadCleanings,
          ),
        ],
      ),
      body: Column(
        children: [
          // Calendar
          _buildCalendar(cleaningsState),

          const Divider(height: 1),

          // Selected day cleanings
          Expanded(
            child: _buildCleaningsList(selectedDayCleanings, cleaningsState.isLoading),
          ),
        ],
      ),
    );
  }

  Widget _buildCalendar(CleaningsState state) {
    return TableCalendar<CleaningModel>(
      firstDay: DateTime.now().subtract(const Duration(days: 365)),
      lastDay: DateTime.now().add(const Duration(days: 365)),
      focusedDay: _focusedDay,
      selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
      calendarFormat: _calendarFormat,
      startingDayOfWeek: StartingDayOfWeek.monday,
      locale: 'it_IT',
      eventLoader: (day) => state.getCleaningsForDate(day),
      calendarStyle: CalendarStyle(
        outsideDaysVisible: false,
        todayDecoration: BoxDecoration(
          color: AppTheme.primaryCyan.withValues(alpha: 0.3),
          shape: BoxShape.circle,
        ),
        selectedDecoration: const BoxDecoration(
          color: AppTheme.primaryCyan,
          shape: BoxShape.circle,
        ),
        markerDecoration: const BoxDecoration(
          color: Colors.orange,
          shape: BoxShape.circle,
        ),
        markersMaxCount: 3,
        markerSize: 6,
        markerMargin: const EdgeInsets.symmetric(horizontal: 1),
      ),
      headerStyle: HeaderStyle(
        formatButtonVisible: true,
        titleCentered: true,
        formatButtonDecoration: BoxDecoration(
          border: Border.all(color: AppTheme.primaryCyan),
          borderRadius: BorderRadius.circular(8),
        ),
        formatButtonTextStyle: const TextStyle(color: AppTheme.primaryCyan),
      ),
      onDaySelected: (selectedDay, focusedDay) {
        setState(() {
          _selectedDay = selectedDay;
          _focusedDay = focusedDay;
        });
      },
      onFormatChanged: (format) {
        setState(() => _calendarFormat = format);
      },
      onPageChanged: (focusedDay) {
        _focusedDay = focusedDay;
      },
    );
  }

  Widget _buildCleaningsList(List<CleaningModel> cleanings, bool isLoading) {
    if (isLoading) {
      return const LoadingIndicator(message: 'Caricamento pulizie...');
    }

    if (cleanings.isEmpty) {
      return EmptyState(
        icon: Icons.event_available,
        title: 'Nessuna pulizia',
        subtitle: _selectedDay != null
            ? 'Non hai pulizie programmate per questo giorno'
            : 'Seleziona un giorno dal calendario',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: cleanings.length,
      itemBuilder: (context, index) {
        final cleaning = cleanings[index];
        return _CleaningCard(
          cleaning: cleaning,
          onTap: () => context.go('/cleaner/cleaning/${cleaning.id}'),
        );
      },
    );
  }
}

class _CleaningCard extends StatelessWidget {
  final CleaningModel cleaning;
  final VoidCallback onTap;

  const _CleaningCard({
    required this.cleaning,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Property image placeholder
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: AppTheme.primaryCyan.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.home,
                  color: AppTheme.primaryCyan,
                  size: 30,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      cleaning.property?.title ?? 'Proprietà',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          Icons.location_on,
                          size: 14,
                          color: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.color
                              ?.withValues(alpha: 0.7),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            cleaning.property?.location?.fullAddress ?? 'Indirizzo',
                            style: Theme.of(context).textTheme.bodySmall,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              _buildStatusBadge(cleaning.status),
            ],
          ),
          const SizedBox(height: 16),

          // Action buttons based on status
          _buildActionButton(context, cleaning),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(CleaningStatus status) {
    Color color;
    String text;
    IconData icon;

    switch (status) {
      case CleaningStatus.pending:
        color = Colors.orange;
        text = 'In attesa';
        icon = Icons.schedule;
        break;
      case CleaningStatus.inProgress:
        color = Colors.blue;
        text = 'In corso';
        icon = Icons.play_arrow;
        break;
      case CleaningStatus.completed:
        color = Colors.green;
        text = 'Completata';
        icon = Icons.check;
        break;
      case CleaningStatus.cancelled:
        color = Colors.grey;
        text = 'Annullata';
        icon = Icons.close;
        break;
    }

    return StatusBadge(text: text, color: color, icon: icon);
  }

  Widget _buildActionButton(BuildContext context, CleaningModel cleaning) {
    switch (cleaning.status) {
      case CleaningStatus.pending:
        return LargeActionButton(
          icon: Icons.play_arrow,
          label: 'Inizia pulizia',
          onPressed: onTap,
          color: Colors.orange,
        );
      case CleaningStatus.inProgress:
        return LargeActionButton(
          icon: Icons.camera_alt,
          label: 'Continua pulizia',
          onPressed: onTap,
          color: Colors.blue,
        );
      case CleaningStatus.completed:
        return LargeActionButton(
          icon: Icons.visibility,
          label: 'Vedi dettagli',
          onPressed: onTap,
          color: Colors.green,
        );
      default:
        return const SizedBox.shrink();
    }
  }
}
