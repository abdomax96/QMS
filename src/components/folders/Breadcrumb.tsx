import React, { useState, useCallback } from 'react';
import {
    HomeIcon,
    ChevronLeftIcon,
    FolderIcon,
    ClipboardIcon,
    FolderOpenIcon,
    DocumentDuplicateIcon,
    ScissorsIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils';

export interface BreadcrumbSegment {
    id: string | null;
    name: string;
    type: 'root' | 'folder' | 'template' | 'date' | 'shift';
    icon?: React.ReactNode;
}

interface BreadcrumbContextMenu {
    x: number;
    y: number;
    segment: BreadcrumbSegment;
}

interface BreadcrumbProps {
    segments: BreadcrumbSegment[];
    onNavigate: (segmentId: string | null) => void;
    onPaste?: (targetId: string | null) => void;
    canPaste?: boolean;
    clipboardType?: 'copy' | 'cut' | null;
    clipboardCount?: number;
    className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
    segments,
    onNavigate,
    onPaste,
    canPaste = false,
    clipboardType,
    clipboardCount = 0,
    className,
}) => {
    const [contextMenu, setContextMenu] = useState<BreadcrumbContextMenu | null>(null);

    const handleContextMenu = useCallback((e: React.MouseEvent, segment: BreadcrumbSegment) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, segment });
    }, []);

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    // Close context menu on click outside
    React.useEffect(() => {
        const handleClick = () => closeContextMenu();
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeContextMenu();
        };

        if (contextMenu) {
            document.addEventListener('click', handleClick);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [contextMenu, closeContextMenu]);

    const getSegmentIcon = (segment: BreadcrumbSegment) => {
        if (segment.icon) return segment.icon;

        switch (segment.type) {
            case 'root':
                return <HomeIcon className="w-4 h-4" />;
            case 'folder':
                return <FolderIcon className="w-4 h-4 text-yellow-500" />;
            default:
                return null;
        }
    };

    return (
        <div className={cn("relative", className)}>
            <nav className="flex items-center gap-1 text-sm overflow-x-auto py-1">
                {segments.map((segment, index) => (
                    <React.Fragment key={segment.id || 'root'}>
                        {index > 0 && (
                            <ChevronLeftIcon className="w-4 h-4 text-gray-400 flex-shrink-0 rotate-180" />
                        )}
                        <button
                            onClick={() => onNavigate(segment.id)}
                            onContextMenu={(e) => handleContextMenu(e, segment)}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                                "hover:bg-gray-100 dark:hover:bg-gray-700",
                                index === segments.length - 1
                                    ? "text-gray-900 dark:text-white font-medium"
                                    : "text-gray-600 dark:text-gray-400"
                            )}
                        >
                            {getSegmentIcon(segment)}
                            <span className="truncate max-w-[150px]">{segment.name}</span>
                        </button>
                    </React.Fragment>
                ))}
            </nav>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-[9999] min-w-[180px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            onNavigate(contextMenu.segment.id);
                            closeContextMenu();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <FolderOpenIcon className="w-4 h-4" />
                        <span>فتح</span>
                    </button>

                    {canPaste && onPaste && (
                        <>
                            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                            <button
                                onClick={() => {
                                    onPaste(contextMenu.segment.id);
                                    closeContextMenu();
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 text-sm",
                                    clipboardType === 'cut'
                                        ? "text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                        : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                )}
                            >
                                {clipboardType === 'cut' ? (
                                    <ScissorsIcon className="w-4 h-4" />
                                ) : (
                                    <DocumentDuplicateIcon className="w-4 h-4" />
                                )}
                                <span>
                                    لصق {clipboardCount} عنصر ({clipboardType === 'cut' ? 'نقل' : 'نسخ'})
                                </span>
                            </button>
                        </>
                    )}

                    {contextMenu.segment.type !== 'root' && (
                        <>
                            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                            <button
                                onClick={() => {
                                    // Open in new tab/window
                                    window.open(`/forms&reports?folder=${contextMenu.segment.id}`, '_blank');
                                    closeContextMenu();
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <FolderOpenIcon className="w-4 h-4" />
                                <span>فتح في نافذة جديدة</span>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default Breadcrumb;


