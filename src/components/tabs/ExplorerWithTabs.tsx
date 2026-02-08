/**
 * ExplorerWithTabs - Layout component for Explorer with Tabs
 * Handles the split view between the explorer list and the tab content
 */

import React, { useCallback } from 'react';
import { cn } from '../../utils';
import { useTabsStore, type Tab } from '../../store/tabsStore';
import { useTabUrlSync } from '../../hooks/useTabUrlSync';
import TabContent from './TabContent';
import useStore from '../../store';
import { useNavigate } from 'react-router-dom';

interface ClipboardState {
    type: 'cut' | 'copy';
    items: string[];
    sourceFolder?: string | null;
}

interface ExplorerWithTabsProps {
    className?: string;
    children?: React.ReactNode; // The Explorer content
    clipboard?: ClipboardState | null;
    onClearClipboard?: () => void;
}

/**
 * Wrapper component that manages the layout when tabs are open
 * (Split view: Explorer Sidebar | Tab Content)
 * Note: TabBar and Taskbar are rendered by MainLayout
 */
const ExplorerWithTabs: React.FC<ExplorerWithTabsProps> = ({
    className,
    children,
    clipboard,
    onClearClipboard,
}) => {
    // 1. Store & Hooks
    const { tabs } = useTabsStore();

    // 2. URL Sync Integration (Still useful here to react to URL changes if this component is mounted)
    // Actually, if MainLayout mounts useTabUrlSync? No, I didn't add it to MainLayout.
    // I added it to ExplorerWithTabs in step 715.
    // If ExplorerWithTabs is only mounted on specific pages, then URL sync only works there.
    // If we want global URL sync (e.g. entering /form/123 opens tab), it should be in MainLayout.
    // But duplicate invocation is harmless usually, or I can move it to MainLayout.
    // Let's keep it here for now if Explorer is the main place we expect deep links.
    // Actually, deep linking to a form SHOULD work even if I land on dashboard?
    // If so, MainLayout or App is better.
    // But let's leave it here to avoid changing too many files if not requested.
    // User requested "Complete everything". Moving it to MainLayout makes it more robust.
    useTabUrlSync();

    const navigate = useNavigate();

    // Render tab content based on type
    const renderTabContent = useCallback((tab: Tab) => {
        switch (tab.type) {
            case 'template':
                return (
                    <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
                        <div className="text-center max-w-md p-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                {tab.title}
                            </h3>
                            <button
                                onClick={() => window.open(`/form-designer/${tab.formId}`, '_blank')}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                تعديل النموذج
                            </button>
                        </div>
                    </div>
                );

            case 'instance':
                return (
                    <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
                        <div className="text-center max-w-md p-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                {tab.title}
                            </h3>
                            <button
                                onClick={() => window.open(`/data-entry/${tab.formId}`, '_blank')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                فتح البيانات
                            </button>
                        </div>
                    </div>
                );

            default:
                return <div className="p-4 text-gray-500">نوع غير معروف</div>;
        }
    }, []);

    const TabEmptyState = (
        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    لا توجد نماذج مفتوحة
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    انقر نقرًا مزدوجًا على عناصر القائمة لفتحها
                </p>
            </div>
        </div>
    );

    const hasOpenTabs = tabs.length > 0;

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Explorer Panel */}
                <div className={cn(
                    "flex-shrink-0 border-l border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300",
                    hasOpenTabs ? "w-80" : "flex-1"
                )}>
                    {children}
                </div>

                {/* Tab Content Panel */}
                {hasOpenTabs && (
                    <div className="flex-1 overflow-hidden relative">
                        <TabContent
                            renderTab={renderTabContent}
                            emptyState={TabEmptyState}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExplorerWithTabs;
export const ExplorerWithTabsInner = ExplorerWithTabs;
