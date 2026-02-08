/**
 * Loading Service
 * Handles loading operations and pallet loading
 */

import type {
    LoadingOperation,
    LoadingOperationWithDetails,
    LoadedPallet,
    CreateLoadingOperationRequest,
    LoadPalletInput,
    SuggestPalletsRequest,
    SuggestPalletsResponse,
    PalletWithDetails,
} from '../types/pallet';
import { supabase } from '../config/supabase';
import { LoadingOperationStatus, LoadingStrategy, VehicleStatus, PalletStatus } from '../types/pallet';

export const loadingService = {
    /**
     * Create a new loading operation
     */
    async createLoadingOperation(input: CreateLoadingOperationRequest, companyId: string): Promise<LoadingOperation> {
        try {
            const { data, error } = await supabase
                .from('loading_operations')
                .insert({
                    ...input,
                    company_id: companyId,
                    status: LoadingOperationStatus.PLANNED,
                    actual_pallets: 0,
                    actual_cartons: 0,
                    created_by: (await supabase.auth.getUser()).data.user?.id,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;

            // Update vehicle status
            await supabase
                .from('vehicles')
                .update({ status: VehicleStatus.LOADING })
                .eq('id', input.vehicle_id);

            return data!;
        } catch (error) {
            console.error('Error creating loading operation:', error);
            throw error;
        }
    },

    /**
     * Load a pallet onto vehicle
     */
    async loadPallet(input: LoadPalletInput): Promise<LoadedPallet> {
        try {
            const { loading_operation_id, pallet_id, cartons_loaded } = input;

            // Get pallet details
            const { data: pallet, error: palletError } = await supabase
                .from('pallets')
                .select('*')
                .eq('id', pallet_id)
                .single();

            if (palletError || !pallet) {
                throw new Error('Pallet not found');
            }

            // Calculate available cartons (exclude holds + already loaded)
            const { data: loadedRows, error: loadedError } = await supabase
                .from('loaded_pallets')
                .select('cartons_loaded, is_confirmed')
                .eq('pallet_id', pallet_id)
                .eq('is_confirmed', true);

            if (loadedError) throw loadedError;

            const alreadyLoaded = (loadedRows || []).reduce(
                (sum, row) => sum + (row.cartons_loaded || 0),
                0
            );

            const availableCartons = Math.max(
                0,
                (pallet.actual_cartons || 0) - (pallet.hold_quantity || 0) - alreadyLoaded
            );

            if (cartons_loaded > availableCartons) {
                throw new Error(`Cannot load ${cartons_loaded} cartons. Only ${availableCartons} available.`);
            }

            // Get next sequence number
            const { data: lastLoaded } = await supabase
                .from('loaded_pallets')
                .select('load_sequence')
                .eq('loading_operation_id', loading_operation_id)
                .order('load_sequence', { ascending: false })
                .limit(1)
                .maybeSingle();

            const nextSequence = (lastLoaded?.load_sequence || 0) + 1;

            const isPartial = cartons_loaded < availableCartons;

            // Create loaded pallet record
            const { data: loadedPallet, error: loadError } = await supabase
                .from('loaded_pallets')
                .insert({
                    loading_operation_id,
                    pallet_id,
                    cartons_loaded,
                    is_partial_load: isPartial,
                    is_confirmed: false,
                    load_sequence: nextSequence,
                    loaded_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (loadError) throw loadError;

            // Update loading operation totals
            await this.updateLoadingOperationTotals(loading_operation_id);

            return loadedPallet!;
        } catch (error) {
            console.error('Error loading pallet:', error);
            throw error;
        }
    },

    /**
     * Update loading operation totals
     */
    async updateLoadingOperationTotals(operationId: string): Promise<void> {
        const { data } = await supabase
            .from('loaded_pallets')
            .select('cartons_loaded')
            .eq('loading_operation_id', operationId);

        const totalCartons = data?.reduce((sum, lp) => sum + lp.cartons_loaded, 0) || 0;
        const totalPallets = data?.length || 0;

        await supabase
            .from('loading_operations')
            .update({
                actual_pallets: totalPallets,
                actual_cartons: totalCartons,
            })
            .eq('id', operationId);
    },

    /**
     * Suggest pallets for loading based on strategy
     */
    /**
     * Suggest pallets for loading based on strategy
     */
    async suggestPallets(request: SuggestPalletsRequest): Promise<SuggestPalletsResponse> {
        try {
            const { company_id, loading_strategy, target_pallets, target_cartons, product_ids } = request;

            // Base query with joins
            let query = supabase
                .from('pallets')
                .select(`
                    *,
                    product:products(name),
                    batch:pallet_batches(batch_number, production_date),
                    loaded_pallets(cartons_loaded, is_confirmed)
                `)
                .eq('company_id', company_id)
                .in('status', [PalletStatus.COMPLETE, PalletStatus.PARTIAL, PalletStatus.PARTIAL_LOAD]) // Only suggest available pallets
                .gt('actual_cartons', 0); // Ensure they have stock

            // Filter by products if specified
            if (product_ids && product_ids.length > 0) {
                query = query.in('product_id', product_ids);
            }

            // Apply Sort Strategy for Database Query
            // Note: Supabase sometimes struggles with complex nested sort. 
            // We'll perform primary sort here, and refine client-side if needed for nested fields like expiry.
            switch (loading_strategy) {
                case LoadingStrategy.FEFO:
                    // Sort client-side using production_date as fallback (expiry_date not available)
                    query = query.order('created_at', { ascending: true });
                    break;
                case LoadingStrategy.FIFO:
                    // FIFO will be refined client-side using batch production_date
                    query = query.order('created_at', { ascending: true });
                    break;
                case LoadingStrategy.LIFO:
                    query = query.order('created_at', { ascending: false });
                    break;
                default:
                    query = query.order('sequence_number', { ascending: true });
            }

            // Limit fetch size to optimized performance
            query = query.limit(100);

            const { data, error } = await query;

            if (error) throw error;

            let suggestions: PalletWithDetails[] = (data || []).map(item => ({
                ...item,
                product_name: item.product?.name,
                // Make sure to map batch info correctly if needed
                batch_number: item.batch?.batch_number,
                // Fallback: use production_date when expiry_date is not available in schema
                expiry_date: item.batch?.production_date,
            }) as any); // Cast to any to bypass strict type check for joined props if interface mismatch

            // FEFO Client-Side Refinement
            // Because correct FEFO requires sorting by a joined column (batch.expiry_date),
            // and expiry_date isn't available in the current schema, we fall back to production_date.
            const sortByProductionDate = (a: any, b: any) => {
                const dateA = new Date(a.batch?.production_date || '9999-12-31').getTime();
                const dateB = new Date(b.batch?.production_date || '9999-12-31').getTime();
                if (dateA === dateB) {
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                }
                return dateA - dateB;
            };

            if (loading_strategy === LoadingStrategy.FEFO || loading_strategy === LoadingStrategy.FIFO) {
                suggestions.sort(sortByProductionDate);
            }

            // Client-side filtering/selection Logic based on Target Cartons/Pallets
            let selectedPallets: PalletWithDetails[] = [];
            let currentCartons = 0;

            for (const pallet of suggestions) {
                // Break if we met the targets
                if (target_pallets && selectedPallets.length >= target_pallets) break;
                if (target_cartons && currentCartons >= target_cartons) break;

                // Calculate available (real) cartons (exclude holds + already loaded)
                const loadedCartons = ((pallet as any).loaded_pallets || []).reduce(
                    (sum: number, row: { cartons_loaded?: number; is_confirmed?: boolean }) =>
                        sum + (row.is_confirmed ? row.cartons_loaded || 0 : 0),
                    0
                );
                const available = (pallet.actual_cartons || 0) - (pallet.hold_quantity || 0) - loadedCartons;
                if (available <= 0) continue;

                let loadCartons = available;
                let isPartialSuggestion = false;
                if (target_cartons) {
                    const remaining = target_cartons - currentCartons;
                    if (remaining <= 0) break;
                    if (available > remaining) {
                        loadCartons = remaining;
                        isPartialSuggestion = true;
                    }
                }

                // Attach calculated props for UI
                const p = {
                    ...pallet,
                    available_cartons: available,
                    completion_percentage: (pallet.actual_cartons / pallet.target_cartons) * 100,
                    suggested_cartons: loadCartons,
                    suggested_partial: isPartialSuggestion,
                };

                selectedPallets.push(p);
                currentCartons += loadCartons;
            }

            return {
                suggested_pallets: selectedPallets,
                total_cartons: currentCartons,
                total_pallets: selectedPallets.length,
            };

        } catch (error) {
            console.error('Error suggesting pallets:', error);
            throw error;
        }
    },

    /**
     * Start loading operation
     */
    async startLoadingOperation(operationId: string): Promise<LoadingOperation> {
        try {
            const { data, error } = await supabase
                .from('loading_operations')
                .update({
                    status: LoadingOperationStatus.IN_PROGRESS,
                    started_at: new Date().toISOString(),
                    loaded_by: (await supabase.auth.getUser()).data.user?.id,
                })
                .eq('id', operationId)
                .select()
                .single();

            if (error) throw error;

            return data!;
        } catch (error) {
            console.error('Error starting loading operation:', error);
            throw error;
        }
    },

    /**
     * Complete loading operation and dispatch vehicle
     */
    async completeLoadingOperation(operationId: string): Promise<LoadingOperation> {
        try {
            const { data: pendingRows, error: pendingError } = await supabase
                .from('loaded_pallets')
                .select('pallet_id, cartons_loaded')
                .eq('loading_operation_id', operationId)
                .eq('is_confirmed', false);

            if (pendingError) throw pendingError;

            const pendingByPallet = new Map<string, number>();
            (pendingRows || []).forEach((row) => {
                if (!row.pallet_id) return;
                const current = pendingByPallet.get(row.pallet_id) || 0;
                pendingByPallet.set(row.pallet_id, current + (row.cartons_loaded || 0));
            });

            for (const [palletId, pendingCartons] of pendingByPallet.entries()) {
                const { data: pallet, error: palletError } = await supabase
                    .from('pallets')
                    .select('actual_cartons, hold_quantity')
                    .eq('id', palletId)
                    .single();

                if (palletError || !pallet) {
                    throw new Error('Pallet not found while finalizing loading operation');
                }

                const { data: confirmedRows, error: confirmedError } = await supabase
                    .from('loaded_pallets')
                    .select('cartons_loaded')
                    .eq('pallet_id', palletId)
                    .eq('is_confirmed', true);

                if (confirmedError) throw confirmedError;

                const confirmedCartons = (confirmedRows || []).reduce(
                    (sum, row) => sum + (row.cartons_loaded || 0),
                    0
                );

                const available =
                    (pallet.actual_cartons || 0) - (pallet.hold_quantity || 0) - confirmedCartons;

                if (pendingCartons > available) {
                    throw new Error(
                        `Cannot finalize loading. Pallet ${palletId} exceeds available cartons (${available}).`
                    );
                }

                const remainingAfter = available - pendingCartons;
                const newStatus = remainingAfter > 0 ? PalletStatus.PARTIAL_LOAD : PalletStatus.LOADED;

                const { error: updatePalletError } = await supabase
                    .from('pallets')
                    .update({ status: newStatus })
                    .eq('id', palletId);

                if (updatePalletError) throw updatePalletError;
            }

            const confirmedAt = new Date().toISOString();
            const { error: confirmError } = await supabase
                .from('loaded_pallets')
                .update({ is_confirmed: true, confirmed_at: confirmedAt })
                .eq('loading_operation_id', operationId)
                .eq('is_confirmed', false);

            if (confirmError) throw confirmError;

            const { data: operation, error: opError } = await supabase
                .from('loading_operations')
                .update({
                    status: LoadingOperationStatus.COMPLETED,
                    completed_at: confirmedAt,
                })
                .eq('id', operationId)
                .select()
                .single();

            if (opError) throw opError;

            // Update vehicle status to dispatched
            await supabase
                .from('vehicles')
                .update({
                    status: VehicleStatus.DISPATCHED,
                    dispatched_at: new Date().toISOString(),
                })
                .eq('id', operation.vehicle_id);

            return operation!;
        } catch (error) {
            console.error('Error completing loading operation:', error);
            throw error;
        }
    },

    /**
     * Cancel loading operation
     */
    async cancelLoadingOperation(operationId: string): Promise<LoadingOperation> {
        try {
            const { data, error } = await supabase
                .from('loading_operations')
                .update({
                    status: LoadingOperationStatus.CANCELLED,
                })
                .eq('id', operationId)
                .select()
                .single();

            if (error) throw error;

            return data!;
        } catch (error) {
            console.error('Error cancelling loading operation:', error);
            throw error;
        }
    },

    /**
     * Get loading operation with details
     */
    async getLoadingOperationWithDetails(operationId: string): Promise<LoadingOperationWithDetails | null> {
        try {
            const { data, error } = await supabase
                .from('loading_operations')
                .select(`
          *,
          vehicle:vehicles(
            *,
            inspection:vehicle_inspections(*)
          ),
          loaded_pallets:loaded_pallets(
            *,
            pallet:pallets(*)
          )
        `)
                .eq('id', operationId)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error getting loading operation details:', error);
            return null;
        }
    },

    /**
     * Get loading operations for a date range
     */
    async getLoadingOperations(companyId: string, fromDate?: string, toDate?: string): Promise<LoadingOperation[]> {
        try {
            let query = supabase
                .from('loading_operations')
                .select('*')
                .eq('company_id', companyId)
                .order('planned_date', { ascending: false });

            if (fromDate) {
                query = query.gte('planned_date', fromDate);
            }

            if (toDate) {
                query = query.lte('planned_date', toDate);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error getting loading operations:', error);
            return [];
        }
    },
};
