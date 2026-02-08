/**
 * Zustand Store لتتبع الأخطاء
 * Error Tracking Store - Manages error state with real-time updates
 */

import { create } from 'zustand';
import { errorTrackingService } from '../services/errorTrackingService';
import type { ErrorRecord, ErrorFilters, ErrorStats } from '../types/errorTracking';


interface ErrorTrackingState {
    // البيانات
    errors: ErrorRecord[];
    stats: ErrorStats;
    selectedError: ErrorRecord | null;

    // الفلاتر
    filters: ErrorFilters;

    // حالة التحميل
    isLoading: boolean;

    // الإجراءات
    refreshErrors: () => void;
    refreshStats: () => void;
    setFilters: (filters: ErrorFilters) => void;
    selectError: (error: ErrorRecord | null) => void;
    deleteError: (id: string) => void;
    clearAllErrors: () => void;
    markAsRead: (id: string) => void;
    markAsResolved: (id: string) => void;
    markAllAsRead: () => void;
    exportErrors: () => string;
}

export const useErrorTrackingStore = create<ErrorTrackingState>((set, get) => {
    // الاشتراك في تحديثات الخدمة
    errorTrackingService.subscribe(() => {
        get().refreshErrors();
        get().refreshStats();
    });

    return {
        // الحالة الأولية
        errors: errorTrackingService.getErrors(),
        stats: errorTrackingService.getStats(),
        selectedError: null,
        filters: {},
        isLoading: false,

        // تحديث قائمة الأخطاء
        refreshErrors: () => {
            const { filters } = get();
            set({ errors: errorTrackingService.getErrors(filters) });
        },

        // تحديث الإحصائيات
        refreshStats: () => {
            set({ stats: errorTrackingService.getStats() });
        },

        // تعيين الفلاتر
        setFilters: (filters) => {
            set({ filters });
            set({ errors: errorTrackingService.getErrors(filters) });
        },

        // اختيار خطأ للعرض
        selectError: (error) => {
            if (error && !error.isRead) {
                errorTrackingService.markAsRead(error.id);
            }
            set({ selectedError: error });
        },

        // حذف خطأ
        deleteError: (id) => {
            const { selectedError } = get();
            if (selectedError?.id === id) {
                set({ selectedError: null });
            }
            errorTrackingService.deleteError(id);
        },

        // حذف جميع الأخطاء
        clearAllErrors: () => {
            set({ selectedError: null });
            errorTrackingService.clearAllErrors();
        },

        // تعيين كمقروء
        markAsRead: (id) => {
            errorTrackingService.markAsRead(id);
        },

        // تعيين كمحلول
        markAsResolved: (id) => {
            errorTrackingService.markAsResolved(id);
        },

        // تعيين الكل كمقروء
        markAllAsRead: () => {
            errorTrackingService.markAllAsRead();
        },

        // تصدير الأخطاء
        exportErrors: () => {
            const { filters } = get();
            return errorTrackingService.exportErrors(filters);
        },
    };
});

export default useErrorTrackingStore;
