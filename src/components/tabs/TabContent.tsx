import React, { Suspense, useMemo, useCallback } from 'react';
import { cn } from '../../utils';
import { useTabsStore, type Tab } from '../../store/tabsStore';
import { SettingsSkeleton } from '../common/LoadingStates';

interface TabContentProps {
    children?: React.ReactNode;
    renderTab?: (tab: Tab) => React.ReactNode;
    emptyState?: React.ReactNode;
    loadingState?: React.ReactNode;
    className?: string;
    keepMounted?: boolean; // Keep inactive tabs mounted (preserves state but uses more memory)
}

const TabContent: React.FC<TabContentProps> = ({
    children,
    renderTab,
    emptyState,
    loadingState,
    className,
    keepMounted = false,
}) => {
    const { tabs, activeTabId, getActiveTab } = useTabsStore();
    const activeTab = getActiveTab();

    // Default loading state
    const DefaultLoading = useMemo(() => (
        <div className="h-full p-4">
            <SettingsSkeleton />
        </div>
    ), []);

    // Default empty state
    const DefaultEmpty = useMemo(() => (
        <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4 text-center max-w-md">
                <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <svg
                        className="w-12 h-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                </div>
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        لا توجد نماذج مفتوحة
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        اختر نموذجاً من المستكشف لفتحه هنا
                    </p>
                </div>
            </div>
        </div>
    ), []);

    // Render single tab content
    const renderTabContent = useCallback((tab: Tab, isActive: boolean) => {
        if (!isActive && !keepMounted) return null;

        const content = renderTab ? renderTab(tab) : children;

        if (tab.status === 'loading') {
            return loadingState || DefaultLoading;
        }

        return (
            <div
                key={tab.id}
                className={cn(
                    "absolute inset-0 transition-opacity duration-150",
                    isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                )}
            >
                <Suspense fallback={loadingState || DefaultLoading}>
                    {content}
                </Suspense>
            </div>
        );
    }, [children, renderTab, loadingState, keepMounted, DefaultLoading]);

    // No tabs open
    if (tabs.length === 0) {
        return (
            <div className={cn("relative h-full", className)}>
                {emptyState || DefaultEmpty}
            </div>
        );
    }

    return (
        <div className={cn("relative h-full overflow-hidden", className)}>
            {keepMounted ? (
                // Render all tabs but hide inactive ones
                tabs.map((tab) => renderTabContent(tab, tab.id === activeTabId))
            ) : (
                // Only render active tab
                activeTab && renderTabContent(activeTab, true)
            )}
        </div>
    );
};

export default TabContent;


