/**
 * لوحة تحكم الأخطاء
 * Error Dashboard - Admin panel to view and manage tracked errors
 */

import React, { useState, useMemo } from 'react';
import {
    AlertTriangle,
    AlertCircle,
    AlertOctagon,
    Info,
    Search,
    Filter,
    Download,
    Trash2,
    RefreshCw,
    X,
    Copy,
    Check,
    ChevronDown,
    Eye,
    CheckCircle,
    Globe,
    Code,
    Wifi,
    FileWarning,
    HelpCircle,
    Calendar,
    Clock,
    User,
    Monitor,
    ExternalLink,
} from 'lucide-react';
import { useErrorTrackingStore } from '../../store/errorTrackingStore';
import type {
    ErrorRecord,
    ErrorType,
    ErrorSeverity,
    ErrorFilters,
} from '../../types/errorTracking';
import {
    ERROR_TRACKING_CONFIG,
} from '../../types/errorTracking';

// أيقونات حسب نوع الخطأ
const TypeIcons: Record<ErrorType, React.ReactNode> = {
    javascript: <Code className="w-4 h-4" />,
    api: <Globe className="w-4 h-4" />,
    network: <Wifi className="w-4 h-4" />,
    validation: <FileWarning className="w-4 h-4" />,
    component: <AlertTriangle className="w-4 h-4" />,
    unknown: <HelpCircle className="w-4 h-4" />,
};

// أيقونات حسب الخطورة
const SeverityIcons: Record<ErrorSeverity, React.ReactNode> = {
    critical: <AlertOctagon className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
};

/**
 * تنسيق التاريخ والوقت
 */
function formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

/**
 * تنسيق الوقت النسبي
 */
function formatRelativeTime(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return formatDateTime(isoString);
}

/**
 * شريط الإحصائيات
 */
function StatsBar() {
    const { stats } = useErrorTrackingStore();

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {/* إجمالي الأخطاء */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">الإجمالي</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            </div>

            {/* غير مقروء */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">غير مقروء</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.unread}</div>
            </div>

            {/* الحرج */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                <div className="text-sm text-red-600 dark:text-red-400 mb-1">حرج</div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.bySeverity.critical}</div>
            </div>

            {/* أخطاء */}
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                <div className="text-sm text-orange-600 dark:text-orange-400 mb-1">أخطاء</div>
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.bySeverity.error}</div>
            </div>

            {/* تحذيرات */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">تحذيرات</div>
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.bySeverity.warning}</div>
            </div>

            {/* آخر 24 ساعة */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">آخر 24 ساعة</div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.last24Hours}</div>
            </div>

            {/* آخر 7 أيام */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <div className="text-sm text-green-600 dark:text-green-400 mb-1">آخر 7 أيام</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.last7Days}</div>
            </div>
        </div>
    );
}

/**
 * صف الخطأ في الجدول
 */
function ErrorRow({
    error,
    onSelect,
    onDelete
}: {
    error: ErrorRecord;
    onSelect: () => void;
    onDelete: () => void;
}) {
    const typeColors = ERROR_TRACKING_CONFIG.TYPE_COLORS[error.type];
    const severityColors = ERROR_TRACKING_CONFIG.SEVERITY_COLORS[error.severity];

    return (
        <tr
            className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${!error.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                }`}
            onClick={onSelect}
        >
            {/* الخطورة */}
            <td className="px-4 py-3">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${severityColors.bg} ${severityColors.text}`}>
                    <span className={severityColors.icon}>{SeverityIcons[error.severity]}</span>
                    {ERROR_TRACKING_CONFIG.SEVERITY_LABELS[error.severity]}
                </div>
            </td>

            {/* النوع */}
            <td className="px-4 py-3">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeColors.bg} ${typeColors.text}`}>
                    {TypeIcons[error.type]}
                    {ERROR_TRACKING_CONFIG.TYPE_LABELS[error.type]}
                </div>
            </td>

            {/* الرسالة */}
            <td className="px-4 py-3 max-w-md">
                <div className="flex items-center gap-2">
                    {!error.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate font-medium">
                        {error.message}
                    </p>
                </div>
                {error.component && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        في {error.component}
                    </p>
                )}
            </td>

            {/* الصفحة */}
            <td className="px-4 py-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px]" title={error.route}>
                    {error.route || '-'}
                </p>
            </td>

            {/* الوقت */}
            <td className="px-4 py-3">
                <p className="text-sm text-gray-600 dark:text-gray-400" title={formatDateTime(error.timestamp)}>
                    {formatRelativeTime(error.timestamp)}
                </p>
            </td>

            {/* الإجراءات */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onSelect(); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="عرض التفاصيل"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="حذف"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

/**
 * نافذة تفاصيل الخطأ
 */
function ErrorDetailsModal({
    error,
    onClose,
    onMarkResolved,
    onDelete,
}: {
    error: ErrorRecord;
    onClose: () => void;
    onMarkResolved: () => void;
    onDelete: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const severityColors = ERROR_TRACKING_CONFIG.SEVERITY_COLORS[error.severity];
    const typeColors = ERROR_TRACKING_CONFIG.TYPE_COLORS[error.type];

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(error, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            console.log('Error details:', error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* الرأس */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${severityColors.bg}`}>
                            <span className={severityColors.icon}>{SeverityIcons[error.severity]}</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                تفاصيل الخطأ
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{error.id}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* المحتوى */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* الشارات */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${severityColors.bg} ${severityColors.text}`}>
                            {SeverityIcons[error.severity]}
                            {ERROR_TRACKING_CONFIG.SEVERITY_LABELS[error.severity]}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${typeColors.bg} ${typeColors.text}`}>
                            {TypeIcons[error.type]}
                            {ERROR_TRACKING_CONFIG.TYPE_LABELS[error.type]}
                        </span>
                        {error.isResolved && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-4 h-4" />
                                تم الحل
                            </span>
                        )}
                    </div>

                    {/* الرسالة */}
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">الرسالة</h3>
                        <p className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                            {error.message}
                        </p>
                    </div>

                    {/* Stack Trace */}
                    {error.stack && (
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Stack Trace</h3>
                            <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap font-mono">
                                {error.stack}
                            </pre>
                        </div>
                    )}

                    {/* Component Stack */}
                    {error.componentStack && (
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Component Stack</h3>
                            <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap font-mono">
                                {error.componentStack}
                            </pre>
                        </div>
                    )}

                    {/* معلومات API */}
                    {error.apiInfo && (
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">معلومات API</h3>
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">Method:</span>
                                    <span className="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                        {error.apiInfo.method}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">URL:</span>
                                    <span className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all">
                                        {error.apiInfo.url}
                                    </span>
                                </div>
                                {error.apiInfo.status && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">Status:</span>
                                        <span className={`font-mono text-sm px-2 py-0.5 rounded ${error.apiInfo.status >= 500 ? 'bg-red-100 text-red-800' :
                                                error.apiInfo.status >= 400 ? 'bg-orange-100 text-orange-800' :
                                                    'bg-green-100 text-green-800'
                                            }`}>
                                            {error.apiInfo.status} {error.apiInfo.statusText}
                                        </span>
                                    </div>
                                )}
                                {error.apiInfo.duration && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">Duration:</span>
                                        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                                            {error.apiInfo.duration}ms
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* معلومات السياق */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm font-medium">التاريخ والوقت</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{formatDateTime(error.timestamp)}</p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                <ExternalLink className="w-4 h-4" />
                                <span className="text-sm font-medium">الصفحة</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-mono break-all">{error.route || error.url}</p>
                        </div>

                        {error.component && (
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                    <Code className="w-4 h-4" />
                                    <span className="text-sm font-medium">المكون</span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">{error.component}</p>
                            </div>
                        )}

                        {error.userInfo?.email && (
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                    <User className="w-4 h-4" />
                                    <span className="text-sm font-medium">المستخدم</span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{error.userInfo.name || error.userInfo.email}</p>
                            </div>
                        )}
                    </div>

                    {/* معلومات المتصفح */}
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            معلومات المتصفح
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl text-xs font-mono text-gray-600 dark:text-gray-400 space-y-1">
                            <p>Platform: {error.browserInfo.platform}</p>
                            <p>Screen: {error.browserInfo.screenWidth}x{error.browserInfo.screenHeight}</p>
                            <p>Viewport: {error.browserInfo.viewportWidth}x{error.browserInfo.viewportHeight}</p>
                            <p>Timezone: {error.browserInfo.timezone}</p>
                            <p className="truncate" title={error.browserInfo.userAgent}>
                                UserAgent: {error.browserInfo.userAgent}
                            </p>
                        </div>
                    </div>
                </div>

                {/* الأزرار */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span className="text-green-500">تم النسخ</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    نسخ JSON
                                </>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {!error.isResolved && (
                            <button
                                onClick={onMarkResolved}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                            >
                                <CheckCircle className="w-4 h-4" />
                                تم الحل
                            </button>
                        )}
                        <button
                            onClick={onDelete}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            حذف
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * صفحة لوحة تحكم الأخطاء الرئيسية
 */
export default function ErrorDashboardPage() {
    const {
        errors,
        selectedError,
        filters,
        setFilters,
        selectError,
        deleteError,
        clearAllErrors,
        markAsResolved,
        markAllAsRead,
        exportErrors,
        refreshErrors,
        refreshStats,
    } = useErrorTrackingStore();

    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<ErrorType | 'all'>('all');
    const [severityFilter, setSeverityFilter] = useState<ErrorSeverity | 'all'>('all');
    const [confirmClear, setConfirmClear] = useState(false);

    // تطبيق الفلاتر
    const handleApplyFilters = () => {
        const newFilters: ErrorFilters = {};
        if (searchQuery) newFilters.searchQuery = searchQuery;
        if (typeFilter !== 'all') newFilters.type = typeFilter;
        if (severityFilter !== 'all') newFilters.severity = severityFilter;
        setFilters(newFilters);
    };

    // إعادة تعيين الفلاتر
    const handleResetFilters = () => {
        setSearchQuery('');
        setTypeFilter('all');
        setSeverityFilter('all');
        setFilters({});
    };

    // تصدير الأخطاء
    const handleExport = () => {
        const json = exportErrors();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `errors-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // حذف جميع الأخطاء
    const handleClearAll = () => {
        if (confirmClear) {
            clearAllErrors();
            setConfirmClear(false);
        } else {
            setConfirmClear(true);
            setTimeout(() => setConfirmClear(false), 3000);
        }
    };

    // البحث الفوري
    useMemo(() => {
        const timer = setTimeout(() => {
            handleApplyFilters();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, typeFilter, severityFilter]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6" dir="rtl">
            <div className="max-w-7xl mx-auto">
                {/* الرأس */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            لوحة تحكم الأخطاء
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            مراقبة وتتبع أخطاء التطبيق
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { refreshErrors(); refreshStats(); }}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            تحديث
                        </button>
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                        >
                            <CheckCircle className="w-4 h-4" />
                            تعيين الكل كمقروء
                        </button>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            تصدير
                        </button>
                        <button
                            onClick={handleClearAll}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${confirmClear
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'
                                }`}
                        >
                            <Trash2 className="w-4 h-4" />
                            {confirmClear ? 'تأكيد الحذف' : 'حذف الكل'}
                        </button>
                    </div>
                </div>

                {/* الإحصائيات */}
                <StatsBar />

                {/* البحث والفلاتر */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                    <div className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                        {/* البحث */}
                        <div className="flex-1 relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="البحث في الأخطاء..."
                                className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>

                        {/* فلتر النوع */}
                        <div className="relative">
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value as ErrorType | 'all')}
                                className="appearance-none px-4 py-2.5 pr-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                <option value="all">كل الأنواع</option>
                                {Object.entries(ERROR_TRACKING_CONFIG.TYPE_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                        {/* فلتر الخطورة */}
                        <div className="relative">
                            <select
                                value={severityFilter}
                                onChange={(e) => setSeverityFilter(e.target.value as ErrorSeverity | 'all')}
                                className="appearance-none px-4 py-2.5 pr-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                <option value="all">كل المستويات</option>
                                {Object.entries(ERROR_TRACKING_CONFIG.SEVERITY_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                        {/* زر إعادة التعيين */}
                        {(searchQuery || typeFilter !== 'all' || severityFilter !== 'all') && (
                            <button
                                onClick={handleResetFilters}
                                className="flex items-center gap-2 px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                            >
                                <X className="w-4 h-4" />
                                إعادة تعيين
                            </button>
                        )}
                    </div>
                </div>

                {/* جدول الأخطاء */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {errors.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                لا توجد أخطاء
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                التطبيق يعمل بشكل سليم. ستظهر الأخطاء هنا عند حدوثها.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            الخطورة
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            النوع
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            الرسالة
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            الصفحة
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            الوقت
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            إجراءات
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {errors.map((error) => (
                                        <ErrorRow
                                            key={error.id}
                                            error={error}
                                            onSelect={() => selectError(error)}
                                            onDelete={() => deleteError(error.id)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* نافذة التفاصيل */}
                {selectedError && (
                    <ErrorDetailsModal
                        error={selectedError}
                        onClose={() => selectError(null)}
                        onMarkResolved={() => {
                            markAsResolved(selectedError.id);
                            selectError(null);
                        }}
                        onDelete={() => {
                            deleteError(selectedError.id);
                            selectError(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
