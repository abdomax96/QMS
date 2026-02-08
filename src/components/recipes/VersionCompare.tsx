/**
 * Version Compare Component
 * مكون مقارنة إصدارات الوصفة
 */

import React, { useState, useEffect } from 'react';
import { XMarkIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { recipeVersionService } from '../../services/recipeVersionService';
import type { RecipeVersionDiff } from '../../types/recipe';
import { cn } from '../../utils';

interface VersionCompareProps {
    versionAId: string;
    versionBId: string;
    onClose: () => void;
}

const VersionCompare: React.FC<VersionCompareProps> = ({
    versionAId,
    versionBId,
    onClose
}) => {
    const [diff, setDiff] = useState<RecipeVersionDiff | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadComparison();
    }, [versionAId, versionBId]);

    const loadComparison = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await recipeVersionService.compareVersions(versionAId, versionBId);
            setDiff(result);
        } catch (err) {
            setError('فشل في تحميل المقارنة');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">جاري تحميل المقارنة...</p>
                </div>
            </div>
        );
    }

    if (error || !diff) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md">
                    <p className="text-red-600">{error || 'لا توجد بيانات للمقارنة'}</p>
                    <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded">
                        إغلاق
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ArrowsRightLeftIcon className="w-5 h-5" />
                        مقارنة الإصدارات
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Version Headers */}
                <div className="grid grid-cols-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded font-bold">
                                v{diff.version_a.version_number}
                            </span>
                            <span className="text-sm text-gray-500">(قديم)</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {formatDate(diff.version_a.created_at)}
                        </p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded font-bold">
                                v{diff.version_b.version_number}
                            </span>
                            <span className="text-sm text-gray-500">(جديد)</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {formatDate(diff.version_b.created_at)}
                        </p>
                    </div>
                </div>

                {/* Changes */}
                <div className="flex-1 overflow-auto p-4">
                    {diff.changes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>لا توجد اختلافات بين الإصدارين</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {diff.changes.map((change, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "border rounded-lg overflow-hidden",
                                        change.type === 'added' && "border-green-300",
                                        change.type === 'removed' && "border-red-300",
                                        change.type === 'changed' && "border-amber-300"
                                    )}
                                >
                                    <div className={cn(
                                        "px-4 py-2 font-medium flex items-center gap-2",
                                        change.type === 'added' && "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
                                        change.type === 'removed' && "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
                                        change.type === 'changed' && "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
                                    )}>
                                        <span>
                                            {change.type === 'added' && '✅ أُضيف'}
                                            {change.type === 'removed' && '❌ حُذف'}
                                            {change.type === 'changed' && '📝 تغير'}
                                        </span>
                                        <span>{change.label}</span>
                                    </div>
                                    <div className="grid grid-cols-2">
                                        {/* Old Value */}
                                        <div className="p-3 bg-red-50/50 dark:bg-red-900/10 border-l border-gray-200 dark:border-gray-700">
                                            {change.field === 'ingredients' ? (
                                                <IngredientsList ingredients={change.old_value} />
                                            ) : change.field === 'mixing_steps' ? (
                                                <StepsList steps={change.old_value} />
                                            ) : (
                                                <pre className="text-sm whitespace-pre-wrap">
                                                    {typeof change.old_value === 'object'
                                                        ? JSON.stringify(change.old_value, null, 2)
                                                        : change.old_value || '-'}
                                                </pre>
                                            )}
                                        </div>
                                        {/* New Value */}
                                        <div className="p-3 bg-green-50/50 dark:bg-green-900/10">
                                            {change.field === 'ingredients' ? (
                                                <IngredientsList ingredients={change.new_value} />
                                            ) : change.field === 'mixing_steps' ? (
                                                <StepsList steps={change.new_value} />
                                            ) : (
                                                <pre className="text-sm whitespace-pre-wrap">
                                                    {typeof change.new_value === 'object'
                                                        ? JSON.stringify(change.new_value, null, 2)
                                                        : change.new_value || '-'}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper Components
const IngredientsList: React.FC<{ ingredients: any[] }> = ({ ingredients }) => {
    if (!ingredients || ingredients.length === 0) {
        return <span className="text-gray-400">لا توجد مكونات</span>;
    }
    return (
        <ul className="text-sm space-y-1">
            {ingredients.map((ing, i) => (
                <li key={i} className="flex justify-between">
                    <span>{ing.ingredient_name}</span>
                    <span className="text-gray-500">{ing.quantity} {ing.unit}</span>
                </li>
            ))}
        </ul>
    );
};

const StepsList: React.FC<{ steps: any[] }> = ({ steps }) => {
    if (!steps || steps.length === 0) {
        return <span className="text-gray-400">لا توجد خطوات</span>;
    }
    return (
        <ol className="text-sm space-y-1 list-decimal list-inside">
            {steps.map((step, i) => (
                <li key={i}>{step.title}</li>
            ))}
        </ol>
    );
};

export default VersionCompare;
