/**
 * Real-time Collaboration Service
 * خدمة التعاون في الوقت الفعلي للنماذج
 * 
 * Features:
 * - Track active users (Presence)
 * - Broadcast cell changes (Broadcast)
 * - Cursor position tracking
 * - Cell change history
 * - Conflict detection
 * 
 * @author QMS Development Team
 * @date 2026-01-22
 */

import { supabase } from '../config/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const CHANGE_LOG_RPC_CACHE_KEY = 'qms_collab_change_log_rpc_state_v1';
const CHANGE_LOG_RPC_MISSING_TTL_MS = 1000 * 60 * 60 * 12;
const PATCH_RPC_CACHE_KEY = 'qms_collab_patch_rpc_state_v1';
const PATCH_RPC_MISSING_TTL_MS = 1000 * 60 * 60 * 12;
const DEV_SUPABASE_PROJECT_HOST = 'znbjgihtxpoznqmrealq.supabase.co';
const PROBE_CHANGE_LOG_RPC = ['1', 'true'].includes(
    String(import.meta.env.VITE_REPORT_COLLAB_PROBE_CHANGE_LOG_RPC ?? '0').toLowerCase()
);
const IS_DEV_SUPABASE = String(import.meta.env.VITE_SUPABASE_URL ?? '').includes(
    DEV_SUPABASE_PROJECT_HOST
);
// Rollout guard:
// - Dev Supabase: disabled by default to avoid 404 until migration is applied.
// - Other environments: enabled by default, can still be forced on via env flag.
const SHOULD_PROBE_CHANGE_LOG_RPC = !IS_DEV_SUPABASE || PROBE_CHANGE_LOG_RPC;

// ==================== TYPES ====================

export interface CollaborationConfig {
    instanceId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
}

export interface CellChange {
    sectionId: string;
    tableId: string;
    rowIndex: number;
    colIndex: number;
    oldValue: any;
    newValue: any;
}

export type ChangeScope = 'cell' | 'table_notes' | 'basic_field' | 'section' | 'other';

export interface InstancePatch {
    changeScope: ChangeScope;
    changePath: string[];
    newValue: any;
    oldValue?: any;
    expectedVersion?: number | null;
    sectionId?: string;
    tableId?: string;
    rowIndex?: number;
    colIndex?: number;
    clientId?: string;
    source?: string;
}

export interface PatchResult {
    success: boolean;
    conflict: boolean;
    message: string;
    newVersion?: number;
    updatedAt?: string;
    changedAt?: string;
    currentVersion?: number;
    expectedVersion?: number;
}

export interface InstancePatchWithMetadata extends InstancePatch {
    changedBy: string;
    changedByName: string;
    changedAt: string;
    newVersion?: number;
}

export interface CellChangeWithMetadata extends CellChange {
    changedBy: string;
    changedByName: string;
    changedAt: string;
    version: number;
}

export interface CursorPosition {
    sectionId: string;
    tableId: string;
    rowIndex: number;
    colIndex: number;
}

export interface PresenceUser {
    user_id: string;
    user_name: string;
    user_avatar?: string;
    joined_at: string;
    current_cell?: CursorPosition;
}

export interface CollaborationCallbacks {
    onPresenceChange?: (users: PresenceUser[]) => void;
    onCellChange?: (change: CellChangeWithMetadata) => void;
    onInstancePatch?: (patch: InstancePatchWithMetadata) => void;
    onCursorMove?: (data: { user_id: string; user_name: string } & CursorPosition) => void;
    onError?: (error: Error) => void;
}

// ==================== SERVICE CLASS ====================

class RealTimeCollaborationService {
    private channel: RealtimeChannel | null = null;
    private channelEpoch = 0;
    private config: CollaborationConfig | null = null;
    private presenceState: Map<string, PresenceUser> = new Map();
    private callbacks: CollaborationCallbacks = {};
    private isInitialized = false;
    private isDisconnecting = false;
    private currentInstanceVersion: number | null = null;
    private instanceChangeLogRpcAvailable: boolean | null = null;
    private patchRpcAvailable: boolean | null = null;
    private patchQueue: Promise<void> = Promise.resolve();

    /**
     * Initialize collaboration for a form instance
     * تهيئة التعاون لنموذج معين
     */
    async initialize(
        config: CollaborationConfig,
        callbacks: CollaborationCallbacks
    ): Promise<void> {
        await this.waitForDisconnectCompletion();

        if (this.isInitialized || this.channel) {
            console.warn('[Collaboration] Already initialized. Disconnecting first.');
            await this.disconnect();
        }

        this.config = config;
        this.callbacks = callbacks;

        const channelName = `form:${config.instanceId}:collaboration`;
        console.log(`[Collaboration] Initializing channel: ${channelName}`);

        try {
            await this.refreshCurrentVersion();

            // Create Realtime Channel
            this.channel = supabase.channel(channelName, {
                config: {
                    presence: {
                        key: config.userId,
                    },
                    broadcast: {
                        ack: true,
                        self: false, // Don't receive own messages
                    },
                },
            });

            const activeChannel = this.channel;
            const activeEpoch = ++this.channelEpoch;
            const isStaleChannel = () =>
                this.channel !== activeChannel || this.channelEpoch !== activeEpoch;

            // ========== PRESENCE LISTENERS ==========
            if (activeChannel) {
                activeChannel
                    .on('presence', { event: 'sync' }, () => {
                        if (isStaleChannel()) return;
                        const state = activeChannel.presenceState();
                        this.handlePresenceSync(state);
                    })
                    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                        if (isStaleChannel()) return;
                        console.log(`[Collaboration] User joined: ${key}`, newPresences);
                        const state = activeChannel.presenceState();
                        this.handlePresenceSync(state);
                    })
                    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                        if (isStaleChannel()) return;
                        console.log(`[Collaboration] User left: ${key}`, leftPresences);
                        const state = activeChannel.presenceState();
                        this.handlePresenceSync(state);
                    });

                // ========== BROADCAST LISTENERS ==========
                activeChannel
                    .on('broadcast', { event: 'cell_change' }, ({ payload }) => {
                        if (isStaleChannel()) return;
                        this.handleCellChange(payload);
                    })
                    .on('broadcast', { event: 'instance_patch' }, ({ payload }) => {
                        if (isStaleChannel()) return;
                        this.handleInstancePatch(payload);
                    })
                    .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
                        if (isStaleChannel()) return;
                        this.handleCursorMove(payload);
                    });
            }

            // ========== SUBSCRIBE ==========
            if (!activeChannel) {
                throw new Error('Collaboration channel was not created');
            }

            await new Promise<void>((resolve, reject) => {
                let settled = false;

                const settle = (error?: Error) => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    clearTimeout(timeoutId);
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                };

                const timeoutId = globalThis.setTimeout(() => {
                    settle(new Error('Collaboration channel subscribe timeout'));
                }, 10000);

                activeChannel.subscribe(async (status) => {
                    if (isStaleChannel()) {
                        return;
                    }

                    if (this.isDisconnecting) {
                        if (!settled) {
                            settle(new Error('COLLAB_DISCONNECTING'));
                        }
                        return;
                    }

                    if (status === 'SUBSCRIBED') {
                        console.log('[Collaboration] ✅ Subscribed successfully');
                        try {
                            // Track own presence only after subscription confirmation.
                            await activeChannel.track({
                                user_id: config.userId,
                                user_name: config.userName,
                                user_avatar: config.userAvatar,
                                joined_at: new Date().toISOString(),
                            });
                            this.isInitialized = true;
                            settle();
                        } catch (trackError) {
                            settle(
                                trackError instanceof Error
                                    ? trackError
                                    : new Error(String(trackError))
                            );
                        }
                        return;
                    }

                    if (status === 'CHANNEL_ERROR') {
                        console.error('[Collaboration] ❌ Channel error');
                        if (settled) {
                            if (this.isInitialized) {
                                this.handleError(new Error('Failed to subscribe to collaboration channel'));
                            }
                            return;
                        }
                        settle(new Error('Failed to subscribe to collaboration channel'));
                        return;
                    }

                    if (status === 'TIMED_OUT') {
                        console.error('[Collaboration] ⏱️ Channel timed out');
                        if (settled) {
                            if (this.isInitialized) {
                                this.handleError(new Error('Collaboration channel timed out'));
                            }
                            return;
                        }
                        settle(new Error('Collaboration channel timed out'));
                        return;
                    }

                    if (status === 'CLOSED') {
                        console.warn('[Collaboration] Channel closed during initialization');
                        if (settled) {
                            // A closed status after a successful subscribe is a runtime disconnect.
                            if (this.isInitialized) {
                                this.handleError(new Error('Collaboration channel closed'));
                            }
                            return;
                        }
                        settle(new Error('Collaboration channel closed'));
                    }
                });
            });
        } catch (error) {
            const message = String(error instanceof Error ? error.message : error);
            if (message === 'COLLAB_DISCONNECTING') {
                console.debug('[Collaboration] Initialization aborted due to intentional disconnect');
                throw error;
            }
            console.error('[Collaboration] Initialization error:', error);
            throw error;
        }
    }

    /**
     * Broadcast a cell change to other users
     * بث تغيير خلية للمستخدمين الآخرين
     */
    async broadcastCellChange(change: CellChange): Promise<PatchResult> {
        if (!this.channel || !this.config) {
            throw new Error('[Collaboration] Service not initialized');
        }

        console.log('[Collaboration] Broadcasting cell change:', change);

        try {
            const patchResult = await this.applyInstancePatch({
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

            if (!patchResult.success) {
                return patchResult;
            }

            // 2. Broadcast to other users
            const payload: CellChangeWithMetadata = {
                ...change,
                changedBy: this.config.userId,
                changedByName: this.config.userName,
                changedAt: patchResult.changedAt || new Date().toISOString(),
                version: patchResult.newVersion || 0,
            };

            try {
                await this.channel.send({
                    type: 'broadcast',
                    event: 'cell_change',
                    payload,
                });
            } catch (broadcastError) {
                // Database patch already succeeded. Keep write success and degrade realtime fan-out.
                console.warn(
                    '[Collaboration] Cell persisted, but realtime broadcast failed:',
                    broadcastError
                );
            }

            console.log('[Collaboration] ✅ Cell change broadcasted');
            return patchResult;
        } catch (error) {
            console.error('[Collaboration] Broadcast error:', error);
            throw error;
        }
    }

    /**
     * Apply patch to DB and broadcast to collaborators (for non-cell form updates).
     */
    async applyAndBroadcastPatch(patch: InstancePatch): Promise<PatchResult> {
        if (!this.channel || !this.config) {
            throw new Error('[Collaboration] Service not initialized');
        }

        const result = await this.applyInstancePatch(patch);
        if (!result.success) {
            return result;
        }

        if (patch.changeScope === 'cell') {
            return result;
        }

        const payload: InstancePatchWithMetadata = {
            ...patch,
            changedBy: this.config.userId,
            changedByName: this.config.userName,
            changedAt: result.changedAt || new Date().toISOString(),
            newVersion: result.newVersion,
        };

        try {
            await this.channel.send({
                type: 'broadcast',
                event: 'instance_patch',
                payload,
            });
        } catch (broadcastError) {
            // DB write is already committed; do not convert this to write failure.
            console.warn(
                '[Collaboration] Patch persisted, but realtime broadcast failed:',
                broadcastError
            );
        }

        return result;
    }

    /**
     * Update cursor position
     * تحديث موضع المؤشر
     */
    async updateCursorPosition(position: CursorPosition): Promise<void> {
        if (!this.channel || !this.config) {
            return; // Silent fail for cursor updates
        }

        try {
            // Update presence state
            await this.channel.track({
                user_id: this.config.userId,
                user_name: this.config.userName,
                user_avatar: this.config.userAvatar,
                current_cell: position,
            });

            // Also broadcast for immediate feedback
            await this.channel.send({
                type: 'broadcast',
                event: 'cursor_move',
                payload: {
                    user_id: this.config.userId,
                    user_name: this.config.userName,
                    ...position,
                },
            });
        } catch (error) {
            // Silent fail for cursor updates
            console.debug('[Collaboration] Cursor update error:', error);
        }
    }

    /**
     * Apply a partial patch to report form_data via RPC.
     * This is the preferred write path for collaborative editing.
     */
    async applyInstancePatch(patch: InstancePatch): Promise<PatchResult> {
        return this.enqueuePatchOperation(async () => {
            if (!this.config) {
                throw new Error('[Collaboration] Service not initialized');
            }

            this.hydratePatchRpcAvailabilityFromCache();
            if (this.patchRpcAvailable === false) {
                return {
                    success: false,
                    conflict: false,
                    message: 'PATCH_RPC_MISSING',
                };
            }

            const toJsonb = (value: any) => (value === undefined ? null : value);
            const normalizeRpcFailure = (error: any): PatchResult | null => {
                console.error('[Collaboration] applyInstancePatch failed:', error);
                const normalizedMessage = String(error?.message || '');
                if (this.isMissingRpcError(error, 'apply_form_instance_patch')) {
                    this.patchRpcAvailable = false;
                    this.persistPatchRpcAvailability(false);
                    return {
                        success: false,
                        conflict: false,
                        message: 'PATCH_RPC_MISSING',
                    };
                }
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

                return null;
            };

            const executePatchRpc = async (expectedVersion: number | null) =>
                supabase.rpc('apply_form_instance_patch', {
                    p_instance_id: this.config!.instanceId,
                    p_expected_version: expectedVersion,
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

            let expectedVersion = patch.expectedVersion ?? this.currentInstanceVersion ?? null;
            let lastConflictResult: PatchResult | null = null;

            for (let attempt = 0; attempt < 2; attempt++) {
                const { data, error } = await executePatchRpc(expectedVersion);

                if (error) {
                    const mappedFailure = normalizeRpcFailure(error);
                    if (mappedFailure) {
                        return mappedFailure;
                    }
                    throw error;
                }

                const result = (data || {
                    success: false,
                    conflict: false,
                    message: 'UNKNOWN_RESPONSE',
                }) as PatchResult;

                if (result.success) {
                    this.patchRpcAvailable = true;
                    this.persistPatchRpcAvailability(true);
                    if (typeof result.newVersion === 'number') {
                        this.currentInstanceVersion = result.newVersion;
                    }
                    return result;
                }

                if (!result.conflict) {
                    return result;
                }

                lastConflictResult = result;
                if (typeof result.currentVersion === 'number') {
                    this.currentInstanceVersion = result.currentVersion;
                    expectedVersion = result.currentVersion;
                    continue;
                }

                await this.refreshCurrentVersion();
                expectedVersion = this.currentInstanceVersion;
                if (expectedVersion === null) {
                    return result;
                }
            }

            return (
                lastConflictResult || {
                    success: false,
                    conflict: true,
                    message: 'VERSION_CONFLICT',
                    currentVersion:
                        typeof this.currentInstanceVersion === 'number'
                            ? this.currentInstanceVersion
                            : undefined,
                    expectedVersion: patch.expectedVersion ?? undefined,
                }
            );
        });
    }

    /**
     * Get cell change history from database
     * الحصول على سجل تغييرات خلية
     */
    async getCellHistory(cell: {
        sectionId: string;
        tableId: string;
        rowIndex: number;
        colIndex: number;
    }, limit = 50): Promise<any[]> {
        if (!this.config) {
            throw new Error('[Collaboration] Service not initialized');
        }

        const { data, error } = await supabase
            .rpc('get_cell_history', {
                p_instance_id: this.config.instanceId,
                p_section_id: cell.sectionId,
                p_table_id: cell.tableId,
                p_row_index: cell.rowIndex,
                p_col_index: cell.colIndex,
                p_limit: limit,
                p_offset: 0
            });

        if (error) {
            console.error('[Collaboration] Failed to get cell history:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Get generic report change log (all report areas, not only cells).
     */
    async getInstanceChangeLog(limit = 200, offset = 0): Promise<any[]> {
        if (!this.config) {
            throw new Error('[Collaboration] Service not initialized');
        }

        if (!SHOULD_PROBE_CHANGE_LOG_RPC) {
            this.instanceChangeLogRpcAvailable = false;
            return this.getLegacyChangeLogFallback(limit, offset);
        }

        this.hydrateInstanceChangeLogRpcAvailabilityFromCache();

        if (this.instanceChangeLogRpcAvailable === false) {
            return this.getLegacyChangeLogFallback(limit, offset);
        }

        const { data, error } = await supabase
            .rpc('get_form_instance_change_log', {
                p_instance_id: this.config.instanceId,
                p_limit: limit,
                p_offset: offset,
            });

        if (error) {
            if (this.isMissingRpcError(error, 'get_form_instance_change_log')) {
                this.instanceChangeLogRpcAvailable = false;
                this.persistInstanceChangeLogRpcAvailability(false);
                console.warn(
                    '[Collaboration] get_form_instance_change_log not found. Falling back to get_recent_instance_changes.'
                );
                return this.getLegacyChangeLogFallback(limit, offset);
            }
            console.error('[Collaboration] Failed to get instance change log:', error);
            throw error;
        }

        this.instanceChangeLogRpcAvailable = true;
        this.persistInstanceChangeLogRpcAvailability(true);
        return data || [];
    }

    /**
     * Get recent changes for the instance
     * الحصول على آخر التعديلات في النموذج
     */
    async getRecentChanges(limit = 100): Promise<any[]> {
        if (!this.config) {
            throw new Error('[Collaboration] Service not initialized');
        }

        const { data, error } = await supabase
            .rpc('get_recent_instance_changes', {
                p_instance_id: this.config.instanceId,
                p_limit: limit
            });

        if (error) {
            console.error('[Collaboration] Failed to get recent changes:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Get current active users
     * الحصول على المستخدمين النشطين حالياً
     */
    getActiveUsers(): PresenceUser[] {
        return Array.from(this.presenceState.values());
    }

    /**
     * Check if service is connected
     * التحقق من الاتصال
     */
    isConnected(): boolean {
        return this.isInitialized && this.channel !== null && this.config !== null && !this.isDisconnecting;
    }

    /**
     * Disconnect and cleanup
     * قطع الاتصال والتنظيف
     */
    async disconnect(): Promise<void> {
        if (this.isDisconnecting) {
            return;
        }

        console.log('[Collaboration] Disconnecting...');
        this.isDisconnecting = true;
        this.channelEpoch += 1; // Invalidate all existing channel callbacks immediately.
        // Mark as not initialized BEFORE unsubscribe so CLOSED callbacks during cleanup
        // are treated as expected shutdown, not runtime errors.
        this.isInitialized = false;

        try {
            const activeChannel = this.channel;

            // Clear mutable refs early to avoid stale callbacks affecting next connection cycle.
            this.channel = null;
            this.presenceState.clear();
            this.config = null;
            this.callbacks = {};
            this.currentInstanceVersion = null;
            this.instanceChangeLogRpcAvailable = null;
            this.patchRpcAvailable = null;
            this.patchQueue = Promise.resolve();

            if (activeChannel) {
                try {
                    await activeChannel.untrack();
                } catch (error) {
                    console.debug('[Collaboration] Ignore untrack error during disconnect:', error);
                }

                try {
                    await activeChannel.unsubscribe();
                } catch (error) {
                    console.debug('[Collaboration] Ignore unsubscribe error during disconnect:', error);
                }

                try {
                    supabase.removeChannel(activeChannel);
                } catch (error) {
                    console.debug('[Collaboration] Ignore removeChannel error during disconnect:', error);
                }
            }

            console.log('[Collaboration] ✅ Disconnected');
        } finally {
            this.isDisconnecting = false;
        }
    }

    // ==================== PRIVATE METHODS ====================

    private async waitForDisconnectCompletion(): Promise<void> {
        if (!this.isDisconnecting) {
            return;
        }

        await new Promise<void>((resolve) => {
            const poll = () => {
                if (!this.isDisconnecting) {
                    resolve();
                    return;
                }

                setTimeout(poll, 25);
            };

            poll();
        });
    }

    private enqueuePatchOperation<T>(operation: () => Promise<T>): Promise<T> {
        const run = this.patchQueue.then(operation, operation);
        this.patchQueue = run.then(
            () => undefined,
            () => undefined
        );
        return run;
    }

    private handlePresenceSync(state: any): void {
        this.presenceState.clear();

        Object.entries(state).forEach(([key, presences]: [string, any]) => {
            const list = Array.isArray(presences) ? presences : [];
            list.forEach((presence: PresenceUser, index: number) => {
                const userId = String(presence?.user_id || '').trim();
                const joinedAt = String(presence?.joined_at || '');
                const presenceKey = userId
                    ? `${userId}:${joinedAt || index}`
                    : `${key}:${index}`;

                this.presenceState.set(presenceKey, {
                    ...presence,
                    user_id: userId || key,
                    user_name: presence?.user_name || 'مستخدم',
                    joined_at: joinedAt || 'unknown',
                });
            });
        });

        if (this.callbacks.onPresenceChange) {
            this.callbacks.onPresenceChange(this.getActiveUsers());
        }
    }

    private handleCellChange(payload: CellChangeWithMetadata): void {
        console.log('[Collaboration] Received cell change:', payload);
        if (typeof payload.version === 'number') {
            this.currentInstanceVersion = payload.version;
        }

        if (this.callbacks.onCellChange) {
            this.callbacks.onCellChange(payload);
        }
    }

    private handleInstancePatch(payload: InstancePatchWithMetadata): void {
        if (typeof payload.newVersion === 'number') {
            this.currentInstanceVersion = payload.newVersion;
        }

        if (this.callbacks.onInstancePatch) {
            this.callbacks.onInstancePatch(payload);
        }
    }

    private handleCursorMove(payload: any): void {
        if (this.callbacks.onCursorMove) {
            this.callbacks.onCursorMove(payload);
        }
    }

    private handleError(error: Error): void {
        if (this.isDisconnecting) {
            console.debug('[Collaboration] Ignoring channel error while disconnecting:', error.message);
            return;
        }

        console.error('[Collaboration] Error:', error);

        if (this.callbacks.onError) {
            this.callbacks.onError(error);
        }
    }

    private async refreshCurrentVersion(): Promise<void> {
        if (!this.config) {
            this.currentInstanceVersion = null;
            return;
        }

        const { data, error } = await supabase
            .from('form_instances')
            .select('version')
            .eq('id', this.config.instanceId)
            .single();

        if (error) {
            console.warn('[Collaboration] Failed to load initial version:', error.message);
            this.currentInstanceVersion = null;
            return;
        }

        this.currentInstanceVersion =
            typeof data?.version === 'number' ? data.version : null;
    }

    private isMissingRpcError(error: any, rpcName: string): boolean {
        const code = String(error?.code || '');
        const message = String(error?.message || '');
        const details = String(error?.details || '');

        if (code === 'PGRST202') {
            return true;
        }

        if (message.includes('Could not find the function')) {
            return true;
        }

        return details.includes(rpcName);
    }

    private async getLegacyChangeLogFallback(limit: number, offset: number): Promise<any[]> {
        if (!this.config) {
            return [];
        }

        const normalizedLimit = Math.max(1, limit);
        const normalizedOffset = Math.max(0, offset);
        const fetchCount = Math.min(500, normalizedLimit + normalizedOffset);

        const { data, error } = await supabase
            .rpc('get_recent_instance_changes', {
                p_instance_id: this.config.instanceId,
                p_limit: fetchCount,
            });

        if (error) {
            console.error('[Collaboration] Legacy change log fallback failed:', error);
            throw error;
        }

        const rows = Array.isArray(data) ? data : [];
        return rows
            .slice(normalizedOffset, normalizedOffset + normalizedLimit)
            .map((row: any) => ({
                id: row.id,
                instance_id: row.instance_id ?? this.config?.instanceId,
                change_scope: 'cell',
                change_path: [
                    'sections',
                    row.section_id,
                    'tables',
                    row.table_id,
                    'data',
                    String(row.row_index ?? 0),
                    String(row.col_index ?? 0),
                ],
                section_id: row.section_id ?? null,
                table_id: row.table_id ?? null,
                row_index: row.row_index ?? null,
                col_index: row.col_index ?? null,
                old_value: row.old_value ?? null,
                new_value: row.new_value ?? null,
                changed_by: row.changed_by ?? null,
                changed_by_name: row.changed_by_name ?? 'مستخدم غير معروف',
                changed_at: row.changed_at ?? new Date().toISOString(),
                client_id: row.client_id ?? null,
                source: 'legacy_recent_changes',
            }));
    }

    private hydrateInstanceChangeLogRpcAvailabilityFromCache(): void {
        if (this.instanceChangeLogRpcAvailable !== null) {
            return;
        }

        if (typeof window === 'undefined') {
            return;
        }

        try {
            const raw = window.localStorage.getItem(CHANGE_LOG_RPC_CACHE_KEY);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw) as {
                available?: boolean;
                checkedAt?: number;
            };

            if (typeof parsed?.available !== 'boolean' || typeof parsed?.checkedAt !== 'number') {
                return;
            }

            const ageMs = Date.now() - parsed.checkedAt;
            if (!parsed.available && ageMs > CHANGE_LOG_RPC_MISSING_TTL_MS) {
                return;
            }

            this.instanceChangeLogRpcAvailable = parsed.available;
        } catch {
            // Ignore cache parsing errors and continue with runtime detection.
        }
    }

    private persistInstanceChangeLogRpcAvailability(available: boolean): void {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const payload = JSON.stringify({
                available,
                checkedAt: Date.now(),
            });
            window.localStorage.setItem(CHANGE_LOG_RPC_CACHE_KEY, payload);
        } catch {
            // Ignore storage write failures.
        }
    }

    private hydratePatchRpcAvailabilityFromCache(): void {
        if (this.patchRpcAvailable !== null) {
            return;
        }

        if (typeof window === 'undefined') {
            return;
        }

        try {
            const raw = window.localStorage.getItem(PATCH_RPC_CACHE_KEY);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw) as {
                available?: boolean;
                checkedAt?: number;
            };

            if (typeof parsed?.available !== 'boolean' || typeof parsed?.checkedAt !== 'number') {
                return;
            }

            const ageMs = Date.now() - parsed.checkedAt;
            if (!parsed.available && ageMs > PATCH_RPC_MISSING_TTL_MS) {
                return;
            }

            this.patchRpcAvailable = parsed.available;
        } catch {
            // Ignore cache parsing errors and continue with runtime detection.
        }
    }

    private persistPatchRpcAvailability(available: boolean): void {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const payload = JSON.stringify({
                available,
                checkedAt: Date.now(),
            });
            window.localStorage.setItem(PATCH_RPC_CACHE_KEY, payload);
        } catch {
            // Ignore storage write failures.
        }
    }
}

// ==================== SINGLETON EXPORT ====================

export const realtimeCollaborationService = new RealTimeCollaborationService();

export default realtimeCollaborationService;
