/**
 * Context API لتتبع الأخطاء
 * Error Tracking Context - Provides error tracking to the entire app
 */

import React, { createContext, useContext, useEffect, useCallback, type ReactNode } from 'react';
import { errorTrackingService } from '../services/errorTrackingService';
import { useErrorTrackingStore } from '../store/errorTrackingStore';
import { useToastStore } from '../store/toastStore';
import type {
    ErrorRecord,
    LogErrorOptions,
    UserInfo,
} from '../types/errorTracking';
import {
    ERROR_TRACKING_CONFIG,
} from '../types/errorTracking';

// واجهة السياق
interface ErrorTrackingContextValue {
    // تسجيل الأخطاء
    logError: (error: Error | string, options?: LogErrorOptions) => ErrorRecord;
    logComponentError: (error: Error, componentStack?: string, componentName?: string) => ErrorRecord;

    // معلومات المستخدم
    setUserInfo: (info: UserInfo | null) => void;

    // الخدمة المباشرة (للاستخدام المتقدم)
    service: typeof errorTrackingService;
}

// إنشاء السياق
const ErrorTrackingContext = createContext<ErrorTrackingContextValue | null>(null);

// خصائص الموفر
interface ErrorTrackingProviderProps {
    children: ReactNode;
    showToastOnError?: boolean;
    userInfo?: UserInfo;
}

/**
 * موفر سياق تتبع الأخطاء
 */
export function ErrorTrackingProvider({
    children,
    showToastOnError = true,
    userInfo,
}: ErrorTrackingProviderProps): React.ReactElement {
    const toastStore = useToastStore();
    const { refreshErrors, refreshStats } = useErrorTrackingStore();

    // تعيين معلومات المستخدم
    useEffect(() => {
        if (userInfo) {
            errorTrackingService.setUserInfo(userInfo);
        }
    }, [userInfo]);

    // تسجيل خطأ مع Toast اختياري
    const logError = useCallback((
        error: Error | string,
        options?: LogErrorOptions
    ): ErrorRecord => {
        const record = errorTrackingService.logError(error, options);

        // عرض Toast إذا كان مفعلاً
        if (showToastOnError && options?.showToast !== false) {
            const severityLabel = ERROR_TRACKING_CONFIG.SEVERITY_LABELS[record.severity];
            toastStore.error(
                `${severityLabel}: ${record.type === 'api' ? 'خطأ في الاتصال' : 'حدث خطأ'}`,
                record.message.substring(0, 100)
            );
        }

        // تحديث الـ store
        refreshErrors();
        refreshStats();

        return record;
    }, [showToastOnError, toastStore, refreshErrors, refreshStats]);

    // تسجيل خطأ component
    const logComponentError = useCallback((
        error: Error,
        componentStack?: string,
        componentName?: string
    ): ErrorRecord => {
        const record = errorTrackingService.logComponentError(error, componentStack, componentName);

        // عرض Toast للأخطاء الحرجة
        if (showToastOnError) {
            toastStore.error(
                'خطأ حرج في المكون',
                `حدث خطأ في ${componentName || 'أحد المكونات'}`
            );
        }

        // تحديث الـ store
        refreshErrors();
        refreshStats();

        return record;
    }, [showToastOnError, toastStore, refreshErrors, refreshStats]);

    // تعيين معلومات المستخدم
    const setUserInfo = useCallback((info: UserInfo | null) => {
        errorTrackingService.setUserInfo(info);
    }, []);

    const value: ErrorTrackingContextValue = {
        logError,
        logComponentError,
        setUserInfo,
        service: errorTrackingService,
    };

    return (
        <ErrorTrackingContext.Provider value={value}>
            {children}
        </ErrorTrackingContext.Provider>
    );
}

/**
 * Hook للوصول لسياق تتبع الأخطاء
 */
export function useErrorTracking(): ErrorTrackingContextValue {
    const context = useContext(ErrorTrackingContext);

    if (!context) {
        throw new Error('useErrorTracking must be used within ErrorTrackingProvider');
    }

    return context;
}

/**
 * Hook بسيط لتسجيل الأخطاء (يعمل بدون Provider)
 */
export function useErrorLogger() {
    const toastStore = useToastStore();

    const logError = useCallback((
        error: Error | string,
        options?: LogErrorOptions
    ) => {
        const record = errorTrackingService.logError(error, options);

        if (options?.showToast !== false) {
            toastStore.error(
                'حدث خطأ',
                typeof error === 'string' ? error : error.message
            );
        }

        return record;
    }, [toastStore]);

    return { logError };
}

export default ErrorTrackingContext;
