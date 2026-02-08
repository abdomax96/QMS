/**
 * useMaterialRelations Hook
 * Hook for managing raw material relationships (suppliers & tests)
 * هوك لإدارة علاقات المواد الخام (الموردين والفحوصات)
 */

import { useState, useCallback, useEffect } from 'react';
import type { Supplier, RawMaterialTest, ApprovalStatus } from '../domain/masterData/types';
import type { TestRequirementSnapshot, SupplierApprovalSnapshot } from '../domain/lab/types';
import {
    getApprovedSuppliersForMaterial,
    getRequiredTestsForMaterial,
    validateSupplierForMaterial,
    createTestRequirementsSnapshot,
    createSupplierApprovalSnapshot
} from '../services/masterDataService';
import { useCompanyStore } from '../store/companyStore';

interface ApprovedSupplier extends Supplier {
    isPrimary: boolean;
    approvalStatus: ApprovalStatus;
}

interface UseMaterialRelationsResult {
    // State
    approvedSuppliers: ApprovedSupplier[];
    requiredTests: RawMaterialTest[];
    isLoading: boolean;
    error: string | null;

    // Actions
    loadSuppliersForMaterial: (rawMaterialId: string, companyId?: string) => Promise<void>;
    loadTestsForMaterial: (rawMaterialId: string, companyId?: string) => Promise<void>;
    validateSupplier: (rawMaterialId: string, supplierId: string, companyId?: string) => Promise<boolean>;

    // Snapshot helpers
    getTestSnapshot: (rawMaterialId: string, companyId?: string) => Promise<TestRequirementSnapshot[]>;
    getSupplierSnapshot: (supplierId: string, supplierName: string, rawMaterialId: string, companyId?: string) => Promise<SupplierApprovalSnapshot>;

    // Derived state
    getPrimarySupplier: () => ApprovedSupplier | undefined;
    hasRequiredTests: () => boolean;
}

export function useMaterialRelations(): UseMaterialRelationsResult {
    const { selectedCompanyId: storeCompanyId } = useCompanyStore();
    const [approvedSuppliers, setApprovedSuppliers] = useState<ApprovedSupplier[]>([]);
    const [requiredTests, setRequiredTests] = useState<RawMaterialTest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadSuppliersForMaterial = useCallback(async (
        rawMaterialId: string,
        companyId?: string
    ) => {
        const effectiveCompanyId = companyId || storeCompanyId || undefined;
        setIsLoading(true);
        setError(null);

        try {
            const suppliers = await getApprovedSuppliersForMaterial(rawMaterialId, effectiveCompanyId);
            setApprovedSuppliers(suppliers);
        } catch (err) {
            setError('فشل في جلب الموردين المعتمدين');
            console.error('Error loading suppliers:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadTestsForMaterial = useCallback(async (
        rawMaterialId: string,
        companyId?: string
    ) => {
        const effectiveCompanyId = companyId || storeCompanyId || undefined;
        setIsLoading(true);
        setError(null);

        try {
            const tests = await getRequiredTestsForMaterial(rawMaterialId, effectiveCompanyId);
            setRequiredTests(tests);
        } catch (err) {
            setError('فشل في جلب الفحوصات المطلوبة');
            console.error('Error loading tests:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const validateSupplier = useCallback(async (
        rawMaterialId: string,
        supplierId: string,
        companyId?: string
    ): Promise<boolean> => {
        const effectiveCompanyId = companyId || storeCompanyId || undefined;
        try {
            return await validateSupplierForMaterial(rawMaterialId, supplierId, effectiveCompanyId);
        } catch (err) {
            console.error('Error validating supplier:', err);
            return false;
        }
    }, []);

    const getTestSnapshot = useCallback(async (
        rawMaterialId: string,
        companyId?: string
    ): Promise<TestRequirementSnapshot[]> => {
        const effectiveCompanyId = companyId || storeCompanyId || undefined;
        try {
            return await createTestRequirementsSnapshot(rawMaterialId, effectiveCompanyId);
        } catch (err) {
            console.error('Error creating test snapshot:', err);
            return [];
        }
    }, []);

    const getSupplierSnapshot = useCallback(async (
        supplierId: string,
        supplierName: string,
        rawMaterialId: string,
        companyId?: string
    ): Promise<SupplierApprovalSnapshot> => {
        const effectiveCompanyId = companyId || storeCompanyId || undefined;
        try {
            return await createSupplierApprovalSnapshot(supplierId, supplierName, rawMaterialId, effectiveCompanyId);
        } catch (err) {
            console.error('Error creating supplier snapshot:', err);
            return {
                supplierId,
                supplierName,
                approvalStatus: 'unknown',
                capturedAt: new Date().toISOString()
            };
        }
    }, []);

    const getPrimarySupplier = useCallback(() => {
        return approvedSuppliers.find(s => s.isPrimary);
    }, [approvedSuppliers]);

    const hasRequiredTests = useCallback(() => {
        return requiredTests.some(t => t.required);
    }, [requiredTests]);

    return {
        approvedSuppliers,
        requiredTests,
        isLoading,
        error,
        loadSuppliersForMaterial,
        loadTestsForMaterial,
        validateSupplier,
        getTestSnapshot,
        getSupplierSnapshot,
        getPrimarySupplier,
        hasRequiredTests
    };
}

/**
 * Hook for auto-loading relations when material changes
 */
export function useMaterialRelationsAutoLoad(
    rawMaterialId: string | null | undefined,
    companyId?: string
) {
    const relations = useMaterialRelations();

    useEffect(() => {
        if (rawMaterialId) {
            relations.loadSuppliersForMaterial(rawMaterialId, companyId);
            relations.loadTestsForMaterial(rawMaterialId, companyId);
        }
    }, [rawMaterialId, companyId]);

    return relations;
}

export default useMaterialRelations;
