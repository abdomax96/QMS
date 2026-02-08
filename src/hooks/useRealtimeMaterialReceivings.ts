/**
 * Realtime Material Receivings Hook
 * Hook لجلب استلامات المواد مع التحديثات اللحظية
 */

import { useState, useEffect, useCallback } from 'react';
import * as labService from '../services/labService';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import type { MaterialReceiving, MaterialReceivingStatus } from '../domain/lab/types';

interface UseRealtimeMaterialReceivingsOptions {
    companyId?: string;
    filters?: {
        status?: MaterialReceivingStatus;
        materialType?: string;
    };
    enabled?: boolean;
}

interface UseRealtimeMaterialReceivingsReturn {
    data: MaterialReceiving[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Hook to fetch material receivings with realtime updates
 * يجلب استلامات المواد مع تحديثات لحظية
 */
export function useRealtimeMaterialReceivings({
    companyId,
    filters,
    enabled = true
}: UseRealtimeMaterialReceivingsOptions = {}): UseRealtimeMaterialReceivingsReturn {
    const [data, setData] = useState<MaterialReceiving[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Initial data fetch
    const fetchData = useCallback(async () => {
        if (!enabled) return;

        setIsLoading(true);
        setError(null);

        try {
            const receivings = await labService.getMaterialReceivings(companyId, filters);
            setData(receivings);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch data'));
        } finally {
            setIsLoading(false);
        }
    }, [companyId, filters?.status, filters?.materialType, enabled]);

    // Initial load
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Realtime subscription - handles INSERT, UPDATE, DELETE
    useRealtimeSubscription<MaterialReceiving>({
        table: 'material_receiving',
        filter: companyId ? `company_id=eq.${companyId}` : undefined,
        enabled,
        onInsert: (newRecord) => {
            console.log('📥 New receiving:', newRecord.id);
            // Add to the beginning of the list
            setData(prev => {
                // Avoid duplicates
                if (prev.find(r => r.id === newRecord.id)) return prev;
                return [newRecord, ...prev];
            });
        },
        onUpdate: (updatedRecord) => {
            console.log('✏️ Updated receiving:', updatedRecord.id);
            setData(prev => prev.map(r =>
                r.id === updatedRecord.id ? updatedRecord : r
            ));
        },
        onDelete: (deletedRecord) => {
            console.log('🗑️ Deleted receiving:', deletedRecord.id);
            setData(prev => prev.filter(r => r.id !== deletedRecord.id));
        }
    });

    return {
        data,
        isLoading,
        error,
        refetch: fetchData
    };
}

export default useRealtimeMaterialReceivings;
