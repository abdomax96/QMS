import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_error.dart';
import '../../auth/providers/auth_provider.dart';
import '../../company/providers/company_provider.dart';
import '../../permissions/models/permission_models.dart';
import '../../permissions/providers/permission_provider.dart';
import '../data/ncr_repository.dart';
import '../models/ncr_models.dart';
import '../models/ncr_workflow.dart';
import 'ncr_provider.dart';

/// Coordinates NCR mutations: enforces data-completeness via NcrWorkflow,
/// supplies the current user, and invalidates caches. Permission gating is
/// done in UI (button visibility) AND enforced server-side by Supabase RLS.
class NcrActionsController {
  NcrActionsController(this._ref);

  final Ref _ref;

  NcrRepository get _repo => _ref.read(ncrRepositoryProvider);

  void _requireUser() {
    final user = _ref.read(currentProfileProvider);
    if (user == null) {
      throw AppError('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.', code: '401');
    }
  }

  Future<NcrReport> createReport(NcrCreateInput input) async {
    final user = _ref.read(currentProfileProvider);
    if (user == null) {
      throw AppError('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.', code: '401');
    }
    final result = await _repo.createReport(input, user);
    invalidateNcrData(_ref);
    await _reloadPermissionsIfNeeded();
    return result;
  }

  Future<NcrReport> advance(NcrReport ncr, {String? notes}) async {
    final user = _ref.read(currentProfileProvider)!;
    final check = NcrWorkflow.canAdvance(ncr);
    if (!check.allowed) {
      throw AppError(check.reason ?? 'لا يمكن الانتقال للمرحلة التالية.');
    }
    final res = await _safe(() => _repo.advanceStage(ncr, user, notes: notes));
    invalidateNcrData(_ref, ncrId: ncr.id);
    return res;
  }

  Future<NcrReport> returnStage(NcrReport ncr, {String? notes}) async {
    final user = _ref.read(currentProfileProvider)!;
    final res = await _safe(() => _repo.returnStage(ncr, user, notes: notes));
    invalidateNcrData(_ref, ncrId: ncr.id);
    return res;
  }

  Future<NcrReport> proposeRootCause(NcrReport ncr, String text) async {
    _requireUser();
    final user = _ref.read(currentProfileProvider)!;
    final res = await _safe(() => _repo.proposeRootCause(ncr, user, text));
    invalidateNcrData(_ref, ncrId: ncr.id);
    return res;
  }

  Future<NcrReport> reviewRootCause(
    NcrReport ncr, {
    required bool approve,
    String? rejectionReason,
  }) async {
    final user = _ref.read(currentProfileProvider)!;
    final res = await _safe(
      () => _repo.reviewRootCause(
        ncr,
        user,
        approve: approve,
        rejectionReason: rejectionReason,
      ),
    );
    invalidateNcrData(_ref, ncrId: ncr.id);
    return res;
  }

  Future<NcrReport> addCapa(NcrReport ncr, CapaAction action) async {
    _requireUser();
    final res = await _safe(() => _repo.addCapaAction(ncr, action));
    invalidateNcrData(_ref, ncrId: ncr.id);
    return res;
  }

  Future<NcrReport> updateCapaStatus(
    NcrReport ncr,
    String actionId,
    String status,
  ) async {
    _requireUser();
    final res = await _safe(
      () => _repo.updateCapaStatus(ncr, actionId, status),
    );
    invalidateNcrData(_ref, ncrId: ncr.id);
    return res;
  }

  Future<NcrReport> saveVerification(
    NcrReport ncr, {
    required String result,
    String? notes,
  }) async {
    final user = _ref.read(currentProfileProvider)!;
    final res = await _safe(
      () => _repo.saveVerification(ncr, user, result: result, notes: notes),
    );
    invalidateNcrData(_ref, ncrId: ncr.id);
    return res;
  }

  /// Closes the NCR after enforcing the close guard (remaining qty + verification).
  Future<NcrReport> close(NcrReport ncr) async {
    final user = _ref.read(currentProfileProvider)!;
    final holdMaps = await _repo.fetchHoldLogMaps(ncr.id);
    final check = NcrWorkflow.canClose(ncr, holdMaps);
    if (!check.allowed) {
      throw AppError(check.reason ?? 'لا يمكن إغلاق الحالة.');
    }
    final res = await _safe(() => _repo.closeReport(ncr, user));
    invalidateNcrData(_ref, ncrId: ncr.id);
    return res;
  }

  Future<void> addHoldLog(
    NcrReport ncr, {
    required num sortedQty,
    required num destroyedQty,
    String? notes,
  }) async {
    final user = _ref.read(currentProfileProvider)!;
    final companyId = ncr.companyId.isNotEmpty
        ? ncr.companyId
        : _ref.read(selectedCompanyIdProvider);
    if (companyId == null) {
      throw AppError('يرجى اختيار الشركة أولاً.');
    }
    // Validate against current remaining quantity.
    final holdMaps = await _repo.fetchHoldLogMaps(ncr.id);
    final remaining = NcrWorkflow.remainingQty(ncr, holdMaps);
    if (sortedQty <= 0) {
      throw AppError('كمية الفرز يجب أن تكون أكبر من صفر.');
    }
    if (destroyedQty < 0) {
      throw AppError('كمية الإتلاف لا يمكن أن تكون سالبة.');
    }
    if (destroyedQty > sortedQty) {
      throw AppError('كمية الإتلاف لا يمكن أن تتجاوز كمية الفرز.');
    }
    if (sortedQty > remaining) {
      throw AppError('كمية الفرز تتجاوز الكمية المتبقية المحتجزة.');
    }
    await _safe(
      () => _repo.addHoldLog(
        ncrId: ncr.id,
        companyId: companyId,
        user: user,
        sortedQty: sortedQty,
        destroyedQty: destroyedQty,
        notes: notes,
      ),
    );
    invalidateNcrData(_ref, ncrId: ncr.id);
  }

  Future<void> addComment(
    String ncrId,
    String content, {
    String? companyId,
  }) async {
    final user = _ref.read(currentProfileProvider)!;
    final resolvedCompanyId = companyId ?? _ref.read(selectedCompanyIdProvider);
    if (resolvedCompanyId == null) {
      throw AppError('يرجى اختيار الشركة أولاً.');
    }
    await _safe(
      () => _repo.addComment(
        ncrId: ncrId,
        companyId: resolvedCompanyId,
        user: user,
        content: content,
      ),
    );
    _ref.invalidate(commentsStreamProvider(ncrId));
  }

  Future<void> updateComment(String commentId, String content) async {
    await _safe(() => _repo.updateComment(commentId, content));
  }

  Future<void> deleteComment(String commentId) async {
    await _safe(() => _repo.deleteComment(commentId));
  }

  Future<NcrReport> uploadAttachment(
    NcrReport ncr,
    File file,
    String fileName,
  ) async {
    final attachRepo = _ref.read(attachmentRepositoryProvider);
    final attachment = await attachRepo.upload(
      ncrId: ncr.id,
      file: file,
      fileName: fileName,
    );
    final res = await _safe(() => _repo.appendAttachment(ncr, attachment));
    invalidateNcrData(_ref, ncrId: ncr.id);
    return res;
  }

  Future<void> deleteReport(String id) async {
    await _safe(() => _repo.deleteReport(id));
    invalidateNcrData(_ref);
  }

  /// Wraps an operation; on 403 reloads permissions (per spec) then rethrows.
  Future<T> _safe<T>(Future<T> Function() op) async {
    try {
      return await op();
    } catch (e) {
      final err = e is AppError ? e : AppError.from(e);
      if (err.isForbidden) {
        await _reloadPermissionsIfNeeded();
      }
      throw err;
    }
  }

  Future<void> _reloadPermissionsIfNeeded() async {
    _ref.invalidate(userPermissionsProvider);
  }
}

final ncrActionsProvider = Provider<NcrActionsController>((ref) {
  return NcrActionsController(ref);
});

/// Convenience: current user's permissions object.
final permsProvider = Provider<UserPermissions>((ref) {
  return ref.watch(permissionsValueProvider);
});
