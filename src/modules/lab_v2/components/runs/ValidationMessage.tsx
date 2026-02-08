import React from 'react';
import type { LabV2EvaluationResult } from '../../types/run.types';
import { LAB_V2_EVALUATION_LABELS } from '../../constants/statuses';
import { cn } from '../../../../utils';

const resultStyles: Record<LabV2EvaluationResult, string> = {
  pass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  fail: 'text-rose-700 bg-rose-50 border-rose-200',
  warning: 'text-amber-700 bg-amber-50 border-amber-200',
  na: 'text-slate-600 bg-slate-50 border-slate-200',
};

export const ValidationMessage: React.FC<{
  result: LabV2EvaluationResult;
  message_ar?: string;
  className?: string;
}> = ({ result, message_ar, className }) => {
  return (
    <div className={cn('inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs border', resultStyles[result], className)}>
      <span className="font-medium">{LAB_V2_EVALUATION_LABELS[result]}</span>
      {message_ar ? <span className="opacity-90">{message_ar}</span> : null}
    </div>
  );
};

export default ValidationMessage;

