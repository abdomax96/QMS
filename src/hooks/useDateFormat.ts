/**
 * Date Format Hook - تنسيق التاريخ حسب الإعدادات
 * يستخدم صيغة التاريخ المحددة في إعدادات التطبيق
 */

import { format, parseISO, isValid } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useAppSettingsStore } from '../store/appSettingsStore';

// Map user format to date-fns format
const formatMap: Record<string, string> = {
    'DD/MM/YYYY': 'dd/MM/yyyy',
    'MM/DD/YYYY': 'MM/dd/yyyy',
    'YYYY-MM-DD': 'yyyy-MM-dd',
};

/**
 * Hook لتنسيق التاريخ حسب إعدادات المستخدم
 */
export const useDateFormat = () => {
    const { dateFormat, language } = useAppSettingsStore();

    const formatDateWithSettings = (date: string | Date | null | undefined): string => {
        if (!date) return '-';

        try {
            const dateObj = typeof date === 'string' ? parseISO(date) : date;
            if (!isValid(dateObj)) return '-';

            const formatStr = formatMap[dateFormat] || 'dd/MM/yyyy';
            const locale = language === 'ar' ? ar : enUS;

            return format(dateObj, formatStr, { locale });
        } catch (error) {
            console.error('Date format error:', error);
            return '-';
        }
    };

    const formatDateTimeWithSettings = (date: string | Date | null | undefined): string => {
        if (!date) return '-';

        try {
            const dateObj = typeof date === 'string' ? parseISO(date) : date;
            if (!isValid(dateObj)) return '-';

            const formatStr = formatMap[dateFormat] || 'dd/MM/yyyy';
            const locale = language === 'ar' ? ar : enUS;

            return format(dateObj, `${formatStr} HH:mm`, { locale });
        } catch (error) {
            console.error('DateTime format error:', error);
            return '-';
        }
    };

    return {
        formatDate: formatDateWithSettings,
        formatDateTime: formatDateTimeWithSettings,
        dateFormat,
        language,
    };
};

/**
 * دالة لتنسيق التاريخ بدون hook (للاستخدام خارج المكونات)
 * تستخدم القيمة المحفوظة في localStorage
 */
export const formatDateWithAppSettings = (date: string | Date | null | undefined): string => {
    if (!date) return '-';

    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        if (!isValid(dateObj)) return '-';

        // Get settings from store
        const state = useAppSettingsStore.getState();
        const formatStr = formatMap[state.dateFormat] || 'dd/MM/yyyy';
        const locale = state.language === 'ar' ? ar : enUS;

        return format(dateObj, formatStr, { locale });
    } catch (error) {
        console.error('Date format error:', error);
        return '-';
    }
};

/**
 * دالة لتنسيق التاريخ والوقت بدون hook
 */
export const formatDateTimeWithAppSettings = (date: string | Date | null | undefined): string => {
    if (!date) return '-';

    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        if (!isValid(dateObj)) return '-';

        const state = useAppSettingsStore.getState();
        const formatStr = formatMap[state.dateFormat] || 'dd/MM/yyyy';
        const locale = state.language === 'ar' ? ar : enUS;

        return format(dateObj, `${formatStr} HH:mm`, { locale });
    } catch (error) {
        console.error('DateTime format error:', error);
        return '-';
    }
};

export default useDateFormat;
