/**
 * Material Receiving Page
 * صفحة استلام المواد الخام
 * Updated: Using Supabase data via useMaterialReceivings hook
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    TruckIcon,
    EyeIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';
import { TableSkeleton } from '../../components/common/LoadingStates';
import { useMaterialReceivings } from '../../hooks/useLabData';
import { FormattedDate } from '../../components/common/FormattedDate';
import {
    materialTypeLabels,
    materialReceivingStatusLabels,
    materialReceivingStatusColors
} from '../../domain/lab/types';
import type { MaterialType, MaterialReceivingStatus } from '../../domain/lab/types';

const MaterialReceivingPage: React.FC = () => {
    // Supabase data hook
    const { receivings, isLoading, error, refetch, stats } = useMaterialReceivings();

    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState<MaterialReceivingStatus[]>([]);
    const [typeFilter, setTypeFilter] = useState<MaterialType[]>([]);

    const filteredMaterials = useMemo(() => {
        let result = receivings;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(m =>
                m.materialName.toLowerCase().includes(query) ||
                m.receivingNumber.toLowerCase().includes(query) ||
                m.batchNumber.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter.length > 0) {
            result = result.filter(m => statusFilter.includes(m.status));
        }

        // Type filter
        if (typeFilter.length > 0) {
            result = result.filter(m => typeFilter.includes(m.materialType));
        }

        return result;
    }, [receivings, searchQuery, statusFilter, typeFilter]);

    const toggleStatusFilter = (status: MaterialReceivingStatus) => {
        setStatusFilter(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    const toggleTypeFilter = (type: MaterialType) => {
        setTypeFilter(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const clearFilters = () => {
        setStatusFilter([]);
        setTypeFilter([]);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="p-6">
                <TableSkeleton />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-6 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button onClick={refetch} className="px-4 py-2 bg-primary-600 text-white rounded-lg">
                        إعادة المحاولة
                    </button>
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
                        <TruckIcon className="w-8 h-8 text-green-600" />
                        استلام المواد الخام
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">تسجيل وفحص المواد الواردة</p>
                </div>
                <Link
                    to="/lab/receiving/new"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
                >
                    <PlusIcon className="w-5 h-5" />
                    استلام جديد
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                    <div className="text-sm text-gray-500">إجمالي</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                    <div className="text-sm text-gray-500">قيد الانتظار</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
                    <div className="text-sm text-gray-500">مقبول</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                    <div className="text-sm text-gray-500">مرفوض</div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="بحث باسم المادة أو رقم الاستلام..."
                        className="w-full pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-colors ${showFilters ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'border-gray-300 dark:border-gray-600'
                        }`}
                >
                    <FunnelIcon className="w-5 h-5" />
                    فلتر
                </button>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">الفلاتر</h3>
                        <button onClick={clearFilters} className="text-sm text-primary-600 hover:underline">مسح</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">الحالة</label>
                            <div className="flex flex-wrap gap-2">
                                {(Object.entries(materialReceivingStatusLabels) as [MaterialReceivingStatus, string][]).map(([status, label]) => (
                                    <button
                                        key={status}
                                        onClick={() => toggleStatusFilter(status)}
                                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${statusFilter.includes(status)
                                            ? `${materialReceivingStatusColors[status].bg} ${materialReceivingStatusColors[status].text} font-medium`
                                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">نوع المادة</label>
                            <div className="flex flex-wrap gap-2">
                                {(Object.entries(materialTypeLabels) as [MaterialType, string][]).map(([type, label]) => (
                                    <button
                                        key={type}
                                        onClick={() => toggleTypeFilter(type)}
                                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${typeFilter.includes(type)
                                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 font-medium'
                                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Materials List */}
            {filteredMaterials.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <TruckIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">لا توجد مواد</h3>
                    <p className="text-gray-500 mb-6">ابدأ بتسجيل استلام جديد</p>
                    <Link
                        to="/lab/receiving/new"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700"
                    >
                        <PlusIcon className="w-5 h-5" />
                        استلام جديد
                    </Link>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">رقم الاستلام</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">المادة</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">المورد</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الكمية</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الحالة</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الاستهلاك</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">إجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredMaterials.map(material => (
                                <tr key={material.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-medium text-green-600">{material.receivingNumber}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900 dark:text-white">{material.materialName}</div>
                                        <div className="text-sm text-gray-500">Batch: {material.batchNumber}</div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                        {material.supplierName}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                        {material.quantity} {material.unit}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${materialReceivingStatusColors[material.status].bg} ${materialReceivingStatusColors[material.status].text}`}>
                                            {materialReceivingStatusLabels[material.status]}
                                        </span>
                                        {material.isManuallyDepleted && (
                                            <span className="mr-2 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                نفدت يدوياً
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                        <div>مستهلك: {Number(material.consumedQuantity ?? 0).toFixed(3)} {material.unit}</div>
                                        <div className="font-medium">متبقي: {Number(material.remainingQuantity ?? material.acceptedQuantity ?? material.quantity ?? 0).toFixed(3)} {material.unit}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        <FormattedDate date={material.receivedAt} />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Link
                                            to={`/lab/receiving/${material.id}`}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                            عرض
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MaterialReceivingPage;
