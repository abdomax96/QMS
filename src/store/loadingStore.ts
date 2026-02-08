/**
 * Loading Store
 * Zustand store for managing loading operations and vehicle management
 */

import { create } from 'zustand';
import type {
    LoadingOperation,
    LoadingOperationWithDetails,
    Vehicle,
    VehicleInspection,
    LoadedPallet,
    PalletWithDetails,
} from '../types/pallet';
import { VehicleType } from '../types/pallet';
import { loadingService } from '../services/loadingService';
import { vehicleService } from '../services/vehicleService';

interface LoadingStore {
    // State
    currentOperation: LoadingOperationWithDetails | null;
    loadingOperations: LoadingOperation[];
    todayVehicles: Vehicle[];
    suggestedPallets: PalletWithDetails[];
    loadedPallets: LoadedPallet[];
    loading: boolean;
    error: string | null;

    // Actions - Loading Operations
    createLoadingOperation: (vehicleId: string, companyId: string) => Promise<LoadingOperation>;
    loadOperation: (operationId: string) => Promise<void>;
    startLoading: (operationId: string) => Promise<void>;
    loadPallet: (palletId: string, cartons: number, isPartial: boolean) => Promise<void>;
    completeLoading: (operationId: string) => Promise<void>;
    cancelLoading: (operationId: string) => Promise<void>;

    // Actions - Vehicle Management
    loadTodayVehicles: (companyId: string) => Promise<void>;
    registerVehicle: (vehicleNumber: string, companyId: string) => Promise<Vehicle>;
    inspectVehicle: (vehicleId: string, inspection: Omit<VehicleInspection, 'id' | 'vehicle_id'>) => Promise<void>;

    // Actions - Pallet Suggestions
    suggestPallets: (
        companyId: string,
        strategy: string,
        options?: { targetCartons?: number; targetPallets?: number; productIds?: string[] }
    ) => Promise<PalletWithDetails[]>;

    // Utilities
    clearOperation: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useLoadingStore = create<LoadingStore>((set, get) => ({
    // Initial state
    currentOperation: null,
    loadingOperations: [],
    todayVehicles: [],
    suggestedPallets: [],
    loadedPallets: [],
    loading: false,
    error: null,

    // Create loading operation
    createLoadingOperation: async (vehicleId, companyId) => {
        try {
            set({ loading: true, error: null });

            const operation = await loadingService.createLoadingOperation(
                {
                    vehicle_id: vehicleId,
                    loading_strategy: 'fifo',
                    planned_date: new Date().toISOString().split('T')[0],
                    company_id: companyId,
                },
                companyId
            );

            // Load full details
            const operationDetails = await loadingService.getLoadingOperationWithDetails(operation.id);

            set({
                currentOperation: operationDetails,
                loading: false,
            });

            return operation;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create loading operation';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Load operation details
    loadOperation: async (operationId) => {
        try {
            set({ loading: true, error: null });

            const operation = await loadingService.getLoadingOperationWithDetails(operationId);

            set({
                currentOperation: operation,
                loadedPallets: operation?.loaded_pallets || [],
                loading: false,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load operation';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Start loading
    startLoading: async (operationId) => {
        try {
            set({ loading: true, error: null });

            await loadingService.startLoadingOperation(operationId);

            // Reload operation
            await get().loadOperation(operationId);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to start loading';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Load a pallet
    loadPallet: async (palletId, cartons, isPartial) => {
        const { currentOperation } = get();

        if (!currentOperation) {
            throw new Error('No active loading operation');
        }

        try {
            set({ loading: true, error: null });

            await loadingService.loadPallet({
                loading_operation_id: currentOperation.id,
                pallet_id: palletId,
                cartons_loaded: cartons,
                is_partial_load: isPartial,
            });

            // Reload operation
            await get().loadOperation(currentOperation.id);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load pallet';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Complete loading
    completeLoading: async (operationId) => {
        try {
            set({ loading: true, error: null });

            await loadingService.completeLoadingOperation(operationId);

            set({
                currentOperation: null,
                loadedPallets: [],
                loading: false,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to complete loading';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Cancel loading
    cancelLoading: async (operationId) => {
        try {
            set({ loading: true, error: null });

            await loadingService.cancelLoadingOperation(operationId);

            set({
                currentOperation: null,
                loadedPallets: [],
                loading: false,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to cancel loading';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Load today's vehicles
    loadTodayVehicles: async (companyId) => {
        try {
            set({ loading: true, error: null });

            const vehicles = await vehicleService.getTodayVehicles(companyId);

            set({ todayVehicles: vehicles, loading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load vehicles';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Register vehicle
    registerVehicle: async (vehicleNumber, companyId) => {
        try {
            set({ loading: true, error: null });

            const vehicle = await vehicleService.registerVehicle(
                {
                    vehicle_number: vehicleNumber,
                    vehicle_type: VehicleType.NON_REFRIGERATED,
                },
                companyId
            );

            // Add to list
            set((state) => ({
                todayVehicles: [vehicle, ...state.todayVehicles],
                loading: false,
            }));

            return vehicle;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to register vehicle';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Inspect vehicle
    inspectVehicle: async (vehicleId, inspection) => {
        try {
            set({ loading: true, error: null });

            await vehicleService.createInspection({
                vehicle_id: vehicleId,
                ...inspection,
            });

            // Reload vehicles
            const companyId = get().todayVehicles[0]?.company_id;
            if (companyId) {
                await get().loadTodayVehicles(companyId);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to inspect vehicle';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Suggest pallets for loading
    suggestPallets: async (companyId, strategy, options) => {
        try {
            set({ loading: true, error: null });

            const result = await loadingService.suggestPallets({
                company_id: companyId,
                loading_strategy: strategy as any,
                target_cartons: options?.targetCartons,
                target_pallets: options?.targetPallets,
                product_ids: options?.productIds,
            });

            set({
                suggestedPallets: result.suggested_pallets,
                loading: false,
            });
            return result.suggested_pallets;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to suggest pallets';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Utilities
    clearOperation: () => set({ currentOperation: null, loadedPallets: [], suggestedPallets: [] }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
}));
