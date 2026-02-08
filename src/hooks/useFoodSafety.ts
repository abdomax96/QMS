/**
 * HACCP Dashboard Hook
 * هوك لإدارة بيانات HACCP
 */

import { useState, useEffect, useCallback } from 'react';
import {
    controlPointsService,
    monitoringService,
    correctiveActionsService,
    foodSafetyStatsService
} from '../services/foodSafety/foodSafetyService';
import type {
    ControlPoint,
    MonitoringRecord,
    CorrectiveActionRecord,
    FoodSafetyStats
} from '../types/foodSafety';

export function useFoodSafety() {
    const [controlPoints, setControlPoints] = useState<ControlPoint[]>([]);
    const [stats, setStats] = useState<FoodSafetyStats | null>(null);
    const [pendingActions, setPendingActions] = useState<CorrectiveActionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Subscribe to control points
        const unsubscribe = controlPointsService.subscribe((points) => {
            setControlPoints(points);
            setIsLoading(false);
        });

        // Load stats and pending actions
        loadData();

        return () => unsubscribe();
    }, []);

    const loadData = async () => {
        try {
            const [statsData, pendingData] = await Promise.all([
                foodSafetyStatsService.getStats().catch(() => null),
                correctiveActionsService.getPending().catch(() => [])
            ]);
            setStats(statsData);
            setPendingActions(pendingData);
        } catch (err) {
            // Silently handle errors - tables may not exist yet
            console.warn('Food safety data not available:', err);
        }
    };

    const addControlPoint = useCallback(async (data: Omit<ControlPoint, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            await controlPointsService.create(data);
            await loadData();
        } catch (err) {
            setError('فشل في إضافة نقطة التحكم');
            throw err;
        }
    }, []);

    const recordMonitoring = useCallback(async (data: Omit<MonitoringRecord, 'id'>) => {
        try {
            await monitoringService.create(data);
            await loadData();
        } catch (err) {
            setError('فشل في تسجيل المراقبة');
            throw err;
        }
    }, []);

    const addCorrectiveAction = useCallback(async (data: Omit<CorrectiveActionRecord, 'id'>) => {
        try {
            await correctiveActionsService.create(data);
            await loadData();
        } catch (err) {
            setError('فشل في إضافة الإجراء التصحيحي');
            throw err;
        }
    }, []);

    return {
        controlPoints,
        stats,
        pendingActions,
        isLoading,
        error,
        addControlPoint,
        recordMonitoring,
        addCorrectiveAction,
        refresh: loadData
    };
}
