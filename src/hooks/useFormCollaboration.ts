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
    InstancePatch,
    InstancePatchWithMetadata,
    PatchResult,
    PresenceUser,
} from '../services/realtimeCollaborationService';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import collaborationTelemetryService from '../services/collaborationTelemetryService';

const PATCH_RPC_CACHE_KEY = 'qms_collab_patch_rpc_state_v1';
const PATCH_RPC_MISSING_TTL_MS = 1000 * 60 * 60 * 12;

function readPatchRpcAvailabilityFromCache(): boolean | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(PATCH_RPC_CACHE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as {
            available?: boolean;
            checkedAt?: number;
        };

        if (typeof parsed?.available !== 'boolean' || typeof parsed?.checkedAt !== 'number') {
            return null;
        }

        const ageMs = Date.now() - parsed.checkedAt;
        if (!parsed.available && ageMs > PATCH_RPC_MISSING_TTL_MS) {
            return null;
        }

        return parsed.available;
    } catch {
        return null;
    }
}

function writePatchRpcAvailabilityToCache(available: boolean): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(
            PATCH_RPC_CACHE_KEY,
            JSON.stringify({
                available,
                checkedAt: Date.now(),
            })
        );
    } catch {
        // Ignore storage write failures.
    }
}

function isMissingPatchRpcError(error: any): boolean {
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    const details = String(error?.details || '');

    if (code === 'PGRST202') {
        return true;
    }

    if (message.includes('Could not find the function')) {
        return true;
    }

    return details.includes('apply_form_instance_patch');
}

// ==================== TYPES ====================

export interface UseFormCollaborationOptions {
    /** Enable/disable collaboration */
    enabled?: boolean;
    /** Show toast notifications for changes */
    showNotifications?: boolean;
    /** Throttle cursor updates (ms) */
    cursorThrottle?: number;
    /** Reconnect base delay (ms) */
    reconnectBaseDelayMs?: number;
    /** Reconnect max delay (ms) */
    reconnectMaxDelayMs?: number;
}

export type CollaborationConnectionStatus =
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'offline';

export interface UseFormCollaborationReturn {
    /** Whether collaboration is connected */
    isConnected: boolean;
    /** Detailed connection status */
    connectionStatus: CollaborationConnectionStatus;
    /** Reconnect attempts count */
    reconnectAttempt: number;
    /** List of active users */
    activeUsers: PresenceUser[];
    /** Recent cell changes */
    recentChanges: CellChangeWithMetadata[];
    /** Recent non-cell report patches */
    recentPatches: InstancePatchWithMetadata[];
    /** Broadcast a cell change */
    broadcastCellChange: (change: CellChange) => Promise<PatchResult>;
    /** Apply and broadcast non-cell patch */
    applyAndBroadcastPatch: (patch: InstancePatch) => Promise<PatchResult>;
    /** Update cursor position */
    updateCursor: (position: CursorPosition) => Promise<void>;
    /** Get history for a specific cell */
    getCellHistory: (cell: Omit<CellChange, 'oldValue' | 'newValue'>) => Promise<any[]>;
    /** Apply partial update patch with optimistic conflict handling */
    applyInstancePatch: (patch: InstancePatch) => Promise<PatchResult>;
    /** Get recent changes for the form */
    getRecentChanges: (limit?: number) => Promise<any[]>;
    /** Get full report-level immutable change log */
    getInstanceChangeLog: (limit?: number, offset?: number) => Promise<any[]>;
    /** Trigger immediate reconnect */
    reconnectNow: () => void;
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
        reconnectBaseDelayMs = 1200,
        reconnectMaxDelayMs = 30000,
    } = options;

    const user = useAuthStore((state) => state.profile);
    const authSession = useAuthStore((state) => state.session);
    const { addToast } = useToastStore();
    const userId = user?.uid || authSession?.user?.id || '';
    const userName = user?.name || user?.email || authSession?.user?.email || 'مستخدم';
    const userAvatar = user?.avatar_url;

    // State
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<CollaborationConnectionStatus>('offline');
    const [reconnectAttempt, setReconnectAttempt] = useState(0);
    const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
    const [recentChanges, setRecentChanges] = useState<CellChangeWithMetadata[]>([]);
    const [recentPatches, setRecentPatches] = useState<InstancePatchWithMetadata[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const [connectCycle, setConnectCycle] = useState(0);

    // Refs
    const cursorUpdateTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
    const initializingRef = useRef(false);
    const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
    const pendingInitCycleRef = useRef(false);
    const lastConnectionToastAtRef = useRef(0);

    const notifyConnectionIssue = useCallback(
        (message: string) => {
            if (!showNotifications) {
                return;
            }

            const now = Date.now();
            if (now - lastConnectionToastAtRef.current < 6000) {
                return;
            }

            lastConnectionToastAtRef.current = now;
            addToast({
                type: 'error',
                message,
                duration: 5000,
            });
        },
        [addToast, showNotifications]
    );

    const isRealtimeConnectionError = useCallback((err: unknown): boolean => {
        const message = String(
            err instanceof Error ? err.message : err ?? ''
        ).toLowerCase();

        if (!message) {
            return false;
        }

        return [
            'not initialized',
            'not connected',
            'channel',
            'socket',
            'websocket',
            'timed out',
            'timeout',
            'failed to fetch',
            'network',
            'connection',
            'closed',
        ].some((token) => message.includes(token));
    }, []);

    const scheduleReconnect = useCallback(
        (reason: string, err?: unknown) => {
            if (!enabled || !userId || !instanceId || reconnectTimeout.current) {
                return;
            }

            const nextAttempt = reconnectAttempt + 1;
            const delay = Math.min(
                reconnectMaxDelayMs,
                reconnectBaseDelayMs * Math.pow(2, Math.min(nextAttempt - 1, 6))
            );

            setConnectionStatus('reconnecting');
            setReconnectAttempt(nextAttempt);

            collaborationTelemetryService.log({
                level: 'warn',
                event: 'reconnect_scheduled',
                message: `Scheduling reconnect in ${delay}ms due to ${reason}`,
                instanceId,
                userId,
                details: {
                    attempt: nextAttempt,
                    delayMs: delay,
                    reason,
                    error: err instanceof Error ? err.message : String(err || ''),
                },
            });

            reconnectTimeout.current = setTimeout(() => {
                reconnectTimeout.current = undefined;
                setConnectCycle((value) => value + 1);
            }, delay);
        },
        [
            enabled,
            instanceId,
            reconnectAttempt,
            reconnectBaseDelayMs,
            reconnectMaxDelayMs,
            userId,
        ]
    );

    const reconnectNow = useCallback(() => {
        if (!enabled || !userId || !instanceId) {
            return;
        }

        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = undefined;
        }

        collaborationTelemetryService.log({
            level: 'info',
            event: 'manual_reconnect',
            message: 'Manual reconnect requested by user',
            instanceId,
            userId,
        });

        setConnectionStatus('reconnecting');
        setReconnectAttempt((value) => value + 1);
        setConnectCycle((value) => value + 1);
    }, [enabled, instanceId, userId]);

    const applyPatchDirectViaRpc = useCallback(
        async (patch: InstancePatch): Promise<PatchResult> => {
            const cachedPatchRpcAvailability = readPatchRpcAvailabilityFromCache();
            if (cachedPatchRpcAvailability === false) {
                return {
                    success: false,
                    conflict: false,
                    message: 'PATCH_RPC_MISSING',
                };
            }

            const { supabase } = await import('../config/supabase');
            const toJsonb = (value: any) => (value === undefined ? null : value);

            const { data, error } = await supabase.rpc('apply_form_instance_patch', {
                p_instance_id: instanceId,
                p_expected_version: patch.expectedVersion ?? null,
                p_change_scope: patch.changeScope,
                p_change_path: patch.changePath,
                p_new_value: toJsonb(patch.newValue),
                p_old_value: toJsonb(patch.oldValue),
                p_section_id: patch.sectionId ?? null,
                p_table_id: patch.tableId ?? null,
                p_row_index: patch.rowIndex ?? null,
                p_col_index: patch.colIndex ?? null,
                p_client_id: patch.clientId ?? null,
                p_source: patch.source ?? 'editor',
            });

            if (error) {
                if (isMissingPatchRpcError(error)) {
                    writePatchRpcAvailabilityToCache(false);
                    return {
                        success: false,
                        conflict: false,
                        message: 'PATCH_RPC_MISSING',
                    };
                }

                const normalizedMessage = String(error.message || '');
                if (normalizedMessage.includes('REPORT_NOT_EDITABLE')) {
                    return {
                        success: false,
                        conflict: false,
                        message: 'REPORT_NOT_EDITABLE',
                    };
                }
                if (normalizedMessage.includes('PERMISSION_DENIED')) {
                    return {
                        success: false,
                        conflict: false,
                        message: 'PERMISSION_DENIED',
                    };
                }
                if (normalizedMessage.includes('NOT_FOUND')) {
                    return {
                        success: false,
                        conflict: false,
                        message: 'NOT_FOUND',
                    };
                }

                throw error;
            }

            writePatchRpcAvailabilityToCache(true);

            return (data || {
                success: false,
                conflict: false,
                message: 'UNKNOWN_RESPONSE',
            }) as PatchResult;
        },
        [instanceId]
    );

    // ========== INITIALIZATION ==========

    useEffect(() => {
        if (!enabled || !userId || !instanceId) {
            return;
        }

        if (initializingRef.current) {
            pendingInitCycleRef.current = true;
            return;
        }

        let isEffectActive = true;
        initializingRef.current = true;
        setConnectionStatus(reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

        const initCollaboration = async () => {
            try {
                console.log('[useFormCollaboration] Initializing for instance:', instanceId);

                await realtimeCollaborationService.initialize(
                    {
                        instanceId,
                        userId,
                        userName,
                        userAvatar,
                    },
                    {
                        onPresenceChange: (users) => {
                            console.log('[useFormCollaboration] Presence changed:', users.length, 'users');
                            setActiveUsers((previous) => {
                                if (showNotifications && users.length > previous.length) {
                                    const joinedUser = users.find(
                                        (candidate) =>
                                            !previous.some((prevUser) => prevUser.user_id === candidate.user_id)
                                    );
                                    if (joinedUser && joinedUser.user_id !== userId) {
                                        addToast({
                                            type: 'info',
                                            message: `${joinedUser.user_name} انضم إلى النموذج`,
                                            duration: 3000,
                                        });
                                    }
                                }

                                return users;
                            });
                        },

                        onCellChange: (change) => {
                            console.log('[useFormCollaboration] Cell changed:', change);

                            // Add to recent changes
                            setRecentChanges((prev) => [change, ...prev].slice(0, 100));

                            // Show notification
                            if (showNotifications && change.changedBy !== userId) {
                                addToast({
                                    type: 'info',
                                    message: `${change.changedByName} قام بتعديل خلية`,
                                    duration: 2000,
                                });
                            }
                        },

                        onInstancePatch: (patch) => {
                            console.log('[useFormCollaboration] Instance patch received:', patch.changeScope);

                            setRecentPatches((prev) => [patch, ...prev].slice(0, 100));

                            if (showNotifications && patch.changedBy !== userId) {
                                addToast({
                                    type: 'info',
                                    message: `${patch.changedByName} قام بتحديث التقرير`,
                                    duration: 2000,
                                });
                            }
                        },

                        onCursorMove: (data) => {
                            console.debug('[useFormCollaboration] Cursor moved:', data.user_name);
                            // Can be used to update cursor UI
                        },

                        onError: (err) => {
                            if (!isEffectActive) {
                                return;
                            }

                            console.error('[useFormCollaboration] Error:', err);
                            setError(err);
                            setIsConnected(false);
                            setConnectionStatus('offline');

                            notifyConnectionIssue(
                                'خطأ في الاتصال بالتعاون الفوري، تتم إعادة المحاولة تلقائيًا'
                            );

                            collaborationTelemetryService.log({
                                level: 'error',
                                event: 'channel_error',
                                message: 'Realtime channel reported an error',
                                instanceId,
                                userId,
                                details: { error: err.message },
                            });
                            scheduleReconnect('channel_error', err);
                        },
                    }
                );

                if (!isEffectActive) {
                    return;
                }

                setIsConnected(true);
                setError(null);
                setConnectionStatus('connected');
                if (reconnectAttempt > 0) {
                    collaborationTelemetryService.log({
                        level: 'info',
                        event: 'reconnected',
                        message: 'Realtime collaboration reconnected',
                        instanceId,
                        userId,
                        details: { attempts: reconnectAttempt },
                    });
                }
                setReconnectAttempt(0);
                if (reconnectTimeout.current) {
                    clearTimeout(reconnectTimeout.current);
                    reconnectTimeout.current = undefined;
                }

                console.log('[useFormCollaboration] ✅ Initialized successfully');
            } catch (err) {
                if (!isEffectActive) {
                    return;
                }

                console.error('[useFormCollaboration] Initialization failed:', err);
                setError(err as Error);
                setIsConnected(false);
                setConnectionStatus('offline');

                notifyConnectionIssue('فشل الاتصال بالتعاون الفوري، تتم إعادة المحاولة تلقائيًا');

                collaborationTelemetryService.log({
                    level: 'error',
                    event: 'init_failed',
                    message: 'Failed to initialize collaboration',
                    instanceId,
                    userId,
                    details: {
                        error: err instanceof Error ? err.message : String(err),
                    },
                });
                scheduleReconnect('init_failed', err);
            } finally {
                initializingRef.current = false;
                if (pendingInitCycleRef.current) {
                    pendingInitCycleRef.current = false;
                    setConnectCycle((value) => value + 1);
                }
            }
        };

        initCollaboration();

        // Cleanup on unmount / dependency change
        return () => {
            isEffectActive = false;
            console.log('[useFormCollaboration] Cleaning up...');

            // Clear cursor throttle
            if (cursorUpdateTimeout.current) {
                clearTimeout(cursorUpdateTimeout.current);
            }
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = undefined;
            }
            pendingInitCycleRef.current = false;

            // Set local state immediately to avoid stale async cleanup races.
            setIsConnected(false);
            setConnectionStatus('offline');
            setActiveUsers([]);

            // Disconnect service (no async state updates here).
            void realtimeCollaborationService
                .disconnect()
                .then(() => {
                    console.log('[useFormCollaboration] ✅ Cleaned up');
                })
                .catch((disconnectError) => {
                    console.debug('[useFormCollaboration] Cleanup disconnect ignored:', disconnectError);
                });
        };
    }, [connectCycle, enabled, instanceId, notifyConnectionIssue, userAvatar, userId, userName]); // keep init stable to avoid reconnect thrashing

    // ========== OFFLINE WATCHDOG ==========

    useEffect(() => {
        if (!enabled || !userId || !instanceId) {
            return;
        }

        // Connected or already trying to connect.
        if (
            isConnected ||
            connectionStatus === 'connecting' ||
            connectionStatus === 'reconnecting' ||
            initializingRef.current
        ) {
            return;
        }

        // Reconnect is already scheduled.
        if (reconnectTimeout.current) {
            return;
        }

        const watchdogTimeout = setTimeout(() => {
            if (
                !enabled ||
                !userId ||
                !instanceId ||
                isConnected ||
                initializingRef.current ||
                reconnectTimeout.current
            ) {
                return;
            }

            collaborationTelemetryService.log({
                level: 'warn',
                event: 'reconnect_scheduled',
                message: 'Offline watchdog triggered automatic reconnect',
                instanceId,
                userId,
                details: {
                    reason: 'offline_watchdog',
                },
            });

            scheduleReconnect('offline_watchdog');
        }, 2000);

        return () => {
            clearTimeout(watchdogTimeout);
        };
    }, [
        connectionStatus,
        enabled,
        instanceId,
        isConnected,
        scheduleReconnect,
        userId,
    ]);

    // Trigger reconnect automatically when browser regains connectivity.
    useEffect(() => {
        if (!enabled || !userId || !instanceId) {
            return;
        }

        const handleOnline = () => {
            reconnectNow();
        };

        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }, [enabled, instanceId, reconnectNow, userId]);

    // ========== BROADCAST CELL CHANGE ==========

    const isRealtimeReady = useCallback((): boolean => {
        if (!enabled || !userId || !instanceId) {
            return false;
        }

        if (initializingRef.current) {
            return false;
        }

        if (connectionStatus !== 'connected' || !isConnected) {
            return false;
        }

        return realtimeCollaborationService.isConnected();
    }, [connectionStatus, enabled, instanceId, isConnected, userId]);

    const broadcastCellChange = useCallback(
        async (change: CellChange): Promise<PatchResult> => {
            const applyRpcFallback = async (): Promise<PatchResult> => {
                try {
                    const fallbackResult = await applyPatchDirectViaRpc({
                        changeScope: 'cell',
                        changePath: [
                            'sections',
                            change.sectionId,
                            'tables',
                            change.tableId,
                            'data',
                            String(change.rowIndex),
                            String(change.colIndex),
                        ],
                        newValue: change.newValue,
                        oldValue: change.oldValue,
                        sectionId: change.sectionId,
                        tableId: change.tableId,
                        rowIndex: change.rowIndex,
                        colIndex: change.colIndex,
                        source: 'editor',
                    });

                    if (fallbackResult.success) {
                        setRecentChanges((prev) => [
                            {
                                ...change,
                                changedBy: user?.uid || '',
                                changedByName: user?.name || user?.email || 'مستخدم',
                                changedAt: fallbackResult.changedAt || new Date().toISOString(),
                                version: fallbackResult.newVersion || 0,
                            },
                            ...prev,
                        ].slice(0, 100));
                    }

                    return fallbackResult;
                } catch (offlineErr) {
                    console.warn('[useFormCollaboration] Offline RPC patch failed:', offlineErr);
                    return {
                        success: false,
                        conflict: false,
                        message: 'NOT_CONNECTED',
                    };
                }
            };

            if (!isRealtimeReady()) {
                if (
                    enabled &&
                    userId &&
                    instanceId &&
                    connectionStatus === 'offline' &&
                    !initializingRef.current &&
                    !reconnectTimeout.current
                ) {
                    reconnectNow();
                }

                return applyRpcFallback();
            }

            try {
                const result = await realtimeCollaborationService.broadcastCellChange(change);
                if (result.success) {
                    setRecentChanges((prev) => [
                        {
                            ...change,
                            changedBy: user?.uid || '',
                            changedByName: user?.name || user?.email || 'مستخدم',
                            changedAt: result.changedAt || new Date().toISOString(),
                            version: result.newVersion || 0,
                        },
                        ...prev,
                    ].slice(0, 100));
                } else if (result.message === 'PATCH_RPC_MISSING') {
                    return result;
                } else if (result.conflict && showNotifications) {
                    addToast({
                        type: 'warning',
                        message: 'حدث تعارض تعديل. تعذر حفظ التغيير الحالي، حاول مرة أخرى.',
                        duration: 3500,
                    });
                    collaborationTelemetryService.log({
                        level: 'warn',
                        event: 'conflict_detected',
                        message: 'Cell change conflict detected',
                        instanceId,
                        userId: user?.uid,
                        details: {
                            sectionId: change.sectionId,
                            tableId: change.tableId,
                            rowIndex: change.rowIndex,
                            colIndex: change.colIndex,
                            currentVersion: result.currentVersion,
                            expectedVersion: result.expectedVersion,
                        },
                    });
                } else if (showNotifications) {
                    addToast({
                        type: 'error',
                        message: 'فشل حفظ التعديل',
                        duration: 3000,
                    });
                    collaborationTelemetryService.log({
                        level: 'error',
                        event: 'broadcast_failed',
                        message: 'Cell change broadcast failed',
                        instanceId,
                        userId: user?.uid,
                        details: {
                            sectionId: change.sectionId,
                            tableId: change.tableId,
                            rowIndex: change.rowIndex,
                            colIndex: change.colIndex,
                            resultMessage: result.message,
                        },
                    });
                }

                return result;
            } catch (err) {
                const shouldReconnect = isRealtimeConnectionError(err);
                if (shouldReconnect) {
                    console.debug('[useFormCollaboration] Realtime broadcast unavailable, using RPC fallback:', err);
                } else {
                    console.error('[useFormCollaboration] Broadcast failed:', err);
                }

                if (shouldReconnect) {
                    setError(err as Error);
                    reconnectNow();
                    notifyConnectionIssue(
                        'خطأ في الاتصال بالتعاون الفوري، تتم إعادة المحاولة تلقائيًا'
                    );
                }

                const fallbackResult = await applyRpcFallback();
                if (fallbackResult.success) {
                    return fallbackResult;
                }

                if (fallbackResult.message === 'PATCH_RPC_MISSING') {
                    return fallbackResult;
                }

                if (showNotifications) {
                    addToast({
                        type: 'error',
                        message: 'فشل بث التعديل',
                        duration: 3000,
                    });
                }

                collaborationTelemetryService.log({
                    level: 'error',
                    event: 'broadcast_failed',
                    message: 'Exception while broadcasting cell change',
                    instanceId,
                    userId: user?.uid,
                    details: {
                        sectionId: change.sectionId,
                        tableId: change.tableId,
                        rowIndex: change.rowIndex,
                        colIndex: change.colIndex,
                        error: err instanceof Error ? err.message : String(err),
                    },
                });

                throw err;
            }
        },
        [
            addToast,
            applyPatchDirectViaRpc,
            connectionStatus,
            enabled,
            instanceId,
            isRealtimeReady,
            isRealtimeConnectionError,
            notifyConnectionIssue,
            reconnectNow,
            showNotifications,
            user,
            userId,
        ]
    );

    // ========== APPLY & BROADCAST PATCH ==========

    const applyAndBroadcastPatch = useCallback(
        async (patch: InstancePatch): Promise<PatchResult> => {
            const applyRpcFallback = async (): Promise<PatchResult> => {
                try {
                    const fallbackResult = await applyPatchDirectViaRpc(patch);
                    if (fallbackResult.success && patch.changeScope !== 'cell') {
                        setRecentPatches((prev) => [
                            {
                                ...patch,
                                changedBy: user?.uid || '',
                                changedByName: user?.name || user?.email || 'مستخدم',
                                changedAt: fallbackResult.changedAt || new Date().toISOString(),
                                newVersion: fallbackResult.newVersion,
                            },
                            ...prev,
                        ].slice(0, 100));
                    }
                    return fallbackResult;
                } catch (offlineErr) {
                    console.warn('[useFormCollaboration] Offline RPC non-cell patch failed:', offlineErr);
                    return {
                        success: false,
                        conflict: false,
                        message: 'NOT_CONNECTED',
                    };
                }
            };

            if (!isRealtimeReady()) {
                if (
                    enabled &&
                    userId &&
                    instanceId &&
                    connectionStatus === 'offline' &&
                    !initializingRef.current &&
                    !reconnectTimeout.current
                ) {
                    reconnectNow();
                }

                return applyRpcFallback();
            }

            try {
                const result = await realtimeCollaborationService.applyAndBroadcastPatch(patch);
                if (result.success) {
                    if (patch.changeScope !== 'cell') {
                        setRecentPatches((prev) => [
                            {
                                ...patch,
                                changedBy: user?.uid || '',
                                changedByName: user?.name || user?.email || 'مستخدم',
                                changedAt: result.changedAt || new Date().toISOString(),
                                newVersion: result.newVersion,
                            },
                            ...prev,
                        ].slice(0, 100));
                    }
                } else if (result.message !== 'PATCH_RPC_MISSING') {
                    collaborationTelemetryService.log({
                        level: result.conflict ? 'warn' : 'error',
                        event: result.conflict ? 'conflict_detected' : 'broadcast_failed',
                        message: 'Non-cell patch failed',
                        instanceId,
                        userId: user?.uid,
                        details: {
                            changeScope: patch.changeScope,
                            changePath: patch.changePath,
                            resultMessage: result.message,
                            currentVersion: result.currentVersion,
                            expectedVersion: result.expectedVersion,
                        },
                    });
                }

                return result;
            } catch (err) {
                const shouldReconnect = isRealtimeConnectionError(err);
                if (shouldReconnect) {
                    console.debug('[useFormCollaboration] Realtime patch unavailable, using RPC fallback:', err);
                } else {
                    console.error('[useFormCollaboration] applyAndBroadcastPatch failed:', err);
                }

                if (shouldReconnect) {
                    setError(err as Error);
                    reconnectNow();
                    notifyConnectionIssue(
                        'خطأ في الاتصال بالتعاون الفوري، تتم إعادة المحاولة تلقائيًا'
                    );
                }

                const fallbackResult = await applyRpcFallback();
                if (fallbackResult.success) {
                    return fallbackResult;
                }

                if (fallbackResult.message === 'PATCH_RPC_MISSING') {
                    return fallbackResult;
                }

                collaborationTelemetryService.log({
                    level: 'error',
                    event: 'broadcast_failed',
                    message: 'Exception while applying/broadcasting non-cell patch',
                    instanceId,
                    userId: user?.uid,
                    details: {
                        changeScope: patch.changeScope,
                        changePath: patch.changePath,
                        error: err instanceof Error ? err.message : String(err),
                    },
                });
                throw err;
            }
        },
        [
            applyPatchDirectViaRpc,
            connectionStatus,
            enabled,
            instanceId,
            isRealtimeReady,
            isRealtimeConnectionError,
            notifyConnectionIssue,
            reconnectNow,
            user,
            userId,
        ]
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

    // ========== APPLY INSTANCE PATCH ==========

    const applyInstancePatch = useCallback(
        async (patch: InstancePatch): Promise<PatchResult> => {
            try {
                return await realtimeCollaborationService.applyInstancePatch(patch);
            } catch (err) {
                console.error('[useFormCollaboration] Apply patch failed:', err);
                setError(err as Error);
                throw err;
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
            collaborationTelemetryService.log({
                level: 'error',
                event: 'change_log_fetch_failed',
                message: 'Failed to fetch recent cell changes',
                instanceId,
                userId: user?.uid,
                details: {
                    limit,
                    error: err instanceof Error ? err.message : String(err),
                },
            });
            return [];
        }
    }, [instanceId, user?.uid]);

    // ========== GET INSTANCE CHANGE LOG ==========

    const getInstanceChangeLog = useCallback(
        async (limit = 200, offset = 0): Promise<any[]> => {
            try {
                return await realtimeCollaborationService.getInstanceChangeLog(limit, offset);
            } catch (err) {
                console.error('[useFormCollaboration] Get instance change log failed:', err);
                setError(err as Error);
                collaborationTelemetryService.log({
                    level: 'error',
                    event: 'change_log_fetch_failed',
                    message: 'Failed to fetch instance change log',
                    instanceId,
                    userId: user?.uid,
                    details: {
                        limit,
                        offset,
                        error: err instanceof Error ? err.message : String(err),
                    },
                });
                return [];
            }
        },
        [instanceId, user?.uid]
    );

    // ========== RETURN ==========

    return {
        isConnected,
        connectionStatus,
        reconnectAttempt,
        activeUsers,
        recentChanges,
        recentPatches,
        broadcastCellChange,
        applyAndBroadcastPatch,
        updateCursor,
        getCellHistory,
        applyInstancePatch,
        getRecentChanges,
        getInstanceChangeLog,
        reconnectNow,
        error,
    };
}

export default useFormCollaboration;
