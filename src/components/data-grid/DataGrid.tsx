import React from 'react';

interface DataGridProps {
  rowCount: number;
  columnCount: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const DataGrid: React.FC<DataGridProps> = ({ rowCount, columnCount, footer, children }) => (
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

export default DataGrid;

