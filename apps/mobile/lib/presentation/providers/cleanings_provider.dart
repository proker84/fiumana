import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/cleaning_model.dart';
import 'auth_provider.dart';

class CleaningsState {
  final List<CleaningModel> cleanings;
  final bool isLoading;
  final String? error;
  final CleaningModel? selectedCleaning;

  const CleaningsState({
    this.cleanings = const [],
    this.isLoading = false,
    this.error,
    this.selectedCleaning,
  });

  CleaningsState copyWith({
    List<CleaningModel>? cleanings,
    bool? isLoading,
    String? error,
    CleaningModel? selectedCleaning,
  }) {
    return CleaningsState(
      cleanings: cleanings ?? this.cleanings,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      selectedCleaning: selectedCleaning ?? this.selectedCleaning,
    );
  }

  List<CleaningModel> get pendingCleanings =>
      cleanings.where((c) => c.status == CleaningStatus.pending).toList();

  List<CleaningModel> get inProgressCleanings =>
      cleanings.where((c) => c.status == CleaningStatus.inProgress).toList();

  List<CleaningModel> get completedCleanings =>
      cleanings.where((c) => c.status == CleaningStatus.completed).toList();

  List<CleaningModel> getCleaningsForDate(DateTime date) {
    return cleanings.where((c) {
      return c.scheduledDate.year == date.year &&
          c.scheduledDate.month == date.month &&
          c.scheduledDate.day == date.day;
    }).toList();
  }

  Map<DateTime, List<CleaningModel>> get cleaningsByDate {
    final map = <DateTime, List<CleaningModel>>{};
    for (final cleaning in cleanings) {
      final date = DateTime(
        cleaning.scheduledDate.year,
        cleaning.scheduledDate.month,
        cleaning.scheduledDate.day,
      );
      map.putIfAbsent(date, () => []).add(cleaning);
    }
    return map;
  }
}

class CleaningsNotifier extends Notifier<CleaningsState> {
  @override
  CleaningsState build() {
    return const CleaningsState();
  }

  Future<void> loadCleanings({String? propertyId, String? cleanerId}) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final apiClient = ref.read(apiClientProvider);
      final filters = <String, dynamic>{};
      if (propertyId != null) filters['propertyId'] = propertyId;
      if (cleanerId != null) filters['cleanerId'] = cleanerId;

      final response = await apiClient.getCleanings(filters: filters);
      final cleanings = (response.data['items'] as List)
          .map((e) => CleaningModel.fromJson(e as Map<String, dynamic>))
          .toList();

      state = state.copyWith(cleanings: cleanings, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Errore nel caricamento delle pulizie',
      );
    }
  }

  Future<void> loadMyCleanings() async {
    final user = ref.read(currentUserProvider);
    if (user != null) {
      await loadCleanings(cleanerId: user.id);
    }
  }

  Future<void> selectCleaning(String id) async {
    state = state.copyWith(isLoading: true);

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.getCleaning(id);
      final cleaning = CleaningModel.fromJson(response.data as Map<String, dynamic>);

      state = state.copyWith(selectedCleaning: cleaning, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Errore nel caricamento della pulizia',
      );
    }
  }

  Future<bool> updateStatus(String id, CleaningStatus newStatus) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      final statusStr = newStatus.name.toUpperCase().replaceAll('INPROGRESS', 'IN_PROGRESS');
      await apiClient.updateCleaningStatus(id, statusStr);

      // Update local state
      final updatedCleanings = state.cleanings.map((c) {
        if (c.id == id) {
          return c.copyWith(status: newStatus);
        }
        return c;
      }).toList();

      state = state.copyWith(cleanings: updatedCleanings);

      if (state.selectedCleaning?.id == id) {
        state = state.copyWith(
          selectedCleaning: state.selectedCleaning!.copyWith(status: newStatus),
        );
      }

      return true;
    } catch (e) {
      state = state.copyWith(error: 'Errore nell\'aggiornamento dello stato');
      return false;
    }
  }

  Future<bool> startCleaning(String id) async {
    return updateStatus(id, CleaningStatus.inProgress);
  }

  Future<bool> completeCleaning(String id) async {
    return updateStatus(id, CleaningStatus.completed);
  }

  Future<bool> uploadPhoto(
    String cleaningId,
    String filePath,
    PhotoType type,
    String? room,
  ) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      final typeStr = type == PhotoType.before ? 'BEFORE' : 'AFTER';
      await apiClient.uploadCleaningPhoto(cleaningId, filePath, typeStr, room);

      // Reload the cleaning to get updated photos
      await selectCleaning(cleaningId);
      return true;
    } catch (e) {
      state = state.copyWith(error: 'Errore nel caricamento della foto');
      return false;
    }
  }

  Future<bool> createCleaning(Map<String, dynamic> data) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      await apiClient.createCleaning(data);
      await loadCleanings();
      return true;
    } catch (e) {
      state = state.copyWith(error: 'Errore nella creazione della pulizia');
      return false;
    }
  }

  void clearSelection() {
    state = state.copyWith(selectedCleaning: null);
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

final cleaningsProvider = NotifierProvider<CleaningsNotifier, CleaningsState>(
  CleaningsNotifier.new,
);

// Convenience providers
final todayCleaningsProvider = Provider<List<CleaningModel>>((ref) {
  final state = ref.watch(cleaningsProvider);
  return state.getCleaningsForDate(DateTime.now());
});

final pendingCleaningsCountProvider = Provider<int>((ref) {
  return ref.watch(cleaningsProvider).pendingCleanings.length;
});

final selectedCleaningProvider = Provider<CleaningModel?>((ref) {
  return ref.watch(cleaningsProvider).selectedCleaning;
});
