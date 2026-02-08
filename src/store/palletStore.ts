/**
 * Pallet Store
 * Zustand store for managing pallet state and operations
 */

import { create } from 'zustand';
import type {
    Pallet,
    PalletWithDetails,
    RegistrationSession,
    RegisterPalletRequest,
    RegisterPalletResponse,
    GetPalletsRequest,
} from '../types/pallet';
import { palletService } from '../services/palletService';
import { palletBatchService } from '../services/palletBatchService';

interface PalletStore {
    // State
    pallets: PalletWithDetails[];
    selectedPallet: PalletWithDetails | null;
    currentSession: RegistrationSession | null;
    nextPalletNumber: string;
    loading: boolean;
    error: string | null;

    // Pagination
    currentPage: number;
    totalPages: number;
    totalCount: number;

    // Actions
    setSession: (session: RegistrationSession, nextPalletNumber: string) => void;
    loadPallets: (request: GetPalletsRequest) => Promise<void>;
    selectPallet: (palletId: string) => Promise<void>;
    registerPallet: (request: Omit<RegisterPalletRequest, 'session'>) => Promise<RegisterPalletResponse>;
    updatePallet: (palletId: string, updates: Partial<Pallet>) => Promise<void>;
    clearSession: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const usePalletStore = create<PalletStore>((set, get) => ({
    // Initial state
    pallets: [],
    selectedPallet: null,
    currentSession: null,
    nextPalletNumber: '',
    loading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,

    // Set session
    setSession: (session, nextPalletNumber) => {
        set({ currentSession: session, nextPalletNumber, error: null });
    },

    // Load pallets with filters
    loadPallets: async (request) => {
        try {
            set({ loading: true, error: null });

            const response = await palletService.getPallets(request);

            set({
                pallets: response.pallets,
                currentPage: response.page,
                totalCount: response.total,
                totalPages: Math.ceil(response.total / response.limit),
                loading: false,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load pallets';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Select pallet and load details
    selectPallet: async (palletId) => {
        try {
            set({ loading: true, error: null });

            const pallet = await palletService.getPalletDetails(palletId);

            set({ selectedPallet: pallet, loading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load pallet';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Register new pallet in current session
    registerPallet: async (request) => {
        const { currentSession } = get();

        if (!currentSession) {
            throw new Error('No active session');
        }

        try {
            set({ loading: true, error: null });

            const response = await palletService.registerPallet({
                ...request,
                session: currentSession,
            });

            // Update session with new pallet
            const updatedSession = {
                ...currentSession,
                registered_pallets: [...currentSession.registered_pallets, response.pallet],
                last_updated: new Date().toISOString(),
            };

            set({
                currentSession: updatedSession,
                nextPalletNumber: response.next_pallet_number,
                loading: false,
            });

            // Reload pallets list if we're viewing this batch
            const currentBatchId = get().pallets[0]?.batch_id;
            if (currentBatchId === currentSession.batch_id) {
                await get().loadPallets({ batch_id: currentSession.batch_id });
            }

            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to register pallet';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Update pallet
    updatePallet: async (palletId, updates) => {
        try {
            set({ loading: true, error: null });

            await palletService.updatePallet(palletId, updates);

            // Update in local state
            set((state) => ({
                pallets: state.pallets.map((p) =>
                    p.id === palletId ? { ...p, ...updates } : p
                ),
                selectedPallet:
                    state.selectedPallet?.id === palletId
                        ? { ...state.selectedPallet, ...updates }
                        : state.selectedPallet,
                loading: false,
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update pallet';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Clear session
    clearSession: () => {
        set({
            currentSession: null,
            nextPalletNumber: '',
            error: null,
        });
    },

    // Utilities
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
}));
