/// Centralized Arabic labels for enums used across the NCR workflow.
class Labels {
  Labels._();

  // ---- Workflow stages (ordered) ----
  static const List<String> stageOrder = [
    'initial_report',
    'root_cause_analysis',
    'capa_planning',
    'capa_execution',
    'verification_closure',
  ];

  static const Map<String, String> stageNames = {
    'initial_report': 'التقرير الأولي',
    'root_cause_analysis': 'تحليل السبب الجذري',
    'capa_planning': 'تخطيط الإجراءات CAPA',
    'capa_execution': 'تنفيذ الإجراءات CAPA',
    'verification_closure': 'التحقق والإغلاق',
  };

  static String stage(String? code) =>
      stageNames[code] ?? (code ?? 'غير معروف');

  static int stageIndex(String? code) => stageOrder.indexOf(code ?? '');

  static String? nextStage(String? code) {
    final i = stageIndex(code);
    if (i < 0 || i >= stageOrder.length - 1) return null;
    return stageOrder[i + 1];
  }

  static String? previousStage(String? code) {
    final i = stageIndex(code);
    if (i <= 0) return null;
    return stageOrder[i - 1];
  }

  // ---- Status ----
  static const Map<String, String> statusNames = {
    'open': 'مفتوح',
    'in_progress': 'قيد التنفيذ',
    'pending_review': 'بانتظار المراجعة',
    'closed': 'مغلق',
    'cancelled': 'ملغي',
  };

  static String status(String? code) =>
      statusNames[code] ?? (code ?? 'غير معروف');

  // ---- Severity ----
  static const Map<String, String> severityNames = {
    'low': 'منخفضة',
    'medium': 'متوسطة',
    'high': 'عالية',
  };

  static String severity(String? code) =>
      severityNames[code] ?? (code ?? 'غير محدد');

  static int severityWeight(String? code) {
    switch (code) {
      case 'high':
        return 10;
      case 'medium':
        return 5;
      case 'low':
        return 2;
      default:
        return 0;
    }
  }

  // ---- Defect types ----
  static const Map<String, String> defectTypeNames = {
    'raw_material': 'مادة خام',
    'product': 'منتج',
    'process': 'عملية',
    'other': 'أخرى',
  };

  static String defectType(String? code) =>
      defectTypeNames[code] ?? (code ?? 'غير محدد');

  // ---- Shift ----
  static const List<String> shifts = ['A', 'B', 'C'];

  // ---- CAPA action type ----
  static const Map<String, String> capaTypeNames = {
    'corrective': 'تصحيحي',
    'preventive': 'وقائي',
  };

  static String capaType(String? code) =>
      capaTypeNames[code] ?? (code ?? '');

  // ---- CAPA status ----
  static const Map<String, String> capaStatusNames = {
    'pending': 'معلق',
    'in-progress': 'قيد التنفيذ',
    'completed': 'مكتمل',
  };

  static String capaStatus(String? code) =>
      capaStatusNames[code] ?? (code ?? '');

  // ---- Root cause approval status ----
  static const Map<String, String> approvalStatusNames = {
    'pending': 'بانتظار الموافقة',
    'approved': 'معتمد',
    'rejected': 'مرفوض',
  };

  static String approvalStatus(String? code) =>
      approvalStatusNames[code] ?? (code ?? '');

  // ---- Risk band ----
  static String riskBand(num rpn) {
    if (rpn >= 150) return 'حرج';
    if (rpn >= 100) return 'مرتفع';
    if (rpn >= 60) return 'متوسط';
    return 'منخفض';
  }

  // ---- Workflow action codes ----
  static const String actView = 'view';
  static const String actEdit = 'edit';
  static const String actDelete = 'delete';
  static const String actRootCausePropose = 'root_cause.propose';
  static const String actAssign = 'assign';
  static const String actApprove = 'approve';
  static const String actReleaseHold = 'release_hold';
  static const String actReject = 'reject';
  static const String actVerifyClose = 'verify_close';
  static const String actExport = 'export';
  static const String actReopen = 'reopen';
  static const String actCapaAdd = 'capa.add';
  static const String actCapaComplete = 'capa.complete';
  static const String actWorkflowProgress = 'workflow.progress';
}
