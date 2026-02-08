import React, { useState, useEffect } from 'react';
import {
    StarIcon,
    ClockIcon,
    FolderIcon,
    DocumentTextIcon,
    ClipboardDocumentCheckIcon,
    ChevronDownIcon,

    ArchiveBoxIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { cn, formatDate } from '../../utils';

interface QuickAccessItem {
    id: string;
    name: string;
    type: 'folder' | 'template' | 'report';
    lastAccessed: string;
    isFavorite?: boolean;
    isPinned?: boolean;
}

interface QuickAccessSidebarProps {
    recentItems: QuickAccessItem[];
    favoriteItems: QuickAccessItem[];
    pinnedFolders: QuickAccessItem[];
    recycleBinCount?: number;
    onItemClick: (item: QuickAccessItem) => void;
    onToggleFavorite: (id: string, type: string) => void;
    onTogglePin?: (id: string) => void;

    onRecycleBinClick?: () => void;
    onArchiveClick?: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

const STORAGE_KEY_RECENT = 'qms-recent-items';
const MAX_RECENT_ITEMS = 10;

// Helper to load recent items from localStorage
export const loadRecentItems = (): QuickAccessItem[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_RECENT);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

// Helper to save a recent item
export const saveRecentItem = (item: QuickAccessItem): void => {
    try {
        const recent = loadRecentItems();
        const filtered = recent.filter(r => r.id !== item.id);
        const updated = [{ ...item, lastAccessed: new Date().toISOString() }, ...filtered].slice(0, MAX_RECENT_ITEMS);
        localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to save recent item:', e);
    }
};

const QuickAccessSidebar: React.FC<QuickAccessSidebarProps> = ({
    recentItems,
    favoriteItems,
    pinnedFolders,
    recycleBinCount = 0,
    onItemClick,
    onToggleFavorite,
    onTogglePin,
    onRecycleBinClick,
    onArchiveClick,
    isCollapsed = false,
    onToggleCollapse,
}) => {
    const [expandedSections, setExpandedSections] = useState({
        pinned: true,
        favorites: true,
        recent: true,
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'folder':
                return <FolderIcon className="w-4 h-4 text-blue-500" />;
            case 'template':
                return <DocumentTextIcon className="w-4 h-4 text-green-500" />;
            case 'report':
                return <ClipboardDocumentCheckIcon className="w-4 h-4 text-yellow-500" />;
            default:
                return <DocumentTextIcon className="w-4 h-4 text-gray-400" />;
        }
    };

    if (isCollapsed) {
        return (
            <div
                className="w-12 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 gap-4"
                onContextMenu={(e) => e.preventDefault()}
            >
                <button
                    onClick={onToggleCollapse}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title="توسيع اللوحة الجانبية"
                >
                    <ChevronDownIcon className="w-5 h-5 text-gray-500 rotate-90" />
                </button>
                <div className="w-full h-px bg-gray-200 dark:bg-gray-700" />
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="المُثبتة">
                    <FolderIcon className="w-5 h-5 text-blue-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="المفضلة">
                    <StarIconSolid className="w-5 h-5 text-yellow-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="الأخيرة">
                    <ClockIcon className="w-5 h-5 text-gray-500" />
                </button>
            </div>
        );
    }

    return (
        <div
            className="w-64 bg-transparent border-l border-black/5 dark:border-white/5 flex flex-col h-full"
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm">الوصول السريع</h2>
                {onToggleCollapse && (
                    <button
                        onClick={onToggleCollapse}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                        <ChevronDownIcon className="w-4 h-4 text-gray-500 -rotate-90" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto py-2">
                {/* Pinned Folders Section */}
                {pinnedFolders.length > 0 && (
                    <div className="mb-2">
                        <button
                            onClick={() => toggleSection('pinned')}
                            className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 rounded-win11 mx-2"
                        >
                            <span className="flex items-center gap-2">
                                <FolderIcon className="w-3.5 h-3.5" />
                                المجلدات المُثبتة
                            </span>
                            <ChevronDownIcon className={cn('w-4 h-4 transition-transform', !expandedSections.pinned && '-rotate-90')} />
                        </button>
                        {expandedSections.pinned && (
                            <div className="mt-1">
                                {pinnedFolders.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => onItemClick(item)}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 text-right rounded-win11 mx-2 transition-colors"
                                    >
                                        {getIcon(item.type)}
                                        <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{item.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Favorites Section */}
                <div className="mb-2">
                    <button
                        onClick={() => toggleSection('favorites')}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 rounded-win11 mx-2"
                    >
                        <span className="flex items-center gap-2">
                            <StarIconSolid className="w-3.5 h-3.5 text-yellow-500" />
                            المفضلة
                        </span>
                        <ChevronDownIcon className={cn('w-4 h-4 transition-transform', !expandedSections.favorites && '-rotate-90')} />
                    </button>
                    {expandedSections.favorites && (
                        <div className="mt-1">
                            {/* Fixed Home Item - Always at top */}
                            <div
                                className="flex items-center gap-2 px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 group rounded-win11 mx-2 transition-colors bg-gradient-to-r from-primary-50/50 to-transparent dark:from-primary-900/20 dark:to-transparent border-r-2 border-primary-500"
                            >
                                <button
                                    onClick={() => {
                                        // Navigate to home/root folders
                                        window.location.href = '/folders';
                                    }}
                                    className="flex-1 flex items-center gap-3 text-sm text-right"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-primary-600 dark:text-primary-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                                    </svg>
                                    <span className="truncate text-primary-700 dark:text-primary-300 font-medium">الصفحة الرئيسية</span>
                                </button>
                                <StarIconSolid className="w-4 h-4 text-yellow-500" />
                            </div>

                            {/* User Favorites */}
                            {favoriteItems.length === 0 ? (
                                <p className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 text-center">
                                    لا توجد عناصر في المفضلة
                                </p>
                            ) : (
                                favoriteItems.map(item => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-2 px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 group rounded-win11 mx-2 transition-colors"
                                    >
                                        <button
                                            onClick={() => onItemClick(item)}
                                            className="flex-1 flex items-center gap-3 text-sm text-right"
                                        >
                                            {getIcon(item.type)}
                                            <span className="truncate text-gray-700 dark:text-gray-300">{item.name}</span>
                                        </button>
                                        <button
                                            onClick={() => onToggleFavorite(item.id, item.type)}
                                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                        >
                                            <StarIconSolid className="w-4 h-4 text-yellow-500" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Recent Section */}
                <div>
                    <button
                        onClick={() => toggleSection('recent')}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 rounded-win11 mx-2"
                    >
                        <span className="flex items-center gap-2">
                            <ClockIcon className="w-3.5 h-3.5" />
                            الأخيرة
                        </span>
                        <ChevronDownIcon className={cn('w-4 h-4 transition-transform', !expandedSections.recent && '-rotate-90')} />
                    </button>
                    {expandedSections.recent && (
                        <div className="mt-1">
                            {recentItems.length === 0 ? (
                                <p className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 text-center">
                                    لا توجد عناصر حديثة
                                </p>
                            ) : (
                                recentItems.map(item => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-2 px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 group rounded-win11 mx-2 transition-colors"
                                    >
                                        <button
                                            onClick={() => onItemClick(item)}
                                            className="flex-1 flex items-center gap-3 text-sm text-right"
                                        >
                                            {getIcon(item.type)}
                                            <div className="flex-1 min-w-0">
                                                <span className="block truncate text-gray-700 dark:text-gray-300">{item.name}</span>
                                                <span className="text-xs text-gray-400">
                                                    {formatDate(item.lastAccessed, 'dd/MM HH:mm')}
                                                </span>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => onToggleFavorite(item.id, item.type)}
                                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                        >
                                            {item.isFavorite ? (
                                                <StarIconSolid className="w-4 h-4 text-yellow-500" />
                                            ) : (
                                                <StarIcon className="w-4 h-4 text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Recycle Bin */}
                {onRecycleBinClick && (
                    <div className="mt-4 mx-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                        <button
                            onClick={onRecycleBinClick}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 rounded-win11 transition-colors text-gray-700 dark:text-gray-300"
                        >
                            <TrashIcon className="w-4 h-4 text-red-500" />
                            <span className="flex-1 text-right">سلة المحذوفات</span>
                            {recycleBinCount > 0 && (
                                <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded-full">
                                    {recycleBinCount}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* Archive */}
                {onArchiveClick && (
                    <div className="mt-1 mx-2">
                        <button
                            onClick={onArchiveClick}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 rounded-win11 transition-colors text-gray-700 dark:text-gray-300"
                        >
                            <ArchiveBoxIcon className="w-4 h-4 text-purple-500" />
                            <span className="flex-1 text-right">الأرشيف</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuickAccessSidebar;
