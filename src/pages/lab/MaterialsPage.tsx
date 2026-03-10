/**
 * Materials Page - Simplified Version
 * صفحة إدارة المواد الخام - نسخة مبسطة
 * Updated: Full Supabase CRUD integration
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon,
    CubeIcon,
    ArrowRightIcon,
    BeakerIcon,
    LinkIcon
} from '@heroicons/react/24/outline';
import { TableSkeleton } from '../../components/common/LoadingStates';
import { useRawMaterials } from '../../hooks/useMasterData';
import * as masterDataService from '../../services/masterDataService';
import * as packagingSettingsService from '../../services/labPackagingSettingsService';
import { generateMaterialCode, materialCategoryLabels, shelfLifeUnitLabels } from '../../domain/masterData/types';
import type { RawMaterial, MaterialCategory, ShelfLifeUnit } from '../../domain/masterData/types';
import { useCompanyStore } from '../../store/companyStore';
import type { LabPackagingType } from '../../services/labPackagingSettingsService';

const ALLERGEN_SUPPORTED_CATEGORIES: MaterialCategory[] = [
    'ingredient',
    'additive',
    'flavoring',
    'coloring',
    'preservative'
];

const CATEGORY_FIELD_HINTS: Record<MaterialCategory, string> = {
    ingredient: 'المكون الغذائي يدعم مسببات الحساسية وخيارات التعبئة.',
    packaging: 'مواد التعبئة تتطلب اختيار نوع رئيسي ونوع فرعي من إعدادات المختبر.',
    chemical: 'المواد الكيميائية لا تستخدم عادةً مسببات الحساسية.',
    additive: 'المضافات قد تحتوي مسببات حساسية حسب المصدر.',
    flavoring: 'النكهات قد تحتوي مسببات حساسية حسب التركيب.',
    coloring: 'الملونات قد تحتوي مسببات حساسية حسب المصدر.',
    preservative: 'المواد الحافظة قد تحتوي مسببات حساسية حسب المصدر.',
    other: 'يمكن إدخال البيانات الأساسية للتصنيف الآخر.'
};

const supportsAllergensForCategory = (category: MaterialCategory): boolean =>
    ALLERGEN_SUPPORTED_CATEGORIES.includes(category);

const MaterialsPage: React.FC = () => {
    const { materials, isLoading, error, refetch } = useRawMaterials();
    const { selectedCompany } = useCompanyStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [packagingTypes, setPackagingTypes] = useState<LabPackagingType[]>([]);
    const [packagingSettingsError, setPackagingSettingsError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        category: 'ingredient' as MaterialCategory,
        unit: 'كجم',
        specifications: '',
        storageCondition: '',
        shelfLife: 0,
        shelfLifeUnit: 'days' as ShelfLifeUnit,
        expirySubtractDays: 0,
        requiresLabTest: true,
        packagingOptions: [] as string[],
        packagingTypeId: '',
        packagingSubtypeId: '',
        allergens: [] as string[]
    });

    useEffect(() => {
        const loadPackagingSettings = async () => {
            try {
                const tree = await packagingSettingsService.getLabPackagingSettingsTree({ includeInactive: true });
                setPackagingTypes(tree);
                setPackagingSettingsError(null);
            } catch (error) {
                console.error('Error loading packaging settings:', error);
                setPackagingSettingsError('تعذر تحميل إعدادات مواد التعبئة');
                setPackagingTypes([]);
            }
        };

        loadPackagingSettings();
    }, []);

    const ALLERGEN_OPTIONS = [
        'جلوتين',
        'قمح',
        'حليب',
        'لاكتوز',
        'بيض',
        'صويا',
        'فول سوداني',
        'مكسرات',
        'سمسم',
        'أسماك',
        'قشريات'
    ];

    const filteredMaterials = useMemo(() => {
        if (!searchQuery) return materials;
        const query = searchQuery.toLowerCase();
        return materials.filter(m =>
            m.name.toLowerCase().includes(query) ||
            m.code.toLowerCase().includes(query)
        );
    }, [materials, searchQuery]);

    const stats = useMemo(() => ({
        total: materials.length,
        active: materials.filter(m => m.active).length,
        requiresTest: materials.filter(m => m.requiresLabTest).length
    }), [materials]);

    const openAddModal = () => {
        setEditingMaterial(null);
        setFormData({
            code: generateMaterialCode('ingredient', materials),
            name: '',
            category: 'ingredient',
            unit: 'كجم',
            specifications: '',
            storageCondition: '',
            shelfLife: 0,
            shelfLifeUnit: 'days',
            expirySubtractDays: 0,
            requiresLabTest: true,
            packagingOptions: [],
            packagingTypeId: '',
            packagingSubtypeId: '',
            allergens: []
        });
        setShowModal(true);
    };

    const openEditModal = (material: RawMaterial) => {
        setEditingMaterial(material);
        setFormData({
            code: material.code,
            name: material.name,
            category: material.category,
            unit: material.unit || 'كجم',
            specifications: material.specifications || '',
            storageCondition: material.storageCondition || '',
            shelfLife: material.shelfLife || 0,
            shelfLifeUnit: material.shelfLifeUnit || 'days',
            expirySubtractDays: material.expirySubtractDays || 0,
            requiresLabTest: material.requiresLabTest,
            packagingOptions: material.packagingOptions || [],
            packagingTypeId: material.packagingTypeId || '',
            packagingSubtypeId: material.packagingSubtypeId || '',
            allergens: (material as any).allergens || []
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.code.trim()) return;

        const isMonthlyOrYearlyShelfLife = formData.shelfLifeUnit === 'months' || formData.shelfLifeUnit === 'years';
        const supportsAllergens = supportsAllergensForCategory(formData.category);
        if (formData.category === 'packaging' && !formData.packagingTypeId) {
            window.alert('يرجى اختيار النوع الرئيسي لمواد التعبئة قبل الحفظ');
            return;
        }

        const dataToSubmit = {
            ...formData,
            code: formData.code.trim(),
            name: formData.name.trim(),
            shelfLife: Math.max(0, Math.trunc(Number(formData.shelfLife) || 0)),
            expirySubtractDays: isMonthlyOrYearlyShelfLife
                ? Math.max(0, Math.trunc(Number(formData.expirySubtractDays) || 0))
                : 0,
            packagingOptions: formData.category === 'packaging'
                ? []
                : formData.packagingOptions.map((option) => option.trim()).filter(Boolean),
            allergens: supportsAllergens ? formData.allergens.filter(Boolean) : [],
            packagingTypeId: formData.category === 'packaging' ? formData.packagingTypeId : null,
            packagingSubtypeId: formData.category === 'packaging' ? (formData.packagingSubtypeId || null) : null
        };

        if (editingMaterial) {
            await masterDataService.updateRawMaterial(editingMaterial.id, dataToSubmit);
        } else {
            await masterDataService.createRawMaterial(dataToSubmit, selectedCompany?.id);
        }

        setShowModal(false);
        refetch();
    };

    const handleDelete = async (id: string) => {
        await masterDataService.deleteRawMaterial(id);
        setShowDeleteConfirm(null);
        refetch();
    };

    const handleToggleActive = async (material: RawMaterial) => {
        await masterDataService.updateRawMaterial(material.id, {
            active: !material.active
        });
        refetch();
    };

    const isMonthlyOrYearlyShelfLife = formData.shelfLifeUnit === 'months' || formData.shelfLifeUnit === 'years';
    const supportsAllergens = supportsAllergensForCategory(formData.category);
    const selectedPackagingType = packagingTypes.find((type) => type.id === formData.packagingTypeId);
    const packagingSubtypeOptions = selectedPackagingType
        ? selectedPackagingType.subtypes.filter((subtype) => subtype.isActive || subtype.id === formData.packagingSubtypeId)
        : [];
    const hasPackagingSubtypeOptions = packagingSubtypeOptions.length > 0;

    useEffect(() => {
        if (!hasPackagingSubtypeOptions && formData.packagingSubtypeId) {
            setFormData((prev) => ({ ...prev, packagingSubtypeId: '' }));
        }
    }, [formData.packagingSubtypeId, hasPackagingSubtypeOptions]);

    if (isLoading) {
        return (
            <div className="p-6">
                <TableSkeleton />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Back Button */}
            <Link
                to="/lab"
                className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4 transition-colors"
            >
                <ArrowRightIcon className="w-5 h-5" />
                <span>العودة للمختبر</span>
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <CubeIcon className="w-8 h-8 text-purple-600" />
                        المواد الخام
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة بيانات المواد الخام</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
                >
                    <PlusIcon className="w-5 h-5" />
                    مادة جديدة
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                    <div className="text-sm text-gray-500">إجمالي</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                    <div className="text-sm text-gray-500">نشط</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.requiresTest}</div>
                    <div className="text-sm text-gray-500">يتطلب فحص</div>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالاسم أو الكود..."
                    className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
                />
            </div>

            {/* Materials List */}
            {filteredMaterials.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <CubeIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">لا توجد مواد خام</h3>
                    <p className="text-gray-500 mb-6">ابدأ بإضافة مادة جديدة</p>
                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                    >
                        <PlusIcon className="w-5 h-5" />
                        مادة جديدة
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الكود</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">اسم المادة</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">التصنيف</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الوحدة</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الحالة</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredMaterials.map(material => (
                                <tr key={material.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!material.active ? 'opacity-50' : ''}`}>
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-sm text-purple-600">{material.code}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="font-medium text-gray-900 dark:text-white">{material.name}</div>
                                            {material.requiresLabTest && (
                                                <BeakerIcon className="w-4 h-4 text-blue-500" title="يتطلب فحص" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                                            {materialCategoryLabels[material.category]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                        {material.unit}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleToggleActive(material)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${material.active
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}
                                        >
                                            {material.active ? 'نشط' : 'غير نشط'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1">
                                            <Link
                                                to={`/lab/materials/${material.id}`}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                                title="عرض التفاصيل والروابط"
                                            >
                                                <LinkIcon className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => openEditModal(material)}
                                                className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                                                title="تعديل"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(material.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                title="حذف"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold">
                                {editingMaterial ? 'تعديل مادة' : 'مادة جديدة'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">كود المادة</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                            placeholder="مثال: ING-0001"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, code: generateMaterialCode(formData.category, materials) })}
                                            className="px-3 py-2 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            توليد
                                        </button>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">يمكن إدخال الكود يدويًا أو توليده تلقائيًا.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">اسم المادة *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">التصنيف</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => {
                                            const newCategory = e.target.value as MaterialCategory;
                                            const categorySupportsAllergens = supportsAllergensForCategory(newCategory);

                                            setFormData({
                                                ...formData,
                                                category: newCategory,
                                                // Only regenerate code for new materials, keep existing code for edits
                                                code: editingMaterial ? formData.code : generateMaterialCode(newCategory, materials),
                                                allergens: categorySupportsAllergens
                                                    ? formData.allergens
                                                    : [],
                                                packagingTypeId: newCategory === 'packaging' ? formData.packagingTypeId : '',
                                                packagingSubtypeId: newCategory === 'packaging' ? formData.packagingSubtypeId : ''
                                            });
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                    >
                                        {Object.entries(materialCategoryLabels).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500">{CATEGORY_FIELD_HINTS[formData.category]}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">الوحدة</label>
                                    <select
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                    >
                                        <option value="كجم">كجم</option>
                                        <option value="جم">جم</option>
                                        <option value="لتر">لتر</option>
                                        <option value="مل">مل</option>
                                        <option value="قطعة">قطعة</option>
                                        <option value="كرتون">كرتون</option>
                                        <option value="باليت">باليت</option>
                                    </select>
                                </div>
                            </div>

                            {formData.category === 'packaging' && (
                                <div className="grid grid-cols-2 gap-4 rounded-lg border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-900 dark:bg-blue-900/10">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">النوع الرئيسي *</label>
                                        <select
                                            value={formData.packagingTypeId}
                                            onChange={(e) => {
                                                const nextTypeId = e.target.value;
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    packagingTypeId: nextTypeId,
                                                    packagingSubtypeId: ''
                                                }));
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                            required={formData.category === 'packaging'}
                                        >
                                            <option value="">اختر النوع الرئيسي</option>
                                            {packagingTypes
                                                .filter((type) => type.isActive || type.id === formData.packagingTypeId)
                                                .map((type) => (
                                                    <option key={type.id} value={type.id}>
                                                        {type.name}{type.isActive ? '' : ' (غير نشط)'}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                    {hasPackagingSubtypeOptions && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">النوع الفرعي (اختياري)</label>
                                            <select
                                                value={formData.packagingSubtypeId}
                                                onChange={(e) => setFormData({ ...formData, packagingSubtypeId: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                                disabled={!formData.packagingTypeId}
                                            >
                                                <option value="">بدون نوع فرعي</option>
                                                {packagingSubtypeOptions.map((subtype) => (
                                                    <option key={subtype.id} value={subtype.id}>
                                                        {subtype.name}{subtype.isActive ? '' : ' (غير نشط)'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {packagingSettingsError && (
                                        <p className="col-span-2 text-xs text-red-600 dark:text-red-400">
                                            {packagingSettingsError}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1">المواصفات</label>
                                <textarea
                                    value={formData.specifications}
                                    onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 resize-none"
                                />
                            </div>

                            {formData.category !== 'packaging' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">أنواع التعبئة</label>
                                    <div className="space-y-2">
                                        {formData.packagingOptions.map((option, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={option}
                                                    onChange={(e) => {
                                                        const newOptions = [...formData.packagingOptions];
                                                        newOptions[index] = e.target.value;
                                                        setFormData({ ...formData, packagingOptions: newOptions });
                                                    }}
                                                    placeholder="مثال: كيس 25 كجم"
                                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newOptions = formData.packagingOptions.filter((_, i) => i !== index);
                                                        setFormData({ ...formData, packagingOptions: newOptions });
                                                    }}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, packagingOptions: [...formData.packagingOptions, ''] })}
                                            className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                        >
                                            + إضافة نوع تعبئة
                                        </button>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                        أضف أنواع التعبئة المتاحة لهذه المادة (مثال: كيس 25 كجم، برميل 200 لتر)
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">شروط التخزين</label>
                                    <select
                                        value={formData.storageCondition}
                                        onChange={(e) => setFormData({ ...formData, storageCondition: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                    >
                                        <option value="">اختر</option>
                                        <option value="درجة حرارة الغرفة">درجة حرارة الغرفة</option>
                                        <option value="تبريد (2-8°C)">تبريد (2-8°C)</option>
                                        <option value="تجميد (-18°C)">تجميد (-18°C)</option>
                                        <option value="جاف ومظلم">جاف ومظلم</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">مدة الصلاحية</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.shelfLife}
                                            onChange={(e) => setFormData({ ...formData, shelfLife: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                            placeholder="مثال: 6"
                                        />
                                        <select
                                            value={formData.shelfLifeUnit}
                                            onChange={(e) => {
                                                const nextUnit = e.target.value as ShelfLifeUnit;
                                                setFormData({
                                                    ...formData,
                                                    shelfLifeUnit: nextUnit,
                                                    expirySubtractDays: nextUnit === 'days' ? 0 : formData.expirySubtractDays
                                                });
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                        >
                                            {Object.entries(shelfLifeUnitLabels).map(([value, label]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">خصم أيام (للشهر/السنة)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.expirySubtractDays}
                                        onChange={(e) => setFormData({ ...formData, expirySubtractDays: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-600"
                                        disabled={!isMonthlyOrYearlyShelfLife}
                                        placeholder="0"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        يُطبق فقط إذا كانت الوحدة شهر أو سنة
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.requiresLabTest}
                                        onChange={(e) => setFormData({ ...formData, requiresLabTest: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-300 text-primary-600"
                                    />
                                    <span className="text-sm">يتطلب فحص مخبري</span>
                                </label>
                            </div>

                            {/* مسببات الحساسية */}
                            {supportsAllergens && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">مسببات الحساسية</label>
                                    <div className="flex flex-wrap gap-2">
                                        {ALLERGEN_OPTIONS.map((allergen) => (
                                            <label
                                                key={allergen}
                                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${formData.allergens.includes(allergen)
                                                        ? 'bg-red-100 border-red-400 text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-400'
                                                        : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formData.allergens.includes(allergen)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({ ...formData, allergens: [...formData.allergens, allergen] });
                                                        } else {
                                                            setFormData({ ...formData, allergens: formData.allergens.filter(a => a !== allergen) });
                                                        }
                                                    }}
                                                    className="sr-only"
                                                />
                                                <span className="text-sm">{allergen}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {formData.allergens.length > 0 && (
                                        <p className="text-xs text-red-500 mt-1">⚠️ تحتوي على: {formData.allergens.join('، ')}</p>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                    {editingMaterial ? 'حفظ التعديلات' : 'إضافة المادة'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm m-4">
                        <h3 className="text-lg font-bold mb-2">تأكيد الحذف</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">هل أنت متأكد من حذف هذه المادة؟</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={() => handleDelete(showDeleteConfirm)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                حذف
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaterialsPage;
