/**
 * TabBar Component - Displays open tabs
 */

import React, { useState, useRef } from 'react';
import {
    XMarkIcon,
    DocumentTextIcon,
    ClipboardDocumentCheckIcon,
    FolderIcon,
    Cog6ToothIcon,
    EllipsisHorizontalIcon,
    ArrowPathIcon,
    DocumentDuplicateIcon,
    TrashIcon,
    LinkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils';
import { useTabsStore } from '../../store/tabsStore';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useToastStore } from '../../store/toastStore';
import { FORMS_REPORTS_HOME } from '../../constants/formsReportsRoutes';

interface TabBarProps {
    /** @deprecated No longer used - tabs close directly with auto-save to IndexedDB */
    onTabClose?: (tabId: string, isDirty: boolean) => Promise<boolean>;
    className?: string;
}

const TabBar: React.FC<TabBarProps> = ({ className }) => {
    const { tabs, activeTabId, switchTab, closeTab, closeOtherTabs, closeAllTabs, getTab } = useTabsStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { addToast } = useToastStore();

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const hasSkippedInitialSyncRef = useRef(false);
    const currentPathRef = useRef(location.pathname);

    React.useEffect(() => {
        currentPathRef.current = location.pathname;
    }, [location.pathname]);

    // Get icon for tab type
    const getTabIcon = (type: string) => {
        switch (type) {
            case 'template':
                return <DocumentTextIcon className="w-4 h-4" />;
            case 'instance':
                return <ClipboardDocumentCheckIcon className="w-4 h-4" />;
            case 'folder':
                return <FolderIcon className="w-4 h-4" />;
            case 'settings':
                return <Cog6ToothIcon className="w-4 h-4" />;
            default:
                return <DocumentTextIcon className="w-4 h-4" />;
        }
    };

    const handleTabClick = (tabId: string) => {
        const tab = getTab(tabId);
        switchTab(tabId);
        if (tab?.path) {
            navigate(tab.path);
        }
    };

    const resolveReturnPath = (returnPath?: string): string | null => {
        if (!returnPath) return null;
        if (
            returnPath === '/folders' ||
            returnPath.startsWith('/folders/') ||
            returnPath === '/forms&reports' ||
            returnPath.startsWith('/forms&reports/')
        ) {
            return FORMS_REPORTS_HOME;
        }
        return returnPath;
    };

    const handleCloseTab = async (tabId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const tab = getTab(tabId);
        if (!tab) return;

        // Close directly - tab state is already persisted to IndexedDB automatically
        // No confirmation dialog needed since data is saved via updateTabState()

        // Special handling for inactive tabs with returnPath
        // Problem: If user closes inactive report tab, old code only removed it from tabs array
        // without navigating away, leaving report content visible
        const closeReturnPath = resolveReturnPath(tab.returnPath);

        if (activeTabId !== tabId && closeReturnPath) {
            console.log('📌 Closing inactive tab with returnPath - switching first');

            // Switch to the tab first (makes it active)
            switchTab(tabId);
            // Close it without auto-switch (we'll navigate manually)
            const closed = closeTab(tabId, true, false);
            if (!closed) return;
            // Navigate to return path (this removes report from view)
            navigate(closeReturnPath);
            return;
        }

        // Active tab with returnPath (existing logic - already works correctly)
        if (activeTabId === tabId && closeReturnPath) {
            // Disable auto-switch in store logic
            const closed = closeTab(tabId, true, false);
            if (!closed) return;
            // Manually navigate to return path
            navigate(closeReturnPath);
            return;
        }

        // Default behavior for tabs without returnPath (templates, folders, settings)
        closeTab(tabId, true);
    };

    const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, tabId });
    };

    const closeContextMenu = () => setContextMenu(null);

    React.useEffect(() => {
        const handleClickOutside = () => closeContextMenu();
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // Scroll active tab into view
    React.useEffect(() => {
        if (activeTabId && scrollContainerRef.current) {
            const activeElement = document.getElementById(`tab-${activeTabId}`);
            if (activeElement) {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeTabId]);

    // Sync Router with active tab after initial mount.
    // On first hydrated render we preserve current URL to avoid refresh redirects.
    const hasHydrated = useTabsStore.persist?.hasHydrated?.() ?? true;

    React.useEffect(() => {
        if (!hasHydrated) return;

        if (!hasSkippedInitialSyncRef.current) {
            hasSkippedInitialSyncRef.current = true;
            console.log('[TabBar] Initial hydrated render - preserving URL:', location.pathname);
            return;
        }

        if (activeTabId) {
            const tab = getTab(activeTabId);
            if (tab?.path) {
                // Only navigate if we're not already at the target path.
                if (currentPathRef.current !== tab.path) {
                    console.log('[TabBar] Navigating to active tab:', tab.path);
                    navigate(tab.path);
                }
            }
        }
    }, [activeTabId, hasHydrated, getTab, navigate, tabs]);

    // if (tabs.length === 0) return null;

    return (
        <div className={cn("flex flex-col bg-gray-100 dark:bg-gray-800 min-h-[42px] border-b border-gray-200 dark:border-gray-700 print:hidden", className)}>
            <div
                ref={scrollContainerRef}
                className="flex items-center overflow-x-auto hide-scrollbar px-2 pt-2 gap-1"
            >
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    return (
                        <div
                            key={tab.id}
                            id={`tab-${tab.id}`}
                            className={cn(
                                "group relative flex items-center gap-2 px-3 py-2 min-w-[150px] max-w-[200px] rounded-t-lg transition-all cursor-pointer select-none",
                                "border-t border-x border-transparent hover:bg-gray-200 dark:hover:bg-gray-700/50",
                                isActive
                                    ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50"
                            )}
                            onClick={() => handleTabClick(tab.id)}
                            onContextMenu={(e) => handleContextMenu(e, tab.id)}
                        >
                            {/* Icon */}
                            <span className={cn("shrink-0", isActive ? "text-win11-blue" : "text-gray-400")}>
                                {getTabIcon(tab.type)}
                            </span>

                            {/* Title */}
                            <span className="truncate text-sm font-medium flex-1 text-right">
                                {tab.title}
                            </span>

                            {/* Dirty Indicator */}
                            {tab.isDirty && (
                                <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" title="تغييرات غير محفوظة" />
                            )}

                            {/* Close Button */}
                            <button
                                onClick={(e) => handleCloseTab(tab.id, e)}
                                className={cn(
                                    "p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
                                    "hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400",
                                    isActive && "opacity-100" // Always show close on active tab
                                )}
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>

                            {/* Active Line (Visual Polish) */}
                            {isActive && (
                                <div className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-white dark:bg-gray-900 z-10" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-48 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="w-full px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 justify-end"
                        onClick={() => {
                            const tab = getTab(contextMenu.tabId);
                            if (tab) {
                                switchTab(tab.id);
                                if (tab.path) navigate(tab.path);
                            }
                            closeContextMenu();
                        }}
                    >
                        <span>تحديث</span>
                        <ArrowPathIcon className="w-4 h-4 opacity-50" />
                    </button>
                    <button
                        className="w-full px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 justify-end"
                        onClick={async () => {
                            const tab = getTab(contextMenu.tabId);
                            if (tab?.path) {
                                const url = new URL(window.location.origin + tab.path);
                                url.searchParams.set('tab', tab.id);
                                try {
                                    await navigator.clipboard.writeText(url.toString());
                                    addToast({ type: 'success', message: 'تم نسخ الرابط' });
                                } catch (err) {
                                    addToast({ type: 'error', message: 'فشل نسخ الرابط' });
                                }
                            }
                            closeContextMenu();
                        }}
                    >
                        <span>نسخ الرابط</span>
                        <LinkIcon className="w-4 h-4 opacity-50" />
                    </button>
                    <button
                        className="w-full px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 justify-end"
                        onClick={() => {
                            // Duplicate logic if supported
                            alert('Coming soon');
                            closeContextMenu();
                        }}
                    >
                        <span>تكرار التبويب</span>
                        <DocumentDuplicateIcon className="w-4 h-4 opacity-50" />
                    </button>
                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                    <button
                        className="w-full px-4 py-2 text-sm text-right text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 justify-end"
                        onClick={(e) => {
                            closeContextMenu();
                            handleCloseTab(contextMenu.tabId, e as any);
                        }}
                    >
                        <span>إغلاق التبويب</span>
                        <XMarkIcon className="w-4 h-4 opacity-50" />
                    </button>
                    <button
                        className="w-full px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 justify-end"
                        onClick={() => {
                            closeOtherTabs(contextMenu.tabId);
                            closeContextMenu();
                        }}
                    >
                        <span>إغلاق التبويبات الأخرى</span>
                        <EllipsisHorizontalIcon className="w-4 h-4 opacity-50" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default TabBar;
