import React from 'react';
import { BuildingOfficeIcon, UserGroupIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import type { Department } from '../../types/department';

interface DepartmentNodeProps {
    department: Department & {
        roles?: { id: string; name: string; name_ar?: string }[];
        children?: (Department & { roles?: any[] })[];
    };
    isSelected?: boolean;
    onClick?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onAddChild?: () => void;
}

export const DepartmentNode: React.FC<DepartmentNodeProps> = ({
    department,
    isSelected = false,
    onClick,
    onEdit,
    onDelete,
    onAddChild,
}) => {
    const hasChildren = department.children && department.children.length > 0;
    const rolesCount = department.roles?.length || 0;
    const deptColor = department.color || '#6B7280';

    return (
        <div
            onClick={onClick}
            className={`
                group relative
                w-[280px]
                bg-white dark:bg-gray-800
                rounded-xl
                border-2 transition-all duration-300 cursor-pointer
                hover:shadow-2xl hover:scale-105 hover:-translate-y-1
                ${isSelected
                    ? 'border-primary-500 shadow-xl scale-105 ring-4 ring-primary-100 dark:ring-primary-900/30'
                    : 'border-gray-200 dark:border-gray-700 shadow-lg hover:border-primary-300'
                }
            `}
            style={{
                borderLeftColor: deptColor,
                borderLeftWidth: '4px',
            }}
        >
            {/* Header with Color Indicator */}
            <div className="p-4 space-y-3">
                {/* Top Row: Icon + Title */}
                <div className="flex items-start gap-3">
                    {/* Department Icon with Color */}
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0"
                        style={{ backgroundColor: deptColor }}
                    >
                        {department.name.charAt(0)}
                    </div>

                    {/* Department Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">
                            {department.name}
                        </h3>
                        {department.name_ar && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                {department.name_ar}
                            </p>
                        )}
                        {department.code && (
                            <code className="inline-block mt-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono text-gray-600 dark:text-gray-300">
                                {department.code}
                            </code>
                        )}
                    </div>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {/* Roles Count */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <UserGroupIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium text-blue-700 dark:text-blue-300">
                            {rolesCount} {rolesCount === 1 ? 'دور' : 'أدوار'}
                        </span>
                    </div>

                    {/* Sub-department Badge */}
                    {department.parent_department_id && (
                        <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg font-medium">
                            فرعي
                        </span>
                    )}

                    {/* Has Children Indicator */}
                    {hasChildren && (
                        <span className="px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-medium">
                            {department.children!.length} أقسام
                        </span>
                    )}
                </div>
            </div>

            {/* Action Buttons - Show on Hover */}
            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {onAddChild && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddChild();
                        }}
                        className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-colors"
                        title="إضافة قسم فرعي"
                    >
                        <PlusIcon className="w-3.5 h-3.5" />
                    </button>
                )}
                {onEdit && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                        className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-colors"
                        title="تعديل"
                    >
                        <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition-colors"
                        title="حذف"
                    >
                        <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Selected Indicator */}
            {isSelected && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </div>
            )}
        </div>
    );
};
