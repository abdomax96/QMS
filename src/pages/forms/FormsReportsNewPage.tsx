import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import type { FormTemplate } from '../../types';
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
  createNumberSorter,
  createTextSorter,
  useSortableRows,
} from '../../hooks/useSortableRows';
import { formsReportsTemplateReportsPath } from '../../constants/formsReportsRoutes';

type TemplateRow = {
  template: FormTemplate;
  displayName: string;
  folderPath: string;
  docCode: string;
  issueNo: string;
  reviewNo: string;
  issueDate: string;
  reviewDate: string;
  typeName: string;
  reportsCount: number;
};

export default function FormsReportsNewPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { displayLanguage } = useLanguageStore();

  // We reuse the same isolation signals the explorer uses, without reloading data from the hook.
  const { userDepartmentIds, isolationMode, canSeeAll } = useFormsDataIsolation('folders');

  const {
    formTemplates,
    formInstances,
    fetchAllData,
    getFolderPath,
    isLoading,
    archiveFormTemplate,
    unarchiveFormTemplate,
    deleteFormTemplate,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [templateActionId, setTemplateActionId] = useState<string | null>(null);

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  const templateTypeOptions = useMemo(() => {
    const set = new Set<string>();
    Object.values(formTemplates).forEach((template) => set.add(template.type));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [formTemplates]);

  const reportCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(formInstances).forEach((instance) => {
      if (!includeArchived && instance.archived) return;
      counts[instance.template_id] = (counts[instance.template_id] || 0) + 1;
    });
    return counts;
  }, [formInstances, includeArchived]);

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let rows = Object.values(formTemplates);

    if (!includeArchived) {
      rows = rows.filter((t) => !t.archived);
    }

    if (typeFilter) {
      rows = rows.filter((t) => t.type === typeFilter);
    }

    // Isolation: keep department-visible + legacy rows (no department_id)
    if (isolationMode === 'isolated' && !canSeeAll && userDepartmentIds.length > 0) {
      rows = rows.filter(
        (t) => (t.department_id && userDepartmentIds.includes(t.department_id)) || !t.department_id
      );
    }

    if (!query) return rows;

    return rows.filter((t) => {
      const haystacks = [
        t.name,
        t.name_en,
        t.document_control?.doc_code,
        t.template_type_config?.name,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      return haystacks.some((value) => value.includes(query));
    });
  }, [
    canSeeAll,
    formTemplates,
    includeArchived,
    isolationMode,
    searchQuery,
    typeFilter,
    userDepartmentIds,
  ]);

  const templateRows = useMemo((): TemplateRow[] => {
    return filteredTemplates.map((template) => {
      const folderId = (template.unified_folder_id ?? template.folder_id) || null;
      const folderPath = folderId ? getFolderPath(folderId).join(' / ') : '-';
      const dc = template.document_control;

      return {
        template,
        displayName: getDisplayName(template.name, template.name_en, displayLanguage),
        folderPath,
        docCode: dc?.doc_code || '-',
        issueNo: dc?.issue_no || '-',
        reviewNo: dc?.review_no || '-',
        issueDate: dc?.issue_date ? formatDate(dc.issue_date, 'dd/MM/yyyy') : '-',
        reviewDate: dc?.review_date ? formatDate(dc.review_date, 'dd/MM/yyyy') : '-',
        typeName: template.template_type_config?.name || template.type,
        reportsCount: reportCounts[template.id] || 0,
      };
    });
  }, [displayLanguage, filteredTemplates, getFolderPath, reportCounts]);

  const templateSorters = useMemo(
    () => ({
      name: createTextSorter<TemplateRow>((row) => row.displayName),
      docCode: createTextSorter<TemplateRow>((row) => row.docCode),
      type: createTextSorter<TemplateRow>((row) => row.typeName),
      folder: createTextSorter<TemplateRow>((row) => row.folderPath),
      version: createNumberSorter<TemplateRow>((row) => row.template.version),
      reports: createNumberSorter<TemplateRow>((row) => row.reportsCount),
      created: createDateSorter<TemplateRow>((row) => row.template.created_at),
    }),
    []
  );

  const { sortedRows, sortKey, sortDirection, toggleSort } = useSortableRows({
    rows: templateRows,
    sorters: templateSorters,
    initialSortKey: 'name',
    initialDirection: 'asc',
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

  const handleToggleArchive = async (template: FormTemplate) => {
    const isArchived = Boolean(template.archived);
    const confirmed = window.confirm(
      isArchived ? 'هل تريد استرجاع هذا النموذج؟' : 'هل تريد أرشفة هذا النموذج؟'
    );
    if (!confirmed) return;

    try {
      setTemplateActionId(template.id);
      if (isArchived) {
        await unarchiveFormTemplate(template.id);
      } else {
        await archiveFormTemplate(template.id);
      }
    } catch (error) {
      console.error('[FormsReportsNewPage] Failed to update template archive state:', error);
      alert('تعذر تحديث حالة الأرشفة. حاول مرة أخرى.');
    } finally {
      setTemplateActionId(null);
    }
  };

  const handleDeleteTemplate = async (template: FormTemplate) => {
    const reportsCount = reportCounts[template.id] || 0;
    const message =
      reportsCount > 0
        ? `هذا النموذج يحتوي على ${reportsCount} تقرير/تقارير مرتبطة. غالبا لن تسمح قاعدة البيانات بحذفه قبل حذف التقارير أولا.\n\nهل تريد محاولة الحذف النهائي؟`
        : 'سيتم حذف هذا النموذج نهائيا ولا يمكن التراجع عن العملية. هل أنت متأكد؟';

    if (!window.confirm(message)) return;

    try {
      setTemplateActionId(template.id);
      await deleteFormTemplate(template.id);
    } catch (error) {
      console.error('[FormsReportsNewPage] Failed to delete template:', error);
      alert('تعذر حذف النموذج. تأكد من الصلاحيات أو من عدم وجود تقارير مرتبطة.');
    } finally {
      setTemplateActionId(null);
    }
  };

  if (isLoading && Object.keys(formTemplates).length === 0) {
    return (
      <div className="p-3 sm:p-4" dir="rtl">
        <TableSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 sm:p-4" dir="rtl">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <DocumentTextIcon className="h-5 w-5 text-primary-600" />
            <span className="truncate">النماذج</span>
          </h1>
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
              onClick={() => navigate('/forms/new')}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <PlusIcon className="h-4 w-4" />
              نموذج جديد
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
            placeholder="بحث بالاسم أو كود الوثيقة"
            className="w-full rounded-md border border-slate-300 bg-white py-2.5 pr-10 pl-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
          />
        </label>

        <select
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
        >
          <option value="">كل الأنواع</option>
          {templateTypeOptions.map((type) => (
            <option key={type} value={type}>
              {type}
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
        columnCount={12}
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
              <th className="min-w-[260px]">
                <SortableHeader
                  label="اسم النموذج"
                  sortKey="name"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggle={toggleSort}
                />
              </th>
              <th className="min-w-[160px]">
                <SortableHeader
                  label="كود"
                  sortKey="docCode"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggle={toggleSort}
                />
              </th>
              <th className="min-w-[120px]">إصدار</th>
              <th className="min-w-[120px]">مراجعة</th>
              <th className="min-w-[120px]">تاريخ الإصدار</th>
              <th className="min-w-[120px]">تاريخ المراجعة</th>
              <th className="min-w-[160px]">
                <SortableHeader
                  label="النوع"
                  sortKey="type"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggle={toggleSort}
                />
              </th>
              <th className="min-w-[220px]">
                <SortableHeader
                  label="المجلد"
                  sortKey="folder"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggle={toggleSort}
                />
              </th>
              <th className="min-w-[120px] text-center">
                <SortableHeader
                  label="التقارير"
                  sortKey="reports"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggle={toggleSort}
                  className="justify-center"
                />
              </th>
              <th className="min-w-[140px]">
                <SortableHeader
                  label="تاريخ الإنشاء"
                  sortKey="created"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggle={toggleSort}
                />
              </th>
              <th className="min-w-[160px] text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  لا توجد نماذج
                </td>
              </tr>
            ) : (
              pagedRows.map((row, index) => (
                <tr key={row.template.id}>
                  <td className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                    {offset + index + 1}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => navigate(formsReportsTemplateReportsPath(row.template.id))}
                      className="text-right font-medium text-emerald-700 transition hover:underline dark:text-emerald-400"
                      title="عرض تقارير هذا النموذج"
                    >
                      {row.displayName}
                    </button>
                  </td>
                  <td className="font-mono text-[11px]">{row.docCode}</td>
                  <td className="text-center">{row.issueNo}</td>
                  <td className="text-center">{row.reviewNo}</td>
                  <td className="text-center">{row.issueDate}</td>
                  <td className="text-center">{row.reviewDate}</td>
                  <td>{row.typeName}</td>
                  <td className="max-w-[280px] truncate" title={row.folderPath}>
                    {row.folderPath}
                  </td>
                  <td className="text-center">{row.reportsCount}</td>
                  <td className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                    {formatDate(row.template.created_at, 'dd/MM/yyyy')}
                  </td>
                  <td className="text-center">
                    <div className="inline-flex items-center justify-center gap-2">
                      {can('forms_reports', 'edit') && (
                        <button
                          type="button"
                          onClick={() => navigate(`/forms/edit/${row.template.id}`)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          title="تعديل النموذج"
                          aria-label="تعديل النموذج"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                      {can('forms_reports', 'create') && (
                        <button
                          type="button"
                          onClick={() => navigate(`/reports/new/${row.template.id}`)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white transition hover:bg-emerald-700"
                          title="تقرير جديد"
                          aria-label="تقرير جديد"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      )}
                      {(can('forms_reports', 'archive') || can('forms_reports', 'delete')) && (
                        <button
                          type="button"
                          onClick={() => void handleToggleArchive(row.template)}
                          disabled={templateActionId === row.template.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          title={row.template.archived ? 'استرجاع النموذج' : 'أرشفة النموذج'}
                          aria-label={row.template.archived ? 'استرجاع النموذج' : 'أرشفة النموذج'}
                        >
                          {row.template.archived ? (
                            <ArrowUturnLeftIcon className="h-4 w-4" />
                          ) : (
                            <ArchiveBoxIcon className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {can('forms_reports', 'delete') && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteTemplate(row.template)}
                          disabled={templateActionId === row.template.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                          title="حذف النموذج"
                          aria-label="حذف النموذج"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataGrid>
    </div>
  );
}
