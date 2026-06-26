import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../company/providers/company_provider.dart';
import '../data/attachment_repository.dart';
import '../data/draft_repository.dart';
import '../data/ncr_repository.dart';
import '../models/ncr_comment.dart';
import '../models/ncr_models.dart';

final ncrRepositoryProvider = Provider<NcrRepository>((ref) => NcrRepository());
final attachmentRepositoryProvider =
    Provider<AttachmentRepository>((ref) => AttachmentRepository());
final draftRepositoryProvider =
    Provider<DraftRepository>((ref) => DraftRepository());

/// List of NCR reports for the currently selected company.
final ncrListProvider = FutureProvider<List<NcrReport>>((ref) async {
  final companyId = ref.watch(selectedCompanyIdProvider);
  if (companyId == null) return const [];
  return ref.watch(ncrRepositoryProvider).fetchReports(companyId);
});

/// A single NCR report by id.
final ncrDetailsProvider =
    FutureProvider.family<NcrReport?, String>((ref, id) async {
  return ref.watch(ncrRepositoryProvider).fetchReport(id);
});

/// Hold logs for a specific NCR.
final holdLogsProvider =
    FutureProvider.family<List<NcrHoldLog>, String>((ref, ncrId) async {
  return ref.watch(ncrRepositoryProvider).fetchHoldLogs(ncrId);
});

/// Comments stream (Realtime) for a specific NCR.
final commentsStreamProvider =
    StreamProvider.family<List<NcrComment>, String>((ref, ncrId) {
  return ref.watch(ncrRepositoryProvider).commentsStream(ncrId);
});

/// Offline drafts list.
final draftsProvider = FutureProvider<List<NcrDraft>>((ref) async {
  return ref.watch(draftRepositoryProvider).loadDrafts();
});

/// All NCRs that still have remaining held quantity (for the Holds screen).
class HoldSummary {
  HoldSummary({
    required this.ncr,
    required this.reservedQty,
    required this.totalSortedQty,
    required this.totalDestroyedQty,
    required this.remainingQty,
  });

  final NcrReport ncr;
  final num reservedQty;
  final num totalSortedQty;
  final num totalDestroyedQty;
  final num remainingQty;
}

final holdsOverviewProvider =
    FutureProvider<List<HoldSummary>>((ref) async {
  final companyId = ref.watch(selectedCompanyIdProvider);
  if (companyId == null) return const [];
  final repo = ref.watch(ncrRepositoryProvider);
  final reports = await repo.fetchReports(companyId);

  final List<HoldSummary> result = [];
  for (final ncr in reports) {
    final reserved = (ncr.reservedQty ?? 0);
    if (reserved <= 0) continue;
    final logs = await repo.fetchHoldLogs(ncr.id);
    num sorted = 0;
    num destroyed = 0;
    for (final l in logs) {
      sorted += l.sortedQty;
      destroyed += l.destroyedQty;
    }
    final remaining = reserved - sorted;
    final clamped = remaining < 0 ? 0 : remaining;
    if (clamped > 0) {
      result.add(HoldSummary(
        ncr: ncr,
        reservedQty: reserved,
        totalSortedQty: sorted,
        totalDestroyedQty: destroyed,
        remainingQty: clamped,
      ));
    }
  }
  return result;
});

/// Dashboard statistics.
class NcrStats {
  NcrStats({
    required this.total,
    required this.open,
    required this.inProgress,
    required this.closed,
    required this.highSeverity,
  });

  final int total;
  final int open;
  final int inProgress;
  final int closed;
  final int highSeverity;
}

final ncrStatsProvider = FutureProvider<NcrStats>((ref) async {
  final reports = await ref.watch(ncrListProvider.future);
  int open = 0, inProgress = 0, closed = 0, high = 0;
  for (final r in reports) {
    switch (r.status) {
      case 'open':
        open++;
        break;
      case 'in_progress':
      case 'pending_review':
        inProgress++;
        break;
      case 'closed':
        closed++;
        break;
    }
    if (r.severity == 'high') high++;
  }
  return NcrStats(
    total: reports.length,
    open: open,
    inProgress: inProgress,
    closed: closed,
    highSeverity: high,
  );
});

/// Helper to refresh NCR-related providers after a mutation.
void invalidateNcrData(Ref ref, {String? ncrId}) {
  ref.invalidate(ncrListProvider);
  ref.invalidate(ncrStatsProvider);
  ref.invalidate(holdsOverviewProvider);
  if (ncrId != null) {
    ref.invalidate(ncrDetailsProvider(ncrId));
    ref.invalidate(holdLogsProvider(ncrId));
  }
}
