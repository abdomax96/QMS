import React from 'react';
import { KpiCard } from './KpiCard';
import type { KpiMetric } from '../dashboard.types';

interface KpiGridProps {
  metrics: KpiMetric[];
  /** عدد الأعمدة على الشاشات الكبيرة (افتراضي 4) */
  cols?: 2 | 3 | 4 | 5 | 6;
}

const colsMap: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  6: 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
};

export const KpiGrid: React.FC<KpiGridProps> = ({ metrics, cols = 4 }) => (
  <div className={`grid grid-cols-1 ${colsMap[cols]} gap-4`}>
    {metrics.map(m => <KpiCard key={m.id} metric={m} />)}
  </div>
);
