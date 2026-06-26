import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/arabic_formatters.dart';
import '../../../core/utils/labels.dart';
import '../../../core/widgets/common_widgets.dart';
import '../models/ncr_models.dart';

class NcrListTile extends StatelessWidget {
  const NcrListTile({super.key, required this.report, this.onTap});

  final NcrReport report;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final severityColor = AppTheme.severityColor(report.severity);
    final statusColor = AppTheme.statusColor(report.status);

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 6,
                    height: 38,
                    decoration: BoxDecoration(
                      color: severityColor,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          report.number,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        Text(
                          report.title?.isNotEmpty == true
                              ? report.title!
                              : (report.department ?? '—'),
                          style: TextStyle(
                              color: Colors.grey.shade600, fontSize: 13),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  PillBadge(
                    label: Labels.status(report.status),
                    color: statusColor,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  PillBadge(
                    label: 'الشدة: ${Labels.severity(report.severity)}',
                    color: severityColor,
                    icon: Icons.warning_amber_rounded,
                  ),
                  PillBadge(
                    label: Labels.stage(report.currentStage),
                    color: AppTheme.primary,
                    icon: Icons.timeline,
                  ),
                  if (report.rpn != null)
                    PillBadge(
                      label: 'RPN: ${report.rpn}',
                      color: AppTheme.statusInProgress,
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.calendar_today_outlined,
                      size: 13, color: Colors.grey.shade500),
                  const SizedBox(width: 4),
                  Text(
                    ArabicFormatters.date(report.date ?? report.createdAt),
                    style:
                        TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  const Spacer(),
                  if (report.defectType != null)
                    Text(
                      Labels.defectType(report.defectType),
                      style:
                          TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
