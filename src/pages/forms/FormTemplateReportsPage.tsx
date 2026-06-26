import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import type { FormInstance } from '../../types';
import useStore from '../../store';
import { usePermissions } from '../../hooks/usePermissions';
import { useLanguageStore, getDisplayName } from '../../store/languageStore';
import { useFormsDataIsolation } from '../../hooks/useDataIsolation';
import { cn, formatDate } from '../../utils';
import { TableSkeleton } from '../../components/common/LoadingStates';
import DataGrid from '../../components/data-grid/DataGrid';
import SortableHeader from '../../components/data-grid/SortableHeader';
import TablePager from '../../components/data-grid/TablePager';
import { usePaginatedRows } from '../../hooks/usePaginatedRows';
import {
  createDateSorter,
  createTextSorter,
  useSortableRows,
} from '../../hooks/useSortableRows';
import { FORMS_REPORTS_HOME } from '../../constants/formsReportsRoutes';

const STATUS_BADGES: Record<
  string,
  { label: string; className: string }
> = {
  draft: {
    label: 'مسودة',
    className:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  in_progress: {
    label: 'قيد العمل',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  submitted: {
    label: 'مُرسل',
    className:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  under_review: {
    label: 'قيد المراجعة',
    className:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  approved: {
    label: 'معتمد',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  rejected: {
    label: 'مرفوض',
    className:
      'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  },
  archived: {
    label: 'مؤرشف',
    className:
      'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
  },
  cancelled: {
    label: 'ملغي',
    className:
      'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
  },
};

const getStatusBadge = (status: string | undefined) =>
  STATUS_BADGES[status || ''] || STATUS_BADGES.draft;

type ReportRow = {
  instance: FormInstance;
  reportDate: string;
  batchNumber: string;
  productionLine: string;
  shift: string;
  status: string;
  createdAt: string;
};

export default function FormTemplateReportsPage() {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const { can } = usePermissions();
  const { displayLanguage } = useLanguageStore();
  const { userDepartmentIds, isolationMode, canSeeAll } = useFormsDataIsolation('folders');

  const {
    formTemplates,
    formInstances,
    fetchAllData,
    isLoading,
    archiveFormInstance,
    unarchiveFormInstance,
    deleteFormInstance,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reportActionId, setReportActionId] = useState<string | null>(null);

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  const template = templateId ? formTemplates[templateId] : undefined;
  const templateName = template
    ? getDisplayName(template.name, template.name_en, displayLanguage)
    : 'النموذج';

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    Object.values(formInstances).forEach((instance) => {
      if (!templateId || instance.template_id !== templateId) return;
      set.add(instance.status);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [formInstances, templateId]);

  const filteredInstances = useMemo(() => {
    if (!templateId) return [];

    const query = searchQuery.trim().toLowerCase();

    let rows = Object.values(formInstances).filter((instance) => instance.template_id === templateId);

    if (!includeArchived) {
      rows = rows.filter((instance) => !instance.archived);
    }

    if (statusFilter) {
      rows = rows.filter((instance) => instance.status === statusFilter);
    }

    // Isolation: keep department-visible + legacy rows (no department_id)
    if (isolationMode === 'isolated' && !canSeeAll && userDepartmentIds.length > 0) {
      rows = rows.filter(
        (i) => (i.department_id && userDepartmentIds.includes(i.department_id)) || !i.department_id
      );
    }

    if (!query) return rows;

    return rows.filter((instance) => {
      const haystacks = [
        instance.name,
        instance.status,
        instance.review_status,
        instance.form_data?.batch_number,
        instance.form_data?.production_line,
        instance.form_data?.shift,
        instance.form_data?.report_date,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      return haystacks.some((value) => value.includes(query));
    });
  }, [
    canSeeAll,
    formInstances,
    includeArchived,
    isolationMode,
    searchQuery,
    statusFilter,
    templateId,
    userDepartmentIds,
  ]);

  const reportRows = useMemo((): ReportRow[] => {
    return filteredInstances.map((instance) => ({
      instance,
      reportDate: instance.form_data?.report_date ? formatDate(instance.form_data.report_date, 'dd/MM/yyyy') : '-',
      batchNumber: instance.form_data?.batch_number || '-',
      productionLine: instance.form_data?.production_line || '-',
      shift: instance.form_data?.shift || '-',
      status: instance.status,
      createdAt: instance.created_at ? formatDate(instance.created_at, 'dd/MM/yyyy HH:mm') : '-',
    }));
  }, [filteredInstances]);

  const reportSorters = useMemo(
    () => ({
      reportDate: createTextSorter<ReportRow>((row) => row.reportDate),
      batch: createTextSorter<ReportRow>((row) => row.batchNumber),
      line: createTextSorter<ReportRow>((row) => row.productionLine),
      shift: createTextSorter<ReportRow>((row) => row.shift),
      status: createTextSorter<ReportRow>((row) => getStatusBadge(row.status).label),
      createdAt: createDateSorter<ReportRow>((row) => row.instance.created_at),
    }),
    []
  );

  const { sortedRows, sortKey, sortDirection, toggleSort } = useSortableRows({
    rows: reportRows,
    sorters: reportSorters,
    initialSortKey: 'createdAt',
    initialDirection: 'desc',
  });

  const {
    page,
    setPage,
    pageCount,
    pageSize,
    setPageSize,
    pagedRows,
    totalRows,
    fromRow,
    toRow,
    offset,
  } = usePaginatedRows({
    rows: sortedRows,
    initialPageSize: 20,
  });

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchAllData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleArchive = async (instance: FormInstance) => {
    const instanceId = instance.instance_id;
    const isArchived = Boolean(instance.archived);
    const confirmed = window.confirm(
      isArchived ? 'هل تريد استرجاع هذا التقرير؟' : 'هل تريد أرشفة هذا التقرير؟'
    );
    if (!confirmed) return;

    try {
      setReportActionId(instanceId);
      if (isArchived) {
        await unarchiveFormInstance(instanceId);
      } else {
        await archiveFormInstance(instanceId);
      }
    } catch (error) {
      console.error('[FormTemplateReportsPage] Failed to update report archive state:', error);
      alert('تعذر تحديث حالة الأرشفة. حاول مرة أخرى.');
    } finally {
      setReportActionId(null);
    }
  };

  const handleDeleteReport = async (instance: FormInstance) => {
    const instanceId = instance.instance_id;

    if (!window.confirm('سيتم حذف هذا التقرير نهائيا ولا يمكن التراجع عن العملية. هل أنت متأكد؟')) {
      return;
    }

    try {
      setReportActionId(instanceId);
      await deleteFormInstance(instanceId);
    } catch (error) {
      console.error('[FormTemplateReportsPage] Failed to delete report:', error);
      alert('تعذر حذف التقرير. تأكد من الصلاحيات وحاول مرة أخرى.');
    } finally {
      setReportActionId(null);
    }
  };

  if (isLoading && Object.keys(formInstances).length === 0) {
    return (
      <div className="p-3 sm:p-4" dir="rtl">
        <TableSkeleton rows={8} />
      </div>
    );
  }

  if (!templateId) {
    return (
      <div className="space-y-4 p-3 sm:p-4" dir="rtl">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(FORMS_REPORTS_HOME)}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowRightIcon className="h-4 w-4" />
              رجوع للنماذج
            </button>
          </div>
        </header>
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          مسار غير صحيح
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 sm:p-4" dir="rtl">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(FORMS_REPORTS_HOME)}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              title="العودة إلى قائمة النماذج"
            >
              <ArrowRightIcon className="h-4 w-4" />
              رجوع للنماذج
            </button>

            <h1 className="flex min-w-0 items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <ClipboardDocumentListIcon className="h-5 w-5 text-primary-600" />
              <span className="truncate">تقارير: {templateName}</span>
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowPathIcon className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            تحديث
          </button>

          {can('forms_reports', 'create') && (
            <button
              type="button"
              onClick={() => navigate(`/reports/new/${templateId}`)}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <PlusIcon className="h-4 w-4" />
              تقرير جديد
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
        <label className="relative block">
          <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            placeholder="بحث بالتاريخ أو الباتش أو الخط"
            className="w-full rounded-md border border-slate-300 bg-white py-2.5 pr-10 pl-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
        >
          <option value="">كل الحالات</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {getStatusBadge(status).label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => {
              setIncludeArchived(event.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700"
          />
          <span>عرض المؤرشفة</span>
        </label>
      </div>

      <DataGrid
        rowCount={totalRows}
        columnCount={9}
        footer={
          <TablePager
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            totalRows={totalRows}
            fromRow={fromRow}
            toRow={toRow}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[20, 50, 100]}
          />
        }
      >
        <table>
          <thead>
            <tr>
              <th className="w-12 text-center">#</th>
              <th className="min-w-[140px]">
                <SortableHeader
                  label="تاريخ التقرير"
                  sortKey="reportDate"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggle={toggleSort}
                />
              </th>
              <th className="min-w-[160px]">
                <SortableHeader
                  label="Batch"
                  sortKey="batch"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggle={toggleSort}
                />
              </th>
              <th className="min-w-[180px]">
                <SortableHeader
                  label="خط الإنتاج"
                  sortKey="line"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggle={toggleSort}
                />
              </th>
              <th className="min-w-[120px]">
                <SortableHeader
                  label="الوردية"
                  sortKey="shift"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggle={toggleSort}
                />
              </th>
              <th className="min-w-[140px]">
                <SortableHeader
                  label="الحالة"
                  sortKey="status"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggle={toggleSort}
                />
              </th>
              <th className="min-w-[170px]">
                <SortableHeader
                  label="تاريخ الإنشاء"
                  sortKey="createdAt"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggle={toggleSort}
                />
              </th>
              <th className="min-w-[220px]">اسم التقرير</th>
              <th className="min-w-[160px] text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  لا توجد تقارير لهذا النموذج
                </td>
              </tr>
            ) : (
              pagedRows.map((row, index) => {
                const badge = getStatusBadge(row.status);
                const instanceId = row.instance.instance_id;

                return (
                  <tr key={instanceId}>
                    <td className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                      {offset + index + 1}
                    </td>
                    <td className="text-center">{row.reportDate}</td>
                    <td className="font-mono text-[11px]">{row.batchNumber}</td>
                    <td>{row.productionLine}</td>
                    <td className="text-center">{row.shift}</td>
                    <td>
                      <span className={cn('inline-flex rounded-full px-2 py-1 text-[11px] font-medium', badge.className)}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                      {row.createdAt}
                    </td>
                    <td className="max-w-[280px] truncate" title={row.instance.name || ''}>
                      {row.instance.name || '-'}
                    </td>
                    <td className="text-center">
                      <div className="inline-flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/reports/view/${instanceId}`)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          title="عرض"
                          aria-label="عرض"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>

                        {can('forms_reports', 'edit') && (
                          <button
                            type="button"
                            onClick={() => navigate(`/reports/edit/${instanceId}`)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            title="تعديل"
                            aria-label="تعديل"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                        {(can('forms_reports', 'archive') || can('forms_reports', 'delete')) && (
                          <button
                            type="button"
                            onClick={() => void handleToggleArchive(row.instance)}
                            disabled={reportActionId === instanceId}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            title={row.instance.archived ? 'استرجاع التقرير' : 'أرشفة التقرير'}
                            aria-label={row.instance.archived ? 'استرجاع التقرير' : 'أرشفة التقرير'}
                          >
                            {row.instance.archived ? (
                              <ArrowUturnLeftIcon className="h-4 w-4" />
                            ) : (
                              <ArchiveBoxIcon className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {can('forms_reports', 'delete') && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteReport(row.instance)}
                            disabled={reportActionId === instanceId}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                            title="حذف التقرير"
                            aria-label="حذف التقرير"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </DataGrid>
    </div>
  );
}
