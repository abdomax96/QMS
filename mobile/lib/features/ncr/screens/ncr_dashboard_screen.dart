import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../company/providers/company_provider.dart';
import '../../permissions/providers/permission_provider.dart';
import '../providers/ncr_provider.dart';
import '../widgets/ncr_list_tile.dart';

class NcrDashboardScreen extends ConsumerWidget {
  const NcrDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final company = ref.watch(selectedCompanyProvider);
    final statsAsync = ref.watch(ncrStatsProvider);
    final listAsync = ref.watch(ncrListProvider);
    final canCreate = ref.watch(permissionsValueProvider).hasAny;

    return Scaffold(
      appBar: AppBar(title: const Text('لوحة المعلومات')),
      drawer: const AppDrawer(current: '/dashboard'),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/ncr/create'),
        icon: const Icon(Icons.add),
        label: const Text('تقرير جديد'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(ncrListProvider);
          ref.invalidate(ncrStatsProvider);
          await ref.read(ncrListProvider.future);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 90),
          children: [
            Container(
              margin: const EdgeInsets.all(12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primary, AppTheme.primaryDark],
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  const Icon(Icons.factory_outlined,
                      color: Colors.white, size: 36),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('الشركة الحالية',
                            style: TextStyle(color: Colors.white70)),
                        Text(
                          company?.name ?? '—',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            statsAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => Padding(
                padding: const EdgeInsets.all(16),
                child: ErrorStateView(
                  error: e,
                  onRetry: () => ref.invalidate(ncrStatsProvider),
                ),
              ),
              data: (stats) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  childAspectRatio: 1.7,
                  children: [
                    _statCard('إجمالي الحالات', stats.total, Icons.assignment,
                        AppTheme.primary),
                    _statCard('مفتوحة', stats.open, Icons.lock_open,
                        AppTheme.statusOpen),
                    _statCard('قيد التنفيذ', stats.inProgress,
                        Icons.pending_actions, AppTheme.statusInProgress),
                    _statCard('مغلقة', stats.closed, Icons.check_circle,
                        AppTheme.statusClosed),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('أحدث الحالات',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                  TextButton(
                    onPressed: () => context.go('/ncr'),
                    child: const Text('عرض الكل'),
                  ),
                ],
              ),
            ),
            listAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => Padding(
                padding: const EdgeInsets.all(16),
                child: ErrorStateView(
                  error: e,
                  onRetry: () => ref.invalidate(ncrListProvider),
                ),
              ),
              data: (reports) {
                if (reports.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.all(24),
                    child: EmptyState(
                      message: 'لا توجد حالات NCR بعد.',
                      icon: Icons.assignment_outlined,
                    ),
                  );
                }
                final recent = reports.take(5).toList();
                return Column(
                  children: recent
                      .map((r) => NcrListTile(
                            report: r,
                            onTap: () =>
                                context.go('/ncr/details/${r.id}'),
                          ))
                      .toList(),
                );
              },
            ),
            if (!canCreate)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'ملاحظة: صلاحياتك محدودة حسب إعدادات النظام.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _statCard(String label, int value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('$value',
                      style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: color)),
                  Text(label,
                      style: const TextStyle(fontSize: 12),
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
