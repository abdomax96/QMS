import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import type { KpiMetric, KpiColor } from '../dashboard.types';

// ============ Color maps ============

const iconBg: Record<KpiColor, string> = {
  blue:   'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
  green:  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
  red:    'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
  yellow: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
  purple: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400',
  gray:   'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
  orange: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
};

const valueCls: Record<KpiColor, string> = {
  blue:   'text-blue-700 dark:text-blue-300',
  green:  'text-emerald-700 dark:text-emerald-300',
  red:    'text-red-700 dark:text-red-300',
  yellow: 'text-amber-700 dark:text-amber-300',
  purple: 'text-violet-700 dark:text-violet-300',
  gray:   'text-slate-700 dark:text-slate-300',
  orange: 'text-orange-700 dark:text-orange-300',
};

const borderHighlight: Record<KpiColor, string> = {
  blue:   'border-blue-400 dark:border-blue-600',
  green:  'border-emerald-400 dark:border-emerald-600',
  red:    'border-red-400 dark:border-red-600',
  yellow: 'border-amber-400 dark:border-amber-600',
  purple: 'border-violet-400 dark:border-violet-600',
  gray:   'border-slate-400 dark:border-slate-600',
  orange: 'border-orange-400 dark:border-orange-600',
};

// ============ Trend badge ============

const TrendBadge: React.FC<{ percent: number; direction: 'up' | 'down' | 'neutral'; isPositive: boolean }> = ({
  percent, direction, isPositive,
}) => {
  if (direction === 'neutral' || percent === 0) return null;

  const positive = (direction === 'up' && isPositive) || (direction === 'down' && !isPositive);
  const cls = positive
    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
    : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
  const Arrow = direction === 'up' ? ArrowUpIcon : ArrowDownIcon;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${cls}`}>
      <Arrow className="w-3 h-3" />
      {percent}%
    </span>
  );
};

// ============ KpiCard ============

interface KpiCardProps {
  metric: KpiMetric;
}

export const KpiCard: React.FC<KpiCardProps> = ({ metric }) => {
  const { icon: Icon, color, label, value, unit, trend, href, highlight, subtitle } = metric;

  const inner = (
    <div
      className={[
        'bg-white dark:bg-slate-800 rounded-xl p-4 border transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        highlight
          ? `border-2 ${borderHighlight[color]}`
          : 'border-slate-200/70 dark:border-slate-700/70',
        href ? 'cursor-pointer' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={`p-2.5 rounded-lg ${iconBg[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <TrendBadge
            percent={trend.percent}
            direction={trend.direction}
            isPositive={trend.isPositive}
          />
        )}
      </div>

      <p className={`text-2xl font-bold leading-none mb-1 ${valueCls[color]}`}>
        {value}
        {unit && <span className="text-base font-medium mr-0.5">{unit}</span>}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      {subtitle && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
      )}
    </div>
  );

  if (href) {
    return <Link to={href}>{inner}</Link>;
  }
  return inner;
};
