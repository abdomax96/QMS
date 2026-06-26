import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  PrinterIcon,
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
  createNumberSorter,
  createTextSorter,
  useSortableRows,
} from '../hooks/useSortableRows';
import HrStatusBadge from '../components/HrStatusBadge';
import hrService from '../services/hrService';
import type {
  HrDashboardSummary,
  HrPenaltyFormOptions,
  HrPenaltyFormValues,
  HrPenaltyItem,
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

const EMPTY_OPTIONS: HrPenaltyFormOptions = {
  employeeProfiles: [],
  penaltyTypes: [],
};

const PENALTY_STATUSES = ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'closed'] as const;

const buildEmptyPenaltyValues = (): HrPenaltyFormValues => ({
  employeeProfileId: '',
  penaltyTypeId: '',
  status: 'draft',
  effectiveDate: '',
  amount: '',
  details: '',
  referenceNumber: '',
});

const buildPenaltyValuesFromItem = (penalty: HrPenaltyItem): HrPenaltyFormValues => ({
  id: penalty.id,
  employeeProfileId: penalty.employeeProfileId || '',
  penaltyTypeId: penalty.penaltyTypeId || '',
  status: penalty.status,
  effectiveDate: penalty.effectiveDate?.slice(0, 10) || '',
  amount: penalty.amount === null ? '' : String(penalty.amount),
  details: penalty.details || '',
  referenceNumber: penalty.referenceNumber || '',
});

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const PenaltiesPage: React.FC = () => {
  const [summary, setSummary] = useState<HrDashboardSummary>(EMPTY_SUMMARY);
  const [penalties, setPenalties] = useState<HrPenaltyItem[]>([]);
  const [options, setOptions] = useState<HrPenaltyFormOptions>(EMPTY_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingPenalty, setSavingPenalty] = useState(false);
  const [inlineCreateOpen, setInlineCreateOpen] = useState(false);
  const [inlinePenalty, setInlinePenalty] = useState<HrPenaltyFormValues>(buildEmptyPenaltyValues);
  const [inlineEditPenaltyId, setInlineEditPenaltyId] = useState<string | null>(null);
  const [inlineEditPenalty, setInlineEditPenalty] = useState<HrPenaltyFormValues>(buildEmptyPenaltyValues);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const toastSuccess = useToastStore((state) => state.success);
  const toastError = useToastStore((state) => state.error);

  const loadData = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [nextSummary, nextPenalties, nextOptions] = await Promise.all([
        hrService.getDashboardSummary(),
        hrService.listPenalties(200),
        hrService.getPenaltyFormOptions(),
      ]);

      setSummary(nextSummary);
      setPenalties(nextPenalties);
      setOptions(nextOptions);
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
      { label: 'جزاءات مفتوحة', value: summary.openPenaltiesCount, helper: 'جاهزة للاعتماد أو الطباعة', accent: 'rose' },
      { label: 'طلبات مفتوحة', value: summary.openRequestsCount, helper: 'لربط الجزاءات بالسياق التشغيلي', accent: 'amber' },
      { label: 'دفعات حضور', value: summary.submittedAttendanceBatchesCount, helper: 'مرجع عند مراجعة المخالفة', accent: 'blue' },
      { label: 'فترات مرتبات', value: summary.payrollPeriodsCount, helper: 'لتقدير أثر الجزاء على الشهر', accent: 'indigo' },
    ],
    [summary]
  );

  const filteredPenalties = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return penalties.filter((penalty) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          penalty.employeeName,
          penalty.penaltyTypeName,
          penalty.referenceNumber,
          penalty.details,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      const matchesStatus = statusFilter === 'all' || penalty.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [penalties, searchQuery, statusFilter]);

  const penaltySorters = useMemo(
    () => ({
      employeeName: createTextSorter<HrPenaltyItem>((penalty) => penalty.employeeName),
      penaltyTypeName: createTextSorter<HrPenaltyItem>((penalty) => penalty.penaltyTypeName),
      status: createTextSorter<HrPenaltyItem>((penalty) => penalty.status),
      effectiveDate: createDateSorter<HrPenaltyItem>((penalty) => penalty.effectiveDate),
      amount: createNumberSorter<HrPenaltyItem>((penalty) => penalty.amount),
      details: createTextSorter<HrPenaltyItem>((penalty) => `${penalty.referenceNumber || ''} ${penalty.details || ''}`),
    }),
    []
  );

  const {
    sortedRows: sortedPenalties,
    sortKey,
    sortDirection,
    toggleSort,
  } = useSortableRows({
    rows: filteredPenalties,
    sorters: penaltySorters,
    initialSortKey: 'effectiveDate',
    initialDirection: 'desc',
  });
  const penaltiesPager = usePaginatedRows({ rows: sortedPenalties });

  const handleInlineCreateChange = <K extends keyof HrPenaltyFormValues>(key: K, value: HrPenaltyFormValues[K]) => {
    setInlinePenalty((current) => ({ ...current, [key]: value }));
  };

  const handleInlineEditChange = <K extends keyof HrPenaltyFormValues>(key: K, value: HrPenaltyFormValues[K]) => {
    setInlineEditPenalty((current) => ({ ...current, [key]: value }));
  };

  const resetInlineCreate = () => {
    setInlineCreateOpen(false);
    setInlinePenalty(buildEmptyPenaltyValues());
  };

  const resetInlineEdit = () => {
    setInlineEditPenaltyId(null);
    setInlineEditPenalty(buildEmptyPenaltyValues());
  };

  const validatePenalty = (values: HrPenaltyFormValues) => {
    if (!values.employeeProfileId) {
      toastError('بيانات ناقصة', 'اختر العامل أولاً.');
      return false;
    }

    if (!values.penaltyTypeId) {
      toastError('بيانات ناقصة', 'اختر نوع الجزاء أولاً.');
      return false;
    }

    return true;
  };

  const handleSavePenalty = async (values: HrPenaltyFormValues) => {
    setSavingPenalty(true);

    try {
      await hrService.savePenalty(values);
      toastSuccess(values.id ? 'تم تحديث الجزاء' : 'تمت إضافة الجزاء', values.referenceNumber || 'بدون رقم مرجعي');
      resetInlineEdit();
      await loadData('refresh');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ الجزاء.';
      toastError('فشل حفظ الجزاء', message);
      return false;
    } finally {
      setSavingPenalty(false);
    }
  };

  const handleSaveInlineCreate = async () => {
    if (!validatePenalty(inlinePenalty)) return;

    const saved = await handleSavePenalty(inlinePenalty);
    if (saved) {
      resetInlineCreate();
    }
  };

  const handleSaveInlineEdit = async () => {
    if (!validatePenalty(inlineEditPenalty)) return;
    await handleSavePenalty(inlineEditPenalty);
  };

  const handleOpenCreate = () => {
    penaltiesPager.setPage(1);
    resetInlineEdit();
    setInlinePenalty(buildEmptyPenaltyValues());
    setInlineCreateOpen(true);
  };

  const handleOpenEdit = (penalty: HrPenaltyItem) => {
    setInlineCreateOpen(false);
    setInlineEditPenaltyId(penalty.id);
    setInlineEditPenalty(buildPenaltyValuesFromItem(penalty));
  };

  const handlePenaltyTypeChange = (penaltyTypeId: string, editMode: boolean) => {
    const selectedType = options.penaltyTypes.find((item) => item.id === penaltyTypeId);

    if (editMode) {
      setInlineEditPenalty((current) => ({
        ...current,
        penaltyTypeId,
        amount: current.amount || (selectedType ? String(selectedType.defaultAmount) : ''),
      }));
      return;
    }

    setInlinePenalty((current) => ({
      ...current,
      penaltyTypeId,
      amount: current.amount || (selectedType ? String(selectedType.defaultAmount) : ''),
    }));
  };

  const handleChangeStatus = async (penalty: HrPenaltyItem, status: string) => {
    try {
      await hrService.setPenaltyStatus(penalty.id, status);
      toastSuccess('تم تحديث حالة الجزاء', `${penalty.employeeName} -> ${status}`);
      await loadData('refresh');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تحديث حالة الجزاء.';
      toastError('فشل تحديث الحالة', message);
    }
  };

  const handlePrint = (penalty: HrPenaltyItem) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toastError('تعذر الطباعة', 'المتصفح منع نافذة الطباعة.');
      return;
    }

    const html = `
      <html lang="ar" dir="rtl">
        <head>
          <title>نموذج جزاء</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
            h1 { margin: 0 0 24px; font-size: 24px; }
            .meta { margin-bottom: 24px; }
            .meta div { margin-bottom: 8px; }
            .box { border: 1px solid #cbd5e1; padding: 16px; min-height: 120px; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>نموذج جزاء</h1>
          <div class="meta">
            <div><strong>العامل:</strong> ${escapeHtml(penalty.employeeName)}</div>
            <div><strong>نوع الجزاء:</strong> ${escapeHtml(penalty.penaltyTypeName || 'غير محدد')}</div>
            <div><strong>التاريخ:</strong> ${escapeHtml(penalty.effectiveDate ? formatDate(penalty.effectiveDate) : '—')}</div>
            <div><strong>القيمة:</strong> ${escapeHtml(penalty.amount === null ? '—' : penalty.amount.toFixed(2))}</div>
            <div><strong>المرجع:</strong> ${escapeHtml(penalty.referenceNumber || '—')}</div>
            <div><strong>الحالة:</strong> ${escapeHtml(penalty.status)}</div>
          </div>
          <div class="box">${escapeHtml(penalty.details || 'لا توجد تفاصيل')}</div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <HrPageShell title="الجزاءات" description="إدارة سجلات الجزاءات والطباعة." stats={stats}>
      <HrSectionCard
        title="السجلات"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void loadData('refresh')} disabled={refreshing} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث
            </button>
            <button type="button" onClick={handleOpenCreate} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
              <PlusIcon className="h-4 w-4" />
              إضافة صف
            </button>
          </div>
        }
      >
        {loading ? (
          <TableSkeleton rows={8} />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px]">
              <label className="relative block">
                <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="بحث بالعامل أو نوع الجزاء أو المرجع" className="w-full rounded-md border border-slate-300 bg-white py-2.5 pr-10 pl-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40" />
              </label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40">
                <option value="all">كل الحالات</option>
                {PENALTY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>

            <HrDataGrid rowCount={penaltiesPager.totalRows} columnCount={7} footer={<HrTablePager page={penaltiesPager.page} pageCount={penaltiesPager.pageCount} pageSize={penaltiesPager.pageSize} totalRows={penaltiesPager.totalRows} fromRow={penaltiesPager.fromRow} toRow={penaltiesPager.toRow} onPageChange={penaltiesPager.setPage} onPageSizeChange={penaltiesPager.setPageSize} />}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><HrSortableHeader label="العامل" sortKey="employeeName" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                    <th><HrSortableHeader label="نوع الجزاء" sortKey="penaltyTypeName" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                    <th><HrSortableHeader label="التفاصيل" sortKey="details" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                    <th><HrSortableHeader label="التاريخ / القيمة" sortKey="effectiveDate" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                    <th><HrSortableHeader label="الحالة" sortKey="status" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineCreateOpen ? (
                    <HrInlineRow className="bg-emerald-50/60 dark:bg-emerald-950/20" saving={savingPenalty} onSave={() => void handleSaveInlineCreate()} onCancel={resetInlineCreate}>
                      <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                      <td><HrInlineSelect autoFocus value={inlinePenalty.employeeProfileId} onChange={(event) => handleInlineCreateChange('employeeProfileId', event.target.value)}><option value="">اختر العامل</option>{options.employeeProfiles.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</HrInlineSelect></td>
                      <td><HrInlineSelect value={inlinePenalty.penaltyTypeId} onChange={(event) => handlePenaltyTypeChange(event.target.value, false)}><option value="">اختر النوع</option>{options.penaltyTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</HrInlineSelect></td>
                      <td className="space-y-2"><HrInlineInput value={inlinePenalty.referenceNumber} onChange={(event) => handleInlineCreateChange('referenceNumber', event.target.value)} placeholder="رقم المرجع" /><HrInlineInput value={inlinePenalty.details} onChange={(event) => handleInlineCreateChange('details', event.target.value)} placeholder="التفاصيل" /></td>
                      <td className="space-y-2"><HrInlineInput type="date" value={inlinePenalty.effectiveDate} onChange={(event) => handleInlineCreateChange('effectiveDate', event.target.value)} /><HrInlineInput type="number" min="0" step="0.01" value={inlinePenalty.amount} onChange={(event) => handleInlineCreateChange('amount', event.target.value)} placeholder="القيمة" /></td>
                      <td><HrInlineSelect value={inlinePenalty.status} onChange={(event) => handleInlineCreateChange('status', event.target.value)}>{PENALTY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</HrInlineSelect></td>
                      <td><HrInlineActions saving={savingPenalty} onSave={() => void handleSaveInlineCreate()} onCancel={resetInlineCreate} /></td>
                    </HrInlineRow>
                  ) : null}
                  {penaltiesPager.pagedRows.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{penalties.length === 0 ? 'لا توجد جزاءات حالياً.' : 'لا توجد نتائج مطابقة للفلاتر الحالية.'}</td></tr>
                  ) : (
                    penaltiesPager.pagedRows.map((penalty, index) => (
                      inlineEditPenaltyId === penalty.id ? (
                        <HrInlineRow key={penalty.id} className="bg-blue-50/60 dark:bg-blue-950/20" saving={savingPenalty} onSave={() => void handleSaveInlineEdit()} onCancel={resetInlineEdit}>
                          <td className="w-10 text-center text-blue-600 dark:text-blue-300">{penaltiesPager.offset + index + 1}</td>
                          <td><HrInlineSelect autoFocus value={inlineEditPenalty.employeeProfileId} onChange={(event) => handleInlineEditChange('employeeProfileId', event.target.value)}><option value="">اختر العامل</option>{options.employeeProfiles.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</HrInlineSelect></td>
                          <td><HrInlineSelect value={inlineEditPenalty.penaltyTypeId} onChange={(event) => handlePenaltyTypeChange(event.target.value, true)}><option value="">اختر النوع</option>{options.penaltyTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</HrInlineSelect></td>
                          <td className="space-y-2"><HrInlineInput value={inlineEditPenalty.referenceNumber} onChange={(event) => handleInlineEditChange('referenceNumber', event.target.value)} placeholder="رقم المرجع" /><HrInlineInput value={inlineEditPenalty.details} onChange={(event) => handleInlineEditChange('details', event.target.value)} placeholder="التفاصيل" /></td>
                          <td className="space-y-2"><HrInlineInput type="date" value={inlineEditPenalty.effectiveDate} onChange={(event) => handleInlineEditChange('effectiveDate', event.target.value)} /><HrInlineInput type="number" min="0" step="0.01" value={inlineEditPenalty.amount} onChange={(event) => handleInlineEditChange('amount', event.target.value)} placeholder="القيمة" /></td>
                          <td><HrInlineSelect value={inlineEditPenalty.status} onChange={(event) => handleInlineEditChange('status', event.target.value)}>{PENALTY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</HrInlineSelect></td>
                          <td><HrInlineActions saving={savingPenalty} onSave={() => void handleSaveInlineEdit()} onCancel={resetInlineEdit} /></td>
                        </HrInlineRow>
                      ) : (
                        <tr key={penalty.id} onDoubleClick={() => handleOpenEdit(penalty)}>
                          <td className="w-10 text-center text-slate-400">{penaltiesPager.offset + index + 1}</td>
                          <td className="px-3 py-3 font-medium">{penalty.employeeName}</td>
                          <td className="px-3 py-3">{penalty.penaltyTypeName || 'جزاء غير مصنف'}</td>
                          <td className="px-3 py-3"><div>{penalty.referenceNumber || 'بدون مرجع'}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{penalty.details || '—'}</div></td>
                          <td className="px-3 py-3"><div>{penalty.effectiveDate ? formatDate(penalty.effectiveDate) : '—'}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{penalty.amount === null ? '—' : penalty.amount.toFixed(2)}</div></td>
                          <td className="px-3 py-3"><HrStatusBadge value={penalty.status} /></td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button type="button" onClick={() => handleOpenEdit(penalty)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><PencilSquareIcon className="h-3.5 w-3.5" />تعديل</button>
                              <button type="button" onClick={() => handlePrint(penalty)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><PrinterIcon className="h-3.5 w-3.5" />طباعة</button>
                              {penalty.status === 'draft' ? <button type="button" onClick={() => void handleChangeStatus(penalty, 'submitted')} className="rounded-md bg-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300">إرسال</button> : null}
                              {['submitted', 'in_review'].includes(penalty.status) ? <button type="button" onClick={() => void handleChangeStatus(penalty, 'approved')} className="rounded-md bg-emerald-100 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300">اعتماد</button> : null}
                              {['draft', 'submitted', 'in_review', 'approved'].includes(penalty.status) ? <button type="button" onClick={() => void handleChangeStatus(penalty, 'rejected')} className="rounded-md bg-rose-100 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300">رفض</button> : null}
                              {['approved', 'rejected'].includes(penalty.status) ? <button type="button" onClick={() => void handleChangeStatus(penalty, 'closed')} className="rounded-md bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200">إغلاق</button> : null}
                            </div>
                          </td>
                        </tr>
                      )
                    ))
                  )}
                </tbody>
              </table>
            </HrDataGrid>
          </div>
        )}
      </HrSectionCard>
    </HrPageShell>
  );
};

export default PenaltiesPage;
