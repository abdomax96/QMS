import React from 'react';
import {
    FolderOpenIcon,
    PencilIcon,
    TrashIcon,
    DocumentDuplicateIcon,
    ScissorsIcon,
    ClipboardIcon,
    ArrowPathIcon,
    FolderPlusIcon,
    DocumentPlusIcon,
    EyeIcon,
    DocumentTextIcon,
    StarIcon,
    ArchiveBoxIcon,
    ShareIcon,
    InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { cn } from '../../utils';

export type ContextMenuItemType = 'folder' | 'template' | 'instance' | 'empty';

export interface ContextMenuItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    divider?: boolean;
    danger?: boolean;
    shortcut?: string;
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
    const menuRef = React.useRef<HTMLDivElement>(null);

    // Adjust position to keep menu in viewport
    React.useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let adjustedX = x;
            let adjustedY = y;

            if (x + rect.width > viewportWidth) {
                adjustedX = viewportWidth - rect.width - 10;
            }
            if (y + rect.height > viewportHeight) {
                adjustedY = viewportHeight - rect.height - 10;
            }

            menuRef.current.style.left = `${adjustedX}px`;
            menuRef.current.style.top = `${adjustedY}px`;
        }
    }, [x, y]);

    // Close on click outside
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="fixed z-[9999] min-w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 overflow-hidden"
            style={{ left: x, top: y }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
        >
            {items.map((item, index) => (
                <React.Fragment key={item.id}>
                    {item.divider && index > 0 && (
                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                    )}
                    <button
                        onClick={() => {
                            if (!item.disabled) {
                                item.onClick();
                                onClose();
                            }
                        }}
                        disabled={item.disabled}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-sm text-right transition-colors",
                            item.disabled
                                ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                : item.danger
                                    ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                    >
                        {item.icon && (
                            <span className="w-5 h-5 flex items-center justify-center">
                                {item.icon}
                            </span>
                        )}
                        <span className="flex-1">{item.label}</span>
                        {item.shortcut && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 mr-4">
                                {item.shortcut}
                            </span>
                        )}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
};

// Helper functions to generate menu items for different types

export const getFolderMenuItems = (
    folder: any,
    handlers: {
        onOpen: () => void;
        onRename: () => void;
        onCut: () => void;
        onCopy: () => void;
        onPaste: () => void;
        onDelete: () => void;
        onAddToFavorites?: () => void;
        onShare?: () => void;
        onProperties?: () => void;
    },
    canPaste: boolean = false,
    isFavorite: boolean = false
): ContextMenuItem[] => [
        {
            id: 'open',
            label: 'فتح',
            icon: <FolderOpenIcon className="w-4 h-4" />,
            onClick: handlers.onOpen,
            shortcut: 'Enter',
        },
        {
            id: 'divider1',
            label: '',
            divider: true,
            onClick: () => { },
        },
        {
            id: 'cut',
            label: 'قص',
            icon: <ScissorsIcon className="w-4 h-4" />,
            onClick: handlers.onCut,
            shortcut: 'Ctrl+X',
        },
        {
            id: 'copy',
            label: 'نسخ',
            icon: <DocumentDuplicateIcon className="w-4 h-4" />,
            onClick: handlers.onCopy,
            shortcut: 'Ctrl+C',
        },
        {
            id: 'paste',
            label: 'لصق',
            icon: <ClipboardIcon className="w-4 h-4" />,
            onClick: handlers.onPaste,
            disabled: !canPaste,
            shortcut: 'Ctrl+V',
        },
        {
            id: 'divider2',
            label: '',
            divider: true,
            onClick: () => { },
        },
        {
            id: 'rename',
            label: 'إعادة تسمية',
            icon: <PencilIcon className="w-4 h-4" />,
            onClick: handlers.onRename,
            shortcut: 'F2',
        },
        {
            id: 'delete',
            label: 'حذف',
            icon: <TrashIcon className="w-4 h-4" />,
            onClick: handlers.onDelete,
            danger: true,
            shortcut: 'Del',
        },
        ...(handlers.onAddToFavorites ? [{
            id: 'divider3',
            label: '',
            divider: true,
            onClick: () => { },
        },
        {
            id: 'favorite',
            label: isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة',
            icon: isFavorite ? <StarIconSolid className="w-4 h-4 text-yellow-500" /> : <StarIcon className="w-4 h-4" />,
            onClick: handlers.onAddToFavorites,
        }] : []),
        ...(handlers.onShare ? [{
            id: 'share',
            label: 'مشاركة',
            icon: <ShareIcon className="w-4 h-4" />,
            onClick: handlers.onShare,
        }] : []),
    ];

export const getTemplateMenuItems = (
    template: any,
    handlers: {
        onPreview: () => void;
        onEdit: () => void;
        onCreateReport: () => void;
        onCut: () => void;
        onCopy: () => void;
        onDuplicate: () => void;
        onDelete: () => void;
        onAddToFavorites?: () => void;
    },
    isFavorite: boolean = false
): ContextMenuItem[] => [
        {
            id: 'preview',
            label: 'معاينة',
            icon: <EyeIcon className="w-4 h-4" />,
            onClick: handlers.onPreview,
        },
        {
            id: 'edit',
            label: 'تعديل',
            icon: <PencilIcon className="w-4 h-4" />,
            onClick: handlers.onEdit,
        },
        {
            id: 'createReport',
            label: 'إنشاء تقرير',
            icon: <DocumentTextIcon className="w-4 h-4" />,
            onClick: handlers.onCreateReport,
        },
        {
            id: 'divider1',
            label: '',
            divider: true,
            onClick: () => { },
        },
        {
            id: 'cut',
            label: 'قص',
            icon: <ScissorsIcon className="w-4 h-4" />,
            onClick: handlers.onCut,
            shortcut: 'Ctrl+X',
        },
        {
            id: 'copy',
            label: 'نسخ',
            icon: <DocumentDuplicateIcon className="w-4 h-4" />,
            onClick: handlers.onCopy,
            shortcut: 'Ctrl+C',
        },
        {
            id: 'duplicate',
            label: 'تكرار',
            icon: <DocumentDuplicateIcon className="w-4 h-4" />,
            onClick: handlers.onDuplicate,
        },
        {
            id: 'divider2',
            label: '',
            divider: true,
            onClick: () => { },
        },
        {
            id: 'delete',
            label: 'حذف',
            icon: <TrashIcon className="w-4 h-4" />,
            onClick: handlers.onDelete,
            danger: true,
            shortcut: 'Del',
        },
        ...(handlers.onAddToFavorites ? [{
            id: 'divider3',
            label: '',
            divider: true,
            onClick: () => { },
        },
        {
            id: 'favorite',
            label: isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة',
            icon: isFavorite ? <StarIconSolid className="w-4 h-4 text-yellow-500" /> : <StarIcon className="w-4 h-4" />,
            onClick: handlers.onAddToFavorites,
        }] : []),
    ];

export const getInstanceMenuItems = (
    instance: any,
    handlers: {
        onOpen: () => void;
        onView: () => void;
        onEdit?: () => void;
        onCut: () => void;
        onCopy: () => void;
        onDelete: () => void;
        onArchive?: () => void;
        onAddToFavorites?: () => void;
    },
    isFavorite: boolean = false
): ContextMenuItem[] => [
        {
            id: 'open',
            label: 'فتح',
            icon: <FolderOpenIcon className="w-4 h-4" />,
            onClick: handlers.onOpen,
            shortcut: 'Enter',
        },
        {
            id: 'view',
            label: 'عرض التفاصيل',
            icon: <EyeIcon className="w-4 h-4" />,
            onClick: handlers.onView,
        },
        ...(handlers.onEdit && instance.status === 'draft' ? [{
            id: 'edit',
            label: 'تعديل المسودة',
            icon: <PencilIcon className="w-4 h-4" />,
            onClick: handlers.onEdit,
        }] : []),
        {
            id: 'divider1',
            label: '',
            divider: true,
            onClick: () => { },
        },
        {
            id: 'cut',
            label: 'قص',
            icon: <ScissorsIcon className="w-4 h-4" />,
            onClick: handlers.onCut,
            shortcut: 'Ctrl+X',
        },
        {
            id: 'copy',
            label: 'نسخ',
            icon: <DocumentDuplicateIcon className="w-4 h-4" />,
            onClick: handlers.onCopy,
            shortcut: 'Ctrl+C',
        },
        {
            id: 'divider2',
            label: '',
            divider: true,
            onClick: () => { },
        },
        ...(handlers.onArchive ? [{
            id: 'archive',
            label: 'أرشفة',
            icon: <ArchiveBoxIcon className="w-4 h-4" />,
            onClick: handlers.onArchive,
        }] : []),
        {
            id: 'delete',
            label: 'حذف',
            icon: <TrashIcon className="w-4 h-4" />,
            onClick: handlers.onDelete,
            danger: true,
            shortcut: 'Del',
        },
        ...(handlers.onAddToFavorites ? [{
            id: 'divider3',
            label: '',
            divider: true,
            onClick: () => { },
        },
        {
            id: 'favorite',
            label: isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة',
            icon: isFavorite ? <StarIconSolid className="w-4 h-4 text-yellow-500" /> : <StarIcon className="w-4 h-4" />,
            onClick: handlers.onAddToFavorites,
        }] : []),
    ];

export const getEmptyAreaMenuItems = (
    handlers: {
        onNewFolder: () => void;
        onNewTemplate: () => void;
        onPaste: () => void;
        onRefresh: () => void;
        onSelectAll?: () => void;
    },
    canPaste: boolean = false
): ContextMenuItem[] => [
        {
            id: 'newFolder',
            label: 'مجلد جديد',
            icon: <FolderPlusIcon className="w-4 h-4" />,
            onClick: handlers.onNewFolder,
        },
        {
            id: 'newTemplate',
            label: 'نموذج جديد',
            icon: <DocumentPlusIcon className="w-4 h-4" />,
            onClick: handlers.onNewTemplate,
        },
        {
            id: 'divider1',
            label: '',
            divider: true,
            onClick: () => { },
        },
        {
            id: 'paste',
            label: 'لصق',
            icon: <ClipboardIcon className="w-4 h-4" />,
            onClick: handlers.onPaste,
            disabled: !canPaste,
            shortcut: 'Ctrl+V',
        },
        {
            id: 'divider2',
            label: '',
            divider: true,
            onClick: () => { },
        },
        {
            id: 'refresh',
            label: 'تحديث',
            icon: <ArrowPathIcon className="w-4 h-4" />,
            onClick: handlers.onRefresh,
            shortcut: 'F5',
        },
        ...(handlers.onSelectAll ? [{
            id: 'selectAll',
            label: 'تحديد الكل',
            icon: <DocumentDuplicateIcon className="w-4 h-4" />,
            onClick: handlers.onSelectAll,
            shortcut: 'Ctrl+A',
        }] : []),
    ];

// Templates area context menu
export const getTemplatesAreaMenuItems = (
    handlers: {
        onNewTemplate: () => void;
        onPaste: () => void;
        onRefresh: () => void;
        onSelectAllTemplates?: () => void;
    },
    canPaste: boolean = false
): ContextMenuItem[] => [
        {
            id: 'newTemplate',
            label: 'نموذج جديد',
            icon: <DocumentPlusIcon className="w-4 h-4" />,
            onClick: handlers.onNewTemplate,
        },
        {
            id: 'divider1',
            label: '',
            divider: true,
            onClick: () => { },
        },
        {
            id: 'paste',
            label: 'لصق نموذج',
            icon: <ClipboardIcon className="w-4 h-4" />,
            onClick: handlers.onPaste,
            disabled: !canPaste,
            shortcut: 'Ctrl+V',
        },
        {
            id: 'divider2',
            label: '',
            divider: true,
            onClick: () => { },
        },
        {
            id: 'refresh',
            label: 'تحديث',
            icon: <ArrowPathIcon className="w-4 h-4" />,
            onClick: handlers.onRefresh,
            shortcut: 'F5',
        },
        ...(handlers.onSelectAllTemplates ? [{
            id: 'selectAllTemplates',
            label: 'تحديد كل النماذج',
            icon: <DocumentDuplicateIcon className="w-4 h-4" />,
            onClick: handlers.onSelectAllTemplates,
        }] : []),
    ];

// Reports area context menu
export const getReportsAreaMenuItems = (
    handlers: {
        onNewFolder: () => void;
        onPaste: () => void;
        onRefresh: () => void;
        onSelectAllReports?: () => void;
    },
    canPaste: boolean = false
): ContextMenuItem[] => [
        {
            id: 'newFolder',
            label: 'مجلد جديد',
            icon: <FolderPlusIcon className="w-4 h-4" />,
            onClick: handlers.onNewFolder,
        },
        {
            id: 'divider1',
            label: '',
            divider: true,
            onClick: () => { },
        },
        {
            id: 'paste',
            label: 'لصق',
            icon: <ClipboardIcon className="w-4 h-4" />,
            onClick: handlers.onPaste,
            disabled: !canPaste,
            shortcut: 'Ctrl+V',
        },
        {
            id: 'divider2',
            label: '',
            divider: true,
            onClick: () => { },
        },
        {
            id: 'refresh',
            label: 'تحديث',
            icon: <ArrowPathIcon className="w-4 h-4" />,
            onClick: handlers.onRefresh,
            shortcut: 'F5',
        },
        ...(handlers.onSelectAllReports ? [{
            id: 'selectAllReports',
            label: 'تحديد كل التقارير',
            icon: <DocumentDuplicateIcon className="w-4 h-4" />,
            onClick: handlers.onSelectAllReports,
        }] : []),
    ];

export default ContextMenu;

