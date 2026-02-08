/**
 * useFormCollaboration Hook
 * Hook للتعاون في الوقت الفعلي على النماذج
 * 
 * Features:
 * - Auto-connect/disconnect
 * - Active users tracking
 * - Cell change broadcasting
 * - Cursor position updates
 * - Change history
 * 
 * @author QMS Development Team
 * @date 2026-01-22
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import realtimeCollaborationService from '../services/realtimeCollaborationService';
import type {
    CellChange,
    CellChangeWithMetadata,
    CursorPosition,
    PresenceUser,
} from '../services/realtimeCollaborationService';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

// ==================== TYPES ====================

export interface UseFormCollaborationOptions {
    /** Enable/disable collaboration */
    enabled?: boolean;
    /** Show toast notifications for changes */
    showNotifications?: boolean;
    /** Throttle cursor updates (ms) */
    cursorThrottle?: number;
}

export interface UseFormCollaborationReturn {
    /** Whether collaboration is connected */
    isConnected: boolean;
    /** List of active users */
    activeUsers: PresenceUser[];
    /** Recent cell changes */
    recentChanges: CellChangeWithMetadata[];
    /** Broadcast a cell change */
    broadcastCellChange: (change: CellChange) => Promise<void>;
    /** Update cursor position */
    updateCursor: (position: CursorPosition) => Promise<void>;
    /** Get history for a specific cell */
    getCellHistory: (cell: Omit<CellChange, 'oldValue' | 'newValue'>) => Promise<any[]>;
    /** Get recent changes for the form */
    getRecentChanges: (limit?: number) => Promise<any[]>;
    /** Connection error (if any) */
    error: Error | null;
}

// ==================== HOOK ====================

/**
 * Hook للتعاون في الوقت الفعلي على النماذج
 * 
 * @example
 * ```tsx
 * const { isConnected, activeUsers, broadcastCellChange } = useFormCollaboration(instanceId);
 * 
 * // Broadcast cell change
 * await broadcastCellChange({
 *   sectionId: 'section1',
 *   tableId: 'table1',
 *   rowIndex: 0,
 *   colIndex: 0,
 *   oldValue: '10',
 *   newValue: '20'
 * });
 * ```
 */
export function useFormCollaboration(
    instanceId: string,
    options: UseFormCollaborationOptions = {}
): UseFormCollaborationReturn {
    const {
        enabled = true,
        showNotifications = true,
        cursorThrottle = 300,
    } = options;

    const { profile: user } = useAuthStore();
    const { addToast } = useToastStore();

    // State
    const [isConnected, setIsConnected] = useState(false);
    const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
    const [recentChanges, setRecentChanges] = useState<CellChangeWithMetadata[]>([]);
    const [error, setError] = useState<Error | null>(null);

    // Refs
    const cursorUpdateTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
    const initializingRef = useRef(false);

    // ========== INITIALIZATION ==========

    useEffect(() => {
        if (!enabled || !user || !instanceId || initializingRef.current) {
            return;
        }

        initializingRef.current = true;

        const initCollaboration = async () => {
            try {
                console.log('[useFormCollaboration] Initializing for instance:', instanceId);

                await realtimeCollaborationService.initialize(
                    {
                        instanceId,
                        userId: user.uid,
                        userName: user.name || user.email || 'مستخدم',
                        userAvatar: user.avatar_url,
                    },
                    {
                        onPresenceChange: (users) => {
                            console.log('[useFormCollaboration] Presence changed:', users.length, 'users');
                            setActiveUsers(users);

                            // Show notification when user joins
                            if (showNotifications && users.length > activeUsers.length) {
                                const newUser = users[users.length - 1];
                                if (newUser.user_id !== user.uid) {
                                    addToast({
                                        type: 'info',
                                        message: `${newUser.user_name} انضم إلى النموذج`,
                                        duration: 3000,
                                    });
                                }
                            }
                        },

                        onCellChange: (change) => {
                            console.log('[useFormCollaboration] Cell changed:', change);

                            // Add to recent changes
                            setRecentChanges((prev) => [change, ...prev].slice(0, 100));

                            // Show notification
                            if (showNotifications && change.changedBy !== user.uid) {
                                addToast({
                                    type: 'info',
                                    message: `${change.changedByName} قام بتعديل خلية`,
                                    duration: 2000,
                                });
                            }
                        },

                        onCursorMove: (data) => {
                            console.debug('[useFormCollaboration] Cursor moved:', data.user_name);
                            // Can be used to update cursor UI
                        },

                        onError: (err) => {
                            console.error('[useFormCollaboration] Error:', err);
                            setError(err);
                            setIsConnected(false);

                            if (showNotifications) {
                                addToast({
                                    type: 'error',
                                    message: 'خطأ في الاتصال بالتعاون الفوري',
                                    duration: 5000,
                                });
                            }
                        },
                    }
                );

                setIsConnected(true);
                setError(null);
                console.log('[useFormCollaboration] ✅ Initialized successfully');
            } catch (err) {
                console.error('[useFormCollaboration] Initialization failed:', err);
                setError(err as Error);
                setIsConnected(false);

                if (showNotifications) {
                    addToast({
                        type: 'error',
                        message: 'فشل الاتصال بالتعاون الفوري',
                        duration: 5000,
                    });
                }
            } finally {
                initializingRef.current = false;
            }
        };

        initCollaboration();

        // Cleanup on unmount
        return () => {
            console.log('[useFormCollaboration] Cleaning up...');

            // Clear cursor throttle
            if (cursorUpdateTimeout.current) {
                clearTimeout(cursorUpdateTimeout.current);
            }

            // Disconnect service
            realtimeCollaborationService.disconnect().then(() => {
                setIsConnected(false);
                setActiveUsers([]);
                console.log('[useFormCollaboration] ✅ Cleaned up');
            });
        };
    }, [instanceId, user, enabled]); // Note: not including showNotifications to prevent re-init

    // ========== BROADCAST CELL CHANGE ==========

    const broadcastCellChange = useCallback(
        async (change: CellChange): Promise<void> => {
            if (!isConnected) {
                console.warn('[useFormCollaboration] Not connected, cannot broadcast');
                return;
            }

            try {
                await realtimeCollaborationService.broadcastCellChange(change);
            } catch (err) {
                console.error('[useFormCollaboration] Broadcast failed:', err);
                setError(err as Error);

                if (showNotifications) {
                    addToast({
                        type: 'error',
                        message: 'فشل بث التعديل',
                        duration: 3000,
                    });
                }
            }
        },
        [isConnected, showNotifications, addToast]
    );

    // ========== UPDATE CURSOR ==========

    const updateCursor = useCallback(
        async (position: CursorPosition): Promise<void> => {
            if (!isConnected) {
                return; // Silent fail
            }

            // Throttle cursor updates
            if (cursorUpdateTimeout.current) {
                clearTimeout(cursorUpdateTimeout.current);
            }

            cursorUpdateTimeout.current = setTimeout(async () => {
                try {
                    await realtimeCollaborationService.updateCursorPosition(position);
                } catch (err) {
                    console.debug('[useFormCollaboration] Cursor update failed:', err);
                    // Silent fail for cursor updates
                }
            }, cursorThrottle);
        },
        [isConnected, cursorThrottle]
    );

    // ========== GET CELL HISTORY ==========

    const getCellHistory = useCallback(
        async (cell: Omit<CellChange, 'oldValue' | 'newValue'>): Promise<any[]> => {
            try {
                return await realtimeCollaborationService.getCellHistory(cell);
            } catch (err) {
                console.error('[useFormCollaboration] Get cell history failed:', err);
                setError(err as Error);
                return [];
            }
        },
        []
    );

    // ========== GET RECENT CHANGES ==========

    const getRecentChanges = useCallback(async (limit = 100): Promise<any[]> => {
        try {
            return await realtimeCollaborationService.getRecentChanges(limit);
        } catch (err) {
            console.error('[useFormCollaboration] Get recent changes failed:', err);
            setError(err as Error);
            return [];
        }
    }, []);

    // ========== RETURN ==========

    return {
        isConnected,
        activeUsers,
        recentChanges,
        broadcastCellChange,
        updateCursor,
        getCellHistory,
        getRecentChanges,
        error,
    };
}

export default useFormCollaboration;
