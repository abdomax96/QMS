import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/labels.dart';
import '../models/ncr_models.dart';
import '../models/ncr_workflow.dart';

class NcrStageTimeline extends StatelessWidget {
  const NcrStageTimeline({super.key, required this.report});

  final NcrReport report;

  @override
  Widget build(BuildContext context) {
    final currentIndex = Labels.stageIndex(report.currentStage);
    final progress = NcrWorkflow.progress(report);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('مسار المراحل',
                    style: TextStyle(
                        fontSize: 16, fontWeight: FontWeight.bold)),
                Text('${(progress * 100).round()}%',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primary)),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 8,
                backgroundColor: Colors.grey.shade200,
              ),
            ),
            const SizedBox(height: 16),
            ...List.generate(Labels.stageOrder.length, (i) {
              final code = Labels.stageOrder[i];
              final isCompleted =
                  report.completedStages.contains(code) || i < currentIndex;
              final isCurrent = i == currentIndex && !report.isClosed;
              final isClosedDone = report.isClosed;
              return _stageRow(
                index: i,
                isLast: i == Labels.stageOrder.length - 1,
                label: Labels.stage(code),
                completed: isCompleted || isClosedDone,
                current: isCurrent,
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _stageRow({
    required int index,
    required bool isLast,
    required String label,
    required bool completed,
    required bool current,
  }) {
    final color = completed
        ? AppTheme.statusClosed
        : current
            ? AppTheme.primary
            : Colors.grey.shade400;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: current ? AppTheme.primary : Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(color: color, width: 2),
                ),
                child: completed
                    ? const Icon(Icons.check, size: 16, color: AppTheme.statusClosed)
                    : Center(
                        child: Text('${index + 1}',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: current ? Colors.white : color)),
                      ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    color: completed
                        ? AppTheme.statusClosed
                        : Colors.grey.shade300,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Padding(
            padding: const EdgeInsets.only(top: 4, bottom: 16),
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: current ? FontWeight.bold : FontWeight.normal,
                color: current ? AppTheme.primary : Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
