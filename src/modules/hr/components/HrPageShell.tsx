import React from 'react';

export interface HrPageStat {
  label: string;
  value: string | number;
  helper?: string;
  accent?: 'blue' | 'green' | 'amber' | 'rose' | 'indigo' | 'slate';
}

interface HrPageShellProps {
  title: string;
  description: string;
  stats?: HrPageStat[];
  children: React.ReactNode;
}

export const HrSectionCard: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, actions, children }) => (
  <section className="space-y-2">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        {description ? null : null}
      </div>
      {actions}
    </div>
    <div>{children}</div>
  </section>
);

export const HrDataGrid: React.FC<{
  rowCount: number;
  columnCount: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ rowCount, columnCount, footer, children }) => (
  <div className="overflow-hidden border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
    <div
      className="
        max-h-[70vh]
        overflow-auto
        [&_table]:min-w-full
        [&_table]:border-separate
        [&_table]:border-spacing-0
        [&_table]:text-xs
        [&_thead_th]:bg-slate-50
        dark:[&_thead_th]:bg-slate-950/40
        [&_thead_tr]:text-right
        [&_thead_tr]:text-slate-500
        dark:[&_thead_tr]:text-slate-400
        [&_thead_tr>*+*]:border-r
        [&_thead_tr>*+*]:border-slate-200
        dark:[&_thead_tr>*+*]:border-slate-800
        [&_tbody_tr>*+*]:border-r
        [&_tbody_tr>*+*]:border-slate-100
        dark:[&_tbody_tr>*+*]:border-slate-800
        [&_th]:border-b
        [&_th]:border-slate-200
        dark:[&_th]:border-slate-800
        [&_th]:px-3
        [&_th]:py-2
        [&_th]:font-medium
        [&_th]:whitespace-nowrap
        [&_thead_th]:sticky
        [&_thead_th]:top-0
        [&_thead_th]:z-10
        [&_thead_th]:bg-clip-padding
        [&_td]:border-b
        [&_td]:border-slate-100
        dark:[&_td]:border-slate-800
        [&_td]:px-3
        [&_td]:py-2
        [&_td]:align-middle
        [&_tbody_tr]:text-slate-700
        dark:[&_tbody_tr]:text-slate-200
        [&_tbody_tr:nth-child(even)]:bg-slate-50/40
        dark:[&_tbody_tr:nth-child(even)]:bg-slate-950/10
        [&_tbody_tr:hover]:bg-slate-50/70
        dark:[&_tbody_tr:hover]:bg-slate-950/30
      "
    >
      {children}
    </div>
    {footer ? (
      <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-800">{footer}</div>
    ) : (
      <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>{rowCount} rows</span>
        <span>{columnCount} columns</span>
      </div>
    )}
  </div>
);

export const HrPageShell: React.FC<HrPageShellProps> = ({ title, children }) => (
  <div className="space-y-4 p-3 sm:p-4">
    <header className="border-b border-slate-200 pb-3 dark:border-slate-800">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
    </header>
    {children}
  </div>
);

export default HrPageShell;
