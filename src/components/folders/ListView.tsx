import React, { useRef, useMemo } from 'react';
import {
    FolderIcon,
    DocumentTextIcon,
    ClipboardDocumentCheckIcon,
    ChevronLeftIcon,
    EllipsisHorizontalIcon,
    PencilSquareIcon,
    ClockIcon,
    CheckBadgeIcon,
    XCircleIcon,
    PlayIcon,
    EyeIcon,
    ArchiveBoxIcon,
    NoSymbolIcon
} from '@heroicons/react/24/outline';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn, formatDate } from '../../utils';
import type { Folder, FormTemplate, FormInstance } from '../../types';

// AUDIT FIX: Virtualization support for large lists (2000+ items)
// This prevents DOM overload and maintains smooth scrolling performance
type VirtualItem =
    | { type: 'template-header' }
    | { type: 'template'; data: FormTemplate }
    | { type: 'divider' }
    | { type: 'reports-header'; count: number }
    | { type: 'instance'; data: FormInstance }
    | { type: 'folder'; data: Folder | any };

interface ListViewProps {
    folders: (Folder | any)[];
    templates: FormTemplate[];
    instances: FormInstance[];
    formTemplates: Record<string, FormTemplate>;
    onFolderClick: (id: string, e: React.MouseEvent) => void;
    onTemplateClick: (id: string, e: React.MouseEvent) => void;
    onInstanceClick: (id: string, e: React.MouseEvent) => void;
    onFolderDoubleClick?: (id: string) => void;
    onTemplateDoubleClick?: (id: string) => void;
    onInstanceDoubleClick?: (id: string) => void;
    onFolderContextMenu?: (e: React.MouseEvent, folder: any) => void;
    onTemplateContextMenu?: (e: React.MouseEvent, template: FormTemplate) => void;
    onInstanceContextMenu?: (e: React.MouseEvent, instance: FormInstance) => void;
    onTemplatesAreaContextMenu?: (e: React.MouseEvent) => void;
    onReportsAreaContextMenu?: (e: React.MouseEvent) => void;
    getDisplayName: (name: string, nameEn?: string | null, lang?: any) => string;
    displayLanguage: string;
    isFormsPage: boolean;
    isReportsPage: boolean;
    // Selection props
    isSelected?: (id: string) => boolean;
    onToggleSelection?: (id: string) => void;
    selectedCount?: number;
}

// VIRTUALIZATION_THRESHOLD: Enable virtualization when total items exceed this
const VIRTUALIZATION_THRESHOLD = 100;

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

const ListView: React.FC<ListViewProps> = ({
    folders,
    templates,
    instances,
    formTemplates,
    onFolderClick,
    onTemplateClick,
    onInstanceClick,
    onFolderDoubleClick,
    onTemplateDoubleClick,
    onInstanceDoubleClick,
    onFolderContextMenu,
    onTemplateContextMenu,
    onInstanceContextMenu,
    onTemplatesAreaContextMenu,
    onReportsAreaContextMenu,
    getDisplayName,
    displayLanguage,
    isFormsPage,
    isReportsPage,
    isSelected,
    onToggleSelection,
    selectedCount = 0,
}) => {
    const parentRef = useRef<HTMLDivElement>(null);

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

    const StatusBadge = ({ status }: { status: string }) => {
        const Icon = statusIcons[status] || DocumentTextIcon;
        const style = statusStyles[status] || statusStyles.draft;

        return (
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset", style)}>
                <Icon className="w-3.5 h-3.5" />
                <span>{getStatusLabel(status)}</span>
            </div>
        );
    };

    // AUDIT FIX: Build flattened virtual list for large datasets
    const virtualItems = useMemo<VirtualItem[]>(() => {
        const items: VirtualItem[] = [];

        // Templates section
        if (isFormsPage && templates.length > 0) {
            items.push({ type: 'template-header' });
            templates.forEach(t => items.push({ type: 'template', data: t }));
        }

        // Divider
        if (isFormsPage && templates.length > 0 && isReportsPage && (instances.length > 0 || folders.length > 0)) {
            items.push({ type: 'divider' });
        }

        // Reports section
        if (instances.length > 0 || folders.length > 0) {
            if (isReportsPage) {
                items.push({ type: 'reports-header', count: instances.length + folders.length });
            }
            instances.forEach(i => items.push({ type: 'instance', data: i }));
            folders.forEach(f => items.push({ type: 'folder', data: f }));
        }

        return items;
    }, [templates, instances, folders, isFormsPage, isReportsPage]);

    const totalItems = templates.length + instances.length + folders.length;
    const useVirtualization = totalItems > VIRTUALIZATION_THRESHOLD;

    // Virtualizer - only created when needed
    const rowVirtualizer = useVirtualizer({
        count: virtualItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => {
            const item = virtualItems[index];
            if (item.type === 'template-header' || item.type === 'reports-header') return 36;
            if (item.type === 'divider') return 24;
            return 52; // Standard row height
        },
        overscan: 10,
        enabled: useVirtualization,
    });

    // Render a single virtual row
    const renderVirtualRow = (item: VirtualItem, style?: React.CSSProperties) => {
        switch (item.type) {
            case 'template-header':
                return (
                    <div style={style} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20">
                        <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            النماذج ({templates.length})
                        </h3>
                    </div>
                );

            case 'reports-header':
                return (
                    <div style={style} className="px-4 py-2 bg-green-50 dark:bg-green-900/20">
                        <h3 className="text-sm font-semibold text-green-700 dark:text-green-300">
                            التقارير ({item.count})
                        </h3>
                    </div>
                );

            case 'divider':
                return (
                    <div style={style} className="border-t-2 border-gray-300 dark:border-gray-600 my-3 mx-4"></div>
                );

            case 'template': {
                const template = item.data;
                return (
                    <div
                        style={style}
                        data-item="template"
                        className={cn(
                            "grid grid-cols-12 gap-4 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors items-center rounded-sm mx-1",
                            isSelected?.(template.id) && "bg-win11-blue/10"
                        )}
                        onClick={(e) => onTemplateClick(template.id, e)}
                        onDoubleClick={() => onTemplateDoubleClick?.(template.id)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onTemplateContextMenu?.(e, template);
                        }}
                    >
                        <div className="col-span-5 flex items-center gap-3">
                            {selectedCount >= 2 && isSelected?.(template.id) && (
                                <div className="w-5 h-5 rounded border flex items-center justify-center text-xs flex-shrink-0 bg-win11-blue border-win11-blue text-white">✓</div>
                            )}
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded">
                                <DocumentTextIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{template.name}</span>
                        </div>
                        <div className="col-span-2"><span className="text-sm text-gray-500 dark:text-gray-400">نموذج</span></div>
                        <div className="col-span-2"><span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(template.created_at, 'dd/MM/yyyy')}</span></div>
                        <div className="col-span-2"><span className="text-sm text-gray-500 dark:text-gray-400">v{template.version}</span></div>
                        <div className="col-span-1 flex justify-end">
                            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><EllipsisHorizontalIcon className="w-4 h-4 text-gray-400" /></button>
                        </div>
                    </div>
                );
            }

            case 'instance': {
                const instance = item.data;
                const template = formTemplates[instance.template_id];
                const StatusIcon = statusIcons[instance.status] || ClipboardDocumentCheckIcon;
                const statusColor = statusIconColors[instance.status] || 'text-gray-500';

                // تحديد ألوان الخلفية والأيقونة حسب الحالة
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
                        style={style}
                        data-item="instance"
                        className={cn(
                            "grid grid-cols-12 gap-4 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors items-center rounded-sm mx-1",
                            isSelected?.(instance.instance_id) && "bg-win11-blue/10"
                        )}
                        onClick={(e) => onInstanceClick(instance.instance_id, e)}
                        onDoubleClick={() => onInstanceDoubleClick?.(instance.instance_id)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onInstanceContextMenu?.(e, instance);
                        }}
                    >
                        <div className="col-span-5 flex items-center gap-3">
                            {selectedCount >= 2 && isSelected?.(instance.instance_id) && (
                                <div className="w-5 h-5 rounded border flex items-center justify-center text-xs flex-shrink-0 bg-win11-blue border-win11-blue text-white">✓</div>
                            )}
                            {/* Main Icon matches status */}
                            <div className={cn('p-1.5 rounded', statusBg)}>
                                <StatusIcon className={cn('w-4 h-4', statusColor)} />
                            </div>
                            <div className="min-w-0">
                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">{instance.name || template?.name || 'تقرير'}</span>
                                {instance.form_data?.batch_number && <span className="text-xs text-gray-500 dark:text-gray-400">{instance.form_data.batch_number}</span>}
                            </div>
                        </div>
                        <div className="col-span-2"><span className="text-sm text-gray-500 dark:text-gray-400">تقرير</span></div>
                        <div className="col-span-2"><span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(instance.created_at, 'dd/MM/yyyy')}</span></div>
                        <div className="col-span-2">
                            <StatusBadge status={instance.status} />
                        </div>
                        <div className="col-span-1 flex justify-end">
                            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><EllipsisHorizontalIcon className="w-4 h-4 text-gray-400" /></button>
                        </div>
                    </div>
                );
            }

            case 'folder': {
                const folder = item.data;
                return (
                    <div
                        style={style}
                        data-item="folder"
                        className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors items-center rounded-sm mx-1"
                        onClick={(e) => onFolderClick(folder.id, e)}
                        onDoubleClick={() => onFolderDoubleClick?.(folder.id)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onFolderContextMenu?.(e, folder);
                        }}
                    >
                        <div className="col-span-5 flex items-center gap-3">
                            <FolderIcon className="w-5 h-5 flex-shrink-0" style={{ color: folder.color || '#3B82F6' }} />
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {getDisplayName(folder.name, folder.name_en, displayLanguage)}
                            </span>
                        </div>
                        <div className="col-span-2"><span className="text-sm text-gray-500 dark:text-gray-400">مجلد</span></div>
                        <div className="col-span-2"><span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(folder.created_at, 'dd/MM/yyyy')}</span></div>
                        <div className="col-span-2"><span className="text-sm text-gray-500 dark:text-gray-400">-</span></div>
                        <div className="col-span-1 flex justify-end"><ChevronLeftIcon className="w-4 h-4 text-gray-400" /></div>
                    </div>
                );
            }
        }
    };

    return (
        <div className="bg-transparent border-none overflow-hidden h-full flex flex-col">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-white/50 dark:bg-black/20 backdrop-blur-md border-b border-black/5 dark:border-white/5 text-xs font-medium text-gray-500 dark:text-gray-400 sticky top-0 z-10 transition-colors">
                <div className="col-span-5">الاسم</div>
                <div className="col-span-2">النوع</div>
                <div className="col-span-2">التاريخ</div>
                <div className="col-span-2">{isReportsPage ? 'الحالة' : 'الإصدار'}</div>
                <div className="col-span-1"></div>
            </div>

            {/* Table Body - Virtualized or Regular */}
            <div
                ref={parentRef}
                className="divide-y divide-black/5 dark:divide-white/5 overflow-y-auto flex-1"
                onContextMenu={(e) => {
                    if ((e.target as HTMLElement).closest('[data-item]')) return;
                    // Determine which area context menu to show
                    if (isFormsPage && templates.length > 0) {
                        onTemplatesAreaContextMenu?.(e);
                    } else {
                        onReportsAreaContextMenu?.(e);
                    }
                }}
            >
                {useVirtualization ? (
                    // Virtualized rendering for large lists
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const item = virtualItems[virtualRow.index];
                            return (
                                <div
                                    key={virtualRow.key}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    {renderVirtualRow(item)}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // Non-virtualized rendering for small lists (better for context menus etc.)
                    virtualItems.map((item, index) => (
                        <React.Fragment key={index}>
                            {renderVirtualRow(item)}
                        </React.Fragment>
                    ))
                )}
            </div>

            {/* Empty State */}
            {totalItems === 0 && (
                <div className="py-12 text-center">
                    <FolderIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">لا توجد عناصر</p>
                </div>
            )}
        </div>
    );
};

export default ListView;
