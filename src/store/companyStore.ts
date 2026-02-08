import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Company } from '../services/companyService';

interface CompanyState {
    companies: Company[];
    selectedCompanyId: string | null;
    selectedCompany: Company | null;
    isLoading: boolean;
    error: string | null;

    setCompanies: (companies: Company[]) => void;
    selectCompany: (companyId: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    initialize: () => Promise<void>;
    clearSelectedCompany: () => void;
}

import * as companyService from '../services/companyService';

export const useCompanyStore = create<CompanyState>()(
    persist(
        (set, get) => ({
            companies: [],
            selectedCompanyId: null,
            selectedCompany: null,
            isLoading: false,
            error: null,

            setCompanies: (companies) => set({ companies }),

            selectCompany: async (companyId) => {
                const company = get().companies.find((c) => c.id === companyId) || null;

                // Update local state immediately for UI responsiveness
                set({
                    selectedCompanyId: companyId,
                    selectedCompany: company,
                });

                // Persist to DB
                try {
                    await companyService.setMainCompanyId(companyId);
                } catch (err) {
                    console.error('Failed to persist main company selection:', err);
                }
            },

            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),

            initialize: async () => {
                try {
                    // Fetch configured main company ID from settings
                    const mainCompanyId = await companyService.getMainCompanyId();

                    if (mainCompanyId) {
                        // Check if we have the company in current list
                        const currentList = get().companies;
                        let company = currentList.find(c => c.id === mainCompanyId);

                        // If not in list (or list empty), fetch it specifically
                        if (!company) {
                            company = await companyService.getCompanyById(mainCompanyId) || undefined;
                        }

                        if (company) {
                            set({
                                selectedCompanyId: mainCompanyId,
                                selectedCompany: company
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error initializing company store:', error);
                }
            },

            clearSelectedCompany: () => {
                set({ selectedCompanyId: null, selectedCompany: null });
                companyService.setMainCompanyId(null).catch(console.error);
            },
        }),
        {
            name: 'company-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                selectedCompanyId: state.selectedCompanyId,
                selectedCompany: state.selectedCompany,
                companies: state.companies, // Cache companies too
            }),
        }
    )
);
