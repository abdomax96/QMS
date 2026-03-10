/**
 * Material Details Page
 * صفحة تفاصيل وإدارة علاقات المادة الخام
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    CubeIcon,
    ArrowRightIcon,
    BuildingOfficeIcon,
    BeakerIcon,
    PlusIcon,
    TrashIcon,
    CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { DetailPageSkeleton } from '../../components/common/LoadingStates';
import { useSuppliers } from '../../hooks/useMasterData';
import * as masterDataService from '../../services/masterDataService';
import { shelfLifeUnitLabels } from '../../domain/masterData/types';
import type { RawMaterial } from '../../domain/masterData/types';

interface LinkedSupplier {
    supplierId: string;
    supplierName: string;
    supplierCode: string;
    isPrimary: boolean;
    approvalStatus: string;  // Can be any status from DB
}

interface LinkedTest {
    testType: string;
    testName: string;
    parameters: any[];
    required: boolean;
}

const MaterialDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { suppliers: allSuppliers } = useSuppliers();

    const [material, setMaterial] = useState<RawMaterial | null>(null);
    const [linkedSuppliers, setLinkedSuppliers] = useState<LinkedSupplier[]>([]);
    const [linkedTests, setLinkedTests] = useState<LinkedTest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modals
    const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');

    const fetchMaterial = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        setError(null);

        try {
            // Fetch material details
            const materials = await masterDataService.getAllRawMaterials();
            const found = materials.find(m => m.id === id);
            if (found) {
                setMaterial(found);
            }

            // Fetch linked suppliers
            const suppliers = await masterDataService.getApprovedSuppliersForMaterial(id);
            setLinkedSuppliers(suppliers.map(s => ({
                supplierId: s.id,
                supplierName: s.name,
                supplierCode: s.code,
                isPrimary: s.isPrimary,
                approvalStatus: s.approvalStatus
            })));

            // Fetch linked tests
            const tests = await masterDataService.getRequiredTestsForMaterial(id);
            setLinkedTests(tests);
        } catch (err) {
            setError('فشل في تحميل بيانات المادة');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchMaterial();
    }, [fetchMaterial]);

    const handleAddSupplier = async () => {
        if (!id || !selectedSupplierId) return;

        // Use the material's companyId
        const companyId = material?.companyId || '';
        await masterDataService.linkSupplierToMaterial(id, selectedSupplierId, companyId);
        setShowAddSupplierModal(false);
        setSelectedSupplierId('');
        fetchMaterial();
    };

    const handleRemoveSupplier = async (supplierId: string) => {
        if (!id) return;
        const companyId = material?.companyId || '';
        await masterDataService.unlinkSupplierFromMaterial(id, supplierId, companyId);
        fetchMaterial();
    };

    // Navigate to Inspection Criteria page to add test
    const handleNavigateToAddTest = () => {
        navigate(`/lab/inspection-criteria?materialId=${id}`);
    };;

    // Available suppliers (not already linked)
    const availableSupp = allSuppliers.filter(
        s => !linkedSuppliers.some(ls => ls.supplierId === s.id)
    );

    if (isLoading) {
        return <DetailPageSkeleton />;
    }

    if (error || !material) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
                    {error || 'المادة غير موجودة'}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Back Button */}
            <Link
                to="/lab/materials"
                className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 mb-4"
            >
                <ArrowRightIcon className="w-5 h-5" />
                <span>العودة للمواد الخام</span>
            </Link>

            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                        <CubeIcon className="w-10 h-10 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{material.name}</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="font-mono text-purple-600">{material.code}</span>
                            {material.requiresLabTest && (
                                <span className="flex items-center gap-1 text-sm text-blue-600">
                                    <BeakerIcon className="w-4 h-4" />
                                    يتطلب فحص
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Material Information */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CubeIcon className="w-6 h-6 text-purple-600" />
                    معلومات المادة
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">التصنيف</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                            {material.category}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">الوحدة</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                            {material.unit}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">مدة الصلاحية</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                            {material.shelfLife
                                ? `${material.shelfLife} ${shelfLifeUnitLabels[material.shelfLifeUnit || 'days']}`
                                : 'غير محدد'}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">خصم أيام عند الشهر/السنة</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                            {material.expirySubtractDays || 0}
                        </div>
                    </div>
                    {material.specifications && (
                        <div className="md:col-span-2 lg:col-span-3">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">المواصفات</div>
                            <div className="font-medium text-gray-900 dark:text-white">
                                {(() => {
                                    let specs = material.specifications;
                                    if (typeof specs === 'string') {
                                        try { specs = JSON.parse(specs); } catch (e) { return specs; }
                                    }
                                    if (typeof specs !== 'object' || !specs) return specs;

                                    return (
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {Object.entries(specs).map(([key, val]: [string, any]) => {
                                                // Skip redundant fields
                                                if (key === 'storage_temp' || key === 'shelf_life_months') return null;

                                                let displayVal = '';
                                                if (typeof val === 'object' && val !== null) {
                                                    const parts: string[] = [];
                                                    if (val.min !== undefined && val.min !== null) parts.push(`Min ${val.min}`);
                                                    if (val.max !== undefined && val.max !== null) parts.push(`Max ${val.max}`);
                                                    if (val.unit) parts.push(val.unit);
                                                    displayVal = parts.join(' ');
                                                } else {
                                                    displayVal = String(val);
                                                }

                                                // Format Key (Capitalize)
                                                const displayKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

                                                return (
                                                    <span key={key} className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm border border-gray-200 dark:border-gray-600">
                                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{displayKey}:</span>
                                                        <span className="text-gray-900 dark:text-white" dir="ltr">{displayVal}</span>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                    {material.storageCondition && (
                        <div className="md:col-span-2 lg:col-span-3">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">شروط التخزين</div>
                            <div className="font-medium text-gray-900 dark:text-white">
                                {typeof material.storageCondition === 'object'
                                    ? JSON.stringify(material.storageCondition)
                                    : material.storageCondition}
                            </div>
                        </div>
                    )}
                    {material.packagingOptions && material.packagingOptions.length > 0 && (
                        <div className="md:col-span-2 lg:col-span-3">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">أنواع التعبئة المتاحة</div>
                            <div className="flex flex-wrap gap-2">
                                {material.packagingOptions.map((option, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium"
                                    >
                                        {option}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Linked Suppliers */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
                            الموردين المعتمدين
                        </h2>
                        <button
                            onClick={() => setShowAddSupplierModal(true)}
                            className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg"
                        >
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {linkedSuppliers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <BuildingOfficeIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p>لا يوجد موردين مربوطين</p>
                            <button
                                onClick={() => setShowAddSupplierModal(true)}
                                className="mt-3 text-blue-600 hover:underline"
                            >
                                إضافة مورد
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {linkedSuppliers.map(supplier => (
                                <div
                                    key={supplier.supplierId}
                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <CheckBadgeIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-white">{supplier.supplierName}</div>
                                            <div className="text-sm text-gray-500 font-mono">{supplier.supplierCode}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {supplier.isPrimary && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded font-medium">⭐ أساسي</span>
                                            )}
                                            <span className={`px-2 py-0.5 text-xs rounded font-medium ${supplier.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                                                supplier.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                    supplier.approvalStatus === 'suspended' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}>
                                                {supplier.approvalStatus === 'approved' ? 'معتمد' :
                                                    supplier.approvalStatus === 'pending' ? 'قيد المراجعة' :
                                                        supplier.approvalStatus === 'suspended' ? 'معلق' : 'مرفوض'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveSupplier(supplier.supplierId)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded ml-2"
                                        title="إزالة المورد"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Linked Tests */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <BeakerIcon className="w-6 h-6 text-green-600" />
                            الفحوصات المطلوبة
                        </h2>
                        <button
                            onClick={handleNavigateToAddTest}
                            className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg"
                            title="إضافة معيار فحص جديد"
                        >
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {linkedTests.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <BeakerIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p>لا توجد فحوصات مربوطة</p>
                            <button
                                onClick={handleNavigateToAddTest}
                                className="mt-3 text-green-600 hover:underline"
                            >
                                إضافة فحص من صفحة معايير الفحص
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {linkedTests.map((test, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="font-medium text-gray-900 dark:text-white">{test.testName}</div>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${test.testType === 'chemical' ? 'bg-blue-100 text-blue-700' :
                                                    test.testType === 'physical' ? 'bg-green-100 text-green-700' :
                                                        test.testType === 'microbiological' ? 'bg-purple-100 text-purple-700' :
                                                            'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {test.testType}
                                                </span>
                                                {test.required && (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded font-medium">إلزامي</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {test.parameters && test.parameters.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المعايير:</p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {test.parameters.map((p: any, paramIdx: number) => (
                                                    <div key={paramIdx} className="flex items-center gap-2 text-sm">
                                                        <span className="font-medium text-gray-600 dark:text-gray-400">{p.name}:</span>
                                                        {p.minValue && p.maxValue && (
                                                            <span className="text-gray-500">
                                                                {p.minValue} - {p.maxValue} {p.unit || ''}
                                                            </span>
                                                        )}
                                                        {p.minValue && !p.maxValue && (
                                                            <span className="text-gray-500">
                                                                ≥ {p.minValue} {p.unit || ''}
                                                            </span>
                                                        )}
                                                        {!p.minValue && p.maxValue && (
                                                            <span className="text-gray-500">
                                                                ≤ {p.maxValue} {p.unit || ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Supplier Modal */}
            {showAddSupplierModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 m-4">
                        <h3 className="text-lg font-bold mb-4">إضافة مورد</h3>

                        <select
                            value={selectedSupplierId}
                            onChange={(e) => setSelectedSupplierId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 dark:bg-gray-700"
                        >
                            <option value="">اختر مورد...</option>
                            {availableSupp.map(s => (
                                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                            ))}
                        </select>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddSupplierModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleAddSupplier}
                                disabled={!selectedSupplierId}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                إضافة
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaterialDetailsPage;
