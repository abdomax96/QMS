/**
 * Taskbar Component - Bottom bar showing minimized tabs and clipboard status
 */

import React, { useState } from 'react';
import {
    DocumentTextIcon,
    ClipboardDocumentCheckIcon,
    FolderIcon,
    Cog6ToothIcon,
    ClipboardIcon,
    ScissorsIcon,
    DocumentDuplicateIcon,
    XMarkIcon,
    ChevronUpIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils';
import { useTabsStore, type Tab } from '../../store/tabsStore';

interface ClipboardState {
    type: 'cut' | 'copy';
    items: string[];
    sourceFolder?: string | null;
}

interface TaskbarProps {
    clipboard?: ClipboardState | null;
    onClearClipboard?: () => void;
    className?: string;
    minimized?: boolean;
    onToggleMinimize?: () => void;
}

const Taskbar: React.FC<TaskbarProps> = ({
    clipboard,
    onClearClipboard,
    className,
    minimized = false,
    onToggleMinimize,
}) => {
    const { tabs, activeTabId, switchTab, closeTab } = useTabsStore();
    const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);

    // Get icon for tab type
    const getTabIcon = (type: Tab['type']) => {
        switch (type) {
            case 'template':
                return <DocumentTextIcon className="w-5 h-5" />;
            case 'instance':
                return <ClipboardDocumentCheckIcon className="w-5 h-5" />;
            case 'folder':
                return <FolderIcon className="w-5 h-5" />;
            case 'settings':
                return <Cog6ToothIcon className="w-5 h-5" />;
            default:
                return <DocumentTextIcon className="w-5 h-5" />;
        }
    };

    // Get status indicator
    const getStatusIndicator = (tab: Tab) => {
        if (tab.status === 'saving') {
            return (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-gray-800 animate-pulse" />
            );
        }
        if (tab.status === 'error') {
            return (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-gray-800" />
            );
        }
        if (tab.isDirty) {
            return (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-500 border-2 border-gray-800" />
            );
        }
        return null;
    };

    const hasClipboard = clipboard && clipboard.items.length > 0;
    const dirtyCount = tabs.filter(t => t.isDirty).length;

    if (tabs.length === 0 && !hasClipboard) {
        return null;
    }

    if (minimized) {
        return (
            <div className={cn(
                "fixed bottom-0 left-1/2 -translate-x-1/2 z-40",
                className
            )}>
                <button
                    onClick={onToggleMinimize}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-t-lg",
                        "bg-gray-900 dark:bg-gray-800 text-white",
                        "shadow-lg border border-b-0 border-gray-700",
                        "hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                    )}
                >
                    <ChevronUpIcon className="w-4 h-4" />
                    <span className="text-sm">{tabs.length} نموذج مفتوح</span>
                    {dirtyCount > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-orange-500 rounded-full">
                            {dirtyCount} غير محفوظ
                        </span>
                    )}
                    {hasClipboard && (
                        <span className={cn(
                            "px-1.5 py-0.5 text-xs rounded-full",
                            clipboard.type === 'cut' ? "bg-orange-500" : "bg-blue-500"
                        )}>
                            {clipboard.items.length} في الحافظة
                        </span>
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className={cn(
            "fixed bottom-0 left-0 right-0 z-40",
            "bg-gray-900 dark:bg-gray-800 border-t border-gray-700",
            "shadow-2xl",
            className
        )}>
            <div className="flex items-center h-14 px-4">
                {/* Toggle Button */}
                {onToggleMinimize && (
                    <button
                        onClick={onToggleMinimize}
                        className="p-2 mr-2 rounded-lg hover:bg-gray-700 transition-colors"
                        title="تصغير شريط المهام"
                    >
                        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                    </button>
                )}

                {/* Tab Icons */}
                <div className="flex items-center gap-2 flex-1">
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            className="relative"
                            onMouseEnter={() => setHoveredTabId(tab.id)}
                            onMouseLeave={() => setHoveredTabId(null)}
                        >
                            <button
                                onClick={() => switchTab(tab.id)}
                                className={cn(
                                    "relative flex items-center justify-center w-10 h-10 rounded-lg transition-all",
                                    tab.id === activeTabId
                                        ? "bg-blue-600 text-white shadow-lg scale-105"
                                        : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105"
                                )}
                                title={tab.title}
                            >
                                {getTabIcon(tab.type)}
                                {getStatusIndicator(tab)}
                            </button>

                            {/* Hover Tooltip */}
                            {hoveredTabId === tab.id && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 whitespace-nowrap z-50">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-white">{tab.title}</span>
                                        {tab.isDirty && (
                                            <span className="text-xs text-orange-400">*غير محفوظ</span>
                                        )}
                                    </div>
                                    {tab.status === 'saving' && (
                                        <div className="text-xs text-blue-400 mt-1">جاري الحفظ...</div>
                                    )}
                                    {tab.status === 'error' && tab.error && (
                                        <div className="text-xs text-red-400 mt-1">{tab.error}</div>
                                    )}
                                    {/* Arrow */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-700" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-700 mx-4" />

                {/* Clipboard Status */}
                {hasClipboard && (
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg",
                        clipboard.type === 'cut'
                            ? "bg-orange-500/20 border border-orange-500/30"
                            : "bg-blue-500/20 border border-blue-500/30"
                    )}>
                        {clipboard.type === 'cut' ? (
                            <ScissorsIcon className="w-5 h-5 text-orange-400" />
                        ) : (
                            <DocumentDuplicateIcon className="w-5 h-5 text-blue-400" />
                        )}
                        <span className={cn(
                            "text-sm",
                            clipboard.type === 'cut' ? "text-orange-300" : "text-blue-300"
                        )}>
                            {clipboard.items.length} عنصر {clipboard.type === 'cut' ? 'للنقل' : 'للنسخ'}
                        </span>
                        {onClearClipboard && (
                            <button
                                onClick={onClearClipboard}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                                title="مسح الحافظة"
                            >
                                <XMarkIcon className="w-4 h-4 text-gray-400" />
                            </button>
                        )}
                    </div>
                )}

                {/* Status Summary */}
                <div className="flex items-center gap-4 ml-4 text-sm text-gray-400">
                    <span>{tabs.length} مفتوح</span>
                    {dirtyCount > 0 && (
                        <span className="flex items-center gap-1 text-orange-400">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            {dirtyCount} غير محفوظ
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Taskbar;


