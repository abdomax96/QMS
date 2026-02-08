/**
 * نظام تتبع الأخطاء - الأنواع والواجهات
 * Error Tracking System - Types and Interfaces
 */

// مستوى خطورة الخطأ
export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

// نوع الخطأ
export type ErrorType = 'javascript' | 'api' | 'network' | 'validation' | 'component' | 'unknown';

// معلومات المتصفح
export interface BrowserInfo {
    userAgent: string;
    language: string;
    platform: string;
    vendor: string;
    cookiesEnabled: boolean;
    screenWidth: number;
    screenHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    colorDepth: number;
    pixelRatio: number;
    timezone: string;
    online: boolean;
}

// معلومات المستخدم
export interface UserInfo {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    department?: string;
}

// معلومات الـ API Request
export interface ApiRequestInfo {
    url: string;
    method: string;
    status?: number;
    statusText?: string;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    requestBody?: unknown;
    responseBody?: unknown;
    duration?: number;
}

// سجل الخطأ الكامل
export interface ErrorRecord {
    id: string;
    timestamp: string;
    type: ErrorType;
    severity: ErrorSeverity;
    message: string;
    stack?: string;
    componentStack?: string;

    // معلومات السياق
    url: string;
    route?: string;
    component?: string;
    action?: string;

    // معلومات المستخدم والمتصفح
    userInfo?: UserInfo;
    browserInfo: BrowserInfo;

    // معلومات API (إذا كان خطأ API)
    apiInfo?: ApiRequestInfo;

    // بيانات إضافية
    metadata?: Record<string, unknown>;

    // حالة الخطأ
    isRead: boolean;
    isResolved: boolean;
}

// فلاتر البحث والتصفية
export interface ErrorFilters {
    type?: ErrorType | 'all';
    severity?: ErrorSeverity | 'all';
    startDate?: string;
    endDate?: string;
    searchQuery?: string;
    isRead?: boolean;
    isResolved?: boolean;
}

// إحصائيات الأخطاء
export interface ErrorStats {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    unread: number;
    unresolved: number;
    last24Hours: number;
    last7Days: number;
}

// خيارات تسجيل الخطأ
export interface LogErrorOptions {
    type?: ErrorType;
    severity?: ErrorSeverity;
    component?: string;
    action?: string;
    apiInfo?: ApiRequestInfo;
    metadata?: Record<string, unknown>;
    showToast?: boolean;
}

// ثوابت النظام
export const ERROR_TRACKING_CONFIG = {
    // الحد الأقصى للأخطاء المحفوظة
    MAX_ERRORS: 500,

    // مفتاح التخزين
    STORAGE_KEY: 'qms_error_tracking',

    // مدة الاحتفاظ بالأخطاء (بالأيام)
    RETENTION_DAYS: 30,

    // ألوان حسب نوع الخطأ
    TYPE_COLORS: {
        javascript: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
        api: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
        network: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
        validation: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
        component: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
        unknown: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
    } as Record<ErrorType, { bg: string; text: string; border: string }>,

    // ألوان حسب الخطورة
    SEVERITY_COLORS: {
        critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: 'text-red-500' },
        error: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', icon: 'text-orange-500' },
        warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: 'text-yellow-500' },
        info: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: 'text-blue-500' },
    } as Record<ErrorSeverity, { bg: string; text: string; border: string; icon: string }>,

    // ترجمات عربية
    TYPE_LABELS: {
        javascript: 'خطأ JavaScript',
        api: 'خطأ API',
        network: 'خطأ شبكة',
        validation: 'خطأ تحقق',
        component: 'خطأ مكون',
        unknown: 'خطأ غير معروف',
    } as Record<ErrorType, string>,

    SEVERITY_LABELS: {
        critical: 'حرج',
        error: 'خطأ',
        warning: 'تحذير',
        info: 'معلومات',
    } as Record<ErrorSeverity, string>,
} as const;
