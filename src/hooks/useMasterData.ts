/**
 * Master Data Hooks - React Hooks for Raw Materials & Suppliers
 * هوكات البيانات الرئيسية - المواد الخام والموردين
 */

import { useState, useEffect, useCallback } from 'react';
import type { RawMaterial, Supplier } from '../domain/masterData/types';
import * as masterDataService from '../services/masterDataService';
import { useCompanyStore } from '../store/companyStore';

// ============ Raw Materials Hook ============

interface UseRawMaterialsResult {
    materials: RawMaterial[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useRawMaterials(companyId?: string): UseRawMaterialsResult {
    const { selectedCompanyId } = useCompanyStore();
    const effectiveCompanyId = companyId || selectedCompanyId || undefined;
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMaterials = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await masterDataService.getAllRawMaterials(effectiveCompanyId);
            setMaterials(data);
        } catch (err) {
            setError('فشل في تحميل المواد الخام');
            console.error('Error fetching materials:', err);
        } finally {
            setIsLoading(false);
        }
    }, [effectiveCompanyId]);

    useEffect(() => {
        let isMounted = true;

        const loadMaterials = async () => {
            if (!isMounted) return;
            await fetchMaterials();
        };

        loadMaterials();

        // Listen for global permission/data refresh events
        // This coordinates with useVisibilityRefresh hook
        const handleRefresh = () => {
            if (isMounted) {
                console.log('[useRawMaterials] Refreshing data based on global event...');
                fetchMaterials();
            }
        };

        window.addEventListener('permissions-changed', handleRefresh);

        // Also listen for visibility change as a fallback, but rely on the main refresh logic
        // if the session was idle for a long time.
        // For short idle times (tab switching), this ensures data is fresh.
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isMounted) {
                // Determine if we should refresh immediately
                // If it's a quick switch, refresh. If long idle, useVisibilityRefresh will handle it.
                // We'll let specific refresh logic handle the heavy lifting.
                // For now, consistent behavior:
                // fetchMaterials(); // REMOVED to avoid double-fetch race condition with useVisibilityRefresh
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isMounted = false;
            window.removeEventListener('permissions-changed', handleRefresh);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchMaterials]);

    return { materials, isLoading, error, refetch: fetchMaterials };
}

// ============ Suppliers Hook ============

interface UseSuppliersResult {
    suppliers: Supplier[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useSuppliers(companyId?: string): UseSuppliersResult {
    const { selectedCompanyId } = useCompanyStore();
    const effectiveCompanyId = companyId || selectedCompanyId || undefined;
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSuppliers = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await masterDataService.getAllSuppliers(effectiveCompanyId);
            setSuppliers(data);
        } catch (err) {
            setError('فشل في تحميل الموردين');
            console.error('Error fetching suppliers:', err);
        } finally {
            setIsLoading(false);
        }
    }, [effectiveCompanyId]);

    useEffect(() => {
        let isMounted = true;

        const loadSuppliers = async () => {
            if (!isMounted) return;
            await fetchSuppliers();
        };

        loadSuppliers();

        // Listen for global refresh events
        const handleRefresh = () => {
            if (isMounted) {
                console.log('[useSuppliers] Refreshing data based on global event...');
                fetchSuppliers();
            }
        };

        window.addEventListener('permissions-changed', handleRefresh);

        return () => {
            isMounted = false;
            window.removeEventListener('permissions-changed', handleRefresh);
        };
    }, [fetchSuppliers]);

    return { suppliers, isLoading, error, refetch: fetchSuppliers };
}

// ============ Combined Hook for New Material Receiving ============

interface UseMasterDataResult {
    materials: RawMaterial[];
    suppliers: Supplier[];
    isLoading: boolean;
    error: string | null;
}

export function useMasterData(companyId?: string): UseMasterDataResult {
    const { materials, isLoading: materialsLoading, error: materialsError } = useRawMaterials(companyId);
    const { suppliers, isLoading: suppliersLoading, error: suppliersError } = useSuppliers(companyId);

    return {
        materials,
        suppliers,
        isLoading: materialsLoading || suppliersLoading,
        error: materialsError || suppliersError
    };
}
