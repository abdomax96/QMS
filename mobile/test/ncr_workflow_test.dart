import 'package:flutter_test/flutter_test.dart';
import 'package:qms_ncr/core/utils/labels.dart';
import 'package:qms_ncr/features/ncr/models/ncr_models.dart';
import 'package:qms_ncr/features/ncr/models/ncr_workflow.dart';
import 'package:qms_ncr/features/permissions/models/permission_models.dart';

NcrReport _ncr({
  String stage = 'initial_report',
  String? description = 'وصف تفصيلي كافٍ',
  String? department = 'الإنتاج',
  String? severity = 'high',
  RootCauseApproval? approval,
  List<CapaAction> actions = const [],
  num? reserved,
  Verification? verification,
  String status = 'open',
}) {
  return NcrReport(
    id: 'id',
    number: 'NCR-2026-0001',
    currentStage: stage,
    description: description,
    department: department,
    severity: severity,
    rootCauseApproval: approval,
    actions: actions,
    reservedQty: reserved,
    verification: verification,
    status: status,
    companyId: 'c1',
  );
}

void main() {
  group('RPN computation', () {
    test('high severity weight is 10', () {
      expect(
        NcrWorkflow.computeRpn(severity: 'high', occurrence: 5, detection: 4),
        200,
      );
    });
    test('medium severity weight is 5', () {
      expect(
        NcrWorkflow.computeRpn(severity: 'medium', occurrence: 2, detection: 3),
        30,
      );
    });
    test('low severity weight is 2', () {
      expect(
        NcrWorkflow.computeRpn(severity: 'low', occurrence: 5, detection: 5),
        50,
      );
    });
  });

  group('risk band thresholds', () {
    test('critical >= 150', () => expect(NcrWorkflow.riskBand(150), 'حرج'));
    test('high >= 100', () => expect(NcrWorkflow.riskBand(120), 'مرتفع'));
    test('medium >= 60', () => expect(NcrWorkflow.riskBand(60), 'متوسط'));
    test('low < 60', () => expect(NcrWorkflow.riskBand(59), 'منخفض'));
  });

  group('stage order helpers', () {
    test('next after initial_report', () {
      expect(Labels.nextStage('initial_report'), 'root_cause_analysis');
    });
    test('verification_closure has no next', () {
      expect(Labels.nextStage('verification_closure'), isNull);
    });
    test('previous before capa_planning', () {
      expect(Labels.previousStage('capa_planning'), 'root_cause_analysis');
    });
  });

  group('canAdvance guards', () {
    test('initial_report requires description/department/severity', () {
      expect(NcrWorkflow.canAdvance(_ncr()).allowed, isTrue);
      expect(NcrWorkflow.canAdvance(_ncr(description: '')).allowed, isFalse);
      expect(NcrWorkflow.canAdvance(_ncr(department: '')).allowed, isFalse);
      expect(NcrWorkflow.canAdvance(_ncr(severity: '')).allowed, isFalse);
    });

    test('root_cause_analysis requires approved root cause', () {
      final notApproved = _ncr(
        stage: 'root_cause_analysis',
        approval: RootCauseApproval(status: 'pending'),
      );
      expect(NcrWorkflow.canAdvance(notApproved).allowed, isFalse);

      final approved = _ncr(
        stage: 'root_cause_analysis',
        approval: RootCauseApproval(status: 'approved'),
      );
      expect(NcrWorkflow.canAdvance(approved).allowed, isTrue);
    });

    test('capa_planning requires at least one action', () {
      final noActions = _ncr(stage: 'capa_planning');
      expect(NcrWorkflow.canAdvance(noActions).allowed, isFalse);

      final withAction = _ncr(
        stage: 'capa_planning',
        actions: [CapaAction(id: '1', type: 'corrective', description: 'x')],
      );
      expect(NcrWorkflow.canAdvance(withAction).allowed, isTrue);
    });

    test('capa_execution requires all actions completed', () {
      final incomplete = _ncr(
        stage: 'capa_execution',
        actions: [
          CapaAction(
              id: '1', type: 'corrective', description: 'x', status: 'pending'),
        ],
      );
      expect(NcrWorkflow.canAdvance(incomplete).allowed, isFalse);

      final complete = _ncr(
        stage: 'capa_execution',
        actions: [
          CapaAction(
              id: '1',
              type: 'corrective',
              description: 'x',
              status: 'completed'),
        ],
      );
      expect(NcrWorkflow.canAdvance(complete).allowed, isTrue);
    });
  });

  group('remaining quantity', () {
    test('reserved minus sorted, clamped at 0', () {
      final ncr = _ncr(reserved: 100);
      final logs = [
        {'sorted_qty': 30, 'destroyed_qty': 10},
        {'sorted_qty': 20, 'destroyed_qty': 0},
      ];
      expect(NcrWorkflow.remainingQty(ncr, logs), 50);
    });

    test('never negative', () {
      final ncr = _ncr(reserved: 50);
      final logs = [
        {'sorted_qty': 80, 'destroyed_qty': 0},
      ];
      expect(NcrWorkflow.remainingQty(ncr, logs), 0);
    });
  });

  group('canClose guard', () {
    test('blocked when remaining qty > 0', () {
      final ncr = _ncr(
        stage: 'verification_closure',
        reserved: 100,
        verification: Verification(result: 'success'),
      );
      final logs = [
        {'sorted_qty': 40, 'destroyed_qty': 0},
      ];
      final res = NcrWorkflow.canClose(ncr, logs);
      expect(res.allowed, isFalse);
      expect(res.reason, contains('كمية محتجزة'));
    });

    test('blocked when verification not success', () {
      final ncr = _ncr(
        stage: 'verification_closure',
        reserved: 0,
        verification: Verification(result: 'fail'),
      );
      expect(NcrWorkflow.canClose(ncr, const []).allowed, isFalse);
    });

    test('allowed when success and no remaining', () {
      final ncr = _ncr(
        stage: 'verification_closure',
        reserved: 100,
        verification: Verification(result: 'success'),
      );
      final logs = [
        {'sorted_qty': 100, 'destroyed_qty': 20},
      ];
      expect(NcrWorkflow.canClose(ncr, logs).allowed, isTrue);
    });
  });

  group('permission aggregation', () {
    test('uses canonical NCR permission action codes only', () {
      const canonical = {
        Labels.actView,
        Labels.actEdit,
        Labels.actDelete,
        Labels.actRootCausePropose,
        Labels.actAssign,
        Labels.actApprove,
        Labels.actReleaseHold,
        Labels.actReject,
        Labels.actVerifyClose,
        Labels.actExport,
        Labels.actReopen,
        Labels.actCapaAdd,
        Labels.actCapaComplete,
        Labels.actWorkflowProgress,
      };

      expect(
        canonical,
        isNot(containsAll(<String>{
          'add_rca',
          'hold_add',
          'hold_release',
          'update_progress',
          'verify',
          'print',
          'review',
          'investigate',
          'decide',
        })),
      );
    });

    test('old NCR action aliases do not grant mobile permissions', () {
      final perms = UserPermissions({
        'root_cause_analysis': StagePermission(
          stageCode: 'root_cause_analysis',
          allowedActions: {'add_rca', 'hold_release', 'update_progress'},
          canAdvance: false,
          canReturn: false,
        ),
      });

      expect(perms.can('root_cause_analysis', Labels.actRootCausePropose), isFalse);
      expect(perms.can('root_cause_analysis', Labels.actReleaseHold), isFalse);
      expect(perms.can('root_cause_analysis', Labels.actCapaComplete), isFalse);
    });

    test('merge unions actions and ORs flags', () {
      final a = StagePermission(
        stageCode: 'capa_planning',
        allowedActions: {'view', 'capa.add'},
        canAdvance: false,
        canReturn: true,
      );
      final b = StagePermission(
        stageCode: 'capa_planning',
        allowedActions: {'view', 'approve'},
        canAdvance: true,
        canReturn: false,
      );
      final merged = a.merge(b);
      expect(merged.allowedActions,
          containsAll(['view', 'capa.add', 'approve']));
      expect(merged.canAdvance, isTrue);
      expect(merged.canReturn, isTrue);
    });

    test('UserPermissions.can resolves per stage', () {
      final perms = UserPermissions({
        'root_cause_analysis': StagePermission(
          stageCode: 'root_cause_analysis',
          allowedActions: {'approve'},
          canAdvance: true,
          canReturn: false,
        ),
      });
      expect(perms.can('root_cause_analysis', 'approve'), isTrue);
      expect(perms.can('root_cause_analysis', 'reject'), isFalse);
      expect(perms.can('capa_planning', 'approve'), isFalse);
      expect(perms.canAdvance('root_cause_analysis'), isTrue);
    });
  });

  group('safe JSON parsing of NCR', () {
    test('handles missing/legacy fields gracefully', () {
      final ncr = NcrReport.fromMap({
        'id': 'x',
        'number': 'NCR-2026-0099',
        'company_id': 'c1',
        // actions as string-encoded JSON (legacy)
        'actions': '[{"id":"1","type":"corrective","description":"d","status":"completed"}]',
        // attachments null
        'attachments': null,
        // stage_history missing
      });
      expect(ncr.actions.length, 1);
      expect(ncr.actions.first.isCompleted, isTrue);
      expect(ncr.attachments, isEmpty);
      expect(ncr.stageHistory, isEmpty);
      expect(ncr.currentStage, 'initial_report');
      expect(ncr.status, 'open');
    });
  });
}
