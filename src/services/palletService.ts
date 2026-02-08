/**
 * Pallet Service
 * Core service for pallet management operations
 */

import type {
    Pallet,
    PalletWithDetails,
    PalletContribution,
    RegisterPalletRequest,
    RegisterPalletResponse,
    GetPalletsRequest,
    GetPalletsResponse,
    RegistrationSession,
    PalletBatch,
    PalletBatchWithRelations,
    CreatePalletBatchInput,
    CreateSessionRequest,
    CreateSessionResponse,
} from '../types/pallet';
import { supabase } from '../config/supabase';
import { PalletStatus, BatchStatus } from '../types/pallet';

export const palletService = {
    /**
     * Register a new pallet within the current session
     */
    async registerPallet(request: RegisterPalletRequest): Promise<RegisterPalletResponse> {
        try {
            const { session, cartons, finished_at, is_partial, continue_existing_pallet_id, notes } = request;

            // Validate
            if (cartons <= 0 || cartons > session.standard_cartons_per_pallet) {
                throw new Error(`Invalid carton count. Must be between 1 and ${session.standard_cartons_per_pallet}`);
            }

            let pallet: Pallet;
            let contribution: PalletContribution;

            // Case 1: Continue existing pallet
            if (continue_existing_pallet_id) {
                const { data: existingPallet, error: fetchError } = await supabase
                    .from('pallets')
                    .select('*')
                    .eq('id', continue_existing_pallet_id)
                    .single();

                if (fetchError || !existingPallet) {
                    throw new Error('Pallet not found');
                }

                // Update pallet with new cartons
                const newTotal = existingPallet.actual_cartons + cartons;
                const newStatus = newTotal >= existingPallet.target_cartons
                    ? PalletStatus.COMPLETE
                    : PalletStatus.PARTIAL;

                const { data: updatedPallet, error: updateError } = await supabase
                    .from('pallets')
                    .update({
                        actual_cartons: newTotal,
                        status: newStatus,
                        completed_at: newStatus === PalletStatus.COMPLETE ? new Date().toISOString() : null,
                        finished_at: finished_at || existingPallet.finished_at,
                    })
                    .eq('id', continue_existing_pallet_id)
                    .select()
                    .single();

                if (updateError) throw updateError;

                pallet = updatedPallet!;

                // Add contribution
                const { data: newContribution, error: contributionError } = await supabase
                    .from('pallet_contributions')
                    .insert({
                        pallet_id: continue_existing_pallet_id,
                        shift: session.shift,
                        shift_date: session.shift_date,
                        form_instance_id: session.form_instance_id,
                        cartons_added: cartons,
                        operator_id: (await supabase.auth.getUser()).data.user?.id,
                        added_at: new Date().toISOString(),
                    })
                    .select()
                    .single();

                if (contributionError) throw contributionError;
                contribution = newContribution!;

                // Track Batch Source (Multi-Batch)
                if (session.batch_id && session.batch_id !== existingPallet.batch_id) {
                    // Check if source already exists
                    const { data: existingSource } = await supabase
                        .from('pallet_batch_sources')
                        .select('id, cartons_from_batch')
                        .eq('pallet_id', pallet.id)
                        .eq('source_batch_id', session.batch_id)
                        .maybeSingle();

                    if (existingSource) {
                        // Update existing source
                        await supabase
                            .from('pallet_batch_sources')
                            .update({
                                cartons_from_batch: existingSource.cartons_from_batch + cartons
                            })
                            .eq('id', existingSource.id);
                    } else {
                        // Create new source
                        await supabase
                            .from('pallet_batch_sources')
                            .insert({
                                pallet_id: pallet.id,
                                source_batch_id: session.batch_id,
                                cartons_from_batch: cartons,
                                is_primary: false,
                                added_at: new Date().toISOString()
                            });
                    }
                } else if (session.batch_id && session.batch_id === existingPallet.batch_id) {
                    // Update primary source (if needed logic here, usually primary is set on creation)
                    // Ideally we track primary source updates too if we want exact accounting
                    const { data: primarySource } = await supabase
                        .from('pallet_batch_sources')
                        .select('id, cartons_from_batch')
                        .eq('pallet_id', pallet.id)
                        .eq('source_batch_id', session.batch_id)
                        .maybeSingle();

                    if (primarySource) {
                        await supabase
                            .from('pallet_batch_sources')
                            .update({
                                cartons_from_batch: primarySource.cartons_from_batch + cartons
                            })
                            .eq('id', primarySource.id);
                    }
                }
            }
            // Case 2: Register new pallet
            else {
                // Get next sequence number
                const { data: lastPallet } = await supabase
                    .from('pallets')
                    .select('sequence_number')
                    .eq('batch_id', session.batch_id!)
                    .order('sequence_number', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                const nextSequence = (lastPallet?.sequence_number || 0) + 1;
                const palletNumber = `${session.batch_number}-P${String(nextSequence).padStart(3, '0')}`;

                // Determine target and status
                const targetCartons = is_partial ? cartons : session.standard_cartons_per_pallet;
                const status = cartons >= targetCartons ? PalletStatus.COMPLETE : PalletStatus.PARTIAL;

                // Create pallet
                const { data: newPallet, error: palletError } = await supabase
                    .from('pallets')
                    .insert({
                        pallet_number: palletNumber,
                        sequence_number: nextSequence,
                        batch_id: session.batch_id!,
                        company_id: session.company_id,
                        product_id: session.product_id,
                        standard_cartons_per_pallet: session.standard_cartons_per_pallet,
                        actual_cartons: cartons,
                        target_cartons: targetCartons,
                        status,
                        finished_at: finished_at || new Date().toISOString(),
                        completed_at: status === PalletStatus.COMPLETE ? new Date().toISOString() : null,
                        notes,
                    })
                    .select()
                    .single();

                if (palletError) throw palletError;

                pallet = newPallet!;

                // Create contribution
                const { data: newContribution, error: contributionError } = await supabase
                    .from('pallet_contributions')
                    .insert({
                        pallet_id: pallet.id,
                        shift: session.shift,
                        shift_date: session.shift_date,
                        form_instance_id: session.form_instance_id,
                        cartons_added: cartons,
                        operator_id: (await supabase.auth.getUser()).data.user?.id,
                        added_at: new Date().toISOString(),
                    })
                    .select()
                    .single();

                if (contributionError) throw contributionError;
                contribution = newContribution!;

                // Initial Batch Source (Primary)
                if (session.batch_id) {
                    await supabase
                        .from('pallet_batch_sources')
                        .insert({
                            pallet_id: pallet.id,
                            source_batch_id: session.batch_id,
                            cartons_from_batch: cartons,
                            is_primary: true,
                            added_at: new Date().toISOString()
                        });
                }
            }

            // Calculate next pallet number
            const { data: lastPallet } = await supabase
                .from('pallets')
                .select('sequence_number')
                .eq('batch_id', session.batch_id!)
                .order('sequence_number', { ascending: false })
                .limit(1)
                .single();

            const nextSequence = lastPallet.sequence_number + 1;
            const nextPalletNumber = `${session.batch_number}-P${String(nextSequence).padStart(3, '0')}`;

            return {
                pallet,
                contribution,
                next_pallet_number: nextPalletNumber,
            };
        } catch (error) {
            console.error('Error registering pallet:', error);
            throw error;
        }
    },

    /**
     * Get pallets with filters and pagination
     */
    async getPallets(request: GetPalletsRequest): Promise<GetPalletsResponse> {
        try {
            const {
                company_id,
                product_id,
                batch_id,
                status,
                from_date,
                to_date,
                search,
                page = 1,
                limit = 20,
            } = request;

            let query = supabase
                .from('pallets')
                .select(`
          *,
          batch:pallet_batches!inner(batch_number, production_date, status),
          company:companies!inner(name),
          product:products!inner(name),
          loaded_pallets(cartons_loaded, is_confirmed)
        `, { count: 'exact' });

            // Apply filters
            if (company_id) {
                query = query.eq('company_id', company_id);
            }

            if (product_id) {
                query = query.eq('product_id', product_id);
            }

            if (batch_id) {
                query = query.eq('batch_id', batch_id);
            }

            if (status) {
                if (Array.isArray(status)) {
                    query = query.in('status', status);
                } else {
                    query = query.eq('status', status);
                }
            }

            if (from_date) {
                query = query.gte('created_at', from_date);
            }

            if (to_date) {
                query = query.lte('created_at', to_date);
            }

            if (search) {
                query = query.or(`pallet_number.ilike.%${search}%,notes.ilike.%${search}%`);
            }

            // Pagination
            const offset = (page - 1) * limit;
            query = query.range(offset, offset + limit - 1);

            // Order by
            query = query.order('created_at', { ascending: false });

            const { data, error, count } = await query;

            if (error) throw error;

            // Transform to PalletWithDetails
            const pallets: PalletWithDetails[] = (data || []).map(item => {
                const loadedCartons = (item.loaded_pallets || []).reduce(
                    (sum: number, row: { cartons_loaded?: number; is_confirmed?: boolean }) =>
                        sum + (row.is_confirmed ? row.cartons_loaded || 0 : 0),
                    0
                );
                const availableCartons = (item.actual_cartons || 0) - (item.hold_quantity || 0) - loadedCartons;

                return {
                    ...item,
                    company_name: item.company?.name,
                    product_name: item.product?.name,
                    completion_percentage: (item.actual_cartons / item.target_cartons) * 100,
                    is_complete: item.status === PalletStatus.COMPLETE,
                    is_held: item.status === PalletStatus.HOLD || item.status === PalletStatus.PARTIAL_HOLD,
                    available_cartons: Math.max(0, availableCartons),
                };
            });

            return {
                pallets,
                total: count || 0,
                page,
                limit,
            };
        } catch (error) {
            console.error('Error getting pallets:', error);
            throw error;
        }
    },

    /**
     * Get pallet details by ID
     */
    async getPalletDetails(palletId: string): Promise<PalletWithDetails | null> {
        try {
            const { data, error } = await supabase
                .from('pallets')
                .select(`
          *,
          batch:pallet_batches(*),
          company:companies(name),
          product:products(name),
          contributions:pallet_contributions(*),
          batch_sources:pallet_batch_sources(*, source_batch:pallet_batches(batch_number)),
          holds:pallet_holds(*),
          loaded_pallets(cartons_loaded, is_confirmed)
        `)
                .eq('id', palletId)
                .single();

            if (error) throw error;
            if (!data) return null;

            const contributions = (data.contributions || []) as PalletContribution[];
            const operatorIds = Array.from(
                new Set(contributions.map((contribution) => contribution.operator_id).filter(Boolean))
            ) as string[];
            const operatorNameById = new Map<string, string>();

            if (operatorIds.length > 0) {
                const { data: usersData, error: usersError } = await supabase
                    .from('users')
                    .select('id, name, display_name, email')
                    .in('id', operatorIds);

                if (!usersError && usersData) {
                    (usersData as Array<{ id: string; name?: string | null; display_name?: string | null; email?: string | null }>).forEach((user) => {
                        const displayName = user.display_name || user.name || user.email;
                        if (displayName) {
                            operatorNameById.set(user.id, displayName);
                        }
                    });
                }
            }

            const normalizedContributions = contributions.map((contribution) => {
                if (!contribution.operator_name && contribution.operator_id) {
                    const resolvedName = operatorNameById.get(contribution.operator_id);
                    if (resolvedName) {
                        return { ...contribution, operator_name: resolvedName };
                    }
                }
                return contribution;
            });

            const loadedCartons = (data.loaded_pallets || []).reduce(
                (sum: number, row: { cartons_loaded?: number; is_confirmed?: boolean }) =>
                    sum + (row.is_confirmed ? row.cartons_loaded || 0 : 0),
                0
            );

            return {
                ...data,
                company_name: data.company?.name,
                product_name: data.product?.name,
                contributions: normalizedContributions,
                completion_percentage: (data.actual_cartons / data.target_cartons) * 100,
                is_complete: data.status === PalletStatus.COMPLETE,
                is_held: data.status === PalletStatus.HOLD || data.status === PalletStatus.PARTIAL_HOLD,
                available_cartons: Math.max(
                    0,
                    (data.actual_cartons || 0) - (data.hold_quantity || 0) - loadedCartons
                ),
            };
        } catch (error) {
            console.error('Error getting pallet details:', error);
            throw error;
        }
    },

    /**
     * Get partial pallets for a batch (for continuing)
     */
    async getPartialPallets(batchId: string): Promise<Pallet[]> {
        try {
            const { data, error } = await supabase
                .from('pallets')
                .select('*')
                .eq('batch_id', batchId)
                .eq('status', PalletStatus.PARTIAL)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error getting partial pallets:', error);
            return [];
        }
    },

    /**
     * Update pallet
     */
    async updatePallet(
        palletId: string,
        updates: Partial<Pick<Pallet, 'location' | 'notes' | 'status'>>
    ): Promise<Pallet> {
        try {
            const { data, error } = await supabase
                .from('pallets')
                .update(updates)
                .eq('id', palletId)
                .select()
                .single();

            if (error) throw error;

            return data!;
        } catch (error) {
            console.error('Error updating pallet:', error);
            throw error;
        }
    },

    /**
     * Delete pallet (soft delete by changing status)
     */
    async deletePallet(palletId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('pallets')
                .delete()
                .eq('id', palletId);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting pallet:', error);
            throw error;
        }
    },

    /**
     * Get pallets for a session (registered during current session)
     */
    async getPalletsForSession(session: RegistrationSession): Promise<Pallet[]> {
        try {
            const { data, error } = await supabase
                .from('pallets')
                .select('*')
                .eq('batch_id', session.batch_id!)
                .gte('created_at', session.started_at)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error getting pallets for session:', error);
            return [];
        }
    },
};
