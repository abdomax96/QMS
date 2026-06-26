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
import HrTablePager from '../components/HrTablePager';
import { HrDataGrid, HrPageShell, HrSectionCard, type HrPageStat } from '../components/HrPageShell';
import { usePaginatedRows } from '../hooks/usePaginatedRows';
import {
  createBooleanSorter,
  createDateSorter,
  createNumberSorter,
  createTextSorter,
  useSortableRows,
} from '../hooks/useSortableRows';
import HrStatusBadge from '../components/HrStatusBadge';
import ShiftPlanDialog from '../components/ShiftPlanDialog';
import hrService from '../services/hrService';
import type {
  HrDashboardSummary,
  HrShiftAssignmentItem,
  HrShiftPlanFormValues,
  HrShiftPlanItem,
  HrShiftPlanningOptions,
  HrShiftTemplateFormValues,
  HrShiftTemplateItem,
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

const EMPTY_OPTIONS: HrShiftPlanningOptions = {
  employeeProfiles: [],
  shiftTemplates: [],
};

const buildEmptyShiftTemplateValues = (): HrShiftTemplateFormValues => ({
  code: '',
  name: '',
  startTime: '',
  endTime: '',
  hoursCount: '8',
  breakMinutes: '60',
  isNightShift: false,
  notes: '',
});

const buildEmptyShiftPlanValues = (): HrShiftPlanFormValues => ({
  name: '',
  periodStart: '',
  periodEnd: '',
  notes: '',
  assignments: [],
});

const buildShiftTemplateValuesFromItem = (
  template: HrShiftTemplateItem
): HrShiftTemplateFormValues => ({
  id: template.id,
  code: template.code || '',
  name: template.name || '',
  startTime: template.startTime,
  endTime: template.endTime,
  hoursCount: String(template.hoursCount),
  breakMinutes: String(template.breakMinutes),
  isNightShift: template.isNightShift,
  notes: template.notes || '',
});

const buildShiftPlanValuesFromItem = (plan: HrShiftPlanItem): HrShiftPlanFormValues => ({
  id: plan.id,
  name: plan.name,
  periodStart: plan.periodStart,
  periodEnd: plan.periodEnd,
  notes: plan.notes || '',
  assignments: [],
});

const ShiftsPage: React.FC = () => {
  const [summary, setSummary] = useState<HrDashboardSummary>(EMPTY_SUMMARY);
  const [templates, setTemplates] = useState<HrShiftTemplateItem[]>([]);
  const [plans, setPlans] = useState<HrShiftPlanItem[]>([]);
  const [assignments, setAssignments] = useState<HrShiftAssignmentItem[]>([]);
  const [options, setOptions] = useState<HrShiftPlanningOptions>(EMPTY_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [savingTemplate, setSavingTemplate] = useState(false);
  const [inlineTemplateOpen, setInlineTemplateOpen] = useState(false);
  const [inlineTemplate, setInlineTemplate] = useState<HrShiftTemplateFormValues>(buildEmptyShiftTemplateValues);
  const [inlineEditTemplateId, setInlineEditTemplateId] = useState<string | null>(null);
  const [inlineEditTemplate, setInlineEditTemplate] = useState<HrShiftTemplateFormValues>(buildEmptyShiftTemplateValues);

  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlanValues, setEditingPlanValues] = useState<HrShiftPlanFormValues | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [loadingPlanDetails, setLoadingPlanDetails] = useState(false);
  const [inlinePlanOpen, setInlinePlanOpen] = useState(false);
  const [inlinePlan, setInlinePlan] = useState<HrShiftPlanFormValues>(buildEmptyShiftPlanValues);
  const [inlineEditPlanId, setInlineEditPlanId] = useState<string | null>(null);
  const [inlineEditPlan, setInlineEditPlan] = useState<HrShiftPlanFormValues>(buildEmptyShiftPlanValues);

  const toastSuccess = useToastStore((state) => state.success);
  const toastError = useToastStore((state) => state.error);

  const loadData = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [nextSummary, nextTemplates, nextPlans, nextAssignments, nextOptions] = await Promise.all([
        hrService.getDashboardSummary(),
        hrService.listShiftTemplates(100),
        hrService.listShiftPlans(50),
        hrService.listTodayShiftAssignments(24),
        hrService.getShiftPlanningOptions(),
      ]);

      setSummary(nextSummary);
      setTemplates(nextTemplates);
      setPlans(nextPlans);
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

  const stats = useMemo<HrPageStat[]>(
    () => [
      { label: 'خطط الورديات', value: summary.shiftPlansCount, helper: 'تشمل المسودات والمنشور والمستقبلي', accent: 'indigo' },
      { label: 'دفعات حضور Submitted', value: summary.submittedAttendanceBatchesCount, helper: 'لتأكيد التزام الإنتاج بالخطة المنشورة', accent: 'amber' },
      { label: 'العاملون', value: summary.employeesCount, helper: 'يمكن نقل العامل بين ورديات أثناء السريان مع versioning', accent: 'blue' },
      { label: 'مواقع العمل', value: summary.worksitesCount, helper: 'الورديات قابلة للربط بالموقع أو القسم', accent: 'green' },
    ],
    [summary]
  );

  const templateSorters = useMemo(
    () => ({
      name: createTextSorter<HrShiftTemplateItem>((template) => template.name),
      code: createTextSorter<HrShiftTemplateItem>((template) => template.code),
      time: createTextSorter<HrShiftTemplateItem>((template) => `${template.startTime} ${template.endTime}`),
      hoursCount: createNumberSorter<HrShiftTemplateItem>((template) => template.hoursCount),
      isNightShift: createBooleanSorter<HrShiftTemplateItem>((template) => template.isNightShift),
      notes: createTextSorter<HrShiftTemplateItem>((template) => template.notes),
    }),
    []
  );

  const planSorters = useMemo(
    () => ({
      name: createTextSorter<HrShiftPlanItem>((plan) => plan.name),
      status: createTextSorter<HrShiftPlanItem>((plan) => plan.status),
      period: createDateSorter<HrShiftPlanItem>((plan) => plan.periodStart),
      version: createNumberSorter<HrShiftPlanItem>((plan) => plan.version),
    }),
    []
  );

  const assignmentSorters = useMemo(
    () => ({
      employeeName: createTextSorter<HrShiftAssignmentItem>((assignment) => assignment.employeeName),
      shiftName: createTextSorter<HrShiftAssignmentItem>((assignment) => assignment.shiftName),
      workDate: createDateSorter<HrShiftAssignmentItem>((assignment) => assignment.workDate),
      notes: createTextSorter<HrShiftAssignmentItem>((assignment) => assignment.notes),
    }),
    []
  );

  const {
    sortedRows: sortedTemplates,
    sortKey: templatesSortKey,
    sortDirection: templatesSortDirection,
    toggleSort: toggleTemplatesSort,
  } = useSortableRows({
    rows: templates,
    sorters: templateSorters,
    initialSortKey: 'name',
  });
  const templatesPager = usePaginatedRows({ rows: sortedTemplates });

  const {
    sortedRows: sortedPlans,
    sortKey: plansSortKey,
    sortDirection: plansSortDirection,
    toggleSort: togglePlansSort,
  } = useSortableRows({
    rows: plans,
    sorters: planSorters,
    initialSortKey: 'period',
    initialDirection: 'desc',
  });
  const plansPager = usePaginatedRows({ rows: sortedPlans });

  const {
    sortedRows: sortedAssignments,
    sortKey: assignmentsSortKey,
    sortDirection: assignmentsSortDirection,
    toggleSort: toggleAssignmentsSort,
  } = useSortableRows({
    rows: assignments,
    sorters: assignmentSorters,
    initialSortKey: 'workDate',
    initialDirection: 'desc',
  });
  const assignmentsPager = usePaginatedRows({ rows: sortedAssignments });

  const handleInlineTemplateChange = <K extends keyof HrShiftTemplateFormValues>(
    key: K,
    value: HrShiftTemplateFormValues[K]
  ) => {
    setInlineTemplate((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleInlinePlanChange = <K extends keyof HrShiftPlanFormValues>(
    key: K,
    value: HrShiftPlanFormValues[K]
  ) => {
    setInlinePlan((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleOpenInlineTemplate = () => {
    templatesPager.setPage(1);
    setInlineTemplate(buildEmptyShiftTemplateValues());
    setInlineEditTemplateId(null);
    setInlineTemplateOpen(true);
  };

  const handleOpenInlinePlan = () => {
    plansPager.setPage(1);
    setInlinePlan(buildEmptyShiftPlanValues());
    setInlineEditPlanId(null);
    setInlinePlanOpen(true);
  };

  const handleEditPlan = async (plan: HrShiftPlanItem) => {
    setLoadingPlanDetails(true);
    try {
      const values = await hrService.getShiftPlanFormValues(plan.id);
      setEditingPlanValues(values);
      setPlanDialogOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تحميل تفاصيل الخطة.';
      toastError('فشل تحميل الخطة', message);
    } finally {
      setLoadingPlanDetails(false);
    }
  };

  const handleSaveTemplate = async (values: HrShiftTemplateFormValues) => {
    setSavingTemplate(true);

    try {
      await hrService.saveShiftTemplate(values);
      toastSuccess(
        values.id ? 'تم تحديث قالب الوردية' : 'تمت إضافة قالب الوردية',
        values.name
      );
      setInlineEditTemplateId(null);
      setInlineEditTemplate(buildEmptyShiftTemplateValues());
      await loadData('refresh');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ قالب الوردية.';
      toastError('فشل حفظ قالب الوردية', message);
      return false;
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSaveInlineTemplate = async () => {
    if (!inlineTemplate.name.trim() || !inlineTemplate.startTime || !inlineTemplate.endTime) {
      toastError('بيانات ناقصة', 'اكتب اسم القالب ووقت البداية والنهاية أولاً.');
      return;
    }

    const saved = await handleSaveTemplate(inlineTemplate);
    if (saved) {
      setInlineTemplateOpen(false);
      setInlineTemplate(buildEmptyShiftTemplateValues());
    }
  };

  const handleOpenInlineEditTemplate = (template: HrShiftTemplateItem) => {
    setInlineTemplateOpen(false);
    setInlineEditTemplateId(template.id);
    setInlineEditTemplate(buildShiftTemplateValuesFromItem(template));
  };

  const handleInlineEditTemplateChange = <K extends keyof HrShiftTemplateFormValues>(
    key: K,
    value: HrShiftTemplateFormValues[K]
  ) => {
    setInlineEditTemplate((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleCancelInlineEditTemplate = () => {
    if (savingTemplate) return;
    setInlineEditTemplateId(null);
    setInlineEditTemplate(buildEmptyShiftTemplateValues());
  };

  const handleSaveInlineEditTemplate = async () => {
    if (!inlineEditTemplate.name.trim() || !inlineEditTemplate.startTime || !inlineEditTemplate.endTime) {
      toastError('بيانات ناقصة', 'اكتب اسم القالب ووقت البداية والنهاية أولاً.');
      return;
    }

    await handleSaveTemplate(inlineEditTemplate);
  };

  const handleSavePlan = async (values: HrShiftPlanFormValues) => {
    setSavingPlan(true);

    try {
      await hrService.saveShiftPlan(values);
      toastSuccess(
        values.id ? 'تم تحديث خطة الورديات' : 'تمت إضافة خطة الورديات',
        values.name
      );
      setPlanDialogOpen(false);
      setEditingPlanValues(null);
      await loadData('refresh');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ خطة الورديات.';
      toastError('فشل حفظ خطة الورديات', message);
      return false;
    } finally {
      setSavingPlan(false);
    }
  };

  const handleSaveInlinePlan = async () => {
    if (!inlinePlan.name.trim() || !inlinePlan.periodStart || !inlinePlan.periodEnd) {
      toastError('بيانات ناقصة', 'اكتب اسم الخطة وبداية ونهاية الفترة أولاً.');
      return;
    }

    const saved = await handleSavePlan(inlinePlan);
    if (saved) {
      setInlinePlanOpen(false);
      setInlinePlan(buildEmptyShiftPlanValues());
    }
  };

  const handleOpenInlineEditPlan = (plan: HrShiftPlanItem) => {
    setInlinePlanOpen(false);
    setInlineEditPlanId(plan.id);
    setInlineEditPlan(buildShiftPlanValuesFromItem(plan));
  };

  const handleInlineEditPlanChange = <K extends keyof HrShiftPlanFormValues>(
    key: K,
    value: HrShiftPlanFormValues[K]
  ) => {
    setInlineEditPlan((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleCancelInlineEditPlan = () => {
    if (savingPlan) return;
    setInlineEditPlanId(null);
    setInlineEditPlan(buildEmptyShiftPlanValues());
  };

  const handleSaveInlineEditPlan = async () => {
    if (!inlineEditPlan.name.trim() || !inlineEditPlan.periodStart || !inlineEditPlan.periodEnd) {
      toastError('بيانات ناقصة', 'اكتب اسم الخطة وبداية ونهاية الفترة أولاً.');
      return;
    }

    await handleSavePlan(inlineEditPlan);
  };

  const handlePublishPlan = async (plan: HrShiftPlanItem) => {
    const confirmed = window.confirm(`هل تريد نشر الخطة "${plan.name}"؟ سيتم أرشفة أي خطة منشورة متداخلة.`);
    if (!confirmed) return;

    try {
      await hrService.publishShiftPlan(plan.id);
      toastSuccess('تم نشر خطة الورديات', plan.name);
      await loadData('refresh');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر نشر خطة الورديات.';
      toastError('فشل نشر الخطة', message);
    }
  };

  return (
    <HrPageShell
      title="إدارة الورديات"
      description="بناء القوالب والخطط المنشورة والمستقبلية مع حفظ الإصدارات، واستخدام نفس الخطة كمرجع لقسم الإنتاج عند إدخال الحضور اليومي."
      stats={stats}
    >
      <div className="space-y-4">
        <HrSectionCard
          title="قوالب الورديات"
          description="القوالب الأساسية التي تحدد ساعات العمل ويمكن إعادة استخدامها في أكثر من خطة."
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
                onClick={handleOpenInlineTemplate}
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
              rowCount={templatesPager.totalRows}
              columnCount={8}
              footer={
                <HrTablePager
                  page={templatesPager.page}
                  pageCount={templatesPager.pageCount}
                  pageSize={templatesPager.pageSize}
                  totalRows={templatesPager.totalRows}
                  fromRow={templatesPager.fromRow}
                  toRow={templatesPager.toRow}
                  onPageChange={templatesPager.setPage}
                  onPageSizeChange={templatesPager.setPageSize}
                />
              }
            >
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><HrSortableHeader label="القالب" sortKey="name" activeSortKey={templatesSortKey} sortDirection={templatesSortDirection} onToggle={toggleTemplatesSort} /></th>
                    <th><HrSortableHeader label="الكود" sortKey="code" activeSortKey={templatesSortKey} sortDirection={templatesSortDirection} onToggle={toggleTemplatesSort} /></th>
                    <th><HrSortableHeader label="الوقت" sortKey="time" activeSortKey={templatesSortKey} sortDirection={templatesSortDirection} onToggle={toggleTemplatesSort} /></th>
                    <th><HrSortableHeader label="الساعات / الراحة" sortKey="hoursCount" activeSortKey={templatesSortKey} sortDirection={templatesSortDirection} onToggle={toggleTemplatesSort} /></th>
                    <th><HrSortableHeader label="ليلي" sortKey="isNightShift" activeSortKey={templatesSortKey} sortDirection={templatesSortDirection} onToggle={toggleTemplatesSort} /></th>
                    <th><HrSortableHeader label="ملاحظات" sortKey="notes" activeSortKey={templatesSortKey} sortDirection={templatesSortDirection} onToggle={toggleTemplatesSort} /></th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineTemplateOpen ? (
                    <HrInlineRow
                      className="bg-emerald-50/60 dark:bg-emerald-950/20"
                      saving={savingTemplate}
                      onSave={() => void handleSaveInlineTemplate()}
                      onCancel={() => {
                        if (savingTemplate) return;
                        setInlineTemplateOpen(false);
                        setInlineTemplate(buildEmptyShiftTemplateValues());
                      }}
                    >
                      <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                      <td><HrInlineInput autoFocus value={inlineTemplate.name} onChange={(event) => handleInlineTemplateChange('name', event.target.value)} placeholder="اسم القالب" /></td>
                      <td><HrInlineInput value={inlineTemplate.code} onChange={(event) => handleInlineTemplateChange('code', event.target.value)} placeholder="الكود" /></td>
                      <td className="space-y-2">
                        <HrInlineInput type="time" value={inlineTemplate.startTime} onChange={(event) => handleInlineTemplateChange('startTime', event.target.value)} />
                        <HrInlineInput type="time" value={inlineTemplate.endTime} onChange={(event) => handleInlineTemplateChange('endTime', event.target.value)} />
                      </td>
                      <td className="space-y-2">
                        <HrInlineInput type="number" min="0" value={inlineTemplate.hoursCount} onChange={(event) => handleInlineTemplateChange('hoursCount', event.target.value)} placeholder="الساعات" />
                        <HrInlineInput type="number" min="0" value={inlineTemplate.breakMinutes} onChange={(event) => handleInlineTemplateChange('breakMinutes', event.target.value)} placeholder="الراحة" />
                      </td>
                      <td><HrInlineCheckbox checked={inlineTemplate.isNightShift} onChange={(event) => handleInlineTemplateChange('isNightShift', event.target.checked)} label="ليلي" /></td>
                      <td><HrInlineInput value={inlineTemplate.notes} onChange={(event) => handleInlineTemplateChange('notes', event.target.value)} placeholder="ملاحظات" /></td>
                      <td>
                        <HrInlineActions
                          saving={savingTemplate}
                          onSave={() => void handleSaveInlineTemplate()}
                          onCancel={() => {
                            if (savingTemplate) return;
                            setInlineTemplateOpen(false);
                            setInlineTemplate(buildEmptyShiftTemplateValues());
                          }}
                        />
                      </td>
                    </HrInlineRow>
                  ) : null}

                  {templatesPager.pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        لا توجد قوالب ورديات بعد.
                      </td>
                    </tr>
                  ) : (
                    templatesPager.pagedRows.map((template, index) => (
                    inlineEditTemplateId === template.id ? (
                    <HrInlineRow
                      key={template.id}
                      className="bg-blue-50/60 dark:bg-blue-950/20"
                      saving={savingTemplate}
                      onSave={() => void handleSaveInlineEditTemplate()}
                      onCancel={handleCancelInlineEditTemplate}
                    >
                      <td className="w-10 text-center text-blue-600 dark:text-blue-300">{templatesPager.offset + index + 1}</td>
                      <td><HrInlineInput autoFocus value={inlineEditTemplate.name} onChange={(event) => handleInlineEditTemplateChange('name', event.target.value)} placeholder="اسم القالب" /></td>
                      <td><HrInlineInput value={inlineEditTemplate.code} onChange={(event) => handleInlineEditTemplateChange('code', event.target.value)} placeholder="الكود" /></td>
                      <td className="space-y-2">
                        <HrInlineInput type="time" value={inlineEditTemplate.startTime} onChange={(event) => handleInlineEditTemplateChange('startTime', event.target.value)} />
                        <HrInlineInput type="time" value={inlineEditTemplate.endTime} onChange={(event) => handleInlineEditTemplateChange('endTime', event.target.value)} />
                      </td>
                      <td className="space-y-2">
                        <HrInlineInput type="number" min="0" value={inlineEditTemplate.hoursCount} onChange={(event) => handleInlineEditTemplateChange('hoursCount', event.target.value)} placeholder="الساعات" />
                        <HrInlineInput type="number" min="0" value={inlineEditTemplate.breakMinutes} onChange={(event) => handleInlineEditTemplateChange('breakMinutes', event.target.value)} placeholder="الراحة" />
                      </td>
                      <td><HrInlineCheckbox checked={inlineEditTemplate.isNightShift} onChange={(event) => handleInlineEditTemplateChange('isNightShift', event.target.checked)} label="ليلي" /></td>
                      <td><HrInlineInput value={inlineEditTemplate.notes} onChange={(event) => handleInlineEditTemplateChange('notes', event.target.value)} placeholder="ملاحظات" /></td>
                      <td>
                        <HrInlineActions
                          saving={savingTemplate}
                          onSave={() => void handleSaveInlineEditTemplate()}
                          onCancel={handleCancelInlineEditTemplate}
                        />
                      </td>
                    </HrInlineRow>
                    ) : (
                    <tr key={template.id} onDoubleClick={() => handleOpenInlineEditTemplate(template)}>
                      <td className="w-10 text-center text-slate-400">{templatesPager.offset + index + 1}</td>
                      <td className="px-3 py-3 font-medium">{template.name}</td>
                      <td className="px-3 py-3">{template.code || '—'}</td>
                      <td className="px-3 py-3">{template.startTime} - {template.endTime}</td>
                      <td className="px-3 py-3">{template.hoursCount} ساعة / {template.breakMinutes} دقيقة</td>
                      <td className="px-3 py-3">{template.isNightShift ? 'نعم' : 'لا'}</td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{template.notes || '—'}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => handleOpenInlineEditTemplate(template)}
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
          title="خطط الورديات"
          description="كل خطة تحمل فترة سريان، وتسكين العاملين، وحالة نشر واضحة."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenInlinePlan}
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
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><HrSortableHeader label="الخطة" sortKey="name" activeSortKey={plansSortKey} sortDirection={plansSortDirection} onToggle={togglePlansSort} /></th>
                    <th><HrSortableHeader label="الحالة" sortKey="status" activeSortKey={plansSortKey} sortDirection={plansSortDirection} onToggle={togglePlansSort} /></th>
                    <th><HrSortableHeader label="الفترة" sortKey="period" activeSortKey={plansSortKey} sortDirection={plansSortDirection} onToggle={togglePlansSort} /></th>
                    <th><HrSortableHeader label="الإصدار" sortKey="version" activeSortKey={plansSortKey} sortDirection={plansSortDirection} onToggle={togglePlansSort} /></th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {inlinePlanOpen ? (
                    <HrInlineRow
                      className="bg-emerald-50/60 dark:bg-emerald-950/20"
                      saving={savingPlan}
                      onSave={() => void handleSaveInlinePlan()}
                      onCancel={() => {
                        if (savingPlan) return;
                        setInlinePlanOpen(false);
                        setInlinePlan(buildEmptyShiftPlanValues());
                      }}
                    >
                      <td className="w-10 text-center text-emerald-600 dark:text-emerald-300">+</td>
                      <td className="space-y-2">
                        <HrInlineInput autoFocus value={inlinePlan.name} onChange={(event) => handleInlinePlanChange('name', event.target.value)} placeholder="اسم الخطة" />
                        <HrInlineInput value={inlinePlan.notes} onChange={(event) => handleInlinePlanChange('notes', event.target.value)} placeholder="ملاحظات" />
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">ستبدأ كمسودة</td>
                      <td className="space-y-2">
                        <HrInlineInput type="date" value={inlinePlan.periodStart} onChange={(event) => handleInlinePlanChange('periodStart', event.target.value)} />
                        <HrInlineInput type="date" value={inlinePlan.periodEnd} onChange={(event) => handleInlinePlanChange('periodEnd', event.target.value)} />
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">v1</td>
                      <td>
                        <HrInlineActions
                          saving={savingPlan}
                          onSave={() => void handleSaveInlinePlan()}
                          onCancel={() => {
                            if (savingPlan) return;
                            setInlinePlanOpen(false);
                            setInlinePlan(buildEmptyShiftPlanValues());
                          }}
                        />
                      </td>
                    </HrInlineRow>
                  ) : null}

                  {plansPager.pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        لا توجد خطط ورديات بعد.
                      </td>
                    </tr>
                  ) : (
                    plansPager.pagedRows.map((plan, index) => (
                    inlineEditPlanId === plan.id ? (
                    <HrInlineRow
                      key={plan.id}
                      className="bg-blue-50/60 dark:bg-blue-950/20"
                      saving={savingPlan}
                      onSave={() => void handleSaveInlineEditPlan()}
                      onCancel={handleCancelInlineEditPlan}
                    >
                      <td className="w-10 text-center text-blue-600 dark:text-blue-300">{plansPager.offset + index + 1}</td>
                      <td className="space-y-2">
                        <HrInlineInput autoFocus value={inlineEditPlan.name} onChange={(event) => handleInlineEditPlanChange('name', event.target.value)} placeholder="اسم الخطة" />
                        <HrInlineInput value={inlineEditPlan.notes} onChange={(event) => handleInlineEditPlanChange('notes', event.target.value)} placeholder="ملاحظات" />
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {plan.status === 'published' ? 'منشورة' : plan.status}
                      </td>
                      <td className="space-y-2">
                        <HrInlineInput type="date" value={inlineEditPlan.periodStart} onChange={(event) => handleInlineEditPlanChange('periodStart', event.target.value)} />
                        <HrInlineInput type="date" value={inlineEditPlan.periodEnd} onChange={(event) => handleInlineEditPlanChange('periodEnd', event.target.value)} />
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">v{plan.version}</td>
                      <td>
                        <HrInlineActions
                          saving={savingPlan}
                          onSave={() => void handleSaveInlineEditPlan()}
                          onCancel={handleCancelInlineEditPlan}
                        />
                      </td>
                    </HrInlineRow>
                    ) : (
                    <tr key={plan.id} onDoubleClick={() => handleOpenInlineEditPlan(plan)}>
                      <td className="w-10 text-center text-slate-400">{plansPager.offset + index + 1}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{plan.name}</div>
                        {plan.notes ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{plan.notes}</div> : null}
                      </td>
                      <td className="px-3 py-3"><HrStatusBadge value={plan.status} /></td>
                      <td className="px-3 py-3">{formatDate(plan.periodStart)} - {formatDate(plan.periodEnd)}</td>
                      <td className="px-3 py-3">v{plan.version}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenInlineEditPlan(plan)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <PencilSquareIcon className="h-3.5 w-3.5" />
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleEditPlan(plan)}
                            disabled={loadingPlanDetails}
                            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            تسكين
                          </button>
                          <button
                            type="button"
                            onClick={() => void handlePublishPlan(plan)}
                            disabled={plan.status === 'published'}
                            className="rounded-md bg-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-900/30 dark:text-blue-300"
                          >
                            {plan.status === 'published' ? 'منشورة' : 'نشر'}
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
          )}
        </HrSectionCard>
      </div>

      <HrSectionCard title="معاينة التسكين" description="العلاقات التي سيقرأها الإنتاج عند تسجيل الحضور.">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : assignments.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">لا توجد تعيينات ورديات حالياً.</p>
        ) : (
          <HrDataGrid
            rowCount={assignmentsPager.totalRows}
            columnCount={6}
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
                  <th><HrSortableHeader label="الوردية" sortKey="shiftName" activeSortKey={assignmentsSortKey} sortDirection={assignmentsSortDirection} onToggle={toggleAssignmentsSort} /></th>
                  <th><HrSortableHeader label="تاريخ العمل" sortKey="workDate" activeSortKey={assignmentsSortKey} sortDirection={assignmentsSortDirection} onToggle={toggleAssignmentsSort} /></th>
                  <th>الحالة</th>
                  <th><HrSortableHeader label="ملاحظات" sortKey="notes" activeSortKey={assignmentsSortKey} sortDirection={assignmentsSortDirection} onToggle={toggleAssignmentsSort} /></th>
                </tr>
              </thead>
              <tbody>
                {assignmentsPager.pagedRows.map((assignment, index) => (
                  <tr key={assignment.id}>
                    <td className="w-10 text-center text-slate-400">{assignmentsPager.offset + index + 1}</td>
                    <td className="px-3 py-3 font-medium">{assignment.employeeName}</td>
                    <td className="px-3 py-3">{assignment.shiftName || 'وردية غير محددة'}</td>
                    <td className="px-3 py-3">{formatDate(assignment.workDate)}</td>
                    <td className="px-3 py-3"><HrStatusBadge value="published" fallback="منشور" /></td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{assignment.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HrDataGrid>
        )}
      </HrSectionCard>

      <ShiftPlanDialog
        open={planDialogOpen}
        values={editingPlanValues}
        options={options}
        saving={savingPlan}
        onClose={() => {
          if (savingPlan) return;
          setPlanDialogOpen(false);
          setEditingPlanValues(null);
        }}
        onSubmit={async (values) => {
          await handleSavePlan(values);
        }}
      />
    </HrPageShell>
  );
};

export default ShiftsPage;
