import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../data/models/cleaner_model.dart';

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

class CleanersNotifier extends StateNotifier<CleanersState> {
  final ApiClient _apiClient;

  CleanersNotifier(this._apiClient) : super(const CleanersState());

  Future<void> loadCleaners() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _apiClient.get('/admin/cleaners');
      final cleaners = (response as List)
          .map((e) => CleanerModel.fromJson(e as Map<String, dynamic>))
          .toList();
      state = state.copyWith(cleaners: cleaners, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> assignCleanerToProperty(String propertyId, String cleanerId) async {
    try {
      await _apiClient.post('/admin/properties/$propertyId/cleaners/$cleanerId', {});
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<void> removeCleanerFromProperty(String propertyId, String cleanerId) async {
    try {
      await _apiClient.delete('/admin/properties/$propertyId/cleaners/$cleanerId');
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }
}

final cleanersProvider = StateNotifierProvider<CleanersNotifier, CleanersState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return CleanersNotifier(apiClient);
});
