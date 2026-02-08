import React from 'react';
import type { LabV2RunStatus } from '../../types/run.types';
import { LAB_V2_RUN_STATUS_LABELS } from '../../constants/statuses';
import { cn } from '../../../../utils';

const statusStyles: Record<LabV2RunStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const RunStatusBadge: React.FC<{ status: LabV2RunStatus }> = ({ status }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
        statusStyles[status]
      )}
    >
      {LAB_V2_RUN_STATUS_LABELS[status]}
    </span>
  );
};

export default RunStatusBadge;

