import { useMemo } from 'react';
import {
  DocumentTextIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { useNcrs } from '../../../hooks/ncr/useNcrs';
import { calcTrend, countByMonth } from '../dashboard.types';
import type { KpiMetric, MonthlyPoint } from '../dashboard.types';
import type { NcrRecord } from '../../../types/ncr';

const MONTH_LABELS: Record<string, string> = {
  '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
  '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
  '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
};

const IN_PROGRESS_STATUSES = new Set(['in_progress', 'analysis', 'action', 'verification', 'pending_review']);

export interface NcrDashboardData {
  kpis: KpiMetric[];
  monthlyTrend: MonthlyPoint[];
  severityDist: { label: string; value: number; color: string; pct: number }[];
  deptDist: { dept: string; count: number }[];
  recentNcrs: NcrRecord[];
  overdueNcrs: NcrRecord[];
  isLoading: boolean;
}

export function useNcrDashboard(): NcrDashboardData {
  const { ncrs, isLoading } = useNcrs();

  return useMemo(() => {
    const total = ncrs.length;
    const open = ncrs.filter((n: NcrRecord) => n.status === 'open').length;
    const inProgress = ncrs.filter((n: NcrRecord) => IN_PROGRESS_STATUSES.has(n.status)).length;
    const closed = ncrs.filter((n: NcrRecord) => n.status === 'closed').length;
    const highSeverity = ncrs.filter((n: NcrRecord) => n.severity === 'high').length;

    const closureRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    const highSeverityPct = total > 0 ? Math.round((highSeverity / total) * 100) : 0;

    // Overdue: open > 7 days
    const overdueNcrs = ncrs.filter((n: NcrRecord) =>
      n.status !== 'closed' && dayjs(n.date).isBefore(dayjs().subtract(7, 'day'))
    );
    const overdueRate = total > 0 ? Math.round((overdueNcrs.length / total) * 100) : 0;

    // Average resolution time (closed NCRs)
    const closedWithDates = ncrs.filter((n: NcrRecord) => n.status === 'closed' && n.closedAt && n.date);
    const avgResolutionDays = closedWithDates.length > 0
      ? Math.round(
          closedWithDates.reduce((sum: number, n: NcrRecord) =>
            sum + dayjs(n.closedAt as string).diff(dayjs(n.date), 'day'), 0
          ) / closedWithDates.length
        )
      : 0;

    // Monthly trend (last 6 months)
    const now = dayjs();
    const monthlyMap: Record<string, number> = {};
    const monthlyTrend: MonthlyPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const key = now.subtract(i, 'month').format('YYYY-MM');
      monthlyMap[key] = 0;
    }
    ncrs.forEach((n: NcrRecord) => {
      const key = dayjs(n.date).format('YYYY-MM');
      if (key in monthlyMap) monthlyMap[key]++;
    });
    Object.entries(monthlyMap).forEach(([key, value]) => {
      const monthNum = key.split('-')[1];
      monthlyTrend.push({ month: MONTH_LABELS[monthNum] || monthNum, value });
    });

    // Trends
    const { current: curMonth, previous: prevMonth } = countByMonth(
      ncrs, (n: NcrRecord) => n.date
    );
    const monthTrend = { ...calcTrend(curMonth, prevMonth), isPositive: false }; // ارتفاع NCR سيء

    const { current: curClosed, previous: prevClosed } = countByMonth(
      ncrs.filter((n: NcrRecord) => n.status === 'closed'),
      (n: NcrRecord) => (n.closedAt as string | undefined) ?? null
    );
    const closureTrend = { ...calcTrend(curClosed, prevClosed), isPositive: true };

    // Severity distribution
    const mediumSeverity = ncrs.filter((n: NcrRecord) => n.severity === 'medium').length;
    const lowSeverity = ncrs.filter((n: NcrRecord) => n.severity === 'low').length;
    const severityDist = [
      { label: 'مرتفع', value: highSeverity, color: '#ef4444', pct: total ? Math.round(highSeverity / total * 100) : 0 },
      { label: 'متوسط', value: mediumSeverity, color: '#f59e0b', pct: total ? Math.round(mediumSeverity / total * 100) : 0 },
      { label: 'منخفض', value: lowSeverity, color: '#10b981', pct: total ? Math.round(lowSeverity / total * 100) : 0 },
    ];

    // Department distribution
    const deptMap: Record<string, number> = {};
    ncrs.forEach((n: NcrRecord) => {
      const d = n.department || 'غير محدد';
      deptMap[d] = (deptMap[d] || 0) + 1;
    });
    const deptDist = Object.entries(deptMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([dept, count]) => ({ dept, count }));

    // KPIs
    const kpis: KpiMetric[] = [
      {
        id: 'closure_rate',
        label: 'معدل الإغلاق',
        value: closureRate,
        unit: '%',
        icon: CheckCircleIcon,
        color: closureRate >= 70 ? 'green' : closureRate >= 40 ? 'yellow' : 'red',
        trend: closureTrend,
        highlight: closureRate < 40,
      },
      {
        id: 'open',
        label: 'مفتوحة الآن',
        value: open,
        icon: ClockIcon,
        color: open > 5 ? 'red' : 'yellow',
        highlight: open > 5,
        href: '/ncr',
      },
      {
        id: 'in_progress',
        label: 'قيد المعالجة',
        value: inProgress,
        icon: ArrowTrendingUpIcon,
        color: 'purple',
        href: '/ncr',
      },
      {
        id: 'high_severity_pct',
        label: 'خطورة مرتفعة',
        value: highSeverityPct,
        unit: '%',
        icon: ShieldExclamationIcon,
        color: highSeverityPct > 30 ? 'red' : 'orange',
        highlight: highSeverityPct > 30,
        subtitle: `${highSeverity} تقرير`,
      },
      {
        id: 'overdue_rate',
        label: 'متأخرة (>7 أيام)',
        value: overdueNcrs.length,
        icon: ExclamationTriangleIcon,
        color: overdueNcrs.length > 0 ? 'red' : 'green',
        highlight: overdueNcrs.length > 0,
        subtitle: overdueNcrs.length > 0 ? `${overdueRate}% من الإجمالي` : 'ممتاز',
        href: '/ncr',
      },
      {
        id: 'avg_resolution',
        label: 'متوسط وقت الحل',
        value: avgResolutionDays,
        unit: 'يوم',
        icon: CalendarDaysIcon,
        color: avgResolutionDays > 14 ? 'red' : avgResolutionDays > 7 ? 'yellow' : 'green',
        trend: monthTrend,
        subtitle: `هذا الشهر: ${curMonth} جديد`,
      },
    ];

    const recentNcrs = [...ncrs]
      .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
      .slice(0, 5);

    return { kpis, monthlyTrend, severityDist, deptDist, recentNcrs, overdueNcrs, isLoading };
  }, [ncrs, isLoading]);
}
