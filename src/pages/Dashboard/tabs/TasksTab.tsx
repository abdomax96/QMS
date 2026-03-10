import React from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { KpiGrid } from '../components/KpiGrid';
import { SectionCard, ListItem, EmptyState, StatusBadge } from '../components/SectionCard';
import { AlertRow } from '../components/AlertRow';
import { useTasksDashboard, TASK_CATEGORY_LABELS } from '../hooks/useTasksDashboard';
import { PageSkeleton } from '../../../components/common/LoadingStates';
import { useTaskStore } from '../../../store/taskStore';
import type { Task } from '../../../types/task';

function taskStatusVariant(status: string): 'green' | 'blue' | 'yellow' | 'red' | 'gray' {
  if (status === 'completed') return 'green';
  if (status === 'in_progress') return 'blue';
  if (status === 'pending') return 'yellow';
  if (status === 'overdue') return 'red';
  return 'gray';
}

function taskStatusLabel(status: string): string {
  const map: Record<string, string> = {
    completed: 'مكتملة', in_progress: 'جارية',
    pending: 'معلقة', overdue: 'متأخرة',
    on_hold: 'موقوفة', cancelled: 'ملغاة',
  };
  return map[status] || status;
}

function priorityVariant(priority: string): 'red' | 'orange' | 'yellow' | 'gray' {
  if (priority === 'urgent') return 'red';
  if (priority === 'high') return 'orange';
  if (priority === 'medium') return 'yellow';
  return 'gray';
}

const TasksTab: React.FC = () => {
  const { fetchTasks, isLoading } = useTaskStore();
  const { kpis, byCategory, byStage, recentTasks, overdueTasks } = useTasksDashboard();

  React.useEffect(() => { fetchTasks(); }, []);

  const overdueAlerts = overdueTasks.map((t: Task) => ({
    id: t.id,
    label: `${t.title} (${t.due_date ? dayjs().diff(dayjs(t.due_date), 'day') : 0} يوم)`,
    href: `/tasks/${t.id}`,
  }));

  if (isLoading && recentTasks.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      {/* Alerts */}
      <AlertRow title="مهام متأخرة" items={overdueAlerts} href="/tasks" />

      {/* Quick action */}
      <div className="flex justify-end">
        <Link
          to="/tasks/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          مهمة جديدة
        </Link>
      </div>

      {/* KPIs */}
      <KpiGrid metrics={kpis} cols={3} />

      {/* Content row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* By category */}
        <SectionCard title="توزيع حسب الفئة" className="lg:col-span-1">
          <div className="p-4 space-y-2">
            {byCategory.length === 0 ? (
              <EmptyState message="لا توجد مهام" />
            ) : (
              byCategory.map(c => (
                <div key={c.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400">{c.label}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{c.count} ({c.pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-500"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              ))
            )}

            {/* By stage mini view */}
            {byStage.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 mt-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">حسب المرحلة</p>
                <div className="flex flex-wrap gap-1.5">
                  {byStage.map(s => (
                    <span
                      key={s.label}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      style={{ borderLeft: `3px solid ${s.color}` }}
                    >
                      {s.label}
                      <span className="font-semibold" style={{ color: s.color }}>{s.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Recent tasks */}
        <SectionCard title="أحدث المهام" viewAllHref="/tasks" className="lg:col-span-1">
          {recentTasks.length === 0 ? (
            <EmptyState message="لا توجد مهام" />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {recentTasks.map((t: Task) => (
                <ListItem
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  primary={t.title}
                  secondary={TASK_CATEGORY_LABELS[t.category] || t.category}
                  trailing={
                    <StatusBadge label={taskStatusLabel(t.status)} variant={taskStatusVariant(t.status)} />
                  }
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* Overdue tasks */}
        <SectionCard title={`متأخرة (${overdueTasks.length})`} viewAllHref="/tasks" className="lg:col-span-1">
          {overdueTasks.length === 0 ? (
            <EmptyState message="لا يوجد تأخير — ممتاز!" />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {overdueTasks.map((t: Task) => (
                <ListItem
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  primary={t.title}
                  secondary={t.due_date ? dayjs(t.due_date).format('DD/MM/YYYY') : ''}
                  trailing={
                    <div className="flex items-center gap-1">
                      <StatusBadge label={t.priority ? t.priority : 'عادي'} variant={priorityVariant(t.priority || '')} />
                      <span className="text-xs text-red-500 font-medium">
                        {t.due_date ? `${dayjs().diff(dayjs(t.due_date), 'day')}ي` : ''}
                      </span>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default TasksTab;
