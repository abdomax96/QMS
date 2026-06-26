import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/labels.dart';
import '../models/ncr_models.dart';

class CapaActionCard extends StatelessWidget {
  const CapaActionCard({
    super.key,
    required this.action,
    this.canComplete = false,
    this.onStatusChange,
  });

  final CapaAction action;
  final bool canComplete;
  final ValueChanged<String>? onStatusChange;

  Color get _statusColor {
    switch (action.status) {
      case 'completed':
        return AppTheme.statusClosed;
      case 'in-progress':
        return AppTheme.statusInProgress;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  action.type == 'preventive'
                      ? Icons.shield_outlined
                      : Icons.build_outlined,
                  color: AppTheme.primary,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(Labels.capaType(action.type),
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(Labels.capaStatus(action.status),
                      style: TextStyle(
                          color: _statusColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 12)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(action.description),
            const SizedBox(height: 8),
            if (action.responsiblePerson != null ||
                action.responsibleDept != null)
              _infoRow(Icons.person_outline,
                  '${action.responsiblePerson ?? ''} ${action.responsibleDept != null ? '- ${action.responsibleDept}' : ''}'),
            if (action.targetDate != null)
              _infoRow(Icons.event_outlined,
                  'الموعد المستهدف: ${action.targetDate}'),
            if (canComplete && !action.isCompleted) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  if (action.status == 'pending')
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => onStatusChange?.call('in-progress'),
                        child: const Text('بدء التنفيذ'),
                      ),
                    ),
                  if (action.status == 'pending') const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.statusClosed),
                      onPressed: () => onStatusChange?.call('completed'),
                      child: const Text('إكمال'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) => Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Row(
          children: [
            Icon(icon, size: 15, color: Colors.grey.shade600),
            const SizedBox(width: 6),
            Expanded(
              child: Text(text,
                  style:
                      TextStyle(fontSize: 13, color: Colors.grey.shade700)),
            ),
          ],
        ),
      );
}
