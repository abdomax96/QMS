/**
 * Language Store
 * Manages display language preference (Arabic/English/Both) for folder and template names
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DisplayLanguage = 'ar' | 'en' | 'both';

interface LanguageState {
    displayLanguage: DisplayLanguage;
    setDisplayLanguage: (lang: DisplayLanguage) => void;
}

export const useLanguageStore = create<LanguageState>()(
    persist(
        (set) => ({
            displayLanguage: 'both', // Default: show both Arabic and English
            setDisplayLanguage: (lang) => set({ displayLanguage: lang }),
        }),
        {
            name: 'qms-language-preference',
        }
    )
);

/**
 * Helper function to format display name based on language preference
 */
export function getDisplayName(
    nameAr: string,
    nameEn?: string | null,
    displayLanguage: DisplayLanguage = 'both'
): string {
    if (!nameEn) {
        return nameAr; // Fallback to Arabic if no English name
    }

    switch (displayLanguage) {
        case 'ar':
            return nameAr;
        case 'en':
            return nameEn;
        case 'both':
        default:
            return `${nameAr} (${nameEn})`;
    }
}
