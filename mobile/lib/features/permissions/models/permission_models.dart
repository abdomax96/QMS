import '../../../core/utils/json_utils.dart';

/// Aggregated permissions for a single workflow stage.
class StagePermission {
  StagePermission({
    required this.stageCode,
    required this.allowedActions,
    required this.canAdvance,
    required this.canReturn,
  });

  final String stageCode;
  final Set<String> allowedActions;
  final bool canAdvance;
  final bool canReturn;

  bool can(String action) => allowedActions.contains(action);

  StagePermission merge(StagePermission other) {
    return StagePermission(
      stageCode: stageCode,
      allowedActions: {...allowedActions, ...other.allowedActions},
      canAdvance: canAdvance || other.canAdvance,
      canReturn: canReturn || other.canReturn,
    );
  }
}

/// All stage permissions for the current user, keyed by stage_code.
class UserPermissions {
  UserPermissions(this.byStage);

  final Map<String, StagePermission> byStage;

  static UserPermissions empty() => UserPermissions(const {});

  StagePermission? forStage(String? stageCode) {
    if (stageCode == null) return null;
    return byStage[stageCode];
  }

  /// Whether the user can perform [action] in [stageCode].
  bool can(String? stageCode, String action) {
    final p = forStage(stageCode);
    return p?.can(action) ?? false;
  }

  bool canAdvance(String? stageCode) => forStage(stageCode)?.canAdvance ?? false;
  bool canReturn(String? stageCode) => forStage(stageCode)?.canReturn ?? false;

  /// Does the user have *any* permission anywhere (used to detect "no access").
  bool get hasAny => byStage.values.any((p) =>
      p.allowedActions.isNotEmpty || p.canAdvance || p.canReturn);
}

/// Raw row helper.
class StagePermissionRow {
  StagePermissionRow({
    required this.stageCode,
    required this.allowedActions,
    required this.canAdvance,
    required this.canReturn,
  });

  final String stageCode;
  final List<String> allowedActions;
  final bool canAdvance;
  final bool canReturn;

  factory StagePermissionRow.fromMap(Map<String, dynamic> map) {
    return StagePermissionRow(
      stageCode: JsonUtils.asString(map['stage_code']),
      allowedActions: JsonUtils.asList(map['allowed_actions'])
          .map((e) => e.toString())
          .where((e) => e.isNotEmpty)
          .toList(),
      canAdvance: JsonUtils.asBool(map['can_advance']),
      canReturn: JsonUtils.asBool(map['can_return']),
    );
  }
}
