import '../../../core/utils/arabic_formatters.dart';
import '../../../core/utils/json_utils.dart';

/// A CAPA (Corrective And Preventive Action) entry inside `actions` JSON.
class CapaAction {
  CapaAction({
    required this.id,
    required this.type,
    required this.description,
    this.responsibleDeptId,
    this.responsibleDept,
    this.responsiblePersonId,
    this.responsiblePerson,
    this.targetDate,
    this.status = 'pending',
  });

  final String id;
  final String type; // corrective | preventive
  final String description;
  final String? responsibleDeptId;
  final String? responsibleDept;
  final String? responsiblePersonId;
  final String? responsiblePerson;
  final String? targetDate; // YYYY-MM-DD
  final String status; // pending | in-progress | completed

  bool get isCompleted => status == 'completed';

  factory CapaAction.fromMap(Map<String, dynamic> map) {
    return CapaAction(
      id: JsonUtils.asString(map['id']),
      type: JsonUtils.asString(map['type'], 'corrective'),
      description: JsonUtils.asString(map['description']),
      responsibleDeptId: JsonUtils.asStringOrNull(map['responsibleDeptId']),
      responsibleDept: JsonUtils.asStringOrNull(map['responsibleDept']),
      responsiblePersonId:
          JsonUtils.asStringOrNull(map['responsiblePersonId']),
      responsiblePerson: JsonUtils.asStringOrNull(map['responsiblePerson']),
      targetDate: JsonUtils.asStringOrNull(map['targetDate']),
      status: JsonUtils.asString(map['status'], 'pending'),
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'type': type,
        'description': description,
        'responsibleDeptId': responsibleDeptId,
        'responsibleDept': responsibleDept,
        'responsiblePersonId': responsiblePersonId,
        'responsiblePerson': responsiblePerson,
        'targetDate': targetDate,
        'status': status,
      };

  CapaAction copyWith({String? status}) => CapaAction(
        id: id,
        type: type,
        description: description,
        responsibleDeptId: responsibleDeptId,
        responsibleDept: responsibleDept,
        responsiblePersonId: responsiblePersonId,
        responsiblePerson: responsiblePerson,
        targetDate: targetDate,
        status: status ?? this.status,
      );
}

/// Root cause approval object.
class RootCauseApproval {
  RootCauseApproval({
    this.proposedBy,
    this.proposedByName,
    this.proposedByEmail,
    this.proposedByRole,
    this.proposedAt,
    this.rootCauseText,
    this.status = 'pending',
    this.reviewedBy,
    this.reviewedByName,
    this.reviewedByEmail,
    this.reviewedByRole,
    this.reviewedAt,
    this.rejectionReason,
  });

  final String? proposedBy;
  final String? proposedByName;
  final String? proposedByEmail;
  final String? proposedByRole;
  final String? proposedAt;
  final String? rootCauseText;
  final String status; // pending | approved | rejected
  final String? reviewedBy;
  final String? reviewedByName;
  final String? reviewedByEmail;
  final String? reviewedByRole;
  final String? reviewedAt;
  final String? rejectionReason;

  bool get isApproved => status == 'approved';
  bool get isRejected => status == 'rejected';

  factory RootCauseApproval.fromMap(Map<String, dynamic> map) {
    return RootCauseApproval(
      proposedBy: JsonUtils.asStringOrNull(map['proposedBy']),
      proposedByName: JsonUtils.asStringOrNull(map['proposedByName']),
      proposedByEmail: JsonUtils.asStringOrNull(map['proposedByEmail']),
      proposedByRole: JsonUtils.asStringOrNull(map['proposedByRole']),
      proposedAt: JsonUtils.asStringOrNull(map['proposedAt']),
      rootCauseText: JsonUtils.asStringOrNull(map['rootCauseText']),
      status: JsonUtils.asString(map['status'], 'pending'),
      reviewedBy: JsonUtils.asStringOrNull(map['reviewedBy']),
      reviewedByName: JsonUtils.asStringOrNull(map['reviewedByName']),
      reviewedByEmail: JsonUtils.asStringOrNull(map['reviewedByEmail']),
      reviewedByRole: JsonUtils.asStringOrNull(map['reviewedByRole']),
      reviewedAt: JsonUtils.asStringOrNull(map['reviewedAt']),
      rejectionReason: JsonUtils.asStringOrNull(map['rejectionReason']),
    );
  }

  Map<String, dynamic> toMap() => {
        'proposedBy': proposedBy,
        'proposedByName': proposedByName,
        'proposedByEmail': proposedByEmail,
        'proposedByRole': proposedByRole,
        'proposedAt': proposedAt,
        'rootCauseText': rootCauseText,
        'status': status,
        if (reviewedBy != null) 'reviewedBy': reviewedBy,
        if (reviewedByName != null) 'reviewedByName': reviewedByName,
        if (reviewedByEmail != null) 'reviewedByEmail': reviewedByEmail,
        if (reviewedByRole != null) 'reviewedByRole': reviewedByRole,
        if (reviewedAt != null) 'reviewedAt': reviewedAt,
        if (rejectionReason != null) 'rejectionReason': rejectionReason,
      };
}

/// Verification object.
class Verification {
  Verification({
    this.verifiedBy,
    this.date,
    this.notes,
    this.result,
  });

  final String? verifiedBy;
  final String? date;
  final String? notes;
  final String? result; // success | fail

  bool get isSuccess => result == 'success';

  factory Verification.fromMap(Map<String, dynamic> map) {
    return Verification(
      verifiedBy: JsonUtils.asStringOrNull(map['verifiedBy']),
      date: JsonUtils.asStringOrNull(map['date']),
      notes: JsonUtils.asStringOrNull(map['notes']),
      result: JsonUtils.asStringOrNull(map['result']),
    );
  }

  Map<String, dynamic> toMap() => {
        'verifiedBy': verifiedBy,
        'date': date,
        'notes': notes,
        'result': result,
      };
}

/// An attachment reference stored inside `attachments` JSON.
class NcrAttachment {
  NcrAttachment({
    required this.id,
    required this.fileName,
    required this.storagePath,
    this.downloadURL,
    this.uploadedAt,
  });

  final String id;
  final String fileName;
  final String storagePath;
  final String? downloadURL;
  final String? uploadedAt;

  factory NcrAttachment.fromMap(Map<String, dynamic> map) {
    return NcrAttachment(
      id: JsonUtils.asString(map['id']),
      fileName: JsonUtils.asString(map['fileName']),
      storagePath: JsonUtils.asString(map['storagePath']),
      downloadURL: JsonUtils.asStringOrNull(map['downloadURL']),
      uploadedAt: JsonUtils.asStringOrNull(map['uploadedAt']),
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'fileName': fileName,
        'storagePath': storagePath,
        'downloadURL': downloadURL,
        'uploadedAt': uploadedAt,
      };
}

/// A single stage transition record.
class StageHistoryEntry {
  StageHistoryEntry({
    this.from,
    this.to,
    this.transitionedBy,
    this.transitionedByName,
    this.transitionedByEmail,
    this.transitionedAt,
    this.notes,
  });

  final String? from;
  final String? to;
  final String? transitionedBy;
  final String? transitionedByName;
  final String? transitionedByEmail;
  final String? transitionedAt;
  final String? notes;

  factory StageHistoryEntry.fromMap(Map<String, dynamic> map) {
    return StageHistoryEntry(
      from: JsonUtils.asStringOrNull(map['from']),
      to: JsonUtils.asStringOrNull(map['to']),
      transitionedBy: JsonUtils.asStringOrNull(map['transitionedBy']),
      transitionedByName: JsonUtils.asStringOrNull(map['transitionedByName']),
      transitionedByEmail:
          JsonUtils.asStringOrNull(map['transitionedByEmail']),
      transitionedAt: JsonUtils.asStringOrNull(map['transitionedAt']),
      notes: JsonUtils.asStringOrNull(map['notes']),
    );
  }

  Map<String, dynamic> toMap() => {
        'from': from,
        'to': to,
        'transitionedBy': transitionedBy,
        'transitionedByName': transitionedByName,
        'transitionedByEmail': transitionedByEmail,
        'transitionedAt': transitionedAt,
        'notes': notes,
      };

  DateTime? get at => ArabicFormatters.tryParseDate(transitionedAt);
}

/// The full NCR report model.
class NcrReport {
  NcrReport({
    required this.id,
    required this.number,
    this.title,
    this.date,
    this.shift,
    this.department,
    this.productName,
    this.lineOrArea,
    this.reservedQty,
    this.reservedUnit,
    this.severity,
    this.defectId,
    this.defectType,
    this.occurrence,
    this.detection,
    this.rpn,
    this.riskBand,
    this.standardDefect,
    this.customType,
    this.discoveredBy,
    this.createdBy,
    this.description,
    this.immediateAction,
    this.documentId,
    this.documentTitle,
    this.rootCause,
    this.rootCauseApproval,
    this.actions = const [],
    this.holds = const [],
    this.verification,
    this.attachments = const [],
    this.createdAt,
    this.updatedAt,
    this.closedAt,
    this.currentStage = 'initial_report',
    this.completedStages = const [],
    this.stageHistory = const [],
    this.status = 'open',
    this.relatedLabTestId,
    this.relatedLabTestNumber,
    this.relatedMaterialReceivingId,
    this.relatedMaterialName,
    this.relatedBatchNumber,
    this.relatedSupplierId,
    this.relatedSupplierName,
    this.autoGeneratedFromLab = false,
    required this.companyId,
  });

  final String id;
  final String number;
  final String? title;
  final DateTime? date;
  final String? shift;
  final String? department;
  final String? productName;
  final String? lineOrArea;
  final num? reservedQty;
  final String? reservedUnit;
  final String? severity;
  final String? defectId;
  final String? defectType;
  final int? occurrence;
  final int? detection;
  final num? rpn;
  final String? riskBand;
  final String? standardDefect;
  final String? customType;
  final String? discoveredBy;
  final String? createdBy;
  final String? description;
  final String? immediateAction;
  final String? documentId;
  final String? documentTitle;
  final String? rootCause;
  final RootCauseApproval? rootCauseApproval;
  final List<CapaAction> actions;
  final List<Map<String, dynamic>> holds;
  final Verification? verification;
  final List<NcrAttachment> attachments;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? closedAt;
  final String currentStage;
  final List<String> completedStages;
  final List<StageHistoryEntry> stageHistory;
  final String status;
  final String? relatedLabTestId;
  final String? relatedLabTestNumber;
  final String? relatedMaterialReceivingId;
  final String? relatedMaterialName;
  final String? relatedBatchNumber;
  final String? relatedSupplierId;
  final String? relatedSupplierName;
  final bool autoGeneratedFromLab;
  final String companyId;

  factory NcrReport.fromMap(Map<String, dynamic> map) {
    return NcrReport(
      id: JsonUtils.asString(map['id']),
      number: JsonUtils.asString(map['number']),
      title: JsonUtils.asStringOrNull(map['title']),
      date: ArabicFormatters.tryParseDate(map['date']),
      shift: JsonUtils.asStringOrNull(map['shift']),
      department: JsonUtils.asStringOrNull(map['department']),
      productName: JsonUtils.asStringOrNull(map['product_name']),
      lineOrArea: JsonUtils.asStringOrNull(map['line_or_area']),
      reservedQty: JsonUtils.asNum(map['reserved_qty']),
      reservedUnit: JsonUtils.asStringOrNull(map['reserved_unit']),
      severity: JsonUtils.asStringOrNull(map['severity']),
      defectId: JsonUtils.asStringOrNull(map['defect_id']),
      defectType: JsonUtils.asStringOrNull(map['defect_type']),
      occurrence: JsonUtils.asNum(map['occurrence'])?.toInt(),
      detection: JsonUtils.asNum(map['detection'])?.toInt(),
      rpn: JsonUtils.asNum(map['rpn']),
      riskBand: JsonUtils.asStringOrNull(map['risk_band']),
      standardDefect: JsonUtils.asStringOrNull(map['standard_defect']),
      customType: JsonUtils.asStringOrNull(map['custom_type']),
      discoveredBy: JsonUtils.asStringOrNull(map['discovered_by']),
      createdBy: JsonUtils.asStringOrNull(map['created_by']),
      description: JsonUtils.asStringOrNull(map['description']),
      immediateAction: JsonUtils.asStringOrNull(map['immediate_action']),
      documentId: JsonUtils.asStringOrNull(map['document_id']),
      documentTitle: JsonUtils.asStringOrNull(map['document_title']),
      rootCause: JsonUtils.asStringOrNull(map['root_cause']),
      rootCauseApproval: JsonUtils.asMap(map['root_cause_approval']) != null
          ? RootCauseApproval.fromMap(JsonUtils.asMap(map['root_cause_approval'])!)
          : null,
      actions: JsonUtils.asMapList(map['actions'])
          .map(CapaAction.fromMap)
          .toList(),
      holds: JsonUtils.asMapList(map['holds']),
      verification: JsonUtils.asMap(map['verification']) != null
          ? Verification.fromMap(JsonUtils.asMap(map['verification'])!)
          : null,
      attachments: JsonUtils.asMapList(map['attachments'])
          .map(NcrAttachment.fromMap)
          .toList(),
      createdAt: ArabicFormatters.tryParseDate(map['created_at']),
      updatedAt: ArabicFormatters.tryParseDate(map['updated_at']),
      closedAt: ArabicFormatters.tryParseDate(map['closed_at']),
      currentStage:
          JsonUtils.asString(map['current_stage'], 'initial_report'),
      completedStages: JsonUtils.asList(map['completed_stages'])
          .map((e) => e.toString())
          .toList(),
      stageHistory: JsonUtils.asMapList(map['stage_history'])
          .map(StageHistoryEntry.fromMap)
          .toList(),
      status: JsonUtils.asString(map['status'], 'open'),
      relatedLabTestId: JsonUtils.asStringOrNull(map['related_lab_test_id']),
      relatedLabTestNumber:
          JsonUtils.asStringOrNull(map['related_lab_test_number']),
      relatedMaterialReceivingId:
          JsonUtils.asStringOrNull(map['related_material_receiving_id']),
      relatedMaterialName:
          JsonUtils.asStringOrNull(map['related_material_name']),
      relatedBatchNumber:
          JsonUtils.asStringOrNull(map['related_batch_number']),
      relatedSupplierId: JsonUtils.asStringOrNull(map['related_supplier_id']),
      relatedSupplierName:
          JsonUtils.asStringOrNull(map['related_supplier_name']),
      autoGeneratedFromLab:
          JsonUtils.asBool(map['auto_generated_from_lab']),
      companyId: JsonUtils.asString(map['company_id']),
    );
  }

  bool get isClosed => status == 'closed';
  bool get isCancelled => status == 'cancelled';
}
