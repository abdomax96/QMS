/**
 * Documents Page - نظام التحكم بالوثائق
 * Document Control System - SOPs, Work Instructions, Manuals
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DocumentTextIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ArchiveBoxIcon,
    EyeIcon,
    PencilIcon,
    TrashIcon,
    DocumentDuplicateIcon,
    ArrowPathIcon,
    PrinterIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';
import { documentService, type Document } from '../../services/documentService';
import DocumentForm from '../../components/documents/DocumentForm';
import { useToastStore } from '../../store/toastStore';
import { useCompanyStore } from '../../store/companyStore';
import { usePermissions } from '../../hooks/usePermissions';
import { cn } from '../../utils';

const DOCUMENT_TYPES = [
    { value: 'sop', label: 'إجراء تشغيل قياسي (SOP)', color: 'blue' },
    { value: 'work_instruction', label: 'تعليمات العمل', color: 'green' },
    { value: 'manual', label: 'دليل', color: 'purple' },
    { value: 'form', label: 'نموذج', color: 'yellow' },
    { value: 'policy', label: 'سياسة', color: 'red' },
    { value: 'specification', label: 'مواصفة', color: 'indigo' },
    { value: 'other', label: 'أخرى', color: 'gray' }
];

const STATUS_CONFIG = {
    draft: { label: 'مسودة', color: 'gray', bgClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: PencilIcon },
    pending_review: { label: 'قيد المراجعة', color: 'yellow', bgClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: ClockIcon },
    approved: { label: 'معتمد', color: 'green', bgClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircleIcon },
    obsolete: { label: 'ملغى', color: 'red', bgClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', icon: ExclamationCircleIcon },
    archived: { label: 'مؤرشف', color: 'slate', bgClass: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400', icon: ArchiveBoxIcon }
};

const TYPE_COLORS: Record<string, string> = {
    sop: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    work_instruction: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    manual: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    form: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    policy: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    specification: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
};

export default function DocumentsPage() {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const { can } = usePermissions();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showFiltersMobile, setShowFiltersMobile] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingDocument, setEditingDocument] = useState<Document | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { addToast } = useToastStore();
    const { selectedCompany } = useCompanyStore();
    const [printingId, setPrintingId] = useState<string | null>(null);

    // Fetch documents
    useEffect(() => {
        fetchDocuments();
    }, [filterType, filterStatus]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const data = await documentService.getDocuments({
                type: filterType as any || undefined,
                status: filterStatus as any || undefined
            });
            setDocuments(data);
        } catch (err: any) {
            console.error('Error fetching documents:', err);
            addToast({ type: 'error', message: 'فشل تحميل الوثائق' });
        } finally {
            setLoading(false);
        }
    };

    // Filter by search
    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.document_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.title_ar && doc.title_ar.includes(searchQuery))
    );

    const getTypeConfig = (type: string) =>
        DOCUMENT_TYPES.find(t => t.value === type) || DOCUMENT_TYPES[6];

    const getStatusConfig = (status: string) =>
        STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;

    const getTypeBadgeClass = (type: string) =>
        TYPE_COLORS[type] || TYPE_COLORS.other;

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه الوثيقة؟')) return;

        try {
            setDeletingId(id);
            await documentService.deleteDocument(id);
            addToast({ type: 'success', message: 'تم حذف الوثيقة بنجاح' });
            await fetchDocuments();
        } catch (err: any) {
            console.error('Error deleting document:', err);
            addToast({ type: 'error', message: 'فشل حذف الوثيقة' });
        } finally {
            setDeletingId(null);
        }
    };

    const handleCreateSuccess = (doc: Document) => {
        fetchDocuments();
        // Redirect to editor for new documents
        navigate(`/documents/${doc.id}`);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilterType('');
        setFilterStatus('');
    };

    const handlePrint = async (doc: Document) => {
        setPrintingId(doc.id);
        try {
            // Fetch latest version to get content
            const versions = await documentService.getVersions(doc.id);
            const content = versions.length > 0 ? versions[0].content || '' : '';

            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html dir="rtl" lang="ar">
                    <head>
                        <meta charset="UTF-8">
                        <title>طباعة الوثيقة</title>
                        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
                        <style>
                            @page {
                                size: A4;
                                margin: 10mm;
                            }
                            @media print {
                                html, body {
                                    margin: 0 !important;
                                    padding: 0 !important;
                                }
                                thead { display: table-header-group; } 
                                tfoot { display: table-footer-group; }
                                button { display: none !important; }
                            }
                            * {
                                margin: 0;
                                padding: 0;
                                box-sizing: border-box;
                            }
                            body {
                                font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif;
                                font-size: 14px;
                                    line-height: 1.8;
                                    direction: rtl;
                                    text-align: right;
                                    color: #1f2937;
                                    padding: 0;
                                }
                                /* Layout Table */
                                .print-layout {
                                    width: 100%;
                                    border-collapse: collapse;
                                }
                                
                                .print-header-content {
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    padding: 10px 10mm;
                                    border-bottom: 2px solid #374151;
                                    margin-bottom: 20px;
                                }
                                .header-title {
                                    font-size: 14px;
                                    font-weight: bold;
                                }
                                
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

                                /* Force Repeat Headers */
                                thead { display: table-header-group; }
                                tfoot { display: table-footer-group; }
                                tr { page-break-inside: avoid; break-inside: avoid; }

                                .content-wrapper {
                                    padding: 0 10mm 0 10mm;
                                }
                                
                                .content p { margin: 0.5em 0; }
                                .content h1 { font-size: 18pt; font-weight: bold; margin: 1em 0 0.5em; }
                                .content h2 { font-size: 16pt; font-weight: bold; margin: 0.8em 0 0.4em; }
                                .content h3 { font-size: 14pt; font-weight: bold; margin: 0.6em 0 0.3em; }
                                .content ul, .content ol { padding-right: 2em; margin: 0.5em 0; }
                                .content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                                .content td, .content th { border: 1px solid #374151; padding: 8px 12px; text-align: right; }
                                .content th { background: #e8e8e8; font-weight: bold; }
                                .mce-pagebreak {
                                    page-break-after: always;
                                    display: block;
                                    border: none;
                                    height: 0;
                                }
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
                                        <div class="content-wrapper content">
                                            ${content}
                                        </div>
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
                                setTimeout(function() {
                                    window.close();
                                }, 500);
                            };
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            }
        } catch (error) {
            console.error('Print error:', error);
            addToast({ type: 'error', message: 'فشل عملية الطباعة' });
        } finally {
            setPrintingId(null);
        }
    };

    // Statistics
    const stats = {
        total: documents.length,
        draft: documents.filter(d => d.status === 'draft').length,
        pending: documents.filter(d => d.status === 'pending_review').length,
        approved: documents.filter(d => d.status === 'approved').length,
        obsolete: documents.filter(d => d.status === 'obsolete').length
    };
    const hasActiveFilters = Boolean(searchQuery || filterType || filterStatus);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:gap-5 md:flex-row md:items-center md:justify-between mb-6">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <DocumentTextIcon className="w-7 h-7 sm:w-8 sm:h-8 text-primary-600 shrink-0" />
                        <span className="truncate">التحكم بالوثائق</span>
                    </h1>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                        إدارة الإجراءات والتعليمات والسياسات
                    </p>
                </div>
                <div className="w-full md:w-auto overflow-x-auto pb-1 -mx-1 px-1 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
                    <div className="flex items-center gap-2 min-w-max md:min-w-0">
                        <button
                            onClick={fetchDocuments}
                            className="min-h-[40px] min-w-[40px] p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="تحديث"
                        >
                            <ArrowPathIcon className={cn("w-5 h-5", loading && "animate-spin")} />
                        </button>
                        {can('documents', 'create') && (
                            <button
                                onClick={() => {
                                    setEditingDocument(null);
                                    setShowFormModal(true);
                                }}
                                className="min-h-[40px] whitespace-nowrap flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                            >
                                <PlusIcon className="w-5 h-5" />
                                وثيقة جديدة
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">إجمالي الوثائق</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-bold text-slate-600">{stats.draft}</div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <PencilIcon className="w-4 h-4" /> مسودات
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-bold text-amber-600">{stats.pending}</div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" /> قيد المراجعة
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{stats.approved}</div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <CheckCircleIcon className="w-4 h-4" /> معتمدة
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-bold text-red-600">{stats.obsolete}</div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <ExclamationCircleIcon className="w-4 h-4" /> ملغاة
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="md:hidden flex items-center justify-between mb-3">
                    <button
                        type="button"
                        onClick={() => setShowFiltersMobile((prev) => !prev)}
                        className="min-h-[38px] inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200"
                    >
                        <FunnelIcon className="w-4 h-4" />
                        {showFiltersMobile ? 'إخفاء الفلاتر' : 'إظهار الفلاتر'}
                    </button>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {filteredDocs.length} نتيجة
                    </span>
                </div>

                <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4", !showFiltersMobile && "hidden md:grid")}>
                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="بحث عن وثيقة..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pr-10 pl-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    {/* Type Filter */}
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">كل الأنواع</option>
                        {DOCUMENT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">كل الحالات</option>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>
                </div>

                {hasActiveFilters && (
                    <div className="mt-3 flex md:hidden">
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="w-full min-h-[38px] px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        >
                            مسح الفلاتر
                        </button>
                    </div>
                )}

                <div className="hidden md:flex items-center justify-between mt-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>{filteredDocs.length} نتيجة</span>
                    {hasActiveFilters ? (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        >
                            مسح الفلاتر
                        </button>
                    ) : (
                        <span />
                    )}
                </div>
            </div>

            {/* Documents Grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 mt-4 sm:mt-6">
                    <DocumentDuplicateIcon className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">لا توجد وثائق</h3>
                    <p className="text-slate-500 dark:text-slate-400">ابدأ بإنشاء وثيقة جديدة</p>
                    <button
                        onClick={() => {
                            setEditingDocument(null);
                            setShowFormModal(true);
                        }}
                        className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        <PlusIcon className="w-5 h-5 inline-block mr-1" />
                        وثيقة جديدة
                    </button>
                </div>
            ) : (
                <div className="space-y-4 mt-4 sm:mt-6">
                    <div className="md:hidden space-y-3">
                        {filteredDocs.map((doc) => {
                            const typeConfig = getTypeConfig(doc.type);
                            const statusConfig = getStatusConfig(doc.status);
                            const canDeleteOrArchive =
                                (doc.status === 'approved' && can('documents', 'archive')) ||
                                (doc.status !== 'approved' && can('documents', 'delete'));

                            return (
                                <div
                                    key={doc.id}
                                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <button
                                            onClick={() => navigate(`/documents/${doc.id}`)}
                                            className="min-w-0 text-right"
                                        >
                                            <p className="font-semibold text-slate-900 dark:text-white line-clamp-2">{doc.title}</p>
                                            <p className="text-xs text-slate-500 font-mono mt-1">{doc.document_number}</p>
                                        </button>
                                        <span className="text-xs text-slate-500 whitespace-nowrap">
                                            {new Date(doc.updated_at).toLocaleDateString('ar-EG')}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={cn("inline-flex px-2.5 py-1 rounded-full text-xs font-medium", getTypeBadgeClass(doc.type))}>
                                            {typeConfig.label}
                                        </span>
                                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", statusConfig.bgClass)}>
                                            <statusConfig.icon className="w-3.5 h-3.5" />
                                            {statusConfig.label}
                                        </span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                            v{doc.current_version}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <button
                                            onClick={() => navigate(`/documents/${doc.id}`)}
                                            className="h-10 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                            عرض
                                        </button>

                                        <button
                                            onClick={() => handlePrint(doc)}
                                            disabled={printingId === doc.id}
                                            className="h-10 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm disabled:opacity-60"
                                        >
                                            {printingId === doc.id ? (
                                                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <PrinterIcon className="w-4 h-4" />
                                            )}
                                            طباعة
                                        </button>

                                        {can('documents', 'edit') && (
                                            <button
                                                onClick={() => {
                                                    setEditingDocument(doc);
                                                    setShowFormModal(true);
                                                }}
                                                className="h-10 inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                                تعديل
                                            </button>
                                        )}

                                        {canDeleteOrArchive && (
                                            <button
                                                onClick={() => handleDelete(doc.id)}
                                                disabled={deletingId === doc.id}
                                                className="h-10 inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm disabled:opacity-60"
                                            >
                                                {deletingId === doc.id ? (
                                                    <div className="w-4 h-4 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
                                                ) : doc.status === 'approved' ? (
                                                    <ArchiveBoxIcon className="w-4 h-4" />
                                                ) : (
                                                    <TrashIcon className="w-4 h-4" />
                                                )}
                                                {doc.status === 'approved' ? 'أرشفة' : 'حذف'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto">
                        <table className="w-full min-w-[860px] text-sm text-right">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4">رقم الوثيقة</th>
                                    <th className="px-6 py-4">العنوان</th>
                                    <th className="px-6 py-4">النوع</th>
                                    <th className="px-6 py-4">الحالة</th>
                                    <th className="px-6 py-4">الإصدار</th>
                                    <th className="px-6 py-4">آخر تحديث</th>
                                    <th className="px-6 py-4">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredDocs.map((doc) => {
                                    const typeConfig = getTypeConfig(doc.type);
                                    const statusConfig = getStatusConfig(doc.status);
                                    return (
                                        <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {doc.document_number}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white min-w-[280px]">
                                                {doc.title}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn("inline-flex px-2 py-1 rounded-full text-xs font-medium", getTypeBadgeClass(doc.type))}>
                                                    {typeConfig.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium", statusConfig.bgClass)}>
                                                    <statusConfig.icon className="w-3.5 h-3.5" />
                                                    {statusConfig.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                v{doc.current_version}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                                {new Date(doc.updated_at).toLocaleDateString('ar-EG')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={() => navigate(`/documents/${doc.id}`)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-700 rounded-md" title="عرض">
                                                        <EyeIcon className="w-5 h-5" />
                                                    </button>

                                                    {can('documents', 'edit') && (
                                                        <button onClick={() => { setEditingDocument(doc); setShowFormModal(true); }} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-700 rounded-md" title="تعديل">
                                                            <PencilIcon className="w-5 h-5" />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handlePrint(doc)}
                                                        disabled={printingId === doc.id}
                                                        className="p-1.5 text-slate-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md disabled:opacity-60"
                                                        title="طباعة"
                                                    >
                                                        {printingId === doc.id ? (
                                                            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <PrinterIcon className="w-5 h-5" />
                                                        )}
                                                    </button>

                                                    {/* Delete/Archive Button */}
                                                    {/* Logic: Approved docs need 'archive' permission, others need 'delete' */}
                                                    {((doc.status === 'approved' && can('documents', 'archive')) ||
                                                        (doc.status !== 'approved' && can('documents', 'delete'))) && (
                                                            <button
                                                                onClick={() => handleDelete(doc.id)}
                                                                disabled={deletingId === doc.id}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md disabled:opacity-60"
                                                                title={doc.status === 'approved' ? 'أرشفة' : 'حذف'}
                                                            >
                                                                {deletingId === doc.id ? (
                                                                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                                                ) : doc.status === 'approved' ? (
                                                                    <ArchiveBoxIcon className="w-5 h-5" />
                                                                ) : (
                                                                    <TrashIcon className="w-5 h-5" />
                                                                )}
                                                            </button>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Document Form Modal */}
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
