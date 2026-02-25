enum PaymentStatus { pending, paid }

class PaymentModel {
  final String id;
  final String cleaningId;
  final String cleanerName;
  final String cleanerEmail;
  final String propertyName;
  final DateTime scheduledDate;
  final DateTime? completedAt;
  final double amount;
  final PaymentStatus status;
  final DateTime? paidAt;
  final String? voucherNumber;

  const PaymentModel({
    required this.id,
    required this.cleaningId,
    required this.cleanerName,
    required this.cleanerEmail,
    required this.propertyName,
    required this.scheduledDate,
    this.completedAt,
    required this.amount,
    required this.status,
    this.paidAt,
    this.voucherNumber,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    return PaymentModel(
      id: json['id'] as String,
      cleaningId: json['cleaningId'] as String,
      cleanerName: json['cleanerName'] as String,
      cleanerEmail: json['cleanerEmail'] as String? ?? '',
      propertyName: json['propertyName'] as String,
      scheduledDate: DateTime.parse(json['scheduledDate'] as String),
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      amount: (json['amount'] as num).toDouble(),
      status: (json['status'] as String).toUpperCase() == 'PAID'
          ? PaymentStatus.paid
          : PaymentStatus.pending,
      paidAt: json['paidAt'] != null
          ? DateTime.parse(json['paidAt'] as String)
          : null,
      voucherNumber: json['voucherNumber'] as String?,
    );
  }

  bool get isPending => status == PaymentStatus.pending;
  bool get isPaid => status == PaymentStatus.paid;

  String get statusDisplayName {
    switch (status) {
      case PaymentStatus.pending:
        return 'In attesa';
      case PaymentStatus.paid:
        return 'Pagato';
    }
  }

  String get formattedAmount => '€${amount.toStringAsFixed(2)}';
}

class PaymentSummary {
  final int totalPending;
  final int totalPaid;
  final double amountPending;
  final double amountPaid;
  final List<MonthlyPayment> byMonth;
  final List<CleanerPayment> byCleaner;

  const PaymentSummary({
    required this.totalPending,
    required this.totalPaid,
    required this.amountPending,
    required this.amountPaid,
    required this.byMonth,
    required this.byCleaner,
  });

  factory PaymentSummary.fromJson(Map<String, dynamic> json) {
    return PaymentSummary(
      totalPending: json['totalPending'] as int,
      totalPaid: json['totalPaid'] as int,
      amountPending: (json['amountPending'] as num).toDouble(),
      amountPaid: (json['amountPaid'] as num).toDouble(),
      byMonth: (json['byMonth'] as List)
          .map((e) => MonthlyPayment.fromJson(e as Map<String, dynamic>))
          .toList(),
      byCleaner: (json['byCleaner'] as List)
          .map((e) => CleanerPayment.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  int get total => totalPending + totalPaid;
  double get totalAmount => amountPending + amountPaid;
  String get formattedPending => '€${amountPending.toStringAsFixed(2)}';
  String get formattedPaid => '€${amountPaid.toStringAsFixed(2)}';
  String get formattedTotal => '€${totalAmount.toStringAsFixed(2)}';
}

class MonthlyPayment {
  final String month;
  final int pending;
  final int paid;
  final double amountPending;
  final double amountPaid;

  const MonthlyPayment({
    required this.month,
    required this.pending,
    required this.paid,
    required this.amountPending,
    required this.amountPaid,
  });

  factory MonthlyPayment.fromJson(Map<String, dynamic> json) {
    return MonthlyPayment(
      month: json['month'] as String,
      pending: json['pending'] as int,
      paid: json['paid'] as int,
      amountPending: (json['amountPending'] as num).toDouble(),
      amountPaid: (json['amountPaid'] as num).toDouble(),
    );
  }

  String get displayMonth {
    final parts = month.split('-');
    final monthNames = [
      'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
      'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
    ];
    final monthIndex = int.parse(parts[1]) - 1;
    return '${monthNames[monthIndex]} ${parts[0]}';
  }
}

class CleanerPayment {
  final String cleanerId;
  final String cleanerName;
  final int pending;
  final int paid;
  final double totalAmount;

  const CleanerPayment({
    required this.cleanerId,
    required this.cleanerName,
    required this.pending,
    required this.paid,
    required this.totalAmount,
  });

  factory CleanerPayment.fromJson(Map<String, dynamic> json) {
    return CleanerPayment(
      cleanerId: json['cleanerId'] as String,
      cleanerName: json['cleanerName'] as String,
      pending: json['pending'] as int,
      paid: json['paid'] as int,
      totalAmount: (json['totalAmount'] as num).toDouble(),
    );
  }

  String get formattedTotal => '€${totalAmount.toStringAsFixed(2)}';
}
