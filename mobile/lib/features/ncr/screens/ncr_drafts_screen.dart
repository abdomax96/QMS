import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/arabic_formatters.dart';
import '../../../core/utils/labels.dart';
import '../../../core/utils/network_status.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../company/providers/company_provider.dart';
import '../data/draft_repository.dart';
import '../data/ncr_repository.dart';
import '../providers/ncr_actions_provider.dart';
import '../providers/ncr_provider.dart';

class NcrDraftsScreen extends ConsumerWidget {
  const NcrDraftsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final draftsAsync = ref.watch(draftsProvider);
    final onlineAsync = ref.watch(isOnlineProvider);
    final online = onlineAsync.asData?.value ?? true;

    return Scaffold(
      appBar: AppBar(title: const Text('المسودات غير المتزامنة')),
      drawer: const AppDrawer(current: '/drafts'),
      body: draftsAsync.when(
        loading: () => const LoadingView(),
        error: (e, _) => ErrorStateView(error: e),
        data: (drafts) {
          if (drafts.isEmpty) {
            return const EmptyState(
              message: 'لا توجد مسودات غير متزامنة.',
              icon: Icons.drafts_outlined,
            );
          }
          return Column(
            children: [
              if (!online)
                Container(
                  width: double.infinity,
                  color: AppTheme.severityMedium.withValues(alpha: 0.15),
                  padding: const EdgeInsets.all(12),
                  child: const Row(
                    children: [
                      Icon(Icons.wifi_off, color: AppTheme.severityMedium),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                            'لا يوجد اتصال. ستتمكن من المزامنة عند عودة الإنترنت.'),
                      ),
                    ],
                  ),
                ),
              Expanded(
                child: ListView.builder(
                  itemCount: drafts.length,
                  itemBuilder: (context, index) {
                    final draft = drafts[index];
                    return Card(
                      child: ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: AppTheme.severityMedium,
                          child: Icon(Icons.edit_note, color: Colors.white),
                        ),
                        title: Text(
                          draft.data['title']?.toString().isNotEmpty == true
                              ? draft.data['title'].toString()
                              : (draft.data['department']?.toString() ??
                                  'مسودة'),
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text(
                          '${Labels.severity(draft.data['severity']?.toString())} • ${ArabicFormatters.dateTime(draft.createdAt)}',
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              tooltip: 'مزامنة',
                              icon: Icon(Icons.cloud_upload_outlined,
                                  color: online
                                      ? AppTheme.statusClosed
                                      : Colors.grey),
                              onPressed: online
                                  ? () => _sync(context, ref, draft)
                                  : null,
                            ),
                            IconButton(
                              tooltip: 'حذف',
                              icon: const Icon(Icons.delete_outline,
                                  color: AppTheme.severityHigh),
                              onPressed: () => _delete(context, ref, draft),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _sync(
      BuildContext context, WidgetRef ref, NcrDraft draft) async {
    final companyId = ref.read(selectedCompanyIdProvider);
    if (companyId == null) {
      showErrorSnack(context, 'يرجى اختيار الشركة أولاً.');
      return;
    }
    try {
      final d = draft.data;
      final input = NcrCreateInput(
        companyId: companyId,
        date: DateTime.tryParse(d['date']?.toString() ?? '') ?? DateTime.now(),
        shift: d['shift']?.toString(),
        department: d['department']?.toString() ?? '',
        defectType: d['defect_type']?.toString() ?? 'other',
        defectId: d['defect_id']?.toString(),
        productName: d['product_name']?.toString(),
        lineOrArea: d['line_or_area']?.toString(),
        relatedMaterialName: d['related_material_name']?.toString(),
        reservedQty: num.tryParse(d['reserved_qty']?.toString() ?? ''),
        reservedUnit: d['reserved_unit']?.toString(),
        severity: d['severity']?.toString() ?? 'medium',
        occurrence: int.tryParse(d['occurrence']?.toString() ?? '5') ?? 5,
        detection: int.tryParse(d['detection']?.toString() ?? '5') ?? 5,
        discoveredBy: d['discovered_by']?.toString() ?? '',
        description: d['description']?.toString() ?? '',
        immediateAction: d['immediate_action']?.toString(),
        title: d['title']?.toString(),
      );
      final report = await ref.read(ncrActionsProvider).createReport(input);
      await ref.read(draftRepositoryProvider).removeDraft(draft.localId);
      ref.invalidate(draftsProvider);
      if (!context.mounted) return;
      showSuccessSnack(context, 'تمت مزامنة المسودة (${report.number}).');
      context.go('/ncr/details/${report.id}');
    } catch (e) {
      if (context.mounted) showErrorSnack(context, e);
    }
  }

  Future<void> _delete(
      BuildContext context, WidgetRef ref, NcrDraft draft) async {
    final ok = await confirmDialog(
      context,
      title: 'حذف المسودة',
      message: 'هل تريد حذف هذه المسودة نهائياً؟',
      confirmColor: AppTheme.severityHigh,
    );
    if (!ok) return;
    await ref.read(draftRepositoryProvider).removeDraft(draft.localId);
    ref.invalidate(draftsProvider);
    if (context.mounted) showSuccessSnack(context, 'تم حذف المسودة.');
  }
}
