import React from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    InformationCircleIcon,
    DocumentTextIcon,
    CubeIcon,
    VariableIcon,
    Squares2X2Icon,
    CheckBadgeIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils';

interface TabConfig {
    id: string;
    label: string;
    icon: string;
}

interface DraggableTabsProps {
    tabs: TabConfig[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    onTabsReorder: (tabs: TabConfig[]) => void;
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
        default:
            return <DocumentTextIcon className={iconClass} />;
    }
};

interface SortableTabProps {
    tab: TabConfig;
    isActive: boolean;
    onClick: () => void;
}

const SortableTab: React.FC<SortableTabProps> = ({ tab, isActive, onClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: tab.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <button
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                isActive
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300',
                isDragging && 'opacity-50 bg-gray-100 dark:bg-gray-700 rounded-t-lg'
            )}
        >
            {getTabIcon(tab.icon)}
            <span>{tab.label}</span>
        </button>
    );
};

const DraggableTabs: React.FC<DraggableTabsProps> = ({
    tabs,
    activeTab,
    onTabChange,
    onTabsReorder,
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = tabs.findIndex((tab) => tab.id === active.id);
            const newIndex = tabs.findIndex((tab) => tab.id === over.id);
            onTabsReorder(arrayMove(tabs, oldIndex, newIndex));
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={tabs.map((tab) => tab.id)}
                        strategy={horizontalListSortingStrategy}
                    >
                        <div className="flex px-4">
                            {tabs.map((tab) => (
                                <SortableTab
                                    key={tab.id}
                                    tab={tab}
                                    isActive={activeTab === tab.id}
                                    onClick={() => onTabChange(tab.id)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
};

export default DraggableTabs;
