import React from 'react';
import { PlusIcon, TrashIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import type { FormTemplate, RecipeItem } from '../../../types';
import { cn } from '../../../utils';

interface RecipeTabProps {
    template: FormTemplate;
    onChange: (updates: Partial<FormTemplate>) => void;
}

const RecipeTab: React.FC<RecipeTabProps> = ({ template, onChange }) => {
    const recipe = template.recipe || [];

    const addIngredient = () => {
        const newIngredient: RecipeItem = {
            ingredient: '',
            quantity: 0,
            unit: 'kg',
            percentage: 0
        };
        onChange({ recipe: [...recipe, newIngredient] });
    };

    const updateIngredient = (index: number, updates: Partial<RecipeItem>) => {
        const newRecipe = [...recipe];
        newRecipe[index] = { ...newRecipe[index], ...updates };

        // Auto-calculate percentages if quantity changes
        const totalQuantity = newRecipe.reduce((sum, item) => sum + (item.quantity || 0), 0);
        if (totalQuantity > 0) {
            newRecipe.forEach(item => {
                item.percentage = (item.quantity / totalQuantity) * 100;
            });
        }

        onChange({ recipe: newRecipe });
    };

    const removeIngredient = (index: number) => {
        const newRecipe = recipe.filter((_, i) => i !== index);
        onChange({ recipe: newRecipe });
    };

    const moveIngredient = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === recipe.length - 1)
        ) {
            return;
        }

        const newRecipe = [...recipe];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newRecipe[index], newRecipe[targetIndex]] = [newRecipe[targetIndex], newRecipe[index]];
        onChange({ recipe: newRecipe });
    };

    const totalQuantity = recipe.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalPercentage = recipe.reduce((sum, item) => sum + (item.percentage || 0), 0);

    return (
        <div className="p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            الوصفة (Recipe)
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            أضف مكونات المنتج وكمياتها
                        </p>
                    </div>
                    <button
                        onClick={addIngredient}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                        إضافة مكون
                    </button>
                </div>

                {recipe.length > 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        #
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        المكون
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        الكمية
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        الوحدة
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        النسبة %
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        إجراءات
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {recipe.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={item.ingredient}
                                                onChange={(e) => updateIngredient(index, { ingredient: e.target.value })}
                                                placeholder="اسم المكون"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateIngredient(index, { quantity: parseFloat(e.target.value) || 0 })}
                                                placeholder="0"
                                                min="0"
                                                step="0.01"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={item.unit}
                                                onChange={(e) => updateIngredient(index, { unit: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                            >
                                                <option value="kg">كيلوجرام (kg)</option>
                                                <option value="g">جرام (g)</option>
                                                <option value="L">لتر (L)</option>
                                                <option value="mL">ميليلتر (mL)</option>
                                                <option value="unit">وحدة</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {item.percentage?.toFixed(2) || '0.00'}%
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => moveIngredient(index, 'up')}
                                                    disabled={index === 0}
                                                    className={cn(
                                                        'p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600',
                                                        index === 0 && 'opacity-50 cursor-not-allowed'
                                                    )}
                                                    title="تحريك لأعلى"
                                                >
                                                    <ArrowsUpDownIcon className="w-4 h-4 rotate-180" />
                                                </button>
                                                <button
                                                    onClick={() => moveIngredient(index, 'down')}
                                                    disabled={index === recipe.length - 1}
                                                    className={cn(
                                                        'p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600',
                                                        index === recipe.length - 1 && 'opacity-50 cursor-not-allowed'
                                                    )}
                                                    title="تحريك لأسفل"
                                                >
                                                    <ArrowsUpDownIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => removeIngredient(index)}
                                                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600"
                                                    title="حذف"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <td colSpan={2} className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        المجموع:
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                                        {totalQuantity.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                                        <span className={cn(
                                            Math.abs(totalPercentage - 100) > 0.1 && 'text-amber-600 dark:text-amber-400'
                                        )}>
                                            {totalPercentage.toFixed(2)}%
                                        </span>
                                        {Math.abs(totalPercentage - 100) > 0.1 && (
                                            <span className="text-xs text-amber-600 dark:text-amber-400 block">
                                                (يجب أن يساوي 100%)
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            لم يتم إضافة أي مكونات بعد
                        </p>
                        <button
                            onClick={addIngredient}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            إضافة مكون جديد
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipeTab;
