import React from 'react';

interface HrInlineInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const HrInlineInput: React.FC<HrInlineInputProps> = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${className}`.trim()}
  />
);

interface HrInlineSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

export const HrInlineSelect: React.FC<HrInlineSelectProps> = ({ className = '', children, ...props }) => (
  <select
    {...props}
    className={`h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${className}`.trim()}
  >
    {children}
  </select>
);

interface HrInlineCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const HrInlineCheckbox: React.FC<HrInlineCheckboxProps> = ({ label, className = '', ...props }) => (
  <label className={`inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 ${className}`.trim()}>
    <input
      {...props}
      type="checkbox"
      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950"
    />
    <span>{label}</span>
  </label>
);

interface HrInlineActionsProps {
  saving?: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export const HrInlineActions: React.FC<HrInlineActionsProps> = ({
  saving = false,
  onSave,
  onCancel,
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {saving ? 'جارٍ الحفظ...' : 'حفظ'}
    </button>
    <button
      type="button"
      onClick={onCancel}
      disabled={saving}
      className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      إلغاء
    </button>
  </div>
);

interface HrInlineRowProps {
  className?: string;
  saving?: boolean;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}

export const HrInlineRow: React.FC<HrInlineRowProps> = ({
  className = '',
  saving = false,
  onSave,
  onCancel,
  children,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    const target = event.target as HTMLElement | null;
    const tagName = target?.tagName ?? '';

    if (event.key === 'Enter') {
      if (tagName === 'TEXTAREA' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      event.preventDefault();
      if (!saving) {
        onSave();
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      if (!saving) {
        onCancel();
      }
    }
  };

  return (
    <tr
      data-inline-row="true"
      onKeyDown={handleKeyDown}
      className={`${className} outline outline-1 -outline-offset-1 outline-emerald-200 dark:outline-emerald-900/60`.trim()}
    >
      {children}
    </tr>
  );
};
