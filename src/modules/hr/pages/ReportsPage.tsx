import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { TableSkeleton } from '../../../components/common/LoadingStates';
import productionAttendanceService from '../../../services/productionAttendanceService';
import { formatDate } from '../../../utils';
import HrSortableHeader from '../components/HrSortableHeader';
import HrStatusBadge from '../components/HrStatusBadge';
import HrTablePager from '../components/HrTablePager';
import { HrDataGrid, HrPageShell, HrSectionCard } from '../components/HrPageShell';
import { usePaginatedRows } from '../hooks/usePaginatedRows';
import {
  createDateSorter,
  createNumberSorter,
  createTextSorter,
  useSortableRows,
} from '../hooks/useSortableRows';
import hrService from '../services/hrService';
import type {
  HrDashboardSummary,
  HrEmployeeListItem,
  HrPenaltyItem,
  HrPayrollPeriodItem,
  HrPayrollRunItem,
  HrRequestItem,
  HrShiftPlanItem,
  HrTransportLineItem,
  ProductionAttendanceBatchItem,
} from '../types';

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

interface HealthRow {
  id: string;
  area: string;
  count: number;
  status: string;
  details: string;
  page: string;
}

interface QueueRow {
  id: string;
  area: string;
  subject: string;
  status: string;
  when: string | null;
  page: string;
}

interface ActivityRow {
  id: string;
  area: string;
  subject: string;
  status: string;
  when: string | null;
  page: string;
}

const isOpenStatus = (status: string | null | undefined) =>
  !['closed', 'approved', 'rejected'].includes((status || '').toLowerCase());

const formatWhen = (value: string | null) => (value ? formatDate(value, 'yyyy-MM-dd HH:mm') : '—');

const ReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<HrDashboardSummary>(EMPTY_SUMMARY);
  const [employees, setEmployees] = useState<HrEmployeeListItem[]>([]);
  const [transportLines, setTransportLines] = useState<HrTransportLineItem[]>([]);
  const [shiftPlans, setShiftPlans] = useState<HrShiftPlanItem[]>([]);
  const [requests, setRequests] = useState<HrRequestItem[]>([]);
  const [penalties, setPenalties] = useState<HrPenaltyItem[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<HrPayrollPeriodItem[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<HrPayrollRunItem[]>([]);
  const [attendanceBatches, setAttendanceBatches] = useState<ProductionAttendanceBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [
        nextSummary,
        nextEmployees,
        nextTransportLines,
        nextShiftPlans,
        nextRequests,
        nextPenalties,
        nextPayrollPeriods,
        nextPayrollRuns,
        nextAttendanceBatches,
      ] = await Promise.all([
        hrService.getDashboardSummary(),
        hrService.listEmployees(200),
        hrService.listTransportLines(100),
        hrService.listShiftPlans(100),
        hrService.listRequests(100),
        hrService.listPenalties(100),
        hrService.listPayrollPeriods(100),
        hrService.listPayrollRuns(100),
        productionAttendanceService.listReviewBatches(100),
      ]);

      setSummary(nextSummary);
      setEmployees(nextEmployees);
      setTransportLines(nextTransportLines);
      setShiftPlans(nextShiftPlans);
      setRequests(nextRequests);
      setPenalties(nextPenalties);
      setPayrollPeriods(nextPayrollPeriods);
      setPayrollRuns(nextPayrollRuns);
      setAttendanceBatches(nextAttendanceBatches);
    } finally {
      if (mode === 'initial') {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const healthRows = useMemo<HealthRow[]>(() => {
    const employeesWithoutWorksite = employees.filter((employee) => !employee.worksiteName).length;
    const employeesWithoutAccount = employees.filter((employee) => !employee.hasAccount).length;
    const employeesWithoutCode = employees.filter((employee) => !employee.baseEmployeeCode).length;
    const inactiveLines = transportLines.filter((line) => !line.isActive).length;
    const publishedPlans = shiftPlans.filter((plan) => plan.status === 'published').length;
    const draftPlans = shiftPlans.filter((plan) => plan.status === 'draft').length;
    const openRequests = requests.filter((request) => isOpenStatus(request.status)).length;
    const openPenalties = penalties.filter((penalty) => isOpenStatus(penalty.status)).length;
    const submittedBatches = attendanceBatches.filter((batch) => batch.reviewStatus === 'submitted').length;
    const openPeriods = payrollPeriods.filter((period) => period.status !== 'closed').length;
    const calculatedRuns = payrollRuns.filter((run) => run.runStatus === 'calculated').length;

    return [
      {
        id: 'employees',
        area: 'العاملون',
        count: summary.employeesCount,
        status: employeesWithoutWorksite || employeesWithoutAccount ? 'in_review' : 'active',
        details: `${summary.dailyWorkersCount} يومية | ${employeesWithoutAccount} بدون حساب | ${employeesWithoutCode} بدون تكويد`,
        page: '/hr/employees',
      },
      {
        id: 'worksites',
        area: 'المواقع',
        count: summary.worksitesCount,
        status: employeesWithoutWorksite ? 'draft' : 'active',
        details: `${employeesWithoutWorksite} عامل بدون موقع`,
        page: '/hr/settings',
      },
      {
        id: 'transport',
        area: 'النقل',
        count: summary.transportLinesCount,
        status: inactiveLines ? 'in_review' : 'active',
        details: `${inactiveLines} خط غير مفعل`,
        page: '/hr/transport',
      },
      {
        id: 'shifts',
        area: 'الورديات',
        count: summary.shiftPlansCount,
        status: publishedPlans ? 'published' : 'draft',
        details: `${publishedPlans} منشور | ${draftPlans} مسودة`,
        page: '/hr/shifts',
      },
      {
        id: 'requests',
        area: 'الطلبات',
        count: summary.openRequestsCount,
        status: openRequests ? 'submitted' : 'approved',
        details: `${openRequests} طلب يحتاج متابعة`,
        page: '/hr/requests',
      },
      {
        id: 'penalties',
        area: 'الجزاءات',
        count: summary.openPenaltiesCount,
        status: openPenalties ? 'submitted' : 'approved',
        details: `${openPenalties} جزاء غير مغلق`,
        page: '/hr/penalties',
      },
      {
        id: 'attendance',
        area: 'الحضور',
        count: summary.submittedAttendanceBatchesCount,
        status: submittedBatches ? 'submitted' : 'approved',
        details: `${submittedBatches} دفعة بانتظار مراجعة`,
        page: '/production/attendance',
      },
      {
        id: 'payroll',
        area: 'المرتبات',
        count: summary.payrollPeriodsCount,
        status: openPeriods ? 'in_review' : 'closed',
        details: `${openPeriods} فترة مفتوحة | ${calculatedRuns} تشغيل محسوب`,
        page: '/hr/payroll',
      },
    ];
  }, [attendanceBatches, employees, payrollPeriods, payrollRuns, penalties, requests, shiftPlans, summary, transportLines]);

  const queueRows = useMemo<QueueRow[]>(() => {
    const requestRows: QueueRow[] = requests
      .filter((request) => isOpenStatus(request.status))
      .map((request) => ({
        id: `request-${request.id}`,
        area: request.requestType === 'leave' ? 'إجازة' : 'مأمورية',
        subject: `${request.employeeName} | ${request.leaveTypeName || request.destination || 'طلب'}`,
        status: request.status,
        when: request.startDate,
        page: '/hr/requests',
      }));

    const penaltyRows: QueueRow[] = penalties
      .filter((penalty) => isOpenStatus(penalty.status))
      .map((penalty) => ({
        id: `penalty-${penalty.id}`,
        area: 'جزاء',
        subject: `${penalty.employeeName} | ${penalty.penaltyTypeName || 'غير محدد'}`,
        status: penalty.status,
        when: penalty.effectiveDate,
        page: '/hr/penalties',
      }));

    const batchRows: QueueRow[] = attendanceBatches
      .filter((batch) => batch.reviewStatus !== 'approved' && batch.reviewStatus !== 'closed')
      .map((batch) => ({
        id: `batch-${batch.id}`,
        area: 'حضور',
        subject: `${batch.shiftPlanName || 'بدون خطة'} | ${formatDate(batch.batchDate)}`,
        status: batch.reviewStatus,
        when: batch.submittedAt || batch.batchDate,
        page: '/production/attendance',
      }));

    const periodRows: QueueRow[] = payrollPeriods
      .filter((period) => period.status !== 'closed')
      .map((period) => ({
        id: `period-${period.id}`,
        area: 'فترة مرتبات',
        subject: period.code,
        status: period.status,
        when: period.periodEnd,
        page: '/hr/payroll',
      }));

    return [...requestRows, ...penaltyRows, ...batchRows, ...periodRows].sort((a, b) => {
      const left = a.when ? new Date(a.when).getTime() : 0;
      const right = b.when ? new Date(b.when).getTime() : 0;
      return right - left;
    });
  }, [attendanceBatches, penalties, payrollPeriods, requests]);

  const activityRows = useMemo<ActivityRow[]>(() => {
    const requestActivity: ActivityRow[] = requests.map((request) => ({
      id: `request-${request.id}`,
      area: request.requestType === 'leave' ? 'إجازة' : 'مأمورية',
      subject: `${request.employeeName} | ${request.leaveTypeName || request.destination || 'طلب'}`,
      status: request.status,
      when: request.startDate,
      page: '/hr/requests',
    }));

    const penaltyActivity: ActivityRow[] = penalties.map((penalty) => ({
      id: `penalty-${penalty.id}`,
      area: 'جزاء',
      subject: `${penalty.employeeName} | ${penalty.penaltyTypeName || 'غير محدد'}`,
      status: penalty.status,
      when: penalty.approvedAt || penalty.effectiveDate,
      page: '/hr/penalties',
    }));

    const payrollActivity: ActivityRow[] = payrollRuns.map((run) => ({
      id: `run-${run.id}`,
      area: 'تشغيل مرتبات',
      subject: run.runLabel || run.periodCode || 'تشغيل بدون اسم',
      status: run.runStatus,
      when: run.approvedAt || run.calculatedAt,
      page: '/hr/payroll',
    }));

    const attendanceActivity: ActivityRow[] = attendanceBatches.map((batch) => ({
      id: `attendance-${batch.id}`,
      area: 'دفعة حضور',
      subject: `${batch.shiftPlanName || 'بدون خطة'} | ${formatDate(batch.batchDate)}`,
      status: batch.reviewStatus,
      when: batch.reviewedAt || batch.submittedAt || batch.batchDate,
      page: '/production/attendance',
    }));

    return [...requestActivity, ...penaltyActivity, ...payrollActivity, ...attendanceActivity]
      .sort((a, b) => {
        const left = a.when ? new Date(a.when).getTime() : 0;
        const right = b.when ? new Date(b.when).getTime() : 0;
        return right - left;
      })
      .slice(0, 120);
  }, [attendanceBatches, penalties, payrollRuns, requests]);

  const {
    sortedRows: sortedHealthRows,
    sortKey: healthSortKey,
    sortDirection: healthSortDirection,
    toggleSort: toggleHealthSort,
  } = useSortableRows({
    rows: healthRows,
    sorters: {
      area: createTextSorter<HealthRow>((row) => row.area),
      count: createNumberSorter<HealthRow>((row) => row.count),
      status: createTextSorter<HealthRow>((row) => row.status),
      details: createTextSorter<HealthRow>((row) => row.details),
    },
    initialSortKey: 'area',
  });
  const healthPager = usePaginatedRows({ rows: sortedHealthRows });

  const {
    sortedRows: sortedQueueRows,
    sortKey: queueSortKey,
    sortDirection: queueSortDirection,
    toggleSort: toggleQueueSort,
  } = useSortableRows({
    rows: queueRows,
    sorters: {
      area: createTextSorter<QueueRow>((row) => row.area),
      subject: createTextSorter<QueueRow>((row) => row.subject),
      status: createTextSorter<QueueRow>((row) => row.status),
      when: createDateSorter<QueueRow>((row) => row.when),
    },
    initialSortKey: 'when',
    initialDirection: 'desc',
  });
  const queuePager = usePaginatedRows({ rows: sortedQueueRows });

  const {
    sortedRows: sortedActivityRows,
    sortKey: activitySortKey,
    sortDirection: activitySortDirection,
    toggleSort: toggleActivitySort,
  } = useSortableRows({
    rows: activityRows,
    sorters: {
      area: createTextSorter<ActivityRow>((row) => row.area),
      subject: createTextSorter<ActivityRow>((row) => row.subject),
      status: createTextSorter<ActivityRow>((row) => row.status),
      when: createDateSorter<ActivityRow>((row) => row.when),
    },
    initialSortKey: 'when',
    initialDirection: 'desc',
  });
  const activityPager = usePaginatedRows({ rows: sortedActivityRows });

  return (
    <HrPageShell title="التقارير" description="">
      <HrSectionCard
        title="جاهزية البيانات"
        actions={
          <button
            type="button"
            onClick={() => void loadData('refresh')}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        }
      >
        {loading ? (
          <TableSkeleton rows={8} />
        ) : (
          <HrDataGrid
            rowCount={healthPager.totalRows}
            columnCount={6}
            footer={
              <HrTablePager
                page={healthPager.page}
                pageCount={healthPager.pageCount}
                pageSize={healthPager.pageSize}
                totalRows={healthPager.totalRows}
                fromRow={healthPager.fromRow}
                toRow={healthPager.toRow}
                onPageChange={healthPager.setPage}
                onPageSizeChange={healthPager.setPageSize}
              />
            }
          >
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th><HrSortableHeader label="القطاع" sortKey="area" activeSortKey={healthSortKey} sortDirection={healthSortDirection} onToggle={toggleHealthSort} /></th>
                  <th><HrSortableHeader label="العدد" sortKey="count" activeSortKey={healthSortKey} sortDirection={healthSortDirection} onToggle={toggleHealthSort} /></th>
                  <th><HrSortableHeader label="الحالة" sortKey="status" activeSortKey={healthSortKey} sortDirection={healthSortDirection} onToggle={toggleHealthSort} /></th>
                  <th><HrSortableHeader label="ملاحظات" sortKey="details" activeSortKey={healthSortKey} sortDirection={healthSortDirection} onToggle={toggleHealthSort} /></th>
                  <th>فتح</th>
                </tr>
              </thead>
              <tbody>
                {healthPager.pagedRows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="w-10 text-center text-slate-400">{healthPager.offset + index + 1}</td>
                    <td className="px-3 py-3 font-medium">{row.area}</td>
                    <td className="px-3 py-3">{row.count}</td>
                    <td className="px-3 py-3"><HrStatusBadge value={row.status} /></td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{row.details}</td>
                    <td className="px-3 py-3">
                      <Link to={row.page} className="inline-flex items-center rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                        فتح
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HrDataGrid>
        )}
      </HrSectionCard>

      <HrSectionCard title="عناصر تحتاج متابعة">
        {loading ? (
          <TableSkeleton rows={8} />
        ) : (
          <HrDataGrid
            rowCount={queuePager.totalRows}
            columnCount={6}
            footer={
              <HrTablePager
                page={queuePager.page}
                pageCount={queuePager.pageCount}
                pageSize={queuePager.pageSize}
                totalRows={queuePager.totalRows}
                fromRow={queuePager.fromRow}
                toRow={queuePager.toRow}
                onPageChange={queuePager.setPage}
                onPageSizeChange={queuePager.setPageSize}
              />
            }
          >
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th><HrSortableHeader label="النوع" sortKey="area" activeSortKey={queueSortKey} sortDirection={queueSortDirection} onToggle={toggleQueueSort} /></th>
                  <th><HrSortableHeader label="العنصر" sortKey="subject" activeSortKey={queueSortKey} sortDirection={queueSortDirection} onToggle={toggleQueueSort} /></th>
                  <th><HrSortableHeader label="الحالة" sortKey="status" activeSortKey={queueSortKey} sortDirection={queueSortDirection} onToggle={toggleQueueSort} /></th>
                  <th><HrSortableHeader label="التاريخ" sortKey="when" activeSortKey={queueSortKey} sortDirection={queueSortDirection} onToggle={toggleQueueSort} /></th>
                  <th>فتح</th>
                </tr>
              </thead>
              <tbody>
                {queuePager.pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      لا توجد عناصر متابعة مفتوحة حالياً.
                    </td>
                  </tr>
                ) : (
                  queuePager.pagedRows.map((row, index) => (
                    <tr key={row.id}>
                      <td className="w-10 text-center text-slate-400">{queuePager.offset + index + 1}</td>
                      <td className="px-3 py-3">{row.area}</td>
                      <td className="px-3 py-3 font-medium">{row.subject}</td>
                      <td className="px-3 py-3"><HrStatusBadge value={row.status} /></td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{formatWhen(row.when)}</td>
                      <td className="px-3 py-3">
                        <Link to={row.page} className="inline-flex items-center rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                          فتح
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </HrDataGrid>
        )}
      </HrSectionCard>

      <HrSectionCard title="آخر العمليات">
        {loading ? (
          <TableSkeleton rows={10} />
        ) : (
          <HrDataGrid
            rowCount={activityPager.totalRows}
            columnCount={6}
            footer={
              <HrTablePager
                page={activityPager.page}
                pageCount={activityPager.pageCount}
                pageSize={activityPager.pageSize}
                totalRows={activityPager.totalRows}
                fromRow={activityPager.fromRow}
                toRow={activityPager.toRow}
                onPageChange={activityPager.setPage}
                onPageSizeChange={activityPager.setPageSize}
              />
            }
          >
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th><HrSortableHeader label="النوع" sortKey="area" activeSortKey={activitySortKey} sortDirection={activitySortDirection} onToggle={toggleActivitySort} /></th>
                  <th><HrSortableHeader label="العنصر" sortKey="subject" activeSortKey={activitySortKey} sortDirection={activitySortDirection} onToggle={toggleActivitySort} /></th>
                  <th><HrSortableHeader label="الحالة" sortKey="status" activeSortKey={activitySortKey} sortDirection={activitySortDirection} onToggle={toggleActivitySort} /></th>
                  <th><HrSortableHeader label="آخر وقت" sortKey="when" activeSortKey={activitySortKey} sortDirection={activitySortDirection} onToggle={toggleActivitySort} /></th>
                  <th>فتح</th>
                </tr>
              </thead>
              <tbody>
                {activityPager.pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      لا توجد بيانات كافية بعد.
                    </td>
                  </tr>
                ) : (
                  activityPager.pagedRows.map((row, index) => (
                    <tr key={row.id}>
                      <td className="w-10 text-center text-slate-400">{activityPager.offset + index + 1}</td>
                      <td className="px-3 py-3">{row.area}</td>
                      <td className="px-3 py-3 font-medium">{row.subject}</td>
                      <td className="px-3 py-3"><HrStatusBadge value={row.status} /></td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{formatWhen(row.when)}</td>
                      <td className="px-3 py-3">
                        <Link to={row.page} className="inline-flex items-center rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                          فتح
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </HrDataGrid>
        )}
      </HrSectionCard>
    </HrPageShell>
  );
};

export default ReportsPage;
