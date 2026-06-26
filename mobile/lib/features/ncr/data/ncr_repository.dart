import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../../core/errors/app_error.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../../core/utils/labels.dart';
import '../../auth/models/auth_profile.dart';
import '../models/ncr_comment.dart';
import '../models/ncr_models.dart';
import '../models/ncr_workflow.dart';

const _uuid = Uuid();

/// Parameters for creating a new NCR (validated by callers/providers).
class NcrCreateInput {
  NcrCreateInput({
    required this.companyId,
    required this.date,
    this.shift,
    required this.department,
    required this.defectType,
    this.defectId,
    this.productName,
    this.lineOrArea,
    this.relatedMaterialReceivingId,
    this.relatedMaterialName,
    this.reservedQty,
    this.reservedUnit,
    required this.severity,
    required this.occurrence,
    required this.detection,
    required this.discoveredBy,
    required this.description,
    this.immediateAction,
    this.documentId,
    this.documentTitle,
    this.title,
  });

  final String companyId;
  final DateTime date;
  final String? shift;
  final String department;
  final String defectType;
  final String? defectId;
  final String? productName;
  final String? lineOrArea;
  final String? relatedMaterialReceivingId;
  final String? relatedMaterialName;
  final num? reservedQty;
  final String? reservedUnit;
  final String severity;
  final int occurrence;
  final int detection;
  final String discoveredBy;
  final String description;
  final String? immediateAction;
  final String? documentId;
  final String? documentTitle;
  final String? title;
}

class NcrRepository {
  final SupabaseClient _client = SupabaseService.client;

  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------

  /// Fetch NCR reports for a company. Sorting is done in memory to avoid
  /// composite index requirements.
  Future<List<NcrReport>> fetchReports(String companyId) async {
    try {
      final rows = await _client
          .from('ncr_reports')
          .select()
          .eq('company_id', companyId);

      final reports = (rows as List)
          .map((e) => NcrReport.fromMap(Map<String, dynamic>.from(e as Map)))
          .toList();

      reports.sort((a, b) {
        final ad = a.createdAt ?? a.date ?? DateTime(1970);
        final bd = b.createdAt ?? b.date ?? DateTime(1970);
        return bd.compareTo(ad);
      });
      return reports;
    } catch (e) {
      throw AppError.from(e);
    }
  }

  Future<NcrReport?> fetchReport(String id) async {
    try {
      final row = await _client
          .from('ncr_reports')
          .select()
          .eq('id', id)
          .maybeSingle();
      if (row == null) return null;
      return NcrReport.fromMap(Map<String, dynamic>.from(row));
    } catch (e) {
      throw AppError.from(e);
    }
  }

  // ---------------------------------------------------------------------------
  // NUMBER GENERATION
  // ---------------------------------------------------------------------------

  /// Generates an NCR number `NCR-{year}-{0001}` using the `meta` table counter.
  /// Falls back to a timestamp-based number if meta is unavailable (RLS / missing).
  Future<String> _generateNumber(String companyId, int year) async {
    try {
      final metaRow = await _client
          .from('meta')
          .select('sequences')
          .eq('id', 'ncrCounters')
          .maybeSingle();

      Map<String, dynamic> sequences = {};
      if (metaRow != null && metaRow['sequences'] != null) {
        final seq = metaRow['sequences'];
        if (seq is Map) {
          sequences = Map<String, dynamic>.from(seq);
        }
      }

      final current = (sequences['$year'] is num)
          ? (sequences['$year'] as num).toInt()
          : int.tryParse('${sequences['$year'] ?? 0}') ?? 0;
      final next = current + 1;
      final candidate = 'NCR-$year-${next.toString().padLeft(4, '0')}';

      // Ensure uniqueness within company.
      final exists = await _client
          .from('ncr_reports')
          .select('id')
          .eq('company_id', companyId)
          .eq('number', candidate)
          .maybeSingle();

      if (exists != null) {
        // Collision -> fallback.
        return _fallbackNumber(year);
      }

      // Persist updated counter (best effort).
      sequences['$year'] = next;
      try {
        await _client
            .from('meta')
            .update({'sequences': sequences})
            .eq('id', 'ncrCounters');
      } catch (_) {
        // Ignore counter persistence errors; number is still valid.
      }

      return candidate;
    } catch (_) {
      return _fallbackNumber(year);
    }
  }

  String _fallbackNumber(int year) {
    final ts = DateTime.now().millisecondsSinceEpoch.toString();
    final suffix = ts.substring(ts.length - 6);
    return 'NCR-$year-$suffix';
  }

  String _fallbackTitle(NcrCreateInput input) {
    final explicit = input.title?.trim();
    if (explicit != null && explicit.isNotEmpty) return explicit;

    final description = input.description.trim();
    if (description.isNotEmpty) {
      return description.length <= 80
          ? description
          : '${description.substring(0, 80)}...';
    }

    return 'تقرير عدم مطابقة - ${input.department}';
  }

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  Future<NcrReport> createReport(NcrCreateInput input, AuthProfile user) async {
    try {
      final id = _uuid.v4();
      final year = input.date.year;
      final number = await _generateNumber(input.companyId, year);

      final rpn = NcrWorkflow.computeRpn(
        severity: input.severity,
        occurrence: input.occurrence,
        detection: input.detection,
      );
      final riskBand = NcrWorkflow.riskBand(rpn);

      final nowIso = DateTime.now().toUtc().toIso8601String();

      final firstHistory = StageHistoryEntry(
        from: null,
        to: 'initial_report',
        transitionedBy: user.id,
        transitionedByName: user.name ?? user.label,
        transitionedByEmail: user.email,
        transitionedAt: nowIso,
        notes: 'تم إنشاء التقرير',
      ).toMap();

      final payload = <String, dynamic>{
        'id': id,
        'number': number,
        'title': _fallbackTitle(input),
        'date': input.date.toUtc().toIso8601String(),
        'shift': input.shift,
        'department': input.department,
        'product_name': input.productName,
        'line_or_area': input.lineOrArea,
        'reserved_qty': input.reservedQty,
        'reserved_unit': input.reservedUnit,
        'severity': input.severity,
        'defect_id': input.defectId,
        'defect_type': input.defectType,
        'occurrence': input.occurrence,
        'detection': input.detection,
        'rpn': rpn,
        'risk_band': riskBand,
        'discovered_by': input.discoveredBy,
        'created_by': user.id,
        'description': input.description,
        'immediate_action': input.immediateAction,
        'document_id': input.documentId,
        'document_title': input.documentTitle,
        'root_cause': null,
        'root_cause_approval': null,
        'actions': <dynamic>[],
        'holds': <dynamic>[],
        'verification': null,
        'attachments': <dynamic>[],
        'current_stage': 'initial_report',
        'completed_stages': <dynamic>[],
        'stage_history': [firstHistory],
        'status': 'open',
        'related_material_receiving_id': input.relatedMaterialReceivingId,
        'related_material_name': input.relatedMaterialName,
        'auto_generated_from_lab': false,
        'company_id': input.companyId,
        'created_at': nowIso,
        'updated_at': nowIso,
      };

      final inserted = await _client
          .from('ncr_reports')
          .insert(payload)
          .select()
          .single();

      return NcrReport.fromMap(Map<String, dynamic>.from(inserted));
    } catch (e) {
      throw AppError.from(e);
    }
  }

  // ---------------------------------------------------------------------------
  // GENERIC PATCH
  // ---------------------------------------------------------------------------

  Future<NcrReport> _patch(String id, Map<String, dynamic> patch) async {
    try {
      patch['updated_at'] = DateTime.now().toUtc().toIso8601String();
      final updated = await _client
          .from('ncr_reports')
          .update(patch)
          .eq('id', id)
          .select()
          .single();
      return NcrReport.fromMap(Map<String, dynamic>.from(updated));
    } catch (e) {
      throw AppError.from(e);
    }
  }

  Future<void> deleteReport(String id) async {
    try {
      await _client.from('ncr_reports').delete().eq('id', id);
    } catch (e) {
      throw AppError.from(e);
    }
  }

  // ---------------------------------------------------------------------------
  // WORKFLOW TRANSITIONS
  // ---------------------------------------------------------------------------

  Future<NcrReport> advanceStage(
    NcrReport ncr,
    AuthProfile user, {
    String? notes,
  }) async {
    final next = Labels.nextStage(ncr.currentStage);
    if (next == null) {
      throw AppError('لا يمكن التقدم أكثر، هذه آخر مرحلة.');
    }
    final completed = [...ncr.completedStages];
    if (!completed.contains(ncr.currentStage)) {
      completed.add(ncr.currentStage);
    }
    final history = ncr.stageHistory.map((e) => e.toMap()).toList()
      ..add(
        StageHistoryEntry(
          from: ncr.currentStage,
          to: next,
          transitionedBy: user.id,
          transitionedByName: user.name ?? user.label,
          transitionedByEmail: user.email,
          transitionedAt: DateTime.now().toUtc().toIso8601String(),
          notes: notes ?? 'الانتقال إلى ${Labels.stage(next)}',
        ).toMap(),
      );

    return _patch(ncr.id, {
      'current_stage': next,
      'completed_stages': completed,
      'stage_history': history,
      'status': 'in_progress',
    });
  }

  Future<NcrReport> returnStage(
    NcrReport ncr,
    AuthProfile user, {
    String? notes,
  }) async {
    final prev = Labels.previousStage(ncr.currentStage);
    if (prev == null) {
      throw AppError('لا يمكن الإرجاع، هذه أول مرحلة.');
    }
    final completed = [...ncr.completedStages]..remove(prev);
    final history = ncr.stageHistory.map((e) => e.toMap()).toList()
      ..add(
        StageHistoryEntry(
          from: ncr.currentStage,
          to: prev,
          transitionedBy: user.id,
          transitionedByName: user.name ?? user.label,
          transitionedByEmail: user.email,
          transitionedAt: DateTime.now().toUtc().toIso8601String(),
          notes: notes ?? 'إرجاع إلى ${Labels.stage(prev)}',
        ).toMap(),
      );

    return _patch(ncr.id, {
      'current_stage': prev,
      'completed_stages': completed,
      'stage_history': history,
      'status': 'in_progress',
    });
  }

  // ---------------------------------------------------------------------------
  // ROOT CAUSE
  // ---------------------------------------------------------------------------

  Future<NcrReport> proposeRootCause(
    NcrReport ncr,
    AuthProfile user,
    String rootCauseText, {
    String role = 'department',
  }) async {
    final approval = RootCauseApproval(
      proposedBy: user.id,
      proposedByName: user.name ?? user.label,
      proposedByEmail: user.email,
      proposedByRole: role,
      proposedAt: DateTime.now().toUtc().toIso8601String(),
      rootCauseText: rootCauseText,
      status: 'pending',
    );
    return _patch(ncr.id, {
      'root_cause': rootCauseText,
      'root_cause_approval': approval.toMap(),
      'status': 'pending_review',
    });
  }

  Future<NcrReport> reviewRootCause(
    NcrReport ncr,
    AuthProfile user, {
    required bool approve,
    String? rejectionReason,
    String role = 'quality',
  }) async {
    final existing = ncr.rootCauseApproval ?? RootCauseApproval();
    final updated = RootCauseApproval(
      proposedBy: existing.proposedBy,
      proposedByName: existing.proposedByName,
      proposedByEmail: existing.proposedByEmail,
      proposedByRole: existing.proposedByRole,
      proposedAt: existing.proposedAt,
      rootCauseText: existing.rootCauseText ?? ncr.rootCause,
      status: approve ? 'approved' : 'rejected',
      reviewedBy: user.id,
      reviewedByName: user.name ?? user.label,
      reviewedByEmail: user.email,
      reviewedByRole: role,
      reviewedAt: DateTime.now().toUtc().toIso8601String(),
      rejectionReason: approve ? null : rejectionReason,
    );
    return _patch(ncr.id, {
      'root_cause_approval': updated.toMap(),
      'status': 'in_progress',
    });
  }

  // ---------------------------------------------------------------------------
  // CAPA
  // ---------------------------------------------------------------------------

  Future<NcrReport> addCapaAction(NcrReport ncr, CapaAction action) async {
    final actions = ncr.actions.map((a) => a.toMap()).toList()
      ..add(action.toMap());
    return _patch(ncr.id, {'actions': actions});
  }

  Future<NcrReport> updateCapaStatus(
    NcrReport ncr,
    String actionId,
    String status,
  ) async {
    final actions = ncr.actions
        .map((a) => a.id == actionId ? a.copyWith(status: status) : a)
        .map((a) => a.toMap())
        .toList();
    return _patch(ncr.id, {'actions': actions});
  }

  // ---------------------------------------------------------------------------
  // VERIFICATION & CLOSURE
  // ---------------------------------------------------------------------------

  Future<NcrReport> saveVerification(
    NcrReport ncr,
    AuthProfile user, {
    required String result,
    String? notes,
  }) async {
    final verification = Verification(
      verifiedBy: user.name ?? user.label,
      date: DateTime.now().toUtc().toIso8601String(),
      notes: notes,
      result: result,
    );
    return _patch(ncr.id, {'verification': verification.toMap()});
  }

  /// Closes the NCR. Caller MUST have validated remaining qty == 0 and
  /// verification.result == 'success' (workflow guard also enforces it).
  Future<NcrReport> closeReport(NcrReport ncr, AuthProfile user) async {
    final completed = [...ncr.completedStages];
    if (!completed.contains('verification_closure')) {
      completed.add('verification_closure');
    }
    final history = ncr.stageHistory.map((e) => e.toMap()).toList()
      ..add(
        StageHistoryEntry(
          from: ncr.currentStage,
          to: ncr.currentStage,
          transitionedBy: user.id,
          transitionedByName: user.name ?? user.label,
          transitionedByEmail: user.email,
          transitionedAt: DateTime.now().toUtc().toIso8601String(),
          notes: 'تم إغلاق الحالة',
        ).toMap(),
      );

    return _patch(ncr.id, {
      'status': 'closed',
      'closed_at': DateTime.now().toUtc().toIso8601String(),
      'completed_stages': completed,
      'stage_history': history,
    });
  }

  // ---------------------------------------------------------------------------
  // HOLDS (ncr_hold_sort_logs)
  // ---------------------------------------------------------------------------

  Future<List<NcrHoldLog>> fetchHoldLogs(String ncrId) async {
    try {
      final rows = await _client
          .from('ncr_hold_sort_logs')
          .select()
          .eq('ncr_id', ncrId);
      final logs = (rows as List)
          .map((e) => NcrHoldLog.fromMap(Map<String, dynamic>.from(e as Map)))
          .toList();
      logs.sort((a, b) {
        final ad = a.createdAt ?? a.sortedAt ?? DateTime(1970);
        final bd = b.createdAt ?? b.sortedAt ?? DateTime(1970);
        return bd.compareTo(ad);
      });
      return logs;
    } catch (e) {
      throw AppError.from(e);
    }
  }

  /// Fetches hold logs as raw maps (for remaining-qty computation).
  Future<List<Map<String, dynamic>>> fetchHoldLogMaps(String ncrId) async {
    final logs = await fetchHoldLogs(ncrId);
    return logs
        .map(
          (l) => {'sorted_qty': l.sortedQty, 'destroyed_qty': l.destroyedQty},
        )
        .toList();
  }

  Future<void> addHoldLog({
    required String ncrId,
    required String companyId,
    required AuthProfile user,
    required num sortedQty,
    required num destroyedQty,
    String? notes,
  }) async {
    try {
      final nowIso = DateTime.now().toUtc().toIso8601String();
      await _client.from('ncr_hold_sort_logs').insert({
        'id': _uuid.v4(),
        'company_id': companyId,
        'ncr_id': ncrId,
        'sorted_qty': sortedQty,
        'destroyed_qty': destroyedQty,
        'sorted_at': nowIso,
        'sorted_by': user.id,
        'notes': notes,
        'created_at': nowIso,
        'updated_at': nowIso,
      });
    } catch (e) {
      throw AppError.from(e);
    }
  }

  // ---------------------------------------------------------------------------
  // COMMENTS (ncr_comments)
  // ---------------------------------------------------------------------------

  Future<List<NcrComment>> fetchComments(String ncrId) async {
    try {
      final rows = await _client
          .from('ncr_comments')
          .select()
          .eq('ncr_id', ncrId)
          .order('created_at', ascending: true);
      return (rows as List)
          .map((e) => NcrComment.fromMap(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      throw AppError.from(e);
    }
  }

  Future<void> addComment({
    required String ncrId,
    required String? companyId,
    required AuthProfile user,
    required String content,
  }) async {
    try {
      final nowIso = DateTime.now().toUtc().toIso8601String();
      final payload = {
        'id': _uuid.v4(),
        'content': content,
        'ncr_id': ncrId,
        'entity_id': ncrId,
        'entity_type': 'ncr',
        'company_id': companyId,
        'author_id': user.id,
        'author_name': user.name ?? user.label,
        'author_avatar': user.avatarUrl,
        'created_at': nowIso,
        'edited': false,
      };

      try {
        await _client.from('ncr_comments').insert(payload);
      } on PostgrestException catch (e) {
        final isSchemaDrift =
            e.code == '42703' || e.message.toLowerCase().contains('column');
        if (!isSchemaDrift) rethrow;

        await _client.from('ncr_comments').insert({
          'id': payload['id'],
          'content': content,
          'ncr_id': ncrId,
          'entity_id': ncrId,
          'entity_type': 'ncr',
          'company_id': companyId,
          'author_id': user.id,
          'author_name': user.name ?? user.label,
          'created_at': nowIso,
          'edited': false,
        });
      }
    } catch (e) {
      throw AppError.from(e);
    }
  }

  Future<void> updateComment(String commentId, String content) async {
    try {
      await _client
          .from('ncr_comments')
          .update({'content': content, 'edited': true})
          .eq('id', commentId);
    } catch (e) {
      throw AppError.from(e);
    }
  }

  Future<void> deleteComment(String commentId) async {
    try {
      await _client.from('ncr_comments').delete().eq('id', commentId);
    } catch (e) {
      throw AppError.from(e);
    }
  }

  /// Realtime stream of comments for a given NCR.
  Stream<List<NcrComment>> commentsStream(String ncrId) {
    return _client
        .from('ncr_comments')
        .stream(primaryKey: ['id'])
        .eq('ncr_id', ncrId)
        .map((rows) {
          final list = rows
              .map((e) => NcrComment.fromMap(Map<String, dynamic>.from(e)))
              .toList();
          list.sort((a, b) {
            final ad = a.createdAt ?? DateTime(1970);
            final bd = b.createdAt ?? DateTime(1970);
            return ad.compareTo(bd);
          });
          return list;
        });
  }

  // ---------------------------------------------------------------------------
  // ATTACHMENTS (Storage + JSON field)
  // ---------------------------------------------------------------------------

  Future<NcrReport> appendAttachment(
    NcrReport ncr,
    NcrAttachment attachment,
  ) async {
    final attachments = ncr.attachments.map((a) => a.toMap()).toList()
      ..add(attachment.toMap());
    return _patch(ncr.id, {'attachments': attachments});
  }
}
