import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/config/app_theme.dart';
import '../../data/models/payment_model.dart';
import '../common/widgets.dart';
import '../providers/payments_provider.dart';

class AdminPaymentsScreen extends ConsumerStatefulWidget {
  const AdminPaymentsScreen({super.key});

  @override
  ConsumerState<AdminPaymentsScreen> createState() => _AdminPaymentsScreenState();
}

class _AdminPaymentsScreenState extends ConsumerState<AdminPaymentsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final Set<String> _selectedPayments = {};
  bool _isSelectionMode = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    await ref.read(paymentsProvider.notifier).loadPayments();
    await ref.read(paymentsProvider.notifier).loadSummary();
  }

  void _toggleSelection(String id) {
    setState(() {
      if (_selectedPayments.contains(id)) {
        _selectedPayments.remove(id);
      } else {
        _selectedPayments.add(id);
      }
      _isSelectionMode = _selectedPayments.isNotEmpty;
    });
  }

  void _clearSelection() {
    setState(() {
      _selectedPayments.clear();
      _isSelectionMode = false;
    });
  }

  Future<void> _markSelectedAsPaid() async {
    if (_selectedPayments.isEmpty) return;

    final voucherPrefix = await _showVoucherDialog();
    if (voucherPrefix == null) return;

    final count = await ref.read(paymentsProvider.notifier).markMultipleAsPaid(
          _selectedPayments.toList(),
          voucherPrefix: voucherPrefix.isNotEmpty ? voucherPrefix : null,
        );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$count pagamenti registrati'),
          backgroundColor: Colors.green,
        ),
      );
      _clearSelection();
    }
  }

  Future<String?> _showVoucherDialog() async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.darkSurface,
        title: const Text('Prefisso Voucher'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Inserisci un prefisso per i numeri voucher (opzionale):',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                hintText: 'Es: INPS-2024-02',
                labelText: 'Prefisso Voucher',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annulla'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Conferma'),
          ),
        ],
      ),
    );
  }

  Future<void> _markSingleAsPaid(PaymentModel payment) async {
    final voucherNumber = await _showSingleVoucherDialog(payment);
    if (voucherNumber == null) return;

    final success = await ref.read(paymentsProvider.notifier).markAsPaid(
          payment.cleaningId,
          voucherNumber: voucherNumber.isNotEmpty ? voucherNumber : null,
        );

    if (mounted && success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pagamento registrato'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  Future<String?> _showSingleVoucherDialog(PaymentModel payment) async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.darkSurface,
        title: const Text('Registra Pagamento'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${payment.cleanerName} - ${payment.propertyName}',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            Text(
              payment.formattedAmount,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: AppTheme.primaryCyan,
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                hintText: 'Es: INPS-2024-001',
                labelText: 'Numero Voucher',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annulla'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Conferma Pagamento'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(paymentsProvider);
    final summary = state.summary;

    return Scaffold(
      appBar: AppBar(
        title: _isSelectionMode
            ? Text('${_selectedPayments.length} selezionati')
            : const Text('Pagamenti'),
        actions: _isSelectionMode
            ? [
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: _clearSelection,
                ),
                IconButton(
                  icon: const Icon(Icons.check_circle),
                  onPressed: _markSelectedAsPaid,
                  tooltip: 'Marca come pagati',
                ),
              ]
            : [
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: _loadData,
                ),
              ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.primaryCyan,
          tabs: [
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Riepilogo'),
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('In attesa'),
                  if (state.pendingPayments.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${state.pendingPayments.length}',
                        style: const TextStyle(fontSize: 10, color: Colors.white),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const Tab(text: 'Pagati'),
          ],
        ),
      ),
      body: state.isLoading
          ? const LoadingIndicator(message: 'Caricamento pagamenti...')
          : TabBarView(
              controller: _tabController,
              children: [
                _buildSummaryTab(summary),
                _buildPaymentsListTab(state.pendingPayments, true),
                _buildPaymentsListTab(state.paidPayments, false),
              ],
            ),
    );
  }

  Widget _buildSummaryTab(PaymentSummary? summary) {
    if (summary == null) {
      return const EmptyState(
        icon: Icons.receipt_long,
        title: 'Nessun dato',
        subtitle: 'Caricamento riepilogo...',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Totals card
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Riepilogo Totale',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildStatCard(
                        'In attesa',
                        summary.formattedPending,
                        '${summary.totalPending} pulizie',
                        Colors.orange,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildStatCard(
                        'Pagati',
                        summary.formattedPaid,
                        '${summary.totalPaid} pulizie',
                        Colors.green,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryCyan.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.primaryCyan.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Totale'),
                      Text(
                        summary.formattedTotal,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryCyan,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // By cleaner
          if (summary.byCleaner.isNotEmpty) ...[
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Per Addetto',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const SizedBox(height: 12),
                  ...summary.byCleaner.map((c) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: AppTheme.primaryCyan.withValues(alpha: 0.2),
                              child: Text(
                                c.cleanerName.substring(0, 1).toUpperCase(),
                                style: const TextStyle(color: AppTheme.primaryCyan),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(c.cleanerName),
                                  Text(
                                    '${c.pending} in attesa, ${c.paid} pagati',
                                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                          color: Theme.of(context)
                                              .textTheme
                                              .bodySmall
                                              ?.color
                                              ?.withValues(alpha: 0.7),
                                        ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              c.formattedTotal,
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      )),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // By month
          if (summary.byMonth.isNotEmpty) ...[
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Per Mese',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const SizedBox(height: 12),
                  ...summary.byMonth.take(6).map((m) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          children: [
                            Container(
                              width: 80,
                              child: Text(
                                m.displayMonth,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ),
                            Expanded(
                              child: Row(
                                children: [
                                  Expanded(
                                    flex: m.paid + m.pending > 0 ? m.paid : 1,
                                    child: Container(
                                      height: 8,
                                      decoration: BoxDecoration(
                                        color: Colors.green,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                    ),
                                  ),
                                  if (m.pending > 0)
                                    Expanded(
                                      flex: m.pending,
                                      child: Container(
                                        height: 8,
                                        decoration: BoxDecoration(
                                          color: Colors.orange,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              '€${(m.amountPending + m.amountPaid).toStringAsFixed(0)}',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      )),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, String subtitle, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(color: color, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).textTheme.bodySmall?.color?.withValues(alpha: 0.7),
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentsListTab(List<PaymentModel> payments, bool showActions) {
    if (payments.isEmpty) {
      return EmptyState(
        icon: showActions ? Icons.hourglass_empty : Icons.check_circle,
        title: showActions ? 'Nessun pagamento in attesa' : 'Nessun pagamento',
        subtitle: showActions
            ? 'Tutti i pagamenti sono stati registrati'
            : 'I pagamenti completati appariranno qui',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: payments.length,
        itemBuilder: (context, index) {
          final payment = payments[index];
          final isSelected = _selectedPayments.contains(payment.cleaningId);

          return GlassCard(
            margin: const EdgeInsets.only(bottom: 12),
            onTap: showActions && _isSelectionMode
                ? () => _toggleSelection(payment.cleaningId)
                : null,
            onLongPress: showActions
                ? () => _toggleSelection(payment.cleaningId)
                : null,
            child: Row(
              children: [
                if (_isSelectionMode && showActions) ...[
                  Checkbox(
                    value: isSelected,
                    onChanged: (_) => _toggleSelection(payment.cleaningId),
                    activeColor: AppTheme.primaryCyan,
                  ),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              payment.cleanerName,
                              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                          ),
                          Text(
                            payment.formattedAmount,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.primaryCyan,
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        payment.propertyName,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.calendar_today,
                            size: 14,
                            color: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.color
                                ?.withValues(alpha: 0.7),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            payment.completedAt != null
                                ? 'Completata il ${_formatDate(payment.completedAt!)}'
                                : 'Programmata: ${_formatDate(payment.scheduledDate)}',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.color
                                      ?.withValues(alpha: 0.7),
                                ),
                          ),
                        ],
                      ),
                      if (payment.voucherNumber != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.receipt, size: 14, color: Colors.green),
                            const SizedBox(width: 4),
                            Text(
                              'Voucher: ${payment.voucherNumber}',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.green,
                                  ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                if (showActions && !_isSelectionMode) ...[
                  IconButton(
                    icon: const Icon(Icons.check_circle_outline),
                    color: Colors.green,
                    onPressed: () => _markSingleAsPaid(payment),
                    tooltip: 'Marca come pagato',
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
