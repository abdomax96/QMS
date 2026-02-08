/**
 * useReportWorkflow Hook
 * React hook for report workflow state management
 * 
 * Created: 2026-01-06
 */

import { useState, useCallback, useEffect } from 'react';
import { reportWorkflowService } from '../services/reportWorkflowService';
import type { TransitionResult, ReviewQueueItem, ReportWorkflowStats } from '../services/reportWorkflowService';
import type { FormInstance, ReportStatus, ReportReviewHistoryEntry } from '../types';

interface UseReportWorkflowOptions {
    reportId?: string;
    departmentId?: string;
    autoLoad?: boolean;
}

interface UseReportWorkflowReturn {
    // State
    isLoading: boolean;
    error: string | null;

    // Review Queue
    reviewQueue: ReviewQueueItem[];
    activeReviews: ReviewQueueItem[];
    stats: ReportWorkflowStats | null;

    // History
    history: ReportReviewHistoryEntry[];

    // Actions
    submitReport: (reportId: string) => Promise<TransitionResult>;
    claimReport: (reportId: string) => Promise<TransitionResult>;
    approveReport: (reportId: string, notes?: string) => Promise<TransitionResult>;
    rejectReport: (reportId: string, reason: string) => Promise<TransitionResult>;
    resubmitReport: (reportId: string) => Promise<TransitionResult>;
    reopenReport: (reportId: string, reason: string) => Promise<TransitionResult>;
    archiveReport: (reportId: string) => Promise<TransitionResult>;

    // Loaders
    loadReviewQueue: () => Promise<void>;
    loadActiveReviews: () => Promise<void>;
    loadHistory: (reportId: string) => Promise<void>;
    loadStats: () => Promise<void>;

    // Utilities
    isEditable: (report: FormInstance) => boolean;
    getAllowedActions: (report: FormInstance) => string[];
    getStatusDisplay: (status: ReportStatus) => { label: string; labelAr: string; color: string; icon: string };
}

export function useReportWorkflow(options: UseReportWorkflowOptions = {}): UseReportWorkflowReturn {
    const { reportId, departmentId, autoLoad = false } = options;

    // State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
    const [activeReviews, setActiveReviews] = useState<ReviewQueueItem[]>([]);
    const [history, setHistory] = useState<ReportReviewHistoryEntry[]>([]);
    const [stats, setStats] = useState<ReportWorkflowStats | null>(null);

    // Clear error on success
    const handleResult = useCallback((result: TransitionResult): TransitionResult => {
        if (result.success) {
            setError(null);
        } else {
            setError(result.error || 'An error occurred');
        }
        return result;
    }, []);

    // Actions
    const submitReport = useCallback(async (id: string): Promise<TransitionResult> => {
        setIsLoading(true);
        try {
            const result = await reportWorkflowService.submitReport(id);
            return handleResult(result);
        } finally {
            setIsLoading(false);
        }
    }, [handleResult]);

    const claimReport = useCallback(async (id: string): Promise<TransitionResult> => {
        setIsLoading(true);
        try {
            const result = await reportWorkflowService.claimReport(id);
            return handleResult(result);
        } finally {
            setIsLoading(false);
        }
    }, [handleResult]);

    const approveReport = useCallback(async (id: string, notes?: string): Promise<TransitionResult> => {
        setIsLoading(true);
        try {
            const result = await reportWorkflowService.approveReport(id, notes);
            return handleResult(result);
        } finally {
            setIsLoading(false);
        }
    }, [handleResult]);

    const rejectReport = useCallback(async (id: string, reason: string): Promise<TransitionResult> => {
        setIsLoading(true);
        try {
            const result = await reportWorkflowService.rejectReport(id, reason);
            return handleResult(result);
        } finally {
            setIsLoading(false);
        }
    }, [handleResult]);

    const resubmitReport = useCallback(async (id: string): Promise<TransitionResult> => {
        setIsLoading(true);
        try {
            const result = await reportWorkflowService.resubmitReport(id);
            return handleResult(result);
        } finally {
            setIsLoading(false);
        }
    }, [handleResult]);

    const reopenReport = useCallback(async (id: string, reason: string): Promise<TransitionResult> => {
        setIsLoading(true);
        try {
            const result = await reportWorkflowService.reopenReport(id, reason);
            return handleResult(result);
        } finally {
            setIsLoading(false);
        }
    }, [handleResult]);

    const archiveReport = useCallback(async (id: string): Promise<TransitionResult> => {
        setIsLoading(true);
        try {
            const result = await reportWorkflowService.archiveReport(id);
            return handleResult(result);
        } finally {
            setIsLoading(false);
        }
    }, [handleResult]);

    // Loaders
    const loadReviewQueue = useCallback(async (): Promise<void> => {
        setIsLoading(true);
        try {
            const queue = await reportWorkflowService.getReviewQueue(departmentId);
            setReviewQueue(queue);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load review queue');
        } finally {
            setIsLoading(false);
        }
    }, [departmentId]);

    const loadActiveReviews = useCallback(async (): Promise<void> => {
        setIsLoading(true);
        try {
            const reviews = await reportWorkflowService.getMyActiveReviews();
            setActiveReviews(reviews);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load active reviews');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadHistory = useCallback(async (id: string): Promise<void> => {
        setIsLoading(true);
        try {
            const historyData = await reportWorkflowService.getReportHistory(id);
            setHistory(historyData);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load history');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadStats = useCallback(async (): Promise<void> => {
        try {
            const statsData = await reportWorkflowService.getWorkflowStats(departmentId);
            setStats(statsData);
        } catch (err: any) {
            console.error('Failed to load stats:', err);
        }
    }, [departmentId]);

    // Auto-load on mount
    useEffect(() => {
        if (autoLoad) {
            loadReviewQueue();
            loadActiveReviews();
            loadStats();
        }
    }, [autoLoad, loadReviewQueue, loadActiveReviews, loadStats]);

    // Load history when reportId changes
    useEffect(() => {
        if (reportId) {
            loadHistory(reportId);
        }
    }, [reportId, loadHistory]);

    return {
        // State
        isLoading,
        error,

        // Data
        reviewQueue,
        activeReviews,
        stats,
        history,

        // Actions
        submitReport,
        claimReport,
        approveReport,
        rejectReport,
        resubmitReport,
        reopenReport,
        archiveReport,

        // Loaders
        loadReviewQueue,
        loadActiveReviews,
        loadHistory,
        loadStats,

        // Utilities
        isEditable: reportWorkflowService.isEditable,
        getAllowedActions: reportWorkflowService.getAllowedActions,
        getStatusDisplay: reportWorkflowService.getStatusDisplay
    };
}

export default useReportWorkflow;
