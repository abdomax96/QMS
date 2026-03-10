/**
 * Recipe Manager Component
 * مكون إدارة الوصفات لمنتج معين
 */

import React, { useState, useEffect } from 'react';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    DocumentDuplicateIcon,
    StarIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    XMarkIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import type { Recipe, RecipeIngredient, MixingStep } from '../../types/recipe';
import { COMMON_UNITS, DEFAULT_RECIPE_PERMISSIONS } from '../../types/recipe';
import {
    getRecipesByProduct,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    duplicateRecipe,
    canEditRecipe
} from '../../services/recipeService';
import { getAllRawMaterials } from '../../services/masterDataService';
import type { RawMaterial } from '../../domain/masterData/types';
import { generateId } from '../../utils';
import RecipeVersionHistory from './RecipeVersionHistory';
import VersionCompare from './VersionCompare';

interface RecipeManagerProps {
    productId: string;
    productName: string;
    companyId: string;
    userRole: string;
    onClose: () => void;
}

const RecipeManager: React.FC<RecipeManagerProps> = ({
    productId,
    productName,
    companyId,
    userRole,
    onClose
}) => {
    const WATER_INGREDIENT_VALUE = '__water__';

    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Version History State
    const [activeTab, setActiveTab] = useState<'recipes' | 'history'>('recipes');
    const [selectedRecipeForHistory, setSelectedRecipeForHistory] = useState<Recipe | null>(null);
    const [compareVersions, setCompareVersions] = useState<{ a: string, b: string } | null>(null);

    // نموذج الوصفة الجديدة/المحررة
    const [formData, setFormData] = useState({
        name: '',
        name_en: '',
        version: 1,
        is_default: false,
        notes: '',
        ingredients: [] as RecipeIngredient[],
        mixing_steps: [] as MixingStep[]
    });

    // تحميل الوصفات والخامات
    useEffect(() => {
        loadData();
    }, [productId, companyId]);

    const loadData = async () => {
        setLoading(true);
        const [recipesData, materialsData] = await Promise.all([
            getRecipesByProduct(productId),
            getAllRawMaterials(companyId)
        ]);
        setRecipes(recipesData);
        setRawMaterials(materialsData);
        setLoading(false);
    };

    // إضافة وصفة جديدة
    const handleCreate = () => {
        setFormData({
            name: '',
            name_en: '',
            version: 1,
            is_default: false,
            notes: '',
            ingredients: [],
            mixing_steps: []
        });
        setIsCreating(true);
        setEditingRecipe(null);
    };

    // تعديل وصفة
    const handleEdit = (recipe: Recipe) => {
        if (!canEditRecipe(recipe, userRole)) {
            alert('ليس لديك صلاحية لتعديل هذه الوصفة');
            return;
        }

        // Normalize ingredients - handle both materialId and material_id
        const normalizedIngredients = (recipe.ingredients || []).map((ing: any) => ({
            id: ing.id || generateId(),
            material_id: ing.material_id || ing.materialId || '',
            ingredient_name: ing.ingredient_name || ing.name || '',
            quantity: ing.quantity || 0,
            unit: ing.unit || 'kg',
            percentage: ing.percentage
        }));

        setFormData({
            name: recipe.name,
            name_en: recipe.name_en || '',
            version: recipe.version,
            is_default: recipe.is_default,
            notes: recipe.notes || '',
            ingredients: normalizedIngredients,
            mixing_steps: recipe.mixing_steps || []
        });
        setEditingRecipe(recipe);
        setIsCreating(false);
    };

    // حفظ الوصفة
    const handleSave = async () => {
        if (!formData.name.trim()) {
            alert('يرجى إدخال اسم الوصفة');
            return;
        }

        const saveData = {
            ...formData,
            permissions: DEFAULT_RECIPE_PERMISSIONS
        };

        if (editingRecipe) {
            const updated = await updateRecipe(editingRecipe.id, saveData);
            if (updated) {
                await loadData();
                setEditingRecipe(null);
            }
        } else {
            const created = await createRecipe({
                product_id: productId,
                ...saveData
            });
            if (created) {
                await loadData();
                setIsCreating(false);
            }
        }
    };

    // حذف وصفة
    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه الوصفة؟')) return;
        const success = await deleteRecipe(id);
        if (success) await loadData();
    };

    // نسخ وصفة
    const handleDuplicate = async (id: string) => {
        const duplicated = await duplicateRecipe(id);
        if (duplicated) await loadData();
    };



    // إضافة مكون جديد
    const handleAddIngredient = () => {
        setFormData({
            ...formData,
            ingredients: [
                ...formData.ingredients,
                {
                    id: generateId(),
                    material_id: '',
                    ingredient_name: '',
                    quantity: 0,
                    unit: 'kg'
                }
            ]
        });
    };

    // تحديث مكون - عند اختيار خامة من الـ dropdown
    const handleMaterialSelect = (index: number, materialId: string) => {
        const newIngredients = [...formData.ingredients];

        if (materialId === WATER_INGREDIENT_VALUE) {
            newIngredients[index] = {
                ...newIngredients[index],
                material_id: '',
                ingredient_name: 'مياه',
                unit: newIngredients[index].unit || 'l'
            };
            setFormData({ ...formData, ingredients: newIngredients });
            return;
        }

        if (!materialId) {
            newIngredients[index] = {
                ...newIngredients[index],
                material_id: '',
                ingredient_name: ''
            };
            setFormData({ ...formData, ingredients: newIngredients });
            return;
        }

        const material = rawMaterials.find(m => m.id === materialId);
        newIngredients[index] = {
            ...newIngredients[index],
            material_id: materialId,
            ingredient_name: material?.name || '',
            unit: material?.unit || 'kg'
        };
        setFormData({ ...formData, ingredients: newIngredients });
    };

    // تحديث مكون
    const handleUpdateIngredient = (index: number, updates: Partial<RecipeIngredient>) => {
        const newIngredients = [...formData.ingredients];
        newIngredients[index] = { ...newIngredients[index], ...updates };
        setFormData({ ...formData, ingredients: newIngredients });
    };

    // حذف مكون
    const handleRemoveIngredient = (index: number) => {
        const newIngredients = formData.ingredients.filter((_, i) => i !== index);
        setFormData({ ...formData, ingredients: newIngredients });
    };

    // حساب النسبة المئوية تلقائياً
    const calculatePercentages = () => {
        const total = formData.ingredients.reduce((sum, ing) => sum + (ing.quantity || 0), 0);
        if (total === 0) return;

        const updatedIngredients = formData.ingredients.map(ing => ({
            ...ing,
            percentage: Math.round((ing.quantity / total) * 10000) / 100
        }));
        setFormData({ ...formData, ingredients: updatedIngredients });
    };

    // ============ دوال إدارة خطوات الخلط ============

    // إضافة خطوة خلط جديدة
    const handleAddMixingStep = () => {
        const newStep: MixingStep = {
            step_number: formData.mixing_steps.length + 1,
            title: '',
            description: '',
            duration: '',
            temperature: '',
            equipment: '',
            notes: ''
        };
        setFormData({ ...formData, mixing_steps: [...formData.mixing_steps, newStep] });
    };

    // تحديث خطوة خلط
    const handleUpdateMixingStep = (index: number, updates: Partial<MixingStep>) => {
        const newSteps = [...formData.mixing_steps];
        newSteps[index] = { ...newSteps[index], ...updates };
        setFormData({ ...formData, mixing_steps: newSteps });
    };

    // حذف خطوة خلط
    const handleRemoveMixingStep = (index: number) => {
        const newSteps = formData.mixing_steps.filter((_, i) => i !== index);
        // إعادة ترقيم الخطوات
        const renumberedSteps = newSteps.map((step, i) => ({ ...step, step_number: i + 1 }));
        setFormData({ ...formData, mixing_steps: renumberedSteps });
    };

    // تحريك خطوة لأعلى أو لأسفل
    const handleMoveMixingStep = (index: number, direction: 'up' | 'down') => {
        const newSteps = [...formData.mixing_steps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newSteps.length) return;

        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
        // إعادة ترقيم الخطوات
        const renumberedSteps = newSteps.map((step, i) => ({ ...step, step_number: i + 1 }));
        setFormData({ ...formData, mixing_steps: renumberedSteps });
    };

    const isFormOpen = isCreating || editingRecipe !== null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-primary-600 text-white px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">إدارة الوصفات</h2>
                        <p className="text-primary-100 text-sm">{productName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-primary-700 rounded-lg">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
                    <button
                        onClick={() => setActiveTab('recipes')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'recipes'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📋 الوصفات ({recipes.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'history'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <ClockIcon className="w-4 h-4" />
                        سجل الإصدارات
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Version Compare Modal */}
                    {compareVersions && (
                        <VersionCompare
                            versionAId={compareVersions.a}
                            versionBId={compareVersions.b}
                            onClose={() => setCompareVersions(null)}
                        />
                    )}

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
                    ) : activeTab === 'history' ? (
                        /* Version History Tab */
                        <div>
                            {selectedRecipeForHistory ? (
                                <div>
                                    <button
                                        onClick={() => setSelectedRecipeForHistory(null)}
                                        className="text-sm text-primary-600 hover:underline mb-4"
                                    >
                                        ← العودة لقائمة الوصفات
                                    </button>
                                    <RecipeVersionHistory
                                        recipeId={selectedRecipeForHistory.id}
                                        recipeName={selectedRecipeForHistory.name}
                                        onRestore={() => loadData()}
                                        onCompare={(a, b) => setCompareVersions({ a, b })}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        اختر وصفة لعرض سجل الإصدارات:
                                    </p>
                                    {recipes.map((recipe) => (
                                        <button
                                            key={recipe.id}
                                            onClick={() => setSelectedRecipeForHistory(recipe)}
                                            className="w-full text-right p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-650 flex items-center justify-between"
                                        >
                                            <div>
                                                <span className="font-medium">{recipe.name}</span>
                                                <span className="text-sm text-gray-500 mr-2">v{recipe.version}</span>
                                            </div>
                                            <ClockIcon className="w-5 h-5 text-gray-400" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : isFormOpen ? (
                        /* Recipe Form */
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        اسم الوصفة *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="مثال: وصفة الإنتاج القياسية"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        الاسم بالإنجليزية
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name_en}
                                        onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="e.g. Standard Production Recipe"
                                    />
                                </div>
                            </div>



                            {/* Ingredients Table */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">المكونات (الخامات)</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={calculatePercentages}
                                            className="text-sm text-primary-600 hover:text-primary-700"
                                        >
                                            حساب النسب تلقائياً
                                        </button>
                                        <button
                                            onClick={handleAddIngredient}
                                            className="flex items-center gap-1 px-3 py-1 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            إضافة خامة
                                        </button>
                                    </div>
                                </div>

                                {formData.ingredients.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                                        لا توجد مكونات. اضغط "إضافة خامة" للبدء.
                                    </div>
                                ) : (
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الخامة</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الكمية</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الوحدة</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">النسبة %</th>
                                                    <th className="px-3 py-2 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                                {formData.ingredients.map((ing, index) => (
                                                    <tr key={ing.id}>
                                                        <td className="px-3 py-2">
                                                            <select
                                                                value={
                                                                    ing.material_id || (ing as any).materialId || ((ing.ingredient_name || '').trim() === 'مياه' ? WATER_INGREDIENT_VALUE : '')
                                                                }
                                                                onChange={(e) => handleMaterialSelect(index, e.target.value)}
                                                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                                                            >
                                                                <option value="">-- اختر خامة --</option>
                                                                <option value={WATER_INGREDIENT_VALUE}>مياه</option>
                                                                {rawMaterials.map(mat => (
                                                                    <option key={mat.id} value={mat.id}>{mat.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <input
                                                                type="number"
                                                                value={ing.quantity || ''}
                                                                onChange={(e) => handleUpdateIngredient(index, { quantity: parseFloat(e.target.value) || 0 })}
                                                                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                                                                min="0"
                                                                step="0.01"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <select
                                                                value={ing.unit}
                                                                onChange={(e) => handleUpdateIngredient(index, { unit: e.target.value })}
                                                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                                                            >
                                                                {COMMON_UNITS.map(u => (
                                                                    <option key={u.value} value={u.value}>{u.label}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                                                            {ing.percentage ? `${ing.percentage}%` : '-'}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <button
                                                                onClick={() => handleRemoveIngredient(index)}
                                                                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* ============ Mixing Steps Section ============ */}
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <span className="text-xl">🔄</span>
                                        خطوات الخلط والتحضير ({formData.mixing_steps.length} خطوة)
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleAddMixingStep}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        إضافة خطوة
                                    </button>
                                </div>

                                {formData.mixing_steps.length === 0 ? (
                                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                        <p>لم يتم إضافة خطوات خلط بعد</p>
                                        <p className="text-sm mt-1">أضف خطوات التحضير والخلط للوصفة</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {formData.mixing_steps.map((step, index) => (
                                            <div
                                                key={index}
                                                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                                            {step.step_number}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={step.title}
                                                            onChange={(e) => handleUpdateMixingStep(index, { title: e.target.value })}
                                                            className="font-semibold text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 focus:border-amber-500 focus:outline-none px-1"
                                                            placeholder="عنوان الخطوة *"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleMoveMixingStep(index, 'up')}
                                                            disabled={index === 0}
                                                            className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                                                            title="تحريك لأعلى"
                                                        >
                                                            <ChevronUpIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleMoveMixingStep(index, 'down')}
                                                            disabled={index === formData.mixing_steps.length - 1}
                                                            className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                                                            title="تحريك لأسفل"
                                                        >
                                                            <ChevronDownIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveMixingStep(index)}
                                                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                                            title="حذف الخطوة"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="md:col-span-2">
                                                        <textarea
                                                            value={step.description}
                                                            onChange={(e) => handleUpdateMixingStep(index, { description: e.target.value })}
                                                            rows={2}
                                                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                                                            placeholder="وصف الخطوة *"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-500 mb-1">المدة الزمنية</label>
                                                        <input
                                                            type="text"
                                                            value={step.duration || ''}
                                                            onChange={(e) => handleUpdateMixingStep(index, { duration: e.target.value })}
                                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                                                            placeholder="مثال: 10 دقائق"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-500 mb-1">درجة الحرارة</label>
                                                        <input
                                                            type="text"
                                                            value={step.temperature || ''}
                                                            onChange={(e) => handleUpdateMixingStep(index, { temperature: e.target.value })}
                                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                                                            placeholder="مثال: 180 درجة مئوية"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-500 mb-1">المعدات المستخدمة</label>
                                                        <input
                                                            type="text"
                                                            value={step.equipment || ''}
                                                            onChange={(e) => handleUpdateMixingStep(index, { equipment: e.target.value })}
                                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                                                            placeholder="مثال: خلاط كهربائي، فرن"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-500 mb-1">ملاحظات</label>
                                                        <input
                                                            type="text"
                                                            value={step.notes || ''}
                                                            onChange={(e) => handleUpdateMixingStep(index, { notes: e.target.value })}
                                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                                                            placeholder="ملاحظات إضافية..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    ملاحظات
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="أضف ملاحظات حول الوصفة..."
                                />
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    onClick={() => {
                                        setIsCreating(false);
                                        setEditingRecipe(null);
                                    }}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                >
                                    {editingRecipe ? 'حفظ التعديلات' : 'إنشاء الوصفة'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Recipes List */
                        <div className="space-y-4">
                            {recipes.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">📋</div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                        لا توجد وصفات
                                    </h3>
                                    <p className="text-gray-500 mb-4">أضف وصفة جديدة لهذا المنتج</p>
                                    <button
                                        onClick={handleCreate}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                        إضافة وصفة
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleCreate}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                        >
                                            <PlusIcon className="w-5 h-5" />
                                            إضافة وصفة
                                        </button>
                                    </div>

                                    {recipes.map((recipe) => (
                                        <div
                                            key={recipe.id}
                                            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                                        >
                                            {/* Recipe Header */}
                                            <div
                                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 cursor-pointer"
                                                onClick={() => setExpandedRecipeId(
                                                    expandedRecipeId === recipe.id ? null : recipe.id
                                                )}
                                            >
                                                <div className="flex items-center gap-3">

                                                    <div>
                                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                                            {recipe.name}
                                                        </h4>
                                                        <p className="text-sm text-gray-500">
                                                            الإصدار {recipe.version} • {recipe.ingredients?.length || 0} مكونات
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDuplicate(recipe.id); }}
                                                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg"
                                                        title="نسخ"
                                                    >
                                                        <DocumentDuplicateIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(recipe); }}
                                                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg"
                                                        title="تعديل"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}
                                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                                        title="حذف"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                    {expandedRecipeId === recipe.id ? (
                                                        <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                                                    ) : (
                                                        <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Recipe Details (Expanded) */}
                                            {expandedRecipeId === recipe.id && (
                                                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                                    {recipe.ingredients && recipe.ingredients.length > 0 && (
                                                        <div className="mb-4">
                                                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المكونات:</h5>
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="text-gray-500 dark:text-gray-400">
                                                                        <th className="text-right py-1">الخامة</th>
                                                                        <th className="text-right py-1">الكمية</th>
                                                                        <th className="text-right py-1">النسبة</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {recipe.ingredients.map((ing, idx) => (
                                                                        <tr key={idx} className="text-gray-700 dark:text-gray-300">
                                                                            <td className="py-1">{ing.ingredient_name}</td>
                                                                            <td className="py-1">{ing.quantity} {ing.unit}</td>
                                                                            <td className="py-1">{ing.percentage ? `${ing.percentage}%` : '-'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}

                                                    {recipe.notes && (
                                                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                                            <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">ملاحظات:</h5>
                                                            <p className="text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">
                                                                {recipe.notes}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecipeManager;
