import { supabase } from '../config/supabase';

export interface ProductionBatch {
    id: string;
    company_id: string;
    batch_number: string;
    product_id?: string;
    product_name?: string;
    production_date: string;
    shift: 'A' | 'B' | 'C';
    status: 'running' | 'completed' | 'held' | 'cancelled';
    planned_quantity?: number;
    actual_quantity: number;
    uom: string;
    operator_name?: string;
    notes?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
}

export interface ReworkLog {
    id: string;
    batch_id: string;
    source_batch_no?: string;
    rework_quantity: number;
    rework_type?: string;
    reason?: string;
    added_by?: string;
    added_at: string;
}

export interface CreateBatchInput {
    batch_number: string;
    product_id?: string;
    product_name: string;
    shift: 'A' | 'B' | 'C';
    planned_quantity?: number;
    uom?: string;
    operator_name?: string;
    notes?: string;
}

export interface AddReworkInput {
    batch_id: string;
    source_batch_no?: string;
    rework_quantity: number;
    rework_type?: string;
    reason?: string;
}

export const productionService = {
    /**
     * Get all active batches
     */
    async getActiveBatches() {
        const { data, error } = await supabase
            .from('production_batches')
            .select('*')
            .eq('status', 'running')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as ProductionBatch[];
    },

    /**
     * Get batch history
     */
    async getBatchHistory(limit = 50) {
        const { data, error } = await supabase
            .from('production_batches')
            .select('*')
            .in('status', ['completed', 'cancelled', 'held'])
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data as ProductionBatch[];
    },

    /**
     * Get single batch with rework logs
     */
    async getBatchDetails(id: string) {
        const { data, error } = await supabase
            .from('production_batches')
            .select(`
                *,
                rework_logs:production_rework_logs(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as ProductionBatch & { rework_logs: ReworkLog[] };
    },

    /**
     * Create new batch
     */
    async createBatch(input: CreateBatchInput) {
        // Get user company
        const { data: companyId } = await supabase.rpc('get_user_company_id');

        const { data, error } = await supabase
            .from('production_batches')
            .insert({
                ...input,
                company_id: companyId,
                status: 'running',
                actual_quantity: 0
            })
            .select()
            .single();

        if (error) throw error;
        return data as ProductionBatch;
    },

    /**
     * Update batch status or output
     */
    async updateBatch(id: string, updates: Partial<ProductionBatch>) {
        const { data, error } = await supabase
            .from('production_batches')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as ProductionBatch;
    },

    /**
     * Add rework entry
     */
    async addRework(input: AddReworkInput) {
        const { data, error } = await supabase
            .from('production_rework_logs')
            .insert(input)
            .select()
            .single();

        if (error) throw error;
        return data as ReworkLog;
    }
};
