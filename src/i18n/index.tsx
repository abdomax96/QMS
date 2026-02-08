/**
 * i18n Provider
 * Lightweight internationalization without external dependencies
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ar } from './locales/ar';
import { en } from './locales/en';

export type Locale = 'ar' | 'en';
export type TranslationKeys = typeof ar;

const translations: Record<Locale, TranslationKeys> = {
    ar,
    en
};

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    dir: 'rtl' | 'ltr';
}

const I18nContext = createContext<I18nContextType | null>(null);

// Get nested value from object by path
function getNestedValue(obj: unknown, path: string): string | undefined {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = (current as Record<string, unknown>)[key];
        } else {
            return undefined;
        }
    }

    return typeof current === 'string' ? current : undefined;
}

// Replace template variables
function interpolate(text: string, params?: Record<string, string | number>): string {
    if (!params) return text;

    return text.replace(/\{(\w+)\}/g, (_, key) => {
        return params[key]?.toString() || `{${key}}`;
    });
}

interface I18nProviderProps {
    children: React.ReactNode;
    defaultLocale?: Locale;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
    children,
    defaultLocale = 'ar'
}) => {
    const [locale, setLocaleState] = useState<Locale>(() => {
        // Try to get from localStorage
        const saved = localStorage.getItem('locale') as Locale;
        return saved && translations[saved] ? saved : defaultLocale;
    });

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('locale', newLocale);

        // Update document direction
        document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = newLocale;
    }, []);

    const t = useCallback((key: string, params?: Record<string, string | number>): string => {
        const translation = getNestedValue(translations[locale], key);

        if (!translation) {
            console.warn(`Translation key not found: ${key}`);
            return key;
        }

        return interpolate(translation, params);
    }, [locale]);

    const dir = useMemo((): 'rtl' | 'ltr' => locale === 'ar' ? 'rtl' : 'ltr', [locale]);

    const value = useMemo(() => ({
        locale,
        setLocale,
        t,
        dir
    }), [locale, setLocale, t, dir]);

    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    );
};

// Hook to use i18n
export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}

// Hook for just translation function
export function useTranslation() {
    const { t, locale, dir } = useI18n();
    return { t, locale, dir };
}

// Language Switcher Component
export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className }) => {
    const { locale, setLocale } = useI18n();

    return (
        <button
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
            className={className || 'p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'}
            title={locale === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
        >
            {locale === 'ar' ? 'EN' : 'عربي'}
        </button>
    );
};

export default I18nProvider;
