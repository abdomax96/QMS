/**
 * Conflict Dialog
 * نافذة حوار تعارض البيانات
 * 
 * Shown when optimistic locking detects a version conflict
 * Allows user to choose how to resolve the conflict
 */

import React from 'react';
import {
    ExclamationTriangleIcon,
    ArrowPathIcon,
    DocumentDuplicateIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils';

export interface ConflictInfo {
    entityType: string;
    entityName?: string;
    currentVersion: number;
    expectedVersion: number;
    lastModifiedBy?: string;
    lastModifiedAt?: string;
}

export type ConflictResolution = 'refresh' | 'force' | 'merge' | 'cancel';

interface ConflictDialogProps {
    isOpen: boolean;
    conflict: ConflictInfo;
    onResolve: (resolution: ConflictResolution) => void;
    allowForce?: boolean;
    allowMerge?: boolean;
}

const ConflictDialog: React.FC<ConflictDialogProps> = ({
    isOpen,
    conflict,
    onResolve,
    allowForce = false,
    allowMerge = false
}) => {
    if (!isOpen) return null;

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'غير معروف';
        try {
            return new Date(dateStr).toLocaleString('ar-EG');
        } catch {
            return dateStr;
        }
    };

    const getEntityTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'folders': 'المجلد',
            'form_templates': 'النموذج',
            'form_instances': 'التقرير',
            'ncrs': 'تقرير عدم المطابقة',
            'raw_materials': 'المادة الخام',
            'suppliers': 'المورد',
            'products': 'المنتج'
        };
        return labels[type] || type;
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => onResolve('cancel')}
            />

            {/* Dialog */}
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="bg-amber-50 dark:bg-amber-900/30 px-6 py-4 border-b border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                            <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100">
                                تعارض في البيانات
                            </h2>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                تم تعديل هذا العنصر بواسطة مستخدم آخر
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Conflict Details */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">نوع العنصر:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {getEntityTypeLabel(conflict.entityType)}
                            </span>
                        </div>
                        {conflict.entityName && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">الاسم:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {conflict.entityName}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">الإصدار المحلي:</span>
                            <span className="font-mono text-orange-600">v{conflict.expectedVersion}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">الإصدار الحالي:</span>
                            <span className="font-mono text-green-600">v{conflict.currentVersion}</span>
                        </div>
                        {conflict.lastModifiedAt && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">آخر تعديل:</span>
                                <span className="text-gray-900 dark:text-white">
                                    {formatDate(conflict.lastModifiedAt)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Warning Message */}
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        قام مستخدم آخر بتعديل هذا العنصر أثناء عملك عليه.
                        يرجى اختيار كيفية التعامل مع هذا التعارض:
                    </p>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex flex-col gap-2">
                    {/* Refresh - Primary Action */}
                    <button
                        onClick={() => onResolve('refresh')}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
                            "bg-primary-600 text-white hover:bg-primary-700",
                            "transition-colors font-medium"
                        )}
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                        <span>تحديث البيانات (مُوصى به)</span>
                    </button>

                    {/* Merge - If Available */}
                    {allowMerge && (
                        <button
                            onClick={() => onResolve('merge')}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
                                "bg-blue-100 text-blue-700 hover:bg-blue-200",
                                "dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50",
                                "transition-colors font-medium"
                            )}
                        >
                            <DocumentDuplicateIcon className="w-5 h-5" />
                            <span>دمج التغييرات</span>
                        </button>
                    )}

                    {/* Force Overwrite - If Allowed */}
                    {allowForce && (
                        <button
                            onClick={() => onResolve('force')}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
                                "bg-red-100 text-red-700 hover:bg-red-200",
                                "dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50",
                                "transition-colors font-medium"
                            )}
                        >
                            <ExclamationTriangleIcon className="w-5 h-5" />
                            <span>الكتابة فوق التغييرات (خطر)</span>
                        </button>
                    )}

                    {/* Cancel */}
                    <button
                        onClick={() => onResolve('cancel')}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
                            "border border-gray-300 dark:border-gray-600",
                            "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
                            "transition-colors"
                        )}
                    >
                        <XMarkIcon className="w-5 h-5" />
                        <span>إلغاء</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConflictDialog;













