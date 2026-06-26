import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/arabic_formatters.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/ncr_comment.dart';
import '../providers/ncr_actions_provider.dart';
import '../providers/ncr_provider.dart';

class NcrCommentsPanel extends ConsumerStatefulWidget {
  const NcrCommentsPanel({
    super.key,
    required this.ncrId,
    required this.companyId,
  });

  final String ncrId;
  final String companyId;

  @override
  ConsumerState<NcrCommentsPanel> createState() => _NcrCommentsPanelState();
}

class _NcrCommentsPanelState extends ConsumerState<NcrCommentsPanel> {
  final _ctrl = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await ref
          .read(ncrActionsProvider)
          .addComment(widget.ncrId, text, companyId: widget.companyId);
      _ctrl.clear();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final commentsAsync = ref.watch(commentsStreamProvider(widget.ncrId));
    final currentUserId = ref.watch(currentProfileProvider)?.id;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'التعليقات',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            commentsAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => Padding(
                padding: const EdgeInsets.all(8),
                child: Text(
                  'تعذر تحميل التعليقات.',
                  style: TextStyle(color: Colors.grey.shade600),
                ),
              ),
              data: (comments) {
                if (comments.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Text(
                      'لا توجد تعليقات بعد.',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  );
                }
                return Column(
                  children: comments
                      .map((c) => _commentTile(c, c.authorId == currentUserId))
                      .toList(),
                );
              },
            ),
            const Divider(),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    minLines: 1,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'أضف تعليقاً...',
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _sending ? null : _send,
                  icon: _sending
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.send),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _commentTile(NcrComment c, bool isMine) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: AppTheme.primary,
            child: Text(
              (c.authorName?.isNotEmpty == true ? c.authorName![0] : '؟'),
              style: const TextStyle(color: Colors.white, fontSize: 13),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isMine
                    ? AppTheme.primary.withValues(alpha: 0.08)
                    : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        c.authorName ?? 'مستخدم',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        ArabicFormatters.dateTime(c.createdAt),
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(c.content),
                  if (isMine)
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton(
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: const Size(40, 28),
                          foregroundColor: AppTheme.severityHigh,
                        ),
                        onPressed: () => _delete(c.id),
                        child: const Text(
                          'حذف',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _delete(String id) async {
    final ok = await confirmDialog(
      context,
      title: 'حذف التعليق',
      message: 'هل تريد حذف هذا التعليق؟',
      confirmColor: AppTheme.severityHigh,
    );
    if (!ok) return;
    try {
      await ref.read(ncrActionsProvider).deleteComment(id);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }
}
