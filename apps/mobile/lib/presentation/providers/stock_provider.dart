import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/stock_model.dart';
import 'auth_provider.dart';

class StockState {
  final List<StockItemModel> items;
  final bool isLoading;
  final String? error;
  final List<StockItemModel> lowStockAlerts;

  const StockState({
    this.items = const [],
    this.isLoading = false,
    this.error,
    this.lowStockAlerts = const [],
  });

  StockState copyWith({
    List<StockItemModel>? items,
    bool? isLoading,
    String? error,
    List<StockItemModel>? lowStockAlerts,
  }) {
    return StockState(
      items: items ?? this.items,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lowStockAlerts: lowStockAlerts ?? this.lowStockAlerts,
    );
  }

  List<StockItemModel> get lowStockItems =>
      items.where((i) => i.isLowStock).toList();

  List<StockItemModel> get outOfStockItems =>
      items.where((i) => i.isOutOfStock).toList();

  Map<StockCategory, List<StockItemModel>> get itemsByCategory {
    final map = <StockCategory, List<StockItemModel>>{};
    for (final item in items) {
      map.putIfAbsent(item.category, () => []).add(item);
    }
    return map;
  }

  List<StockItemModel> getItemsForProperty(String propertyId) {
    return items.where((i) => i.propertyId == propertyId).toList();
  }
}

class StockNotifier extends Notifier<StockState> {
  @override
  StockState build() {
    return const StockState();
  }

  Future<void> loadStock({String? propertyId}) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.getStockItems(propertyId: propertyId);
      final items = (response.data as List)
          .map((e) => StockItemModel.fromJson(e as Map<String, dynamic>))
          .toList();

      state = state.copyWith(items: items, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Errore nel caricamento dello stock',
      );
    }
  }

  Future<void> loadLowStockAlerts() async {
    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.getLowStockAlerts();
      final alerts = (response.data as List)
          .map((e) => StockItemModel.fromJson(e as Map<String, dynamic>))
          .toList();

      state = state.copyWith(lowStockAlerts: alerts);
    } catch (e) {
      // Silently fail for alerts
    }
  }

  Future<bool> updateQuantity(String itemId, int change, String reason) async {
    try {
      final apiClient = ref.read(apiClientProvider);

      final currentItem = state.items.firstWhere((i) => i.id == itemId);
      final newQuantity = currentItem.quantity + change;

      await apiClient.updateStockQuantity(itemId, newQuantity, reason);

      // Update local state
      final updatedItems = state.items.map((item) {
        if (item.id == itemId) {
          return item.copyWith(quantity: newQuantity);
        }
        return item;
      }).toList();

      state = state.copyWith(items: updatedItems);

      // Refresh alerts if quantity went below threshold
      if (newQuantity < currentItem.minQuantity) {
        await loadLowStockAlerts();
      }

      return true;
    } catch (e) {
      state = state.copyWith(error: 'Errore nell\'aggiornamento della quantità');
      return false;
    }
  }

  Future<bool> incrementQuantity(String itemId, {String reason = 'Rifornimento'}) async {
    return updateQuantity(itemId, 1, reason);
  }

  Future<bool> decrementQuantity(String itemId, {String reason = 'Utilizzo'}) async {
    return updateQuantity(itemId, -1, reason);
  }

  Future<bool> createItem(Map<String, dynamic> data) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      await apiClient.createStockItem(data);
      await loadStock(propertyId: data['propertyId'] as String?);
      return true;
    } catch (e) {
      state = state.copyWith(error: 'Errore nella creazione dell\'articolo');
      return false;
    }
  }

  Future<bool> updateItem(String id, Map<String, dynamic> data) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      await apiClient.updateStockItem(id, data);
      await loadStock();
      return true;
    } catch (e) {
      state = state.copyWith(error: 'Errore nell\'aggiornamento dell\'articolo');
      return false;
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

final stockProvider = NotifierProvider<StockNotifier, StockState>(
  StockNotifier.new,
);

final lowStockCountProvider = Provider<int>((ref) {
  return ref.watch(stockProvider).lowStockItems.length;
});

final lowStockAlertsProvider = Provider<List<StockItemModel>>((ref) {
  return ref.watch(stockProvider).lowStockAlerts;
});
