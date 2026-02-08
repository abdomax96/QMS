/**
 * useContentSharing Hook
 * React hook for managing content sharing with real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import * as contentSharingService from '../services/contentSharingService';
import type {
    ContentShare,
    ShareWithDetails,
    ShareType,
    ContentType,
    PermissionLevel,
    SharePermissions,
} from '../services/contentSharingService';
import useStore from '../store';

export interface UseContentSharingReturn {
    myShares: ShareWithDetails[];
    sharedWithMe: ShareWithDetails[];
    loading: boolean;
    error: Error | null;

    // Share Management
    createShare: (config: CreateShareConfig) => Promise<ContentShare>;
    updateShare: (shareId: string, updates: any) => Promise<ContentShare>;
    revokeShare: (shareId: string) => Promise<void>;
    deleteShare: (shareId: string) => Promise<void>;

    // Helpers
    getContentShares: (contentType: ContentType, contentId: string) => Promise<ContentShare[]>;
    hasAccess: (contentType: ContentType, contentId: string) => Promise<ShareAccessResult>;
    getStatistics: () => Promise<ShareStatistics>;
    refreshShares: () => Promise<void>;
}

export interface CreateShareConfig {
    contentType: ContentType;
    contentId: string;
    shareType: ShareType;
    departments?: string[];
    users?: string[];
    roles?: string[];
    permissionLevel?: PermissionLevel;
    customPermissions?: SharePermissions;
    expiresAt?: string | null;
    title?: string;
    note?: string;
    notifyOnAccess?: boolean;
    notifyOnEdit?: boolean;
}

export interface ShareAccessResult {
    hasAccess: boolean;
    share?: ContentShare;
    permissions?: SharePermissions;
}

export interface ShareStatistics {
    total_shares_created: number;
    total_shares_received: number;
    active_shares: number;
    expired_shares: number;
}

/**
 * Main hook for content sharing
 */
export function useContentSharing(options: { enableRealtime?: boolean } = {}) {
    const { enableRealtime = true } = options;
    const [myShares, setMyShares] = useState<ShareWithDetails[]>([]);
    const [sharedWithMe, setSharedWithMe] = useState<ShareWithDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const user = useStore((state) => state.user);

    // Load shares
    const loadShares = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            const [created, received] = await Promise.all([
                contentSharingService.getMyShares(),
                contentSharingService.getSharedWithMe(),
            ]);

            setMyShares(created);
            setSharedWithMe(received);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Initial load
    useEffect(() => {
        loadShares();
    }, [loadShares]);

    // Real-time updates
    useEffect(() => {
        if (!enableRealtime) return;

        const unsubscribe = contentSharingService.subscribeShareChanges((payload) => {
            console.log('Share change detected:', payload);
            loadShares(); // Reload on changes
        });

        return unsubscribe;
    }, [enableRealtime, loadShares]);

    // Create share
    const createShare = useCallback(async (config: CreateShareConfig) => {
        try {
            const newShare = await contentSharingService.createShare(config);
            setMyShares(prev => [newShare as ShareWithDetails, ...prev]);
            return newShare;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    // Update share
    const updateShare = useCallback(async (shareId: string, updates: any) => {
        try {
            const updated = await contentSharingService.updateShare(shareId, updates);
            setMyShares(prev => prev.map(s => s.id === shareId ? { ...s, ...updated } as ShareWithDetails : s));
            return updated;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    // Revoke share
    const revokeShare = useCallback(async (shareId: string) => {
        try {
            await contentSharingService.revokeShare(shareId);
            setMyShares(prev => prev.filter(s => s.id !== shareId));
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    // Delete share
    const deleteShare = useCallback(async (shareId: string) => {
        try {
            await contentSharingService.deleteShare(shareId);
            setMyShares(prev => prev.filter(s => s.id !== shareId));
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    // Get content shares
    const getContentShares = useCallback(async (contentType: ContentType, contentId: string) => {
        try {
            return await contentSharingService.getContentShares(contentType, contentId);
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    // Check access
    const hasAccess = useCallback(async (contentType: ContentType, contentId: string): Promise<ShareAccessResult> => {
        try {
            return await contentSharingService.hasShareAccess(contentType, contentId);
        } catch (err) {
            return { hasAccess: false };
        }
    }, []);

    // Get statistics
    const getStatistics = useCallback(async () => {
        try {
            return await contentSharingService.getShareStatistics();
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    // Refresh shares
    const refreshShares = useCallback(async () => {
        await loadShares();
    }, [loadShares]);

    return {
        myShares,
        sharedWithMe,
        loading,
        error,
        createShare,
        updateShare,
        revokeShare,
        deleteShare,
        getContentShares,
        hasAccess,
        getStatistics,
        refreshShares,
    };
}

/**
 * Hook for specific content's shares
 */
export function useContentShares(contentType: ContentType, contentId: string) {
    const [shares, setShares] = useState<ContentShare[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const loadShares = useCallback(async () => {
        if (!contentId) {
            setShares([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await contentSharingService.getContentShares(contentType, contentId);
            setShares(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [contentType, contentId]);

    useEffect(() => {
        loadShares();
    }, [loadShares]);

    return {
        shares,
        loading,
        error,
        refresh: loadShares,
    };
}

/**
 * Hook for share activity log
 */
export function useShareActivity(shareId: string | null) {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!shareId) {
            setActivities([]);
            return;
        }

        const loadActivity = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await contentSharingService.getShareActivity(shareId);
                setActivities(data);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        loadActivity();
    }, [shareId]);

    return { activities, loading, error };
}

/**
 * Hook for checking share access to specific content
 */
export function useShareAccess(contentType: ContentType, contentId: string | null) {
    const [accessResult, setAccessResult] = useState<ShareAccessResult>({ hasAccess: false });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!contentId) {
            setAccessResult({ hasAccess: false });
            return;
        }

        const checkAccess = async () => {
            setLoading(true);
            try {
                const result = await contentSharingService.hasShareAccess(contentType, contentId);
                setAccessResult(result);
            } catch (err) {
                setAccessResult({ hasAccess: false });
            } finally {
                setLoading(false);
            }
        };

        checkAccess();
    }, [contentType, contentId]);

    return { ...accessResult, loading };
}

/**
 * Hook for batch sharing
 */
export function useBatchShare() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const batchShare = useCallback(async (
        contentType: ContentType,
        contentIds: string[],
        shareConfig: Omit<CreateShareConfig, 'contentType' | 'contentId'>
    ) => {
        setLoading(true);
        setError(null);

        try {
            const shares = await contentSharingService.batchShare(
                contentType,
                contentIds,
                shareConfig
            );
            return shares;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { batchShare, loading, error };
}
