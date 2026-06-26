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
  HrInlineCheckbox,
  HrInlineInput,
  HrInlineRow,
  HrInlineSelect,
} from '../components/HrInlineTableControls';
import HrSortableHeader from '../components/HrSortableHeader';
import HrStatusBadge from '../components/HrStatusBadge';
import HrTablePager from '../components/HrTablePager';
import { HrDataGrid, HrPageShell, HrSectionCard } from '../components/HrPageShell';
import { usePaginatedRows } from '../hooks/usePaginatedRows';
import {
  createBooleanSorter,
  createDateSorter,
  createNumberSorter,
  createTextSorter,
  useSortableRows,
} from '../hooks/useSortableRows';
import hrService from '../services/hrService';
import type {
  HrTransportAssignmentFormValues,
  HrTransportAssignmentItem,
  HrTransportFormOptions,
  HrTransportLineFormValues,
  HrTransportLineItem,
  HrTransportVehicleFormValues,
  HrTransportVehicleItem,
} from '../types';

const EMPTY_OPTIONS: HrTransportFormOptions = {
  employeeProfiles: [],
  lines: [],
  vehicles: [],
};

const getTodayInputValue = () => new Date().toISOString().slice(0, 10);

const buildEmptyTransportLineValues = (): HrTransportLineFormValues => ({
  code: '',
  name: '',
  description: '',
  isActive: true,
});

const buildTransportLineValuesFromItem = (line: HrTransportLineItem): HrTransportLineFormValues => ({
  id: line.id,
  code: line.code || '',
  name: line.name || '',
  description: line.description || '',
  isActive: line.isActive,
});

const buildEmptyTransportVehicleValues = (): HrTransportVehicleFormValues => ({
  lineId: '',
  code: '',
  plateNumber: '',
  capacity: '',
  notes: '',
  isActive: true,
});

const buildTransportVehicleValuesFromItem = (
  vehicle: HrTransportVehicleItem
): HrTransportVehicleFormValues => ({
  id: vehicle.id,
  lineId: vehicle.lineId || '',
  code: vehicle.code || '',
  plateNumber: vehicle.plateNumber || '',
  capacity: vehicle.capacity === null ? '' : String(vehicle.capacity),
  notes: vehicle.notes || '',
  isActive: vehicle.isActive,
});

const buildEmptyTransportAssignmentValues = (): HrTransportAssignmentFormValues => ({
  employeeProfileId: '',
  lineId: '',
  vehicleId: '',
  isDefault: false,
  effectiveFrom: getTodayInputValue(),
  effectiveTo: '',
  notes: '',
});

const buildTransportAssignmentValuesFromItem = (
  assignment: HrTransportAssignmentItem
): HrTransportAssignmentFormValues => ({
  id: assignment.id,
  employeeProfileId: assignment.employeeProfileId || '',
  lineId: assignment.lineId || '',
  vehicleId: assignment.vehicleId || '',
  isDefault: assignment.isDefault,
  effectiveFrom: assignment.effectiveFrom?.slice(0, 10) || getTodayInputValue(),
  effectiveTo: assignment.effectiveTo?.slice(0, 10) || '',
  notes: assignment.notes || '',
});

const TransportPage: React.FC = () => {
  const [lines, setLines] = useState<HrTransportLineItem[]>([]);
  const [vehicles, setVehicles] = useState<HrTransportVehicleItem[]>([]);
  const [assignments, setAssignments] = useState<HrTransportAssignmentItem[]>([]);
  const [options, setOptions] = useState<HrTransportFormOptions>(EMPTY_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [savingLine, setSavingLine] = useState(false);
  const [inlineCreateLineOpen, setInlineCreateLineOpen] = useState(false);
  const [inlineLine, setInlineLine] = useState<HrTransportLineFormValues>(buildEmptyTransportLineValues);
  const [inlineEditLineId, setInlineEditLineId] = useState<string | null>(null);
  const [inlineEditLine, setInlineEditLine] = useState<HrTransportLineFormValues>(buildEmptyTransportLineValues);

  const [savingVehicle, setSavingVehicle] = useState(false);
  const [inlineCreateVehicleOpen, setInlineCreateVehicleOpen] = useState(false);
  const [inlineVehicle, setInlineVehicle] = useState<HrTransportVehicleFormValues>(buildEmptyTransportVehicleValues);
  const [inlineEditVehicleId, setInlineEditVehicleId] = useState<string | null>(null);
  const [inlineEditVehicle, setInlineEditVehicle] = useState<HrTransportVehicleFormValues>(buildEmptyTransportVehicleValues);

  const [savingAssignment, setSavingAssignment] = useState(false);
  const [inlineCreateAssignmentOpen, setInlineCreateAssignmentOpen] = useState(false);
  const [inlineAssignment, setInlineAssignment] = useState<HrTransportAssignmentFormValues>(buildEmptyTransportAssignmentValues);
  const [inlineEditAssignmentId, setInlineEditAssignmentId] = useState<string | null>(null);
  const [inlineEditAssignment, setInlineEditAssignment] = useState<HrTransportAssignmentFormValues>(buildEmptyTransportAssignmentValues);

  const toastSuccess = useToastStore((state) => state.success);
  const toastError = useToastStore((state) => state.error);

  const loadData = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [nextLines, nextVehicles, nextAssignments, nextOptions] = await Promise.all([
        hrService.listTransportLines(200),
        hrService.listTransportVehicles(200),
        hrService.listTransportAssignments(200),
        hrService.getTransportFormOptions(),
      ]);

      setLines(nextLines);
      setVehicles(nextVehicles);
      setAssignments(nextAssignments);
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

  const filteredLines = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return lines;
    }

    return lines.filter((line) =>
      [line.name, line.code, line.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    );
  }, [lines, searchQuery]);

  const lineSorters = useMemo(
    () => ({
      name: createTextSorter<HrTransportLineItem>((line) => line.name),
      code: createTextSorter<HrTransportLineItem>((line) => line.code),
      status: createBooleanSorter<HrTransportLineItem>((line) => line.isActive),
      description: createTextSorter<HrTransportLineItem>((line) => line.description),
    }),
    []
  );

  const vehicleSorters = useMemo(
    () => ({
      lineName: createTextSorter<HrTransportVehicleItem>((vehicle) => vehicle.lineName),
      code: createTextSorter<HrTransportVehicleItem>((vehicle) => vehicle.code),
      plateNumber: createTextSorter<HrTransportVehicleItem>((vehicle) => vehicle.plateNumber),
      capacity: createNumberSorter<HrTransportVehicleItem>((vehicle) => vehicle.capacity),
      status: createBooleanSorter<HrTransportVehicleItem>((vehicle) => vehicle.isActive),
      notes: createTextSorter<HrTransportVehicleItem>((vehicle) => vehicle.notes),
    }),
    []
  );

  const assignmentSorters = useMemo(
    () => ({
      employeeName: createTextSorter<HrTransportAssignmentItem>((assignment) => assignment.employeeName),
      lineName: createTextSorter<HrTransportAssignmentItem>((assignment) => assignment.lineName),
      vehicle: createTextSorter<HrTransportAssignmentItem>((assignment) =>
        [assignment.vehicleCode, assignment.vehiclePlateNumber].filter(Boolean).join(' ')
      ),
      isDefault: createBooleanSorter<HrTransportAssignmentItem>((assignment) => assignment.isDefault),
      effectiveFrom: createDateSorter<HrTransportAssignmentItem>((assignment) => assignment.effectiveFrom),
      effectiveTo: createDateSorter<HrTransportAssignmentItem>((assignment) => assignment.effectiveTo),
      notes: createTextSorter<HrTransportAssignmentItem>((assignment) => assignment.notes),
    }),
    []
  );

  const { sortedRows: sortedLines, sortKey: linesSortKey, sortDirection: linesSortDirection, toggleSort: toggleLinesSort } = useSortableRows({ rows: filteredLines, sorters: lineSorters, initialSortKey: 'name' });
  const { sortedRows: sortedVehicles, sortKey: vehiclesSortKey, sortDirection: vehiclesSortDirection, toggleSort: toggleVehiclesSort } = useSortableRows({ rows: vehicles, sorters: vehicleSorters, initialSortKey: 'lineName' });
  const { sortedRows: sortedAssignments, sortKey: assignmentsSortKey, sortDirection: assignmentsSortDirection, toggleSort: toggleAssignmentsSort } = useSortableRows({ rows: assignments, sorters: assignmentSorters, initialSortKey: 'effectiveFrom', initialDirection: 'desc' });

  const linesPager = usePaginatedRows({ rows: sortedLines });
  const vehiclesPager = usePaginatedRows({ rows: sortedVehicles });
  const assignmentsPager = usePaginatedRows({ rows: sortedAssignments });

  const getLineOptions = useCallback(
    (selectedLineId: string = '') => lines.filter((line) => line.isActive || line.id === selectedLineId),
    [lines]
  );

  const getVehicleOptions = useCallback(
    (lineId: string = '', selectedVehicleId: string = '') =>
      vehicles.filter((vehicle) => {
        const isSelectable = vehicle.isActive || vehicle.id === selectedVehicleId;
        if (!isSelectable) return false;
        if (!lineId) return true;
        return vehicle.lineId === lineId || vehicle.id === selectedVehicleId;
      }),
    [vehicles]
  );

  const syncVehicleIdToLine = useCallback(
    (lineId: string, vehicleId: string) => {
      if (!vehicleId) return '';
      const matchedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
      if (!matchedVehicle) return '';
      if (!lineId) return vehicleId;
      return matchedVehicle.lineId === lineId ? vehicleId : '';
    },
    [vehicles]
  );

  const resetInlineLineCreate = () => {
    setInlineCreateLineOpen(false);
    setInlineLine(buildEmptyTransportLineValues());
  };

  const resetInlineLineEdit = () => {
    setInlineEditLineId(null);
    setInlineEditLine(buildEmptyTransportLineValues());
  };

  const handleSaveLine = async (values: HrTransportLineFormValues) => {
    if (!values.name.trim()) {
      toastError('بيانات ناقصة', 'اكتب اسم خط السير أولاً.');
      return false;
    }

    setSavingLine(true);
    try {
      await hrService.saveTransportLine(values);
      toastSuccess(values.id ? 'تم تحديث خط السير' : 'تمت إضافة خط السير', values.name);
      await loadData('refresh');
      return true;
    } catch (error) {
      toastError('فشل حفظ خط السير', error instanceof Error ? error.message : 'تعذر حفظ خط السير.');
      return false;
    } finally {
      setSavingLine(false);
    }
  };

  const resetInlineVehicleCreate = () => {
    setInlineCreateVehicleOpen(false);
    setInlineVehicle(buildEmptyTransportVehicleValues());
  };

  const resetInlineVehicleEdit = () => {
    setInlineEditVehicleId(null);
    setInlineEditVehicle(buildEmptyTransportVehicleValues());
  };

  const handleSaveVehicle = async (values: HrTransportVehicleFormValues) => {
    if (!values.lineId) {
      toastError('بيانات ناقصة', 'اختر خط السير أولاً.');
      return false;
    }

    if (!values.code.trim() && !values.plateNumber.trim()) {
      toastError('بيانات ناقصة', 'اكتب كود السيارة أو رقم اللوحة.');
      return false;
    }

    setSavingVehicle(true);
    try {
      await hrService.saveTransportVehicle(values);
      toastSuccess(values.id ? 'تم تحديث السيارة' : 'تمت إضافة السيارة', values.code || values.plateNumber);
      await loadData('refresh');
      return true;
    } catch (error) {
      toastError('فشل حفظ السيارة', error instanceof Error ? error.message : 'تعذر حفظ السيارة.');
      return false;
    } finally {
      setSavingVehicle(false);
    }
  };

  const resetInlineAssignmentCreate = () => {
    setInlineCreateAssignmentOpen(false);
    setInlineAssignment(buildEmptyTransportAssignmentValues());
  };

  const resetInlineAssignmentEdit = () => {
    setInlineEditAssignmentId(null);
    setInlineEditAssignment(buildEmptyTransportAssignmentValues());
  };

  const handleSaveAssignment = async (values: HrTransportAssignmentFormValues) => {
    if (!values.employeeProfileId) {
      toastError('بيانات ناقصة', 'اختر العامل أولاً.');
      return false;
    }

    if (!values.lineId && !values.vehicleId) {
      toastError('بيانات ناقصة', 'اختر خط السير أو السيارة.');
      return false;
    }

    if (!values.effectiveFrom) {
      toastError('بيانات ناقصة', 'اكتب تاريخ بداية التسكين.');
      return false;
    }

    const selectedVehicle = values.vehicleId ? vehicles.find((vehicle) => vehicle.id === values.vehicleId) : null;
    if (selectedVehicle && values.lineId && selectedVehicle.lineId && selectedVehicle.lineId !== values.lineId) {
      toastError('بيانات غير متطابقة', 'السيارة المختارة لا تتبع خط السير المحدد.');
      return false;
    }

    setSavingAssignment(true);
    try {
      await hrService.saveTransportAssignment(values);
      toastSuccess(values.id ? 'تم تحديث التسكين' : 'تمت إضافة التسكين', 'تم حفظ بيانات العامل.');
      await loadData('refresh');
      return true;
    } catch (error) {
      toastError('فشل حفظ التسكين', error instanceof Error ? error.message : 'تعذر حفظ التسكين.');
      return false;
    } finally {
      setSavingAssignment(false);
    }
  };

  return (
    <HrPageShell title="النقل وخطوط السير" description="">
      <div className="space-y-4">
        <HrSectionCard
          title="الخطوط"
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
                onClick={() => {
                  linesPager.setPage(1);
                  resetInlineLineEdit();
                  setInlineLine(buildEmptyTransportLineValues());
                  setInlineCreateLineOpen(true);
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
            <div className="space-y-3">
              <label className="relative block">
                <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="بحث في الخطوط"
                  className="w-full rounded-md border border-slate-300 bg-white py-2.5 pr-10 pl-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
                />
              </label>

              <HrDataGrid
                rowCount={linesPager.totalRows}
                columnCount={6}
                footer={
                  <HrTablePager
                    page={linesPager.page}
                    pageCount={linesPager.pageCount}
                    pageSize={linesPager.pageSize}
                    totalRows={linesPager.totalRows}
                    fromRow={linesPager.fromRow}
                    toRow={linesPager.toRow}
                    onPageChange={linesPager.setPage}
                    onPageSizeChange={linesPager.setPageSize}
                  />
                }
              >
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th><HrSortableHeader label="الخط" sortKey="name" activeSortKey={linesSortKey} sortDirection={linesSortDirection} onToggle={toggleLinesSort} /></th>
                      <th><HrSortableHeader label="الكود" sortKey="code" activeSortKey={linesSortKey} sortDirection={linesSortDirection} onToggle={toggleLinesSort} /></th>
                      <th><HrSortableHeader label="الحالة" sortKey="status" activeSortKey={linesSortKey} sortDirection={linesSortDirection} onToggle={toggleLinesSort} /></th>
                      <th><HrSortableHeader label="الوصف" sortKey="description" activeSortKey={linesSortKey} sortDirection={linesSortDirection} onToggle={toggleLinesSort} /></th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inlineCreateLineOpen ? (
                      <HrInlineRow
                        className="bg-emerald-50/60 dark:bg-emerald-950/20"
                        saving={savingLine}
                        onSave={() => void handleSaveLine(inlineLine).then((saved) => { if (saved) resetInlineLineCreate(); })}
                        onCancel={resetInlineLineCreate}
                      >
                        <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                        <td><HrInlineInput autoFocus value={inlineLine.name} onChange={(event) => setInlineLine((current) => ({ ...current, name: event.target.value }))} placeholder="اسم الخط" /></td>
                        <td><HrInlineInput value={inlineLine.code} onChange={(event) => setInlineLine((current) => ({ ...current, code: event.target.value }))} placeholder="الكود" /></td>
                        <td><HrInlineCheckbox checked={inlineLine.isActive} onChange={(event) => setInlineLine((current) => ({ ...current, isActive: event.target.checked }))} label="نشط" /></td>
                        <td><HrInlineInput value={inlineLine.description} onChange={(event) => setInlineLine((current) => ({ ...current, description: event.target.value }))} placeholder="الوصف" /></td>
                        <td><HrInlineActions saving={savingLine} onSave={() => void handleSaveLine(inlineLine).then((saved) => { if (saved) resetInlineLineCreate(); })} onCancel={resetInlineLineCreate} /></td>
                      </HrInlineRow>
                    ) : null}
                    {linesPager.pagedRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                          {lines.length === 0 ? 'لا توجد خطوط مسجلة بعد.' : 'لا توجد نتائج مطابقة.'}
                        </td>
                      </tr>
                    ) : (
                      linesPager.pagedRows.map((line, index) => (
                        inlineEditLineId === line.id ? (
                          <HrInlineRow
                            key={line.id}
                            className="bg-blue-50/60 dark:bg-blue-950/20"
                            saving={savingLine}
                            onSave={() => void handleSaveLine(inlineEditLine).then((saved) => { if (saved) resetInlineLineEdit(); })}
                            onCancel={resetInlineLineEdit}
                          >
                            <td className="w-10 text-center text-blue-600 dark:text-blue-300">{linesPager.offset + index + 1}</td>
                            <td><HrInlineInput autoFocus value={inlineEditLine.name} onChange={(event) => setInlineEditLine((current) => ({ ...current, name: event.target.value }))} placeholder="اسم الخط" /></td>
                            <td><HrInlineInput value={inlineEditLine.code} onChange={(event) => setInlineEditLine((current) => ({ ...current, code: event.target.value }))} placeholder="الكود" /></td>
                            <td><HrInlineCheckbox checked={inlineEditLine.isActive} onChange={(event) => setInlineEditLine((current) => ({ ...current, isActive: event.target.checked }))} label="نشط" /></td>
                            <td><HrInlineInput value={inlineEditLine.description} onChange={(event) => setInlineEditLine((current) => ({ ...current, description: event.target.value }))} placeholder="الوصف" /></td>
                            <td><HrInlineActions saving={savingLine} onSave={() => void handleSaveLine(inlineEditLine).then((saved) => { if (saved) resetInlineLineEdit(); })} onCancel={resetInlineLineEdit} /></td>
                          </HrInlineRow>
                        ) : (
                          <tr key={line.id} onDoubleClick={() => { setInlineCreateLineOpen(false); setInlineEditLineId(line.id); setInlineEditLine(buildTransportLineValuesFromItem(line)); }}>
                            <td className="w-10 text-center text-slate-400">{linesPager.offset + index + 1}</td>
                            <td className="px-3 py-3 font-medium">{line.name}</td>
                            <td className="px-3 py-3">{line.code || '—'}</td>
                            <td className="px-3 py-3"><HrStatusBadge value={line.isActive ? 'active' : 'inactive'} /></td>
                            <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{line.description || '—'}</td>
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setInlineCreateLineOpen(false);
                                  setInlineEditLineId(line.id);
                                  setInlineEditLine(buildTransportLineValuesFromItem(line));
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
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
            </div>
          )}
        </HrSectionCard>

        <HrSectionCard
          title={`السيارات (${vehicles.length})`}
          actions={
            <button
              type="button"
              onClick={() => {
                vehiclesPager.setPage(1);
                resetInlineVehicleEdit();
                setInlineVehicle(buildEmptyTransportVehicleValues());
                setInlineCreateVehicleOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <PlusIcon className="h-4 w-4" />
              إضافة صف
            </button>
          }
        >
          {loading ? (
            <TableSkeleton rows={6} />
          ) : (
            <HrDataGrid
              rowCount={vehiclesPager.totalRows}
              columnCount={8}
              footer={
                <HrTablePager
                  page={vehiclesPager.page}
                  pageCount={vehiclesPager.pageCount}
                  pageSize={vehiclesPager.pageSize}
                  totalRows={vehiclesPager.totalRows}
                  fromRow={vehiclesPager.fromRow}
                  toRow={vehiclesPager.toRow}
                  onPageChange={vehiclesPager.setPage}
                  onPageSizeChange={vehiclesPager.setPageSize}
                />
              }
            >
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><HrSortableHeader label="الخط" sortKey="lineName" activeSortKey={vehiclesSortKey} sortDirection={vehiclesSortDirection} onToggle={toggleVehiclesSort} /></th>
                    <th><HrSortableHeader label="الكود" sortKey="code" activeSortKey={vehiclesSortKey} sortDirection={vehiclesSortDirection} onToggle={toggleVehiclesSort} /></th>
                    <th><HrSortableHeader label="اللوحة" sortKey="plateNumber" activeSortKey={vehiclesSortKey} sortDirection={vehiclesSortDirection} onToggle={toggleVehiclesSort} /></th>
                    <th><HrSortableHeader label="السعة" sortKey="capacity" activeSortKey={vehiclesSortKey} sortDirection={vehiclesSortDirection} onToggle={toggleVehiclesSort} /></th>
                    <th><HrSortableHeader label="الحالة" sortKey="status" activeSortKey={vehiclesSortKey} sortDirection={vehiclesSortDirection} onToggle={toggleVehiclesSort} /></th>
                    <th><HrSortableHeader label="ملاحظات" sortKey="notes" activeSortKey={vehiclesSortKey} sortDirection={vehiclesSortDirection} onToggle={toggleVehiclesSort} /></th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineCreateVehicleOpen ? (
                    <HrInlineRow
                      className="bg-emerald-50/60 dark:bg-emerald-950/20"
                      saving={savingVehicle}
                      onSave={() => void handleSaveVehicle(inlineVehicle).then((saved) => { if (saved) resetInlineVehicleCreate(); })}
                      onCancel={resetInlineVehicleCreate}
                    >
                      <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                      <td>
                        <HrInlineSelect value={inlineVehicle.lineId} onChange={(event) => setInlineVehicle((current) => ({ ...current, lineId: event.target.value }))}>
                          <option value="">اختر الخط</option>
                          {getLineOptions(inlineVehicle.lineId).map((line) => (
                            <option key={line.id} value={line.id}>{line.name}</option>
                          ))}
                        </HrInlineSelect>
                      </td>
                      <td><HrInlineInput autoFocus value={inlineVehicle.code} onChange={(event) => setInlineVehicle((current) => ({ ...current, code: event.target.value }))} placeholder="كود السيارة" /></td>
                      <td><HrInlineInput value={inlineVehicle.plateNumber} onChange={(event) => setInlineVehicle((current) => ({ ...current, plateNumber: event.target.value }))} placeholder="رقم اللوحة" /></td>
                      <td><HrInlineInput type="number" min="1" value={inlineVehicle.capacity} onChange={(event) => setInlineVehicle((current) => ({ ...current, capacity: event.target.value }))} placeholder="السعة" /></td>
                      <td><HrInlineCheckbox checked={inlineVehicle.isActive} onChange={(event) => setInlineVehicle((current) => ({ ...current, isActive: event.target.checked }))} label="نشط" /></td>
                      <td><HrInlineInput value={inlineVehicle.notes} onChange={(event) => setInlineVehicle((current) => ({ ...current, notes: event.target.value }))} placeholder="ملاحظات" /></td>
                      <td><HrInlineActions saving={savingVehicle} onSave={() => void handleSaveVehicle(inlineVehicle).then((saved) => { if (saved) resetInlineVehicleCreate(); })} onCancel={resetInlineVehicleCreate} /></td>
                    </HrInlineRow>
                  ) : null}
                  {vehiclesPager.pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        لا توجد سيارات مسجلة حالياً.
                      </td>
                    </tr>
                  ) : (
                    vehiclesPager.pagedRows.map((vehicle, index) => (
                      inlineEditVehicleId === vehicle.id ? (
                        <HrInlineRow
                          key={vehicle.id}
                          className="bg-blue-50/60 dark:bg-blue-950/20"
                          saving={savingVehicle}
                          onSave={() => void handleSaveVehicle(inlineEditVehicle).then((saved) => { if (saved) resetInlineVehicleEdit(); })}
                          onCancel={resetInlineVehicleEdit}
                        >
                          <td className="w-10 text-center text-blue-600 dark:text-blue-300">{vehiclesPager.offset + index + 1}</td>
                          <td>
                            <HrInlineSelect value={inlineEditVehicle.lineId} onChange={(event) => setInlineEditVehicle((current) => ({ ...current, lineId: event.target.value }))}>
                              <option value="">اختر الخط</option>
                              {getLineOptions(inlineEditVehicle.lineId).map((line) => (
                                <option key={line.id} value={line.id}>{line.name}</option>
                              ))}
                            </HrInlineSelect>
                          </td>
                          <td><HrInlineInput autoFocus value={inlineEditVehicle.code} onChange={(event) => setInlineEditVehicle((current) => ({ ...current, code: event.target.value }))} placeholder="كود السيارة" /></td>
                          <td><HrInlineInput value={inlineEditVehicle.plateNumber} onChange={(event) => setInlineEditVehicle((current) => ({ ...current, plateNumber: event.target.value }))} placeholder="رقم اللوحة" /></td>
                          <td><HrInlineInput type="number" min="1" value={inlineEditVehicle.capacity} onChange={(event) => setInlineEditVehicle((current) => ({ ...current, capacity: event.target.value }))} placeholder="السعة" /></td>
                          <td><HrInlineCheckbox checked={inlineEditVehicle.isActive} onChange={(event) => setInlineEditVehicle((current) => ({ ...current, isActive: event.target.checked }))} label="نشط" /></td>
                          <td><HrInlineInput value={inlineEditVehicle.notes} onChange={(event) => setInlineEditVehicle((current) => ({ ...current, notes: event.target.value }))} placeholder="ملاحظات" /></td>
                          <td><HrInlineActions saving={savingVehicle} onSave={() => void handleSaveVehicle(inlineEditVehicle).then((saved) => { if (saved) resetInlineVehicleEdit(); })} onCancel={resetInlineVehicleEdit} /></td>
                        </HrInlineRow>
                      ) : (
                        <tr key={vehicle.id} onDoubleClick={() => { setInlineCreateVehicleOpen(false); setInlineEditVehicleId(vehicle.id); setInlineEditVehicle(buildTransportVehicleValuesFromItem(vehicle)); }}>
                          <td className="w-10 text-center text-slate-400">{vehiclesPager.offset + index + 1}</td>
                          <td className="px-3 py-3 font-medium">{vehicle.lineName || 'بدون خط'}</td>
                          <td className="px-3 py-3">{vehicle.code || '—'}</td>
                          <td className="px-3 py-3">{vehicle.plateNumber || '—'}</td>
                          <td className="px-3 py-3">{vehicle.capacity ?? '—'}</td>
                          <td className="px-3 py-3"><HrStatusBadge value={vehicle.isActive ? 'active' : 'inactive'} /></td>
                          <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{vehicle.notes || '—'}</td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => {
                                setInlineCreateVehicleOpen(false);
                                setInlineEditVehicleId(vehicle.id);
                                setInlineEditVehicle(buildTransportVehicleValuesFromItem(vehicle));
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
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

        <HrSectionCard
          title={`تسكين العاملين (${assignments.length})`}
          actions={
            <button
              type="button"
              onClick={() => {
                assignmentsPager.setPage(1);
                resetInlineAssignmentEdit();
                setInlineAssignment(buildEmptyTransportAssignmentValues());
                setInlineCreateAssignmentOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <PlusIcon className="h-4 w-4" />
              إضافة صف
            </button>
          }
        >
          {loading ? (
            <TableSkeleton rows={8} />
          ) : (
            <HrDataGrid
              rowCount={assignmentsPager.totalRows}
              columnCount={9}
              footer={
                <HrTablePager
                  page={assignmentsPager.page}
                  pageCount={assignmentsPager.pageCount}
                  pageSize={assignmentsPager.pageSize}
                  totalRows={assignmentsPager.totalRows}
                  fromRow={assignmentsPager.fromRow}
                  toRow={assignmentsPager.toRow}
                  onPageChange={assignmentsPager.setPage}
                  onPageSizeChange={assignmentsPager.setPageSize}
                />
              }
            >
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><HrSortableHeader label="العامل" sortKey="employeeName" activeSortKey={assignmentsSortKey} sortDirection={assignmentsSortDirection} onToggle={toggleAssignmentsSort} /></th>
                    <th><HrSortableHeader label="الخط" sortKey="lineName" activeSortKey={assignmentsSortKey} sortDirection={assignmentsSortDirection} onToggle={toggleAssignmentsSort} /></th>
                    <th><HrSortableHeader label="السيارة" sortKey="vehicle" activeSortKey={assignmentsSortKey} sortDirection={assignmentsSortDirection} onToggle={toggleAssignmentsSort} /></th>
                    <th><HrSortableHeader label="الافتراضي" sortKey="isDefault" activeSortKey={assignmentsSortKey} sortDirection={assignmentsSortDirection} onToggle={toggleAssignmentsSort} /></th>
                    <th><HrSortableHeader label="من" sortKey="effectiveFrom" activeSortKey={assignmentsSortKey} sortDirection={assignmentsSortDirection} onToggle={toggleAssignmentsSort} /></th>
                    <th><HrSortableHeader label="إلى" sortKey="effectiveTo" activeSortKey={assignmentsSortKey} sortDirection={assignmentsSortDirection} onToggle={toggleAssignmentsSort} /></th>
                    <th><HrSortableHeader label="ملاحظات" sortKey="notes" activeSortKey={assignmentsSortKey} sortDirection={assignmentsSortDirection} onToggle={toggleAssignmentsSort} /></th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineCreateAssignmentOpen ? (
                    <HrInlineRow
                      className="bg-emerald-50/60 dark:bg-emerald-950/20"
                      saving={savingAssignment}
                      onSave={() => void handleSaveAssignment(inlineAssignment).then((saved) => { if (saved) resetInlineAssignmentCreate(); })}
                      onCancel={resetInlineAssignmentCreate}
                    >
                      <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                      <td>
                        <HrInlineSelect value={inlineAssignment.employeeProfileId} onChange={(event) => setInlineAssignment((current) => ({ ...current, employeeProfileId: event.target.value }))}>
                          <option value="">اختر العامل</option>
                          {options.employeeProfiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>{profile.name}{profile.baseEmployeeCode ? ` | ${profile.baseEmployeeCode}` : ''}</option>
                          ))}
                        </HrInlineSelect>
                      </td>
                      <td>
                        <HrInlineSelect value={inlineAssignment.lineId} onChange={(event) => setInlineAssignment((current) => ({ ...current, lineId: event.target.value, vehicleId: syncVehicleIdToLine(event.target.value, current.vehicleId) }))}>
                          <option value="">اختر الخط</option>
                          {getLineOptions(inlineAssignment.lineId).map((line) => (
                            <option key={line.id} value={line.id}>{line.name}</option>
                          ))}
                        </HrInlineSelect>
                      </td>
                      <td>
                        <HrInlineSelect value={inlineAssignment.vehicleId} onChange={(event) => setInlineAssignment((current) => ({ ...current, vehicleId: event.target.value }))}>
                          <option value="">بدون سيارة</option>
                          {getVehicleOptions(inlineAssignment.lineId, inlineAssignment.vehicleId).map((vehicle) => (
                            <option key={vehicle.id} value={vehicle.id}>{(vehicle.code || 'بدون كود')} {vehicle.plateNumber ? `| ${vehicle.plateNumber}` : ''}</option>
                          ))}
                        </HrInlineSelect>
                      </td>
                      <td><HrInlineCheckbox checked={inlineAssignment.isDefault} onChange={(event) => setInlineAssignment((current) => ({ ...current, isDefault: event.target.checked }))} label="أساسي" /></td>
                      <td><HrInlineInput type="date" value={inlineAssignment.effectiveFrom} onChange={(event) => setInlineAssignment((current) => ({ ...current, effectiveFrom: event.target.value }))} /></td>
                      <td><HrInlineInput type="date" value={inlineAssignment.effectiveTo} onChange={(event) => setInlineAssignment((current) => ({ ...current, effectiveTo: event.target.value }))} /></td>
                      <td><HrInlineInput value={inlineAssignment.notes} onChange={(event) => setInlineAssignment((current) => ({ ...current, notes: event.target.value }))} placeholder="ملاحظات" /></td>
                      <td><HrInlineActions saving={savingAssignment} onSave={() => void handleSaveAssignment(inlineAssignment).then((saved) => { if (saved) resetInlineAssignmentCreate(); })} onCancel={resetInlineAssignmentCreate} /></td>
                    </HrInlineRow>
                  ) : null}
                  {assignmentsPager.pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        لا توجد علاقات تسكين حالياً.
                      </td>
                    </tr>
                  ) : (
                    assignmentsPager.pagedRows.map((assignment, index) => (
                      inlineEditAssignmentId === assignment.id ? (
                        <HrInlineRow
                          key={assignment.id}
                          className="bg-blue-50/60 dark:bg-blue-950/20"
                          saving={savingAssignment}
                          onSave={() => void handleSaveAssignment(inlineEditAssignment).then((saved) => { if (saved) resetInlineAssignmentEdit(); })}
                          onCancel={resetInlineAssignmentEdit}
                        >
                          <td className="w-10 text-center text-blue-600 dark:text-blue-300">{assignmentsPager.offset + index + 1}</td>
                          <td>
                            <HrInlineSelect value={inlineEditAssignment.employeeProfileId} onChange={(event) => setInlineEditAssignment((current) => ({ ...current, employeeProfileId: event.target.value }))}>
                              <option value="">اختر العامل</option>
                              {options.employeeProfiles.map((profile) => (
                                <option key={profile.id} value={profile.id}>{profile.name}{profile.baseEmployeeCode ? ` | ${profile.baseEmployeeCode}` : ''}</option>
                              ))}
                            </HrInlineSelect>
                          </td>
                          <td>
                            <HrInlineSelect value={inlineEditAssignment.lineId} onChange={(event) => setInlineEditAssignment((current) => ({ ...current, lineId: event.target.value, vehicleId: syncVehicleIdToLine(event.target.value, current.vehicleId) }))}>
                              <option value="">اختر الخط</option>
                              {getLineOptions(inlineEditAssignment.lineId).map((line) => (
                                <option key={line.id} value={line.id}>{line.name}</option>
                              ))}
                            </HrInlineSelect>
                          </td>
                          <td>
                            <HrInlineSelect value={inlineEditAssignment.vehicleId} onChange={(event) => setInlineEditAssignment((current) => ({ ...current, vehicleId: event.target.value }))}>
                              <option value="">بدون سيارة</option>
                              {getVehicleOptions(inlineEditAssignment.lineId, inlineEditAssignment.vehicleId).map((vehicle) => (
                                <option key={vehicle.id} value={vehicle.id}>{(vehicle.code || 'بدون كود')} {vehicle.plateNumber ? `| ${vehicle.plateNumber}` : ''}</option>
                              ))}
                            </HrInlineSelect>
                          </td>
                          <td><HrInlineCheckbox checked={inlineEditAssignment.isDefault} onChange={(event) => setInlineEditAssignment((current) => ({ ...current, isDefault: event.target.checked }))} label="أساسي" /></td>
                          <td><HrInlineInput type="date" value={inlineEditAssignment.effectiveFrom} onChange={(event) => setInlineEditAssignment((current) => ({ ...current, effectiveFrom: event.target.value }))} /></td>
                          <td><HrInlineInput type="date" value={inlineEditAssignment.effectiveTo} onChange={(event) => setInlineEditAssignment((current) => ({ ...current, effectiveTo: event.target.value }))} /></td>
                          <td><HrInlineInput value={inlineEditAssignment.notes} onChange={(event) => setInlineEditAssignment((current) => ({ ...current, notes: event.target.value }))} placeholder="ملاحظات" /></td>
                          <td><HrInlineActions saving={savingAssignment} onSave={() => void handleSaveAssignment(inlineEditAssignment).then((saved) => { if (saved) resetInlineAssignmentEdit(); })} onCancel={resetInlineAssignmentEdit} /></td>
                        </HrInlineRow>
                      ) : (
                        <tr key={assignment.id} onDoubleClick={() => { setInlineCreateAssignmentOpen(false); setInlineEditAssignmentId(assignment.id); setInlineEditAssignment(buildTransportAssignmentValuesFromItem(assignment)); }}>
                          <td className="w-10 text-center text-slate-400">{assignmentsPager.offset + index + 1}</td>
                          <td className="px-3 py-3 font-medium">{assignment.employeeName}</td>
                          <td className="px-3 py-3">{assignment.lineName || 'غير مسند'}</td>
                          <td className="px-3 py-3">
                            <div>{assignment.vehicleCode || 'بدون كود سيارة'}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{assignment.vehiclePlateNumber || 'بدون لوحة'}</div>
                          </td>
                          <td className="px-3 py-3"><HrStatusBadge value={assignment.isDefault ? 'active' : 'draft'} fallback="غير أساسي" /></td>
                          <td className="px-3 py-3">{assignment.effectiveFrom ? formatDate(assignment.effectiveFrom) : '—'}</td>
                          <td className="px-3 py-3">{assignment.effectiveTo ? formatDate(assignment.effectiveTo) : '—'}</td>
                          <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{assignment.notes || '—'}</td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => {
                                setInlineCreateAssignmentOpen(false);
                                setInlineEditAssignmentId(assignment.id);
                                setInlineEditAssignment(buildTransportAssignmentValuesFromItem(assignment));
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
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

export default TransportPage;
