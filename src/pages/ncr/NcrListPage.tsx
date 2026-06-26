import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    PlusIcon,
    FunnelIcon,
    ArrowDownTrayIcon,
    MagnifyingGlassIcon,
    EyeIcon,
    DocumentTextIcon,
    ClipboardDocumentCheckIcon,
    WrenchScrewdriverIcon,
    CheckBadgeIcon,
    Cog6ToothIcon,
    BuildingOffice2Icon,
    PrinterIcon
} from '@heroicons/react/24/outline';
import { useNcrs } from '../../hooks/ncr/useNcrs';
import { useNcrSettings } from '../../hooks/ncr/useNcrSettings';
import { usePermissions } from '../../hooks/usePermissions';
import { useEnsureCompaniesLoaded } from '../../hooks/useEnsureCompaniesLoaded';
import { WORKFLOW_STAGES } from '../../types/ncr';
import type { NcrRecord, NcrStage } from '../../types/ncr';
import { TableSkeleton } from '../../components/common/LoadingStates';
import { printNcrReport } from '../../services/ncr/ncrPrintService';

const severityLabels: Record<string, string> = {
    low: 'منخفض',
    medium: 'متوسط',
    high: 'مرتفع'
};

const severityColors: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
};

const stageIcons: Record<string, React.ElementType> = {
    initial_report: DocumentTextIcon,
    root_cause_analysis: MagnifyingGlassIcon,
    capa_planning: ClipboardDocumentCheckIcon,
    capa_execution: WrenchScrewdriverIcon,
    verification_closure: CheckBadgeIcon
};

function formatDate(dateStr: string): string {
    try {
        return new Intl.DateTimeFormat('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(dateStr));
    } catch {
        return dateStr;
    }
}

function calculateDaysOpen(ncr: NcrRecord): number {
    const start = new Date(ncr.createdAt);
    const end = ncr.closedAt ? new Date(ncr.closedAt) : new Date();
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

interface Filters {
    department: string;
    status: string;
    severity: string;
    search: string;
    dateFrom: string;
    dateTo: string;
}

const NcrListPage = () => {
    const { companies, selectedCompanyId, selectCompany } = useEnsureCompaniesLoaded();
    const { ncrs, isLoading, requiresCompanySelection } = useNcrs(selectedCompanyId);
    const { settings } = useNcrSettings();
    const { can } = usePermissions();
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<Filters>({
        department: '',
        status: '',
        severity: '',
        search: '',
        dateFrom: '',
        dateTo: ''
    });

    const filtered = useMemo(() => {
        return ncrs.filter((ncr: NcrRecord) => {
            if (filters.department && ncr.department !== filters.department) return false;
            if (filters.status) {
                if (filters.status === 'closed' && !ncr.closedAt) return false;
                if (filters.status === 'open' && ncr.closedAt) return false;
            }
            if (filters.severity && ncr.severity !== filters.severity) return false;
            if (filters.search) {
                const term = filters.search.trim().toLowerCase();
                const haystack = `${ncr.number} ${ncr.description} ${ncr.department}`.toLowerCase();
                if (!haystack.includes(term)) return false;
            }
            if (filters.dateFrom && ncr.date < filters.dateFrom) return false;
            if (filters.dateTo && ncr.date > filters.dateTo) return false;
            return true;
        });
    }, [filters, ncrs]);

    const updateFilter = (name: keyof Filters, value: string) => {
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const exportCsv = () => {
        if (!filtered.length) return;
        const headers = ['رقم التقرير', 'التاريخ', 'القسم', 'الخطورة', 'الحالة', 'الوصف'];
        const rows = filtered.map((ncr: NcrRecord) => {
            const statusText = ncr.closedAt ? 'مغلق' : (WORKFLOW_STAGES[ncr.currentStage]?.name || 'مفتوح');
            return [ncr.number, ncr.date, ncr.department, severityLabels[ncr.severity], statusText, ncr.description.replace(/\n/g, ' ')];
        });
        const csvContent = [headers, ...rows].map((row) => row.map((cell: string) => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ncr-reports-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const stats = useMemo(() => ({
        total: ncrs.length,
        open: ncrs.filter((n: NcrRecord) => !n.closedAt).length,
        closed: ncrs.filter((n: NcrRecord) => !!n.closedAt).length,
        high: ncrs.filter((n: NcrRecord) => n.severity === 'high' && !n.closedAt).length
    }), [ncrs]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تقارير عدم المطابقة</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة ومتابعة تقارير NCR</p>
                    <div className="mt-3 flex items-center gap-2">
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
                <div className="flex gap-2 flex-wrap justify-end">
                    <Link
                        to="/ncr/settings"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Cog6ToothIcon className="w-5 h-5" />
                        <span>إعدادات NCR</span>
                    </Link>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <FunnelIcon className="w-5 h-5" />
                        <span>تصفية</span>
                    </button>
                    {can('ncr', 'export') && (
                        <button
                            onClick={exportCsv}
                            disabled={!filtered.length}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            <span>تصدير</span>
                        </button>
                    )}
                    {can('ncr', 'create') && (
                        <Link
                            to="/ncr/new"
                            className={`inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors ${!selectedCompanyId ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>تقرير جديد</span>
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي التقارير</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-blue-600">{stats.open}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">تقارير مفتوحة</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-green-600">{stats.closed}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">تقارير مغلقة</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-red-600">{stats.high}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">خطورة مرتفعة</div>
                </div>
            </div>

            {showFilters && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">القسم</label>
                            <select
                                value={filters.department}
                                onChange={(e) => updateFilter('department', e.target.value)}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                            >
                                <option value="">جميع الأقسام</option>
                                {settings?.departments?.map((dept: string) => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحالة</label>
                            <select
                                value={filters.status}
                                onChange={(e) => updateFilter('status', e.target.value)}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                            >
                                <option value="">جميع الحالات</option>
                                <option value="open">مفتوح</option>
                                <option value="closed">مغلق</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الخطورة</label>
                            <select
                                value={filters.severity}
                                onChange={(e) => updateFilter('severity', e.target.value)}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                            >
                                <option value="">جميع المستويات</option>
                                <option value="low">منخفض</option>
                                <option value="medium">متوسط</option>
                                <option value="high">مرتفع</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">بحث</label>
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                                <input
                                    type="search"
                                    placeholder="رقم التقرير أو الوصف..."
                                    value={filters.search}
                                    onChange={(e) => updateFilter('search', e.target.value)}
                                    className="w-full pr-10 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                />
                            </div>
                        </div>
                    </div>
                    {/* Date Range Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">من تاريخ</label>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => updateFilter('dateTo', e.target.value)}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => setFilters({ department: '', status: '', severity: '', search: '', dateFrom: '', dateTo: '' })}
                                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                مسح الفلاتر
                            </button>
                        </div>
                        <div className="flex items-end">
                            <span className="text-sm text-gray-500">
                                {filtered.length} نتيجة
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {isLoading ? (
                    <TableSkeleton rows={10} />
                ) : requiresCompanySelection ? (
                    <div className="p-8 text-center">
                        <p className="text-gray-500">يرجى اختيار الشركة لعرض تقارير NCR الخاصة بها.</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-gray-500">لا توجد تقارير مطابقة للفلتر.</p>
                        <Link to="/ncr/new" className="text-primary-600 hover:underline mt-2 inline-block">
                            إنشاء تقرير جديد
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">رقم التقرير</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">التاريخ</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">القسم</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">الخطورة</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">المرحلة / الحالة</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">الأيام</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filtered.map((ncr: NcrRecord) => {
                                    const isClosed = !!ncr.closedAt;
                                    const stageKey = ncr.currentStage || 'initial_report';
                                    const stageInfo = WORKFLOW_STAGES[stageKey] || WORKFLOW_STAGES.initial_report;
                                    const StageIcon = isClosed ? CheckBadgeIcon : (stageIcons[stageKey] || DocumentTextIcon);

                                    const stageLabel = isClosed ? 'مغلق' : stageInfo.name;
                                    const stageClasses = isClosed
                                        ? 'bg-gray-100 text-gray-800 ring-gray-600/20'
                                        : `${stageInfo.bgColor || 'bg-gray-100'} ${stageInfo.color || 'text-gray-800'}`;

                                    return (
                                        <tr key={ncr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 text-sm font-medium text-primary-600">{ncr.number}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(ncr.date)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{ncr.department}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${severityColors[ncr.severity]}`}>
                                                    {severityLabels[ncr.severity]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${stageClasses}`}>
                                                    <StageIcon className="w-4 h-4" />
                                                    <span>{stageLabel}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{calculateDaysOpen(ncr)} يوم</td>
                        <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        to={`/ncr/${ncr.id}`}
                                                        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                        <span>عرض</span>
                                                    </Link>
                                                    {can('ncr', 'export') && (
                                                        <button
                                                            onClick={() => void printNcrReport(ncr)}
                                                            className="inline-flex items-center gap-1 text-gray-600 hover:text-primary-600"
                                                            title="طباعة تقرير NCR"
                                                        >
                                                            <PrinterIcon className="w-4 h-4" />
                                                            <span>طباعة</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NcrListPage;
