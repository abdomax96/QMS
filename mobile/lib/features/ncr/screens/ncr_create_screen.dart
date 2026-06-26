import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/arabic_formatters.dart';
import '../../../core/utils/labels.dart';
import '../../../core/utils/network_status.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../company/providers/company_provider.dart';
import '../../settings/models/system_settings.dart';
import '../../settings/providers/settings_provider.dart';
import '../data/ncr_repository.dart';
import '../models/ncr_workflow.dart';
import '../providers/ncr_actions_provider.dart';
import '../providers/ncr_provider.dart';

class NcrCreateScreen extends ConsumerStatefulWidget {
  const NcrCreateScreen({super.key});

  @override
  ConsumerState<NcrCreateScreen> createState() => _NcrCreateScreenState();
}

class _NcrCreateScreenState extends ConsumerState<NcrCreateScreen> {
  final _formKey = GlobalKey<FormState>();

  DateTime _date = DateTime.now();
  String? _shift;
  String? _department;
  String _defectType = 'product';
  String? _defectId;
  String? _product;
  String? _lineOrArea;
  String? _materialReceivingId;
  String? _materialName;
  String _severity = 'medium';
  int _occurrence = 5;
  int _detection = 5;
  String? _reservedUnit;
  String? _documentId;
  String? _documentTitle;

  final _titleCtrl = TextEditingController();
  final _discoveredByCtrl = TextEditingController();
  final _descriptionCtrl = TextEditingController();
  final _immediateActionCtrl = TextEditingController();
  final _reservedQtyCtrl = TextEditingController();

  bool _saving = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _discoveredByCtrl.dispose();
    _descriptionCtrl.dispose();
    _immediateActionCtrl.dispose();
    _reservedQtyCtrl.dispose();
    super.dispose();
  }

  int get _rpn => NcrWorkflow.computeRpn(
        severity: _severity,
        occurrence: _occurrence,
        detection: _detection,
      );

  String get _riskBand => NcrWorkflow.riskBand(_rpn);

  Color get _riskColor {
    if (_rpn >= 150) return AppTheme.severityHigh;
    if (_rpn >= 100) return AppTheme.severityHigh.withValues(alpha: 0.8);
    if (_rpn >= 60) return AppTheme.severityMedium;
    return AppTheme.severityLow;
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
      locale: const Locale('ar'),
    );
    if (picked != null) setState(() => _date = picked);
  }

  NcrCreateInput? _buildInput(String companyId) {
    if (!_formKey.currentState!.validate()) return null;
    if (_department == null) {
      showErrorSnack(context, 'يرجى اختيار القسم.');
      return null;
    }
    return NcrCreateInput(
      companyId: companyId,
      date: _date,
      shift: _shift,
      department: _department!,
      defectType: _defectType,
      defectId: _defectId,
      productName: _defectType == 'product' ? _product : null,
      lineOrArea: _defectType == 'process' ? _lineOrArea : null,
      relatedMaterialReceivingId:
          _defectType == 'raw_material' ? _materialReceivingId : null,
      relatedMaterialName:
          _defectType == 'raw_material' ? _materialName : null,
      reservedQty: ArabicFormatters.isoDate(_date).isEmpty
          ? null
          : num.tryParse(_reservedQtyCtrl.text.trim()),
      reservedUnit: _reservedUnit,
      severity: _severity,
      occurrence: _occurrence,
      detection: _detection,
      discoveredBy: _discoveredByCtrl.text.trim(),
      description: _descriptionCtrl.text.trim(),
      immediateAction: _immediateActionCtrl.text.trim().isEmpty
          ? null
          : _immediateActionCtrl.text.trim(),
      documentId: _documentId,
      documentTitle: _documentTitle,
      title: _titleCtrl.text.trim().isEmpty ? null : _titleCtrl.text.trim(),
    );
  }

  Future<void> _save() async {
    final companyId = ref.read(selectedCompanyIdProvider);
    if (companyId == null) {
      showErrorSnack(context, 'يرجى اختيار الشركة أولاً.');
      return;
    }
    final input = _buildInput(companyId);
    if (input == null) return;

    final online = await ref.read(networkStatusProvider).isOnline;
    if (!online) {
      await _saveOffline(companyId, input);
      return;
    }

    setState(() => _saving = true);
    try {
      final report = await ref.read(ncrActionsProvider).createReport(input);
      if (!mounted) return;
      showSuccessSnack(context, 'تم إنشاء التقرير ${report.number}');
      context.go('/ncr/details/${report.id}');
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _saveOffline(String companyId, NcrCreateInput input) async {
    final data = {
      'date': input.date.toIso8601String(),
      'shift': input.shift,
      'department': input.department,
      'defect_type': input.defectType,
      'defect_id': input.defectId,
      'product_name': input.productName,
      'line_or_area': input.lineOrArea,
      'reserved_qty': input.reservedQty,
      'reserved_unit': input.reservedUnit,
      'severity': input.severity,
      'occurrence': input.occurrence,
      'detection': input.detection,
      'discovered_by': input.discoveredBy,
      'description': input.description,
      'immediate_action': input.immediateAction,
      'title': input.title,
    };
    await ref
        .read(draftRepositoryProvider)
        .addDraft(companyId: companyId, data: data);
    ref.invalidate(draftsProvider);
    if (!mounted) return;
    showSuccessSnack(
        context, 'لا يوجد اتصال — تم حفظ التقرير كمسودة غير متزامنة.');
    context.go('/drafts');
  }

  @override
  Widget build(BuildContext context) {
    final departments = ref.watch(departmentsProvider);
    final defects = ref.watch(defectCatalogProvider);
    final products = ref.watch(productsProvider);
    final lines = ref.watch(productionLinesProvider);
    final materials = ref.watch(materialReceivingProvider);
    final units = ref.watch(unitsProvider);
    final docs = ref.watch(referenceDocumentsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('تقرير عدم مطابقة جديد')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(12),
          children: [
            _section('البيانات الأساسية'),
            _dateField(),
            _shiftField(),
            _deptField(departments),
            _defectTypeField(),
            _defectCatalogField(defects),
            if (_defectType == 'product') _productField(products),
            if (_defectType == 'process') _lineField(lines),
            if (_defectType == 'raw_material') _materialField(materials),
            const SizedBox(height: 8),
            _section('الكمية المحتجزة'),
            _reservedRow(units),
            const SizedBox(height: 8),
            _section('تقييم المخاطر'),
            _severityField(),
            _scoreSlider('معدل التكرار (Occurrence)', _occurrence,
                (v) => setState(() => _occurrence = v)),
            _scoreSlider('قابلية الاكتشاف (Detection)', _detection,
                (v) => setState(() => _detection = v)),
            _rpnCard(),
            const SizedBox(height: 8),
            _section('التفاصيل'),
            _textField(_titleCtrl, 'عنوان مختصر (اختياري)', required: false),
            _textField(_discoveredByCtrl, 'مكتشف الحالة'),
            _descriptionField(),
            _textField(_immediateActionCtrl, 'الإجراء الفوري (اختياري)',
                required: false, maxLines: 2),
            const SizedBox(height: 8),
            _section('الوثيقة المرجعية (اختياري)'),
            _documentField(docs),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _saving ? null : _save,
              icon: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.save),
              label: Text(_saving ? 'جاري الحفظ...' : 'حفظ التقرير'),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _section(String title) => Padding(
        padding: const EdgeInsets.fromLTRB(4, 14, 4, 8),
        child: Text(title,
            style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppTheme.primary)),
      );

  Widget _dateField() => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: InkWell(
          onTap: _pickDate,
          child: InputDecorator(
            decoration: const InputDecoration(
              labelText: 'التاريخ',
              prefixIcon: Icon(Icons.calendar_today_outlined),
            ),
            child: Text(ArabicFormatters.date(_date)),
          ),
        ),
      );

  Widget _shiftField() => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: DropdownButtonFormField<String>(
          initialValue: _shift,
          decoration: const InputDecoration(
            labelText: 'الوردية (اختياري)',
            prefixIcon: Icon(Icons.schedule),
          ),
          items: [
            const DropdownMenuItem(value: null, child: Text('غير محدد')),
            ...Labels.shifts.map(
              (s) => DropdownMenuItem(value: s, child: Text('وردية $s')),
            ),
          ],
          onChanged: (v) => setState(() => _shift = v),
        ),
      );

  Widget _deptField(AsyncValue<List<RefItem>> depts) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: depts.when(
          loading: () => const LinearProgressIndicator(),
          error: (_, __) => _freeTextDept(),
          data: (list) {
            if (list.isEmpty) return _freeTextDept();
            return DropdownButtonFormField<String>(
              initialValue: _department,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'القسم *',
                prefixIcon: Icon(Icons.apartment),
              ),
              items: list
                  .map((d) =>
                      DropdownMenuItem(value: d.name, child: Text(d.name)))
                  .toList(),
              validator: (v) =>
                  (v == null || v.isEmpty) ? 'القسم مطلوب' : null,
              onChanged: (v) => setState(() => _department = v),
            );
          },
        ),
      );

  Widget _freeTextDept() => TextFormField(
        decoration: const InputDecoration(
          labelText: 'القسم *',
          prefixIcon: Icon(Icons.apartment),
        ),
        validator: (v) => (v == null || v.trim().isEmpty) ? 'القسم مطلوب' : null,
        onChanged: (v) => _department = v.trim(),
      );

  Widget _defectTypeField() => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: DropdownButtonFormField<String>(
          initialValue: _defectType,
          decoration: const InputDecoration(
            labelText: 'نوع العيب *',
            prefixIcon: Icon(Icons.category_outlined),
          ),
          items: Labels.defectTypeNames.entries
              .map((e) =>
                  DropdownMenuItem(value: e.key, child: Text(e.value)))
              .toList(),
          onChanged: (v) => setState(() {
            _defectType = v ?? 'product';
            _defectId = null;
          }),
        ),
      );

  Widget _defectCatalogField(AsyncValue<List<DefectCatalogItem>> defects) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: defects.when(
        loading: () => const SizedBox.shrink(),
        error: (_, __) => const SizedBox.shrink(),
        data: (list) {
          final filtered = list
              .where((d) =>
                  d.defectType == null || d.defectType == _defectType)
              .toList();
          if (filtered.isEmpty) return const SizedBox.shrink();
          return DropdownButtonFormField<String>(
            initialValue: _defectId,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'العيب من الكتالوج (اختياري)',
              prefixIcon: Icon(Icons.bug_report_outlined),
            ),
            items: [
              const DropdownMenuItem(value: null, child: Text('بدون')),
              ...filtered.map(
                (d) => DropdownMenuItem(value: d.id, child: Text(d.name)),
              ),
            ],
            onChanged: (v) => setState(() => _defectId = v),
          );
        },
      ),
    );
  }

  Widget _productField(AsyncValue<List<RefItem>> products) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: products.when(
          loading: () => const SizedBox.shrink(),
          error: (_, __) => _freeText('المنتج', (v) => _product = v),
          data: (list) {
            if (list.isEmpty) {
              return _freeText('المنتج', (v) => _product = v);
            }
            return DropdownButtonFormField<String>(
              initialValue: _product,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'المنتج',
                prefixIcon: Icon(Icons.inventory_2_outlined),
              ),
              items: list
                  .map((p) =>
                      DropdownMenuItem(value: p.name, child: Text(p.name)))
                  .toList(),
              onChanged: (v) => setState(() => _product = v),
            );
          },
        ),
      );

  Widget _lineField(AsyncValue<List<RefItem>> lines) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: lines.when(
          loading: () => const SizedBox.shrink(),
          error: (_, __) =>
              _freeText('الخط أو المنطقة', (v) => _lineOrArea = v),
          data: (list) {
            if (list.isEmpty) {
              return _freeText('الخط أو المنطقة', (v) => _lineOrArea = v);
            }
            return DropdownButtonFormField<String>(
              initialValue: _lineOrArea,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'الخط أو المنطقة',
                prefixIcon: Icon(Icons.linear_scale),
              ),
              items: list
                  .map((l) =>
                      DropdownMenuItem(value: l.name, child: Text(l.name)))
                  .toList(),
              onChanged: (v) => setState(() => _lineOrArea = v),
            );
          },
        ),
      );

  Widget _materialField(AsyncValue<List<RefItem>> materials) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: materials.when(
          loading: () => const SizedBox.shrink(),
          error: (_, __) =>
              _freeText('اسم الخامة', (v) => _materialName = v),
          data: (list) {
            if (list.isEmpty) {
              return _freeText('اسم الخامة', (v) => _materialName = v);
            }
            return DropdownButtonFormField<String>(
              initialValue: _materialReceivingId,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'استلام الخامة',
                prefixIcon: Icon(Icons.local_shipping_outlined),
              ),
              items: list
                  .map((m) =>
                      DropdownMenuItem(value: m.id, child: Text(m.name)))
                  .toList(),
              onChanged: (v) => setState(() {
                _materialReceivingId = v;
                _materialName =
                    list.firstWhere((e) => e.id == v).name;
              }),
            );
          },
        ),
      );

  Widget _reservedRow(AsyncValue<List<String>> units) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 2,
              child: TextFormField(
                controller: _reservedQtyCtrl,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'الكمية المحجوزة',
                  prefixIcon: Icon(Icons.scale_outlined),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              flex: 2,
              child: units.maybeWhen(
                data: (list) => list.isEmpty
                    ? _freeText('الوحدة', (v) => _reservedUnit = v)
                    : DropdownButtonFormField<String>(
                        initialValue: _reservedUnit,
                        isExpanded: true,
                        decoration:
                            const InputDecoration(labelText: 'الوحدة'),
                        items: list
                            .map((u) => DropdownMenuItem(
                                value: u, child: Text(u)))
                            .toList(),
                        onChanged: (v) => setState(() => _reservedUnit = v),
                      ),
                orElse: () => _freeText('الوحدة', (v) => _reservedUnit = v),
              ),
            ),
          ],
        ),
      );

  Widget _severityField() => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: DropdownButtonFormField<String>(
          initialValue: _severity,
          decoration: const InputDecoration(
            labelText: 'الشدة *',
            prefixIcon: Icon(Icons.warning_amber_rounded),
          ),
          items: Labels.severityNames.entries
              .map((e) =>
                  DropdownMenuItem(value: e.key, child: Text(e.value)))
              .toList(),
          onChanged: (v) => setState(() => _severity = v ?? 'medium'),
        ),
      );

  Widget _scoreSlider(String label, int value, ValueChanged<int> onChanged) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label),
              Text('$value',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          Slider(
            value: value.toDouble(),
            min: 1,
            max: 10,
            divisions: 9,
            label: '$value',
            onChanged: (v) => onChanged(v.round()),
          ),
        ],
      ),
    );
  }

  Widget _rpnCard() => Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _riskColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _riskColor.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            Icon(Icons.analytics_outlined, color: _riskColor, size: 32),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('RPN = $_rpn',
                      style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: _riskColor)),
                  Text('مستوى الخطورة: $_riskBand',
                      style: TextStyle(color: _riskColor)),
                ],
              ),
            ),
          ],
        ),
      );

  Widget _descriptionField() => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: TextFormField(
          controller: _descriptionCtrl,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'الوصف *',
            alignLabelWithHint: true,
            prefixIcon: Icon(Icons.description_outlined),
          ),
          validator: (v) {
            final text = v?.trim() ?? '';
            if (text.isEmpty) return 'الوصف مطلوب';
            if (text.length < 10) return 'الوصف يجب ألا يقل عن 10 أحرف';
            return null;
          },
        ),
      );

  Widget _documentField(AsyncValue<List<dynamic>> docs) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: docs.maybeWhen(
          data: (list) {
            if (list.isEmpty) {
              return const Text('لا توجد وثائق معتمدة متاحة.',
                  style: TextStyle(color: Colors.grey));
            }
            return DropdownButtonFormField<String>(
              initialValue: _documentId,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'وثيقة SOP/WI',
                prefixIcon: Icon(Icons.menu_book_outlined),
              ),
              items: [
                const DropdownMenuItem(value: null, child: Text('بدون')),
                ...list.map((d) => DropdownMenuItem(
                      value: d.id as String,
                      child: Text(d.displayLabel as String,
                          overflow: TextOverflow.ellipsis),
                    )),
              ],
              onChanged: (v) => setState(() {
                _documentId = v;
                if (v == null) {
                  _documentTitle = null;
                } else {
                  final doc = list.firstWhere((e) => e.id == v);
                  _documentTitle = doc.displayLabel as String;
                }
              }),
            );
          },
          orElse: () => const SizedBox.shrink(),
        ),
      );

  Widget _textField(TextEditingController ctrl, String label,
      {bool required = true, int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: TextFormField(
        controller: ctrl,
        maxLines: maxLines,
        decoration: InputDecoration(labelText: label),
        validator: required
            ? (v) => (v == null || v.trim().isEmpty) ? 'هذا الحقل مطلوب' : null
            : null,
      ),
    );
  }

  Widget _freeText(String label, ValueChanged<String> onChanged) =>
      TextFormField(
        decoration: InputDecoration(labelText: label),
        onChanged: onChanged,
      );
}
