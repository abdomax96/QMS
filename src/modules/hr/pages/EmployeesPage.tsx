import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { TableSkeleton } from '../../../components/common/LoadingStates';
import { useToastStore } from '../../../store/toastStore';
import {
  HrInlineActions,
  HrInlineCheckbox,
  HrInlineInput,
  HrInlineRow,
  HrInlineSelect,
} from '../components/HrInlineTableControls';
import HrSortableHeader from '../components/HrSortableHeader';
import HrTablePager from '../components/HrTablePager';
import { HrDataGrid, HrPageShell, HrSectionCard, type HrPageStat } from '../components/HrPageShell';
import { usePaginatedRows } from '../hooks/usePaginatedRows';
import {
  createBooleanSorter,
  createTextSorter,
  useSortableRows,
} from '../hooks/useSortableRows';
import HrStatusBadge from '../components/HrStatusBadge';
import hrService from '../services/hrService';
import type {
  HrDashboardSummary,
  HrEmployeeFormOptions,
  HrEmployeeFormValues,
  HrEmployeeListItem,
  HrEmploymentStatus,
  HrWorkerType,
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

const EMPTY_OPTIONS: HrEmployeeFormOptions = {
  departments: [],
  worksites: [],
};

const getDefaultWorksiteId = (options: HrEmployeeFormOptions) =>
  options.worksites.find((worksite) => worksite.isDefault)?.id || '';

const buildEmptyEmployeeValues = (): HrEmployeeFormValues => ({
  baseEmployeeCode: '',
  name: '',
  email: '',
  workerType: 'regular',
  internalEmployeeCode: '',
  originalEmployeeCode: '',
  departmentId: '',
  worksiteId: '',
  jobTitleText: '',
  employmentStatus: 'active',
  notes: '',
  isActive: true,
  profileId: null,
});

const buildEmployeeValuesFromItem = (
  employee: HrEmployeeListItem,
  options: HrEmployeeFormOptions
): HrEmployeeFormValues => ({
  id: employee.id,
  profileId: employee.profileId,
  baseEmployeeCode: employee.baseEmployeeCode || '',
  name: employee.name || '',
  email: employee.email || '',
  workerType: employee.workerType || 'regular',
  internalEmployeeCode: employee.baseEmployeeCode || '',
  originalEmployeeCode: employee.baseEmployeeCode || '',
  departmentId: employee.departmentId || '',
  worksiteId: employee.worksiteId || getDefaultWorksiteId(options),
  jobTitleText: employee.jobTitleText || '',
  employmentStatus: employee.employmentStatus || 'active',
  notes: employee.notes || '',
  isActive: employee.isActive,
});

const EmployeesPage: React.FC = () => {
  const [summary, setSummary] = useState<HrDashboardSummary>(EMPTY_SUMMARY);
  const [employees, setEmployees] = useState<HrEmployeeListItem[]>([]);
  const [options, setOptions] = useState<HrEmployeeFormOptions>(EMPTY_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [inlineCreateOpen, setInlineCreateOpen] = useState(false);
  const [inlineEmployee, setInlineEmployee] = useState<HrEmployeeFormValues>(buildEmptyEmployeeValues);
  const [inlineEditEmployeeId, setInlineEditEmployeeId] = useState<string | null>(null);
  const [inlineEditEmployee, setInlineEditEmployee] = useState<HrEmployeeFormValues>(buildEmptyEmployeeValues);
  const [searchQuery, setSearchQuery] = useState('');
  const [workerTypeFilter, setWorkerTypeFilter] = useState<'all' | HrWorkerType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | HrEmploymentStatus>('all');
  const [worksiteFilter, setWorksiteFilter] = useState<'all' | string>('all');
  const toastSuccess = useToastStore((state) => state.success);
  const toastError = useToastStore((state) => state.error);

  const loadData = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [nextSummary, nextEmployees, nextOptions] = await Promise.all([
        hrService.getDashboardSummary(),
        hrService.listEmployees(200),
        hrService.getEmployeeFormOptions(),
      ]);

      setSummary(nextSummary);
      setEmployees(nextEmployees);
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
      { label: 'العاملون', value: summary.employeesCount, helper: 'من company_employees + hr_employee_profiles', accent: 'blue' },
      { label: 'يومية', value: summary.dailyWorkersCount, helper: 'عمال يومية داخل الدليل', accent: 'amber' },
      { label: 'طلبات مفتوحة', value: summary.openRequestsCount, helper: 'تفيد في توقع أثر الأرصدة والمرتبات', accent: 'indigo' },
      { label: 'فترات مرتبات', value: summary.payrollPeriodsCount, helper: 'فترات لم تُغلق بعد', accent: 'green' },
    ],
    [summary]
  );

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          employee.name,
          employee.email,
          employee.baseEmployeeCode,
          employee.departmentName,
          employee.worksiteName,
          employee.jobTitleText,
          employee.notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      const matchesWorkerType = workerTypeFilter === 'all' || employee.workerType === workerTypeFilter;
      const matchesStatus = statusFilter === 'all' || employee.employmentStatus === statusFilter;
      const matchesWorksite = worksiteFilter === 'all' || employee.worksiteId === worksiteFilter;

      return matchesQuery && matchesWorkerType && matchesStatus && matchesWorksite;
    });
  }, [employees, searchQuery, workerTypeFilter, statusFilter, worksiteFilter]);

  const employeeSorters = useMemo(
    () => ({
      name: createTextSorter<HrEmployeeListItem>((employee) => employee.name),
      codes: createTextSorter<HrEmployeeListItem>((employee) => employee.baseEmployeeCode),
      workerType: createTextSorter<HrEmployeeListItem>((employee) => employee.workerType),
      assignment: createTextSorter<HrEmployeeListItem>((employee) =>
        [
          employee.departmentName,
          employee.worksiteName,
          employee.jobTitleText,
        ]
          .filter(Boolean)
          .join(' ')
      ),
      status: createTextSorter<HrEmployeeListItem>((employee) =>
        `${employee.employmentStatus} ${employee.isActive ? 'active' : 'inactive'}`
      ),
      hasAccount: createBooleanSorter<HrEmployeeListItem>((employee) => employee.hasAccount),
    }),
    []
  );

  const {
    sortedRows: sortedEmployees,
    sortKey,
    sortDirection,
    toggleSort,
  } = useSortableRows({
    rows: filteredEmployees,
    sorters: employeeSorters,
    initialSortKey: 'name',
  });

  const {
    page: employeesPage,
    setPage: setEmployeesPage,
    pageCount: employeesPageCount,
    pageSize: employeesPageSize,
    setPageSize: setEmployeesPageSize,
    pagedRows: pagedEmployees,
    totalRows: employeesTotalRows,
    fromRow: employeesFromRow,
    toRow: employeesToRow,
    offset: employeesOffset,
  } = usePaginatedRows({
    rows: sortedEmployees,
  });

  const handleOpenCreate = () => {
    setEmployeesPage(1);
    setInlineEmployee(buildEmptyEmployeeValues());
    setInlineEditEmployeeId(null);
    setInlineCreateOpen(true);
  };

  const handleOpenEdit = (employee: HrEmployeeListItem) => {
    setInlineCreateOpen(false);
    setInlineEditEmployeeId(employee.id);
    setInlineEditEmployee(buildEmployeeValuesFromItem(employee, options));
  };

  const handleInlineChange = <K extends keyof HrEmployeeFormValues>(
    key: K,
    value: HrEmployeeFormValues[K]
  ) => {
    setInlineEmployee((current) => {
      if (key === 'baseEmployeeCode') {
        const nextCode = String(value);
        return {
          ...current,
          baseEmployeeCode: nextCode,
          internalEmployeeCode: nextCode,
          originalEmployeeCode: nextCode,
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
  };

  const handleCancelInlineCreate = () => {
    if (savingEmployee) return;
    setInlineCreateOpen(false);
    setInlineEmployee(buildEmptyEmployeeValues());
  };

  const handleInlineEditChange = <K extends keyof HrEmployeeFormValues>(
    key: K,
    value: HrEmployeeFormValues[K]
  ) => {
    setInlineEditEmployee((current) => {
      if (key === 'baseEmployeeCode') {
        const nextCode = String(value);
        return {
          ...current,
          baseEmployeeCode: nextCode,
          internalEmployeeCode: nextCode,
          originalEmployeeCode: nextCode,
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
  };

  const handleCancelInlineEdit = () => {
    if (savingEmployee) return;
    setInlineEditEmployeeId(null);
    setInlineEditEmployee(buildEmptyEmployeeValues());
  };

  const handleSaveEmployee = async (values: HrEmployeeFormValues) => {
    setSavingEmployee(true);

    try {
      await hrService.saveEmployee(values);
      toastSuccess(
        values.id ? 'تم تحديث بيانات العامل' : 'تمت إضافة العامل',
        values.id ? values.name : `${values.name} أضيف إلى دليل العاملين`
      );
      setInlineEditEmployeeId(null);
      setInlineEditEmployee(buildEmptyEmployeeValues());
      await loadData('refresh');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ بيانات العامل.';
      toastError('فشل حفظ بيانات العامل', message);
      return false;
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleSaveInlineEmployee = async () => {
    if (!inlineEmployee.baseEmployeeCode.trim() || !inlineEmployee.name.trim()) {
      toastError('بيانات ناقصة', 'اكتب التكويد واسم العامل أولاً.');
      return;
    }

    const saved = await handleSaveEmployee(inlineEmployee);
    if (saved) {
      setInlineCreateOpen(false);
      setInlineEmployee(buildEmptyEmployeeValues());
    }
  };

  const handleSaveInlineEditEmployee = async () => {
    if (!inlineEditEmployee.baseEmployeeCode.trim() || !inlineEditEmployee.name.trim()) {
      toastError('بيانات ناقصة', 'اكتب التكويد واسم العامل أولاً.');
      return;
    }

    await handleSaveEmployee(inlineEditEmployee);
  };

  const handleToggleActiveState = async (employee: HrEmployeeListItem) => {
    const nextIsActive = !employee.isActive;
    const confirmed = window.confirm(
      nextIsActive
        ? `هل تريد إعادة تفعيل العامل "${employee.name}"؟`
        : `هل تريد إيقاف العامل "${employee.name}"؟`
    );

    if (!confirmed) return;

    try {
      await hrService.setEmployeeActiveState(employee.id, nextIsActive);
      toastSuccess(
        nextIsActive ? 'تم تفعيل العامل' : 'تم إيقاف العامل',
        employee.name
      );
      await loadData('refresh');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تحديث حالة العامل.';
      toastError('فشل تحديث حالة العامل', message);
    }
  };

  return (
    <HrPageShell
      title="دليل العاملين"
      description=""
      stats={stats}
    >
      <HrSectionCard
        title="السجل الحالي"
        description=""
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
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_220px]">
              <label className="relative block">
                <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="بحث بالاسم أو الكود أو القسم أو الملاحظات"
                  className="w-full rounded-md border border-slate-300 bg-white py-2.5 pr-10 pl-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
                />
              </label>

              <select
                value={workerTypeFilter}
                onChange={(event) => setWorkerTypeFilter(event.target.value as 'all' | HrWorkerType)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
              >
                <option value="all">كل الأنواع</option>
                <option value="regular">دائم</option>
                <option value="daily">يومية</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | HrEmploymentStatus)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
                <option value="suspended">موقوف</option>
                <option value="archived">مؤرشف</option>
              </select>

              <select
                value={worksiteFilter}
                onChange={(event) => setWorksiteFilter(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
              >
                <option value="all">كل المواقع</option>
                {options.worksites.map((worksite) => (
                  <option key={worksite.id} value={worksite.id}>
                    {worksite.name}
                  </option>
                ))}
              </select>
            </div>

            <HrDataGrid
              rowCount={employeesTotalRows}
              columnCount={8}
              footer={
                <HrTablePager
                  page={employeesPage}
                  pageCount={employeesPageCount}
                  pageSize={employeesPageSize}
                  totalRows={employeesTotalRows}
                  fromRow={employeesFromRow}
                  toRow={employeesToRow}
                  onPageChange={setEmployeesPage}
                  onPageSizeChange={setEmployeesPageSize}
                />
              }
            >
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th><HrSortableHeader label="العامل" sortKey="name" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                      <th><HrSortableHeader label="التكويد" sortKey="codes" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                      <th><HrSortableHeader label="النوع" sortKey="workerType" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                      <th><HrSortableHeader label="القسم/الموقع" sortKey="assignment" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                      <th><HrSortableHeader label="الحالة" sortKey="status" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                      <th><HrSortableHeader label="حساب التطبيق" sortKey="hasAccount" activeSortKey={sortKey} sortDirection={sortDirection} onToggle={toggleSort} /></th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inlineCreateOpen ? (
                      <HrInlineRow
                        className="bg-emerald-50/60 dark:bg-emerald-950/20"
                        saving={savingEmployee}
                        onSave={() => void handleSaveInlineEmployee()}
                        onCancel={handleCancelInlineCreate}
                      >
                        <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                        <td className="space-y-2">
                          <HrInlineInput
                            autoFocus
                            value={inlineEmployee.name}
                            onChange={(event) => handleInlineChange('name', event.target.value)}
                            placeholder="اسم العامل"
                          />
                          <HrInlineInput
                            type="email"
                            value={inlineEmployee.email}
                            onChange={(event) => handleInlineChange('email', event.target.value)}
                            placeholder="البريد الإلكتروني"
                          />
                        </td>
                        <td className="space-y-2">
                          <HrInlineInput
                            value={inlineEmployee.baseEmployeeCode}
                            onChange={(event) => handleInlineChange('baseEmployeeCode', event.target.value)}
                            placeholder="التكويد"
                          />
                        </td>
                        <td>
                          <HrInlineSelect
                            value={inlineEmployee.workerType}
                            onChange={(event) => handleInlineChange('workerType', event.target.value as HrWorkerType)}
                          >
                            <option value="regular">دائم</option>
                            <option value="daily">يومية</option>
                          </HrInlineSelect>
                        </td>
                        <td className="space-y-2">
                          <HrInlineSelect
                            value={inlineEmployee.departmentId}
                            onChange={(event) => handleInlineChange('departmentId', event.target.value)}
                          >
                            <option value="">بدون قسم</option>
                            {options.departments.map((department) => (
                              <option key={department.id} value={department.id}>
                                {department.name}
                              </option>
                            ))}
                          </HrInlineSelect>
                          <HrInlineSelect
                            value={inlineEmployee.worksiteId}
                            onChange={(event) => handleInlineChange('worksiteId', event.target.value)}
                          >
                            <option value="">بدون موقع</option>
                            {options.worksites.map((worksite) => (
                              <option key={worksite.id} value={worksite.id}>
                                {worksite.name}
                              </option>
                            ))}
                          </HrInlineSelect>
                          <HrInlineInput
                            value={inlineEmployee.jobTitleText}
                            onChange={(event) => handleInlineChange('jobTitleText', event.target.value)}
                            placeholder="المسمى الوظيفي"
                          />
                        </td>
                        <td className="space-y-2">
                          <HrInlineSelect
                            value={inlineEmployee.employmentStatus}
                            onChange={(event) => handleInlineChange('employmentStatus', event.target.value as HrEmploymentStatus)}
                          >
                            <option value="active">نشط</option>
                            <option value="inactive">غير نشط</option>
                            <option value="suspended">موقوف</option>
                            <option value="archived">مؤرشف</option>
                          </HrInlineSelect>
                          <HrInlineCheckbox
                            checked={inlineEmployee.isActive}
                            onChange={(event) => handleInlineChange('isActive', event.target.checked)}
                            label="نشط في الدليل"
                          />
                        </td>
                        <td className="space-y-2">
                          <div className="text-xs text-slate-500 dark:text-slate-400">حسب الحاجة</div>
                          <HrInlineInput
                            value={inlineEmployee.notes}
                            onChange={(event) => handleInlineChange('notes', event.target.value)}
                            placeholder="ملاحظات"
                          />
                        </td>
                        <td>
                          <HrInlineActions
                            saving={savingEmployee}
                            onSave={() => void handleSaveInlineEmployee()}
                            onCancel={handleCancelInlineCreate}
                          />
                        </td>
                      </HrInlineRow>
                    ) : null}

                    {pagedEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                          {employees.length === 0
                            ? 'لا توجد سجلات حالياً. أضف صفاً جديداً للبدء.'
                            : 'لا توجد نتائج مطابقة للفلاتر الحالية.'}
                        </td>
                      </tr>
                    ) : (
                      pagedEmployees.map((employee, index) => (
                      inlineEditEmployeeId === employee.id ? (
                      <HrInlineRow
                        key={employee.id}
                        className="bg-blue-50/60 dark:bg-blue-950/20"
                        saving={savingEmployee}
                        onSave={() => void handleSaveInlineEditEmployee()}
                        onCancel={handleCancelInlineEdit}
                      >
                        <td className="w-10 text-center text-blue-600 dark:text-blue-300">{employeesOffset + index + 1}</td>
                        <td className="space-y-2">
                          <HrInlineInput
                            autoFocus
                            value={inlineEditEmployee.name}
                            onChange={(event) => handleInlineEditChange('name', event.target.value)}
                            placeholder="اسم العامل"
                          />
                          <HrInlineInput
                            type="email"
                            value={inlineEditEmployee.email}
                            onChange={(event) => handleInlineEditChange('email', event.target.value)}
                            placeholder="البريد الإلكتروني"
                          />
                        </td>
                        <td className="space-y-2">
                          <HrInlineInput
                            value={inlineEditEmployee.baseEmployeeCode}
                            onChange={(event) => handleInlineEditChange('baseEmployeeCode', event.target.value)}
                            placeholder="التكويد"
                          />
                        </td>
                        <td>
                          <HrInlineSelect
                            value={inlineEditEmployee.workerType}
                            onChange={(event) => handleInlineEditChange('workerType', event.target.value as HrWorkerType)}
                          >
                            <option value="regular">دائم</option>
                            <option value="daily">يومية</option>
                          </HrInlineSelect>
                        </td>
                        <td className="space-y-2">
                          <HrInlineSelect
                            value={inlineEditEmployee.departmentId}
                            onChange={(event) => handleInlineEditChange('departmentId', event.target.value)}
                          >
                            <option value="">بدون قسم</option>
                            {options.departments.map((department) => (
                              <option key={department.id} value={department.id}>
                                {department.name}
                              </option>
                            ))}
                          </HrInlineSelect>
                          <HrInlineSelect
                            value={inlineEditEmployee.worksiteId}
                            onChange={(event) => handleInlineEditChange('worksiteId', event.target.value)}
                          >
                            <option value="">بدون موقع</option>
                            {options.worksites.map((worksite) => (
                              <option key={worksite.id} value={worksite.id}>
                                {worksite.name}
                              </option>
                            ))}
                          </HrInlineSelect>
                          <HrInlineInput
                            value={inlineEditEmployee.jobTitleText}
                            onChange={(event) => handleInlineEditChange('jobTitleText', event.target.value)}
                            placeholder="المسمى الوظيفي"
                          />
                        </td>
                        <td className="space-y-2">
                          <HrInlineSelect
                            value={inlineEditEmployee.employmentStatus}
                            onChange={(event) => handleInlineEditChange('employmentStatus', event.target.value as HrEmploymentStatus)}
                          >
                            <option value="active">نشط</option>
                            <option value="inactive">غير نشط</option>
                            <option value="suspended">موقوف</option>
                            <option value="archived">مؤرشف</option>
                          </HrInlineSelect>
                          <HrInlineCheckbox
                            checked={inlineEditEmployee.isActive}
                            onChange={(event) => handleInlineEditChange('isActive', event.target.checked)}
                            label="نشط في الدليل"
                          />
                        </td>
                        <td className="space-y-2">
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {employee.hasAccount ? 'مرتبط بحساب' : 'بدون حساب'}
                          </div>
                          <HrInlineInput
                            value={inlineEditEmployee.notes}
                            onChange={(event) => handleInlineEditChange('notes', event.target.value)}
                            placeholder="ملاحظات"
                          />
                        </td>
                        <td>
                          <HrInlineActions
                            saving={savingEmployee}
                            onSave={() => void handleSaveInlineEditEmployee()}
                            onCancel={handleCancelInlineEdit}
                          />
                        </td>
                      </HrInlineRow>
                      ) : (
                      <tr key={employee.id} onDoubleClick={() => handleOpenEdit(employee)}>
                        <td className="w-10 text-center text-slate-400">{employeesOffset + index + 1}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{employee.email || 'بدون بريد إلكتروني'}</div>
                          {employee.notes ? (
                            <div className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                              {employee.notes}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-mono text-xs">{employee.baseEmployeeCode}</div>
                        </td>
                        <td className="px-3 py-3">
                          <HrStatusBadge value={employee.workerType} />
                        </td>
                        <td className="px-3 py-3">
                          <div>{employee.departmentName || 'بدون قسم'}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {employee.worksiteName || employee.jobTitleText || 'بدون موقع/وظيفة'}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-2">
                            <HrStatusBadge value={employee.employmentStatus} />
                            <span className={`text-xs ${employee.isActive ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
                              {employee.isActive ? 'نشط في الدليل المركزي' : 'موقوف في الدليل المركزي'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {employee.hasAccount ? (
                            <span className="text-emerald-600 dark:text-emerald-300">مرتبط بحساب</span>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">بدون حساب</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(employee)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <PencilSquareIcon className="h-3.5 w-3.5" />
                              تعديل
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleToggleActiveState(employee)}
                              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                                employee.isActive
                                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
                              }`}
                            >
                              {employee.isActive ? 'إيقاف' : 'تفعيل'}
                            </button>
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

export default EmployeesPage;
