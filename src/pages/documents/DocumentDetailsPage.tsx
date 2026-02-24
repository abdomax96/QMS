/**
 * Document Details Page - صفحة تفاصيل الوثيقة
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    DocumentTextIcon,
    ArrowRightIcon,
    PencilIcon,
    TrashIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    PaperAirplaneIcon,
    ArchiveBoxIcon,
    DocumentDuplicateIcon,
    DocumentPlusIcon,
    ChevronDownIcon,
    UserIcon,
    CalendarIcon,
    TagIcon,
    BuildingOfficeIcon,
    PrinterIcon
} from '@heroicons/react/24/outline';
import { documentService, type Document, type DocumentVersion } from '../../services/documentService';
import DocumentForm from '../../components/documents/DocumentForm';
import DocumentVariables from '../../components/documents/DocumentVariables';
import TinyMCEDocumentEditor from '../../components/documents/TinyMCEDocumentEditor';
import { useToastStore } from '../../store/toastStore';
import { useCompanyStore } from '../../store/companyStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useVariables } from '../../hooks/useVariables';
import { variableService } from '../../services/variableService';
import { cn } from '../../utils';
import './DocumentDetailsPage.css';

const STATUS_CONFIG = {
    draft: { label: 'مسودة', color: 'gray', bgClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: PencilIcon },
    pending_review: { label: 'قيد المراجعة', color: 'yellow', bgClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: ClockIcon },
    approved: { label: 'معتمد', color: 'green', bgClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircleIcon },
    obsolete: { label: 'ملغى', color: 'red', bgClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', icon: ExclamationCircleIcon },
    archived: { label: 'مؤرشف', color: 'slate', bgClass: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400', icon: ArchiveBoxIcon }
};

const TYPE_LABELS: Record<string, string> = {
    sop: 'إجراء تشغيل قياسي (SOP)',
    work_instruction: 'تعليمات العمل',
    manual: 'دليل',
    form: 'نموذج',
    policy: 'سياسة',
    specification: 'مواصفة',
    other: 'أخرى'
};

export default function DocumentDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToast } = useToastStore();
    const { selectedCompany } = useCompanyStore();
    const { can } = usePermissions();

    const [document, setDocument] = useState<Document | null>(null);
    const [versions, setVersions] = useState<DocumentVersion[]>([]);
    const [latestVersion, setLatestVersion] = useState<DocumentVersion | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showVersions, setShowVersions] = useState(false);
    const [showMobileDetails, setShowMobileDetails] = useState(false);
    const [showMobileVariables, setShowMobileVariables] = useState(false);
    const [showMobileActions, setShowMobileActions] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Editor State
    const [isEditing, setIsEditing] = useState(false);
    const [editorContent, setEditorContent] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Variables resolution
    const { data: globalVariables } = useVariables();
    const [resolvedContent, setResolvedContent] = useState('');

    useEffect(() => {
        const updateContent = async () => {
            if (latestVersion?.content) {
                const content = await variableService.resolveVariablesInContent(latestVersion.content, globalVariables);
                setResolvedContent(content);
            } else {
                setResolvedContent('');
            }
        };
        updateContent();
    }, [latestVersion, globalVariables]);

    // Fetch document and versions
    useEffect(() => {
        if (!id) return;
        fetchDocument();
    }, [id]);

    useEffect(() => {
        setShowMobileActions(false);
    }, [isEditing, document?.status]);

    const fetchDocument = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [doc, vers] = await Promise.all([
                documentService.getDocument(id),
                documentService.getVersions(id)
            ]);
            setDocument(doc);
            setVersions(vers);
            if (vers.length > 0) {
                setLatestVersion(vers[0]);
                setEditorContent(vers[0].content || '');

                // If it's a draft and newly created (no content or explicitly passed state), enter edit mode
                // For now, we'll just check if it's a draft and empty content maybe?
            }

            // Log access
            if (doc) {
                documentService.logAccess(id, 'view');
            }
        } catch (err: any) {
            console.error('Error fetching document:', err);
            addToast({ type: 'error', message: 'فشل تحميل الوثيقة' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveContent = async () => {
        if (!latestVersion) return;

        setActionLoading('save');
        try {
            // Check if latest version is editable (draft or rejected)
            if (latestVersion.status === 'draft' || latestVersion.status === 'rejected') {
                // Update existing version
                await documentService.updateVersion(latestVersion.id, {
                    content: editorContent
                });
                addToast({ type: 'success', message: 'تم حفظ المسودة' });
                setHasUnsavedChanges(false);
            } else if (can('documents', 'edit_after_approval')) {
                // User has permission to edit after approval - update the approved version
                await documentService.updateVersion(latestVersion.id, {
                    content: editorContent
                });
                addToast({ type: 'success', message: 'تم حفظ التعديلات على الوثيقة المعتمدة' });
                setHasUnsavedChanges(false);
            } else {
                // Create new version (if trying to edit an approved one - though UI should probably prevent this or ask for confirmation)
                // For this workflow, let's assume we are editing the current draft.
                addToast({ type: 'warning', message: 'لا يمكن تعديل إصدار معتمد مباشرة. يرجى إنشاء إصدار جديد.' });
            }
            fetchDocument(); // Refresh versions
        } catch (err: any) {
            console.error('Error saving content:', err);
            addToast({ type: 'error', message: 'فشل حفظ المحتوى' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleSubmitForReview = async () => {
        if (!document) return;

        // Save first if needed
        if (hasUnsavedChanges) {
            await handleSaveContent();
        }

        setActionLoading('submit');
        try {
            await documentService.submitForReview(document.id);
            addToast({ type: 'success', message: 'تم إرسال الوثيقة للمراجعة' });
            setIsEditing(false); // Make sure to exit edit mode
            fetchDocument();
        } catch (err: any) {
            addToast({ type: 'error', message: err.message || 'فشل الإرسال' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleApprove = async () => {
        if (!document) return;
        setActionLoading('approve');
        try {
            await documentService.approveDocument(document.id);
            addToast({ type: 'success', message: 'تم اعتماد الوثيقة' });
            fetchDocument();
        } catch (err: any) {
            addToast({ type: 'error', message: err.message || 'فشل الاعتماد' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!document) return;
        const reason = prompt('سبب الرفض (اختياري):');
        if (reason === null) return; // User cancelled

        setActionLoading('reject');
        try {
            await documentService.rejectDocument(document.id, reason || undefined);
            addToast({ type: 'warning', message: 'تم رفض الوثيقة وإعادتها للمسودة' });
            fetchDocument();
        } catch (err: any) {
            addToast({ type: 'error', message: err.message || 'فشل الرفض' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleObsolete = async () => {
        if (!document || !confirm('هل أنت متأكد من إلغاء هذه الوثيقة؟')) return;
        setActionLoading('obsolete');
        try {
            await documentService.markObsolete(document.id);
            addToast({ type: 'success', message: 'تم إلغاء الوثيقة' });
            fetchDocument();
        } catch (err: any) {
            addToast({ type: 'error', message: err.message || 'فشل الإلغاء' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async () => {
        if (!document || !confirm('هل أنت متأكد من حذف هذه الوثيقة؟')) return;
        setActionLoading('delete');
        try {
            await documentService.deleteDocument(document.id);
            addToast({ type: 'success', message: 'تم أرشفة الوثيقة' });
            navigate('/documents');
        } catch (err: any) {
            addToast({ type: 'error', message: err.message || 'فشل الحذف' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreateNewVersion = async () => {
        if (!document) return;
        const summary = prompt('ملخص التغييرات في الإصدار الجديد:');
        if (summary === null) return;

        setActionLoading('new_version');
        try {
            await documentService.createNewVersion(document.id, summary);
            addToast({ type: 'success', message: 'تم إنشاء إصدار جديد بنجاح' });
            // Refresh to show new version
            await fetchDocument();
            // Automatically enter edit mode
            setIsEditing(true);
        } catch (err: any) {
            console.error('Error creating new version:', err);
            addToast({ type: 'error', message: err.message || 'فشل إنشاء إصدار جديد' });
        } finally {
            setActionLoading(null);
        }
    };

    const handlePrint = () => {
        if (!document) return;

        // Use resolved content for printing
        const content = resolvedContent || latestVersion?.content || '';
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
                                        <span>رقم الوثيقة: ${document.document_number || '---'}</span>
                                        <span class="header-title">${document.title || 'عنوان الوثيقة'}</span>
                                        <span>الإصدار: ${document.current_version || 1}</span>
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
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
            </div>
        );
    }

    if (!document) {
        return (
            <div className="p-6 text-center">
                <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-medium text-gray-600">الوثيقة غير موجودة</h2>
                <button
                    onClick={() => navigate('/documents')}
                    className="mt-4 text-primary-600 hover:underline"
                >
                    العودة للقائمة
                </button>
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[document.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
    const StatusIcon = statusConfig.icon;
    const isDraft = document.status === 'draft' || document.status === 'pending_review' || (latestVersion?.status === 'draft');
    const metadataRows = [
        { label: 'النوع', value: TYPE_LABELS[document.type] || '-' },
        { label: 'القسم', value: document.department?.name || '-' },
        { label: 'التصنيف', value: document.category || '-' }
    ];

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden"> {/* Full height minus header, no scroll */}
            {/* Top Bar - Always visible */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between shrink-0 z-10">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 w-full lg:w-auto">
                    <button
                        onClick={() => navigate('/documents')}
                        className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        title="عودة للقائمة"
                    >
                        <ArrowRightIcon className="w-5 h-5 text-gray-500" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate max-w-[65vw] sm:max-w-md" title={document.title}>
                                {document.title}
                            </h1>
                            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1", statusConfig.bgClass)}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 font-mono">
                            {document.document_number} • الإصدار {document.current_version}
                        </p>
                    </div>
                </div>

                <div className="w-full lg:w-auto flex flex-col gap-2">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 lg:overflow-visible lg:pb-0 lg:mx-0 lg:px-0">
                        {/* Print Button (Preview Mode) */}
                        {!isEditing && (
                            <button
                                onClick={handlePrint}
                                className="min-h-[40px] min-w-[40px] p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                                title="طباعة"
                            >
                                <PrinterIcon className="w-5 h-5" />
                            </button>
                        )}

                        {/* View/Edit Toggle */}
                        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex items-center">
                            <button
                                onClick={() => setIsEditing(false)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                    !isEditing
                                        ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                )}
                            >
                                معاينة
                            </button>
                            {(can('documents', 'edit') || can('documents', 'edit_after_approval')) && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    disabled={!isDraft && !can('documents', 'edit_after_approval')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                        isEditing
                                            ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
                                        (!isDraft && !can('documents', 'edit_after_approval')) && "opacity-50 cursor-not-allowed"
                                    )}
                                    title={(!isDraft && !can('documents', 'edit_after_approval')) ? "يمكن تعديل المسودات فقط" : ""}
                                >
                                    تحرير
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowMobileActions((prev) => !prev)}
                            className="lg:hidden min-h-[40px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 inline-flex items-center gap-1.5"
                        >
                            الإجراءات
                            <ChevronDownIcon className={cn("w-4 h-4 transition-transform", showMobileActions && "rotate-180")} />
                        </button>
                    </div>

                    <div className={cn("lg:hidden", !showMobileActions && "hidden")}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleSaveContent}
                                        disabled={actionLoading === 'save' || !hasUnsavedChanges}
                                        className={cn(
                                            "min-h-[40px] w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium",
                                            (actionLoading === 'save' || !hasUnsavedChanges) && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {actionLoading === 'save' ? 'جاري الحفظ...' : 'حفظ المسودة'}
                                    </button>
                                    <button
                                        onClick={handleSubmitForReview}
                                        disabled={actionLoading === 'submit'}
                                        className={cn(
                                            "min-h-[40px] w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium",
                                            actionLoading === 'submit' && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <PaperAirplaneIcon className="w-4 h-4" />
                                        إرسال للمراجعة
                                    </button>
                                </>
                            ) : (
                                <>
                                    {can('documents', 'edit') && (
                                        <button
                                            onClick={() => setShowEditModal(true)}
                                            className="min-h-[40px] w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                            تعديل البيانات
                                        </button>
                                    )}

                                    {document.status === 'approved' && can('documents', 'edit') && (
                                        <button
                                            onClick={handleCreateNewVersion}
                                            disabled={actionLoading === 'new_version'}
                                            className={cn(
                                                "min-h-[40px] w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium",
                                                actionLoading === 'new_version' && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <DocumentPlusIcon className="w-4 h-4" />
                                            إصدار جديد
                                        </button>
                                    )}
                                </>
                            )}

                            {document.status === 'pending_review' && !isEditing && can('documents', 'approve') && (
                                <>
                                    <button
                                        onClick={handleApprove}
                                        disabled={actionLoading === 'approve'}
                                        className={cn(
                                            "min-h-[40px] w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium",
                                            actionLoading === 'approve' && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <CheckCircleIcon className="w-4 h-4" />
                                        اعتماد
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={actionLoading === 'reject'}
                                        className={cn(
                                            "min-h-[40px] w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium",
                                            actionLoading === 'reject' && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <ExclamationCircleIcon className="w-4 h-4" />
                                        رفض
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-2 min-w-max lg:min-w-0">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleSaveContent}
                                    disabled={actionLoading === 'save' || !hasUnsavedChanges}
                                    className={cn(
                                        "min-h-[40px] whitespace-nowrap px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 text-sm font-medium",
                                        (actionLoading === 'save' || !hasUnsavedChanges) && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {actionLoading === 'save' ? 'جاري الحفظ...' : 'حفظ المسودة'}
                                </button>
                                <button
                                    onClick={handleSubmitForReview}
                                    disabled={actionLoading === 'submit'}
                                    className={cn(
                                        "min-h-[40px] whitespace-nowrap px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 text-sm font-medium",
                                        actionLoading === 'submit' && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                    إرسال للمراجعة
                                </button>
                            </>
                        ) : (
                            <>
                                {can('documents', 'edit') && (
                                    <button
                                        onClick={() => setShowEditModal(true)}
                                        className="min-h-[40px] min-w-[40px] p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                                        title="تعديل البيانات الأساسية"
                                    >
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                )}

                                {document.status === 'approved' && can('documents', 'edit') && (
                                    <button
                                        onClick={handleCreateNewVersion}
                                        disabled={actionLoading === 'new_version'}
                                        className={cn(
                                            "min-h-[40px] whitespace-nowrap px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium",
                                            actionLoading === 'new_version' && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <DocumentPlusIcon className="w-4 h-4" />
                                        إصدار جديد
                                    </button>
                                )}
                            </>
                        )}

                        {document.status === 'pending_review' && !isEditing && can('documents', 'approve') && (
                            <>
                                <button
                                    onClick={handleApprove}
                                    disabled={actionLoading === 'approve'}
                                    className={cn(
                                        "min-h-[40px] whitespace-nowrap px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm font-medium",
                                        actionLoading === 'approve' && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    اعتماد
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={actionLoading === 'reject'}
                                    className={cn(
                                        "min-h-[40px] whitespace-nowrap px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium",
                                        actionLoading === 'reject' && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <ExclamationCircleIcon className="w-4 h-4" />
                                    رفض
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900 flex flex-col xl:flex-row">

                {/* Editor / Viewer */}
                <div className={
                    cn(
                        "flex-1 min-w-0 relative bg-gray-100 dark:bg-gray-900 flex flex-col",
                        isEditing ? "overflow-hidden p-0 min-h-0" : "overflow-auto p-3 sm:p-6"
                    )
                }>
                    {!isEditing && (
                        <div className="xl:hidden mb-3 sm:mb-4 space-y-3">
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <button
                                    onClick={() => setShowMobileDetails(prev => !prev)}
                                    className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white"
                                >
                                    <span>تفاصيل الوثيقة</span>
                                    <ChevronDownIcon className={cn("w-4 h-4 transition-transform", showMobileDetails && "rotate-180")} />
                                </button>
                                {showMobileDetails && (
                                    <div className="px-4 pb-4 space-y-3 text-sm border-t border-gray-100 dark:border-gray-700">
                                        {metadataRows.map((row) => (
                                            <div key={row.label} className="flex justify-between gap-3 pt-3">
                                                <span className="text-gray-500">{row.label}:</span>
                                                <span className="text-gray-900 dark:text-white font-medium text-left">{row.value}</span>
                                            </div>
                                        ))}
                                        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                                            <span className="block text-gray-500 mb-1">الوصف:</span>
                                            <p className="text-gray-900 dark:text-white leading-relaxed">{document.description || '-'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <button
                                    onClick={() => setShowMobileVariables(prev => !prev)}
                                    className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white"
                                >
                                    <span>المتغيرات</span>
                                    <ChevronDownIcon className={cn("w-4 h-4 transition-transform", showMobileVariables && "rotate-180")} />
                                </button>
                                {showMobileVariables && (
                                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                                        <DocumentVariables
                                            documentId={document.id}
                                            companyId={document.company_id}
                                            canEdit={isDraft || can('documents', 'edit_after_approval')}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <button
                                    onClick={() => setShowVersions(prev => !prev)}
                                    className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white"
                                >
                                    <span>سجل الإصدارات ({versions.length})</span>
                                    <ChevronDownIcon className={cn("w-4 h-4 transition-transform", showVersions && "rotate-180")} />
                                </button>
                                {showVersions && (
                                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                                        {versions.map((version) => (
                                            <div key={version.id} className="text-sm p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-medium text-gray-900 dark:text-white">v{version.version}</span>
                                                    <span className="text-xs text-gray-500">{new Date(version.created_at).toLocaleDateString('ar-EG')}</span>
                                                </div>
                                                <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2">
                                                    {version.changes_summary || 'تحديث تلقائي'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={cn("w-full flex justify-center", isEditing && "h-full flex-1 min-h-0")}>
                        {isEditing ? (
                            <div className="w-full h-full flex flex-col min-h-0">
                                <TinyMCEDocumentEditor
                                    content={editorContent}
                                    onChange={(content) => {
                                        setEditorContent(content);
                                        setHasUnsavedChanges(true);
                                    }}
                                    editable={true}
                                    documentInfo={{
                                        document_number: document?.document_number,
                                        title: document?.title,
                                        version: document?.current_version,
                                        description: document?.description ?? null,
                                        company_name: 'شركة الجودة'
                                    }}
                                    showHeader={true}
                                    showFooter={true}
                                    variables={(globalVariables || []).map(v => ({
                                        ...v,
                                        unit: v.unit ?? null,
                                        source_document_id: v.source_document_id ?? null,
                                        description: v.description ?? null
                                    }))}
                                />
                            </div>
                        ) : (
                            /* A4 Preview Container - Matching TinyMCE Editor Styling */
                            <div
                                className="document-preview-container document-preview-shell w-full max-w-[210mm] bg-white dark:bg-gray-800 shadow-lg"
                                dir="rtl"
                                style={{
                                    width: '100%',
                                    maxWidth: '210mm',
                                    minHeight: '297mm',
                                    padding: '10mm', // Simulating @page margin
                                    boxSizing: 'border-box',
                                    fontFamily: "'Cairo', 'Arial', 'Tahoma', sans-serif",
                                    fontSize: '14px',
                                    lineHeight: '1.8',
                                    textAlign: 'right',
                                    color: '#1f2937',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    position: 'relative' // For absolute footer if needed, but flex is better
                                }}
                            >
                                {/* WYSIWYG Header - Matches Print Styles */}
                                <div
                                    className="document-preview-meta-row document-preview-header-row"
                                    style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    padding: '10px 10mm',
                                    borderBottom: '2px solid #374151',
                                    marginBottom: '20px'
                                    }}
                                >
                                    <span>رقم الوثيقة: {document.document_number || '---'}</span>
                                    <span className="document-preview-title" style={{ fontSize: '14px', fontWeight: 'bold' }}>{document.title || 'عنوان الوثيقة'}</span>
                                    <span>الإصدار: {document.current_version || 1}</span>
                                </div>

                                {/* Content */}
                                <div className="document-preview-body" style={{ padding: '0 10mm', flex: 1 }}>
                                    {latestVersion?.content ? (
                                        <div
                                            className="preview-content"
                                            dangerouslySetInnerHTML={{ __html: resolvedContent || latestVersion.content }}
                                            style={{
                                                // Default styles for preview
                                                direction: 'rtl',
                                                textAlign: 'right'
                                            }}
                                        />
                                    ) : (
                                        <div className="text-center text-gray-400 py-20 italic">
                                            لا يوجد محتوى في هذه الوثيقة بعد.
                                        </div>
                                    )}
                                </div>


                                {/* WYSIWYG Footer - Matches Print Styles */}
                                <div
                                    className="document-preview-meta-row document-preview-footer-row"
                                    style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    padding: '10px 10mm',
                                    borderTop: '2px solid #374151',
                                    marginTop: '20px',
                                    backgroundColor: 'white',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                    }}
                                >
                                    <span>{selectedCompany?.name || 'الشركة'}</span>
                                    <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Info (Only in View Mode maybe? Or collapsible?) */}
                {
                    !isEditing && (
                        <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto shrink-0 hidden xl:block">
                            <div className="p-4 space-y-6">
                                {/* Metadata */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">تفاصيل الوثيقة</h3>
                                    <div className="space-y-3 text-sm">
                                        {metadataRows.map((row) => (
                                            <div key={row.label} className="flex justify-between gap-3">
                                                <span className="text-gray-500">{row.label}:</span>
                                                <span className="text-gray-900 dark:text-white font-medium text-left">{row.value}</span>
                                            </div>
                                        ))}
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <span className="block text-gray-500 mb-1">الوصف:</span>
                                            <p className="text-gray-900 dark:text-white leading-relaxed">{document.description || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Global Variables */}
                                <DocumentVariables
                                    documentId={document.id}
                                    companyId={document.company_id}
                                    canEdit={isDraft || can('documents', 'edit_after_approval')}
                                />

                                {/* Version History */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center justify-between">
                                        <span>سجل الإصدارات</span>
                                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{versions.length}</span>
                                    </h3>
                                    <div className="space-y-3">
                                        {versions.map((version) => (
                                            <div key={version.id} className="text-sm p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-medium text-gray-900 dark:text-white">v{version.version}</span>
                                                    <span className="text-xs text-gray-500">{new Date(version.created_at).toLocaleDateString('ar-EG')}</span>
                                                </div>
                                                <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2">
                                                    {version.changes_summary || 'تحديث تلقائي'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>

            {/* Edit Meta Modal */}
            <DocumentForm
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSuccess={() => {
                    setShowEditModal(false);
                    fetchDocument();
                }}
                editDocument={document}
            />
        </div>
    );
}
