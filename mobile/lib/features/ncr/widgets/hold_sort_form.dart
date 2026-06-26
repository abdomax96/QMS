import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/arabic_formatters.dart';
import '../../../core/widgets/common_widgets.dart';
import '../models/ncr_models.dart';
import '../providers/ncr_actions_provider.dart';

/// Bottom sheet to register a sort/disposition of held quantity.
class HoldSortForm extends ConsumerStatefulWidget {
  const HoldSortForm({
    super.key,
    required this.report,
    required this.remainingQty,
  });

  final NcrReport report;
  final num remainingQty;

  @override
  ConsumerState<HoldSortForm> createState() => _HoldSortFormState();
}

class _HoldSortFormState extends ConsumerState<HoldSortForm> {
  final _formKey = GlobalKey<FormState>();
  final _sortedCtrl = TextEditingController();
  final _destroyedCtrl = TextEditingController(text: '0');
  final _notesCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _sortedCtrl.dispose();
    _destroyedCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final sorted = num.tryParse(_sortedCtrl.text.trim()) ?? 0;
    final destroyed = num.tryParse(_destroyedCtrl.text.trim()) ?? 0;

    setState(() => _saving = true);
    try {
      await ref.read(ncrActionsProvider).addHoldLog(
            widget.report,
            sortedQty: sorted,
            destroyedQty: destroyed,
            notes: _notesCtrl.text.trim().isEmpty
                ? null
                : _notesCtrl.text.trim(),
          );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('تسجيل فرز / تصرف',
                  style:
                      TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(
                'الكمية المتبقية المحتجزة: ${ArabicFormatters.number(widget.remainingQty)}',
                style: TextStyle(color: Colors.grey.shade700),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _sortedCtrl,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'الكمية المفروزة *',
                  prefixIcon: Icon(Icons.checklist),
                ),
                validator: (v) {
                  final val = num.tryParse(v?.trim() ?? '');
                  if (val == null || val <= 0) {
                    return 'يجب أن تكون أكبر من صفر';
                  }
                  if (val > widget.remainingQty) {
                    return 'تتجاوز الكمية المتبقية';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _destroyedCtrl,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'الكمية المتلفة',
                  prefixIcon: Icon(Icons.delete_outline),
                ),
                validator: (v) {
                  final val = num.tryParse(v?.trim() ?? '') ?? 0;
                  final sorted = num.tryParse(_sortedCtrl.text.trim()) ?? 0;
                  if (val < 0) return 'لا يمكن أن تكون سالبة';
                  if (val > sorted) return 'لا تتجاوز كمية الفرز';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _notesCtrl,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'ملاحظات (اختياري)',
                  prefixIcon: Icon(Icons.note_outlined),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _saving ? null : _submit,
                icon: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save),
                label: const Text('حفظ السجل'),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}
