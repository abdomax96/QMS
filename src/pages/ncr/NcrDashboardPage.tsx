/**
 * NCR Dashboard Page
 * لوحة تحكم مع إحصائيات وتقارير القسم
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    ChartBarIcon,
    ClipboardDocumentListIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowTrendingUpIcon,
    UserGroupIcon,
    FunnelIcon,
    BuildingOffice2Icon
} from '@heroicons/react/24/outline';
import { LabDashboardSkeleton } from '../../components/common/LoadingStates';
import { useAuth } from '../../hooks/ncr/useAuth';
import { useNcrs } from '../../hooks/ncr/useNcrs';
import { useEnsureCompaniesLoaded } from '../../hooks/useEnsureCompaniesLoaded';
import { WORKFLOW_STAGES } from '../../types/ncr';
import type { NcrRecord } from '../../types/ncr';

// Statistics Card Component
function StatCard({
    title,
    value,
    icon: Icon,
    color,
    subtitle
}: {
    title: string;
    value: number | string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    subtitle?: string;
}) {
    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${color}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl ${color.replace('border-l-4', 'bg-opacity-20')}`}>
                    <Icon className="w-8 h-8 text-gray-600 dark:text-gray-300" />
                </div>
            </div>
        </div>
    );
}

// NCR Item for lists
function NcrListItem({ ncr }: { ncr: NcrRecord }) {
    const stage = WORKFLOW_STAGES[ncr.currentStage];
    return (
        <Link
            to={`/ncr/${ncr.id}`}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
        >
            <div className="flex items-center gap-3">
                <span className="text-2xl">{stage?.icon || '📄'}</span>
                <div>
                    <p className="font-medium text-gray-900 dark:text-white">{ncr.description?.slice(0, 40) || 'بدون وصف'}...</p>
                    <p className="text-sm text-gray-500">{ncr.department} • {stage?.name}</p>
                </div>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${ncr.severity === 'high' ? 'bg-red-100 text-red-700' :
                ncr.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                }`}>
                {ncr.severity === 'high' ? 'عالي' : ncr.severity === 'medium' ? 'متوسط' : 'منخفض'}
            </span>
        </Link>
    );
}

export default function NcrDashboardPage() {
    const { companies, selectedCompanyId, selectCompany } = useEnsureCompaniesLoaded();
    const { profile } = useAuth();
    const { ncrs, isLoading, requiresCompanySelection } = useNcrs(selectedCompanyId);
    const [filterDept, setFilterDept] = useState<string>('all');

    const userDepartment = profile?.department || '';

    // Calculate statistics
    const stats = useMemo(() => {
        const filtered = filterDept === 'all' ? ncrs : ncrs.filter(n => n.department === filterDept);

        const openNcrs = filtered.filter(n => n.status === 'open');
        const closedNcrs = filtered.filter(n => n.status === 'closed');
        const highSeverity = filtered.filter(n => n.severity === 'high' && n.status === 'open');

        // Pending actions - NCRs awaiting action in each stage
        const pendingApproval = filtered.filter(n =>
            n.rootCauseApproval?.status === 'pending'
        );

        // CAPA due soon (within 3 days)
        const now = new Date();
        const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const capaDueSoon = filtered.filter(n =>
            n.actions?.some(a =>
                a.status !== 'completed' &&
                a.targetDate &&
                new Date(a.targetDate) <= threeDaysLater
            )
        );

        // By stage
        const byStage: Record<string, number> = {};
        Object.keys(WORKFLOW_STAGES).forEach(stage => {
            byStage[stage] = openNcrs.filter(n => n.currentStage === stage).length;
        });

        // By department
        const departments = [...new Set(ncrs.map(n => n.department))].filter(Boolean);

        return {
            total: filtered.length,
            open: openNcrs.length,
            closed: closedNcrs.length,
            highSeverity: highSeverity.length,
            pendingApproval: pendingApproval.length,
            capaDueSoon: capaDueSoon.length,
            byStage,
            departments
        };
    }, [ncrs, filterDept]);

    // Recent NCRs
    const recentNcrs = useMemo(() => {
        return ncrs
            .filter(n => n.status === 'open')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
    }, [ncrs]);

    // My pending actions
    const myPendingActions = useMemo(() => {
        return ncrs.filter(n => {
            // Check if I need to approve root cause
            if (n.rootCauseApproval?.status === 'pending') {
                const myRole = userDepartment.toLowerCase().includes('quality') ? 'quality' : 'department';
                if (n.rootCauseApproval.proposedByRole !== myRole) return true;
            }
            // Check if I have assigned CAPA
            if (n.actions?.some(a =>
                a.status !== 'completed' &&
                (a.responsibleDept === userDepartment || a.responsiblePerson.includes(profile?.name || ''))
            )) return true;
            return false;
        }).slice(0, 5);
    }, [ncrs, userDepartment, profile]);

    if (isLoading) {
        return <LabDashboardSkeleton />;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ChartBarIcon className="w-7 h-7 text-primary-600" />
                        لوحة تحكم NCR
                    </h1>
                    <p className="text-gray-500 mt-1">نظرة عامة على تقارير عدم المطابقة</p>
                </div>

                {/* Department Filter */}
                <div className="flex items-center gap-2">
                    <BuildingOffice2Icon className="w-5 h-5 text-gray-400" />
                    <select
                        value={selectedCompanyId || ''}
                        onChange={(e) => {
                            if (e.target.value) {
                                selectCompany(e.target.value);
                            }
                        }}
                        className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm"
                    >
                        <option value="">اختر الشركة</option>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                                {company.name}
                            </option>
                        ))}
                    </select>
                    <FunnelIcon className="w-5 h-5 text-gray-400" />
                    <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm"
                    >
                        <option value="all">كل الأقسام</option>
                        {stats.departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>

            {requiresCompanySelection && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    يرجى اختيار الشركة لعرض مؤشرات NCR الخاصة بها.
                </div>
            )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="التقارير المفتوحة"
                    value={stats.open}
                    icon={ClipboardDocumentListIcon}
                    color="border-l-4 border-l-blue-500"
                    subtitle={`من أصل ${stats.total}`}
                />
                <StatCard
                    title="بانتظار الموافقة"
                    value={stats.pendingApproval}
                    icon={ClockIcon}
                    color="border-l-4 border-l-yellow-500"
                    subtitle="تحتاج إجراء"
                />
                <StatCard
                    title="شدة عالية"
                    value={stats.highSeverity}
                    icon={ExclamationTriangleIcon}
                    color="border-l-4 border-l-red-500"
                    subtitle="تحتاج اهتمام عاجل"
                />
                <StatCard
                    title="تم الإغلاق"
                    value={stats.closed}
                    icon={CheckCircleIcon}
                    color="border-l-4 border-l-green-500"
                    subtitle="هذا الشهر"
                />
            </div>

            {/* Stage Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <ArrowTrendingUpIcon className="w-5 h-5 text-primary-600" />
                    توزيع المراحل
                </h2>
                <div className="grid grid-cols-5 gap-2">
                    {Object.entries(WORKFLOW_STAGES).map(([key, stage]) => (
                        <div key={key} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="text-2xl block mb-1">{stage.icon}</span>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats.byStage[key] || 0}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{stage.name}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent NCRs */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <ClipboardDocumentListIcon className="w-5 h-5 text-primary-600" />
                            أحدث التقارير
                        </h2>
                        <Link to="/ncr" className="text-sm text-primary-600 hover:underline">
                            عرض الكل
                        </Link>
                    </div>
                    {recentNcrs.length > 0 ? (
                        <div className="space-y-1">
                            {recentNcrs.map(ncr => (
                                <NcrListItem key={ncr.id} ncr={ncr} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">لا توجد تقارير مفتوحة</p>
                    )}
                </div>

                {/* My Pending Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <UserGroupIcon className="w-5 h-5 text-orange-500" />
                            إجراءاتي المعلقة
                        </h2>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-sm rounded-full">
                            {myPendingActions.length}
                        </span>
                    </div>
                    {myPendingActions.length > 0 ? (
                        <div className="space-y-1">
                            {myPendingActions.map(ncr => (
                                <NcrListItem key={ncr.id} ncr={ncr} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">🎉 لا توجد إجراءات معلقة</p>
                    )}
                </div>
            </div>
        </div>
    );
}
