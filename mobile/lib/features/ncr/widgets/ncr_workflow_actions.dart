import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/labels.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../permissions/models/permission_models.dart';
import '../../permissions/providers/permission_provider.dart';
import '../../settings/models/system_settings.dart';
import '../../settings/providers/settings_provider.dart';
import '../models/ncr_models.dart';
import '../models/ncr_workflow.dart';
import '../providers/ncr_actions_provider.dart';
import '../providers/ncr_provider.dart';
import 'capa_action_card.dart';
import 'hold_sort_form.dart';

/// Renders stage-specific workflow actions, gated by the user's permissions.
/// Button visibility is a convenience only — Supabase RLS enforces real auth.
class NcrWorkflowActions extends ConsumerWidget {
  const NcrWorkflowActions({super.key, required this.report});

  final NcrReport report;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final perms = ref.watch(permissionsValueProvider);
    final stage = report.currentStage;
    final stagePerm = perms.forStage(stage);

    if (report.isClosed) {
      return _closedBanner();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.bolt, color: AppTheme.primary),
                const SizedBox(width: 8),
                Text(
                  'إجراءات المرحلة: ${Labels.stage(stage)}',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ..._buildStageActions(context, ref, stage, perms, stagePerm),
            const SizedBox(height: 8),
            _buildTransitionButtons(context, ref, perms),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildStageActions(
    BuildContext context,
    WidgetRef ref,
    String stage,
    UserPermissions perms,
    StagePermission? stagePerm,
  ) {
    switch (stage) {
      case 'root_cause_analysis':
        return _rootCauseActions(context, ref, perms);
      case 'capa_planning':
        return _capaPlanningActions(context, ref, perms);
      case 'capa_execution':
        return _capaExecutionActions(context, ref, perms);
      case 'verification_closure':
        return _verificationActions(context, ref, perms);
      case 'initial_report':
      default:
        return [
          Text(
            'استكمل بيانات التقرير ثم انتقل إلى مرحلة تحليل السبب الجذري.',
            style: TextStyle(color: Colors.grey.shade600),
          ),
        ];
    }
  }

  // ---- Root cause ----
  List<Widget> _rootCauseActions(
    BuildContext context,
    WidgetRef ref,
    UserPermissions perms,
  ) {
    final widgets = <Widget>[];
    final approval = report.rootCauseApproval;

    if (report.rootCause?.isNotEmpty == true) {
      widgets.add(_infoBox('السبب الجذري', report.rootCause!));
      if (approval != null) {
        widgets.add(const SizedBox(height: 8));
        widgets.add(
          PillBadge(
            label: 'الموافقة: ${Labels.approvalStatus(approval.status)}',
            color: approval.isApproved
                ? AppTheme.statusClosed
                : approval.isRejected
                ? AppTheme.severityHigh
                : AppTheme.statusInProgress,
          ),
        );
        if (approval.isRejected && approval.rejectionReason != null) {
          widgets.add(const SizedBox(height: 6));
          widgets.add(
            Text(
              'سبب الرفض: ${approval.rejectionReason}',
              style: const TextStyle(color: AppTheme.severityHigh),
            ),
          );
        }
      }
    }

    // Propose root cause
    if (perms.can('root_cause_analysis', Labels.actRootCausePropose) &&
        (approval == null || approval.isRejected)) {
      widgets.add(const SizedBox(height: 10));
      widgets.add(
        _actionButton(
          'اقتراح السبب الجذري',
          Icons.psychology_outlined,
          () => _proposeRootCause(context, ref),
        ),
      );
    }

    // Approve / reject
    if (approval != null && approval.status == 'pending') {
      if (perms.can('root_cause_analysis', Labels.actApprove)) {
        widgets.add(const SizedBox(height: 8));
        widgets.add(
          _actionButton(
            'اعتماد السبب الجذري',
            Icons.check_circle_outline,
            () => _reviewRootCause(context, ref, approve: true),
            color: AppTheme.statusClosed,
          ),
        );
      }
      if (perms.can('root_cause_analysis', Labels.actReject)) {
        widgets.add(const SizedBox(height: 8));
        widgets.add(
          _actionButton(
            'رفض السبب الجذري',
            Icons.cancel_outlined,
            () => _reviewRootCause(context, ref, approve: false),
            color: AppTheme.severityHigh,
          ),
        );
      }
    }

    if (widgets.isEmpty) {
      widgets.add(_noPermissionNote());
    }
    return widgets;
  }

  // ---- CAPA planning ----
  List<Widget> _capaPlanningActions(
    BuildContext context,
    WidgetRef ref,
    UserPermissions perms,
  ) {
    final widgets = <Widget>[];
    if (report.actions.isNotEmpty) {
      widgets.addAll(report.actions.map((a) => CapaActionCard(action: a)));
    } else {
      widgets.add(
        Text(
          'لا توجد إجراءات CAPA بعد.',
          style: TextStyle(color: Colors.grey.shade600),
        ),
      );
    }
    if (perms.can('capa_planning', Labels.actCapaAdd)) {
      widgets.add(const SizedBox(height: 10));
      widgets.add(
        _actionButton(
          'إضافة إجراء CAPA',
          Icons.add_task,
          () => _addCapa(context, ref),
        ),
      );
    }
    return widgets;
  }

  // ---- CAPA execution ----
  List<Widget> _capaExecutionActions(
    BuildContext context,
    WidgetRef ref,
    UserPermissions perms,
  ) {
    final widgets = <Widget>[];
    final canComplete = perms.can('capa_execution', Labels.actCapaComplete);

    if (report.actions.isEmpty) {
      widgets.add(
        Text(
          'لا توجد إجراءات للتنفيذ.',
          style: TextStyle(color: Colors.grey.shade600),
        ),
      );
    } else {
      widgets.addAll(
        report.actions.map(
          (a) => CapaActionCard(
            action: a,
            canComplete: canComplete,
            onStatusChange: (status) => _updateCapa(context, ref, a.id, status),
          ),
        ),
      );
    }

    // Release hold / sort
    if (perms.can('capa_execution', Labels.actReleaseHold) &&
        (report.reservedQty ?? 0) > 0) {
      widgets.add(const SizedBox(height: 10));
      widgets.add(
        _actionButton(
          'تسجيل فرز / إفراج الكميات المحتجزة',
          Icons.inventory_2_outlined,
          () => _openHoldForm(context, ref),
          color: AppTheme.statusInProgress,
        ),
      );
    }
    return widgets;
  }

  // ---- Verification & closure ----
  List<Widget> _verificationActions(
    BuildContext context,
    WidgetRef ref,
    UserPermissions perms,
  ) {
    final widgets = <Widget>[];
    final v = report.verification;
    if (v != null) {
      widgets.add(
        _infoBox(
          'نتيجة التحقق',
          '${v.isSuccess ? 'ناجح' : 'غير ناجح'}${v.notes != null ? '\n${v.notes}' : ''}',
        ),
      );
    }

    if (perms.can('verification_closure', Labels.actVerifyClose)) {
      widgets.add(const SizedBox(height: 10));
      widgets.add(
        _actionButton(
          'إدخال نتيجة التحقق',
          Icons.verified_outlined,
          () => _saveVerification(context, ref),
        ),
      );

      if (v?.isSuccess == true) {
        widgets.add(const SizedBox(height: 8));
        widgets.add(
          _actionButton(
            'إغلاق الحالة',
            Icons.lock_outline,
            () => _close(context, ref),
            color: AppTheme.statusClosed,
          ),
        );
      }
    }

    if (widgets.isEmpty) widgets.add(_noPermissionNote());
    return widgets;
  }

  // ---- Transition (advance / return) ----
  Widget _buildTransitionButtons(
    BuildContext context,
    WidgetRef ref,
    UserPermissions perms,
  ) {
    final stage = report.currentStage;
    final canAdvancePerm =
        perms.canAdvance(stage) || perms.can(stage, Labels.actWorkflowProgress);
    final canReturnPerm =
        perms.canReturn(stage) || perms.can(stage, Labels.actReopen);
    final isLast = Labels.nextStage(stage) == null;

    final buttons = <Widget>[];
    if (canReturnPerm && Labels.previousStage(stage) != null) {
      buttons.add(
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => _returnStage(context, ref),
            icon: const Icon(Icons.undo),
            label: const Text('إرجاع للمرحلة السابقة'),
          ),
        ),
      );
    }
    if (canAdvancePerm && !isLast) {
      if (buttons.isNotEmpty) buttons.add(const SizedBox(width: 8));
      buttons.add(
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () => _advance(context, ref),
            icon: const Icon(Icons.arrow_back),
            label: const Text('المرحلة التالية'),
          ),
        ),
      );
    }
    if (buttons.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(children: buttons),
    );
  }

  // ===========================================================================
  // ACTION HANDLERS
  // ===========================================================================

  Future<void> _advance(BuildContext context, WidgetRef ref) async {
    final check = NcrWorkflow.canAdvance(report);
    if (!check.allowed) {
      showErrorSnack(context, check.reason ?? 'لا يمكن الانتقال.');
      return;
    }
    final ok = await confirmDialog(
      context,
      title: 'الانتقال للمرحلة التالية',
      message:
          'الانتقال إلى مرحلة ${Labels.stage(Labels.nextStage(report.currentStage))}؟',
    );
    if (!context.mounted || !ok) return;
    await _run(
      context,
      ref,
      () => ref.read(ncrActionsProvider).advance(report),
      success: 'تم الانتقال للمرحلة التالية.',
    );
  }

  Future<void> _returnStage(BuildContext context, WidgetRef ref) async {
    final ok = await confirmDialog(
      context,
      title: 'إرجاع المرحلة',
      message: 'هل تريد إرجاع الحالة للمرحلة السابقة؟',
      confirmColor: AppTheme.statusInProgress,
    );
    if (!context.mounted || !ok) return;
    await _run(
      context,
      ref,
      () => ref.read(ncrActionsProvider).returnStage(report),
      success: 'تم إرجاع الحالة للمرحلة السابقة.',
    );
  }

  Future<void> _proposeRootCause(BuildContext context, WidgetRef ref) async {
    final text = await _promptText(
      context,
      title: 'اقتراح السبب الجذري',
      hint: 'اكتب تحليل السبب الجذري...',
      initial: report.rootCause,
      multiline: true,
    );
    if (!context.mounted || text == null || text.trim().isEmpty) return;
    await _run(
      context,
      ref,
      () => ref.read(ncrActionsProvider).proposeRootCause(report, text.trim()),
      success: 'تم تسجيل السبب الجذري بانتظار الموافقة.',
    );
  }

  Future<void> _reviewRootCause(
    BuildContext context,
    WidgetRef ref, {
    required bool approve,
  }) async {
    String? reason;
    if (!approve) {
      reason = await _promptText(
        context,
        title: 'سبب الرفض',
        hint: 'اكتب سبب رفض السبب الجذري...',
        multiline: true,
      );
      if (!context.mounted || reason == null || reason.trim().isEmpty) return;
    } else {
      final ok = await confirmDialog(
        context,
        title: 'اعتماد السبب الجذري',
        message: 'هل تعتمد السبب الجذري؟',
        confirmColor: AppTheme.statusClosed,
      );
      if (!context.mounted || !ok) return;
    }
    await _run(
      context,
      ref,
      () => ref
          .read(ncrActionsProvider)
          .reviewRootCause(report, approve: approve, rejectionReason: reason),
      success: approve ? 'تم اعتماد السبب الجذري.' : 'تم رفض السبب الجذري.',
    );
  }

  Future<void> _addCapa(BuildContext context, WidgetRef ref) async {
    final action = await showModalBottomSheet<CapaAction>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _CapaForm(),
    );
    if (!context.mounted || action == null) return;
    await _run(
      context,
      ref,
      () => ref.read(ncrActionsProvider).addCapa(report, action),
      success: 'تمت إضافة إجراء CAPA.',
    );
  }

  Future<void> _updateCapa(
    BuildContext context,
    WidgetRef ref,
    String id,
    String status,
  ) async {
    await _run(
      context,
      ref,
      () => ref.read(ncrActionsProvider).updateCapaStatus(report, id, status),
      success: 'تم تحديث حالة الإجراء.',
    );
  }

  Future<void> _openHoldForm(BuildContext context, WidgetRef ref) async {
    final repo = ref.read(ncrRepositoryProvider);
    final holdMaps = await repo.fetchHoldLogMaps(report.id);
    final remaining = NcrWorkflow.remainingQty(report, holdMaps);
    if (remaining <= 0) {
      if (context.mounted) {
        showErrorSnack(context, 'لا توجد كمية متبقية للفرز.');
      }
      return;
    }
    if (!context.mounted) return;
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => HoldSortForm(report: report, remainingQty: remaining),
    );
    if (result == true && context.mounted) {
      showSuccessSnack(context, 'تم تسجيل الفرز.');
    }
  }

  Future<void> _saveVerification(BuildContext context, WidgetRef ref) async {
    final result = await showDialog<_VerificationResult>(
      context: context,
      builder: (_) => const _VerificationDialog(),
    );
    if (!context.mounted || result == null) return;
    await _run(
      context,
      ref,
      () => ref
          .read(ncrActionsProvider)
          .saveVerification(report, result: result.result, notes: result.notes),
      success: 'تم حفظ نتيجة التحقق.',
    );
  }

  Future<void> _close(BuildContext context, WidgetRef ref) async {
    final ok = await confirmDialog(
      context,
      title: 'إغلاق الحالة',
      message: 'هل أنت متأكد من إغلاق الحالة نهائياً؟',
      confirmColor: AppTheme.statusClosed,
    );
    if (!context.mounted || !ok) return;
    await _run(
      context,
      ref,
      () => ref.read(ncrActionsProvider).close(report),
      success: 'تم إغلاق الحالة بنجاح.',
    );
  }

  Future<void> _run(
    BuildContext context,
    WidgetRef ref,
    Future<dynamic> Function() op, {
    required String success,
  }) async {
    try {
      await op();
      if (context.mounted) showSuccessSnack(context, success);
    } catch (e) {
      if (context.mounted) showErrorSnack(context, e);
    }
  }

  // ===========================================================================
  // SMALL UI HELPERS
  // ===========================================================================

  Widget _actionButton(
    String label,
    IconData icon,
    VoidCallback onTap, {
    Color? color,
  }) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        style: color != null
            ? ElevatedButton.styleFrom(backgroundColor: color)
            : null,
        onPressed: onTap,
        icon: Icon(icon),
        label: Text(label),
      ),
    );
  }

  Widget _infoBox(String title, String body) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: Colors.grey.shade100,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        ),
        const SizedBox(height: 4),
        Text(body),
      ],
    ),
  );

  Widget _noPermissionNote() => Text(
    'ليس لديك صلاحية لتنفيذ إجراء في هذه المرحلة.',
    style: TextStyle(color: Colors.grey.shade600),
  );

  Widget _closedBanner() => Card(
    color: AppTheme.statusClosed.withValues(alpha: 0.08),
    child: const Padding(
      padding: EdgeInsets.all(16),
      child: Row(
        children: [
          Icon(Icons.check_circle, color: AppTheme.statusClosed),
          SizedBox(width: 10),
          Text(
            'تم إغلاق هذه الحالة.',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: AppTheme.statusClosed,
            ),
          ),
        ],
      ),
    ),
  );

  Future<String?> _promptText(
    BuildContext context, {
    required String title,
    required String hint,
    String? initial,
    bool multiline = false,
  }) {
    final ctrl = TextEditingController(text: initial ?? '');
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          maxLines: multiline ? 5 : 1,
          decoration: InputDecoration(hintText: hint),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('إلغاء'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(ctrl.text),
            child: const Text('حفظ'),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// CAPA add form (bottom sheet)
// =============================================================================
class _CapaForm extends ConsumerStatefulWidget {
  const _CapaForm();

  @override
  ConsumerState<_CapaForm> createState() => _CapaFormState();
}

class _CapaFormState extends ConsumerState<_CapaForm> {
  final _formKey = GlobalKey<FormState>();
  String _type = 'corrective';
  final _descCtrl = TextEditingController();
  RefItem? _responsibleDept;
  RefItem? _responsiblePerson;
  DateTime? _targetDate;

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final departmentsAsync = ref.watch(departmentsProvider);
    final usersAsync = ref.watch(usersProvider);
    final departments = departmentsAsync.valueOrNull ?? const <RefItem>[];
    final users = usersAsync.valueOrNull ?? const <RefItem>[];
    bool matchesResponsibleDepartment(RefItem user) {
      if (_responsibleDept == null) return false;
      final extra = user.extra ?? const <String, dynamic>{};
      final deptName = extra['department']?.toString();
      final selectedDeptNameAr = _responsibleDept!.extra?['name_ar']
          ?.toString();
      return extra['department_id']?.toString() == _responsibleDept!.id ||
          deptName == _responsibleDept!.name ||
          (selectedDeptNameAr != null && deptName == selectedDeptNameAr);
    }

    final visibleUsers = _responsibleDept == null
        ? users
        : [
            ...users.where(matchesResponsibleDepartment),
            ...users.where((user) => !matchesResponsibleDepartment(user)),
          ];

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'إضافة إجراء CAPA',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: _type,
                  decoration: const InputDecoration(labelText: 'النوع'),
                  items: Labels.capaTypeNames.entries
                      .map(
                        (e) => DropdownMenuItem(
                          value: e.key,
                          child: Text(e.value),
                        ),
                      )
                      .toList(),
                  onChanged: (v) => setState(() => _type = v ?? 'corrective'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _descCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'وصف الإجراء *'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'الوصف مطلوب' : null,
                ),
                const SizedBox(height: 12),
                _RefPickerField(
                  label: 'القسم المسؤول',
                  value: _responsibleDept,
                  items: departments,
                  loading: departmentsAsync.isLoading,
                  emptyText: 'لا توجد أقسام متاحة',
                  onChanged: (item) => setState(() {
                    _responsibleDept = item;
                    final personDeptId = _responsiblePerson
                        ?.extra?['department_id']
                        ?.toString();
                    final personDept = _responsiblePerson?.extra?['department']
                        ?.toString();
                    final sameDepartment =
                        item == null ||
                        personDeptId == item.id ||
                        personDept == item.name;
                    if (!sameDepartment) _responsiblePerson = null;
                  }),
                ),
                const SizedBox(height: 12),
                _RefPickerField(
                  label: 'الشخص المسؤول',
                  value: _responsiblePerson,
                  items: visibleUsers,
                  loading: usersAsync.isLoading,
                  emptyText: 'لا يوجد موظفون متاحون في دليل HR',
                  onChanged: (item) => setState(() {
                    _responsiblePerson = item;
                    final deptId = item?.extra?['department_id']?.toString();
                    if (_responsibleDept == null && deptId != null) {
                      for (final dept in departments) {
                        if (dept.id == deptId) {
                          _responsibleDept = dept;
                          break;
                        }
                      }
                    }
                  }),
                ),
                const SizedBox(height: 12),
                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now(),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                      locale: const Locale('ar'),
                    );
                    if (picked != null) setState(() => _targetDate = picked);
                  },
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'الموعد المستهدف',
                    ),
                    child: Text(
                      _targetDate == null
                          ? 'اختر تاريخاً'
                          : _targetDate!.toIso8601String().split('T').first,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _submit,
                    child: const Text('إضافة'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    final action = CapaAction(
      id:
          UniqueKey().toString() +
          DateTime.now().millisecondsSinceEpoch.toString(),
      type: _type,
      description: _descCtrl.text.trim(),
      responsibleDeptId: _responsibleDept?.id,
      responsibleDept: _responsibleDept?.name,
      responsiblePersonId: _responsiblePerson?.id,
      responsiblePerson: _responsiblePerson?.name,
      targetDate: _targetDate?.toIso8601String().split('T').first,
      status: 'pending',
    );
    Navigator.of(context).pop(action);
  }
}

class _RefPickerField extends StatelessWidget {
  const _RefPickerField({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    required this.emptyText,
    this.loading = false,
  });

  final String label;
  final RefItem? value;
  final List<RefItem> items;
  final ValueChanged<RefItem?> onChanged;
  final String emptyText;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: loading
          ? null
          : () async {
              final selected = await _showRefPicker(
                context,
                title: label,
                items: items,
                emptyText: emptyText,
              );
              if (selected != _noChange) onChanged(selected as RefItem?);
            },
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          suffixIcon: loading
              ? const Padding(
                  padding: EdgeInsets.all(14),
                  child: SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              : const Icon(Icons.arrow_drop_down),
        ),
        child: Text(
          value?.name ?? 'اختر من القائمة',
          style: TextStyle(color: value == null ? Colors.grey.shade600 : null),
        ),
      ),
    );
  }
}

final Object _noChange = Object();
final Object _clearSelection = Object();

Future<Object?> _showRefPicker(
  BuildContext context, {
  required String title,
  required List<RefItem> items,
  required String emptyText,
}) {
  final searchCtrl = TextEditingController();
  return showModalBottomSheet<Object?>(
    context: context,
    isScrollControlled: true,
    builder: (context) {
      return Directionality(
        textDirection: TextDirection.rtl,
        child: StatefulBuilder(
          builder: (context, setModalState) {
            final q = searchCtrl.text.trim().toLowerCase();
            final filtered = q.isEmpty
                ? items
                : items.where((item) {
                    final extra = item.extra ?? const <String, dynamic>{};
                    final haystack = [
                      item.name,
                      item.id,
                      extra['email'],
                      extra['department'],
                      extra['employee_code'],
                      extra['job_title_text'],
                      extra['employment_status'],
                    ].whereType<Object>().join(' ').toLowerCase();
                    return haystack.contains(q);
                  }).toList();

            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: SafeArea(
                child: SizedBox(
                  height: MediaQuery.of(context).size.height * 0.62,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              title,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          TextButton(
                            onPressed: () =>
                                Navigator.of(context).pop(_clearSelection),
                            child: const Text('مسح الاختيار'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: searchCtrl,
                        autofocus: true,
                        decoration: const InputDecoration(
                          labelText: 'بحث',
                          prefixIcon: Icon(Icons.search),
                        ),
                        onChanged: (_) => setModalState(() {}),
                      ),
                      const SizedBox(height: 12),
                      Expanded(
                        child: filtered.isEmpty
                            ? Center(child: Text(emptyText))
                            : ListView.separated(
                                itemCount: filtered.length,
                                separatorBuilder: (_, __) =>
                                    const Divider(height: 1),
                                itemBuilder: (context, index) {
                                  final item = filtered[index];
                                  final extra =
                                      item.extra ?? const <String, dynamic>{};
                                  final subtitle = [
                                    extra['employee_code'],
                                    extra['department'],
                                    extra['job_title_text'],
                                    extra['email'],
                                    extra['employment_status']?.toString() ==
                                            'inactive'
                                        ? 'غير نشط'
                                        : null,
                                  ].whereType<Object>().join(' | ');
                                  return ListTile(
                                    title: Text(item.name),
                                    subtitle: subtitle.isEmpty
                                        ? null
                                        : Text(subtitle),
                                    onTap: () =>
                                        Navigator.of(context).pop(item),
                                  );
                                },
                              ),
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
  ).whenComplete(searchCtrl.dispose).then((value) {
    if (value == _clearSelection) return null;
    return value ?? _noChange;
  });
}

// =============================================================================
// Verification dialog
// =============================================================================
class _VerificationResult {
  _VerificationResult(this.result, this.notes);
  final String result;
  final String? notes;
}

class _VerificationDialog extends StatefulWidget {
  const _VerificationDialog();

  @override
  State<_VerificationDialog> createState() => _VerificationDialogState();
}

class _VerificationDialogState extends State<_VerificationDialog> {
  String _result = 'success';
  final _notesCtrl = TextEditingController();

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('نتيجة التحقق'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          RadioGroup<String>(
            groupValue: _result,
            onChanged: (v) => setState(() => _result = v!),
            child: const Column(
              children: [
                RadioListTile<String>(value: 'success', title: Text('ناجح')),
                RadioListTile<String>(value: 'fail', title: Text('غير ناجح')),
              ],
            ),
          ),
          TextField(
            controller: _notesCtrl,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'ملاحظات'),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('إلغاء'),
        ),
        ElevatedButton(
          onPressed: () => Navigator.of(
            context,
          ).pop(_VerificationResult(_result, _notesCtrl.text.trim())),
          child: const Text('حفظ'),
        ),
      ],
    );
  }
}
