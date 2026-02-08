/**
 * Allergen Management Page
 * صفحة إدارة مسببات الحساسية
 */

import React, { useState, useEffect } from 'react';
import {
    ExclamationTriangleIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { COMMON_ALLERGENS, type AllergenProfile } from '../../types/foodSafety';
import { supabase } from '../../config/supabase';
import { LabDashboardSkeleton } from '../../components/common/LoadingStates';

const AllergenManagement: React.FC = () => {
    const [products, setProducts] = useState<AllergenProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAllergen, setSelectedAllergen] = useState<string | null>(null);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const { data, error } = await supabase.from('allergen_profiles').select('id, product_name, product_code, contains_allergens, may_contain_allergens, cleaning_verification_required, last_updated, updated_by').limit(200);
            if (error) throw error;

            const profiles = (data || []).map((row: any) => ({
                id: row.id,
                productName: row.product_name || row.productName,
                productCode: row.product_code || row.productCode,
                containsAllergens: row.contains_allergens || row.containsAllergens || [],
                mayContainAllergens: row.may_contain_allergens || row.mayContainAllergens || [],
                cleaningVerificationRequired: row.cleaning_verification_required || row.cleaningVerificationRequired,
                lastUpdated: row.last_updated,
                updatedBy: row.updated_by
            }));
            setProducts(profiles);
        } catch (err) {
            console.error('Error loading allergen profiles:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.productCode.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesAllergen = !selectedAllergen ||
            p.containsAllergens.includes(selectedAllergen) ||
            p.mayContainAllergens.includes(selectedAllergen);
        return matchesSearch && matchesAllergen;
    });

    const getAllergenStats = () => {
        const stats: Record<string, number> = {};
        COMMON_ALLERGENS.forEach(a => { stats[a] = 0; });
        products.forEach(p => {
            p.containsAllergens.forEach(a => { if (stats[a] !== undefined) stats[a]++; });
            p.mayContainAllergens.forEach(a => { if (stats[a] !== undefined) stats[a]++; });
        });
        return stats;
    };

    if (isLoading) {
        return <LabDashboardSkeleton />;
    }

    const stats = getAllergenStats();

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />
                        إدارة مسببات الحساسية
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        تتبع مسببات الحساسية في المنتجات وإدارة التنظيف
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                    <PlusIcon className="w-5 h-5" />
                    إضافة منتج
                </button>
            </div>

            {/* Allergen Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    مسببات الحساسية الشائعة
                </h2>
                <div className="flex flex-wrap gap-2">
                    {COMMON_ALLERGENS.map(allergen => (
                        <button
                            key={allergen}
                            onClick={() => setSelectedAllergen(selectedAllergen === allergen ? null : allergen)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedAllergen === allergen
                                ? 'bg-amber-500 text-white'
                                : stats[allergen] > 0
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                }`}
                        >
                            {allergen} ({stats[allergen]})
                        </button>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="بحث عن منتج..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            {searchQuery || selectedAllergen ? 'لا توجد نتائج' : 'لا توجد منتجات مسجلة'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {searchQuery || selectedAllergen
                                ? 'جرب تعديل معايير البحث'
                                : 'ابدأ بإضافة ملف مسببات الحساسية للمنتجات'}
                        </p>
                        {!searchQuery && !selectedAllergen && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                إضافة منتج
                            </button>
                        )}
                    </div>
                ) : (
                    filteredProducts.map(product => (
                        <div
                            key={product.id}
                            className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{product.productName}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">كود: {product.productCode}</p>
                                </div>
                                {product.cleaningVerificationRequired && (
                                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                                        يتطلب تحقق التنظيف
                                    </span>
                                )}
                            </div>

                            {/* Contains Allergens */}
                            {product.containsAllergens.length > 0 && (
                                <div className="mb-3">
                                    <p className="text-xs font-medium text-red-600 mb-1">يحتوي على:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {product.containsAllergens.map((a, idx) => (
                                            <span key={idx} className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                                                {a}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* May Contain */}
                            {product.mayContainAllergens.length > 0 && (
                                <div className="mb-3">
                                    <p className="text-xs font-medium text-amber-600 mb-1">قد يحتوي على:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {product.mayContainAllergens.map((a, idx) => (
                                            <span key={idx} className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                                                {a}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {product.containsAllergens.length === 0 && product.mayContainAllergens.length === 0 && (
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircleIcon className="w-5 h-5" />
                                    <span className="text-sm">خالي من مسببات الحساسية الشائعة</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add Product Modal */}
            {showAddModal && (
                <AddAllergenProfileModal
                    onClose={() => setShowAddModal(false)}
                    onSave={async (data) => {
                        await supabase.from('allergen_profiles').insert({
                            product_name: data.productName,
                            product_code: data.productCode,
                            contains_allergens: data.containsAllergens,
                            may_contain_allergens: data.mayContainAllergens,
                            cleaning_verification_required: data.cleaningVerificationRequired,
                            last_updated: new Date().toISOString(),
                            updated_by: 'current-user'
                        });
                        loadProducts();
                        setShowAddModal(false);
                    }}
                />
            )}
        </div>
    );
};

// Add Allergen Profile Modal
interface AddAllergenProfileModalProps {
    onClose: () => void;
    onSave: (data: Omit<AllergenProfile, 'id' | 'lastUpdated' | 'updatedBy'>) => Promise<void>;
}

const AddAllergenProfileModal: React.FC<AddAllergenProfileModalProps> = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        productName: '',
        productCode: '',
        containsAllergens: [] as string[],
        mayContainAllergens: [] as string[],
        cleaningVerificationRequired: false
    });
    const [isSaving, setIsSaving] = useState(false);

    const toggleAllergen = (list: 'containsAllergens' | 'mayContainAllergens', allergen: string) => {
        const current = formData[list];
        if (current.includes(allergen)) {
            setFormData({ ...formData, [list]: current.filter(a => a !== allergen) });
        } else {
            // Remove from other list if present
            const otherList = list === 'containsAllergens' ? 'mayContainAllergens' : 'containsAllergens';
            setFormData({
                ...formData,
                [list]: [...current, allergen],
                [otherList]: formData[otherList].filter(a => a !== allergen)
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        إضافة ملف مسببات الحساسية
                    </h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">اسم المنتج *</label>
                            <input
                                type="text"
                                value={formData.productName}
                                onChange={e => setFormData({ ...formData, productName: e.target.value })}
                                required
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">كود المنتج *</label>
                            <input
                                type="text"
                                value={formData.productCode}
                                onChange={e => setFormData({ ...formData, productCode: e.target.value })}
                                required
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">يحتوي على (أحمر):</label>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_ALLERGENS.map(allergen => (
                                <button
                                    key={allergen}
                                    type="button"
                                    onClick={() => toggleAllergen('containsAllergens', allergen)}
                                    className={`px-3 py-1 rounded-full text-sm transition-colors ${formData.containsAllergens.includes(allergen)
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    {allergen}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">قد يحتوي على (برتقالي):</label>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_ALLERGENS.map(allergen => (
                                <button
                                    key={allergen}
                                    type="button"
                                    onClick={() => toggleAllergen('mayContainAllergens', allergen)}
                                    className={`px-3 py-1 rounded-full text-sm transition-colors ${formData.mayContainAllergens.includes(allergen)
                                        ? 'bg-amber-500 text-white'
                                        : formData.containsAllergens.includes(allergen)
                                            ? 'bg-red-200 text-red-400 cursor-not-allowed'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                    disabled={formData.containsAllergens.includes(allergen)}
                                >
                                    {allergen}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="cleaningRequired"
                            checked={formData.cleaningVerificationRequired}
                            onChange={e => setFormData({ ...formData, cleaningVerificationRequired: e.target.checked })}
                            className="rounded"
                        />
                        <label htmlFor="cleaningRequired" className="text-sm">
                            يتطلب تحقق التنظيف بين الدفعات
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                        >
                            {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AllergenManagement;
