/**
 * Recipe Traceability Table Component
 * جدول تتبع الخامات والوصفات
 * يعرض مكونات الوصفة مع إمكانية اختيار الباتشات
 */

import React, { useState, useEffect } from 'react';
import type { Table, FormTemplate } from '../../types';
import type { Recipe, RecipeIngredient } from '../../types/recipe';
import { getRecipesByProduct } from '../../services/recipeService';
import { getMaterialBatches, type MaterialBatch } from '../../services/labService';
import { cn } from '../../utils';
import { TableSkeleton } from '../common/LoadingStates';

interface RecipeTraceabilityTableProps {
    table: Table;
    tableData: any[][];
    onChange: (tableId: string, data: any[][]) => void;
    template: FormTemplate;
}

interface SelectedBatch {
    batchNumber: string;
    productionDate?: string;
    expiryDate?: string;
    receivingId: string;
    quantity?: number;
}

const RecipeTraceabilityTable: React.FC<RecipeTraceabilityTableProps> = ({
    table,
    tableData,
    onChange,
    template,
}) => {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Batches state per ingredient
    const [availableBatches, setAvailableBatches] = useState<Record<string, MaterialBatch[]>>({});
    const [loadingBatches, setLoadingBatches] = useState<Record<string, boolean>>({});

    const productId = template?.basic_info?.product_id;
    const companyId = template?.basic_info?.company_id;
    const showMixingSteps = table.features?.show_mixing_steps !== false;
    const allowMultipleBatches = table.features?.allow_multiple_batches !== false;
    const showExpiryWarning = table.features?.show_expiry_warning !== false;
    const expiryWarningDays = table.expiry_warning_days || 30;

    // Load recipes when product changes
    useEffect(() => {
        if (!productId) return;

        const loadRecipes = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getRecipesByProduct(productId);
                setRecipes(data);
                // Auto-select default recipe
                const defaultRecipe = data.find(r => r.is_default) || data[0];
                if (defaultRecipe) {
                    setSelectedRecipeId(defaultRecipe.id);
                }
            } catch (err) {
                setError('فشل في تحميل الوصفات');
                console.error('Error loading recipes:', err);
            } finally {
                setLoading(false);
            }
        };

        loadRecipes();
    }, [productId]);

    const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);

    // Initialize all ingredient rows when recipe changes (preserve existing batch data)
    useEffect(() => {
        if (!selectedRecipe?.ingredients || selectedRecipe.ingredients.length === 0) return;

        const existingData = tableData || [];

        // Build new data with all ingredients, preserving any existing batch data
        const newData = selectedRecipe.ingredients.map((ing, index) => {
            // Find existing row data for this ingredient (by index or by name match)
            const existingRow = existingData[index];
            const existingBatches = Array.isArray(existingRow) && existingRow[3] ? existingRow[3] : [];

            return [
                ing.ingredient_name,
                ing.quantity,
                ing.unit,
                existingBatches
            ];
        });

        // Only update if structure is different or data is empty
        const needsUpdate = existingData.length === 0 ||
            newData.length !== existingData.length ||
            newData.some((row, i) => {
                const existing = existingData[i];
                return !Array.isArray(existing) || existing[0] !== row[0];
            });

        if (needsUpdate) {
            console.log('RecipeTable - Initializing ingredients:', newData.length);
            onChange(table.id, newData);
        }
    }, [selectedRecipeId, selectedRecipe?.id, selectedRecipe?.ingredients?.length]);


    // Load batches for an ingredient
    const loadBatchesForIngredient = async (ingredient: RecipeIngredient) => {
        if (!ingredient.material_id) return;

        const key = ingredient.material_id;
        setLoadingBatches(prev => ({ ...prev, [key]: true }));

        try {
            const batches = await getMaterialBatches(ingredient.material_id, {
                companyId,
                status: 'accepted'
            });
            setAvailableBatches(prev => ({ ...prev, [key]: batches }));
        } catch (err) {
            console.error('Error loading batches:', err);
        } finally {
            setLoadingBatches(prev => ({ ...prev, [key]: false }));
        }
    };

    // Check if expiry date is near
    const isExpiryNear = (expiryDate?: string): boolean => {
        if (!expiryDate || !showExpiryWarning) return false;
        const expiry = new Date(expiryDate);
        const today = new Date();
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= expiryWarningDays && diffDays >= 0;
    };

    const isExpired = (expiryDate?: string): boolean => {
        if (!expiryDate) return false;
        return new Date(expiryDate) < new Date();
    };

    // Handle batch selection for an ingredient
    const handleBatchSelect = (ingredientIndex: number, batchIndex: number, batch: MaterialBatch | null, ingredient?: any) => {
        const newData = [...(tableData || [])];

        // Ensure row exists with ingredient data
        if (!newData[ingredientIndex] || !Array.isArray(newData[ingredientIndex]) || newData[ingredientIndex].length < 3) {
            // Get ingredient info from selectedRecipe if available
            const recipeIngredient = selectedRecipe?.ingredients?.[ingredientIndex];
            newData[ingredientIndex] = [
                recipeIngredient?.ingredient_name || ingredient?.ingredient_name || '',
                recipeIngredient?.quantity || ingredient?.quantity || '',
                recipeIngredient?.unit || ingredient?.unit || '',
                []
            ];
        }

        // Structure: [ingredientName, quantity, unit, batchesArray]
        // batchesArray: [{batchNumber, productionDate, expiryDate, receivingId}]
        if (batch) {
            const currentBatches: SelectedBatch[] = newData[ingredientIndex][3] || [];
            if (batchIndex >= currentBatches.length) {
                // Add new batch
                currentBatches.push({
                    batchNumber: batch.batchNumber,
                    productionDate: batch.productionDate,
                    expiryDate: batch.expiryDate,
                    receivingId: batch.id,
                    quantity: batch.quantity
                });
            } else {
                // Update existing batch
                currentBatches[batchIndex] = {
                    batchNumber: batch.batchNumber,
                    productionDate: batch.productionDate,
                    expiryDate: batch.expiryDate,
                    receivingId: batch.id,
                    quantity: batch.quantity
                };
            }
            newData[ingredientIndex][3] = currentBatches;
        }

        onChange(table.id, newData);
    };

    // Add more batch slot
    const handleAddBatchSlot = (ingredientIndex: number) => {
        const newData = [...(tableData || [])];

        // Ensure row exists with ingredient data
        if (!newData[ingredientIndex] || !Array.isArray(newData[ingredientIndex]) || newData[ingredientIndex].length < 3) {
            const recipeIngredient = selectedRecipe?.ingredients?.[ingredientIndex];
            newData[ingredientIndex] = [
                recipeIngredient?.ingredient_name || '',
                recipeIngredient?.quantity || '',
                recipeIngredient?.unit || '',
                []
            ];
        }

        const currentBatches: SelectedBatch[] = newData[ingredientIndex][3] || [];
        currentBatches.push({
            batchNumber: '',
            productionDate: undefined,
            expiryDate: undefined,
            receivingId: '',
        });
        newData[ingredientIndex][3] = currentBatches;
        onChange(table.id, newData);
    };

    // Remove batch
    const handleRemoveBatch = (ingredientIndex: number, batchIndex: number) => {
        const newData = [...(tableData || [])];
        if (newData[ingredientIndex]?.[3]) {
            const currentBatches: SelectedBatch[] = newData[ingredientIndex][3];
            currentBatches.splice(batchIndex, 1);
            newData[ingredientIndex][3] = currentBatches;
            onChange(table.id, newData);
        }
    };

    if (!productId) {
        return (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <span className="text-xl">⚠️</span>
                    <div>
                        <p className="font-medium">يجب اختيار منتج أولاً</p>
                        <p className="text-sm">اذهب إلى تبويب "المعلومات الأساسية" في مصمم النموذج واختر المنتج لعرض الوصفات والخامات</p>
                        <p className="text-xs mt-2 text-amber-600 dark:text-amber-400">
                            (تأكد من أن النموذج من نوع "مراقبة الجودة" وأن المنتج محفوظ)
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return <TableSkeleton />;
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    تحقق من اتصال قاعدة البيانات أو من وجود جدول الوصفات
                </p>
            </div>
        );
    }

    if (recipes.length === 0) {
        return (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <span className="text-xl">📋</span>
                    <div>
                        <p className="font-medium">لا توجد وصفات لهذا المنتج</p>
                        <p className="text-sm mt-1">
                            لاستخدام هذا الجدول، يجب إضافة وصفات للمنتج في قاعدة البيانات (جدول recipes)
                        </p>
                        <p className="text-xs mt-2 text-blue-600 dark:text-blue-400">
                            Product ID: {productId}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Recipe Selector */}
            <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    اختر الوصفة:
                </label>
                <select
                    value={selectedRecipeId}
                    onChange={(e) => setSelectedRecipeId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                    {recipes.map(recipe => (
                        <option key={recipe.id} value={recipe.id}>
                            {recipe.name} {recipe.is_default ? '(افتراضية)' : ''} - v{recipe.version}
                        </option>
                    ))}
                </select>
            </div>

            {selectedRecipe && (
                <>
                    {/* Mixing Steps - Compact Grid Layout */}
                    {showMixingSteps && selectedRecipe.mixing_steps && selectedRecipe.mixing_steps.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-3">
                            <h5 className="font-medium text-blue-800 dark:text-blue-300 mb-2 text-sm">
                                📋 خطوات الخلط ({selectedRecipe.mixing_steps.length} خطوات)
                            </h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {selectedRecipe.mixing_steps.map((step, index) => (
                                    <div key={index} className="flex gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-blue-100 dark:border-blue-800">
                                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-blue-500 text-white text-xs rounded-full font-bold">
                                            {step.step_number || index + 1}
                                        </span>
                                        <div className="flex-1 text-xs">
                                            <p className="font-medium text-gray-900 dark:text-white">{step.title}</p>
                                            {step.description && (
                                                <p className="text-gray-500 dark:text-gray-400 mt-0.5">{step.description}</p>
                                            )}
                                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                                                {step.duration && <span>⏱ {step.duration}</span>}
                                                {step.temperature && <span>🌡️ {step.temperature}</span>}
                                                {step.equipment && <span>⚙️ {step.equipment}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ingredients Table */}
                    <div className="overflow-x-auto print-table-container">
                        <table className="min-w-full border-collapse print:table-fixed print:w-full">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700">
                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-sm font-medium print:w-[22%] print:text-[8px] print:px-1 print:py-1">الخامة</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-medium w-24 print:w-[10%] print:text-[8px] print:px-1 print:py-1">الكمية</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-medium w-20 print:w-[8%] print:text-[8px] print:px-1 print:py-1">الوحدة</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-medium print:w-[20%] print:text-[8px] print:px-1 print:py-1">رقم الباتش</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-medium print:w-[18%] print:text-[8px] print:px-1 print:py-1">تاريخ الإنتاج</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-medium print:w-[18%] print:text-[8px] print:px-1 print:py-1">تاريخ الانتهاء</th>
                                    {allowMultipleBatches && (
                                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-medium w-20 print:hidden">إجراءات</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    // Debug logging
                                    console.log('RecipeTable - selectedRecipe:', selectedRecipe?.name);
                                    console.log('RecipeTable - ingredients:', selectedRecipe?.ingredients?.length || 0);
                                    console.log('RecipeTable - tableData:', tableData?.length || 0);

                                    // Use ingredients from selectedRecipe OR fallback to tableData
                                    const ingredients = selectedRecipe?.ingredients && selectedRecipe.ingredients.length > 0
                                        ? selectedRecipe.ingredients
                                        : tableData?.filter((row: any) => Array.isArray(row))?.map((row: any) => ({
                                            ingredient_name: row[0],
                                            quantity: row[1],
                                            unit: row[2],
                                            material_id: null
                                        })) || [];

                                    if (ingredients.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan={allowMultipleBatches ? 7 : 6} className="border border-gray-300 dark:border-gray-600 px-4 py-8 text-center text-gray-500">
                                                    لا توجد مكونات في هذه الوصفة. يرجى إضافة مكونات للوصفة.
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return ingredients.map((ingredient: any, ingIndex: number) => {
                                        // Get batches array - if empty, provide a default empty batch slot
                                        const batchesFromData = tableData?.[ingIndex]?.[3];
                                        const ingredientBatches: SelectedBatch[] = (Array.isArray(batchesFromData) && batchesFromData.length > 0)
                                            ? batchesFromData
                                            : [{ batchNumber: '', receivingId: '' }];
                                        const rawMaterialId = ingredient.material_id;
                                        const batches = rawMaterialId ? availableBatches[rawMaterialId] || [] : [];
                                        const isLoadingBatches = rawMaterialId ? loadingBatches[rawMaterialId] : false;

                                        return ingredientBatches.map((selectedBatch, batchIdx) => (
                                            <tr key={`${ingIndex}-${batchIdx}`} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                                {/* Only show ingredient info on first row */}
                                                {batchIdx === 0 ? (
                                                    <>
                                                        <td
                                                            className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium"
                                                            rowSpan={ingredientBatches.length}
                                                        >
                                                            {ingredient.ingredient_name}
                                                        </td>
                                                        <td
                                                            className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm"
                                                            rowSpan={ingredientBatches.length}
                                                        >
                                                            {ingredient.quantity}
                                                        </td>
                                                        <td
                                                            className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm"
                                                            rowSpan={ingredientBatches.length}
                                                        >
                                                            {ingredient.unit}
                                                        </td>
                                                    </>
                                                ) : null}

                                                {/* Batch Selection */}
                                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">
                                                    <select
                                                        value={selectedBatch.receivingId || ''}
                                                        onChange={(e) => {
                                                            const batch = batches.find(b => b.id === e.target.value);
                                                            handleBatchSelect(ingIndex, batchIdx, batch || null);
                                                        }}
                                                        onFocus={() => {
                                                            if (rawMaterialId && !batches.length && !isLoadingBatches) {
                                                                loadBatchesForIngredient(ingredient);
                                                            }
                                                        }}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                                                    >
                                                        <option value="">اختر الباتش...</option>
                                                        {isLoadingBatches && <option disabled>جاري التحميل...</option>}
                                                        {batches.map(batch => (
                                                            <option key={batch.id} value={batch.id}>
                                                                {batch.batchNumber} - {batch.supplierName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>

                                                {/* Production Date */}
                                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                                                    {selectedBatch.productionDate ? (
                                                        <span className="text-sm">{selectedBatch.productionDate}</span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </td>

                                                {/* Expiry Date */}
                                                <td className={cn(
                                                    "border border-gray-300 dark:border-gray-600 px-2 py-1 text-center",
                                                    isExpired(selectedBatch.expiryDate) && "bg-red-100 dark:bg-red-900",
                                                    isExpiryNear(selectedBatch.expiryDate) && !isExpired(selectedBatch.expiryDate) && "bg-amber-100 dark:bg-amber-900"
                                                )}>
                                                    {selectedBatch.expiryDate ? (
                                                        <span className={cn(
                                                            "text-sm",
                                                            isExpired(selectedBatch.expiryDate) && "text-red-700 dark:text-red-300 font-medium",
                                                            isExpiryNear(selectedBatch.expiryDate) && !isExpired(selectedBatch.expiryDate) && "text-amber-700 dark:text-amber-300"
                                                        )}>
                                                            {selectedBatch.expiryDate}
                                                            {isExpired(selectedBatch.expiryDate) && " ⚠️ منتهي"}
                                                            {isExpiryNear(selectedBatch.expiryDate) && !isExpired(selectedBatch.expiryDate) && " ⏰"}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                {allowMultipleBatches && (
                                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                                                        {batchIdx === ingredientBatches.length - 1 ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddBatchSlot(ingIndex)}
                                                                className="text-primary-600 hover:text-primary-700 text-sm"
                                                                title="إضافة باتش آخر"
                                                            >
                                                                +
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveBatch(ingIndex, batchIdx)}
                                                                className="text-red-600 hover:text-red-700 text-sm"
                                                                title="حذف الباتش"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ));
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>

                    {/* Recipe Notes */}
                    {selectedRecipe.notes && (
                        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات الوصفة:</h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedRecipe.notes}</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default RecipeTraceabilityTable;
