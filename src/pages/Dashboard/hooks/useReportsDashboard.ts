import { useMemo } from 'react';
import {
  FolderIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import useStore from '../../../store';
import { calcTrend, countByMonth } from '../dashboard.types';
import type { KpiMetric, MonthlyPoint } from '../dashboard.types';

const MONTH_LABELS: Record<string, string> = {
  '0': 'يناير', '1': 'فبراير', '2': 'مارس', '3': 'أبريل',
  '4': 'مايو', '5': 'يونيو', '6': 'يوليو', '7': 'أغسطس',
  '8': 'سبتمبر', '9': 'أكتوبر', '10': 'نوفمبر', '11': 'ديسمبر',
};

export interface ReportsDashboardData {
  kpis: KpiMetric[];
  monthlyReports: MonthlyPoint[];
  statusDistribution: { label: string; value: number; color: string }[];
  recentReports: { id: string; name: string; status: string; createdAt: string }[];
  isLoading: boolean;
}

export function useReportsDashboard(): ReportsDashboardData {
  const { folders, formTemplates, formInstances, isLoading } = useStore();

  return useMemo(() => {
    const instances = Object.values(formInstances);
    const total = instances.length;
    const drafts = instances.filter(i => i.status === 'draft').length;
    const submitted = instances.filter(i => i.status === 'submitted').length;
    const approved = instances.filter(i => i.status === 'approved').length;
    const rejected = instances.filter(i => i.status === 'rejected').length;

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

    // --- Trends ---
    const { current: curReports, previous: prevReports } = countByMonth(
      instances, i => i.created_at
    );
    const reportsTrend = { ...calcTrend(curReports, prevReports), isPositive: true };

    // Approval rate this month vs last (simple count comparison)
    const curApproved = instances.filter(i => {
      const d = new Date(i.created_at);
      const now = new Date();
      return i.status === 'approved' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const prevApproved = instances.filter(i => {
      const d = new Date(i.created_at);
      const prev = new Date(); prev.setMonth(prev.getMonth() - 1);
      return i.status === 'approved' && d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear();
    }).length;
    const approvalTrend = { ...calcTrend(curApproved, prevApproved), isPositive: true };

    // --- Monthly chart (last 6 months) ---
    const now = new Date();
    const monthlyReports: MonthlyPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const count = instances.filter(inst => {
        const cd = new Date(inst.created_at);
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
      }).length;
      monthlyReports.push({ month: MONTH_LABELS[String(d.getMonth())], value: count });
    }

    // --- KPIs ---
    const kpis: KpiMetric[] = [
      {
        id: 'total_reports',
        label: 'إجمالي التقارير',
        value: total,
        icon: ClipboardDocumentCheckIcon,
        color: 'blue',
        trend: reportsTrend,
        subtitle: `هذا الشهر: ${curReports}`,
        href: '/forms&reports',
      },
      {
        id: 'approval_rate',
        label: 'معدل الاعتماد',
        value: approvalRate,
        unit: '%',
        icon: CheckCircleIcon,
        color: approvalRate >= 70 ? 'green' : approvalRate >= 40 ? 'yellow' : 'red',
        trend: approvalTrend,
        highlight: approvalRate < 40,
      },
      {
        id: 'rejection_rate',
        label: 'معدل الرفض',
        value: rejectionRate,
        unit: '%',
        icon: XCircleIcon,
        color: rejectionRate > 30 ? 'red' : rejectionRate > 10 ? 'yellow' : 'green',
        highlight: rejectionRate > 30,
      },
      {
        id: 'drafts',
        label: 'مسودات معلقة',
        value: drafts,
        icon: ClockIcon,
        color: drafts > 10 ? 'orange' : 'yellow',
        highlight: drafts > 10,
        href: '/forms&reports',
      },
      {
        id: 'submitted',
        label: 'بانتظار الاعتماد',
        value: submitted,
        icon: DocumentTextIcon,
        color: 'purple',
        href: '/forms&reports',
      },
      {
        id: 'folders',
        label: 'المجلدات',
        value: Object.keys(folders).length,
        icon: FolderIcon,
        color: 'gray',
        href: '/forms&reports',
      },
    ];

    const statusDistribution = [
      { label: 'معتمد', value: approved, color: '#10b981' },
      { label: 'مسودة', value: drafts, color: '#f59e0b' },
      { label: 'مرفوض', value: rejected, color: '#ef4444' },
      { label: 'بالانتظار', value: submitted, color: '#8b5cf6' },
    ].filter(s => s.value > 0);

    const recentReports = instances
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(i => ({ id: i.instance_id, name: i.name || 'بدون عنوان', status: i.status, createdAt: i.created_at }));

    return { kpis, monthlyReports, statusDistribution, recentReports, isLoading };
  }, [folders, formTemplates, formInstances, isLoading]);
}
