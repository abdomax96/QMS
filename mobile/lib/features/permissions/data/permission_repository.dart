import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/errors/app_error.dart';
import '../../../core/supabase/supabase_client.dart';
import '../models/permission_models.dart';

class PermissionRepository {
  final SupabaseClient _client = SupabaseService.client;

  /// Loads NCR stage permissions for the current user:
  /// 1. role ids from `user_roles`
  /// 2. stage permissions from `ncr_stage_permissions` for those roles
  /// 3. aggregate per stage_code (union of allowed_actions, OR of can_advance/can_return)
  Future<UserPermissions> loadForCurrentUser() async {
    final userId = SupabaseService.currentUser?.id;
    if (userId == null) {
      throw AppError('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.', code: '401');
    }

    try {
      // 1. user roles
      final roleRows = await _client
          .from('user_roles')
          .select('role_id')
          .eq('user_id', userId);

      final roleIds = (roleRows as List)
          .map((e) => (e as Map)['role_id']?.toString())
          .where((e) => e != null && e.isNotEmpty)
          .cast<String>()
          .toSet()
          .toList();

      if (roleIds.isEmpty) {
        return UserPermissions.empty();
      }

      // 2. stage permissions for these roles (global rows: department_id is null)
      final permRows = await _client
          .from('ncr_stage_permissions')
          .select('stage_code, allowed_actions, can_advance, can_return')
          .inFilter('role_id', roleIds)
          .eq('is_active', true)
          .isFilter('department_id', null);

      // 3. aggregate
      final Map<String, StagePermission> byStage = {};
      for (final raw in (permRows as List)) {
        final row =
            StagePermissionRow.fromMap(Map<String, dynamic>.from(raw as Map));
        if (row.stageCode.isEmpty) continue;
        final incoming = StagePermission(
          stageCode: row.stageCode,
          allowedActions: row.allowedActions.toSet(),
          canAdvance: row.canAdvance,
          canReturn: row.canReturn,
        );
        byStage[row.stageCode] = byStage.containsKey(row.stageCode)
            ? byStage[row.stageCode]!.merge(incoming)
            : incoming;
      }

      return UserPermissions(byStage);
    } catch (e) {
      throw AppError.from(e);
    }
  }
}
