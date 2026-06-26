import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
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
  HrRequestFormOptions,
  HrRequestFormValues,
  HrRequestItem,
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

const EMPTY_OPTIONS: HrRequestFormOptions = {
  employeeProfiles: [],
  leaveTypes: [],
};

const REQUEST_LABELS: Record<HrRequestItem['requestType'], string> = {
  leave: 'إجازة',
  mission: 'مأمورية',
};

const REQUEST_STATUSES = ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'closed'] as const;

const buildEmptyRequestValues = (): HrRequestFormValues => ({
  requestType: 'leave',
  employeeProfileId: '',
  leaveTypeId: '',
  startDate: '',
  endDate: '',
  startAt: '',
  endAt: '',
  status: 'draft',
  reason: '',
  destination: '',
  details: '',
});

const toDateTimeInputValue = (value: string | null) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const buildRequestValuesFromItem = (request: HrRequestItem): HrRequestFormValues => ({
  id: request.id,
  requestType: request.requestType,
  employeeProfileId: request.employeeProfileId || '',
  leaveTypeId: request.leaveTypeId || '',
  startDate: request.requestType === 'leave' ? (request.startDate?.slice(0, 10) || '') : '',
  endDate: request.requestType === 'leave' ? (request.endDate?.slice(0, 10) || '') : '',
  startAt: request.requestType === 'mission' ? toDateTimeInputValue(request.startDate) : '',
  endAt: request.requestType === 'mission' ? toDateTimeInputValue(request.endDate) : '',
  status: request.status,
  reason: request.reason || '',
  destination: request.destination || '',
  details: request.details || '',
});

const formatRequestPeriod = (request: HrRequestItem) => {
  if (request.requestType === 'leave') {
    const start = request.startDate ? formatDate(request.startDate) : '—';
    const end = request.endDate ? formatDate(request.endDate) : '';
    return end ? `${start} - ${end}` : start;
  }

  const start = request.startDate ? formatDate(request.startDate, 'yyyy-MM-dd HH:mm') : '—';
  const end = request.endDate ? formatDate(request.endDate, 'yyyy-MM-dd HH:mm') : '';
  return end ? `${start} - ${end}` : start;
};

const RequestsPage: React.FC = () => {
  const [summary, setSummary] = useState<HrDashboardSummary>(EMPTY_SUMMARY);
  const [requests, setRequests] = useState<HrRequestItem[]>([]);
  const [options, setOptions] = useState<HrRequestFormOptions>(EMPTY_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingRequest, setSavingRequest] = useState(false);
  const [inlineCreateOpen, setInlineCreateOpen] = useState(false);
  const [inlineRequest, setInlineRequest] = useState<HrRequestFormValues>(buildEmptyRequestValues);
  const [inlineEditRequestId, setInlineEditRequestId] = useState<string | null>(null);
  const [inlineEditRequest, setInlineEditRequest] = useState<HrRequestFormValues>(buildEmptyRequestValues);
  const [searchQuery, setSearchQuery] = useState('');
  const [requestTypeFilter, setRequestTypeFilter] = useState<'all' | HrRequestItem['requestType']>('all');
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
      const [nextSummary, nextRequests, nextOptions] = await Promise.all([
        hrService.getDashboardSummary(),
        hrService.listRequests(200),
        hrService.getRequestFormOptions(),
      ]);

      setSummary(nextSummary);
      setRequests(nextRequests);
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
      { label: 'طلبات مفتوحة', value: summary.openRequestsCount, helper: 'إجازات + مأموريات', accent: 'blue' },
      { label: 'مراجعات حضور', value: summary.submittedAttendanceBatchesCount, helper: 'مرجع لتسويات الطلبات', accent: 'indigo' },
      { label: 'فترات مرتبات', value: summary.payrollPeriodsCount, helper: 'لقياس أثر الطلبات على الشهر', accent: 'amber' },
      { label: 'العاملون', value: summary.employeesCount, helper: 'جميع العاملين المتاح ربط الطلبات بهم', accent: 'green' },
    ],
    [summary]
  );

  const filteredRequests = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          request.employeeName,
          request.leaveTypeName,
          request.summary,
          request.reason,
          request.destination,
          request.details,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      const matchesType = requestTypeFilter === 'all' || request.requestType === requestTypeFilter;
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

      return matchesQuery && matchesType && matchesStatus;
    });
  }, [requests, searchQuery, requestTypeFilter, statusFilter]);

  const requestSorters = useMemo(
    () => ({
      employeeName: createTextSorter<HrRequestItem>((request) => request.employeeName),
      requestType: createTextSorter<HrRequestItem>((request) => REQUEST_LABELS[request.requestType]),
      status: createTextSorter<HrRequestItem>((request) => request.status),
      period: createDateSorter<HrRequestItem>((request) => request.startDate),
      summary: createTextSorter<HrRequestItem>((request) =>
        [request.leaveTypeName, request.summary, request.reason, request.destination, request.details]
          .filter(Boolean)
          .join(' ')
      ),
    }),
    []
  );

  const {
    sortedRows: sortedRequests,
    sortKey,
    sortDirection,
    toggleSort,
  } = useSortableRows({
    rows: filteredRequests,
    sorters: requestSorters,
    initialSortKey: 'period',
    initialDirection: 'desc',
  });
  const requestsPager = usePaginatedRows({ rows: sortedRequests });

  const handleInlineCreateChange = <K extends keyof HrRequestFormValues>(key: K, value: HrRequestFormValues[K]) => {
    setInlineRequest((current) => ({ ...current, [key]: value }));
  };

  const handleInlineEditChange = <K extends keyof HrRequestFormValues>(key: K, value: HrRequestFormValues[K]) => {
    setInlineEditRequest((current) => ({ ...current, [key]: value }));
  };

  const resetInlineCreate = () => {
    setInlineCreateOpen(false);
    setInlineRequest(buildEmptyRequestValues());
  };

  const resetInlineEdit = () => {
    setInlineEditRequestId(null);
    setInlineEditRequest(buildEmptyRequestValues());
  };

  const validateRequest = (values: HrRequestFormValues) => {
    if (!values.employeeProfileId) {
      toastError('بيانات ناقصة', 'اختر العامل أولاً.');
      return false;
    }

    if (values.requestType === 'leave') {
      if (!values.startDate || !values.endDate) {
        toastError('بيانات ناقصة', 'اختر بداية ونهاية الإجازة.');
        return false;
      }
      if (!values.leaveTypeId) {
        toastError('بيانات ناقصة', 'اختر نوع الإجازة.');
        return false;
      }
      return true;
    }

    if (!values.startAt) {
      toastError('بيانات ناقصة', 'اختر بداية المأمورية.');
      return false;
    }

    return true;
  };

  const handleSaveRequest = async (values: HrRequestFormValues) => {
    setSavingRequest(true);

    try {
      await hrService.saveRequest(values);
      toastSuccess(values.id ? 'تم تحديث الطلب' : 'تمت إضافة الطلب', REQUEST_LABELS[values.requestType]);
      resetInlineEdit();
      await loadData('refresh');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ الطلب.';
      toastError('فشل حفظ الطلب', message);
      return false;
    } finally {
      setSavingRequest(false);
    }
  };

  const handleSaveInlineCreate = async () => {
    if (!validateRequest(inlineRequest)) return;

    const saved = await handleSaveRequest(inlineRequest);
    if (saved) {
      resetInlineCreate();
    }
  };

  const handleSaveInlineEdit = async () => {
    if (!validateRequest(inlineEditRequest)) return;
    await handleSaveRequest(inlineEditRequest);
  };

  const handleOpenCreate = () => {
    requestsPager.setPage(1);
    resetInlineEdit();
    setInlineRequest(buildEmptyRequestValues());
    setInlineCreateOpen(true);
  };

  const handleOpenEdit = (request: HrRequestItem) => {
    setInlineCreateOpen(false);
    setInlineEditRequestId(request.id);
    setInlineEditRequest(buildRequestValuesFromItem(request));
  };

  const handleChangeStatus = async (request: HrRequestItem, status: string) => {
    try {
      await hrService.setRequestStatus(request.requestType, request.id, status);
      toastSuccess('تم تحديث حالة الطلب', `${REQUEST_LABELS[request.requestType]} -> ${status}`);
      await loadData('refresh');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تحديث حالة الطلب.';
      toastError('فشل تحديث الحالة', message);
    }
  };

  return (
    <HrPageShell title="طلبات العاملين" description="إدارة الإجازات والمأموريات من نفس الجدول." stats={stats}>
      <HrSectionCard
        title="الطلبات"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData('refresh')}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
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
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
              <label className="relative block">
                <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="بحث بالعامل أو النوع الفرعي أو الملاحظات"
                  className="w-full rounded-md border border-slate-300 bg-white py-2.5 pr-10 pl-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
                />
              </label>
              <select
                value={requestTypeFilter}
                onChange={(event) => setRequestTypeFilter(event.target.value as 'all' | HrRequestItem['requestType'])}
                className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
              >
                <option value="all">كل الأنواع</option>
                <option value="leave">إجازة</option>
                <option value="mission">مأمورية</option>
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
              >
                <option value="all">كل الحالات</option>
                {REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <HrDataGrid
              rowCount={requestsPager.totalRows}
              columnCount={7}
              footer={
                <HrTablePager
                  page={requestsPager.page}
                  pageCount={requestsPager.pageCount}
                  pageSize={requestsPager.pageSize}
                  totalRows={requestsPager.totalRows}
                  fromRow={requestsPager.fromRow}
                  toRow={requestsPager.toRow}
                  onPageChange={requestsPager.setPage}
                  onPageSizeChange={requestsPager.setPageSize}
                />
              }
            >
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><HrSortableHeader label="العامل" sortKey="employeeName" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                    <th><HrSortableHeader label="النوع" sortKey="requestType" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                    <th><HrSortableHeader label="البيانات" sortKey="summary" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                    <th><HrSortableHeader label="الفترة" sortKey="period" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                    <th><HrSortableHeader label="الحالة" sortKey="status" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineCreateOpen ? (
                    <HrInlineRow
                      className="bg-emerald-50/60 dark:bg-emerald-950/20"
                      saving={savingRequest}
                      onSave={() => void handleSaveInlineCreate()}
                      onCancel={resetInlineCreate}
                    >
                      <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                      <td>
                        <HrInlineSelect autoFocus value={inlineRequest.employeeProfileId} onChange={(event) => handleInlineCreateChange('employeeProfileId', event.target.value)}>
                          <option value="">اختر العامل</option>
                          {options.employeeProfiles.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                        </HrInlineSelect>
                      </td>
                      <td>
                        <HrInlineSelect value={inlineRequest.requestType} onChange={(event) => handleInlineCreateChange('requestType', event.target.value as HrRequestItem['requestType'])}>
                          <option value="leave">إجازة</option>
                          <option value="mission">مأمورية</option>
                        </HrInlineSelect>
                      </td>
                      <td className="space-y-2">
                        {inlineRequest.requestType === 'leave' ? (
                          <>
                            <HrInlineSelect value={inlineRequest.leaveTypeId} onChange={(event) => handleInlineCreateChange('leaveTypeId', event.target.value)}>
                              <option value="">نوع الإجازة</option>
                              {options.leaveTypes.map((leaveType) => <option key={leaveType.id} value={leaveType.id}>{leaveType.name}</option>)}
                            </HrInlineSelect>
                            <HrInlineInput value={inlineRequest.reason} onChange={(event) => handleInlineCreateChange('reason', event.target.value)} placeholder="السبب" />
                          </>
                        ) : (
                          <>
                            <HrInlineInput value={inlineRequest.destination} onChange={(event) => handleInlineCreateChange('destination', event.target.value)} placeholder="الوجهة" />
                            <HrInlineInput value={inlineRequest.details} onChange={(event) => handleInlineCreateChange('details', event.target.value)} placeholder="التفاصيل" />
                          </>
                        )}
                      </td>
                      <td className="space-y-2">
                        {inlineRequest.requestType === 'leave' ? (
                          <>
                            <HrInlineInput type="date" value={inlineRequest.startDate} onChange={(event) => handleInlineCreateChange('startDate', event.target.value)} />
                            <HrInlineInput type="date" value={inlineRequest.endDate} onChange={(event) => handleInlineCreateChange('endDate', event.target.value)} />
                          </>
                        ) : (
                          <>
                            <HrInlineInput type="datetime-local" value={inlineRequest.startAt} onChange={(event) => handleInlineCreateChange('startAt', event.target.value)} />
                            <HrInlineInput type="datetime-local" value={inlineRequest.endAt} onChange={(event) => handleInlineCreateChange('endAt', event.target.value)} />
                          </>
                        )}
                      </td>
                      <td>
                        <HrInlineSelect value={inlineRequest.status} onChange={(event) => handleInlineCreateChange('status', event.target.value)}>
                          {REQUEST_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                        </HrInlineSelect>
                      </td>
                      <td><HrInlineActions saving={savingRequest} onSave={() => void handleSaveInlineCreate()} onCancel={resetInlineCreate} /></td>
                    </HrInlineRow>
                  ) : null}
                  {requestsPager.pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        {requests.length === 0 ? 'لا توجد طلبات حالياً.' : 'لا توجد نتائج مطابقة للفلاتر الحالية.'}
                      </td>
                    </tr>
                  ) : (
                    requestsPager.pagedRows.map((request, index) => (
                      inlineEditRequestId === request.id ? (
                        <HrInlineRow
                          key={request.id}
                          className="bg-blue-50/60 dark:bg-blue-950/20"
                          saving={savingRequest}
                          onSave={() => void handleSaveInlineEdit()}
                          onCancel={resetInlineEdit}
                        >
                          <td className="w-10 text-center text-blue-600 dark:text-blue-300">{requestsPager.offset + index + 1}</td>
                          <td>
                            <HrInlineSelect autoFocus value={inlineEditRequest.employeeProfileId} onChange={(event) => handleInlineEditChange('employeeProfileId', event.target.value)}>
                              <option value="">اختر العامل</option>
                              {options.employeeProfiles.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                            </HrInlineSelect>
                          </td>
                          <td><HrInlineSelect value={inlineEditRequest.requestType} disabled><option value="leave">إجازة</option><option value="mission">مأمورية</option></HrInlineSelect></td>
                          <td className="space-y-2">
                            {inlineEditRequest.requestType === 'leave' ? (
                              <>
                                <HrInlineSelect value={inlineEditRequest.leaveTypeId} onChange={(event) => handleInlineEditChange('leaveTypeId', event.target.value)}>
                                  <option value="">نوع الإجازة</option>
                                  {options.leaveTypes.map((leaveType) => <option key={leaveType.id} value={leaveType.id}>{leaveType.name}</option>)}
                                </HrInlineSelect>
                                <HrInlineInput value={inlineEditRequest.reason} onChange={(event) => handleInlineEditChange('reason', event.target.value)} placeholder="السبب" />
                              </>
                            ) : (
                              <>
                                <HrInlineInput value={inlineEditRequest.destination} onChange={(event) => handleInlineEditChange('destination', event.target.value)} placeholder="الوجهة" />
                                <HrInlineInput value={inlineEditRequest.details} onChange={(event) => handleInlineEditChange('details', event.target.value)} placeholder="التفاصيل" />
                              </>
                            )}
                          </td>
                          <td className="space-y-2">
                            {inlineEditRequest.requestType === 'leave' ? (
                              <>
                                <HrInlineInput type="date" value={inlineEditRequest.startDate} onChange={(event) => handleInlineEditChange('startDate', event.target.value)} />
                                <HrInlineInput type="date" value={inlineEditRequest.endDate} onChange={(event) => handleInlineEditChange('endDate', event.target.value)} />
                              </>
                            ) : (
                              <>
                                <HrInlineInput type="datetime-local" value={inlineEditRequest.startAt} onChange={(event) => handleInlineEditChange('startAt', event.target.value)} />
                                <HrInlineInput type="datetime-local" value={inlineEditRequest.endAt} onChange={(event) => handleInlineEditChange('endAt', event.target.value)} />
                              </>
                            )}
                          </td>
                          <td>
                            <HrInlineSelect value={inlineEditRequest.status} onChange={(event) => handleInlineEditChange('status', event.target.value)}>
                              {REQUEST_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                            </HrInlineSelect>
                          </td>
                          <td><HrInlineActions saving={savingRequest} onSave={() => void handleSaveInlineEdit()} onCancel={resetInlineEdit} /></td>
                        </HrInlineRow>
                      ) : (
                        <tr key={request.id} onDoubleClick={() => handleOpenEdit(request)}>
                          <td className="w-10 text-center text-slate-400">{requestsPager.offset + index + 1}</td>
                          <td className="px-3 py-3 font-medium">{request.employeeName}</td>
                          <td className="px-3 py-3">{REQUEST_LABELS[request.requestType]}</td>
                          <td className="px-3 py-3">
                            <div>{request.requestType === 'leave' ? (request.leaveTypeName || 'نوع غير محدد') : (request.destination || 'بدون وجهة')}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {request.requestType === 'leave' ? (request.reason || '—') : (request.details || '—')}
                            </div>
                          </td>
                          <td className="px-3 py-3">{formatRequestPeriod(request)}</td>
                          <td className="px-3 py-3"><HrStatusBadge value={request.status} /></td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button type="button" onClick={() => handleOpenEdit(request)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                                <PencilSquareIcon className="h-3.5 w-3.5" />
                                تعديل
                              </button>
                              {request.status === 'draft' ? <button type="button" onClick={() => void handleChangeStatus(request, 'submitted')} className="rounded-md bg-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300">إرسال</button> : null}
                              {['submitted', 'in_review'].includes(request.status) ? <button type="button" onClick={() => void handleChangeStatus(request, 'approved')} className="rounded-md bg-emerald-100 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300">اعتماد</button> : null}
                              {['draft', 'submitted', 'in_review', 'approved'].includes(request.status) ? <button type="button" onClick={() => void handleChangeStatus(request, 'rejected')} className="rounded-md bg-rose-100 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300">رفض</button> : null}
                              {['approved', 'rejected'].includes(request.status) ? <button type="button" onClick={() => void handleChangeStatus(request, 'closed')} className="rounded-md bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200">إغلاق</button> : null}
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

export default RequestsPage;
