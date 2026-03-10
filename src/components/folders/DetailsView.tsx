import React, { useState } from 'react';
import {
    FolderIcon,
    DocumentTextIcon,
    ClipboardDocumentCheckIcon,
    ChevronDownIcon,
    PencilIcon,
    TrashIcon,
    EyeIcon,
    DocumentDuplicateIcon,
    ArrowTopRightOnSquareIcon,
    PencilSquareIcon,
    ClockIcon,
    CheckBadgeIcon,
    XCircleIcon,
    PlayIcon,
    ArchiveBoxIcon,
    NoSymbolIcon
} from '@heroicons/react/24/outline';
import { cn, formatDate } from '../../utils';
import type { Folder, FormTemplate, FormInstance } from '../../types';

interface DetailsViewProps {
    folders: (Folder | any)[];
    templates: FormTemplate[];
    instances: FormInstance[];
    formTemplates: Record<string, FormTemplate>;
    onFolderClick: (id: string) => void;
    onTemplateClick: (id: string) => void;
    onInstanceClick: (id: string) => void;
    onFolderContextMenu?: (e: React.MouseEvent, folder: any) => void;
    onTemplateContextMenu?: (e: React.MouseEvent, template: FormTemplate) => void;
    onInstanceContextMenu?: (e: React.MouseEvent, instance: FormInstance) => void;
    onTemplatesAreaContextMenu?: (e: React.MouseEvent) => void;
    onReportsAreaContextMenu?: (e: React.MouseEvent) => void;
    onTemplateEdit?: (id: string) => void;
    onTemplateDelete?: (id: string) => void;
    onCreateReport?: (templateId: string) => void;
    getDisplayName: (name: string, nameEn?: string | null, lang?: any) => string;
    displayLanguage: string;
    isFormsPage: boolean;
    isReportsPage: boolean;
    // Selection props
    isSelected?: (id: string) => boolean;
    onToggleSelection?: (id: string) => void;
    onSelectionClick?: (id: string, type: 'folder' | 'template' | 'instance', e: React.MouseEvent) => void;
    selectedCount?: number;
}

// Status Configuration Maps
const statusIcons: Record<string, React.ElementType> = {
    draft: PencilSquareIcon,
    in_progress: PlayIcon,
    submitted: ClockIcon,
    under_review: EyeIcon,
    approved: CheckBadgeIcon,
    rejected: XCircleIcon,
    archived: ArchiveBoxIcon,
    cancelled: NoSymbolIcon
};

const statusStyles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 ring-gray-600/20',
    in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 ring-yellow-600/20',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 ring-blue-700/10',
    under_review: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 ring-purple-600/20',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 ring-green-600/20',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 ring-red-600/10',
    archived: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300 ring-slate-600/20',
    cancelled: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 ring-orange-600/20'
};

const statusIconColors: Record<string, string> = {
    draft: 'text-gray-500',
    in_progress: 'text-yellow-600',
    submitted: 'text-blue-600',
    under_review: 'text-purple-600',
    approved: 'text-green-600',
    rejected: 'text-red-600',
    archived: 'text-slate-600',
    cancelled: 'text-orange-600'
};

const DetailsView: React.FC<DetailsViewProps> = ({
    folders,
    templates,
    instances,
    formTemplates,
    onFolderClick,
    onTemplateClick,
    onInstanceClick,
    onFolderContextMenu,
    onTemplateContextMenu,
    onInstanceContextMenu,
    onTemplatesAreaContextMenu,
    onReportsAreaContextMenu,
    onTemplateEdit,
    onTemplateDelete,
    onCreateReport,
    getDisplayName,
    displayLanguage,
    isFormsPage,
    isReportsPage,
    isSelected,
    onToggleSelection,
    onSelectionClick,
    selectedCount = 0,
}) => {
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    const toggleExpanded = (id: string) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedItems(newExpanded);
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            draft: 'مسودة',
            in_progress: 'قيد التنفيذ',
            submitted: 'مُرسل',
            under_review: 'قيد المراجعة',
            approved: 'معتمد',
            rejected: 'مرفوض',
            archived: 'مؤرشف',
            cancelled: 'ملغي'
        };
        return labels[status] || status;
    };

    const getStatusBadge = (status: string) => {
        const Icon = statusIcons[status] || DocumentTextIcon;
        const style = statusStyles[status] || statusStyles.draft;

        return (
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset", style)}>
                <Icon className="w-3.5 h-3.5" />
                <span>{getStatusLabel(status)}</span>
            </div>
        );
    };

    return (
        <div className="space-y-2">
            {/* Templates Section */}
            {isFormsPage && templates.length > 0 && (
                <div
                    onContextMenu={(e) => {
                        // Only trigger area context menu if not clicking on an item
                        if ((e.target as HTMLElement).closest('[data-item]')) return;
                        onTemplatesAreaContextMenu?.(e);
                    }}
                >
                    {/* Templates Section Header */}
                    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-2">
                        <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            النماذج ({templates.length})
                        </h3>
                    </div>
                    {/* Templates (Forms Page) */}
                    {templates.map((template) => {
                        const isExpanded = expandedItems.has(template.id);
                        return (
                            <div
                                key={template.id}
                                data-item="template"
                                className={cn(
                                    "bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-win11-lg border border-transparent hover:border-black/10 dark:hover:border-white/10 shadow-sm hover:shadow-win11-hover transition-all overflow-hidden mb-2",
                                    isSelected?.(template.id) && "bg-win11-blue/10 ring-1 ring-win11-blue"
                                )}
                            >
                                <div
                                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                                    onClick={(e) => {
                                        if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                            e.stopPropagation();
                                            onSelectionClick?.(template.id, 'template', e);
                                            return;
                                        }
                                        toggleExpanded(template.id);
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onTemplateContextMenu?.(e, template);
                                    }}
                                >
                                    {/* Selection checkbox - only shows when 2+ items selected */}
                                    {selectedCount >= 2 && isSelected?.(template.id) && (
                                        <div className="w-5 h-5 rounded border flex items-center justify-center text-xs flex-shrink-0 bg-win11-blue border-win11-blue text-white">
                                            ✓
                                        </div>
                                    )}
                                    <ChevronDownIcon
                                        className={cn('w-4 h-4 text-gray-400 transition-transform', isExpanded && 'rotate-180')}
                                    />
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                                        <DocumentTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            الإصدار {template.version} • {formatDate(template.created_at, 'dd/MM/yyyy')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onCreateReport?.(template.id); }}
                                            className="px-3 py-1.5 text-sm bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded hover:bg-green-200"
                                        >
                                            إنشاء تقرير
                                        </button>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700">
                                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">عدد الأقسام:</span>
                                                <span className="mr-2 text-gray-900 dark:text-white">{template.sections ? Object.values(template.sections).length : 0}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">الحقول:</span>
                                                <span className="mr-2 text-gray-900 dark:text-white">
                                                    {template.sections ? Object.values(template.sections).reduce((acc: number, s: any) => acc + (s.fields?.length || 0), 0) : 0}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onTemplateClick(template.id)}
                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300"
                                            >
                                                <EyeIcon className="w-3.5 h-3.5" /> معاينة
                                            </button>
                                            <button
                                                onClick={() => onTemplateEdit?.(template.id)}
                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded hover:bg-blue-200"
                                            >
                                                <PencilIcon className="w-3.5 h-3.5" /> تعديل
                                            </button>
                                            <button
                                                onClick={() => onTemplateDelete?.(template.id)}
                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded hover:bg-red-200"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" /> حذف
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Divider between Templates and Reports */}
            {isFormsPage && templates.length > 0 && isReportsPage && (instances.length > 0 || folders.length > 0) && (
                <div className="border-t-2 border-gray-300 dark:border-gray-600 my-4"></div>
            )}

            {/* Reports Section */}
            {(instances.length > 0 || folders.length > 0) && (
                <div
                    onContextMenu={(e) => {
                        // Only trigger area context menu if not clicking on an item
                        if ((e.target as HTMLElement).closest('[data-item]')) return;
                        onReportsAreaContextMenu?.(e);
                    }}
                >
                    {/* Reports Section Header */}
                    {isReportsPage && (
                        <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg mb-2">
                            <h3 className="text-sm font-semibold text-green-700 dark:text-green-300">
                                التقارير ({instances.length + folders.length})
                            </h3>
                        </div>
                    )}

                    {/* Instances (Reports) */}
                    {instances.map((instance) => {
                        const template = formTemplates[instance.template_id];
                        const isExpanded = expandedItems.has(instance.instance_id);
                        const StatusIcon = statusIcons[instance.status] || ClipboardDocumentCheckIcon;
                        const statusColor = statusIconColors[instance.status] || 'text-gray-500';

                        // تحديد ألوان الخلفية حسب الحالة
                        const statusBgColors: Record<string, string> = {
                            draft: 'bg-gray-100 dark:bg-gray-800',
                            in_progress: 'bg-yellow-100 dark:bg-yellow-900',
                            submitted: 'bg-blue-100 dark:bg-blue-900',
                            under_review: 'bg-purple-100 dark:bg-purple-900',
                            approved: 'bg-green-100 dark:bg-green-900',
                            rejected: 'bg-red-100 dark:bg-red-900',
                            archived: 'bg-slate-100 dark:bg-slate-900',
                            cancelled: 'bg-orange-100 dark:bg-orange-900'
                        };
                        const statusBg = statusBgColors[instance.status] || 'bg-gray-100 dark:bg-gray-800';

                        return (
                            <div
                                key={instance.instance_id}
                                data-item="instance"
                                className={cn(
                                    "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-2",
                                    isSelected?.(instance.instance_id) && "ring-2 ring-primary-500 border-primary-500"
                                )}
                            >
                                <div
                                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
                                    onClick={(e) => {
                                        if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                            e.stopPropagation();
                                            onSelectionClick?.(instance.instance_id, 'instance', e);
                                            return;
                                        }
                                        toggleExpanded(instance.instance_id);
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onInstanceContextMenu?.(e, instance);
                                    }}
                                >
                                    {/* Selection checkbox - only shows when 2+ items selected */}
                                    {selectedCount >= 2 && isSelected?.(instance.instance_id) && (
                                        <div className="w-5 h-5 rounded border flex items-center justify-center text-xs flex-shrink-0 bg-win11-blue border-win11-blue text-white">
                                            ✓
                                        </div>
                                    )}
                                    <ChevronDownIcon
                                        className={cn('w-4 h-4 text-gray-400 transition-transform', isExpanded && 'rotate-180')}
                                    />
                                    <div className={cn('p-2 rounded', statusBg)}>
                                        <StatusIcon className={cn('w-5 h-5', statusColor)} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-900 dark:text-white">{instance.name || template?.name || 'تقرير'}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {instance.form_data?.batch_number && `دفعة: ${instance.form_data.batch_number} • `}
                                            {formatDate(instance.created_at, 'dd/MM/yyyy')}
                                        </p>
                                    </div>
                                    {getStatusBadge(instance.status)}
                                </div>
                                {isExpanded && (
                                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700">
                                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">أنشئ بواسطة:</span>
                                                <span className="mr-2 text-gray-900 dark:text-white">{instance.created_by || '-'}</span>
                                            </div>
                                            {instance.submitted_at && (
                                                <div>
                                                    <span className="text-gray-500 dark:text-gray-400">تاريخ الإرسال:</span>
                                                    <span className="mr-2 text-gray-900 dark:text-white">
                                                        {formatDate(instance.submitted_at, 'dd/MM/yyyy HH:mm')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => onInstanceClick(instance.instance_id)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded hover:bg-primary-200"
                                        >
                                            <ArrowTopRightOnSquareIcon className="w-4 h-4" /> عرض التقرير
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Folders - Shown under Reports */}
                    {folders.map((folder) => {
                        const isExpanded = expandedItems.has(folder.id);
                        return (
                            <div
                                key={folder.id}
                                data-item="folder"
                                className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-win11-lg border border-transparent hover:border-black/10 dark:hover:border-white/10 shadow-sm hover:shadow-win11-hover transition-all overflow-hidden mb-2"
                            >
                                <div
                                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                                    onClick={(e) => {
                                        if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                            e.stopPropagation();
                                            onSelectionClick?.(folder.id, 'folder', e);
                                            return;
                                        }
                                        toggleExpanded(folder.id);
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onFolderContextMenu?.(e, folder);
                                    }}
                                >
                                    <ChevronDownIcon
                                        className={cn('w-4 h-4 text-gray-400 transition-transform', isExpanded && 'rotate-180')}
                                    />
                                    <FolderIcon className="w-6 h-6" style={{ color: folder.color || '#3B82F6' }} />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            {getDisplayName(folder.name, folder.name_en, displayLanguage)}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            مجلد • إنشاء {formatDate(folder.created_at, 'dd/MM/yyyy')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onFolderClick(folder.id); }}
                                        className="px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                                    >
                                        فتح
                                    </button>
                                </div>
                                {isExpanded && (
                                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">المسار:</span>
                                                <span className="mr-2 text-gray-900 dark:text-white">{folder.path || '/'}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">الإنشاء بواسطة:</span>
                                                <span className="mr-2 text-gray-900 dark:text-white">{folder.created_by || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Empty State */}
            {folders.length === 0 && templates.length === 0 && instances.length === 0 && (
                <div className="py-12 text-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <FolderIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">لا توجد عناصر</p>
                </div>
            )}
        </div>
    );
};

export default DetailsView;
