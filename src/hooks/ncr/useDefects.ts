import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../config/supabase';

export type DefectType = 'raw_material' | 'product' | 'process' | 'other';

export interface Defect {
    id: string;
    name: string;
    severity: 'low' | 'medium' | 'high';
    defect_type: DefectType;
    is_active: boolean;
}

interface UseDefectsOptions {
    defectType?: DefectType;
    productId?: string | null;
    productionLineId?: string | null;
    materialReceivingId?: string | null;
    includeInactive?: boolean;
}

export function useDefects(options: UseDefectsOptions = {}) {
    const [defects, setDefects] = useState<Defect[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDefects = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('defects')
                .select('id, name, severity, defect_type, is_active')
                .order('name');

            if (!options.includeInactive) {
                query = query.eq('is_active', true);
            }

            if (options.defectType) query = query.eq('defect_type', options.defectType);
            // Source filters are placeholders for future table relations; kept for API compatibility
            if (options.productId) query = query.eq('product_id', options.productId);
            if (options.productionLineId) query = query.eq('production_line_id', options.productionLineId);
            if (options.materialReceivingId) query = query.eq('material_receiving_id', options.materialReceivingId);

            const { data, error: qError } = await query;
            if (qError) throw qError;
            setDefects((data || []) as Defect[]);
        } catch (err: any) {
            console.error('Error loading defects', err);
            setError(err.message || 'Error loading defects');
        } finally {
            setLoading(false);
        }
    }, [options.defectType, options.productId, options.productionLineId, options.materialReceivingId]);

    const addDefect = useCallback(
        async (input: { name: string; severity: 'low' | 'medium' | 'high'; defect_type: DefectType }) => {
            const { data, error: insertError } = await supabase
                .from('defects')
                .insert({
                    name: input.name,
                    severity: input.severity,
                    defect_type: input.defect_type,
                    is_active: true
                })
                .select()
                .single();

            if (insertError) throw insertError;
            await fetchDefects();
            return data as Defect;
        },
        [fetchDefects]
    );

    const updateDefect = useCallback(
        async (id: string, patch: Partial<Pick<Defect, 'name' | 'severity' | 'defect_type' | 'is_active'>>) => {
            const { error } = await supabase
                .from('defects')
                .update(patch)
                .eq('id', id);
            if (error) throw error;
            await fetchDefects();
        },
        [fetchDefects]
    );

    useEffect(() => {
        fetchDefects();
    }, [fetchDefects]);

    return { defects, loading, error, refetch: fetchDefects, addDefect, updateDefect };
}

export default useDefects;
