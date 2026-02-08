/**
 * Lab Dashboard Page
 * لوحة تحكم المختبر
 * Updated: Using Supabase data
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
    BeakerIcon,
    TruckIcon,
    ClockIcon,
    CheckCircleIcon,
    PlusIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useCompanyStore } from '../../store/companyStore';
import { useMaterialReceivings, useLabTests } from '../../hooks/useLabData';
import {
    labTestStatusLabels,
    labTestStatusColors,
    labTestTypeLabels,
    materialReceivingStatusLabels,
    materialReceivingStatusColors
} from '../../domain/lab/types';
import { LabDashboardSkeleton } from '../../components/common/LoadingStates';

const LabDashboardPage: React.FC = () => {
    // Supabase data hooks
    // Company Store
    const { selectedCompany, companies, selectCompany } = useCompanyStore();

    // Supabase data hooks - TODO: Pass selectedCompany.id to hooks when they support it in next step
    const { receivings, isLoading: materialsLoading, stats: materialStats } = useMaterialReceivings(selectedCompany?.id);
    const { tests, isLoading: testsLoading, stats: testStats } = useLabTests(selectedCompany?.id);

    const isLoading = materialsLoading || testsLoading;

    // Get recent items (first 5)
    const recentTests = tests.slice(0, 5);
    const recentMaterials = receivings.slice(0, 5);

    // Combined stats
    const stats = {
        totalTests: testStats.total,
        pendingTests: testStats.pending + testStats.inProgress,
        totalMaterials: materialStats.total,
        pendingMaterials: materialStats.pending,
        completedToday: testStats.completed,
        approvedTests: testStats.approved,
        rejectedMaterials: materialStats.rejected
    };

    if (isLoading) {
        return <LabDashboardSkeleton />;
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <BeakerIcon className="w-8 h-8 text-primary-600" />
                        المختبر
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        الفحوصات واستلام المواد الخام
                    </p>
                </div>

                {/* Company Selector */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            الشركة:
                        </label>
                        <select
                            value={selectedCompany?.id || ''}
                            onChange={(e) => {
                                if (e.target.value) {
                                    selectCompany(e.target.value);
                                }
                            }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-[200px]"
                        >
                            <option value="">-- اختر شركة --</option>
                            {companies.map(company => (
                                <option key={company.id} value={company.id}>
                                    {company.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
                <Link
                    to="/lab/tests/runs/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    فحص جديد
                </Link>
                <Link
                    to="/lab/receiving/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <TruckIcon className="w-5 h-5" />
                    استلام مادة
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <BeakerIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTests}</div>
                            <div className="text-sm text-gray-500">إجمالي الفحوصات</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <ClockIcon className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingTests}</div>
                            <div className="text-sm text-gray-500">فحوصات معلقة</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <TruckIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMaterials}</div>
                            <div className="text-sm text-gray-500">مواد مستلمة</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <CheckCircleIcon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completedToday}</div>
                            <div className="text-sm text-gray-500">مكتمل اليوم</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                <Link
                    to="/lab/tests"
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white hover:shadow-lg transition-all"
                >
                    <BeakerIcon className="w-10 h-10" />
                    <div>
                        <div className="font-semibold text-lg">الفحوصات</div>
                        <div className="text-blue-100 text-sm">{stats.pendingTests} معلقة</div>
                    </div>
                </Link>
                <Link
                    to="/lab/receiving"
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white hover:shadow-lg transition-all"
                >
                    <TruckIcon className="w-10 h-10" />
                    <div>
                        <div className="font-semibold text-lg">استلام المواد</div>
                        <div className="text-green-100 text-sm">{stats.pendingMaterials} قيد الفحص</div>
                    </div>
                </Link>
                <Link
                    to="/lab/suppliers"
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl text-white hover:shadow-lg transition-all"
                >
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                    <div>
                        <div className="font-semibold text-lg">الموردين</div>
                        <div className="text-indigo-100 text-sm">إدارة الموردين</div>
                    </div>
                </Link>
                <Link
                    to="/lab/materials"
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl text-white hover:shadow-lg transition-all"
                >
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                    </svg>
                    <div>
                        <div className="font-semibold text-lg">الخامات</div>
                        <div className="text-purple-100 text-sm">قائمة المواد</div>
                    </div>
                </Link>
                <Link
                    to="/lab/inspection-criteria"
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl text-white hover:shadow-lg transition-all"
                >
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h11.25c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                    <div>
                        <div className="font-semibold text-lg">معايير الفحص</div>
                        <div className="text-indigo-100 text-sm">إدارة المعايير</div>
                    </div>
                </Link>
            </div>

            {/* Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Lab Tests */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">أحدث الفحوصات</h3>
                    <Link to="/lab/tests/results" className="text-sm text-primary-600 hover:underline">عرض الكل</Link>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {recentTests.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">لا توجد فحوصات</div>
                        ) : (
                            recentTests.map(test => (
                                <Link
                                    key={test.id}
                                    to={`/lab/tests/results/${test.id}`}
                                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">{test.testNumber}</div>
                                        <div className="text-sm text-gray-500">{test.sample.sourceName}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">{labTestTypeLabels[test.testType]}</span>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${labTestStatusColors[test.status].bg} ${labTestStatusColors[test.status].text}`}>
                                            {labTestStatusLabels[test.status]}
                                        </span>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Materials */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">أحدث المواد المستلمة</h3>
                    <Link to="/lab/receiving" className="text-sm text-primary-600 hover:underline">عرض الكل</Link>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {recentMaterials.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">لا توجد مواد</div>
                        ) : (
                            recentMaterials.map(material => (
                                <Link
                                    key={material.id}
                                    to={`/lab/receiving/${material.id}`}
                                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">{material.materialName}</div>
                                        <div className="text-sm text-gray-500">{material.supplierName} - {material.batchNumber}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">{material.quantity} {material.unit}</span>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${(materialReceivingStatusColors[material.status as keyof typeof materialReceivingStatusColors] || { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' }).bg} ${(materialReceivingStatusColors[material.status as keyof typeof materialReceivingStatusColors] || { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' }).text}`}>
                                            {materialReceivingStatusLabels[material.status as keyof typeof materialReceivingStatusLabels] || material.status}
                                        </span>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default LabDashboardPage;
