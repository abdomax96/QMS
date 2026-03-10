import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  ChartPieIcon,
} from '@heroicons/react/24/outline';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { KpiGrid } from '../components/KpiGrid';
import { SectionCard, ListItem, EmptyState, MiniBarChart, StatusBadge } from '../components/SectionCard';
import { AlertRow } from '../components/AlertRow';
import { useReportsDashboard } from '../hooks/useReportsDashboard';
import { PageSkeleton } from '../../../components/common/LoadingStates';
import useStore from '../../../store';
import { formatDate } from '../../../utils';

const STATUS_MAP: Record<string, { label: string; variant: 'green' | 'yellow' | 'red' | 'purple' | 'gray' }> = {
  approved:  { label: 'معتمد',       variant: 'green' },
  draft:     { label: 'مسودة',       variant: 'yellow' },
  rejected:  { label: 'مرفوض',      variant: 'red' },
  submitted: { label: 'بالانتظار',   variant: 'purple' },
};

const ReportsTab: React.FC = () => {
  const navigate = useNavigate();
  const { isLoading, fetchAllData } = useStore();
  const { kpis, monthlyReports, statusDistribution, recentReports } = useReportsDashboard();

  React.useEffect(() => { fetchAllData(); }, []);

  const pendingAlert = recentReports
    .filter(r => r.status === 'draft')
    .map(r => ({ id: r.id, label: r.name, href: `/reports/edit/${r.id}` }));

  if (isLoading && recentReports.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      {/* Alerts */}
      <AlertRow title="مسودات قديمة بحاجة للمراجعة" items={pendingAlert} href="/forms&reports" />

      {/* Quick action */}
      <div className="flex justify-end">
        <button
          onClick={() => navigate('/forms&reports')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          تقرير جديد
        </button>
      </div>

      {/* KPIs */}
      <KpiGrid metrics={kpis} cols={3} />

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar chart */}
        <SectionCard title="النشاط الشهري (6 أشهر)" className="lg:col-span-1">
          <div className="p-4">
            <MiniBarChart data={monthlyReports} color="#6366f1" />
          </div>
        </SectionCard>

        {/* Pie chart */}
        <SectionCard title="توزيع الحالات" titleIcon={<ChartPieIcon className="w-4 h-4 text-slate-400" />} className="lg:col-span-1">
          <div className="p-4">
            {statusDistribution.length === 0 ? (
              <EmptyState message="لا توجد تقارير بعد" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="label"
                    label={false}
                  >
                    {statusDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        {/* Recent reports */}
        <SectionCard title="أحدث التقارير" viewAllHref="/forms&reports" className="lg:col-span-1">
          {recentReports.length === 0 ? (
            <EmptyState message="لا توجد تقارير" />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {recentReports.map(r => {
                const s = STATUS_MAP[r.status] || { label: r.status, variant: 'gray' as const };
                return (
                  <ListItem
                    key={r.id}
                    primary={r.name}
                    secondary={formatDate(r.createdAt)}
                    trailing={
                      <div className="flex items-center gap-1">
                        <StatusBadge label={s.label} variant={s.variant} />
                        <button
                          onClick={() => navigate(`/report/${r.id}`)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/reports/edit/${r.id}`)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default ReportsTab;
