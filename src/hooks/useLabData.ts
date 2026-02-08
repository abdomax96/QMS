/**
 * Lab Data Hooks - React Hooks for Lab Data
 * هوكات بيانات المختبر
 * Updated: Added Realtime subscriptions for live updates
 */

import { useState, useEffect, useCallback } from 'react';
import type { MaterialReceiving, LabTest, MaterialReceivingStatus, LabTestStatus } from '../domain/lab/types';
import * as labService from '../services/labService';
import { useRealtimeSubscription } from './useRealtimeSubscription';

// ============ Material Receivings Hook ============

interface UseMaterialReceivingsResult {
    receivings: MaterialReceiving[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    stats: {
        total: number;
        pending: number;
        accepted: number;
        rejected: number;
    };
}

export function useMaterialReceivings(
    companyId?: string,
    filters?: {
        status?: MaterialReceivingStatus;
        materialType?: string;
        supplierId?: string;
    }
): UseMaterialReceivingsResult {
    const targetCompanyId = companyId;

    const [receivings, setReceivings] = useState<MaterialReceiving[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReceivings = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Fetch all receivings - pass undefined companyId to get all records
            const data = await labService.getMaterialReceivings(targetCompanyId, filters);
            setReceivings(data);
        } catch (err) {
            setError('فشل في تحميل بيانات الاستلام');
            console.error('Error fetching receivings:', err);
        } finally {
            setIsLoading(false);
        }
    }, [targetCompanyId, filters?.status, filters?.materialType, filters?.supplierId]);

    useEffect(() => {
        fetchReceivings();

        // Refetch on page visibility change
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchReceivings();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [fetchReceivings]);

    // 🔄 Realtime Subscription - تحديثات لحظية
    useRealtimeSubscription<MaterialReceiving>({
        table: 'material_receiving',
        filter: targetCompanyId ? `company_id=eq.${targetCompanyId}` : undefined,
        enabled: !!targetCompanyId,
        onInsert: (newRecord) => {
            console.log('📥 New receiving (realtime):', newRecord);
            setReceivings(prev => {
                // Avoid duplicates
                if (prev.find(r => r.id === newRecord.id)) return prev;
                return [newRecord, ...prev];
            });
        },
        onUpdate: (updatedRecord) => {
            console.log('✏️ Updated receiving (realtime):', updatedRecord);
            setReceivings(prev => prev.map(r =>
                r.id === updatedRecord.id ? updatedRecord : r
            ));
        },
        onDelete: (deletedRecord) => {
            console.log('🗑️ Deleted receiving (realtime):', deletedRecord);
            setReceivings(prev => prev.filter(r => r.id !== deletedRecord.id));
        }
    });

    const stats = {
        total: receivings.length,
        pending: receivings.filter(r => r.status === 'pending').length,
        accepted: receivings.filter(r => r.status === 'accepted').length,
        rejected: receivings.filter(r => r.status === 'rejected').length
    };

    return { receivings, isLoading, error, refetch: fetchReceivings, stats };
}

// ============ Lab Tests Hook ============

interface UseLabTestsResult {
    tests: LabTest[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    stats: {
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
        approved: number;
    };
}

export function useLabTests(
    companyId?: string,
    filters?: {
        status?: LabTestStatus;
        testType?: string;
        priority?: string;
        assignedTo?: string;
    }
): UseLabTestsResult {
    const targetCompanyId = companyId;

    const [tests, setTests] = useState<LabTest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTests = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        if (!targetCompanyId) {
            setTests([]);
            setIsLoading(false);
            return;
        }

        try {
            const data = await labService.getLabTests(targetCompanyId, filters);
            setTests(data);
        } catch (err) {
            setError('فشل في تحميل بيانات الفحوصات');
            console.error('Error fetching tests:', err);
        } finally {
            setIsLoading(false);
        }
    }, [targetCompanyId, filters?.status, filters?.testType, filters?.priority, filters?.assignedTo]);

    useEffect(() => {
        fetchTests();

        // Refetch on page visibility change
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchTests();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [fetchTests]);

    const stats = {
        total: tests.length,
        pending: tests.filter(t => t.status === 'pending').length,
        inProgress: tests.filter(t => t.status === 'in_progress').length,
        completed: tests.filter(t => t.status === 'completed').length,
        approved: tests.filter(t => t.status === 'approved').length
    };

    return { tests, isLoading, error, refetch: fetchTests, stats };
}

// ============ Single Material Receiving Hook ============

interface UseMaterialReceivingDetailResult {
    receiving: MaterialReceiving | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useMaterialReceivingDetail(id: string | null): UseMaterialReceivingDetailResult {
    const [receiving, setReceiving] = useState<MaterialReceiving | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReceiving = useCallback(async () => {
        if (!id) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await labService.getMaterialReceivingById(id);
            setReceiving(data);
        } catch (err) {
            setError('فشل في تحميل تفاصيل الاستلام');
            console.error('Error fetching receiving detail:', err);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchReceiving();
    }, [fetchReceiving]);

    return { receiving, isLoading, error, refetch: fetchReceiving };
}

// ============ Single Lab Test Hook ============

interface UseLabTestDetailResult {
    test: LabTest | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useLabTestDetail(id: string | null): UseLabTestDetailResult {
    const [test, setTest] = useState<LabTest | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTest = useCallback(async () => {
        if (!id) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await labService.getLabTestById(id);
            setTest(data);
        } catch (err) {
            setError('فشل في تحميل تفاصيل الفحص');
            console.error('Error fetching test detail:', err);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTest();
    }, [fetchTest]);

    return { test, isLoading, error, refetch: fetchTest };
}

// ============ Dashboard Stats Hook ============

interface UseLabDashboardStatsResult {
    stats: {
        totalReceivings: number;
        pendingReceivings: number;
        pendingTests: number;
        completedTestsToday: number;
    };
    isLoading: boolean;
    refetch: () => Promise<void>;
}

export function useLabDashboardStats(companyId?: string): UseLabDashboardStatsResult {
    const targetCompanyId = companyId;

    const [stats, setStats] = useState({
        totalReceivings: 0,
        pendingReceivings: 0,
        pendingTests: 0,
        completedTestsToday: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        setIsLoading(true);

        if (!targetCompanyId) {
            setStats({
                totalReceivings: 0,
                pendingReceivings: 0,
                pendingTests: 0,
                completedTestsToday: 0
            });
            setIsLoading(false);
            return;
        }

        try {
            const data = await labService.getLabDashboardStats(targetCompanyId);
            setStats(data);
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        } finally {
            setIsLoading(false);
        }
    }, [targetCompanyId]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, isLoading, refetch: fetchStats };
}
