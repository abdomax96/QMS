import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    EyeIcon,
    CubeIcon,
    ExclamationTriangleIcon,
    BuildingOffice2Icon
} from '@heroicons/react/24/outline';
import { supabase } from '../../config/supabase';
import { useNcrs } from '../../hooks/ncr/useNcrs';
import { useEnsureCompaniesLoaded } from '../../hooks/useEnsureCompaniesLoaded';
import type { NcrRecord } from '../../types/ncr';
import { LabDashboardSkeleton } from '../../components/common/LoadingStates';

interface HoldItem {
    id: string;
    number: string;
    product: string;
    reserved: string;
    unit: string;
    sorted: number;
    destroyed: number;
    remaining: number;
    severity: string;
}

const HoldsPage = () => {
    const { companies, selectedCompanyId, selectCompany } = useEnsureCompaniesLoaded();
    const { ncrs, isLoading, requiresCompanySelection } = useNcrs(selectedCompanyId);
    const [holdMetrics, setHoldMetrics] = useState<Record<string, { sorted: number; destroyed: number }>>({});

    useEffect(() => {
        const loadHoldMetrics = async () => {
            if (!selectedCompanyId || ncrs.length === 0) {
                setHoldMetrics({});
                return;
            }

            const ncrIds = ncrs.map((row) => row.id);
            const { data, error } = await supabase
                .from('ncr_hold_sort_logs')
                .select('ncr_id, sorted_qty, destroyed_qty')
                .eq('company_id', selectedCompanyId)
                .in('ncr_id', ncrIds);

            if (error) {
                console.error('Failed to load hold metrics:', error);
                setHoldMetrics({});
                return;
            }

            const next: Record<string, { sorted: number; destroyed: number }> = {};
            (data || []).forEach((row: any) => {
                const ncrId = row.ncr_id as string;
                if (!next[ncrId]) {
                    next[ncrId] = { sorted: 0, destroyed: 0 };
                }
                next[ncrId].sorted += Number(row.sorted_qty || 0);
                next[ncrId].destroyed += Number(row.destroyed_qty || 0);
            });

            setHoldMetrics(next);
        };

        loadHoldMetrics();
    }, [ncrs, selectedCompanyId]);

    const holds = useMemo(() => {
        return ncrs
            .map((r: NcrRecord) => {
                const reserved = Number(r.reservedQty || 0);
                const legacySorted = (r.holds || []).reduce((sum: number, hold: any) => sum + Number(hold.quantity || hold.qty || 0), 0);
                const metrics = holdMetrics[r.id] || { sorted: legacySorted, destroyed: 0 };
                const remaining = reserved - metrics.sorted;
                return {
                    id: r.id,
                    number: r.number,
                    product: r.productName ?? r.lineOrArea ?? '-',
                    reserved: r.reservedQty ?? '-',
                    unit: r.reservedUnit ?? '-',
                    sorted: metrics.sorted,
                    destroyed: metrics.destroyed,
                    remaining: Math.max(0, remaining),
                    severity: r.severity
                } as HoldItem;
            })
            .filter((h) => Number(h.remaining) > 0);
    }, [holdMetrics, ncrs]);

    const stats = useMemo(() => ({
        total: holds.length,
        totalQty: holds.reduce((sum, h) => sum + h.remaining, 0),
        highSeverity: holds.filter(h => h.severity === 'high').length
    }), [holds]);

    if (isLoading) {
        return <LabDashboardSkeleton />;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">المحتجزات (HOLD)</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة الكميات المحجوزة من تقارير عدم المطابقة</p>
                </div>
                <div className="flex items-center gap-2">
                    <BuildingOffice2Icon className="w-5 h-5 text-gray-400" />
                    <label className="text-sm text-gray-600 dark:text-gray-300">الشركة:</label>
                    <select
                        value={selectedCompanyId || ''}
                        onChange={(e) => {
                            if (e.target.value) {
                                selectCompany(e.target.value);
                            }
                        }}
                        className="min-w-[220px] rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm"
                    >
                        <option value="">اختر الشركة</option>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                                {company.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <CubeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">محتجزات نشطة</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                            <CubeIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalQty}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي الكميات</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.highSeverity}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">خطورة مرتفعة</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {holds.length === 0 ? (
                    <div className="p-8 text-center">
                        <CubeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">
                            {requiresCompanySelection ? 'يرجى اختيار الشركة أولاً' : 'لا توجد منتجات محجوزة حالياً'}
                        </p>
                        <Link to="/ncr" className="text-primary-600 hover:underline mt-2 inline-block">
                            عرض تقارير عدم المطابقة
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">رقم التقرير</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">المنتج</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">الكمية المحجوزة</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">المفرزة</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">المتهلكة</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">المتبقي</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">الخطورة</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {holds.map((h) => (
                                    <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 text-sm font-medium text-primary-600">{h.number}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{h.product}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{h.reserved} {h.unit}</td>
                                        <td className="px-4 py-3 text-sm text-blue-700 dark:text-blue-300">{h.sorted} {h.unit}</td>
                                        <td className="px-4 py-3 text-sm text-red-700 dark:text-red-300">{h.destroyed} {h.unit}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${h.remaining > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                                }`}>
                                                {h.remaining} {h.unit}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${h.severity === 'high' ? 'bg-red-100 text-red-800' :
                                                h.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                                }`}>
                                                {h.severity === 'high' ? 'مرتفع' : h.severity === 'medium' ? 'متوسط' : 'منخفض'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                to={`/ncr/${h.id}`}
                                                className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                                <span>عرض</span>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HoldsPage;
