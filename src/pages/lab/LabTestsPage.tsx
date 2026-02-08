/**
 * Lab Tests Page
 * صفحة فحوصات المختبر
 * Updated: Using Supabase data
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    BeakerIcon,
    EyeIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';
import { TableSkeleton } from '../../components/common/LoadingStates';
import { useLabTests } from '../../hooks/useLabData';
import { FormattedDate } from '../../components/common/FormattedDate';
import {
    labTestStatusLabels,
    labTestStatusColors,
    labTestTypeLabels
} from '../../domain/lab/types';
import type { LabTestStatus, LabTestType } from '../../domain/lab/types';

const LabTestsPage: React.FC = () => {
    // Load tests from Supabase
    const { tests, isLoading, error, stats: testStats } = useLabTests();

    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState<LabTestStatus[]>([]);
    const [typeFilter, setTypeFilter] = useState<LabTestType[]>([]);

    const filteredTests = useMemo(() => {
        let result = tests;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.testNumber.toLowerCase().includes(query) ||
                t.sample.sourceName.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter.length > 0) {
            result = result.filter(t => statusFilter.includes(t.status));
        }

        // Type filter
        if (typeFilter.length > 0) {
            result = result.filter(t => typeFilter.includes(t.testType));
        }

        return result;
    }, [tests, searchQuery, statusFilter, typeFilter]);

    const toggleStatusFilter = (status: LabTestStatus) => {
        setStatusFilter(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    const toggleTypeFilter = (type: LabTestType) => {
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
                        <BeakerIcon className="w-8 h-8 text-primary-600" />
                        فحوصات المختبر
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة وتتبع الفحوصات</p>
                </div>
                <Link
                    to="/lab/quick-entry"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl hover:from-primary-700 hover:to-purple-700 transition-all shadow-lg"
                >
                    <PlusIcon className="w-5 h-5" />
                    فحص جديد
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{testStats.total}</div>
                    <div className="text-sm text-gray-500">إجمالي</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{testStats.pending}</div>
                    <div className="text-sm text-gray-500">قيد الانتظار</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-blue-600">{testStats.inProgress}</div>
                    <div className="text-sm text-gray-500">قيد الفحص</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-orange-600">{testStats.completed}</div>
                    <div className="text-sm text-gray-500">مكتمل</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-green-600">{testStats.approved}</div>
                    <div className="text-sm text-gray-500">معتمد</div>
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
                        placeholder="بحث برقم الفحص أو المادة..."
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
                                {(Object.entries(labTestStatusLabels) as [LabTestStatus, string][]).map(([status, label]) => (
                                    <button
                                        key={status}
                                        onClick={() => toggleStatusFilter(status)}
                                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${statusFilter.includes(status)
                                            ? `${labTestStatusColors[status].bg} ${labTestStatusColors[status].text} font-medium`
                                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">النوع</label>
                            <div className="flex flex-wrap gap-2">
                                {(Object.entries(labTestTypeLabels) as [LabTestType, string][]).map(([type, label]) => (
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

            {/* Tests List */}
            {filteredTests.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <BeakerIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">لا توجد فحوصات</h3>
                    <p className="text-gray-500 mb-6">ابدأ بإنشاء فحص جديد</p>
                    <Link
                        to="/lab/quick-entry"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
                    >
                        <PlusIcon className="w-5 h-5" />
                        فحص جديد
                    </Link>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">رقم الفحص</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">العينة</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">النوع</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الأولوية</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الحالة</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">إجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredTests.map(test => (
                                <tr key={test.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-medium text-primary-600">{test.testNumber}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900 dark:text-white">{test.sample.sourceName}</div>
                                        <div className="text-sm text-gray-500">{test.sample.sampleNumber}</div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                        {labTestTypeLabels[test.testType]}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${test.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                            test.priority === 'urgent' ? 'bg-orange-100 text-orange-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {test.priority === 'critical' ? 'حرجة' : test.priority === 'urgent' ? 'عاجلة' : 'عادية'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${labTestStatusColors[test.status].bg} ${labTestStatusColors[test.status].text}`}>
                                            {labTestStatusLabels[test.status]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        <FormattedDate date={test.requestedAt} />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Link
                                            to={`/lab/tests/${test.id}`}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
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

export default LabTestsPage;
