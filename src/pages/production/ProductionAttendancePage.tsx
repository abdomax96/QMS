import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  PencilSquareIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { TableSkeleton } from '../../components/common/LoadingStates';
import { useToastStore } from '../../store/toastStore';
import { formatDate } from '../../utils';
import {
  HrInlineActions,
  HrInlineInput,
  HrInlineRow,
  HrInlineSelect,
} from '../../modules/hr/components/HrInlineTableControls';
import HrSortableHeader from '../../modules/hr/components/HrSortableHeader';
import HrStatusBadge from '../../modules/hr/components/HrStatusBadge';
import HrTablePager from '../../modules/hr/components/HrTablePager';
import { HrDataGrid, HrPageShell, HrSectionCard, type HrPageStat } from '../../modules/hr/components/HrPageShell';
import { usePaginatedRows } from '../../modules/hr/hooks/usePaginatedRows';
import {
  createDateSorter,
  createTextSorter,
  useSortableRows,
} from '../../modules/hr/hooks/useSortableRows';
import productionAttendanceService from '../../services/productionAttendanceService';
import type {
  ProductionAttendanceBatchFormValues,
  ProductionAttendanceBatchItem,
  ProductionAttendanceEventFormValues,
  ProductionAttendanceEventItem,
  ProductionAttendanceFormOptions,
} from '../../modules/hr/types';

const EMPTY_OPTIONS: ProductionAttendanceFormOptions = {
  employeeProfiles: [],
  shiftPlans: [],
};

const buildEmptyBatchValues = (): ProductionAttendanceBatchFormValues => ({
  batchDate: new Date().toISOString().slice(0, 10),
  shiftPlanId: '',
  notes: '',
});

const buildEmptyEventValues = (batchId: string, batchDate: string): ProductionAttendanceEventFormValues => ({
  reviewBatchId: batchId,
  employeeProfileId: '',
  eventDate: batchDate,
  attendanceStatus: 'present',
  checkInAt: '',
  checkOutAt: '',
  shiftAssignmentId: '',
  notes: '',
});

const buildBatchValuesFromItem = (
  batch: ProductionAttendanceBatchItem
): ProductionAttendanceBatchFormValues => ({
  id: batch.id,
  batchDate: batch.batchDate,
  shiftPlanId: batch.shiftPlanId || '',
  notes: batch.notes || '',
});

const toTimeInputValue = (dateTime: string | null) => {
  if (!dateTime) return '';
  return new Date(dateTime).toISOString().slice(11, 16);
};

const buildEventValuesFromItem = (
  event: ProductionAttendanceEventItem
): ProductionAttendanceEventFormValues => ({
  id: event.id,
  reviewBatchId: event.reviewBatchId || '',
  employeeProfileId: event.employeeProfileId || '',
  eventDate: event.eventDate,
  attendanceStatus: event.attendanceStatus,
  checkInAt: toTimeInputValue(event.checkInAt),
  checkOutAt: toTimeInputValue(event.checkOutAt),
  shiftAssignmentId: event.shiftAssignmentId || '',
  notes: event.notes || '',
});

const ProductionAttendancePage: React.FC = () => {
  const [batches, setBatches] = useState<ProductionAttendanceBatchItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchEvents, setBatchEvents] = useState<ProductionAttendanceEventItem[]>([]);
  const [options, setOptions] = useState<ProductionAttendanceFormOptions>(EMPTY_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [savingBatch, setSavingBatch] = useState(false);
  const [inlineBatchOpen, setInlineBatchOpen] = useState(false);
  const [inlineBatch, setInlineBatch] = useState<ProductionAttendanceBatchFormValues>(buildEmptyBatchValues);
  const [inlineEditBatchId, setInlineEditBatchId] = useState<string | null>(null);
  const [inlineEditBatch, setInlineEditBatch] = useState<ProductionAttendanceBatchFormValues>(buildEmptyBatchValues);

  const [savingEvent, setSavingEvent] = useState(false);
  const [inlineEventOpen, setInlineEventOpen] = useState(false);
  const [inlineEvent, setInlineEvent] = useState<ProductionAttendanceEventFormValues>(buildEmptyEventValues('', new Date().toISOString().slice(0, 10)));
  const [inlineEditEventId, setInlineEditEventId] = useState<string | null>(null);
  const [inlineEditEvent, setInlineEditEvent] = useState<ProductionAttendanceEventFormValues>(buildEmptyEventValues('', new Date().toISOString().slice(0, 10)));

  const toastSuccess = useToastStore((state) => state.success);
  const toastError = useToastStore((state) => state.error);

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) || null,
    [batches, selectedBatchId]
  );

  const loadBaseData = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [nextBatches, nextOptions] = await Promise.all([
        productionAttendanceService.listReviewBatches(50),
        productionAttendanceService.getFormOptions(),
      ]);

      setBatches(nextBatches);
      setOptions(nextOptions);
      setSelectedBatchId((current) => {
        if (current && nextBatches.some((batch) => batch.id === current)) {
          return current;
        }
        return nextBatches[0]?.id || null;
      });
    } finally {
      if (mode === 'initial') {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, []);

  const loadBatchEvents = useCallback(async (batchId: string | null) => {
    if (!batchId) {
      setBatchEvents([]);
      return;
    }

    setLoadingEvents(true);
    try {
      const nextEvents = await productionAttendanceService.listBatchEvents(batchId);
      setBatchEvents(nextEvents);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    void loadBatchEvents(selectedBatchId);
  }, [selectedBatchId, loadBatchEvents]);

  const stats = useMemo<HrPageStat[]>(
    () => [
      { label: 'دفعات المراجعة', value: batches.length, helper: 'دفعات حضور تحتاج إرسال أو مراجعة', accent: 'blue' },
      { label: 'سجلات الدفعة المحددة', value: batchEvents.length, helper: 'أحداث الحضور المرتبطة بالدفعة الحالية', accent: 'green' },
      { label: 'الاعتماد النهائي', value: 'Production -> HR', helper: 'الإنتاج يراجع أولاً ثم ترسل النتيجة إلى HR/Payroll', accent: 'indigo' },
      { label: 'مصدر البيانات', value: 'ops_*', helper: 'الحضور الخام هنا وليس داخل موديول HR', accent: 'amber' },
    ],
    [batches.length, batchEvents.length]
  );

  const batchSorters = useMemo(
    () => ({
      batchDate: createDateSorter<ProductionAttendanceBatchItem>((batch) => batch.batchDate),
      shiftPlanName: createTextSorter<ProductionAttendanceBatchItem>((batch) => batch.shiftPlanName),
      reviewStatus: createTextSorter<ProductionAttendanceBatchItem>((batch) => batch.reviewStatus),
      notes: createTextSorter<ProductionAttendanceBatchItem>((batch) => batch.notes),
    }),
    []
  );

  const eventSorters = useMemo(
    () => ({
      employeeName: createTextSorter<ProductionAttendanceEventItem>((event) => event.employeeName),
      eventDate: createDateSorter<ProductionAttendanceEventItem>((event) => event.eventDate),
      attendanceStatus: createTextSorter<ProductionAttendanceEventItem>((event) => event.attendanceStatus),
      checkTime: createTextSorter<ProductionAttendanceEventItem>((event) => `${event.checkInAt || ''} ${event.checkOutAt || ''}`),
    }),
    []
  );

  const {
    sortedRows: sortedBatches,
    sortKey: batchesSortKey,
    sortDirection: batchesSortDirection,
    toggleSort: toggleBatchesSort,
  } = useSortableRows({
    rows: batches,
    sorters: batchSorters,
    initialSortKey: 'batchDate',
    initialDirection: 'desc',
  });
  const batchesPager = usePaginatedRows({ rows: sortedBatches });

  const {
    sortedRows: sortedBatchEvents,
    sortKey: eventsSortKey,
    sortDirection: eventsSortDirection,
    toggleSort: toggleEventsSort,
  } = useSortableRows({
    rows: batchEvents,
    sorters: eventSorters,
    initialSortKey: 'eventDate',
    initialDirection: 'desc',
  });
  const eventsPager = usePaginatedRows({ rows: sortedBatchEvents });

  useEffect(() => {
    if (!selectedBatch) {
      setInlineEvent(buildEmptyEventValues('', new Date().toISOString().slice(0, 10)));
      setInlineEditEvent(buildEmptyEventValues('', new Date().toISOString().slice(0, 10)));
      return;
    }

    setInlineEvent((current) => ({
      ...current,
      reviewBatchId: selectedBatch.id,
      eventDate: current.eventDate || selectedBatch.batchDate,
    }));
    setInlineEditEvent((current) => ({
      ...current,
      reviewBatchId: current.reviewBatchId || selectedBatch.id,
      eventDate: current.eventDate || selectedBatch.batchDate,
    }));
  }, [selectedBatch]);

  const handleInlineBatchChange = <K extends keyof ProductionAttendanceBatchFormValues>(
    key: K,
    value: ProductionAttendanceBatchFormValues[K]
  ) => {
    setInlineBatch((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleInlineEventChange = <K extends keyof ProductionAttendanceEventFormValues>(
    key: K,
    value: ProductionAttendanceEventFormValues[K]
  ) => {
    setInlineEvent((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSaveBatch = async (values: ProductionAttendanceBatchFormValues) => {
    setSavingBatch(true);

    try {
      const batchId = await productionAttendanceService.saveBatch(values);
      toastSuccess(
        values.id ? 'تم تحديث دفعة الحضور' : 'تمت إضافة دفعة الحضور',
        values.batchDate
      );
      setInlineEditBatchId(null);
      setInlineEditBatch(buildEmptyBatchValues());
      await loadBaseData('refresh');
      setSelectedBatchId(batchId);
      await loadBatchEvents(batchId);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ دفعة الحضور.';
      toastError('فشل حفظ الدفعة', message);
      return false;
    } finally {
      setSavingBatch(false);
    }
  };

  const handleSaveInlineBatch = async () => {
    if (!inlineBatch.batchDate) {
      toastError('بيانات ناقصة', 'اختر تاريخ الدفعة أولاً.');
      return;
    }

    const saved = await handleSaveBatch(inlineBatch);
    if (saved) {
      setInlineBatchOpen(false);
      setInlineBatch(buildEmptyBatchValues());
    }
  };

  const handleOpenInlineEditBatch = (batch: ProductionAttendanceBatchItem) => {
    setInlineBatchOpen(false);
    setInlineEditBatchId(batch.id);
    setInlineEditBatch(buildBatchValuesFromItem(batch));
  };

  const handleInlineEditBatchChange = <K extends keyof ProductionAttendanceBatchFormValues>(
    key: K,
    value: ProductionAttendanceBatchFormValues[K]
  ) => {
    setInlineEditBatch((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleCancelInlineEditBatch = () => {
    if (savingBatch) return;
    setInlineEditBatchId(null);
    setInlineEditBatch(buildEmptyBatchValues());
  };

  const handleSaveInlineEditBatch = async () => {
    if (!inlineEditBatch.batchDate) {
      toastError('بيانات ناقصة', 'اختر تاريخ الدفعة أولاً.');
      return;
    }

    await handleSaveBatch(inlineEditBatch);
  };

  const handleSaveEvent = async (values: ProductionAttendanceEventFormValues) => {
    setSavingEvent(true);

    try {
      await productionAttendanceService.saveAttendanceEvent(values);
      toastSuccess(
        values.id ? 'تم تحديث سجل الحضور' : 'تمت إضافة سجل الحضور',
        selectedBatch?.batchDate || values.eventDate
      );
      setInlineEditEventId(null);
      setInlineEditEvent(buildEmptyEventValues(selectedBatchId || '', selectedBatch?.batchDate || values.eventDate));
      await loadBatchEvents(selectedBatchId);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ سجل الحضور.';
      toastError('فشل حفظ سجل الحضور', message);
      return false;
    } finally {
      setSavingEvent(false);
    }
  };

  const handleSaveInlineEvent = async () => {
    if (!selectedBatch) {
      toastError('لا توجد دفعة محددة', 'اختر دفعة أولاً قبل إضافة سجل حضور.');
      return;
    }

    if (!inlineEvent.employeeProfileId || !inlineEvent.eventDate) {
      toastError('بيانات ناقصة', 'اختر العامل وتاريخ السجل أولاً.');
      return;
    }

    const saved = await handleSaveEvent({
      ...inlineEvent,
      reviewBatchId: selectedBatch.id,
    });
    if (saved) {
      setInlineEventOpen(false);
      setInlineEvent(buildEmptyEventValues(selectedBatch.id, selectedBatch.batchDate));
    }
  };

  const handleOpenInlineEditEvent = (eventRow: ProductionAttendanceEventItem) => {
    setInlineEventOpen(false);
    setInlineEditEventId(eventRow.id);
    setInlineEditEvent(buildEventValuesFromItem(eventRow));
  };

  const handleInlineEditEventChange = <K extends keyof ProductionAttendanceEventFormValues>(
    key: K,
    value: ProductionAttendanceEventFormValues[K]
  ) => {
    setInlineEditEvent((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleCancelInlineEditEvent = () => {
    if (savingEvent) return;
    setInlineEditEventId(null);
    if (selectedBatch) {
      setInlineEditEvent(buildEmptyEventValues(selectedBatch.id, selectedBatch.batchDate));
    }
  };

  const handleSaveInlineEditEvent = async () => {
    if (!inlineEditEvent.employeeProfileId || !inlineEditEvent.eventDate) {
      toastError('بيانات ناقصة', 'اختر العامل وتاريخ السجل أولاً.');
      return;
    }

    await handleSaveEvent(inlineEditEvent);
  };

  const handleSubmitBatch = async (batch: ProductionAttendanceBatchItem) => {
    const confirmed = window.confirm(`هل تريد إرسال دفعة ${formatDate(batch.batchDate)} للمراجعة؟`);
    if (!confirmed) return;

    try {
      await productionAttendanceService.submitBatch(batch.id);
      toastSuccess('تم إرسال الدفعة للمراجعة', formatDate(batch.batchDate));
      await loadBaseData('refresh');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر إرسال الدفعة.';
      toastError('فشل إرسال الدفعة', message);
    }
  };

  const handleReviewBatch = async (batch: ProductionAttendanceBatchItem, reviewStatus: string) => {
    const notes = window.prompt('ملاحظات المراجعة (اختياري):', batch.notes || '') ?? '';

    try {
      await productionAttendanceService.reviewBatch(batch.id, reviewStatus, notes);
      toastSuccess('تم تحديث حالة الدفعة', `${formatDate(batch.batchDate)} -> ${reviewStatus}`);
      await loadBaseData('refresh');
      await loadBatchEvents(batch.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تحديث حالة الدفعة.';
      toastError('فشل تحديث حالة الدفعة', message);
    }
  };

  return (
    <HrPageShell
      title="حضور التشغيل"
      description="هذه الصفحة تمثل نقطة تسجيل ومراجعة الحضور اليومية داخل قسم الإنتاج، مع فصل واضح عن بيانات HR والمرتبات."
      stats={stats}
    >
      <div className="space-y-4">
        <HrSectionCard
          title="دفعات المراجعة"
          description="الحضور اليومي يُجمع في دفعات قبل إرساله لـ HR/Payroll للاعتماد النهائي."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadBaseData('refresh')}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                تحديث
              </button>
              <button
                type="button"
                onClick={() => {
                  batchesPager.setPage(1);
                  setInlineBatch(buildEmptyBatchValues());
                  setInlineEditBatchId(null);
                  setInlineBatchOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                <PlusIcon className="h-4 w-4" />
                إضافة صف
              </button>
            </div>
          }
        >
          {loading ? (
            <TableSkeleton rows={6} />
          ) : (
            <HrDataGrid
              rowCount={batchesPager.totalRows}
              columnCount={6}
              footer={
                <HrTablePager
                  page={batchesPager.page}
                  pageCount={batchesPager.pageCount}
                  pageSize={batchesPager.pageSize}
                  totalRows={batchesPager.totalRows}
                  fromRow={batchesPager.fromRow}
                  toRow={batchesPager.toRow}
                  onPageChange={batchesPager.setPage}
                  onPageSizeChange={batchesPager.setPageSize}
                />
              }
            >
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><HrSortableHeader label="التاريخ" sortKey="batchDate" activeSortKey={batchesSortKey} sortDirection={batchesSortDirection} onToggle={toggleBatchesSort} /></th>
                    <th><HrSortableHeader label="الخطة" sortKey="shiftPlanName" activeSortKey={batchesSortKey} sortDirection={batchesSortDirection} onToggle={toggleBatchesSort} /></th>
                    <th><HrSortableHeader label="الحالة" sortKey="reviewStatus" activeSortKey={batchesSortKey} sortDirection={batchesSortDirection} onToggle={toggleBatchesSort} /></th>
                    <th><HrSortableHeader label="ملاحظات" sortKey="notes" activeSortKey={batchesSortKey} sortDirection={batchesSortDirection} onToggle={toggleBatchesSort} /></th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineBatchOpen ? (
                    <HrInlineRow
                      className="bg-emerald-50/60 dark:bg-emerald-950/20"
                      saving={savingBatch}
                      onSave={() => void handleSaveInlineBatch()}
                      onCancel={() => {
                        if (savingBatch) return;
                        setInlineBatchOpen(false);
                        setInlineBatch(buildEmptyBatchValues());
                      }}
                    >
                      <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                      <td><HrInlineInput autoFocus type="date" value={inlineBatch.batchDate} onChange={(event) => handleInlineBatchChange('batchDate', event.target.value)} /></td>
                      <td>
                        <HrInlineSelect value={inlineBatch.shiftPlanId} onChange={(event) => handleInlineBatchChange('shiftPlanId', event.target.value)}>
                          <option value="">بدون خطة</option>
                          {options.shiftPlans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name}
                            </option>
                          ))}
                        </HrInlineSelect>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">مسودة</td>
                      <td><HrInlineInput value={inlineBatch.notes} onChange={(event) => handleInlineBatchChange('notes', event.target.value)} placeholder="ملاحظات" /></td>
                      <td>
                        <HrInlineActions
                          saving={savingBatch}
                          onSave={() => void handleSaveInlineBatch()}
                          onCancel={() => {
                            if (savingBatch) return;
                            setInlineBatchOpen(false);
                            setInlineBatch(buildEmptyBatchValues());
                          }}
                        />
                      </td>
                    </HrInlineRow>
                  ) : null}

                  {batchesPager.pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        لا توجد دفعات حضور بعد. أضف صفاً جديداً للبدء.
                      </td>
                    </tr>
                  ) : (
                    batchesPager.pagedRows.map((batch, index) => (
                    inlineEditBatchId === batch.id ? (
                    <HrInlineRow
                      key={batch.id}
                      className="bg-blue-50/60 dark:bg-blue-950/20"
                      saving={savingBatch}
                      onSave={() => void handleSaveInlineEditBatch()}
                      onCancel={handleCancelInlineEditBatch}
                    >
                      <td className="w-10 text-center text-blue-600 dark:text-blue-300">{batchesPager.offset + index + 1}</td>
                      <td><HrInlineInput autoFocus type="date" value={inlineEditBatch.batchDate} onChange={(event) => handleInlineEditBatchChange('batchDate', event.target.value)} /></td>
                      <td>
                        <HrInlineSelect value={inlineEditBatch.shiftPlanId} onChange={(event) => handleInlineEditBatchChange('shiftPlanId', event.target.value)}>
                          <option value="">بدون خطة</option>
                          {options.shiftPlans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name}
                            </option>
                          ))}
                        </HrInlineSelect>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">{batch.reviewStatus}</td>
                      <td><HrInlineInput value={inlineEditBatch.notes} onChange={(event) => handleInlineEditBatchChange('notes', event.target.value)} placeholder="ملاحظات" /></td>
                      <td>
                        <HrInlineActions
                          saving={savingBatch}
                          onSave={() => void handleSaveInlineEditBatch()}
                          onCancel={handleCancelInlineEditBatch}
                        />
                      </td>
                    </HrInlineRow>
                    ) : (
                    <tr
                      key={batch.id}
                      onDoubleClick={() => handleOpenInlineEditBatch(batch)}
                      className={`border-b text-slate-700 dark:text-slate-200 ${
                        selectedBatchId === batch.id
                          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20'
                          : 'border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      <td className="w-10 text-center text-slate-400">{batchesPager.offset + index + 1}</td>
                      <td className="px-3 py-3 font-medium">
                        <button
                          type="button"
                          onClick={() => setSelectedBatchId(batch.id)}
                          className="text-right text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-300"
                        >
                          {formatDate(batch.batchDate)}
                        </button>
                      </td>
                      <td className="px-3 py-3">{batch.shiftPlanName || 'بدون خطة مرتبطة'}</td>
                      <td className="px-3 py-3"><HrStatusBadge value={batch.reviewStatus} /></td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{batch.notes || '—'}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenInlineEditBatch(batch)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <PencilSquareIcon className="h-3.5 w-3.5" />
                            تعديل
                          </button>
                          {batch.reviewStatus === 'draft' ? (
                            <button
                              type="button"
                              onClick={() => void handleSubmitBatch(batch)}
                              className="rounded-md bg-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                            >
                              إرسال
                            </button>
                          ) : null}
                          {['submitted', 'in_review'].includes(batch.reviewStatus) ? (
                            <button
                              type="button"
                              onClick={() => void handleReviewBatch(batch, 'approved')}
                              className="rounded-md bg-emerald-100 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
                            >
                              اعتماد
                            </button>
                          ) : null}
                          {batch.reviewStatus !== 'rejected' ? (
                            <button
                              type="button"
                              onClick={() => void handleReviewBatch(batch, 'rejected')}
                              className="rounded-md bg-rose-100 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300"
                            >
                              رفض
                            </button>
                          ) : null}
                          {['submitted', 'approved'].includes(batch.reviewStatus) ? (
                            <button
                              type="button"
                              onClick={() => void handleReviewBatch(batch, 'closed')}
                              className="rounded-md bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
                            >
                              إغلاق
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    )
                    ))
                  )}
                </tbody>
              </table>
            </HrDataGrid>
          )}
        </HrSectionCard>

        <HrSectionCard
          title={selectedBatch ? `سجلات دفعة ${formatDate(selectedBatch.batchDate)}` : 'سجلات الحضور'}
          description="سجلات تشغيلية خام يمكن بعد مراجعتها تحويلها إلى ledger معتمد داخل HR."
          actions={
            selectedBatch ? (
              <button
                type="button"
                onClick={() => {
                  if (!selectedBatch) return;
                  eventsPager.setPage(1);
                  setInlineEvent(buildEmptyEventValues(selectedBatch.id, selectedBatch.batchDate));
                  setInlineEditEventId(null);
                  setInlineEventOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                <PlusIcon className="h-4 w-4" />
                إضافة صف
              </button>
            ) : null
          }
        >
          {loading || loadingEvents ? (
            <TableSkeleton rows={6} />
          ) : !selectedBatch ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">اختر دفعة من القائمة لعرض سجلاتها.</p>
          ) : (
            <HrDataGrid
              rowCount={eventsPager.totalRows}
              columnCount={6}
              footer={
                <HrTablePager
                  page={eventsPager.page}
                  pageCount={eventsPager.pageCount}
                  pageSize={eventsPager.pageSize}
                  totalRows={eventsPager.totalRows}
                  fromRow={eventsPager.fromRow}
                  toRow={eventsPager.toRow}
                  onPageChange={eventsPager.setPage}
                  onPageSizeChange={eventsPager.setPageSize}
                />
              }
            >
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><HrSortableHeader label="العامل" sortKey="employeeName" activeSortKey={eventsSortKey} sortDirection={eventsSortDirection} onToggle={toggleEventsSort} /></th>
                    <th><HrSortableHeader label="التاريخ" sortKey="eventDate" activeSortKey={eventsSortKey} sortDirection={eventsSortDirection} onToggle={toggleEventsSort} /></th>
                    <th><HrSortableHeader label="الحالة" sortKey="attendanceStatus" activeSortKey={eventsSortKey} sortDirection={eventsSortDirection} onToggle={toggleEventsSort} /></th>
                    <th><HrSortableHeader label="الدخول / الخروج" sortKey="checkTime" activeSortKey={eventsSortKey} sortDirection={eventsSortDirection} onToggle={toggleEventsSort} /></th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineEventOpen && selectedBatch ? (
                    <HrInlineRow
                      className="bg-emerald-50/60 dark:bg-emerald-950/20"
                      saving={savingEvent}
                      onSave={() => void handleSaveInlineEvent()}
                      onCancel={() => {
                        if (savingEvent || !selectedBatch) return;
                        setInlineEventOpen(false);
                        setInlineEvent(buildEmptyEventValues(selectedBatch.id, selectedBatch.batchDate));
                      }}
                    >
                      <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                      <td>
                        <HrInlineSelect autoFocus value={inlineEvent.employeeProfileId} onChange={(event) => handleInlineEventChange('employeeProfileId', event.target.value)}>
                          <option value="">اختر العامل</option>
                          {options.employeeProfiles.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name}
                            </option>
                          ))}
                        </HrInlineSelect>
                      </td>
                      <td><HrInlineInput type="date" value={inlineEvent.eventDate} onChange={(event) => handleInlineEventChange('eventDate', event.target.value)} /></td>
                      <td>
                        <HrInlineSelect value={inlineEvent.attendanceStatus} onChange={(event) => handleInlineEventChange('attendanceStatus', event.target.value)}>
                          <option value="present">حضور</option>
                          <option value="absent">غياب</option>
                          <option value="leave">إجازة</option>
                          <option value="mission">مأمورية</option>
                          <option value="permission">إذن</option>
                          <option value="holiday">عطلة رسمية</option>
                          <option value="off">راحة</option>
                          <option value="late">تأخير</option>
                        </HrInlineSelect>
                      </td>
                      <td className="space-y-2">
                        <HrInlineInput type="time" value={inlineEvent.checkInAt} onChange={(event) => handleInlineEventChange('checkInAt', event.target.value)} />
                        <HrInlineInput type="time" value={inlineEvent.checkOutAt} onChange={(event) => handleInlineEventChange('checkOutAt', event.target.value)} />
                      </td>
                      <td>
                        <div className="space-y-2">
                          <HrInlineInput value={inlineEvent.notes} onChange={(event) => handleInlineEventChange('notes', event.target.value)} placeholder="ملاحظات" />
                          <HrInlineActions
                            saving={savingEvent}
                            onSave={() => void handleSaveInlineEvent()}
                            onCancel={() => {
                              if (savingEvent || !selectedBatch) return;
                              setInlineEventOpen(false);
                              setInlineEvent(buildEmptyEventValues(selectedBatch.id, selectedBatch.batchDate));
                            }}
                          />
                        </div>
                      </td>
                    </HrInlineRow>
                  ) : null}

                  {eventsPager.pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        لا توجد سجلات داخل هذه الدفعة بعد.
                      </td>
                    </tr>
                  ) : (
                    eventsPager.pagedRows.map((eventRow, index) => (
                    inlineEditEventId === eventRow.id ? (
                    <HrInlineRow
                      key={eventRow.id}
                      className="bg-blue-50/60 dark:bg-blue-950/20"
                      saving={savingEvent}
                      onSave={() => void handleSaveInlineEditEvent()}
                      onCancel={handleCancelInlineEditEvent}
                    >
                      <td className="w-10 text-center text-blue-600 dark:text-blue-300">{eventsPager.offset + index + 1}</td>
                      <td>
                        <HrInlineSelect autoFocus value={inlineEditEvent.employeeProfileId} onChange={(event) => handleInlineEditEventChange('employeeProfileId', event.target.value)}>
                          <option value="">اختر العامل</option>
                          {options.employeeProfiles.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name}
                            </option>
                          ))}
                        </HrInlineSelect>
                      </td>
                      <td><HrInlineInput type="date" value={inlineEditEvent.eventDate} onChange={(event) => handleInlineEditEventChange('eventDate', event.target.value)} /></td>
                      <td>
                        <HrInlineSelect value={inlineEditEvent.attendanceStatus} onChange={(event) => handleInlineEditEventChange('attendanceStatus', event.target.value)}>
                          <option value="present">حضور</option>
                          <option value="absent">غياب</option>
                          <option value="leave">إجازة</option>
                          <option value="mission">مأمورية</option>
                          <option value="permission">إذن</option>
                          <option value="holiday">عطلة رسمية</option>
                          <option value="off">راحة</option>
                          <option value="late">تأخير</option>
                        </HrInlineSelect>
                      </td>
                      <td className="space-y-2">
                        <HrInlineInput type="time" value={inlineEditEvent.checkInAt} onChange={(event) => handleInlineEditEventChange('checkInAt', event.target.value)} />
                        <HrInlineInput type="time" value={inlineEditEvent.checkOutAt} onChange={(event) => handleInlineEditEventChange('checkOutAt', event.target.value)} />
                      </td>
                      <td>
                        <div className="space-y-2">
                          <HrInlineInput value={inlineEditEvent.notes} onChange={(event) => handleInlineEditEventChange('notes', event.target.value)} placeholder="ملاحظات" />
                          <HrInlineActions
                            saving={savingEvent}
                            onSave={() => void handleSaveInlineEditEvent()}
                            onCancel={handleCancelInlineEditEvent}
                          />
                        </div>
                      </td>
                    </HrInlineRow>
                    ) : (
                    <tr key={eventRow.id} onDoubleClick={() => handleOpenInlineEditEvent(eventRow)}>
                      <td className="w-10 text-center text-slate-400">{eventsPager.offset + index + 1}</td>
                      <td className="px-3 py-3 font-medium">
                        <div>{eventRow.employeeName}</div>
                        {eventRow.notes ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{eventRow.notes}</div> : null}
                      </td>
                      <td className="px-3 py-3">{formatDate(eventRow.eventDate)}</td>
                      <td className="px-3 py-3"><HrStatusBadge value={eventRow.attendanceStatus} /></td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                        {eventRow.checkInAt ? formatDate(eventRow.checkInAt, 'HH:mm') : '—'}
                        {' / '}
                        {eventRow.checkOutAt ? formatDate(eventRow.checkOutAt, 'HH:mm') : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => handleOpenInlineEditEvent(eventRow)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <PencilSquareIcon className="h-3.5 w-3.5" />
                          تعديل
                        </button>
                      </td>
                    </tr>
                    )
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

export default ProductionAttendancePage;
