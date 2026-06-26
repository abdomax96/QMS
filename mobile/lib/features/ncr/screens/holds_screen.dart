import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/arabic_formatters.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/common_widgets.dart';
import '../providers/ncr_provider.dart';
import '../widgets/hold_sort_form.dart';

class HoldsScreen extends ConsumerWidget {
  const HoldsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final holdsAsync = ref.watch(holdsOverviewProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('الكميات المحتجزة')),
      drawer: const AppDrawer(current: '/holds'),
      body: holdsAsync.when(
        loading: () => const LoadingView(message: 'جاري حساب الكميات...'),
        error: (e, _) => ErrorStateView(
          error: e,
          onRetry: () => ref.invalidate(holdsOverviewProvider),
        ),
        data: (holds) {
          if (holds.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(holdsOverviewProvider);
                await ref.read(holdsOverviewProvider.future);
              },
              child: ListView(
                children: const [
                  SizedBox(height: 100),
                  EmptyState(
                    message: 'لا توجد كميات محتجزة متبقية.',
                    icon: Icons.inventory_2_outlined,
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(holdsOverviewProvider);
              await ref.read(holdsOverviewProvider.future);
            },
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: holds.length,
              itemBuilder: (context, index) {
                final h = holds[index];
                return Card(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () => context.go('/ncr/details/${h.ncr.id}'),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  h.ncr.number,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                  ),
                                ),
                              ),
                              PillBadge(
                                label:
                                    'متبقي: ${ArabicFormatters.number(h.remainingQty)} ${h.ncr.reservedUnit ?? ''}',
                                color: AppTheme.severityMedium,
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            h.ncr.department ?? '—',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              _stat(
                                'المحجوزة',
                                h.reservedQty,
                                AppTheme.primary,
                              ),
                              _stat(
                                'المفروزة',
                                h.totalSortedQty,
                                AppTheme.statusInProgress,
                              ),
                              _stat(
                                'المتلفة',
                                h.totalDestroyedQty,
                                AppTheme.severityHigh,
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () =>
                                      context.go('/ncr/details/${h.ncr.id}'),
                                  icon: const Icon(Icons.visibility_outlined),
                                  label: const Text('التفاصيل'),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () =>
                                      _openHoldManagement(context, ref, h),
                                  icon: const Icon(Icons.inventory_outlined),
                                  label: const Text('تسجيل فرز'),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Widget _stat(String label, num value, Color color) => Expanded(
    child: Column(
      children: [
        Text(
          ArabicFormatters.number(value),
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: color,
            fontSize: 16,
          ),
        ),
        Text(
          label,
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
      ],
    ),
  );

  Future<void> _openHoldManagement(
    BuildContext context,
    WidgetRef ref,
    HoldSummary hold,
  ) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) =>
          HoldSortForm(report: hold.ncr, remainingQty: hold.remainingQty),
    );

    if (saved == true) {
      ref.invalidate(holdsOverviewProvider);
      ref.invalidate(holdLogsProvider(hold.ncr.id));
      ref.invalidate(ncrDetailsProvider(hold.ncr.id));
      if (context.mounted) {
        showSuccessSnack(context, 'تم تحديث الكمية المحتجزة.');
      }
    }
  }
}
