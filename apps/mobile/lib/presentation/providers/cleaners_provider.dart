import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/cleaner_model.dart';
import 'auth_provider.dart';

class CleanersState {
  final List<CleanerModel> cleaners;
  final bool isLoading;
  final String? error;

  const CleanersState({
    this.cleaners = const [],
    this.isLoading = false,
    this.error,
  });

  CleanersState copyWith({
    List<CleanerModel>? cleaners,
    bool? isLoading,
    String? error,
  }) {
    return CleanersState(
      cleaners: cleaners ?? this.cleaners,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class CleanersNotifier extends Notifier<CleanersState> {
  @override
  CleanersState build() {
    return const CleanersState();
  }

  Future<void> loadCleaners() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.getCleaners();
      final cleaners = (response.data as List)
          .map((e) => CleanerModel.fromJson(e as Map<String, dynamic>))
          .toList();
      state = state.copyWith(cleaners: cleaners, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> assignCleanerToProperty(String propertyId, String cleanerId) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      await apiClient.assignCleanerToProperty(propertyId, cleanerId);
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<void> removeCleanerFromProperty(String propertyId, String cleanerId) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      await apiClient.removeCleanerFromProperty(propertyId, cleanerId);
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }
}

final cleanersProvider = NotifierProvider<CleanersNotifier, CleanersState>(
  CleanersNotifier.new,
);
