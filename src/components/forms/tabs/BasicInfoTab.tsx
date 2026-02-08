import React, { useEffect, useState } from 'react';
import type { FormTemplate } from '../../../types';
import { useCompanyStore } from '../../../store/companyStore';
import { getAllCompanies } from '../../../services/companyService';
import { getProducts } from '../../../services/productService';
import type { Product } from '../../../types/product';

interface BasicInfoTabProps {
    template: FormTemplate;
    onChange: (updates: Partial<FormTemplate>) => void;
}

const BasicInfoTab: React.FC<BasicInfoTabProps> = ({ template, onChange }) => {
    const { companies, setCompanies } = useCompanyStore();
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Auto-load companies
    useEffect(() => {
        if (companies.length === 0) {
            getAllCompanies().then(setCompanies);
        }
    }, [companies.length, setCompanies]);

    // Auto-load products when company changes
    useEffect(() => {
        const companyId = template.basic_info?.company_id;
        if (companyId && template.type === 'quality-control') {
            setLoadingProducts(true);
            getProducts(companyId).then(data => {
                setProducts(data);
                setLoadingProducts(false);
            });
        } else {
            setProducts([]);
        }
    }, [template.basic_info?.company_id, template.type]);

    // Automatic variable synchronization map - Only for quality-control templates
    const FIELD_TO_VARIABLE_MAP: Record<string, { name: string, desc: string, unit?: string }> = {
        standard_weight: { name: 'STANDARD_WEIGHT', desc: 'الوزن القياسي', unit: 'gm' },
        aql_level: { name: 'AQL_LEVEL', desc: 'مستوى AQL', unit: '%' },
        shelf_life_months: { name: 'SHELF_LIFE', desc: 'مدة الصلاحية', unit: 'months' },
        cartons_per_pallet: { name: 'CARTONS_PER_PALLET', desc: 'كراتين لكل باليت', unit: 'carton' },
        packs_per_box: { name: 'PACKS_PER_BOX', desc: 'عبوات لكل علبة', unit: 'pack' },
        boxes_per_carton: { name: 'BOXES_PER_CARTON', desc: 'علب لكل كرتون', unit: 'box' },
        empty_box_weight: { name: 'EMPTY_BOX_WEIGHT', desc: 'وزن العلبة الفارغة', unit: 'gm' },
        empty_carton_weight: { name: 'EMPTY_CARTON_WEIGHT', desc: 'وزن الكرتون الفارغ', unit: 'gm' },
    };

    // أسماء المتغيرات الخاصة بمعلومات المنتج
    const PRODUCT_VARIABLE_NAMES = Object.values(FIELD_TO_VARIABLE_MAP).map(v => v.name);

    // Sync variables function - Only for quality-control templates
    const syncVariables = (currentBasicInfo: any, currentVariables: any[], isQualityControl: boolean) => {
        let newVariables = [...currentVariables];
        let hasChanges = false;

        // إذا لم يكن النموذج مراقبة جودة، احذف متغيرات المنتج
        if (!isQualityControl) {
            const filteredVariables = newVariables.filter(v => !PRODUCT_VARIABLE_NAMES.includes(v.name));
            if (filteredVariables.length !== newVariables.length) {
                return filteredVariables;
            }
            return null;
        }

        // مزامنة المتغيرات لنماذج مراقبة الجودة فقط
        Object.entries(FIELD_TO_VARIABLE_MAP).forEach(([field, config]) => {
            const value = currentBasicInfo?.[field];

            if (value !== undefined && value !== null && value !== '' && value !== 0) {
                const existingIndex = newVariables.findIndex(v => v.name === config.name);

                if (existingIndex >= 0) {
                    if (newVariables[existingIndex].value !== value) {
                        newVariables[existingIndex] = {
                            ...newVariables[existingIndex],
                            value: value,
                            unit: config.unit,
                            description: config.desc
                        };
                        hasChanges = true;
                    }
                } else {
                    newVariables.push({
                        name: config.name,
                        value: value,
                        unit: config.unit,
                        description: config.desc
                    });
                    hasChanges = true;
                }
            }
        });

        return hasChanges ? newVariables : null;
    };

    // Auto-sync on mount and when template type changes
    useEffect(() => {
        const isQualityControl = template.type === 'quality-control';
        const updatedVariables = syncVariables(template.basic_info, template.custom_variables || [], isQualityControl);
        if (updatedVariables) {
            onChange({ custom_variables: updatedVariables });
        }
    }, [template.type]);

    const handleBasicInfoChange = (field: string, value: any) => {
        const newBasicInfo = {
            ...template.basic_info,
            [field]: value,
        };

        const isQualityControl = template.type === 'quality-control';
        const updatedVariables = syncVariables(newBasicInfo, template.custom_variables || [], isQualityControl);

        onChange({
            basic_info: newBasicInfo,
            custom_variables: updatedVariables || template.custom_variables
        });
    };

    const handleCompanyChange = (companyId: string) => {
        const selectedCompany = companies.find(c => c.id === companyId);
        onChange({
            basic_info: {
                ...template.basic_info,
                company_id: companyId || undefined,
                company_name: selectedCompany?.name || undefined,
                // Reset product when company changes
                product_id: undefined,
                product_name: undefined,
            },
            // Reset name if it was auto-generated
            ...(template.name?.startsWith('نموذج منتج') ? { name: '' } : {}),
        });
    };

    // Handle product selection for quality-control templates
    const handleProductChange = (productId: string) => {
        const selectedProduct = products.find(p => p.id === productId);
        const newName = selectedProduct ? `نموذج منتج ${selectedProduct.name}` : '';

        onChange({
            name: newName,
            basic_info: {
                ...template.basic_info,
                product_id: productId || undefined,
                product_name: selectedProduct?.name || undefined,
            },
        });
    };


    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    معلومات النموذج
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Company Selection */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            الشركة / العميل
                        </label>
                        <select
                            value={template.basic_info?.company_id || ''}
                            onChange={(e) => handleCompanyChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">-- اختر الشركة / العميل --</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            اختر الشركة أو العميل الذي يخص هذا التقرير
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            اسم النموذج
                        </label>
                        <input
                            type="text"
                            value={template.name}
                            onChange={(e) => onChange({ name: e.target.value })}
                            readOnly={template.type === 'quality-control' && !!template.basic_info?.product_id}
                            disabled={template.type === 'quality-control' && !!template.basic_info?.product_id}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:text-white ${template.type === 'quality-control' && template.basic_info?.product_id
                                ? 'bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 cursor-not-allowed'
                                : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700'
                                }`}
                            placeholder="أدخل اسم النموذج"
                        />
                        {template.type === 'quality-control' && template.basic_info?.product_id && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                يتم تحديد اسم النموذج تلقائياً بناءً على المنتج المختار
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            نوع النموذج
                        </label>
                        <select
                            value={template.type}
                            onChange={(e) => onChange({ type: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="quality-control">مراقبة جودة منتجات</option>
                            <option value="data-collection">جمع بيانات</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* معلومات المنتج - تظهر فقط عند اختيار مراقبة جودة منتجات */}
            {template.type === 'quality-control' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        معلومات المنتج
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Product Selection - اختيار المنتج */}
                        <div className="lg:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                اختر المنتج <span className="text-red-500">*</span>
                            </label>
                            {!template.basic_info?.company_id ? (
                                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-lg">
                                    ⚠️ يرجى اختيار الشركة أولاً لعرض المنتجات
                                </p>
                            ) : loadingProducts ? (
                                <div className="text-sm text-gray-500 px-3 py-2">جاري تحميل المنتجات...</div>
                            ) : products.length === 0 ? (
                                <p className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                                    لا توجد منتجات لهذه الشركة
                                </p>
                            ) : (
                                <select
                                    value={template.basic_info?.product_id || ''}
                                    onChange={(e) => handleProductChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">-- اختر المنتج --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                    ))}
                                </select>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                عند اختيار المنتج سيتم تحديث اسم النموذج تلقائياً
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                الوزن القياسي (جم)
                            </label>
                            <input
                                type="number"
                                value={template.basic_info?.standard_weight || ''}
                                onChange={(e) => handleBasicInfoChange('standard_weight', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                مدة الصلاحية (شهور)
                            </label>
                            <input
                                type="number"
                                value={template.basic_info?.shelf_life_months || ''}
                                onChange={(e) => handleBasicInfoChange('shelf_life_months', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                placeholder="12"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                مستوى AQL (MIL-STD-105E)
                            </label>
                            <select
                                value={template.basic_info?.aql_level || '1.0'}
                                onChange={(e) => handleBasicInfoChange('aql_level', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                            >
                                <optgroup label="Very Strict (0.010 - 0.40)">
                                    <option value="0.010">0.010%</option>
                                    <option value="0.015">0.015%</option>
                                    <option value="0.025">0.025%</option>
                                    <option value="0.040">0.040%</option>
                                </optgroup>
                                <optgroup label="Strict (0.065 - 0.40)">
                                    <option value="0.065">0.065%</option>
                                    <option value="0.10">0.10%</option>
                                    <option value="0.15">0.15%</option>
                                    <option value="0.25">0.25%</option>
                                    <option value="0.40">0.40%</option>
                                </optgroup>
                                <optgroup label="Normal (0.65 - 4.0)">
                                    <option value="0.65">0.65%</option>
                                    <option value="1.0">1.0% (الافتراضي)</option>
                                    <option value="1.5">1.5%</option>
                                    <option value="2.5">2.5%</option>
                                    <option value="4.0">4.0%</option>
                                </optgroup>
                                <optgroup label="Lenient (6.5 - 25)">
                                    <option value="6.5">6.5%</option>
                                    <option value="10">10%</option>
                                    <option value="15">15%</option>
                                    <option value="25">25%</option>
                                </optgroup>
                                <optgroup label="Very Lenient (40 - 1000)">
                                    <option value="40">40%</option>
                                    <option value="65">65%</option>
                                    <option value="100">100%</option>
                                    <option value="150">150%</option>
                                    <option value="250">250%</option>
                                    <option value="400">400%</option>
                                    <option value="650">650%</option>
                                    <option value="1000">1000%</option>
                                </optgroup>
                            </select>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                حسب معيار MIL-STD-105E / ISO 2859-1
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                كراتين لكل باليت
                            </label>
                            <input
                                type="number"
                                value={template.basic_info?.cartons_per_pallet || ''}
                                onChange={(e) => handleBasicInfoChange('cartons_per_pallet', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                عبوات لكل علبة
                            </label>
                            <input
                                type="number"
                                value={template.basic_info?.packs_per_box || ''}
                                onChange={(e) => handleBasicInfoChange('packs_per_box', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                علب لكل كرتون
                            </label>
                            <input
                                type="number"
                                value={template.basic_info?.boxes_per_carton || ''}
                                onChange={(e) => handleBasicInfoChange('boxes_per_carton', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                وزن العلبة الفارغة (جم)
                            </label>
                            <input
                                type="number"
                                value={template.basic_info?.empty_box_weight || ''}
                                onChange={(e) => handleBasicInfoChange('empty_box_weight', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                وزن الكرتون الفارغ (جم)
                            </label>
                            <input
                                type="number"
                                value={template.basic_info?.empty_carton_weight || ''}
                                onChange={(e) => handleBasicInfoChange('empty_carton_weight', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BasicInfoTab;
