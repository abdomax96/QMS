/**
 * خدمة تتبع وتسجيل الأخطاء المركزية
 * Error Tracking Service - Central logging service for all error types
 */

import type {
    ErrorRecord,
    ErrorType,
    ErrorSeverity,
    ErrorFilters,
    ErrorStats,
    LogErrorOptions,
    BrowserInfo,
    UserInfo,
} from '../types/errorTracking';
import {
    ERROR_TRACKING_CONFIG,
} from '../types/errorTracking';

/**
 * جمع معلومات المتصفح والجهاز
 */
function getBrowserInfo(): BrowserInfo {
    return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        vendor: navigator.vendor,
        cookiesEnabled: navigator.cookieEnabled,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        online: navigator.onLine,
    };
}

/**
 * توليد معرف فريد للخطأ
 */
function generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * تنسيق الـ Stack Trace
 */
function formatStackTrace(stack?: string): string | undefined {
    if (!stack) return undefined;

    // تنظيف وتنسيق الـ stack trace
    return stack
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, 20) // حد أقصى 20 سطر
        .join('\n');
}

/**
 * تحديد نوع الخطأ تلقائيًا
 */
function detectErrorType(error: Error | string, options?: LogErrorOptions): ErrorType {
    if (options?.type) return options.type;

    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorName = typeof error === 'string' ? '' : error.name;

    // أخطاء الشبكة
    if (errorName === 'TypeError' && errorMessage.includes('fetch')) {
        return 'network';
    }

    // أخطاء API
    if (options?.apiInfo || errorMessage.includes('API') || errorMessage.includes('HTTP')) {
        return 'api';
    }

    // أخطاء التحقق
    if (errorMessage.toLowerCase().includes('validation') ||
        errorMessage.toLowerCase().includes('invalid') ||
        errorMessage.toLowerCase().includes('required')) {
        return 'validation';
    }

    // أخطاء المكونات
    if (errorMessage.includes('component') || options?.component) {
        return 'component';
    }

    // أخطاء JavaScript عامة
    if (error instanceof Error) {
        return 'javascript';
    }

    return 'unknown';
}

/**
 * تحديد خطورة الخطأ تلقائيًا
 */
function detectSeverity(error: Error | string, type: ErrorType, options?: LogErrorOptions): ErrorSeverity {
    if (options?.severity) return options.severity;

    // أخطاء الشبكة والـ API الحرجة
    if (type === 'network') {
        return 'error';
    }

    // أخطاء API حسب الـ status code
    if (options?.apiInfo?.status) {
        const status = options.apiInfo.status;
        if (status >= 500) return 'critical';
        if (status >= 400) return 'error';
    }

    // أخطاء التحقق تحذيرات
    if (type === 'validation') {
        return 'warning';
    }

    // أخطاء المكونات حرجة
    if (type === 'component') {
        return 'critical';
    }

    return 'error';
}

/**
 * خدمة تتبع الأخطاء
 */
class ErrorTrackingService {
    private storageKey = ERROR_TRACKING_CONFIG.STORAGE_KEY;
    private maxErrors = ERROR_TRACKING_CONFIG.MAX_ERRORS;
    private userInfo: UserInfo | null = null;
    private listeners: Set<() => void> = new Set();

    constructor() {
        // تنظيف الأخطاء القديمة عند بدء التشغيل
        this.cleanupOldErrors();

        // الاستماع لأخطاء JavaScript غير المعالجة
        this.setupGlobalErrorHandlers();
    }

    /**
     * إعداد معالجات الأخطاء العامة
     */
    private setupGlobalErrorHandlers(): void {
        // أخطاء JavaScript غير المعالجة
        window.addEventListener('error', (event) => {
            this.logError(event.error || new Error(event.message), {
                type: 'javascript',
                metadata: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                },
            });
        });

        // Promise rejections غير المعالجة
        window.addEventListener('unhandledrejection', (event) => {
            const error = event.reason instanceof Error
                ? event.reason
                : new Error(String(event.reason));

            this.logError(error, {
                type: 'javascript',
                metadata: {
                    type: 'unhandledRejection',
                },
            });
        });
    }

    /**
     * تعيين معلومات المستخدم الحالي
     */
    setUserInfo(info: UserInfo | null): void {
        this.userInfo = info;
    }

    /**
     * الحصول على معلومات المستخدم
     */
    getUserInfo(): UserInfo | null {
        return this.userInfo;
    }

    /**
     * تسجيل خطأ جديد
     */
    logError(error: Error | string, options?: LogErrorOptions): ErrorRecord {
        const errorMessage = typeof error === 'string' ? error : error.message;
        const errorStack = typeof error === 'string' ? undefined : error.stack;

        const type = detectErrorType(error, options);
        const severity = detectSeverity(error, type, options);

        const record: ErrorRecord = {
            id: generateErrorId(),
            timestamp: new Date().toISOString(),
            type,
            severity,
            message: errorMessage,
            stack: formatStackTrace(errorStack),
            componentStack: undefined,
            url: window.location.href,
            route: window.location.pathname,
            component: options?.component,
            action: options?.action,
            userInfo: this.userInfo || undefined,
            browserInfo: getBrowserInfo(),
            apiInfo: options?.apiInfo,
            metadata: options?.metadata,
            isRead: false,
            isResolved: false,
        };

        // حفظ الخطأ
        this.saveError(record);

        // إشعار المستمعين
        this.notifyListeners();

        // طباعة في console للتطوير
        if (import.meta.env.DEV) {
            console.group(`🔴 [Error Tracking] ${type.toUpperCase()} - ${severity}`);
            console.error('Message:', errorMessage);
            if (errorStack) console.error('Stack:', errorStack);
            if (options?.apiInfo) console.error('API Info:', options.apiInfo);
            console.groupEnd();
        }

        return record;
    }

    /**
     * تسجيل خطأ component (من ErrorBoundary)
     */
    logComponentError(error: Error, componentStack?: string, componentName?: string): ErrorRecord {
        const record = this.logError(error, {
            type: 'component',
            severity: 'critical',
            component: componentName,
        });

        // إضافة component stack
        if (componentStack) {
            record.componentStack = componentStack;
            this.updateError(record.id, { componentStack });
        }

        return record;
    }

    /**
     * حفظ خطأ في التخزين
     */
    private saveError(record: ErrorRecord): void {
        const errors = this.getAllErrorsFromStorage();
        errors.unshift(record);

        // إزالة الأخطاء الزائدة
        if (errors.length > this.maxErrors) {
            errors.splice(this.maxErrors);
        }

        sessionStorage.setItem(this.storageKey, JSON.stringify(errors));
    }

    /**
     * جلب جميع الأخطاء من التخزين
     */
    private getAllErrorsFromStorage(): ErrorRecord[] {
        try {
            const data = sessionStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * تحديث خطأ
     */
    updateError(id: string, updates: Partial<ErrorRecord>): void {
        const errors = this.getAllErrorsFromStorage();
        const index = errors.findIndex(e => e.id === id);

        if (index !== -1) {
            errors[index] = { ...errors[index], ...updates };
            sessionStorage.setItem(this.storageKey, JSON.stringify(errors));
            this.notifyListeners();
        }
    }

    /**
     * جلب الأخطاء مع فلترة
     */
    getErrors(filters?: ErrorFilters): ErrorRecord[] {
        let errors = this.getAllErrorsFromStorage();

        if (!filters) return errors;

        // فلترة حسب النوع
        if (filters.type && filters.type !== 'all') {
            errors = errors.filter(e => e.type === filters.type);
        }

        // فلترة حسب الخطورة
        if (filters.severity && filters.severity !== 'all') {
            errors = errors.filter(e => e.severity === filters.severity);
        }

        // فلترة حسب التاريخ
        if (filters.startDate) {
            const start = new Date(filters.startDate);
            errors = errors.filter(e => new Date(e.timestamp) >= start);
        }

        if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            errors = errors.filter(e => new Date(e.timestamp) <= end);
        }

        // فلترة حسب الحالة
        if (filters.isRead !== undefined) {
            errors = errors.filter(e => e.isRead === filters.isRead);
        }

        if (filters.isResolved !== undefined) {
            errors = errors.filter(e => e.isResolved === filters.isResolved);
        }

        // البحث في النص
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            errors = errors.filter(e =>
                e.message.toLowerCase().includes(query) ||
                e.url.toLowerCase().includes(query) ||
                e.component?.toLowerCase().includes(query) ||
                e.action?.toLowerCase().includes(query)
            );
        }

        return errors;
    }

    /**
     * حذف خطأ
     */
    deleteError(id: string): void {
        const errors = this.getAllErrorsFromStorage().filter(e => e.id !== id);
        sessionStorage.setItem(this.storageKey, JSON.stringify(errors));
        this.notifyListeners();
    }

    /**
     * حذف جميع الأخطاء
     */
    clearAllErrors(): void {
        sessionStorage.removeItem(this.storageKey);
        this.notifyListeners();
    }

    /**
     * تصدير الأخطاء كـ JSON
     */
    exportErrors(filters?: ErrorFilters): string {
        const errors = this.getErrors(filters);
        return JSON.stringify(errors, null, 2);
    }

    /**
     * حساب الإحصائيات
     */
    getStats(): ErrorStats {
        const errors = this.getAllErrorsFromStorage();
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const byType: Record<ErrorType, number> = {
            javascript: 0,
            api: 0,
            network: 0,
            validation: 0,
            component: 0,
            unknown: 0,
        };

        const bySeverity: Record<ErrorSeverity, number> = {
            critical: 0,
            error: 0,
            warning: 0,
            info: 0,
        };

        let unread = 0;
        let unresolved = 0;
        let last24Hours = 0;
        let last7Days = 0;

        for (const error of errors) {
            byType[error.type]++;
            bySeverity[error.severity]++;

            if (!error.isRead) unread++;
            if (!error.isResolved) unresolved++;

            const errorDate = new Date(error.timestamp);
            if (errorDate >= oneDayAgo) last24Hours++;
            if (errorDate >= sevenDaysAgo) last7Days++;
        }

        return {
            total: errors.length,
            byType,
            bySeverity,
            unread,
            unresolved,
            last24Hours,
            last7Days,
        };
    }

    /**
     * تنظيف الأخطاء القديمة
     */
    private cleanupOldErrors(): void {
        const errors = this.getAllErrorsFromStorage();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - ERROR_TRACKING_CONFIG.RETENTION_DAYS);

        const filtered = errors.filter(e => new Date(e.timestamp) >= cutoffDate);

        if (filtered.length !== errors.length) {
            sessionStorage.setItem(this.storageKey, JSON.stringify(filtered));
        }
    }

    /**
     * الاشتراك في التحديثات
     */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * إشعار المستمعين بالتحديثات
     */
    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }

    /**
     * تعيين خطأ كمقروء
     */
    markAsRead(id: string): void {
        this.updateError(id, { isRead: true });
    }

    /**
     * تعيين خطأ كمحلول
     */
    markAsResolved(id: string): void {
        this.updateError(id, { isResolved: true });
    }

    /**
     * تعيين جميع الأخطاء كمقروءة
     */
    markAllAsRead(): void {
        const errors = this.getAllErrorsFromStorage();
        errors.forEach(e => e.isRead = true);
        sessionStorage.setItem(this.storageKey, JSON.stringify(errors));
        this.notifyListeners();
    }
}

// تصدير instance واحد (Singleton)
export const errorTrackingService = new ErrorTrackingService();
export default errorTrackingService;
