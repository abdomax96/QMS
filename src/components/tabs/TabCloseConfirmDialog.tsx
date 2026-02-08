/**
 * TabCloseConfirmDialog - Confirmation Dialog for Closing Dirty Tabs
 * 
 * Shows a modal when user tries to close a tab with unsaved changes.
 */

import React from 'react';
import {
    ExclamationTriangleIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

interface TabCloseConfirmDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Tab title to show in message */
    tabTitle: string;
    /** Called when user confirms close (discard changes) */
    onConfirm: () => void;
    /** Called when user cancels (keep tab open) */
    onCancel: () => void;
    /** Optional: Called when user wants to save first */
    onSave?: () => void;
}

export function TabCloseConfirmDialog({
    isOpen,
    tabTitle,
    onConfirm,
    onCancel,
    onSave,
}: TabCloseConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30">
                        <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            تغييرات غير محفوظة
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            "{tabTitle}"
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="mr-auto p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-4">
                    <p className="text-gray-600 dark:text-gray-300">
                        يوجد تغييرات غير محفوظة في هذا التبويب.
                        هل تريد إغلاقه بدون حفظ؟
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                    >
                        إلغاء
                    </button>

                    {onSave && (
                        <button
                            onClick={onSave}
                            className="flex-1 px-4 py-2.5 text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                        >
                            حفظ وإغلاق
                        </button>
                    )}

                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2.5 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                        تجاهل وإغلاق
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TabCloseConfirmDialog;
