import React from 'react';
import { Link } from 'react-router-dom';
import type { MonthlyPoint } from '../dashboard.types';

// ============ SectionCard — wrapper عام ============

interface SectionCardProps {
  title: string;
  titleIcon?: React.ReactNode;
  viewAllHref?: string;
  children: React.ReactNode;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title, titleIcon, viewAllHref, children, className = '',
}) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/70 overflow-hidden ${className}`}>
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
        {titleIcon}
        {title}
      </h3>
      {viewAllHref && (
        <Link to={viewAllHref} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
          عرض الكل
        </Link>
      )}
    </div>
    {children}
  </div>
);

// ============ ListItem — صف قائمة موحد ============

interface ListItemProps {
  href?: string;
  primary: string;
  secondary?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}

export const ListItem: React.FC<ListItemProps> = ({ href, primary, secondary, trailing, onClick }) => {
  const inner = (
    <div className="flex items-center justify-between gap-2 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{primary}</p>
        {secondary && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{secondary}</p>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );

  const cls = 'block hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors divide-y divide-slate-100 dark:divide-slate-700/60';

  if (href) return <Link to={href} className={cls}>{inner}</Link>;
  if (onClick) return <button onClick={onClick} className={`w-full text-right ${cls}`}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
};

// ============ EmptyState ============

export const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">{message}</p>
);

// ============ MiniBarChart ============

interface MiniBarChartProps {
  data: MonthlyPoint[];
  color?: string;
}

export const MiniBarChart: React.FC<MiniBarChartProps> = ({ data, color = '#6366f1' }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t transition-all duration-300"
            style={{
              height: `${Math.max((d.value / max) * 100, 4)}%`,
              backgroundColor: color,
              opacity: i === data.length - 1 ? 1 : 0.55,
            }}
            title={`${d.month}: ${d.value}`}
          />
          <span className="text-[10px] text-slate-400 leading-none">{d.month}</span>
        </div>
      ))}
    </div>
  );
};

// ============ StatusBadge ============

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple' | 'orange';

const badgeCls: Record<BadgeVariant, string> = {
  green:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  red:    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  yellow: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  blue:   'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  gray:   'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  purple: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, variant }) => (
  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${badgeCls[variant]}`}>
    {label}
  </span>
);
