/**
 * Pallet Dashboard Page
 * Overview of pallet management system with key metrics
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCompanyStore } from '../../store/companyStore';
import { supabase } from '../../config/supabase';
import { Package, Truck, AlertTriangle, BarChart3, Settings, ChartPie, List } from 'lucide-react';
import type { PalletStatistics, LoadingStatistics } from '../../types/pallet';
import { palletBatchService } from '../../services/palletBatchService';

export default function PalletDashboard() {
    const { selectedCompanyId } = useCompanyStore();
    const [stats, setStats] = useState<PalletStatistics | null>(null);
    const [loadingStats, setLoadingStats] = useState<LoadingStatistics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (selectedCompanyId) {
            loadDashboardData();
        }
    }, [selectedCompanyId]);

    const loadDashboardData = async () => {
        if (!selectedCompanyId) return;

        try {
            setLoading(true);
            // Load real statistics from API
            const { stats, loadingStats } = await palletBatchService.getDashboardStatistics(selectedCompanyId);
            setStats(stats);
            setLoadingStats(loadingStats);
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                {/* Header Skeleton */}
                <div className="h-10 bg-gray-200 rounded w-64 mb-8 animate-pulse"></div>

                {/* Quick Actions Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-gray-200 rounded-lg h-32 animate-pulse"></div>
                    ))}
                </div>

                {/* Statistics Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                            <div className="h-8 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                        </div>
                    ))}
                </div>

                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2].map((i) => (
                        <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
                            <div className="space-y-3">
                                {[1, 2, 3].map((j) => (
                                    <div key={j} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900">لوحة تحكم نظام البالتات</h1>

                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">الشركة:</label>
                    <select
                        value={selectedCompanyId || ''}
                        onChange={(e) => {
                            const companyId = e.target.value;
                            if (companyId) {
                                useCompanyStore.getState().selectCompany(companyId);
                            }
                        }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                    >
                        {useCompanyStore.getState().companies.map((company) => (
                            <option key={company.id} value={company.id}>
                                {company.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Link
                    to="/pallet/production"
                    className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 hover:shadow-lg transition-all"
                >
                    <Package className="mb-3" size={32} />
                    <h3 className="text-xl font-semibold mb-2">تسجيل إنتاج</h3>
                    <p className="text-blue-100 text-sm">إضافة بالتات جديدة</p>
                </Link>

                <Link
                    to="/pallet/warehouse"
                    className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 hover:shadow-lg transition-all"
                >
                    <Truck className="mb-3" size={32} />
                    <h3 className="text-xl font-semibold mb-2">التحميل</h3>
                    <p className="text-green-100 text-sm">إدارة تحميل السيارات</p>
                </Link>

                <Link
                    to="/pallet/quality"
                    className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg p-6 hover:shadow-lg transition-all"
                >
                    <AlertTriangle className="mb-3" size={32} />
                    <h3 className="text-xl font-semibold mb-2">الجودة</h3>
                    <p className="text-yellow-100 text-sm">إدارة الحجز والفرز</p>
                </Link>

                <Link
                    to="/pallet/reports"
                    className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 hover:shadow-lg transition-all"
                >
                    <ChartPie className="mb-3" size={32} />
                    <h3 className="text-xl font-semibold mb-2">التقارير</h3>
                    <p className="text-purple-100 text-sm">تقارير الإنتاج والأداء</p>
                </Link>

                <Link
                    to="/pallet/list"
                    className="bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-lg p-6 hover:shadow-lg transition-all"
                >
                    <List className="mb-3" size={32} />
                    <h3 className="text-xl font-semibold mb-2">سجل البالتات</h3>
                    <p className="text-teal-100 text-sm">عرض شامل مع فلاتر وبحث</p>
                </Link>

                <Link
                    to="/pallet/settings"
                    className="bg-gradient-to-br from-gray-500 to-gray-600 text-white rounded-lg p-6 hover:shadow-lg transition-all"
                >
                    <Settings className="mb-3" size={32} />
                    <h3 className="text-xl font-semibold mb-2">الإعدادات</h3>
                    <p className="text-gray-100 text-sm">إعدادات النظام والبالتات</p>
                </Link>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-500">إجمالي البالتات</p>
                        <Package className="text-blue-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats?.total_pallets || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        {stats?.total_cartons?.toLocaleString()} كرتونة
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-500">باتشات نشطة</p>
                        <BarChart3 className="text-green-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats?.active_batches || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        من {stats?.total_batches} إجمالي
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-500">حجوزات نشطة</p>
                        <AlertTriangle className="text-yellow-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats?.active_holds_count || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        {stats?.holds_count} إجمالي الحجوزات
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-500">عمليات تحميل</p>
                        <Truck className="text-purple-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{loadingStats?.total_operations || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        {loadingStats?.total_pallets_loaded} بالتة محملة
                    </p>
                </div>
            </div>

            {/* Status Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pallet Status */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">توزيع حالات البالتات</h3>
                    <div className="space-y-3">
                        {Object.entries(stats?.pallets_by_status || {}).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 capitalize">{status}</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-32 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full"
                                            style={{
                                                width: `${((count as number) / (stats?.total_pallets || 1)) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                                        {count as number}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Loading Operations */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">عمليات التحميل</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <span className="text-sm text-gray-700">عمليات مكتملة</span>
                            <span className="text-2xl font-bold text-green-600">
                                {loadingStats?.operations_by_status.completed || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm text-gray-700">عمليات جارية</span>
                            <span className="text-2xl font-bold text-blue-600">
                                {loadingStats?.operations_by_status.in_progress || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-700">عمليات مخططة</span>
                            <span className="text-2xl font-bold text-gray-600">
                                {loadingStats?.operations_by_status.planned || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
