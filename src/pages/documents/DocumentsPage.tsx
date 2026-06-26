/**
 * Documents Page - نظام التحكم بالوثائق
 * Document Control System - SOPs, Work Instructions, Manuals
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { documentService, type Document } from '../../services/documentService';
import DocumentForm from '../../components/documents/DocumentForm';
import { useToastStore } from '../../store/toastStore';
import { useCompanyStore } from '../../store/companyStore';
import { usePermissions } from '../../hooks/usePermissions';
import { cn } from '../../utils';
import DataGrid from '../../components/data-grid/DataGrid';
import SortableHeader from '../../components/data-grid/SortableHeader';
import TablePager from '../../components/data-grid/TablePager';
import { TableSkeleton } from '../../components/common/LoadingStates';
import { usePaginatedRows } from '../../hooks/usePaginatedRows';
import {
  createDateSorter,
  createNumberSorter,
  createTextSorter,
  useSortableRows,
} from '../../hooks/useSortableRows';

const DOCUMENT_TYPES = [
  { value: 'sop', label: 'إجراء تشغيل قياسي (SOP)', color: 'blue' },
  { value: 'work_instruction', label: 'تعليمات العمل', color: 'green' },
  { value: 'manual', label: 'دليل', color: 'purple' },
  { value: 'form', label: 'نموذج', color: 'yellow' },
  { value: 'policy', label: 'سياسة', color: 'red' },
  { value: 'specification', label: 'مواصفة', color: 'indigo' },
  { value: 'other', label: 'أخرى', color: 'gray' },
];

const STATUS_CONFIG = {
  draft: {
    label: 'مسودة',
    color: 'gray',
    bgClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    icon: PencilIcon,
  },
  pending_review: {
    label: 'قيد المراجعة',
    color: 'yellow',
    bgClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: ClockIcon,
  },
  approved: {
    label: 'معتمد',
    color: 'green',
    bgClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: CheckCircleIcon,
  },
  obsolete: {
    label: 'ملغى',
    color: 'red',
    bgClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    icon: ExclamationCircleIcon,
  },
  archived: {
    label: 'مؤرشف',
    color: 'slate',
    bgClass: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    icon: ArchiveBoxIcon,
  },
} as const;

const TYPE_COLORS: Record<string, string> = {
  sop: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  work_instruction: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  manual: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  form: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  policy: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  specification: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const getTypeConfig = (type: string) =>
  DOCUMENT_TYPES.find((item) => item.value === type) || DOCUMENT_TYPES[DOCUMENT_TYPES.length - 1];

const getStatusConfig = (status: string) => {
  const entry = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  return entry || STATUS_CONFIG.draft;
};

const getTypeBadgeClass = (type: string) => TYPE_COLORS[type] || TYPE_COLORS.other;

export default function DocumentsPage() {
  const navigate = useNavigate();
  const toast = useToastStore((state) => state.addToast);
  const { selectedCompany } = useCompanyStore();
  const { can } = usePermissions();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const data = await documentService.getDocuments({
          type: (filterType as any) || undefined,
          status: (filterStatus as any) || undefined,
          include_archived: filterStatus === 'archived',
        });
        setDocuments(data);
      } catch (error) {
        console.error('Error fetching documents:', error);
        toast({ type: 'error', message: 'فشل تحميل الوثائق' });
      } finally {
        if (mode === 'initial') {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [filterStatus, filterType, toast]
  );

  useEffect(() => {
    void fetchDocuments('initial');
  }, [fetchDocuments, filterType, filterStatus]);

  const filteredDocs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return documents;

    return documents.filter((doc) => {
      const haystacks = [
        doc.title,
        doc.title_ar,
        doc.document_number,
        doc.type,
        doc.status,
        doc.department?.name,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      return haystacks.some((value) => value.includes(query));
    });
  }, [documents, searchQuery]);

  const documentSorters = useMemo(
    () => ({
      number: createTextSorter<Document>((doc) => doc.document_number),
      title: createTextSorter<Document>((doc) => doc.title_ar || doc.title),
      type: createTextSorter<Document>((doc) => getTypeConfig(doc.type).label),
      status: createTextSorter<Document>((doc) => getStatusConfig(doc.status).label),
      version: createNumberSorter<Document>((doc) => doc.current_version),
      department: createTextSorter<Document>((doc) => doc.department?.name || ''),
      updated: createDateSorter<Document>((doc) => doc.updated_at),
    }),
    []
  );

  const { sortedRows: sortedDocs, sortKey, sortDirection, toggleSort } = useSortableRows({
    rows: filteredDocs,
    sorters: documentSorters,
    initialSortKey: 'updated',
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
    rows: sortedDocs,
    initialPageSize: 20,
  });

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('');
    setFilterStatus('');
    setPage(1);
  };

  const handleDelete = async (doc: Document) => {
    const confirmMessage =
      doc.status === 'archived'
        ? 'هل أنت متأكد من حذف هذه الوثيقة نهائياً؟'
        : doc.status === 'approved'
          ? 'هل أنت متأكد من أرشفة هذه الوثيقة؟'
          : 'هل أنت متأكد من حذف هذه الوثيقة؟';

    if (!window.confirm(confirmMessage)) return;

    try {
      setDeletingId(doc.id);
      if (doc.status === 'archived') {
        await documentService.permanentlyDeleteDocument(doc.id);
        toast({ type: 'success', message: 'تم حذف الوثيقة نهائياً' });
      } else {
        await documentService.deleteDocument(doc.id);
        toast({ type: 'success', message: 'تم أرشفة الوثيقة' });
      }
      await fetchDocuments('refresh');
    } catch (err: any) {
      console.error('Error deleting document:', err);
      toast({ type: 'error', message: err?.message || 'فشل حذف الوثيقة' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateSuccess = (doc: Document) => {
    void fetchDocuments('refresh');
    navigate(`/documents/${doc.id}`);
  };

  const handlePrint = async (doc: Document) => {
    setPrintingId(doc.id);
    try {
      const versions = await documentService.getVersions(doc.id);
      const latestVersion = versions[0];

      if (!latestVersion || !latestVersion.content) {
        toast({ type: 'error', message: 'لا يوجد محتوى للطباعة' });
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({ type: 'error', message: 'فشل فتح نافذة الطباعة' });
        return;
      }

      const content = latestVersion.content;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${doc.title}</title>
          <style>
            @media print {
              html, body { margin: 0 !important; padding: 0 !important; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
              button { display: none !important; }
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif;
              font-size: 14px;
              line-height: 1.8;
              direction: rtl;
              text-align: right;
              color: #1f2937;
              padding: 0;
            }
            .print-layout { width: 100%; border-collapse: collapse; }
            .print-header-content {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 10mm;
              border-bottom: 2px solid #374151;
              margin-bottom: 20px;
            }
            .header-title { font-size: 14px; font-weight: bold; }
            .print-footer-content {
              display: flex;
              justify-content: space-between;
              padding: 10px 10mm;
              border-top: 2px solid #374151;
              background: white;
              margin-top: 20px;
              font-size: 14px;
              font-weight: bold;
            }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            .content-wrapper { padding: 0 10mm 0 10mm; }
            .content p { margin: 0.5em 0; }
            .content h1 { font-size: 18pt; font-weight: bold; margin: 1em 0 0.5em; }
            .content h2 { font-size: 16pt; font-weight: bold; margin: 0.8em 0 0.4em; }
            .content h3 { font-size: 14pt; font-weight: bold; margin: 0.6em 0 0.3em; }
            .content ul, .content ol { padding-right: 2em; margin: 0.5em 0; }
            .content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
            .content td, .content th { border: 1px solid #374151; padding: 8px 12px; text-align: right; }
            .content th { background: #e8e8e8; font-weight: bold; }
            .mce-pagebreak { page-break-after: always; display: block; border: none; height: 0; }
          </style>
        </head>
        <body>
          <table class="print-layout">
            <thead>
              <tr>
                <td>
                  <div class="print-header-content">
                    <span>رقم الوثيقة: ${doc.document_number || '---'}</span>
                    <span class="header-title">${doc.title || 'عنوان الوثيقة'}</span>
                    <span>الإصدار: ${doc.current_version || 1}</span>
                  </div>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div class="content-wrapper content">${content}</div>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <div class="print-footer-content">
                    <span>${selectedCompany?.name || 'الشركة'}</span>
                    <span>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Print error:', error);
      toast({ type: 'error', message: 'فشل عملية الطباعة' });
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <div className="space-y-4 p-3 sm:p-4" dir="rtl">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <DocumentTextIcon className="h-5 w-5 text-primary-600" />
            <span className="truncate">التحكم بالوثائق</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchDocuments('refresh')}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>

          {can('documents', 'create') && (
            <button
              type="button"
              onClick={() => {
                setEditingDocument(null);
                setShowFormModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <PlusIcon className="h-4 w-4" />
              وثيقة جديدة
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
        <label className="relative block">
          <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="بحث بالعنوان أو الرقم أو القسم"
            className="w-full rounded-md border border-slate-300 bg-white py-2.5 pr-10 pl-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
          />
        </label>

        <select
          value={filterType}
          onChange={(event) => {
            setFilterType(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
        >
          <option value="">كل الأنواع</option>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(event) => {
            setFilterStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
        >
          <option value="">كل الحالات (بدون المؤرشف)</option>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <option key={status} value={status}>
              {config.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          title="مسح الفلاتر"
        >
          <XMarkIcon className="h-4 w-4" />
          مسح
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
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
                <th className="min-w-[160px]">
                  <SortableHeader
                    label="رقم الوثيقة"
                    sortKey="number"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onToggle={toggleSort}
                  />
                </th>
                <th className="min-w-[260px]">
                  <SortableHeader
                    label="العنوان"
                    sortKey="title"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onToggle={toggleSort}
                  />
                </th>
                <th className="min-w-[200px]">
                  <SortableHeader
                    label="النوع"
                    sortKey="type"
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
                <th className="w-24 text-center">
                  <SortableHeader
                    label="الإصدار"
                    sortKey="version"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onToggle={toggleSort}
                  />
                </th>
                <th className="min-w-[160px]">
                  <SortableHeader
                    label="القسم"
                    sortKey="department"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onToggle={toggleSort}
                  />
                </th>
                <th className="min-w-[140px]">
                  <SortableHeader
                    label="آخر تحديث"
                    sortKey="updated"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onToggle={toggleSort}
                  />
                </th>
                <th className="w-44">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-slate-500">
                    لا توجد بيانات
                  </td>
                </tr>
              ) : (
                pagedRows.map((doc, index) => {
                  const typeConfig = getTypeConfig(doc.type);
                  const statusConfig = getStatusConfig(doc.status);
                  const canDeleteOrArchive =
                    (doc.status === 'approved' && (can('documents', 'archive') || can('documents', 'delete'))) ||
                    (doc.status !== 'approved' && can('documents', 'delete'));

                  return (
                    <tr key={doc.id}>
                      <td className="text-center text-slate-400">{offset + index + 1}</td>
                      <td className="font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {doc.document_number}
                      </td>
                      <td className="min-w-[260px]">
                        <button
                          type="button"
                          onClick={() => navigate(`/documents/${doc.id}`)}
                          className="text-right font-medium text-slate-900 hover:underline dark:text-white"
                          title="فتح"
                        >
                          {doc.title}
                        </button>
                        {doc.title_ar && doc.title_ar !== doc.title ? (
                          <div className="text-[11px] text-slate-500 line-clamp-1">{doc.title_ar}</div>
                        ) : null}
                      </td>
                      <td>
                        <span className={cn('inline-flex px-2 py-1 rounded-full text-[11px] font-medium', getTypeBadgeClass(doc.type))}>
                          {typeConfig.label}
                        </span>
                      </td>
                      <td>
                        <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium', statusConfig.bgClass)}>
                          <statusConfig.icon className="h-3.5 w-3.5" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="text-center text-slate-600 dark:text-slate-300">{doc.current_version || 1}</td>
                      <td className="text-slate-600 dark:text-slate-300">{doc.department?.name || '-'}</td>
                      <td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {new Date(doc.updated_at).toLocaleDateString('ar-EG')}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/documents/${doc.id}`)}
                            className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-800 rounded-md"
                            title="عرض"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>

                          {can('documents', 'edit') && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDocument(doc);
                                setShowFormModal(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-800 rounded-md"
                              title="تعديل"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void handlePrint(doc)}
                            disabled={printingId === doc.id}
                            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md disabled:opacity-60"
                            title="طباعة"
                          >
                            {printingId === doc.id ? (
                              <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <PrinterIcon className="h-4 w-4" />
                            )}
                          </button>

                          {canDeleteOrArchive && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(doc)}
                              disabled={deletingId === doc.id}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md disabled:opacity-60"
                              title={doc.status === 'approved' ? 'أرشفة' : doc.status === 'archived' ? 'حذف نهائي' : 'حذف'}
                            >
                              {deletingId === doc.id ? (
                                <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                              ) : doc.status === 'approved' ? (
                                <ArchiveBoxIcon className="h-4 w-4" />
                              ) : (
                                <TrashIcon className="h-4 w-4" />
                              )}
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
      )}

      <DocumentForm
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingDocument(null);
        }}
        onSuccess={handleCreateSuccess}
        editDocument={editingDocument}
      />
    </div>
  );
}

