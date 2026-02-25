import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/property_model.dart';
import 'auth_provider.dart';

class PropertiesState {
  final List<PropertyModel> properties;
  final bool isLoading;
  final String? error;
  final PropertyModel? selectedProperty;

  const PropertiesState({
    this.properties = const [],
    this.isLoading = false,
    this.error,
    this.selectedProperty,
  });

  PropertiesState copyWith({
    List<PropertyModel>? properties,
    bool? isLoading,
    String? error,
    PropertyModel? selectedProperty,
  }) {
    return PropertiesState(
      properties: properties ?? this.properties,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      selectedProperty: selectedProperty ?? this.selectedProperty,
    );
  }

  List<PropertyModel> get vacationProperties =>
      properties.where((p) => p.type == PropertyType.vacation).toList();

  List<PropertyModel> get featuredProperties =>
      properties.where((p) => p.isFeatured).toList();
}

class PropertiesNotifier extends Notifier<PropertiesState> {
  @override
  PropertiesState build() {
    return const PropertiesState();
  }

  Future<void> loadProperties({Map<String, dynamic>? filters}) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.getProperties(filters: filters);
      final properties = (response.data['items'] as List)
          .map((e) => PropertyModel.fromJson(e as Map<String, dynamic>))
          .toList();

      state = state.copyWith(properties: properties, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Errore nel caricamento delle proprietà',
      );
    }
  }

  Future<void> selectProperty(String id) async {
    state = state.copyWith(isLoading: true);

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.getProperty(id);
      final property = PropertyModel.fromJson(response.data as Map<String, dynamic>);

      state = state.copyWith(selectedProperty: property, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Errore nel caricamento della proprietà',
      );
    }
  }

  void clearSelection() {
    state = state.copyWith(selectedProperty: null);
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

final propertiesProvider = NotifierProvider<PropertiesNotifier, PropertiesState>(
  PropertiesNotifier.new,
);

final selectedPropertyProvider = Provider<PropertyModel?>((ref) {
  return ref.watch(propertiesProvider).selectedProperty;
});

final vacationPropertiesProvider = Provider<List<PropertyModel>>((ref) {
  return ref.watch(propertiesProvider).vacationProperties;
});
