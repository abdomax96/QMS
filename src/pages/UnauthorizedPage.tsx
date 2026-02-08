/**
 * Unauthorized Page
 * صفحة عدم الصلاحية
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldExclamationIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const UnauthorizedPage: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                    <ShieldExclamationIcon className="w-12 h-12 text-red-600 dark:text-red-400" />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    غير مصرح بالوصول
                </h1>

                {/* Description */}
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    عذراً، ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة.
                    يرجى التواصل مع مدير النظام إذا كنت تعتقد أن هذا خطأ.
                </p>

                {/* Actions */}
                <div className="space-y-4">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <ArrowRightIcon className="w-5 h-5" />
                        العودة للصفحة الرئيسية
                    </Link>

                    <Link
                        to="/profile"
                        className="inline-block text-primary-600 dark:text-primary-400 hover:underline"
                    >
                        عرض الملف الشخصي
                    </Link>
                </div>

                {/* Info Box */}
                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>ملاحظة:</strong> يتم تحديد الصلاحيات بناءً على دورك في النظام.
                        تواصل مع قسم تكنولوجيا المعلومات لطلب صلاحيات إضافية.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UnauthorizedPage;
