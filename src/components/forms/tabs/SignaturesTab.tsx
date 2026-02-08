import React from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { FormTemplate, Signature } from '../../../types';

interface SignaturesTabProps {
    template: FormTemplate;
    onChange: (updates: Partial<FormTemplate>) => void;
}

const SignaturesTab: React.FC<SignaturesTabProps> = ({ template, onChange }) => {
    const signatures = template.signatures || [];

    const handleAddSignature = () => {
        const newSignature: Signature = {
            role: '',
        };

        onChange({
            signatures: [...signatures, newSignature],
        });
    };

    const handleUpdateSignature = (index: number, updates: Partial<Signature>) => {
        const updated = [...signatures];
        updated[index] = { ...updated[index], ...updates };
        onChange({ signatures: updated });
    };

    const handleDeleteSignature = (index: number) => {
        onChange({
            signatures: signatures.filter((_, i) => i !== index),
        });
    };

    const commonRoles = [
        'مهندس الجودة',
        'مشرف الإنتاج',
        'مدير الجودة',
        'مدير الإنتاج',
        'مفتش الجودة',
        'فني المختبر',
        'مدير المصنع',
        'مسؤول FSMS',
    ];

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        التواقيع المطلوبة
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {signatures.length} توقيع
                    </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    حدد الأدوار التي تتطلب توقيعات على هذا النموذج. سيتم عرض حقول التوقيع هذه عند إنشاء التقارير.
                </p>

                {/* Signatures List */}
                <div className="space-y-3 mb-4">
                    {signatures.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            لم يتم إضافة تواقيع بعد
                        </div>
                    ) : (
                        signatures.map((signature, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                            >
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={signature.role}
                                        onChange={(e) => handleUpdateSignature(index, { role: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="اسم الدور (مثال: مهندس الجودة)"
                                        list={`roles-list-${index}`}
                                    />
                                    <datalist id={`roles-list-${index}`}>
                                        {commonRoles.map((role) => (
                                            <option key={role} value={role} />
                                        ))}
                                    </datalist>
                                </div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    #{index + 1}
                                </span>
                                <button
                                    onClick={() => handleDeleteSignature(index)}
                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <button
                    onClick={handleAddSignature}
                    className="flex items-center gap-2 w-full p-3 text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg border-2 border-dashed border-primary-300 dark:border-primary-700"
                >
                    <PlusIcon className="w-4 h-4" />
                    إضافة توقيع
                </button>
            </div>

            {/* Quick Add Roles */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    إضافة سريعة
                </h3>

                <div className="flex flex-wrap gap-2">
                    {commonRoles.map((role) => {
                        const isAdded = signatures.some(s => s.role === role);
                        return (
                            <button
                                key={role}
                                onClick={() => {
                                    if (!isAdded) {
                                        onChange({
                                            signatures: [...signatures, { role }],
                                        });
                                    }
                                }}
                                disabled={isAdded}
                                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${isAdded
                                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 cursor-not-allowed'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {isAdded && '✓ '}
                                {role}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Preview */}
            {signatures.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        معاينة التواقيع
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {signatures.map((signature, index) => (
                            <div
                                key={index}
                                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                            >
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {signature.role || `توقيع ${index + 1}`}
                                </div>
                                <div className="h-16 border-b-2 border-gray-300 dark:border-gray-600 mb-2"></div>
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span>الاسم: _____________</span>
                                    <span>التاريخ: ___/___/______</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SignaturesTab;
