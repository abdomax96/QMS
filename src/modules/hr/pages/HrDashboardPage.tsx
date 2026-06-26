import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TableSkeleton } from '../../../components/common/LoadingStates';
import { formatDate } from '../../../utils';
import HrSortableHeader from '../components/HrSortableHeader';
import { HR_NAV_ITEMS } from '../constants/module';
import HrTablePager from '../components/HrTablePager';
import { HrDataGrid, HrPageShell, HrSectionCard, type HrPageStat } from '../components/HrPageShell';
import { usePaginatedRows } from '../hooks/usePaginatedRows';
import {
  createDateSorter,
  createNumberSorter,
  createTextSorter,
  useSortableRows,
} from '../hooks/useSortableRows';
import HrStatusBadge from '../components/HrStatusBadge';
import hrService from '../services/hrService';
import type { HrDashboardSummary, HrShiftPlanItem } from '../types';

const EMPTY_SUMMARY: HrDashboardSummary = {
  employeesCount: 0,
  dailyWorkersCount: 0,
  worksitesCount: 0,
  shiftPlansCount: 0,
  transportLinesCount: 0,
  openRequestsCount: 0,
  openPenaltiesCount: 0,
  payrollPeriodsCount: 0,
  submittedAttendanceBatchesCount: 0,
};

const HrDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<HrDashboardSummary>(EMPTY_SUMMARY);
  const [plans, setPlans] = useState<HrShiftPlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const [nextSummary, nextPlans] = await Promise.all([
        hrService.getDashboardSummary(),
        hrService.listShiftPlans(6),
      ]);

      if (!active) return;
      setSummary(nextSummary);
      setPlans(nextPlans);
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo<HrPageStat[]>(
    () => [
      { label: 'إجمالي العاملين', value: summary.employeesCount, helper: `${summary.dailyWorkersCount} عامل يومية`, accent: 'blue' },
      { label: 'مواقع العمل', value: summary.worksitesCount, helper: `${summary.transportLinesCount} خط سير نشط`, accent: 'green' },
      { label: 'خطط الورديات', value: summary.shiftPlansCount, helper: `${summary.submittedAttendanceBatchesCount} دفعة حضور بانتظار المراجعة`, accent: 'indigo' },
      { label: 'تشغيلات HR المفتوحة', value: summary.openRequestsCount + summary.openPenaltiesCount + summary.payrollPeriodsCount, helper: 'طلبات + جزاءات + فترات مرتبات غير مغلقة', accent: 'amber' },
    ],
    [summary]
  );

  const statsSorters = useMemo(
    () => ({
      label: createTextSorter<HrPageStat>((stat) => stat.label),
      value: createNumberSorter<HrPageStat>((stat) => stat.value),
      helper: createTextSorter<HrPageStat>((stat) => stat.helper),
    }),
    []
  );

  const pagesSorters = useMemo(
    () => ({
      label: createTextSorter<(typeof HR_NAV_ITEMS)[number]>((item) => item.label),
      path: createTextSorter<(typeof HR_NAV_ITEMS)[number]>((item) => item.path),
    }),
    []
  );

  const plansSorters = useMemo(
    () => ({
      name: createTextSorter<HrShiftPlanItem>((plan) => plan.name),
      status: createTextSorter<HrShiftPlanItem>((plan) => plan.status),
      period: createDateSorter<HrShiftPlanItem>((plan) => plan.periodStart),
      version: createNumberSorter<HrShiftPlanItem>((plan) => plan.version),
      publishedAt: createDateSorter<HrShiftPlanItem>((plan) => plan.publishedAt),
    }),
    []
  );

  const {
    sortedRows: sortedStats,
    sortKey: statsSortKey,
    sortDirection: statsSortDirection,
    toggleSort: toggleStatsSort,
  } = useSortableRows({
    rows: stats,
    sorters: statsSorters,
    initialSortKey: 'label',
  });
  const statsPager = usePaginatedRows({ rows: sortedStats });

  const {
    sortedRows: sortedNavItems,
    sortKey: pagesSortKey,
    sortDirection: pagesSortDirection,
    toggleSort: togglePagesSort,
  } = useSortableRows({
    rows: HR_NAV_ITEMS,
    sorters: pagesSorters,
    initialSortKey: 'label',
  });
  const navPager = usePaginatedRows({ rows: sortedNavItems });

  const {
    sortedRows: sortedPlans,
    sortKey: plansSortKey,
    sortDirection: plansSortDirection,
    toggleSort: togglePlansSort,
  } = useSortableRows({
    rows: plans,
    sorters: plansSorters,
    initialSortKey: 'period',
    initialDirection: 'desc',
  });
  const plansPager = usePaginatedRows({ rows: sortedPlans });

  return (
    <HrPageShell
      title="لوحة الموارد البشرية"
      description="هذا الموديول هو المصدر الأساسي لبيانات العاملين، التسكين، النقل، الورديات، والسياسات. تسجيل الحضور الخام اليومي يتم من قسم الإنتاج، ثم يعود هنا للمراجعة النهائية والربط بالمرتبات."
      stats={stats}
    >
      <div className="space-y-4">
        <HrSectionCard title="ملخص">
          <HrDataGrid
            rowCount={statsPager.totalRows}
            columnCount={4}
            footer={
              <HrTablePager
                page={statsPager.page}
                pageCount={statsPager.pageCount}
                pageSize={statsPager.pageSize}
                totalRows={statsPager.totalRows}
                fromRow={statsPager.fromRow}
                toRow={statsPager.toRow}
                onPageChange={statsPager.setPage}
                onPageSizeChange={statsPager.setPageSize}
              />
            }
          >
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th><HrSortableHeader label="المؤشر" sortKey="label" activeSortKey={statsSortKey} sortDirection={statsSortDirection} onToggle={toggleStatsSort} /></th>
                  <th><HrSortableHeader label="القيمة" sortKey="value" activeSortKey={statsSortKey} sortDirection={statsSortDirection} onToggle={toggleStatsSort} /></th>
                  <th><HrSortableHeader label="ملاحظات" sortKey="helper" activeSortKey={statsSortKey} sortDirection={statsSortDirection} onToggle={toggleStatsSort} /></th>
                </tr>
              </thead>
              <tbody>
                {statsPager.pagedRows.map((stat, index) => (
                  <tr key={stat.label}>
                    <td className="w-10 text-center text-slate-400">{statsPager.offset + index + 1}</td>
                    <td className="font-medium">{stat.label}</td>
                    <td className="font-semibold text-slate-900 dark:text-slate-100">{stat.value}</td>
                    <td className="text-slate-500 dark:text-slate-400">{stat.helper || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HrDataGrid>
        </HrSectionCard>

        <HrSectionCard title="الصفحات">
          <HrDataGrid
            rowCount={navPager.totalRows}
            columnCount={3}
            footer={
              <HrTablePager
                page={navPager.page}
                pageCount={navPager.pageCount}
                pageSize={navPager.pageSize}
                totalRows={navPager.totalRows}
                fromRow={navPager.fromRow}
                toRow={navPager.toRow}
                onPageChange={navPager.setPage}
                onPageSizeChange={navPager.setPageSize}
              />
            }
          >
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th><HrSortableHeader label="الصفحة" sortKey="label" activeSortKey={pagesSortKey} sortDirection={pagesSortDirection} onToggle={togglePagesSort} /></th>
                  <th><HrSortableHeader label="المسار" sortKey="path" activeSortKey={pagesSortKey} sortDirection={pagesSortDirection} onToggle={togglePagesSort} /></th>
                </tr>
              </thead>
              <tbody>
                {navPager.pagedRows.map((item, index) => (
                  <tr key={item.path}>
                    <td className="w-10 text-center text-slate-400">{navPager.offset + index + 1}</td>
                    <td className="font-medium">
                      <Link to={item.path} className="text-emerald-700 hover:underline dark:text-emerald-300">
                        {item.label}
                      </Link>
                    </td>
                    <td className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{item.path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HrDataGrid>
        </HrSectionCard>

        <HrSectionCard title="أحدث خطط الورديات">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : plans.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">لا توجد خطط حالياً.</p>
        ) : (
          <HrDataGrid
            rowCount={plansPager.totalRows}
            columnCount={6}
            footer={
              <HrTablePager
                page={plansPager.page}
                pageCount={plansPager.pageCount}
                pageSize={plansPager.pageSize}
                totalRows={plansPager.totalRows}
                fromRow={plansPager.fromRow}
                toRow={plansPager.toRow}
                onPageChange={plansPager.setPage}
                onPageSizeChange={plansPager.setPageSize}
              />
            }
          >
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th><HrSortableHeader label="الخطة" sortKey="name" activeSortKey={plansSortKey} sortDirection={plansSortDirection} onToggle={togglePlansSort} /></th>
                  <th><HrSortableHeader label="الحالة" sortKey="status" activeSortKey={plansSortKey} sortDirection={plansSortDirection} onToggle={togglePlansSort} /></th>
                  <th><HrSortableHeader label="الفترة" sortKey="period" activeSortKey={plansSortKey} sortDirection={plansSortDirection} onToggle={togglePlansSort} /></th>
                  <th><HrSortableHeader label="الإصدار" sortKey="version" activeSortKey={plansSortKey} sortDirection={plansSortDirection} onToggle={togglePlansSort} /></th>
                  <th><HrSortableHeader label="النشر" sortKey="publishedAt" activeSortKey={plansSortKey} sortDirection={plansSortDirection} onToggle={togglePlansSort} /></th>
                </tr>
              </thead>
              <tbody>
                {plansPager.pagedRows.map((plan, index) => (
                  <tr key={plan.id}>
                    <td className="w-10 text-center text-slate-400">{plansPager.offset + index + 1}</td>
                    <td className="font-medium">{plan.name}</td>
                    <td><HrStatusBadge value={plan.status} /></td>
                    <td>{formatDate(plan.periodStart)} - {formatDate(plan.periodEnd)}</td>
                    <td>v{plan.version}</td>
                    <td>{plan.publishedAt ? formatDate(plan.publishedAt, 'yyyy-MM-dd HH:mm') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HrDataGrid>
        )}
        </HrSectionCard>
      </div>
    </HrPageShell>
  );
};

export default HrDashboardPage;
