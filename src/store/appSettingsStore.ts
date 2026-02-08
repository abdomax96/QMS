/**
 * App Settings Store
 * متجر إعدادات التطبيق
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppSettingsState {
    // Logo settings
    logoUrl: string;
    logoScale: number; // 0.5-2 where 1 is default

    // General settings
    language: 'ar' | 'en';
    timezone: string;
    dateFormat: string;
    theme: 'light' | 'dark' | 'auto';
    holdsDisposalPolicy: 'warning' | 'strict' | 'flexible';

    // Actions - Logo
    setLogoUrl: (url: string) => void;
    setLogoScale: (scale: number) => void;
    resetLogo: () => void;

    // Actions - General
    setLanguage: (lang: 'ar' | 'en') => void;
    setTimezone: (tz: string) => void;
    setDateFormat: (format: string) => void;
    setTheme: (theme: 'light' | 'dark' | 'auto') => void;
    setHoldsDisposalPolicy: (policy: 'warning' | 'strict' | 'flexible') => void;
}

const DEFAULT_LOGO = '/Logo.png';

export const useAppSettingsStore = create<AppSettingsState>()(
    persist(
        (set) => ({
            // Initial values
            logoUrl: DEFAULT_LOGO,
            logoScale: 1,
            language: 'ar',
            timezone: 'Asia/Riyadh',
            dateFormat: 'DD/MM/YYYY',
            theme: 'light',
            holdsDisposalPolicy: 'warning',

            // Logo actions
            setLogoUrl: (url) => set({ logoUrl: url }),
            setLogoScale: (scale) => set({ logoScale: Math.min(2, Math.max(0.5, scale)) }),
            resetLogo: () => set({ logoUrl: DEFAULT_LOGO, logoScale: 1 }),

            // General actions
            setLanguage: (language) => set({ language }),
            setTimezone: (timezone) => set({ timezone }),
            setDateFormat: (dateFormat) => set({ dateFormat }),
            setTheme: (theme) => set({ theme }),
            setHoldsDisposalPolicy: (holdsDisposalPolicy) => set({ holdsDisposalPolicy }),
        }),
        {
            name: 'app-settings-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

export default useAppSettingsStore;

