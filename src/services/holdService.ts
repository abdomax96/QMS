/**
 * Hold Service
 * Handles pallet hold management and disposition
 */

import type {
    PalletHold,
    CreateHoldInput,
    ResolveHoldInput,
} from '../types/pallet';
import { supabase } from '../config/supabase';
import { HoldStatus, PalletStatus } from '../types/pallet';

export const holdService = {
    /**
     * Create a hold on a pallet
     */
    async createHold(input: CreateHoldInput): Promise<PalletHold> {
        try {
            const { pallet_id, ncr_id, hold_quantity, hold_reason } = input;

            // Get pallet details
            const { data: pallet, error: palletError } = await supabase
                .from('pallets')
                .select('*')
                .eq('id', pallet_id)
                .single();

            if (palletError || !pallet) {
                throw new Error('Pallet not found');
            }

            // Validate hold quantity
            const availableCartons = pallet.actual_cartons - pallet.hold_quantity;
            if (hold_quantity > availableCartons) {
                throw new Error(`Cannot hold ${hold_quantity} cartons. Only ${availableCartons} available.`);
            }

            // Create hold
            const { data: hold, error: holdError } = await supabase
                .from('pallet_holds')
                .insert({
                    pallet_id,
                    ncr_id,
                    hold_quantity,
                    hold_reason,
                    status: HoldStatus.ACTIVE,
                    scrapped_quantity: 0,
                    accepted_quantity: 0,
                    reworked_quantity: 0,
                    held_at: new Date().toISOString(),
                    held_by: (await supabase.auth.getUser()).data.user?.id,
                })
                .select()
                .single();

            if (holdError) throw holdError;

            // Update pallet hold quantity and status
            const newHoldQuantity = pallet.hold_quantity + hold_quantity;
            const newStatus = newHoldQuantity >= pallet.actual_cartons
                ? PalletStatus.HOLD
                : PalletStatus.PARTIAL_HOLD;

            await supabase
                .from('pallets')
                .update({
                    hold_quantity: newHoldQuantity,
                    status: newStatus,
                    ncr_id: ncr_id,
                })
                .eq('id', pallet_id);

            return hold!;
        } catch (error) {
            console.error('Error creating hold:', error);
            throw error;
        }
    },

    /**
     * Resolve a hold (disposition)
     */
    async resolveHold(input: ResolveHoldInput): Promise<PalletHold> {
        try {
            const { hold_id, disposition_type, scrapped_quantity, accepted_quantity, reworked_quantity, disposition_notes } = input;

            // Get hold details
            const { data: hold, error: holdError } = await supabase
                .from('pallet_holds')
                .select('*')
                .eq('id', hold_id)
                .single();

            if (holdError || !hold) {
                throw new Error('Hold not found');
            }

            if (hold.status !== HoldStatus.ACTIVE) {
                throw new Error('Hold is not active');
            }

            // Calculate quantities
            const disposedQuantity = (scrapped_quantity || 0) + (accepted_quantity || 0) + (reworked_quantity || 0);

            if (disposedQuantity > hold.hold_quantity) {
                throw new Error('Disposed quantity exceeds hold quantity');
            }

            // Update hold
            const newStatus = disposedQuantity === hold.hold_quantity
                ? (disposition_type === 'scrap' ? HoldStatus.SCRAPPED : HoldStatus.RELEASED)
                : HoldStatus.ACTIVE;

            const { data: updatedHold, error: updateError } = await supabase
                .from('pallet_holds')
                .update({
                    disposition_type,
                    scrapped_quantity: (hold.scrapped_quantity || 0) + (scrapped_quantity || 0),
                    accepted_quantity: (hold.accepted_quantity || 0) + (accepted_quantity || 0),
                    reworked_quantity: (hold.reworked_quantity || 0) + (reworked_quantity || 0),
                    disposition_notes,
                    status: newStatus,
                    resolved_at: newStatus !== HoldStatus.ACTIVE ? new Date().toISOString() : null,
                    resolved_by: newStatus !== HoldStatus.ACTIVE ? (await supabase.auth.getUser()).data.user?.id : null,
                })
                .eq('id', hold_id)
                .select()
                .single();

            if (updateError) throw updateError;

            // Update pallet if hold is fully resolved
            if (newStatus !== HoldStatus.ACTIVE) {
                const { data: pallet } = await supabase
                    .from('pallets')
                    .select('*, holds:pallet_holds(*)')
                    .eq('id', hold.pallet_id)
                    .single();

                if (pallet) {
                    // Calculate remaining active holds
                    const activeHoldsQuantity = pallet.holds
                        ?.filter((h: PalletHold) => h.status === HoldStatus.ACTIVE && h.id !== hold_id)
                        .reduce((sum: number, h: PalletHold) => sum + h.hold_quantity, 0) || 0;

                    // Deduct accepted cartons from pallet total
                    const newActualCartons = pallet.actual_cartons - (scrapped_quantity || 0);

                    // Determine new status
                    let newPalletStatus = pallet.status;
                    if (activeHoldsQuantity === 0) {
                        newPalletStatus = newActualCartons >= pallet.target_cartons ? PalletStatus.COMPLETE : PalletStatus.PARTIAL;
                    } else if (activeHoldsQuantity < pallet.actual_cartons) {
                        newPalletStatus = PalletStatus.PARTIAL_HOLD;
                    }

                    await supabase
                        .from('pallets')
                        .update({
                            hold_quantity: activeHoldsQuantity,
                            actual_cartons: newActualCartons,
                            status: newPalletStatus,
                            released_at: activeHoldsQuantity === 0 ? new Date().toISOString() : null,
                        })
                        .eq('id', hold.pallet_id);
                }
            }

            return updatedHold!;
        } catch (error) {
            console.error('Error resolving hold:', error);
            throw error;
        }
    },

    /**
     * Get active holds for a pallet
     */
    async getActiveHolds(palletId: string): Promise<PalletHold[]> {
        try {
            const { data, error } = await supabase
                .from('pallet_holds')
                .select('*')
                .eq('pallet_id', palletId)
                .eq('status', HoldStatus.ACTIVE)
                .order('held_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error getting active holds:', error);
            return [];
        }
    },

    /**
     * Get all holds for a pallet
     */
    async getPalletHolds(palletId: string): Promise<PalletHold[]> {
        try {
            const { data, error } = await supabase
                .from('pallet_holds')
                .select('*')
                .eq('pallet_id', palletId)
                .order('held_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error getting pallet holds:', error);
            return [];
        }
    },

    /**
     * Get holds linked to an NCR
     */
    async getHoldsByNCR(ncrId: string): Promise<PalletHold[]> {
        try {
            const { data, error } = await supabase
                .from('pallet_holds')
                .select(`
          *,
          pallet:pallets(*)
        `)
                .eq('ncr_id', ncrId)
                .order('held_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error getting holds by NCR:', error);
            return [];
        }
    },

    /**
     * Get company-wide active holds
     */
    async getCompanyActiveHolds(companyId: string): Promise<PalletHold[]> {
        try {
            const { data, error } = await supabase
                .from('pallet_holds')
                .select(`
          *,
          pallet:pallets!inner(
            pallet_number,
            product_id,
            company_id
          ),
          ncr:ncr_reports(ncr_number, number)
        `)
                .eq('status', HoldStatus.ACTIVE)
                .eq('pallet.company_id', companyId)
                .order('held_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error getting company active holds:', error);
            return [];
        }
    },

    /**
     * Create holds for a range of pallets in a batch
     */
    async holdBatchRange(
        companyId: string,
        batchNumber: string,
        range: { start?: number; end?: number },
        reason: string,
        ncrId?: string,
        shift?: string
    ): Promise<{ held_count: number; failed_count: number }> {
        try {
            // 1. Find the batch
            const { data: batch, error: batchError } = await supabase
                .from('pallet_batches')
                .select('id')
                .eq('company_id', companyId)
                .eq('batch_number', batchNumber)
                .single();

            if (batchError || !batch) throw new Error('Batch not found');

            // 2. Query target pallets
            // We select from pallets and modify query if shift is present
            let query = supabase
                .from('pallets')
                .select(`
                    id, 
                    sequence_number, 
                    actual_cartons, 
                    hold_quantity,
                    contributions:pallet_contributions!inner(shift)
                `)
                .eq('batch_id', batch.id);

            if (range.start) query = query.gte('sequence_number', range.start);
            if (range.end) query = query.lte('sequence_number', range.end);

            // Filter by shift if provided
            if (shift) {
                query = query.eq('pallet_contributions.shift', shift);
            }

            const { data: pallets, error: palletsError } = await query;
            if (palletsError) throw palletsError;
            if (!pallets || pallets.length === 0) return { held_count: 0, failed_count: 0 };

            // 3. Apply holds sequentially (to handle partial failures gracefully)
            let heldCount = 0;
            let failedCount = 0;

            for (const pallet of pallets) {
                // Skip fully held pallets
                if (pallet.hold_quantity >= pallet.actual_cartons) {
                    continue;
                }

                try {
                    await this.createHold({
                        pallet_id: pallet.id,
                        ncr_id: ncrId || undefined,
                        hold_reason: reason,
                        hold_quantity: pallet.actual_cartons - pallet.hold_quantity // Hold remaining amount
                    });
                    heldCount++;
                } catch (e) {
                    console.error(`Failed to hold pallet ${pallet.sequence_number}`, e);
                    failedCount++;
                }
            }

            return { held_count: heldCount, failed_count: failedCount };

        } catch (error) {
            console.error('Error holding batch range:', error);
            throw error;
        }
    }
};

