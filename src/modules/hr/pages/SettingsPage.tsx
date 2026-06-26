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
  HrInlineCheckbox,
  HrInlineInput,
  HrInlineRow,
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
  HrLeaveTypeFormValues,
  HrLeaveTypeItem,
  HrPenaltyTypeFormValues,
  HrPenaltyTypeItem,
  HrPolicyDefinitionFormValues,
  HrPolicyDefinitionItem,
  HrWorkflowDefinitionItem,
  HrWorksiteFormValues,
  HrWorksiteItem,
} from '../types';

const buildEmptyWorksiteValues = (): HrWorksiteFormValues => ({
  code: '',
  name: '',
  description: '',
  isActive: true,
  isDefault: false,
});

const buildWorksiteValuesFromItem = (item: HrWorksiteItem): HrWorksiteFormValues => ({
  id: item.id,
  code: item.code || '',
  name: item.name,
  description: item.description || '',
  isActive: item.isActive,
  isDefault: item.isDefault,
});

const buildEmptyLeaveTypeValues = (): HrLeaveTypeFormValues => ({
  code: '',
  name: '',
  isPaid: true,
  annualAllowance: '0',
  isActive: true,
});

const buildLeaveTypeValuesFromItem = (item: HrLeaveTypeItem): HrLeaveTypeFormValues => ({
  id: item.id,
  code: item.code || '',
  name: item.name,
  isPaid: item.isPaid,
  annualAllowance: String(item.annualAllowance),
  isActive: item.isActive,
});

const buildEmptyPenaltyTypeValues = (): HrPenaltyTypeFormValues => ({
  code: '',
  name: '',
  isDeductionBased: true,
  defaultAmount: '0',
  isActive: true,
});

const buildPenaltyTypeValuesFromItem = (item: HrPenaltyTypeItem): HrPenaltyTypeFormValues => ({
  id: item.id,
  code: item.code || '',
  name: item.name,
  isDeductionBased: item.isDeductionBased,
  defaultAmount: String(item.defaultAmount),
  isActive: item.isActive,
});

const buildEmptyPolicyValues = (): HrPolicyDefinitionFormValues => ({
  code: '',
  name: '',
  policyType: '',
  effectiveFrom: '',
  effectiveTo: '',
  isActive: true,
});

const buildPolicyValuesFromItem = (item: HrPolicyDefinitionItem): HrPolicyDefinitionFormValues => ({
  id: item.id,
  code: item.code,
  name: item.name,
  policyType: item.policyType,
  effectiveFrom: item.effectiveFrom?.slice(0, 10) || '',
  effectiveTo: item.effectiveTo?.slice(0, 10) || '',
  isActive: item.isActive,
});

const SettingsPage: React.FC = () => {
  const [worksites, setWorksites] = useState<HrWorksiteItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<HrLeaveTypeItem[]>([]);
  const [penaltyTypes, setPenaltyTypes] = useState<HrPenaltyTypeItem[]>([]);
  const [policies, setPolicies] = useState<HrPolicyDefinitionItem[]>([]);
  const [workflows, setWorkflows] = useState<HrWorkflowDefinitionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [savingWorksite, setSavingWorksite] = useState(false);
  const [inlineCreateWorksiteOpen, setInlineCreateWorksiteOpen] = useState(false);
  const [inlineWorksite, setInlineWorksite] = useState<HrWorksiteFormValues>(buildEmptyWorksiteValues);
  const [inlineEditWorksiteId, setInlineEditWorksiteId] = useState<string | null>(null);
  const [inlineEditWorksite, setInlineEditWorksite] = useState<HrWorksiteFormValues>(buildEmptyWorksiteValues);

  const [savingLeaveType, setSavingLeaveType] = useState(false);
  const [inlineCreateLeaveTypeOpen, setInlineCreateLeaveTypeOpen] = useState(false);
  const [inlineLeaveType, setInlineLeaveType] = useState<HrLeaveTypeFormValues>(buildEmptyLeaveTypeValues);
  const [inlineEditLeaveTypeId, setInlineEditLeaveTypeId] = useState<string | null>(null);
  const [inlineEditLeaveType, setInlineEditLeaveType] = useState<HrLeaveTypeFormValues>(buildEmptyLeaveTypeValues);

  const [savingPenaltyType, setSavingPenaltyType] = useState(false);
  const [inlineCreatePenaltyTypeOpen, setInlineCreatePenaltyTypeOpen] = useState(false);
  const [inlinePenaltyType, setInlinePenaltyType] = useState<HrPenaltyTypeFormValues>(buildEmptyPenaltyTypeValues);
  const [inlineEditPenaltyTypeId, setInlineEditPenaltyTypeId] = useState<string | null>(null);
  const [inlineEditPenaltyType, setInlineEditPenaltyType] = useState<HrPenaltyTypeFormValues>(buildEmptyPenaltyTypeValues);

  const [savingPolicy, setSavingPolicy] = useState(false);
  const [inlineCreatePolicyOpen, setInlineCreatePolicyOpen] = useState(false);
  const [inlinePolicy, setInlinePolicy] = useState<HrPolicyDefinitionFormValues>(buildEmptyPolicyValues);
  const [inlineEditPolicyId, setInlineEditPolicyId] = useState<string | null>(null);
  const [inlineEditPolicy, setInlineEditPolicy] = useState<HrPolicyDefinitionFormValues>(buildEmptyPolicyValues);

  const toastSuccess = useToastStore((state) => state.success);
  const toastError = useToastStore((state) => state.error);

  const loadData = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [nextWorksites, nextLeaveTypes, nextPenaltyTypes, nextPolicies, nextWorkflows] = await Promise.all([
        hrService.listWorksites(50),
        hrService.listLeaveTypes(50),
        hrService.listPenaltyTypes(50),
        hrService.listPolicies(50),
        hrService.listWorkflowDefinitions(50),
      ]);

      setWorksites(nextWorksites);
      setLeaveTypes(nextLeaveTypes);
      setPenaltyTypes(nextPenaltyTypes);
      setPolicies(nextPolicies);
      setWorkflows(nextWorkflows);
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

  const worksiteSorters = useMemo(
    () => ({
      name: createTextSorter<HrWorksiteItem>((item) => item.name),
      code: createTextSorter<HrWorksiteItem>((item) => item.code),
      isDefault: createBooleanSorter<HrWorksiteItem>((item) => item.isDefault),
      isActive: createBooleanSorter<HrWorksiteItem>((item) => item.isActive),
      description: createTextSorter<HrWorksiteItem>((item) => item.description),
    }),
    []
  );
  const leaveTypeSorters = useMemo(
    () => ({
      name: createTextSorter<HrLeaveTypeItem>((item) => item.name),
      code: createTextSorter<HrLeaveTypeItem>((item) => item.code),
      isPaid: createBooleanSorter<HrLeaveTypeItem>((item) => item.isPaid),
      annualAllowance: createNumberSorter<HrLeaveTypeItem>((item) => item.annualAllowance),
      isActive: createBooleanSorter<HrLeaveTypeItem>((item) => item.isActive),
    }),
    []
  );
  const penaltyTypeSorters = useMemo(
    () => ({
      name: createTextSorter<HrPenaltyTypeItem>((item) => item.name),
      code: createTextSorter<HrPenaltyTypeItem>((item) => item.code),
      isDeductionBased: createBooleanSorter<HrPenaltyTypeItem>((item) => item.isDeductionBased),
      defaultAmount: createNumberSorter<HrPenaltyTypeItem>((item) => item.defaultAmount),
      isActive: createBooleanSorter<HrPenaltyTypeItem>((item) => item.isActive),
    }),
    []
  );
  const policySorters = useMemo(
    () => ({
      name: createTextSorter<HrPolicyDefinitionItem>((item) => item.name),
      code: createTextSorter<HrPolicyDefinitionItem>((item) => item.code),
      policyType: createTextSorter<HrPolicyDefinitionItem>((item) => item.policyType),
      effectiveFrom: createDateSorter<HrPolicyDefinitionItem>((item) => item.effectiveFrom),
      effectiveTo: createDateSorter<HrPolicyDefinitionItem>((item) => item.effectiveTo),
      isActive: createBooleanSorter<HrPolicyDefinitionItem>((item) => item.isActive),
    }),
    []
  );
  const workflowSorters = useMemo(
    () => ({
      name: createTextSorter<HrWorkflowDefinitionItem>((item) => item.name),
      code: createTextSorter<HrWorkflowDefinitionItem>((item) => item.code),
      entityType: createTextSorter<HrWorkflowDefinitionItem>((item) => item.entityType),
      isActive: createBooleanSorter<HrWorkflowDefinitionItem>((item) => item.isActive),
    }),
    []
  );

  const { sortedRows: sortedWorksites, sortKey: worksitesSortKey, sortDirection: worksitesSortDirection, toggleSort: toggleWorksitesSort } = useSortableRows({ rows: worksites, sorters: worksiteSorters, initialSortKey: 'name' });
  const { sortedRows: sortedLeaveTypes, sortKey: leaveTypesSortKey, sortDirection: leaveTypesSortDirection, toggleSort: toggleLeaveTypesSort } = useSortableRows({ rows: leaveTypes, sorters: leaveTypeSorters, initialSortKey: 'name' });
  const { sortedRows: sortedPenaltyTypes, sortKey: penaltyTypesSortKey, sortDirection: penaltyTypesSortDirection, toggleSort: togglePenaltyTypesSort } = useSortableRows({ rows: penaltyTypes, sorters: penaltyTypeSorters, initialSortKey: 'name' });
  const { sortedRows: sortedPolicies, sortKey: policiesSortKey, sortDirection: policiesSortDirection, toggleSort: togglePoliciesSort } = useSortableRows({ rows: policies, sorters: policySorters, initialSortKey: 'effectiveFrom', initialDirection: 'desc' });
  const { sortedRows: sortedWorkflows, sortKey: workflowsSortKey, sortDirection: workflowsSortDirection, toggleSort: toggleWorkflowsSort } = useSortableRows({ rows: workflows, sorters: workflowSorters, initialSortKey: 'name' });

  const worksitesPager = usePaginatedRows({ rows: sortedWorksites });
  const leaveTypesPager = usePaginatedRows({ rows: sortedLeaveTypes });
  const penaltyTypesPager = usePaginatedRows({ rows: sortedPenaltyTypes });
  const policiesPager = usePaginatedRows({ rows: sortedPolicies });
  const workflowsPager = usePaginatedRows({ rows: sortedWorkflows });

  const handleSaveWorksite = async (values: HrWorksiteFormValues) => {
    if (!values.name.trim()) {
      toastError('بيانات ناقصة', 'اكتب اسم الموقع أولاً.');
      return false;
    }

    setSavingWorksite(true);
    try {
      await hrService.saveWorksite(values);
      toastSuccess(values.id ? 'تم تحديث الموقع' : 'تمت إضافة الموقع', values.name);
      await loadData('refresh');
      return true;
    } catch (error) {
      toastError('فشل حفظ الموقع', error instanceof Error ? error.message : 'تعذر حفظ الموقع.');
      return false;
    } finally {
      setSavingWorksite(false);
    }
  };

  const handleSaveLeaveType = async (values: HrLeaveTypeFormValues) => {
    if (!values.code.trim() || !values.name.trim()) {
      toastError('بيانات ناقصة', 'اكتب الكود واسم نوع الإجازة.');
      return false;
    }

    setSavingLeaveType(true);
    try {
      await hrService.saveLeaveType(values);
      toastSuccess(values.id ? 'تم تحديث نوع الإجازة' : 'تمت إضافة نوع الإجازة', values.name);
      await loadData('refresh');
      return true;
    } catch (error) {
      toastError('فشل حفظ نوع الإجازة', error instanceof Error ? error.message : 'تعذر حفظ نوع الإجازة.');
      return false;
    } finally {
      setSavingLeaveType(false);
    }
  };

  const handleSavePenaltyType = async (values: HrPenaltyTypeFormValues) => {
    if (!values.code.trim() || !values.name.trim()) {
      toastError('بيانات ناقصة', 'اكتب الكود واسم نوع الجزاء.');
      return false;
    }

    setSavingPenaltyType(true);
    try {
      await hrService.savePenaltyType(values);
      toastSuccess(values.id ? 'تم تحديث نوع الجزاء' : 'تمت إضافة نوع الجزاء', values.name);
      await loadData('refresh');
      return true;
    } catch (error) {
      toastError('فشل حفظ نوع الجزاء', error instanceof Error ? error.message : 'تعذر حفظ نوع الجزاء.');
      return false;
    } finally {
      setSavingPenaltyType(false);
    }
  };

  const handleSavePolicy = async (values: HrPolicyDefinitionFormValues) => {
    if (!values.code.trim() || !values.name.trim() || !values.policyType.trim() || !values.effectiveFrom) {
      toastError('بيانات ناقصة', 'اكتب الكود والاسم والنوع وتاريخ السريان.');
      return false;
    }

    setSavingPolicy(true);
    try {
      await hrService.savePolicyDefinition(values);
      toastSuccess(values.id ? 'تم تحديث السياسة' : 'تمت إضافة السياسة', values.name);
      await loadData('refresh');
      return true;
    } catch (error) {
      toastError('فشل حفظ السياسة', error instanceof Error ? error.message : 'تعذر حفظ السياسة.');
      return false;
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <HrPageShell title="إعدادات الموارد البشرية" description="">
      <div className="space-y-4">
        <HrSectionCard
          title="مواقع العمل"
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
                  worksitesPager.setPage(1);
                  setInlineCreateWorksiteOpen(true);
                  setInlineEditWorksiteId(null);
                  setInlineWorksite(buildEmptyWorksiteValues());
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
            <TableSkeleton rows={5} />
          ) : (
            <HrDataGrid rowCount={worksitesPager.totalRows} columnCount={7} footer={<HrTablePager page={worksitesPager.page} pageCount={worksitesPager.pageCount} pageSize={worksitesPager.pageSize} totalRows={worksitesPager.totalRows} fromRow={worksitesPager.fromRow} toRow={worksitesPager.toRow} onPageChange={worksitesPager.setPage} onPageSizeChange={worksitesPager.setPageSize} />}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><HrSortableHeader label="الموقع" sortKey="name" activeSortKey={worksitesSortKey} sortDirection={worksitesSortDirection} onToggle={toggleWorksitesSort} /></th>
                    <th><HrSortableHeader label="الكود" sortKey="code" activeSortKey={worksitesSortKey} sortDirection={worksitesSortDirection} onToggle={toggleWorksitesSort} /></th>
                    <th><HrSortableHeader label="افتراضي" sortKey="isDefault" activeSortKey={worksitesSortKey} sortDirection={worksitesSortDirection} onToggle={toggleWorksitesSort} /></th>
                    <th><HrSortableHeader label="الحالة" sortKey="isActive" activeSortKey={worksitesSortKey} sortDirection={worksitesSortDirection} onToggle={toggleWorksitesSort} /></th>
                    <th><HrSortableHeader label="الوصف" sortKey="description" activeSortKey={worksitesSortKey} sortDirection={worksitesSortDirection} onToggle={toggleWorksitesSort} /></th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineCreateWorksiteOpen ? (
                    <HrInlineRow className="bg-emerald-50/60 dark:bg-emerald-950/20" saving={savingWorksite} onSave={() => void handleSaveWorksite(inlineWorksite).then((saved) => { if (saved) setInlineCreateWorksiteOpen(false); })} onCancel={() => { setInlineCreateWorksiteOpen(false); setInlineWorksite(buildEmptyWorksiteValues()); }}>
                      <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                      <td><HrInlineInput autoFocus value={inlineWorksite.name} onChange={(event) => setInlineWorksite((current) => ({ ...current, name: event.target.value }))} placeholder="اسم الموقع" /></td>
                      <td><HrInlineInput value={inlineWorksite.code} onChange={(event) => setInlineWorksite((current) => ({ ...current, code: event.target.value }))} placeholder="الكود" /></td>
                      <td><HrInlineCheckbox checked={inlineWorksite.isDefault} onChange={(event) => setInlineWorksite((current) => ({ ...current, isDefault: event.target.checked }))} label="افتراضي" /></td>
                      <td><HrInlineCheckbox checked={inlineWorksite.isActive} onChange={(event) => setInlineWorksite((current) => ({ ...current, isActive: event.target.checked }))} label="نشط" /></td>
                      <td><HrInlineInput value={inlineWorksite.description} onChange={(event) => setInlineWorksite((current) => ({ ...current, description: event.target.value }))} placeholder="الوصف" /></td>
                      <td><HrInlineActions saving={savingWorksite} onSave={() => void handleSaveWorksite(inlineWorksite).then((saved) => { if (saved) setInlineCreateWorksiteOpen(false); })} onCancel={() => { setInlineCreateWorksiteOpen(false); setInlineWorksite(buildEmptyWorksiteValues()); }} /></td>
                    </HrInlineRow>
                  ) : null}
                  {worksitesPager.pagedRows.map((item, index) => (
                    inlineEditWorksiteId === item.id ? (
                      <HrInlineRow key={item.id} className="bg-blue-50/60 dark:bg-blue-950/20" saving={savingWorksite} onSave={() => void handleSaveWorksite(inlineEditWorksite).then((saved) => { if (saved) { setInlineEditWorksiteId(null); setInlineEditWorksite(buildEmptyWorksiteValues()); } })} onCancel={() => { setInlineEditWorksiteId(null); setInlineEditWorksite(buildEmptyWorksiteValues()); }}>
                        <td className="w-10 text-center text-blue-600 dark:text-blue-300">{worksitesPager.offset + index + 1}</td>
                        <td><HrInlineInput autoFocus value={inlineEditWorksite.name} onChange={(event) => setInlineEditWorksite((current) => ({ ...current, name: event.target.value }))} placeholder="اسم الموقع" /></td>
                        <td><HrInlineInput value={inlineEditWorksite.code} onChange={(event) => setInlineEditWorksite((current) => ({ ...current, code: event.target.value }))} placeholder="الكود" /></td>
                        <td><HrInlineCheckbox checked={inlineEditWorksite.isDefault} onChange={(event) => setInlineEditWorksite((current) => ({ ...current, isDefault: event.target.checked }))} label="افتراضي" /></td>
                        <td><HrInlineCheckbox checked={inlineEditWorksite.isActive} onChange={(event) => setInlineEditWorksite((current) => ({ ...current, isActive: event.target.checked }))} label="نشط" /></td>
                        <td><HrInlineInput value={inlineEditWorksite.description} onChange={(event) => setInlineEditWorksite((current) => ({ ...current, description: event.target.value }))} placeholder="الوصف" /></td>
                        <td><HrInlineActions saving={savingWorksite} onSave={() => void handleSaveWorksite(inlineEditWorksite).then((saved) => { if (saved) { setInlineEditWorksiteId(null); setInlineEditWorksite(buildEmptyWorksiteValues()); } })} onCancel={() => { setInlineEditWorksiteId(null); setInlineEditWorksite(buildEmptyWorksiteValues()); }} /></td>
                      </HrInlineRow>
                    ) : (
                      <tr key={item.id} onDoubleClick={() => { setInlineCreateWorksiteOpen(false); setInlineEditWorksiteId(item.id); setInlineEditWorksite(buildWorksiteValuesFromItem(item)); }}>
                        <td className="w-10 text-center text-slate-400">{worksitesPager.offset + index + 1}</td>
                        <td className="px-3 py-3 font-medium">{item.name}</td>
                        <td className="px-3 py-3">{item.code || '—'}</td>
                        <td className="px-3 py-3">{item.isDefault ? 'نعم' : 'لا'}</td>
                        <td className="px-3 py-3"><HrStatusBadge value={item.isActive ? 'active' : 'inactive'} /></td>
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{item.description || '—'}</td>
                        <td className="px-3 py-3"><button type="button" onClick={() => { setInlineCreateWorksiteOpen(false); setInlineEditWorksiteId(item.id); setInlineEditWorksite(buildWorksiteValuesFromItem(item)); }} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><PencilSquareIcon className="h-3.5 w-3.5" />تعديل</button></td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </HrDataGrid>
          )}
        </HrSectionCard>

        <HrSectionCard
          title="أنواع الإجازات"
          actions={
            <button
              type="button"
              onClick={() => {
                leaveTypesPager.setPage(1);
                setInlineCreateLeaveTypeOpen(true);
                setInlineEditLeaveTypeId(null);
                setInlineLeaveType(buildEmptyLeaveTypeValues());
              }}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <PlusIcon className="h-4 w-4" />
              إضافة صف
            </button>
          }
        >
          {loading ? (
            <TableSkeleton rows={5} />
          ) : (
            <HrDataGrid rowCount={leaveTypesPager.totalRows} columnCount={7} footer={<HrTablePager page={leaveTypesPager.page} pageCount={leaveTypesPager.pageCount} pageSize={leaveTypesPager.pageSize} totalRows={leaveTypesPager.totalRows} fromRow={leaveTypesPager.fromRow} toRow={leaveTypesPager.toRow} onPageChange={leaveTypesPager.setPage} onPageSizeChange={leaveTypesPager.setPageSize} />}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><HrSortableHeader label="النوع" sortKey="name" activeSortKey={leaveTypesSortKey} sortDirection={leaveTypesSortDirection} onToggle={toggleLeaveTypesSort} /></th>
                    <th><HrSortableHeader label="الكود" sortKey="code" activeSortKey={leaveTypesSortKey} sortDirection={leaveTypesSortDirection} onToggle={toggleLeaveTypesSort} /></th>
                    <th><HrSortableHeader label="مدفوعة" sortKey="isPaid" activeSortKey={leaveTypesSortKey} sortDirection={leaveTypesSortDirection} onToggle={toggleLeaveTypesSort} /></th>
                    <th><HrSortableHeader label="الرصيد" sortKey="annualAllowance" activeSortKey={leaveTypesSortKey} sortDirection={leaveTypesSortDirection} onToggle={toggleLeaveTypesSort} /></th>
                    <th><HrSortableHeader label="الحالة" sortKey="isActive" activeSortKey={leaveTypesSortKey} sortDirection={leaveTypesSortDirection} onToggle={toggleLeaveTypesSort} /></th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineCreateLeaveTypeOpen ? (
                    <HrInlineRow className="bg-emerald-50/60 dark:bg-emerald-950/20" saving={savingLeaveType} onSave={() => void handleSaveLeaveType(inlineLeaveType).then((saved) => { if (saved) setInlineCreateLeaveTypeOpen(false); })} onCancel={() => { setInlineCreateLeaveTypeOpen(false); setInlineLeaveType(buildEmptyLeaveTypeValues()); }}>
                      <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                      <td><HrInlineInput autoFocus value={inlineLeaveType.name} onChange={(event) => setInlineLeaveType((current) => ({ ...current, name: event.target.value }))} placeholder="اسم النوع" /></td>
                      <td><HrInlineInput value={inlineLeaveType.code} onChange={(event) => setInlineLeaveType((current) => ({ ...current, code: event.target.value }))} placeholder="الكود" /></td>
                      <td><HrInlineCheckbox checked={inlineLeaveType.isPaid} onChange={(event) => setInlineLeaveType((current) => ({ ...current, isPaid: event.target.checked }))} label="مدفوعة" /></td>
                      <td><HrInlineInput type="number" min="0" step="0.5" value={inlineLeaveType.annualAllowance} onChange={(event) => setInlineLeaveType((current) => ({ ...current, annualAllowance: event.target.value }))} placeholder="الرصيد" /></td>
                      <td><HrInlineCheckbox checked={inlineLeaveType.isActive} onChange={(event) => setInlineLeaveType((current) => ({ ...current, isActive: event.target.checked }))} label="نشط" /></td>
                      <td><HrInlineActions saving={savingLeaveType} onSave={() => void handleSaveLeaveType(inlineLeaveType).then((saved) => { if (saved) setInlineCreateLeaveTypeOpen(false); })} onCancel={() => { setInlineCreateLeaveTypeOpen(false); setInlineLeaveType(buildEmptyLeaveTypeValues()); }} /></td>
                    </HrInlineRow>
                  ) : null}
                  {leaveTypesPager.pagedRows.map((item, index) => (
                    inlineEditLeaveTypeId === item.id ? (
                      <HrInlineRow key={item.id} className="bg-blue-50/60 dark:bg-blue-950/20" saving={savingLeaveType} onSave={() => void handleSaveLeaveType(inlineEditLeaveType).then((saved) => { if (saved) { setInlineEditLeaveTypeId(null); setInlineEditLeaveType(buildEmptyLeaveTypeValues()); } })} onCancel={() => { setInlineEditLeaveTypeId(null); setInlineEditLeaveType(buildEmptyLeaveTypeValues()); }}>
                        <td className="w-10 text-center text-blue-600 dark:text-blue-300">{leaveTypesPager.offset + index + 1}</td>
                        <td><HrInlineInput autoFocus value={inlineEditLeaveType.name} onChange={(event) => setInlineEditLeaveType((current) => ({ ...current, name: event.target.value }))} placeholder="اسم النوع" /></td>
                        <td><HrInlineInput value={inlineEditLeaveType.code} onChange={(event) => setInlineEditLeaveType((current) => ({ ...current, code: event.target.value }))} placeholder="الكود" /></td>
                        <td><HrInlineCheckbox checked={inlineEditLeaveType.isPaid} onChange={(event) => setInlineEditLeaveType((current) => ({ ...current, isPaid: event.target.checked }))} label="مدفوعة" /></td>
                        <td><HrInlineInput type="number" min="0" step="0.5" value={inlineEditLeaveType.annualAllowance} onChange={(event) => setInlineEditLeaveType((current) => ({ ...current, annualAllowance: event.target.value }))} placeholder="الرصيد" /></td>
                        <td><HrInlineCheckbox checked={inlineEditLeaveType.isActive} onChange={(event) => setInlineEditLeaveType((current) => ({ ...current, isActive: event.target.checked }))} label="نشط" /></td>
                        <td><HrInlineActions saving={savingLeaveType} onSave={() => void handleSaveLeaveType(inlineEditLeaveType).then((saved) => { if (saved) { setInlineEditLeaveTypeId(null); setInlineEditLeaveType(buildEmptyLeaveTypeValues()); } })} onCancel={() => { setInlineEditLeaveTypeId(null); setInlineEditLeaveType(buildEmptyLeaveTypeValues()); }} /></td>
                      </HrInlineRow>
                    ) : (
                      <tr key={item.id} onDoubleClick={() => { setInlineCreateLeaveTypeOpen(false); setInlineEditLeaveTypeId(item.id); setInlineEditLeaveType(buildLeaveTypeValuesFromItem(item)); }}>
                        <td className="w-10 text-center text-slate-400">{leaveTypesPager.offset + index + 1}</td>
                        <td className="px-3 py-3 font-medium">{item.name}</td>
                        <td className="px-3 py-3">{item.code || '—'}</td>
                        <td className="px-3 py-3">{item.isPaid ? 'نعم' : 'لا'}</td>
                        <td className="px-3 py-3">{item.annualAllowance}</td>
                        <td className="px-3 py-3"><HrStatusBadge value={item.isActive ? 'active' : 'inactive'} /></td>
                        <td className="px-3 py-3"><button type="button" onClick={() => { setInlineCreateLeaveTypeOpen(false); setInlineEditLeaveTypeId(item.id); setInlineEditLeaveType(buildLeaveTypeValuesFromItem(item)); }} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><PencilSquareIcon className="h-3.5 w-3.5" />تعديل</button></td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </HrDataGrid>
          )}
        </HrSectionCard>
        <HrSectionCard
          title="أنواع الجزاءات"
          actions={
            <button
              type="button"
              onClick={() => {
                penaltyTypesPager.setPage(1);
                setInlineCreatePenaltyTypeOpen(true);
                setInlineEditPenaltyTypeId(null);
                setInlinePenaltyType(buildEmptyPenaltyTypeValues());
              }}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <PlusIcon className="h-4 w-4" />
              إضافة صف
            </button>
          }
        >
          {loading ? (
            <TableSkeleton rows={5} />
          ) : (
            <HrDataGrid rowCount={penaltyTypesPager.totalRows} columnCount={7} footer={<HrTablePager page={penaltyTypesPager.page} pageCount={penaltyTypesPager.pageCount} pageSize={penaltyTypesPager.pageSize} totalRows={penaltyTypesPager.totalRows} fromRow={penaltyTypesPager.fromRow} toRow={penaltyTypesPager.toRow} onPageChange={penaltyTypesPager.setPage} onPageSizeChange={penaltyTypesPager.setPageSize} />}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><HrSortableHeader label="النوع" sortKey="name" activeSortKey={penaltyTypesSortKey} sortDirection={penaltyTypesSortDirection} onToggle={togglePenaltyTypesSort} /></th>
                    <th><HrSortableHeader label="الكود" sortKey="code" activeSortKey={penaltyTypesSortKey} sortDirection={penaltyTypesSortDirection} onToggle={togglePenaltyTypesSort} /></th>
                    <th><HrSortableHeader label="خصم مالي" sortKey="isDeductionBased" activeSortKey={penaltyTypesSortKey} sortDirection={penaltyTypesSortDirection} onToggle={togglePenaltyTypesSort} /></th>
                    <th><HrSortableHeader label="القيمة" sortKey="defaultAmount" activeSortKey={penaltyTypesSortKey} sortDirection={penaltyTypesSortDirection} onToggle={togglePenaltyTypesSort} /></th>
                    <th><HrSortableHeader label="الحالة" sortKey="isActive" activeSortKey={penaltyTypesSortKey} sortDirection={penaltyTypesSortDirection} onToggle={togglePenaltyTypesSort} /></th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineCreatePenaltyTypeOpen ? (
                    <HrInlineRow className="bg-emerald-50/60 dark:bg-emerald-950/20" saving={savingPenaltyType} onSave={() => void handleSavePenaltyType(inlinePenaltyType).then((saved) => { if (saved) setInlineCreatePenaltyTypeOpen(false); })} onCancel={() => { setInlineCreatePenaltyTypeOpen(false); setInlinePenaltyType(buildEmptyPenaltyTypeValues()); }}>
                      <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                      <td><HrInlineInput autoFocus value={inlinePenaltyType.name} onChange={(event) => setInlinePenaltyType((current) => ({ ...current, name: event.target.value }))} placeholder="اسم النوع" /></td>
                      <td><HrInlineInput value={inlinePenaltyType.code} onChange={(event) => setInlinePenaltyType((current) => ({ ...current, code: event.target.value }))} placeholder="الكود" /></td>
                      <td><HrInlineCheckbox checked={inlinePenaltyType.isDeductionBased} onChange={(event) => setInlinePenaltyType((current) => ({ ...current, isDeductionBased: event.target.checked }))} label="خصم" /></td>
                      <td><HrInlineInput type="number" min="0" step="0.01" value={inlinePenaltyType.defaultAmount} onChange={(event) => setInlinePenaltyType((current) => ({ ...current, defaultAmount: event.target.value }))} placeholder="القيمة" /></td>
                      <td><HrInlineCheckbox checked={inlinePenaltyType.isActive} onChange={(event) => setInlinePenaltyType((current) => ({ ...current, isActive: event.target.checked }))} label="نشط" /></td>
                      <td><HrInlineActions saving={savingPenaltyType} onSave={() => void handleSavePenaltyType(inlinePenaltyType).then((saved) => { if (saved) setInlineCreatePenaltyTypeOpen(false); })} onCancel={() => { setInlineCreatePenaltyTypeOpen(false); setInlinePenaltyType(buildEmptyPenaltyTypeValues()); }} /></td>
                    </HrInlineRow>
                  ) : null}
                  {penaltyTypesPager.pagedRows.map((item, index) => (
                    inlineEditPenaltyTypeId === item.id ? (
                      <HrInlineRow key={item.id} className="bg-blue-50/60 dark:bg-blue-950/20" saving={savingPenaltyType} onSave={() => void handleSavePenaltyType(inlineEditPenaltyType).then((saved) => { if (saved) { setInlineEditPenaltyTypeId(null); setInlineEditPenaltyType(buildEmptyPenaltyTypeValues()); } })} onCancel={() => { setInlineEditPenaltyTypeId(null); setInlineEditPenaltyType(buildEmptyPenaltyTypeValues()); }}>
                        <td className="w-10 text-center text-blue-600 dark:text-blue-300">{penaltyTypesPager.offset + index + 1}</td>
                        <td><HrInlineInput autoFocus value={inlineEditPenaltyType.name} onChange={(event) => setInlineEditPenaltyType((current) => ({ ...current, name: event.target.value }))} placeholder="اسم النوع" /></td>
                        <td><HrInlineInput value={inlineEditPenaltyType.code} onChange={(event) => setInlineEditPenaltyType((current) => ({ ...current, code: event.target.value }))} placeholder="الكود" /></td>
                        <td><HrInlineCheckbox checked={inlineEditPenaltyType.isDeductionBased} onChange={(event) => setInlineEditPenaltyType((current) => ({ ...current, isDeductionBased: event.target.checked }))} label="خصم" /></td>
                        <td><HrInlineInput type="number" min="0" step="0.01" value={inlineEditPenaltyType.defaultAmount} onChange={(event) => setInlineEditPenaltyType((current) => ({ ...current, defaultAmount: event.target.value }))} placeholder="القيمة" /></td>
                        <td><HrInlineCheckbox checked={inlineEditPenaltyType.isActive} onChange={(event) => setInlineEditPenaltyType((current) => ({ ...current, isActive: event.target.checked }))} label="نشط" /></td>
                        <td><HrInlineActions saving={savingPenaltyType} onSave={() => void handleSavePenaltyType(inlineEditPenaltyType).then((saved) => { if (saved) { setInlineEditPenaltyTypeId(null); setInlineEditPenaltyType(buildEmptyPenaltyTypeValues()); } })} onCancel={() => { setInlineEditPenaltyTypeId(null); setInlineEditPenaltyType(buildEmptyPenaltyTypeValues()); }} /></td>
                      </HrInlineRow>
                    ) : (
                      <tr key={item.id} onDoubleClick={() => { setInlineCreatePenaltyTypeOpen(false); setInlineEditPenaltyTypeId(item.id); setInlineEditPenaltyType(buildPenaltyTypeValuesFromItem(item)); }}>
                        <td className="w-10 text-center text-slate-400">{penaltyTypesPager.offset + index + 1}</td>
                        <td className="px-3 py-3 font-medium">{item.name}</td>
                        <td className="px-3 py-3">{item.code || '—'}</td>
                        <td className="px-3 py-3">{item.isDeductionBased ? 'نعم' : 'لا'}</td>
                        <td className="px-3 py-3">{item.defaultAmount.toFixed(2)}</td>
                        <td className="px-3 py-3"><HrStatusBadge value={item.isActive ? 'active' : 'inactive'} /></td>
                        <td className="px-3 py-3"><button type="button" onClick={() => { setInlineCreatePenaltyTypeOpen(false); setInlineEditPenaltyTypeId(item.id); setInlineEditPenaltyType(buildPenaltyTypeValuesFromItem(item)); }} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><PencilSquareIcon className="h-3.5 w-3.5" />تعديل</button></td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </HrDataGrid>
          )}
        </HrSectionCard>

        <HrSectionCard
          title="السياسات"
          actions={
            <button
              type="button"
              onClick={() => {
                policiesPager.setPage(1);
                setInlineCreatePolicyOpen(true);
                setInlineEditPolicyId(null);
                setInlinePolicy(buildEmptyPolicyValues());
              }}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <PlusIcon className="h-4 w-4" />
              إضافة صف
            </button>
          }
        >
          {loading ? (
            <TableSkeleton rows={5} />
          ) : (
            <HrDataGrid rowCount={policiesPager.totalRows} columnCount={8} footer={<HrTablePager page={policiesPager.page} pageCount={policiesPager.pageCount} pageSize={policiesPager.pageSize} totalRows={policiesPager.totalRows} fromRow={policiesPager.fromRow} toRow={policiesPager.toRow} onPageChange={policiesPager.setPage} onPageSizeChange={policiesPager.setPageSize} />}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><HrSortableHeader label="السياسة" sortKey="name" activeSortKey={policiesSortKey} sortDirection={policiesSortDirection} onToggle={togglePoliciesSort} /></th>
                    <th><HrSortableHeader label="الكود" sortKey="code" activeSortKey={policiesSortKey} sortDirection={policiesSortDirection} onToggle={togglePoliciesSort} /></th>
                    <th><HrSortableHeader label="النوع" sortKey="policyType" activeSortKey={policiesSortKey} sortDirection={policiesSortDirection} onToggle={togglePoliciesSort} /></th>
                    <th><HrSortableHeader label="من" sortKey="effectiveFrom" activeSortKey={policiesSortKey} sortDirection={policiesSortDirection} onToggle={togglePoliciesSort} /></th>
                    <th><HrSortableHeader label="إلى" sortKey="effectiveTo" activeSortKey={policiesSortKey} sortDirection={policiesSortDirection} onToggle={togglePoliciesSort} /></th>
                    <th><HrSortableHeader label="الحالة" sortKey="isActive" activeSortKey={policiesSortKey} sortDirection={policiesSortDirection} onToggle={togglePoliciesSort} /></th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineCreatePolicyOpen ? (
                    <HrInlineRow className="bg-emerald-50/60 dark:bg-emerald-950/20" saving={savingPolicy} onSave={() => void handleSavePolicy(inlinePolicy).then((saved) => { if (saved) setInlineCreatePolicyOpen(false); })} onCancel={() => { setInlineCreatePolicyOpen(false); setInlinePolicy(buildEmptyPolicyValues()); }}>
                      <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                      <td><HrInlineInput autoFocus value={inlinePolicy.name} onChange={(event) => setInlinePolicy((current) => ({ ...current, name: event.target.value }))} placeholder="اسم السياسة" /></td>
                      <td><HrInlineInput value={inlinePolicy.code} onChange={(event) => setInlinePolicy((current) => ({ ...current, code: event.target.value }))} placeholder="الكود" /></td>
                      <td><HrInlineInput value={inlinePolicy.policyType} onChange={(event) => setInlinePolicy((current) => ({ ...current, policyType: event.target.value }))} placeholder="نوع السياسة" /></td>
                      <td><HrInlineInput type="date" value={inlinePolicy.effectiveFrom} onChange={(event) => setInlinePolicy((current) => ({ ...current, effectiveFrom: event.target.value }))} /></td>
                      <td><HrInlineInput type="date" value={inlinePolicy.effectiveTo} onChange={(event) => setInlinePolicy((current) => ({ ...current, effectiveTo: event.target.value }))} /></td>
                      <td><HrInlineCheckbox checked={inlinePolicy.isActive} onChange={(event) => setInlinePolicy((current) => ({ ...current, isActive: event.target.checked }))} label="نشط" /></td>
                      <td><HrInlineActions saving={savingPolicy} onSave={() => void handleSavePolicy(inlinePolicy).then((saved) => { if (saved) setInlineCreatePolicyOpen(false); })} onCancel={() => { setInlineCreatePolicyOpen(false); setInlinePolicy(buildEmptyPolicyValues()); }} /></td>
                    </HrInlineRow>
                  ) : null}
                  {policiesPager.pagedRows.map((item, index) => (
                    inlineEditPolicyId === item.id ? (
                      <HrInlineRow key={item.id} className="bg-blue-50/60 dark:bg-blue-950/20" saving={savingPolicy} onSave={() => void handleSavePolicy(inlineEditPolicy).then((saved) => { if (saved) { setInlineEditPolicyId(null); setInlineEditPolicy(buildEmptyPolicyValues()); } })} onCancel={() => { setInlineEditPolicyId(null); setInlineEditPolicy(buildEmptyPolicyValues()); }}>
                        <td className="w-10 text-center text-blue-600 dark:text-blue-300">{policiesPager.offset + index + 1}</td>
                        <td><HrInlineInput autoFocus value={inlineEditPolicy.name} onChange={(event) => setInlineEditPolicy((current) => ({ ...current, name: event.target.value }))} placeholder="اسم السياسة" /></td>
                        <td><HrInlineInput value={inlineEditPolicy.code} onChange={(event) => setInlineEditPolicy((current) => ({ ...current, code: event.target.value }))} placeholder="الكود" /></td>
                        <td><HrInlineInput value={inlineEditPolicy.policyType} onChange={(event) => setInlineEditPolicy((current) => ({ ...current, policyType: event.target.value }))} placeholder="نوع السياسة" /></td>
                        <td><HrInlineInput type="date" value={inlineEditPolicy.effectiveFrom} onChange={(event) => setInlineEditPolicy((current) => ({ ...current, effectiveFrom: event.target.value }))} /></td>
                        <td><HrInlineInput type="date" value={inlineEditPolicy.effectiveTo} onChange={(event) => setInlineEditPolicy((current) => ({ ...current, effectiveTo: event.target.value }))} /></td>
                        <td><HrInlineCheckbox checked={inlineEditPolicy.isActive} onChange={(event) => setInlineEditPolicy((current) => ({ ...current, isActive: event.target.checked }))} label="نشط" /></td>
                        <td><HrInlineActions saving={savingPolicy} onSave={() => void handleSavePolicy(inlineEditPolicy).then((saved) => { if (saved) { setInlineEditPolicyId(null); setInlineEditPolicy(buildEmptyPolicyValues()); } })} onCancel={() => { setInlineEditPolicyId(null); setInlineEditPolicy(buildEmptyPolicyValues()); }} /></td>
                      </HrInlineRow>
                    ) : (
                      <tr key={item.id} onDoubleClick={() => { setInlineCreatePolicyOpen(false); setInlineEditPolicyId(item.id); setInlineEditPolicy(buildPolicyValuesFromItem(item)); }}>
                        <td className="w-10 text-center text-slate-400">{policiesPager.offset + index + 1}</td>
                        <td className="px-3 py-3 font-medium">{item.name}</td>
                        <td className="px-3 py-3">{item.code}</td>
                        <td className="px-3 py-3">{item.policyType}</td>
                        <td className="px-3 py-3">{item.effectiveFrom ? formatDate(item.effectiveFrom) : '—'}</td>
                        <td className="px-3 py-3">{item.effectiveTo ? formatDate(item.effectiveTo) : '—'}</td>
                        <td className="px-3 py-3"><HrStatusBadge value={item.isActive ? 'active' : 'inactive'} /></td>
                        <td className="px-3 py-3"><button type="button" onClick={() => { setInlineCreatePolicyOpen(false); setInlineEditPolicyId(item.id); setInlineEditPolicy(buildPolicyValuesFromItem(item)); }} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><PencilSquareIcon className="h-3.5 w-3.5" />تعديل</button></td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </HrDataGrid>
          )}
        </HrSectionCard>

        <HrSectionCard title="مسارات الاعتماد">
          {loading ? (
            <TableSkeleton rows={5} />
          ) : (
            <HrDataGrid rowCount={workflowsPager.totalRows} columnCount={5} footer={<HrTablePager page={workflowsPager.page} pageCount={workflowsPager.pageCount} pageSize={workflowsPager.pageSize} totalRows={workflowsPager.totalRows} fromRow={workflowsPager.fromRow} toRow={workflowsPager.toRow} onPageChange={workflowsPager.setPage} onPageSizeChange={workflowsPager.setPageSize} />}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><HrSortableHeader label="المسار" sortKey="name" activeSortKey={workflowsSortKey} sortDirection={workflowsSortDirection} onToggle={toggleWorkflowsSort} /></th>
                    <th><HrSortableHeader label="الكود" sortKey="code" activeSortKey={workflowsSortKey} sortDirection={workflowsSortDirection} onToggle={toggleWorkflowsSort} /></th>
                    <th><HrSortableHeader label="الكيان" sortKey="entityType" activeSortKey={workflowsSortKey} sortDirection={workflowsSortDirection} onToggle={toggleWorkflowsSort} /></th>
                    <th><HrSortableHeader label="الحالة" sortKey="isActive" activeSortKey={workflowsSortKey} sortDirection={workflowsSortDirection} onToggle={toggleWorkflowsSort} /></th>
                  </tr>
                </thead>
                <tbody>
                  {workflowsPager.pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        لا توجد مسارات اعتماد حالياً.
                      </td>
                    </tr>
                  ) : (
                    workflowsPager.pagedRows.map((item, index) => (
                      <tr key={item.id}>
                        <td className="w-10 text-center text-slate-400">{workflowsPager.offset + index + 1}</td>
                        <td className="px-3 py-3 font-medium">{item.name}</td>
                        <td className="px-3 py-3">{item.code}</td>
                        <td className="px-3 py-3">{item.entityType}</td>
                        <td className="px-3 py-3"><HrStatusBadge value={item.isActive ? 'active' : 'inactive'} /></td>
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

export default SettingsPage;
