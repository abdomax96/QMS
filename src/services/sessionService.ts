/**
 * Session Management Service
 * Manages registration session context for pallet registration
 * Stores session data in localStorage for persistence across page refreshes
 */

import type {
    RegistrationSession,
    CreateSessionRequest,
    CreateSessionResponse,
    PalletBatch,
} from '../types/pallet';
import { supabase } from '../config/supabase';
import { BatchStatus } from '../types/pallet';

const SESSION_STORAGE_KEY = 'pallet_registration_session';

export const sessionService = {
    /**
     * Create a new registration session
     */
    async createSession(request: CreateSessionRequest): Promise<CreateSessionResponse> {
        try {
            // 1. Get company and product names
            const { data: company } = await supabase
                .from('companies')
                .select('name')
                .eq('id', request.company_id)
                .single();

            const { data: product } = await supabase
                .from('products')
                .select('name')
                .eq('id', request.product_id)
                .single();

            if (!company || !product) {
                throw new Error('Company or Product not found');
            }

            // 2. Get standard cartons from SOP variables
            const { data: sopVariable } = await supabase
                .from('variables')
                .select('variable_value')
                .eq('product_id', request.product_id)
                .ilike('variable_name', '%cartons%per%pallet%')
                .eq('variable_type', 'sop_parameter')
                .maybeSingle();

            const standardCartons = sopVariable?.variable_value
                ? parseInt(sopVariable.variable_value)
                : 60; // default

            // 3. Get or create batch
            let batch: PalletBatch | null = null;
            let batchId: string;

            if (request.use_existing_batch) {
                // Find existing batch
                const { data: existingBatch } = await supabase
                    .from('pallet_batches')
                    .select('*')
                    .eq('company_id', request.company_id)
                    .eq('batch_number', request.batch_number)
                    .eq('status', BatchStatus.ACTIVE)
                    .maybeSingle();

                if (existingBatch) {
                    batch = existingBatch;
                    batchId = existingBatch.id;
                } else {
                    throw new Error('Batch not found or not active');
                }
            } else {
                // Create new batch
                const { data: newBatch, error } = await supabase
                    .from('pallet_batches')
                    .insert({
                        batch_number: request.batch_number,
                        company_id: request.company_id,
                        product_id: request.product_id,
                        production_date: request.shift_date || new Date().toISOString().split('T')[0],
                        form_instance_id: request.form_instance_id,
                        status: BatchStatus.ACTIVE,
                    })
                    .select()
                    .single();

                if (error) {
                    // Check if batch already exists
                    if (error.code === '23505') {
                        const { data: existingBatch } = await supabase
                            .from('pallet_batches')
                            .select('*')
                            .eq('company_id', request.company_id)
                            .eq('batch_number', request.batch_number)
                            .single();

                        if (existingBatch) {
                            batch = existingBatch;
                            batchId = existingBatch.id;
                        } else {
                            throw error;
                        }
                    } else {
                        throw error;
                    }
                } else {
                    batch = newBatch!;
                    batchId = newBatch!.id;
                }
            }

            // 4. Get pallet settings
            const { data: settings } = await supabase
                .from('pallet_settings')
                .select('allow_multiple_batches_per_pallet')
                .eq('company_id', request.company_id)
                .maybeSingle();

            // 5. Calculate next pallet number
            const { data: lastPallet } = await supabase
                .from('pallets')
                .select('sequence_number')
                .eq('batch_id', batchId)
                .order('sequence_number', { ascending: false })
                .limit(1)
                .maybeSingle();

            const nextSequence = (lastPallet?.sequence_number || 0) + 1;
            const nextPalletNumber = `${request.batch_number}-P${String(nextSequence).padStart(3, '0')}`;

            // 6. Create session object
            const session: RegistrationSession = {
                company_id: request.company_id,
                company_name: company.name,
                product_id: request.product_id,
                product_name: product.name,
                batch_id: batchId,
                batch_number: request.batch_number,
                form_instance_id: request.form_instance_id,
                shift: request.shift,
                shift_date: request.shift_date || new Date().toISOString().split('T')[0],
                standard_cartons_per_pallet: standardCartons,
                allow_multiple_batches: settings?.allow_multiple_batches_per_pallet || false,
                registered_pallets: [],
                started_at: new Date().toISOString(),
                last_updated: new Date().toISOString(),
            };

            // 7. Save to localStorage
            this.saveSession(session);

            return {
                session,
                next_pallet_number: nextPalletNumber,
            };
        } catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    },

    /**
     * Get active session from localStorage
     */
    getActiveSession(): RegistrationSession | null {
        try {
            const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
            if (!sessionData) return null;

            const session = JSON.parse(sessionData) as RegistrationSession;

            // Check if session is still valid (not older than 24 hours)
            const sessionAge = Date.now() - new Date(session.started_at).getTime();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours

            if (sessionAge > maxAge) {
                this.clearSession();
                return null;
            }

            return session;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    },

    /**
     * Update session (add new pallet to registered list)
     */
    updateSession(session: RegistrationSession): void {
        session.last_updated = new Date().toISOString();
        this.saveSession(session);
    },

    /**
     * Save session to localStorage
     */
    saveSession(session: RegistrationSession): void {
        try {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        } catch (error) {
            console.error('Error saving session:', error);
            throw new Error('Failed to save session');
        }
    },

    /**
     * Clear session (end session)
     */
    clearSession(): void {
        try {
            localStorage.removeItem(SESSION_STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    },

    /**
     * Check if there's an active session
     */
    hasActiveSession(): boolean {
        return this.getActiveSession() !== null;
    },

    /**
     * Get batches from form_instances for selection
     */
    async getBatchesFromForms(companyId: string): Promise<Array<{ batch_number: string; form_instance_id: string; created_at: string }>> {
        try {
            const { data, error } = await supabase
                .from('form_instances')
                .select('id, batch_number, batch_info, created_at')
                .eq('company_id', companyId)
                .not('batch_number', 'is', null)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            return (data || []).map(item => ({
                batch_number: item.batch_number!,
                form_instance_id: item.id,
                created_at: item.created_at,
            }));
        } catch (error) {
            console.error('Error getting batches from forms:', error);
            return [];
        }
    },

    /**
     * Get shifts from a specific batch (form_instances records)
     */
    async getShiftsFromBatch(formInstanceId: string): Promise<string[]> {
        try {
            const { data, error } = await supabase
                .from('form_instances')
                .select('batch_info, data')
                .eq('id', formInstanceId)
                .single();

            if (error) throw error;

            // Try to extract shifts from batch_info or data
            const shifts: string[] = [];

            if (data.batch_info?.shifts) {
                shifts.push(...data.batch_info.shifts);
            }

            // Fallback: extract from data if available
            if (shifts.length === 0 && data.data) {
                // This depends on your form structure
                // Adjust based on actual form_instances.data structure
                const shiftField = data.data.shift || data.data.وردية;
                if (shiftField) {
                    shifts.push(shiftField);
                }
            }

            // Default shifts if none found
            if (shifts.length === 0) {
                return ['A', 'B', 'C'];
            }

            return [...new Set(shifts)]; // Remove duplicates
        } catch (error) {
            console.error('Error getting shifts:', error);
            return ['A', 'B', 'C']; // Default shifts
        }
    },

    /**
     * Get standard cartons from SOP variables
     */
    async getStandardCartonsFromSOP(productId: string): Promise<number> {
        try {
            const { data, error } = await supabase
                .from('variables')
                .select('variable_value')
                .eq('product_id', productId)
                .eq('variable_type', 'sop_parameter')
                .or('variable_name.ilike.%cartons%per%pallet%,variable_name.ilike.%pallet%capacity%')
                .maybeSingle();

            if (error) throw error;

            if (data?.variable_value) {
                const parsed = parseInt(data.variable_value);
                if (!isNaN(parsed) && parsed > 0) {
                    return parsed;
                }
            }

            return 60; // Default
        } catch (error) {
            console.error('Error getting standard cartons:', error);
            return 60;
        }
    },
};
