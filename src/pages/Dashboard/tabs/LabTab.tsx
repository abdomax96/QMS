import React from 'react';
import { Link } from 'react-router-dom';
import { TruckIcon, BeakerIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { KpiGrid } from '../components/KpiGrid';
import { SectionCard, ListItem, EmptyState, StatusBadge } from '../components/SectionCard';
import { useLabDashboard } from '../hooks/useLabDashboard';
import { PageSkeleton } from '../../../components/common/LoadingStates';

function v2ResultVariant(result: string | null): 'green' | 'red' | 'yellow' | 'gray' {
  if (result === 'pass') return 'green';
  if (result === 'fail') return 'red';
  if (result === 'warning') return 'yellow';
  return 'gray';
}

function v2ResultLabel(result: string | null, status: string): string {
  if (result === 'pass') return 'ناجح';
  if (result === 'fail') return 'فاشل';
  if (result === 'warning') return 'تحذير';
  if (status === 'in_progress') return 'جارٍ';
  if (status === 'draft') return 'مسودة';
  return 'غير محدد';
}

function legacyStatusVariant(status: string): 'green' | 'red' | 'yellow' | 'gray' | 'blue' {
  if (status === 'approved') return 'green';
  if (status === 'rejected') return 'red';
  if (status === 'in_progress') return 'blue';
  if (status === 'completed') return 'green';
  return 'yellow';
}

function legacyStatusLabel(status: string): string {
  const map: Record<string, string> = {
    approved: 'معتمد', rejected: 'مرفوض',
    in_progress: 'جارٍ', completed: 'مكتمل', pending: 'معلق',
  };
  return map[status] || status;
}

const LabTab: React.FC = () => {
  const { kpis, v2Kpis, recentTests, supplierStats, recentV2Runs, isLoading } = useLabDashboard();

  if (isLoading && recentV2Runs.length === 0 && recentTests.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          to="/lab/receiving/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm transition-colors"
        >
          <TruckIcon className="w-4 h-4" />
          استلام مادة جديد
        </Link>
        <Link
          to="/lab/tests/runs/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm transition-colors"
        >
          <BeakerIcon className="w-4 h-4" />
          فحص جديد (v2)
        </Link>
      </div>

      {/* Lab v2 KPIs */}
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          فحوصات المختبر (نظام الفحص الجديد)
        </p>
        <KpiGrid metrics={v2Kpis} cols={5} />
      </div>

      {/* Legacy + supplier KPIs */}
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          استلام المواد والموردون
        </p>
        <KpiGrid metrics={kpis} cols={4} />
      </div>

      {/* Content row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent v2 runs */}
        <SectionCard title="أحدث فحوصات v2" viewAllHref="/lab/tests/runs" className="lg:col-span-1">
          {recentV2Runs.length === 0 ? (
            <EmptyState message="لا توجد فحوصات v2" />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {recentV2Runs.map(r => (
                <ListItem
                  key={r.id}
                  href={`/lab/tests/runs/${r.id}`}
                  primary={r.number}
                  secondary={dayjs(r.createdAt).format('DD/MM/YYYY')}
                  trailing={
                    <StatusBadge
                      label={v2ResultLabel(r.result, r.status)}
                      variant={v2ResultVariant(r.result)}
                    />
                  }
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent legacy tests */}
        <SectionCard title="فحوصات استلام المواد" viewAllHref="/lab" className="lg:col-span-1">
          {recentTests.length === 0 ? (
            <EmptyState message="لا توجد فحوصات" />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {recentTests.map(t => (
                <ListItem
                  key={t.id}
                  href={`/lab/tests/${t.id}`}
                  primary={t.number}
                  secondary={t.source}
                  trailing={
                    <StatusBadge
                      label={legacyStatusLabel(t.status)}
                      variant={legacyStatusVariant(t.status)}
                    />
                  }
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* Supplier stats */}
        <SectionCard title="الموردون والمواد" viewAllHref="/lab/suppliers" className="lg:col-span-1">
          <div className="p-3 space-y-2">
            {supplierStats.map(s => (
              <div
                key={s.label}
                className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
              >
                <span className="text-sm text-slate-600 dark:text-slate-400">{s.label}</span>
                <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default LabTab;
