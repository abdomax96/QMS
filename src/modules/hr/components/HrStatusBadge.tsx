import React from 'react';
import { cn } from '../../../utils';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  inactive: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  published: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  submitted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  closed: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  archived: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  in_review: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  daily: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
  regular: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  absent: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  leave: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  mission: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
};

export interface HrStatusBadgeProps {
  value: string | null | undefined;
  fallback?: string;
}

const normalize = (value: string | null | undefined) => (value || '').trim().toLowerCase().replace(/\s+/g, '_');

const HrStatusBadge: React.FC<HrStatusBadgeProps> = ({ value, fallback = 'غير محدد' }) => {
  const normalized = normalize(value);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-[11px] font-medium',
        STATUS_STYLES[normalized] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
      )}
    >
      {value || fallback}
    </span>
  );
};

export default HrStatusBadge;
