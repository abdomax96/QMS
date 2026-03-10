import React from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { KpiGrid } from '../components/KpiGrid';
import { SectionCard, ListItem, EmptyState, MiniBarChart, StatusBadge } from '../components/SectionCard';
import { AlertRow } from '../components/AlertRow';
import { useNcrDashboard } from '../hooks/useNcrDashboard';
import { PageSkeleton } from '../../../components/common/LoadingStates';
import type { NcrRecord } from '../../../types/ncr';

function severityVariant(s: string): 'red' | 'yellow' | 'green' {
  return s === 'high' ? 'red' : s === 'medium' ? 'yellow' : 'green';
}
function severityLabel(s: string) {
  return s === 'high' ? 'مرتفع' : s === 'medium' ? 'متوسط' : 'منخفض';
}

const NcrTab: React.FC = () => {
  const { kpis, monthlyTrend, severityDist, deptDist, recentNcrs, overdueNcrs, isLoading } = useNcrDashboard();

  const overdueAlerts = overdueNcrs.map((n: NcrRecord) => ({
    id: n.id,
    label: `${n.number} (${dayjs().diff(dayjs(n.date), 'day')} يوم)`,
    href: `/ncr/${n.id}`,
  }));

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      {/* Alerts */}
      <AlertRow title="تقارير متأخرة" items={overdueAlerts} href="/ncr" />

      {/* Quick action */}
      <div className="flex justify-end">
        <Link
          to="/ncr/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          تقرير جديد
        </Link>
      </div>

      {/* KPIs */}
      <KpiGrid metrics={kpis} cols={3} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly trend */}
        <SectionCard title="الاتجاه الشهري (6 أشهر)" className="lg:col-span-1">
          <div className="p-4">
            <MiniBarChart data={monthlyTrend} color="#ef4444" />
          </div>
        </SectionCard>

        {/* Severity distribution */}
        <SectionCard title="توزيع الخطورة" className="lg:col-span-1">
          <div className="p-4 space-y-3">
            {severityDist.map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-400">{s.label}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{s.value} ({s.pct}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}

            {/* Department tags */}
            {deptDist.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 mt-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">حسب القسم</p>
                <div className="flex flex-wrap gap-1.5">
                  {deptDist.map(d => (
                    <span
                      key={d.dept}
                      className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full"
                    >
                      {d.dept}
                      <span className="font-semibold text-primary-600">{d.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Recent NCRs */}
        <SectionCard title="أحدث التقارير" viewAllHref="/ncr" className="lg:col-span-1">
          {recentNcrs.length === 0 ? (
            <EmptyState message="لا توجد تقارير" />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {recentNcrs.map((n: NcrRecord) => (
                <ListItem
                  key={n.id}
                  href={`/ncr/${n.id}`}
                  primary={n.number}
                  secondary={`${n.department || ''} · ${dayjs(n.date).format('DD/MM/YYYY')}`}
                  trailing={
                    <StatusBadge label={severityLabel(n.severity)} variant={severityVariant(n.severity)} />
                  }
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Overdue detail */}
      {overdueNcrs.length > 0 && (
        <SectionCard title={`تقارير متأخرة (${overdueNcrs.length})`}>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {overdueNcrs.slice(0, 8).map((n: NcrRecord) => (
              <ListItem
                key={n.id}
                href={`/ncr/${n.id}`}
                primary={n.number}
                secondary={n.productName || n.department || ''}
                trailing={
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                    {dayjs().diff(dayjs(n.date), 'day')} يوم
                  </span>
                }
              />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
};

export default NcrTab;
