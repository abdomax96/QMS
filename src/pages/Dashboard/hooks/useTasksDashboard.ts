import { useMemo } from 'react';
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { useTaskStore } from '../../../store/taskStore';
import { calcTrend, countByMonth } from '../dashboard.types';
import type { KpiMetric } from '../dashboard.types';
import type { Task } from '../../../types/task';
import { TASK_STAGE_LABELS } from '../../../types/task';

export const TASK_CATEGORY_LABELS: Record<string, string> = {
  general: 'عامة',
  ncr: 'عدم مطابقة',
  quality: 'جودة',
  maintenance: 'صيانة',
  safety: 'سلامة',
  training: 'تدريب',
  audit: 'تدقيق',
};

export interface TasksDashboardData {
  kpis: KpiMetric[];
  byCategory: { label: string; count: number; pct: number }[];
  byStage: { label: string; count: number; color: string }[];
  recentTasks: Task[];
  overdueTasks: Task[];
  isLoading: boolean;
}

export function useTasksDashboard(): TasksDashboardData {
  const { tasks, getOverdueTasks, isLoading } = useTaskStore();

  return useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = getOverdueTasks();
    const overdueCount = overdueTasks.length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const overdueRate = total > 0 ? Math.round((overdueCount / total) * 100) : 0;

    // Average task age (open tasks)
    const openTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
    const avgAgedays = openTasks.length > 0
      ? Math.round(
          openTasks.reduce((sum, t) => sum + dayjs().diff(dayjs(t.created_at), 'day'), 0) / openTasks.length
        )
      : 0;

    // Monthly trends
    const { current: curCompleted, previous: prevCompleted } = countByMonth(
      tasks.filter(t => t.status === 'completed'),
      t => t.updated_at
    );
    const completionTrend = { ...calcTrend(curCompleted, prevCompleted), isPositive: true };

    const { current: curNew, previous: prevNew } = countByMonth(tasks, t => t.created_at);
    const newTasksTrend = { ...calcTrend(curNew, prevNew), isPositive: false }; // المزيد = ضغط أكثر

    // By category
    const catMap: Record<string, number> = {};
    tasks.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + 1; });
    const byCategory = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({
        label: TASK_CATEGORY_LABELS[cat] || cat,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));

    // By stage
    const stageMap: Record<string, number> = {};
    tasks.forEach(t => {
      const stage = t.current_stage;
      if (stage) stageMap[stage] = (stageMap[stage] || 0) + 1;
    });
    const byStage = Object.entries(stageMap).map(([stage, count]) => ({
      label: TASK_STAGE_LABELS[stage as keyof typeof TASK_STAGE_LABELS]?.ar || stage,
      count,
      color: TASK_STAGE_LABELS[stage as keyof typeof TASK_STAGE_LABELS]?.color || '#6b7280',
    }));

    // KPIs
    const kpis: KpiMetric[] = [
      {
        id: 'completion_rate',
        label: 'معدل الإنجاز',
        value: completionRate,
        unit: '%',
        icon: CheckCircleIcon,
        color: completionRate >= 70 ? 'green' : completionRate >= 40 ? 'yellow' : 'red',
        trend: completionTrend,
        subtitle: `${completed} مكتملة من ${total}`,
        highlight: completionRate < 40 && total > 0,
      },
      {
        id: 'overdue_count',
        label: 'متأخرة الآن',
        value: overdueCount,
        icon: ExclamationTriangleIcon,
        color: overdueCount > 5 ? 'red' : overdueCount > 0 ? 'orange' : 'green',
        highlight: overdueCount > 5,
        subtitle: overdueCount > 0 ? `${overdueRate}% من الإجمالي` : 'لا يوجد تأخير',
        href: '/tasks',
      },
      {
        id: 'in_progress',
        label: 'قيد التنفيذ',
        value: inProgress,
        icon: ArrowTrendingUpIcon,
        color: 'blue',
        href: '/tasks',
      },
      {
        id: 'pending',
        label: 'معلقة',
        value: pending,
        icon: ClockIcon,
        color: pending > 10 ? 'orange' : 'yellow',
        highlight: pending > 10,
        href: '/tasks',
      },
      {
        id: 'completed_this_month',
        label: 'منجزة هذا الشهر',
        value: curCompleted,
        icon: ClipboardDocumentListIcon,
        color: 'green',
        trend: completionTrend,
        href: '/tasks',
      },
      {
        id: 'avg_age',
        label: 'متوسط عمر المهمة',
        value: avgAgedays,
        unit: 'يوم',
        icon: CalendarDaysIcon,
        color: avgAgedays > 14 ? 'red' : avgAgedays > 7 ? 'yellow' : 'green',
        subtitle: `للمهام المفتوحة (${openTasks.length})`,
      },
    ];

    const recentTasks = [...tasks]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    return { kpis, byCategory, byStage, recentTasks, overdueTasks: overdueTasks.slice(0, 5), isLoading };
  }, [tasks, getOverdueTasks, isLoading]);
}
