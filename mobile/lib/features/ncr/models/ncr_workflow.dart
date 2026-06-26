import '../../../core/utils/labels.dart';
import 'ncr_models.dart';

/// Result of validating whether a transition is allowed.
class TransitionCheck {
  TransitionCheck({required this.allowed, this.reason});
  final bool allowed;
  final String? reason;

  static TransitionCheck ok() => TransitionCheck(allowed: true);
  static TransitionCheck fail(String reason) =>
      TransitionCheck(allowed: false, reason: reason);
}

/// Pure functions for NCR workflow computations. Side-effect free & testable.
class NcrWorkflow {
  NcrWorkflow._();

  /// RPN = severityWeight * occurrence * detection
  /// severity weights: high=10, medium=5, low=2
  static int computeRpn({
    required String? severity,
    required int occurrence,
    required int detection,
  }) {
    final weight = Labels.severityWeight(severity);
    return weight * occurrence * detection;
  }

  /// risk band per rpn thresholds.
  /// >=150 حرج, >=100 مرتفع, >=60 متوسط, else منخفض
  static String riskBand(num rpn) => Labels.riskBand(rpn);

  /// Remaining held quantity = max(0, reservedQty - sum(sorted_qty)).
  static num remainingQty(NcrReport ncr, List<Map<String, dynamic>> holdLogs) {
    final reserved = (ncr.reservedQty ?? 0).toDouble();
    double sorted = 0;
    for (final log in holdLogs) {
      final v = log['sorted_qty'];
      if (v is num) {
        sorted += v.toDouble();
      } else {
        sorted += double.tryParse(v?.toString() ?? '') ?? 0;
      }
    }
    final remaining = reserved - sorted;
    return remaining < 0 ? 0 : remaining;
  }

  /// Validates whether the NCR can advance to the next stage based on
  /// data-completeness rules (NOT permission rules; permissions are separate).
  static TransitionCheck canAdvance(NcrReport ncr) {
    final next = Labels.nextStage(ncr.currentStage);
    if (next == null) {
      return TransitionCheck.fail('هذه آخر مرحلة، لا يمكن التقدم أكثر.');
    }
    switch (ncr.currentStage) {
      case 'initial_report':
        if ((ncr.description ?? '').trim().isEmpty) {
          return TransitionCheck.fail('الوصف مطلوب قبل الانتقال.');
        }
        if ((ncr.department ?? '').trim().isEmpty) {
          return TransitionCheck.fail('القسم مطلوب قبل الانتقال.');
        }
        if ((ncr.severity ?? '').trim().isEmpty) {
          return TransitionCheck.fail('الشدة مطلوبة قبل الانتقال.');
        }
        return TransitionCheck.ok();

      case 'root_cause_analysis':
        if (ncr.rootCauseApproval?.isApproved != true) {
          return TransitionCheck.fail(
              'يجب اعتماد السبب الجذري قبل الانتقال.');
        }
        return TransitionCheck.ok();

      case 'capa_planning':
        if (ncr.actions.isEmpty) {
          return TransitionCheck.fail(
              'يجب إضافة إجراء CAPA واحد على الأقل.');
        }
        return TransitionCheck.ok();

      case 'capa_execution':
        if (ncr.actions.isEmpty ||
            !ncr.actions.every((a) => a.isCompleted)) {
          return TransitionCheck.fail(
              'يجب اكتمال جميع إجراءات CAPA قبل الانتقال.');
        }
        return TransitionCheck.ok();

      case 'verification_closure':
        return TransitionCheck.fail('مرحلة نهائية لا تحتوي تقدماً.');

      default:
        return TransitionCheck.fail('مرحلة غير معروفة.');
    }
  }

  /// Validates whether the NCR can be closed.
  static TransitionCheck canClose(
    NcrReport ncr,
    List<Map<String, dynamic>> holdLogs,
  ) {
    if (ncr.currentStage != 'verification_closure') {
      return TransitionCheck.fail('الإغلاق متاح فقط في مرحلة التحقق والإغلاق.');
    }
    if (ncr.verification?.isSuccess != true) {
      return TransitionCheck.fail('نتيجة التحقق يجب أن تكون ناجحة للإغلاق.');
    }
    final remaining = remainingQty(ncr, holdLogs);
    if (remaining > 0) {
      return TransitionCheck.fail(
          'لا يمكن إغلاق الحالة طالما توجد كمية محتجزة متبقية.');
    }
    return TransitionCheck.ok();
  }

  /// Progress percentage (0..1) based on completed stages.
  static double progress(NcrReport ncr) {
    final idx = Labels.stageIndex(ncr.currentStage);
    if (idx < 0) return 0;
    if (ncr.isClosed) return 1;
    return idx / (Labels.stageOrder.length - 1);
  }
}
