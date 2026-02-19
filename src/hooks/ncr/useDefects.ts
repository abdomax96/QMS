import { useEffect, useState, useCallback } from 'react';
import { addDefect as addDefectSetting, fetchSystemSettings, updateDefect as updateDefectSetting } from '../../services/ncr/settingsService';

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
            const settings = await fetchSystemSettings();
            let next = (settings.defectCatalog || []).map((d) => ({
                id: d.id,
                name: d.name,
                severity: (d.severity || 'medium') as 'low' | 'medium' | 'high',
                defect_type: (d.defectType || 'other') as DefectType,
                is_active: d.isActive !== false
            }));

            if (!options.includeInactive) {
                next = next.filter((d) => d.is_active);
            }

            if (options.defectType) {
                next = next.filter((d) => d.defect_type === options.defectType);
            }

            next.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
            setDefects(next);
        } catch (err: any) {
            console.error('Error loading defects', err);
            setError(err.message || 'Error loading defects');
        } finally {
            setLoading(false);
        }
    }, [options.defectType, options.includeInactive, options.productId, options.productionLineId, options.materialReceivingId]);

    const addDefect = useCallback(
        async (input: { name: string; severity: 'low' | 'medium' | 'high'; defect_type: DefectType }) => {
            const data = await addDefectSetting({
                name: input.name,
                category: 'NCR',
                defectType: input.defect_type,
                severity: input.severity,
                isActive: true
            });
            await fetchDefects();
            return {
                id: data.id,
                name: data.name,
                defect_type: (data.defectType || 'other') as DefectType,
                severity: (data.severity || 'medium') as 'low' | 'medium' | 'high',
                is_active: data.isActive !== false
            } as Defect;
        },
        [fetchDefects]
    );

    const updateDefect = useCallback(
        async (id: string, patch: Partial<Pick<Defect, 'name' | 'severity' | 'defect_type' | 'is_active'>>) => {
            const settings = await fetchSystemSettings();
            const target = (settings.defectCatalog || []).find((d) => d.id === id);
            if (!target) {
                throw new Error('Defect not found');
            }

            await updateDefectSetting({
                ...target,
                name: patch.name ?? target.name,
                defectType: (patch.defect_type ?? target.defectType ?? 'other') as DefectType,
                severity: (patch.severity ?? target.severity ?? 'medium') as 'low' | 'medium' | 'high',
                isActive: patch.is_active ?? target.isActive
            });
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
