import React from 'react';
import {
    InformationCircleIcon,
    DocumentTextIcon,
    CubeIcon,
    VariableIcon,
    Squares2X2Icon,
    CheckBadgeIcon,
    PencilSquareIcon,
    ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils';

interface TabConfig {
    id: string;
    label: string;
    icon: string;
}

interface StaticTabsProps {
    tabs: TabConfig[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

const getTabIcon = (iconId: string) => {
    const iconClass = "w-4 h-4";
    switch (iconId) {
        case 'info':
            return <InformationCircleIcon className={iconClass} />;
        case 'document':
            return <DocumentTextIcon className={iconClass} />;
        case 'batch':
            return <CubeIcon className={iconClass} />;
        case 'variable':
            return <VariableIcon className={iconClass} />;
        case 'sections':
            return <Squares2X2Icon className={iconClass} />;
        case 'quality':
            return <CheckBadgeIcon className={iconClass} />;
        case 'signature':
            return <PencilSquareIcon className={iconClass} />;
        case 'notes':
            return <ChatBubbleBottomCenterTextIcon className={iconClass} />;
        default:
            return <DocumentTextIcon className={iconClass} />;
    }
};

/**
 * Static tabs component for FormDesigner
 * Displays tabs in a fixed order without drag-and-drop functionality
 */
const StaticTabs: React.FC<StaticTabsProps> = ({
    tabs,
    activeTab,
    onTabChange,
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto overscroll-x-contain">
                <div className="flex w-max min-w-full gap-1 px-2 sm:px-4 sm:gap-2 snap-x snap-mandatory">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            aria-current={activeTab === tab.id ? 'page' : undefined}
                            className={cn(
                                'snap-start min-h-[42px] flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 rounded-t-md transition-colors',
                                activeTab === tab.id
                                    ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400 bg-primary-50/70 dark:bg-primary-900/20'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
                            )}
                        >
                            {getTabIcon(tab.icon)}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StaticTabs;
