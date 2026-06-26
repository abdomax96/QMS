import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/arabic_formatters.dart';
import '../../../core/utils/labels.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../permissions/providers/permission_provider.dart';
import '../models/ncr_models.dart';
import '../providers/ncr_actions_provider.dart';
import '../providers/ncr_provider.dart';
import '../widgets/ncr_comments_panel.dart';
import '../widgets/ncr_stage_timeline.dart';
import '../widgets/ncr_workflow_actions.dart';

class NcrDetailsScreen extends ConsumerWidget {
  const NcrDetailsScreen({super.key, required this.ncrId});

  final String ncrId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailsAsync = ref.watch(ncrDetailsProvider(ncrId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('تفاصيل الحالة'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_forward),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/ncr'),
        ),
      ),
      body: detailsAsync.when(
        loading: () => const LoadingView(),
        error: (e, _) => ErrorStateView(
          error: e,
          onRetry: () => ref.invalidate(ncrDetailsProvider(ncrId)),
        ),
        data: (report) {
          if (report == null) {
            return const EmptyState(
              message: 'لم يتم العثور على الحالة.',
              icon: Icons.search_off,
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(ncrDetailsProvider(ncrId));
              await ref.read(ncrDetailsProvider(ncrId).future);
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(bottom: 32),
              children: [
                _header(report),
                NcrStageTimeline(report: report),
                NcrWorkflowActions(report: report),
                _detailsCard(report),
                _holdsSummaryCard(context, ref, report),
                _attachmentsCard(context, ref, report),
                NcrCommentsPanel(ncrId: report.id, companyId: report.companyId),
                _historyCard(report),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _header(NcrReport report) {
    final severityColor = AppTheme.severityColor(report.severity);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    report.number,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                PillBadge(
                  label: Labels.status(report.status),
                  color: AppTheme.statusColor(report.status),
                ),
              ],
            ),
            if (report.title?.isNotEmpty == true) ...[
              const SizedBox(height: 4),
              Text(
                report.title!,
                style: TextStyle(color: Colors.grey.shade700),
              ),
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                PillBadge(
                  label: 'الشدة: ${Labels.severity(report.severity)}',
                  color: severityColor,
                  icon: Icons.warning_amber_rounded,
                ),
                if (report.rpn != null)
                  PillBadge(
                    label: 'RPN: ${report.rpn} (${report.riskBand ?? ''})',
                    color: AppTheme.statusInProgress,
                    icon: Icons.analytics_outlined,
                  ),
                PillBadge(
                  label: Labels.defectType(report.defectType),
                  color: AppTheme.primary,
                  icon: Icons.category_outlined,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailsCard(NcrReport report) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'المعلومات الأساسية',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _row('التاريخ', ArabicFormatters.date(report.date)),
            if (report.shift != null) _row('الوردية', 'وردية ${report.shift}'),
            _row('القسم', report.department ?? '—'),
            if (report.productName != null) _row('المنتج', report.productName!),
            if (report.lineOrArea != null)
              _row('الخط/المنطقة', report.lineOrArea!),
            if (report.relatedMaterialName != null)
              _row('الخامة', report.relatedMaterialName!),
            _row(
              'الكمية المحجوزة',
              '${ArabicFormatters.number(report.reservedQty)} ${report.reservedUnit ?? ''}',
            ),
            _row('مكتشف الحالة', report.discoveredBy ?? '—'),
            const Divider(),
            _block('الوصف', report.description),
            if (report.immediateAction?.isNotEmpty == true)
              _block('الإجراء الفوري', report.immediateAction),
            if (report.documentTitle?.isNotEmpty == true)
              _block('الوثيقة المرجعية', report.documentTitle),
            if (report.rootCause?.isNotEmpty == true)
              _block('السبب الجذري', report.rootCause),
          ],
        ),
      ),
    );
  }

  Widget _holdsSummaryCard(
    BuildContext context,
    WidgetRef ref,
    NcrReport report,
  ) {
    if ((report.reservedQty ?? 0) <= 0) return const SizedBox.shrink();
    final logsAsync = ref.watch(holdLogsProvider(report.id));
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'سجلات الفرز والاحتجاز',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            logsAsync.when(
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(8),
                  child: CircularProgressIndicator(),
                ),
              ),
              error: (e, _) => Text(
                'تعذر تحميل السجلات.',
                style: TextStyle(color: Colors.grey.shade600),
              ),
              data: (logs) {
                final reserved = (report.reservedQty ?? 0);
                num sorted = 0, destroyed = 0;
                for (final l in logs) {
                  sorted += l.sortedQty;
                  destroyed += l.destroyedQty;
                }
                final remaining = (reserved - sorted);
                final clamped = remaining < 0 ? 0 : remaining;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        PillBadge(
                          label:
                              'المحجوزة: ${ArabicFormatters.number(reserved)}',
                          color: AppTheme.primary,
                        ),
                        PillBadge(
                          label: 'المفروزة: ${ArabicFormatters.number(sorted)}',
                          color: AppTheme.statusInProgress,
                        ),
                        PillBadge(
                          label:
                              'المتلفة: ${ArabicFormatters.number(destroyed)}',
                          color: AppTheme.severityHigh,
                        ),
                        PillBadge(
                          label:
                              'المتبقية: ${ArabicFormatters.number(clamped)}',
                          color: clamped > 0
                              ? AppTheme.severityMedium
                              : AppTheme.statusClosed,
                        ),
                      ],
                    ),
                    if (logs.isNotEmpty) ...[
                      const Divider(),
                      ...logs.map(
                        (l) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.checklist,
                                size: 16,
                                color: Colors.grey,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'فرز: ${ArabicFormatters.number(l.sortedQty)} | إتلاف: ${ArabicFormatters.number(l.destroyedQty)}'
                                  '${l.notes != null ? ' - ${l.notes}' : ''}',
                                  style: const TextStyle(fontSize: 13),
                                ),
                              ),
                              Text(
                                ArabicFormatters.date(
                                  l.sortedAt ?? l.createdAt,
                                ),
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey.shade500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _attachmentsCard(
    BuildContext context,
    WidgetRef ref,
    NcrReport report,
  ) {
    final canEdit =
        ref
            .watch(permissionsValueProvider)
            .can(report.currentStage, Labels.actEdit) ||
        report.currentStage == 'initial_report';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text(
                  'المرفقات',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                if (canEdit && !report.isClosed)
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.add_a_photo_outlined),
                    onSelected: (v) => _addAttachment(context, ref, report, v),
                    itemBuilder: (_) => const [
                      PopupMenuItem(
                        value: 'camera',
                        child: Text('التقاط صورة'),
                      ),
                      PopupMenuItem(
                        value: 'gallery',
                        child: Text('اختيار صورة'),
                      ),
                      PopupMenuItem(value: 'file', child: Text('اختيار ملف')),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 8),
            if (report.attachments.isEmpty)
              Text(
                'لا توجد مرفقات.',
                style: TextStyle(color: Colors.grey.shade600),
              )
            else
              ...report.attachments.map(
                (a) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.insert_drive_file_outlined),
                  title: Text(
                    a.fileName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: a.uploadedAt != null
                      ? Text(
                          ArabicFormatters.date(
                            ArabicFormatters.tryParseDate(a.uploadedAt),
                          ),
                        )
                      : null,
                  trailing: const Icon(Icons.open_in_new, size: 18),
                  onTap: () => _openAttachment(context, ref, a),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _historyCard(NcrReport report) {
    if (report.stageHistory.isEmpty) return const SizedBox.shrink();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'سجل الانتقالات',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ...report.stageHistory.reversed.map(
              (h) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.history, size: 16, color: Colors.grey),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            h.notes ??
                                '${Labels.stage(h.from)} ← ${Labels.stage(h.to)}',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          Text(
                            '${h.transitionedByName ?? ''} • ${ArabicFormatters.dateTime(h.at)}',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---- attachment handlers ----
  Future<void> _addAttachment(
    BuildContext context,
    WidgetRef ref,
    NcrReport report,
    String source,
  ) async {
    try {
      File? file;
      String? fileName;
      if (source == 'file') {
        final result = await FilePicker.platform.pickFiles();
        if (result == null || result.files.single.path == null) return;
        file = File(result.files.single.path!);
        fileName = result.files.single.name;
      } else {
        final picker = ImagePicker();
        final picked = await picker.pickImage(
          source: source == 'camera' ? ImageSource.camera : ImageSource.gallery,
          imageQuality: 80,
        );
        if (picked == null) return;
        file = File(picked.path);
        fileName = picked.name;
      }
      if (!context.mounted) return;
      showSuccessSnack(context, 'جاري رفع المرفق...');
      await ref
          .read(ncrActionsProvider)
          .uploadAttachment(report, file, fileName);
      if (context.mounted) showSuccessSnack(context, 'تم رفع المرفق.');
    } catch (e) {
      if (context.mounted) showErrorSnack(context, e);
    }
  }

  Future<void> _openAttachment(
    BuildContext context,
    WidgetRef ref,
    NcrAttachment a,
  ) async {
    String? url = a.downloadURL;
    url ??= await ref
        .read(attachmentRepositoryProvider)
        .signedUrl(a.storagePath);
    if (url == null) {
      if (context.mounted) {
        showErrorSnack(context, 'تعذر فتح المرفق.');
      }
      return;
    }
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else if (context.mounted) {
      showErrorSnack(context, 'تعذر فتح الرابط.');
    }
  }

  Widget _row(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 120,
          child: Text(label, style: TextStyle(color: Colors.grey.shade600)),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    ),
  );

  Widget _block(String label, String? value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: Colors.grey.shade600)),
        const SizedBox(height: 2),
        Text(value ?? '—'),
      ],
    ),
  );
}
