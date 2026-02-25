import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/faq_model.dart';
import 'auth_provider.dart';

class FaqState {
  final List<FaqModel> faqs;
  final bool isLoading;
  final String? error;
  final FaqCategory? selectedCategory;

  const FaqState({
    this.faqs = const [],
    this.isLoading = false,
    this.error,
    this.selectedCategory,
  });

  FaqState copyWith({
    List<FaqModel>? faqs,
    bool? isLoading,
    String? error,
    FaqCategory? selectedCategory,
  }) {
    return FaqState(
      faqs: faqs ?? this.faqs,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      selectedCategory: selectedCategory,
    );
  }

  List<FaqModel> get activeFaqs => faqs.where((f) => f.isActive).toList();

  Map<FaqCategory, List<FaqModel>> get faqsByCategory {
    final map = <FaqCategory, List<FaqModel>>{};
    for (final faq in activeFaqs) {
      map.putIfAbsent(faq.category, () => []).add(faq);
    }
    return map;
  }

  List<FaqModel> get filteredFaqs {
    if (selectedCategory == null) return activeFaqs;
    return activeFaqs.where((f) => f.category == selectedCategory).toList();
  }

  List<FaqCategory> get availableCategories {
    return faqsByCategory.keys.toList()..sort((a, b) => a.index.compareTo(b.index));
  }
}

class FaqNotifier extends Notifier<FaqState> {
  @override
  FaqState build() {
    return const FaqState();
  }

  Future<void> loadFaqs({String? propertyId, String? category}) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.getFaqs(
        propertyId: propertyId,
        category: category,
      );
      final faqs = (response.data as List)
          .map((e) => FaqModel.fromJson(e))
          .toList();

      // Sort by sortOrder
      faqs.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));

      state = state.copyWith(faqs: faqs, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Errore nel caricamento delle FAQ',
      );
    }
  }

  void selectCategory(FaqCategory? category) {
    state = state.copyWith(selectedCategory: category);
  }

  void clearCategoryFilter() {
    state = FaqState(
      faqs: state.faqs,
      isLoading: state.isLoading,
      error: state.error,
      selectedCategory: null,
    );
  }

  Future<bool> createFaq(Map<String, dynamic> data) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      await apiClient.createFaq(data);
      await loadFaqs(propertyId: data['propertyId']);
      return true;
    } catch (e) {
      state = state.copyWith(error: 'Errore nella creazione della FAQ');
      return false;
    }
  }

  Future<bool> updateFaq(String id, Map<String, dynamic> data) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      await apiClient.updateFaq(id, data);
      await loadFaqs();
      return true;
    } catch (e) {
      state = state.copyWith(error: 'Errore nell\'aggiornamento della FAQ');
      return false;
    }
  }

  Future<bool> deleteFaq(String id) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      await apiClient.deleteFaq(id);

      // Remove from local state
      final updatedFaqs = state.faqs.where((f) => f.id != id).toList();
      state = state.copyWith(faqs: updatedFaqs);

      return true;
    } catch (e) {
      state = state.copyWith(error: 'Errore nell\'eliminazione della FAQ');
      return false;
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

final faqProvider = NotifierProvider<FaqNotifier, FaqState>(
  FaqNotifier.new,
);

final faqsByCategoryProvider = Provider<Map<FaqCategory, List<FaqModel>>>((ref) {
  return ref.watch(faqProvider).faqsByCategory;
});

final filteredFaqsProvider = Provider<List<FaqModel>>((ref) {
  return ref.watch(faqProvider).filteredFaqs;
});
