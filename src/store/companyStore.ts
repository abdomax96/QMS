import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Company } from '../services/companyService';

interface CompanyState {
    companies: Company[];
    mainCompanyId: string | null;
    selectedCompanyId: string | null;
    selectedCompany: Company | null;
    isLoading: boolean;
    error: string | null;

    setCompanies: (companies: Company[]) => void;
    selectCompany: (companyId: string) => void;
    setMainCompany: (companyId: string | null) => Promise<void>;
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
            mainCompanyId: null,
            selectedCompanyId: null,
            selectedCompany: null,
            isLoading: false,
            error: null,

            setCompanies: (companies) => {
                const selectedCompanyId = get().selectedCompanyId;
                const selectedCompany =
                    selectedCompanyId ? companies.find((c) => c.id === selectedCompanyId) || null : null;

                set({ companies, selectedCompany });
            },

            selectCompany: (companyId) => {
                if (!companyId) {
                    const mainCompanyId = get().mainCompanyId;
                    const fallbackCompany =
                        mainCompanyId ? get().companies.find((c) => c.id === mainCompanyId) || null : null;

                    set({
                        selectedCompanyId: mainCompanyId,
                        selectedCompany: fallbackCompany,
                    });
                    return;
                }

                const company = get().companies.find((c) => c.id === companyId) || null;

                // Local context only (do NOT persist as "main company" in DB).
                set({
                    selectedCompanyId: companyId,
                    selectedCompany: company,
                });
            },

            setMainCompany: async (companyId) => {
                try {
                    await companyService.setMainCompanyId(companyId);
                    set({ mainCompanyId: companyId });

                    // When setting a new main company, it's usually the desired active context too.
                    if (companyId) {
                        const company = get().companies.find((c) => c.id === companyId) || null;
                        set({ selectedCompanyId: companyId, selectedCompany: company });
                    }
                } catch (err) {
                    console.error('Failed to persist main company setting:', err);
                }
            },

            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),

            initialize: async () => {
                try {
                    // Fetch configured main company ID from settings
                    const mainCompanyId = await companyService.getMainCompanyId();

                    if (mainCompanyId) {
                        set({ mainCompanyId });

                        const currentSelected = get().selectedCompanyId;
                        const desiredSelected = currentSelected || mainCompanyId;

                        // Check if we have the company in current list
                        const currentList = get().companies;
                        let company = currentList.find((c) => c.id === desiredSelected);

                        // If not in list (or list empty), fetch it specifically
                        if (!company) {
                            company = (await companyService.getCompanyById(desiredSelected)) || undefined;
                        }

                        if (company) {
                            set({
                                selectedCompanyId: desiredSelected,
                                selectedCompany: company
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error initializing company store:', error);
                }
            },

            clearSelectedCompany: () => {
                const mainCompanyId = get().mainCompanyId;
                const company = mainCompanyId ? get().companies.find((c) => c.id === mainCompanyId) || null : null;
                set({ selectedCompanyId: mainCompanyId, selectedCompany: company });
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
