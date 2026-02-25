import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/payment_model.dart';
import 'auth_provider.dart';

class PaymentsState {
  final List<PaymentModel> payments;
  final PaymentSummary? summary;
  final bool isLoading;
  final String? error;
  final PaymentStatus? filterStatus;

  const PaymentsState({
    this.payments = const [],
    this.summary,
    this.isLoading = false,
    this.error,
    this.filterStatus,
  });

  PaymentsState copyWith({
    List<PaymentModel>? payments,
    PaymentSummary? summary,
    bool? isLoading,
    String? error,
    PaymentStatus? filterStatus,
  }) {
    return PaymentsState(
      payments: payments ?? this.payments,
      summary: summary ?? this.summary,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      filterStatus: filterStatus,
    );
  }

  List<PaymentModel> get pendingPayments =>
      payments.where((p) => p.status == PaymentStatus.pending).toList();

  List<PaymentModel> get paidPayments =>
      payments.where((p) => p.status == PaymentStatus.paid).toList();

  List<PaymentModel> get filteredPayments {
    if (filterStatus == null) return payments;
    return payments.where((p) => p.status == filterStatus).toList();
  }

  double get pendingAmount =>
      pendingPayments.fold(0, (sum, p) => sum + p.amount);

  double get paidAmount => paidPayments.fold(0, (sum, p) => sum + p.amount);
}

class PaymentsNotifier extends Notifier<PaymentsState> {
  @override
  PaymentsState build() {
    return const PaymentsState();
  }

  Future<void> loadPayments({PaymentStatus? status}) async {
    state = state.copyWith(isLoading: true, error: null, filterStatus: status);

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.getPayments(
        status: status?.name.toUpperCase(),
      );
      final payments = (response.data['payments'] as List)
          .map((e) => PaymentModel.fromJson(e as Map<String, dynamic>))
          .toList();

      state = state.copyWith(payments: payments, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Errore nel caricamento dei pagamenti',
      );
    }
  }

  Future<void> loadSummary() async {
    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.getPaymentSummary();
      final summary = PaymentSummary.fromJson(response.data);

      state = state.copyWith(summary: summary);
    } catch (e) {
      // Silently fail for summary
    }
  }

  Future<bool> markAsPaid(String cleaningId, {String? voucherNumber}) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      await apiClient.markPaymentAsPaid(cleaningId, voucherNumber: voucherNumber);

      // Update local state
      final updatedPayments = state.payments.map((p) {
        if (p.cleaningId == cleaningId) {
          return PaymentModel(
            id: p.id,
            cleaningId: p.cleaningId,
            cleanerName: p.cleanerName,
            cleanerEmail: p.cleanerEmail,
            propertyName: p.propertyName,
            scheduledDate: p.scheduledDate,
            completedAt: p.completedAt,
            amount: p.amount,
            status: PaymentStatus.paid,
            paidAt: DateTime.now(),
            voucherNumber: voucherNumber,
          );
        }
        return p;
      }).toList();

      state = state.copyWith(payments: updatedPayments);
      await loadSummary();

      return true;
    } catch (e) {
      state = state.copyWith(error: 'Errore nel registrare il pagamento');
      return false;
    }
  }

  Future<int> markMultipleAsPaid(
    List<String> cleaningIds, {
    String? voucherPrefix,
  }) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.markMultiplePaymentsAsPaid(
        cleaningIds,
        voucherPrefix: voucherPrefix,
      );

      final successCount = response.data['success'] as int;

      // Reload payments
      await loadPayments(status: state.filterStatus);
      await loadSummary();

      return successCount;
    } catch (e) {
      state = state.copyWith(error: 'Errore nel registrare i pagamenti');
      return 0;
    }
  }

  void setFilter(PaymentStatus? status) {
    state = state.copyWith(filterStatus: status);
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

final paymentsProvider = NotifierProvider<PaymentsNotifier, PaymentsState>(
  PaymentsNotifier.new,
);

final pendingPaymentsCountProvider = Provider<int>((ref) {
  return ref.watch(paymentsProvider).pendingPayments.length;
});

final paymentSummaryProvider = Provider<PaymentSummary?>((ref) {
  return ref.watch(paymentsProvider).summary;
});
