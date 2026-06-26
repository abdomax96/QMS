import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  PencilSquareIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { TableSkeleton } from '../../../components/common/LoadingStates';
import { useToastStore } from '../../../store/toastStore';
import { formatDate } from '../../../utils';
import {
  HrInlineActions,
  HrInlineInput,
  HrInlineRow,
  HrInlineSelect,
} from '../components/HrInlineTableControls';
import HrSortableHeader from '../components/HrSortableHeader';
import HrTablePager from '../components/HrTablePager';
import { HrDataGrid, HrPageShell, HrSectionCard, type HrPageStat } from '../components/HrPageShell';
import { usePaginatedRows } from '../hooks/usePaginatedRows';
import {
  createDateSorter,
  createTextSorter,
  useSortableRows,
} from '../hooks/useSortableRows';
import HrStatusBadge from '../components/HrStatusBadge';
import hrService from '../services/hrService';
import type {
  HrDashboardSummary,
  HrPayrollPeriodFormValues,
  HrPayrollPeriodItem,
  HrPayrollRunItem,
} from '../types';

interface PayrollRunFormValues {
  payrollPeriodId: string;
  runLabel: string;
}

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

const buildEmptyPeriodValues = (): HrPayrollPeriodFormValues => ({
  code: '',
  periodStart: '',
  periodEnd: '',
  notes: '',
});

const buildPeriodValuesFromItem = (period: HrPayrollPeriodItem): HrPayrollPeriodFormValues => ({
  id: period.id,
  code: period.code,
  periodStart: period.periodStart,
  periodEnd: period.periodEnd,
  notes: period.notes || '',
});

const buildEmptyRunValues = (payrollPeriodId: string = ''): PayrollRunFormValues => ({
  payrollPeriodId,
  runLabel: '',
});

const PayrollPage: React.FC = () => {
  const [summary, setSummary] = useState<HrDashboardSummary>(EMPTY_SUMMARY);
  const [periods, setPeriods] = useState<HrPayrollPeriodItem[]>([]);
  const [runs, setRuns] = useState<HrPayrollRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [savingRun, setSavingRun] = useState(false);
  const [processingPeriodId, setProcessingPeriodId] = useState<string | null>(null);
  const [processingRunId, setProcessingRunId] = useState<string | null>(null);
  const [inlineCreatePeriodOpen, setInlineCreatePeriodOpen] = useState(false);
  const [inlinePeriod, setInlinePeriod] = useState<HrPayrollPeriodFormValues>(buildEmptyPeriodValues);
  const [inlineEditPeriodId, setInlineEditPeriodId] = useState<string | null>(null);
  const [inlineEditPeriod, setInlineEditPeriod] = useState<HrPayrollPeriodFormValues>(buildEmptyPeriodValues);
  const [inlineRunOpen, setInlineRunOpen] = useState(false);
  const [inlineRun, setInlineRun] = useState<PayrollRunFormValues>(buildEmptyRunValues);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const toastSuccess = useToastStore((state) => state.success);
  const toastError = useToastStore((state) => state.error);

  const loadData = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [nextSummary, nextPeriods, nextRuns] = await Promise.all([
        hrService.getDashboardSummary(),
        hrService.listPayrollPeriods(60),
        hrService.listPayrollRuns(120),
      ]);

      setSummary(nextSummary);
      setPeriods(nextPeriods);
      setRuns(nextRuns);
      setSelectedPeriodId((current) => current && nextPeriods.some((period) => period.id === current) ? current : (nextPeriods[0]?.id || null));
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

  const stats = useMemo<HrPageStat[]>(
    () => [
      { label: 'فترات مفتوحة', value: summary.payrollPeriodsCount, helper: 'فترات تحتاج تشغيل أو إقفال', accent: 'blue' },
      { label: 'مراجعات حضور', value: summary.submittedAttendanceBatchesCount, helper: 'يجب إدخالها في ledger', accent: 'amber' },
      { label: 'طلبات مفتوحة', value: summary.openRequestsCount, helper: 'قد تؤثر على الاستحقاقات', accent: 'indigo' },
      { label: 'جزاءات مفتوحة', value: summary.openPenaltiesCount, helper: 'قد تدخل في الخصومات', accent: 'rose' },
    ],
    [summary]
  );

  const selectedPeriod = useMemo(
    () => periods.find((period) => period.id === selectedPeriodId) || null,
    [periods, selectedPeriodId]
  );

  const periodSorters = useMemo(
    () => ({
      code: createTextSorter<HrPayrollPeriodItem>((period) => period.code),
      period: createDateSorter<HrPayrollPeriodItem>((period) => period.periodStart),
      status: createTextSorter<HrPayrollPeriodItem>((period) => period.status),
      notes: createTextSorter<HrPayrollPeriodItem>((period) => period.notes),
    }),
    []
  );

  const runSorters = useMemo(
    () => ({
      runLabel: createTextSorter<HrPayrollRunItem>((run) => run.runLabel),
      periodCode: createTextSorter<HrPayrollRunItem>((run) => run.periodCode),
      runStatus: createTextSorter<HrPayrollRunItem>((run) => run.runStatus),
      calculatedAt: createDateSorter<HrPayrollRunItem>((run) => run.calculatedAt),
      approvedAt: createDateSorter<HrPayrollRunItem>((run) => run.approvedAt),
    }),
    []
  );

  const {
    sortedRows: sortedPeriods,
    sortKey: periodsSortKey,
    sortDirection: periodsSortDirection,
    toggleSort: togglePeriodsSort,
  } = useSortableRows({
    rows: periods,
    sorters: periodSorters,
    initialSortKey: 'period',
    initialDirection: 'desc',
  });
  const periodsPager = usePaginatedRows({ rows: sortedPeriods });

  const filteredRuns = useMemo(
    () => selectedPeriodId ? runs.filter((run) => run.payrollPeriodId === selectedPeriodId) : runs,
    [runs, selectedPeriodId]
  );

  const {
    sortedRows: sortedRuns,
    sortKey: runsSortKey,
    sortDirection: runsSortDirection,
    toggleSort: toggleRunsSort,
  } = useSortableRows({
    rows: filteredRuns,
    sorters: runSorters,
    initialSortKey: 'calculatedAt',
    initialDirection: 'desc',
  });
  const runsPager = usePaginatedRows({ rows: sortedRuns });

  const handleInlinePeriodChange = <K extends keyof HrPayrollPeriodFormValues>(key: K, value: HrPayrollPeriodFormValues[K]) => {
    setInlinePeriod((current) => ({ ...current, [key]: value }));
  };

  const handleInlineEditPeriodChange = <K extends keyof HrPayrollPeriodFormValues>(key: K, value: HrPayrollPeriodFormValues[K]) => {
    setInlineEditPeriod((current) => ({ ...current, [key]: value }));
  };

  const resetInlineCreatePeriod = () => {
    setInlineCreatePeriodOpen(false);
    setInlinePeriod(buildEmptyPeriodValues());
  };

  const resetInlineEditPeriod = () => {
    setInlineEditPeriodId(null);
    setInlineEditPeriod(buildEmptyPeriodValues());
  };

  const validatePeriod = (values: HrPayrollPeriodFormValues) => {
    if (!values.code.trim() || !values.periodStart || !values.periodEnd) {
      toastError('بيانات ناقصة', 'اكتب كود الفترة وبدايتها ونهايتها.');
      return false;
    }

    return true;
  };

  const handleSavePeriod = async (values: HrPayrollPeriodFormValues) => {
    setSavingPeriod(true);

    try {
      const periodId = await hrService.savePayrollPeriod(values);
      toastSuccess(values.id ? 'تم تحديث فترة المرتبات' : 'تمت إضافة فترة المرتبات', values.code);
      resetInlineEditPeriod();
      await loadData('refresh');
      setSelectedPeriodId(periodId);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ فترة المرتبات.';
      toastError('فشل حفظ الفترة', message);
      return false;
    } finally {
      setSavingPeriod(false);
    }
  };

  const handleSaveInlineCreatePeriod = async () => {
    if (!validatePeriod(inlinePeriod)) return;

    const saved = await handleSavePeriod(inlinePeriod);
    if (saved) {
      resetInlineCreatePeriod();
    }
  };

  const handleSaveInlineEditPeriod = async () => {
    if (!validatePeriod(inlineEditPeriod)) return;
    await handleSavePeriod(inlineEditPeriod);
  };

  const handleOpenCreatePeriod = () => {
    periodsPager.setPage(1);
    resetInlineEditPeriod();
    setInlinePeriod(buildEmptyPeriodValues());
    setInlineCreatePeriodOpen(true);
  };

  const handleOpenEditPeriod = (period: HrPayrollPeriodItem) => {
    setInlineCreatePeriodOpen(false);
    setInlineEditPeriodId(period.id);
    setInlineEditPeriod(buildPeriodValuesFromItem(period));
  };

  const handleSaveRun = async () => {
    if (!inlineRun.payrollPeriodId) {
      toastError('بيانات ناقصة', 'اختر فترة المرتبات أولاً.');
      return;
    }

    setSavingRun(true);
    try {
      await hrService.createPayrollRun(inlineRun.payrollPeriodId, inlineRun.runLabel);
      toastSuccess('تم إنشاء تشغيل مرتبات', inlineRun.runLabel || 'تشغيل جديد');
      setInlineRunOpen(false);
      setInlineRun(buildEmptyRunValues(selectedPeriodId || ''));
      await loadData('refresh');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر إنشاء تشغيل المرتبات.';
      toastError('فشل إنشاء التشغيل', message);
    } finally {
      setSavingRun(false);
    }
  };

  const handleBuildLedger = async (period: HrPayrollPeriodItem) => {
    setProcessingPeriodId(period.id);
    try {
      const affectedRows = await hrService.buildAttendanceLedger(period.id);
      toastSuccess('تم بناء Attendance Ledger', `${affectedRows} صف`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر بناء ledger.';
      toastError('فشل بناء ledger', message);
    } finally {
      setProcessingPeriodId(null);
    }
  };

  const handleClosePeriod = async (period: HrPayrollPeriodItem) => {
    const confirmed = window.confirm(`هل تريد إغلاق الفترة "${period.code}"؟`);
    if (!confirmed) return;

    setProcessingPeriodId(period.id);
    try {
      await hrService.closePayrollPeriod(period.id);
      toastSuccess('تم إغلاق فترة المرتبات', period.code);
      await loadData('refresh');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر إغلاق الفترة.';
      toastError('فشل إغلاق الفترة', message);
    } finally {
      setProcessingPeriodId(null);
    }
  };

  const handleCalculateRun = async (run: HrPayrollRunItem) => {
    setProcessingRunId(run.id);
    try {
      const affectedRows = await hrService.calculatePayrollRun(run.id);
      toastSuccess('تم حساب تشغيل المرتبات', `${affectedRows} عامل`);
      await loadData('refresh');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حساب التشغيل.';
      toastError('فشل الحساب', message);
    } finally {
      setProcessingRunId(null);
    }
  };

  const handleApproveRun = async (run: HrPayrollRunItem) => {
    const confirmed = window.confirm(`هل تريد اعتماد التشغيل "${run.runLabel || run.periodCode || run.id}"؟`);
    if (!confirmed) return;

    setProcessingRunId(run.id);
    try {
      await hrService.approvePayrollRun(run.id);
      toastSuccess('تم اعتماد تشغيل المرتبات', run.runLabel || run.periodCode || '');
      await loadData('refresh');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر اعتماد التشغيل.';
      toastError('فشل الاعتماد', message);
    } finally {
      setProcessingRunId(null);
    }
  };

  return (
    <HrPageShell title="المرتبات" description="فترات المرتبات وتشغيلاتها." stats={stats}>
      <div className="space-y-4">
        <HrSectionCard
          title="فترات المرتبات"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void loadData('refresh')} disabled={refreshing} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                تحديث
              </button>
              <button type="button" onClick={handleOpenCreatePeriod} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
                <PlusIcon className="h-4 w-4" />
                إضافة صف
              </button>
            </div>
          }
        >
          {loading ? (
            <TableSkeleton rows={6} />
          ) : (
            <HrDataGrid rowCount={periodsPager.totalRows} columnCount={6} footer={<HrTablePager page={periodsPager.page} pageCount={periodsPager.pageCount} pageSize={periodsPager.pageSize} totalRows={periodsPager.totalRows} fromRow={periodsPager.fromRow} toRow={periodsPager.toRow} onPageChange={periodsPager.setPage} onPageSizeChange={periodsPager.setPageSize} />}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><HrSortableHeader label="الفترة" sortKey="code" activeSortKey={periodsSortKey} sortDirection={periodsSortDirection} onToggle={togglePeriodsSort} /></th>
                    <th><HrSortableHeader label="المدى" sortKey="period" activeSortKey={periodsSortKey} sortDirection={periodsSortDirection} onToggle={togglePeriodsSort} /></th>
                    <th><HrSortableHeader label="الحالة" sortKey="status" activeSortKey={periodsSortKey} sortDirection={periodsSortDirection} onToggle={togglePeriodsSort} /></th>
                    <th><HrSortableHeader label="ملاحظات" sortKey="notes" activeSortKey={periodsSortKey} sortDirection={periodsSortDirection} onToggle={togglePeriodsSort} /></th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineCreatePeriodOpen ? (
                    <HrInlineRow className="bg-emerald-50/60 dark:bg-emerald-950/20" saving={savingPeriod} onSave={() => void handleSaveInlineCreatePeriod()} onCancel={resetInlineCreatePeriod}>
                      <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                      <td><HrInlineInput autoFocus value={inlinePeriod.code} onChange={(event) => handleInlinePeriodChange('code', event.target.value)} placeholder="كود الفترة" /></td>
                      <td className="space-y-2"><HrInlineInput type="date" value={inlinePeriod.periodStart} onChange={(event) => handleInlinePeriodChange('periodStart', event.target.value)} /><HrInlineInput type="date" value={inlinePeriod.periodEnd} onChange={(event) => handleInlinePeriodChange('periodEnd', event.target.value)} /></td>
                      <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">open</td>
                      <td><HrInlineInput value={inlinePeriod.notes} onChange={(event) => handleInlinePeriodChange('notes', event.target.value)} placeholder="ملاحظات" /></td>
                      <td><HrInlineActions saving={savingPeriod} onSave={() => void handleSaveInlineCreatePeriod()} onCancel={resetInlineCreatePeriod} /></td>
                    </HrInlineRow>
                  ) : null}
                  {periodsPager.pagedRows.map((period, index) => (
                    inlineEditPeriodId === period.id ? (
                      <HrInlineRow key={period.id} className="bg-blue-50/60 dark:bg-blue-950/20" saving={savingPeriod} onSave={() => void handleSaveInlineEditPeriod()} onCancel={resetInlineEditPeriod}>
                        <td className="w-10 text-center text-blue-600 dark:text-blue-300">{periodsPager.offset + index + 1}</td>
                        <td><HrInlineInput autoFocus value={inlineEditPeriod.code} onChange={(event) => handleInlineEditPeriodChange('code', event.target.value)} placeholder="كود الفترة" /></td>
                        <td className="space-y-2"><HrInlineInput type="date" value={inlineEditPeriod.periodStart} onChange={(event) => handleInlineEditPeriodChange('periodStart', event.target.value)} /><HrInlineInput type="date" value={inlineEditPeriod.periodEnd} onChange={(event) => handleInlineEditPeriodChange('periodEnd', event.target.value)} /></td>
                        <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">{period.status}</td>
                        <td><HrInlineInput value={inlineEditPeriod.notes} onChange={(event) => handleInlineEditPeriodChange('notes', event.target.value)} placeholder="ملاحظات" /></td>
                        <td><HrInlineActions saving={savingPeriod} onSave={() => void handleSaveInlineEditPeriod()} onCancel={resetInlineEditPeriod} /></td>
                      </HrInlineRow>
                    ) : (
                      <tr key={period.id} onClick={() => setSelectedPeriodId(period.id)} onDoubleClick={() => handleOpenEditPeriod(period)} className={selectedPeriodId === period.id ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}>
                        <td className="w-10 text-center text-slate-400">{periodsPager.offset + index + 1}</td>
                        <td className="px-3 py-3 font-medium">{period.code}</td>
                        <td className="px-3 py-3">{formatDate(period.periodStart)} - {formatDate(period.periodEnd)}</td>
                        <td className="px-3 py-3"><HrStatusBadge value={period.status} /></td>
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{period.notes || '—'}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => handleOpenEditPeriod(period)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><PencilSquareIcon className="h-3.5 w-3.5" />تعديل</button>
                            <button type="button" onClick={() => { setSelectedPeriodId(period.id); setInlineRun(buildEmptyRunValues(period.id)); setInlineRunOpen(true); }} className="rounded-md bg-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300">تشغيل</button>
                            <button type="button" disabled={processingPeriodId === period.id} onClick={() => void handleBuildLedger(period)} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Ledger</button>
                            {period.status !== 'closed' ? <button type="button" disabled={processingPeriodId === period.id} onClick={() => void handleClosePeriod(period)} className="rounded-md bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-300 disabled:opacity-60 dark:bg-slate-700 dark:text-slate-200">إغلاق</button> : null}
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </HrDataGrid>
          )}
        </HrSectionCard>

        <HrSectionCard
          title={selectedPeriod ? `تشغيلات الفترة ${selectedPeriod.code}` : 'تشغيلات المرتبات'}
          actions={
            <button type="button" onClick={() => { setInlineRun(buildEmptyRunValues(selectedPeriodId || '')); setInlineRunOpen(true); }} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
              <PlusIcon className="h-4 w-4" />
              إضافة صف
            </button>
          }
        >
          {loading ? (
            <TableSkeleton rows={6} />
          ) : (
            <HrDataGrid rowCount={runsPager.totalRows} columnCount={6} footer={<HrTablePager page={runsPager.page} pageCount={runsPager.pageCount} pageSize={runsPager.pageSize} totalRows={runsPager.totalRows} fromRow={runsPager.fromRow} toRow={runsPager.toRow} onPageChange={runsPager.setPage} onPageSizeChange={runsPager.setPageSize} />}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><HrSortableHeader label="التشغيل" sortKey="runLabel" activeSortKey={runsSortKey} sortDirection={runsSortDirection} onToggle={toggleRunsSort} /></th>
                    <th><HrSortableHeader label="الفترة" sortKey="periodCode" activeSortKey={runsSortKey} sortDirection={runsSortDirection} onToggle={toggleRunsSort} /></th>
                    <th><HrSortableHeader label="الحالة" sortKey="runStatus" activeSortKey={runsSortKey} sortDirection={runsSortDirection} onToggle={toggleRunsSort} /></th>
                    <th><HrSortableHeader label="التواريخ" sortKey="calculatedAt" activeSortKey={runsSortKey} sortDirection={runsSortDirection} onToggle={toggleRunsSort} /></th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineRunOpen ? (
                    <HrInlineRow className="bg-emerald-50/60 dark:bg-emerald-950/20" saving={savingRun} onSave={() => void handleSaveRun()} onCancel={() => { if (savingRun) return; setInlineRunOpen(false); setInlineRun(buildEmptyRunValues(selectedPeriodId || '')); }}>
                      <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                      <td><HrInlineInput autoFocus value={inlineRun.runLabel} onChange={(event) => setInlineRun((current) => ({ ...current, runLabel: event.target.value }))} placeholder="اسم التشغيل" /></td>
                      <td><HrInlineSelect value={inlineRun.payrollPeriodId} onChange={(event) => setInlineRun((current) => ({ ...current, payrollPeriodId: event.target.value }))}><option value="">اختر الفترة</option>{periods.map((period) => <option key={period.id} value={period.id}>{period.code}</option>)}</HrInlineSelect></td>
                      <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">draft</td>
                      <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">—</td>
                      <td><HrInlineActions saving={savingRun} onSave={() => void handleSaveRun()} onCancel={() => { setInlineRunOpen(false); setInlineRun(buildEmptyRunValues(selectedPeriodId || '')); }} /></td>
                    </HrInlineRow>
                  ) : null}
                  {runsPager.pagedRows.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{selectedPeriod ? 'لا توجد تشغيلات لهذه الفترة بعد.' : 'لا توجد تشغيلات مرتبات حالياً.'}</td></tr>
                  ) : (
                    runsPager.pagedRows.map((run, index) => (
                      <tr key={run.id}>
                        <td className="w-10 text-center text-slate-400">{runsPager.offset + index + 1}</td>
                        <td className="px-3 py-3"><div className="font-medium">{run.runLabel || 'تشغيل بدون اسم'}</div>{run.summary && Object.keys(run.summary).length > 0 ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">summary جاهز</div> : null}</td>
                        <td className="px-3 py-3">{run.periodCode || '—'}</td>
                        <td className="px-3 py-3"><HrStatusBadge value={run.runStatus} /></td>
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-400"><div>{run.calculatedAt ? formatDate(run.calculatedAt, 'yyyy-MM-dd HH:mm') : '—'}</div><div className="mt-1">{run.approvedAt ? formatDate(run.approvedAt, 'yyyy-MM-dd HH:mm') : '—'}</div></td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {run.runStatus !== 'approved' && run.runStatus !== 'closed' ? <button type="button" disabled={processingRunId === run.id} onClick={() => void handleCalculateRun(run)} className="rounded-md bg-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-200 disabled:opacity-60 dark:bg-blue-900/30 dark:text-blue-300">حساب</button> : null}
                            {run.runStatus === 'calculated' ? <button type="button" disabled={processingRunId === run.id} onClick={() => void handleApproveRun(run)} className="rounded-md bg-emerald-100 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-60 dark:bg-emerald-900/30 dark:text-emerald-300">اعتماد</button> : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </HrDataGrid>
          )}
        </HrSectionCard>
      </div>
    </HrPageShell>
  );
};

export default PayrollPage;
