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
    onCursorMove?: (data: { user_id: string; user_name: string } & CursorPosition) => void;
    onError?: (error: Error) => void;
}

// ==================== SERVICE CLASS ====================

class RealTimeCollaborationService {
    private channel: RealtimeChannel | null = null;
    private config: CollaborationConfig | null = null;
    private presenceState: Map<string, PresenceUser> = new Map();
    private callbacks: CollaborationCallbacks = {};
    private isInitialized = false;

    /**
     * Initialize collaboration for a form instance
     * تهيئة التعاون لنموذج معين
     */
    async initialize(
        config: CollaborationConfig,
        callbacks: CollaborationCallbacks
    ): Promise<void> {
        if (this.isInitialized) {
            console.warn('[Collaboration] Already initialized. Disconnecting first.');
            await this.disconnect();
        }

        this.config = config;
        this.callbacks = callbacks;

        const channelName = `form:${config.instanceId}:collaboration`;
        console.log(`[Collaboration] Initializing channel: ${channelName}`);

        try {
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

            // ========== PRESENCE LISTENERS ==========
            if (this.channel) {
                this.channel
                    .on('presence', { event: 'sync' }, () => {
                        if (this.channel) {
                            const state = this.channel.presenceState();
                            this.handlePresenceSync(state);
                        }
                    })
                    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                        console.log(`[Collaboration] User joined: ${key}`, newPresences);
                        if (this.channel) {
                            const state = this.channel.presenceState();
                            this.handlePresenceSync(state);
                        }
                    })
                    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                        console.log(`[Collaboration] User left: ${key}`, leftPresences);
                        if (this.channel) {
                            const state = this.channel.presenceState();
                            this.handlePresenceSync(state);
                        }
                    });

                // ========== BROADCAST LISTENERS ==========
                this.channel
                    .on('broadcast', { event: 'cell_change' }, ({ payload }) => {
                        this.handleCellChange(payload);
                    })
                    .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
                        this.handleCursorMove(payload);
                    });
            }

            // ========== SUBSCRIBE ==========
            if (this.channel) {
                await this.channel.subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[Collaboration] ✅ Subscribed successfully');

                        // Track own presence
                        await this.channel!.track({
                            user_id: config.userId,
                            user_name: config.userName,
                            user_avatar: config.userAvatar,
                            joined_at: new Date().toISOString(),
                        });

                        this.isInitialized = true;
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('[Collaboration] ❌ Channel error');
                        this.handleError(new Error('Failed to subscribe to collaboration channel'));
                    } else if (status === 'TIMED_OUT') {
                        console.error('[Collaboration] ⏱️ Channel timed out');
                        this.handleError(new Error('Collaboration channel timed out'));
                    }
                });
            }
        } catch (error) {
            console.error('[Collaboration] Initialization error:', error);
            this.handleError(error as Error);
            throw error;
        }
    }

    /**
     * Broadcast a cell change to other users
     * بث تغيير خلية للمستخدمين الآخرين
     */
    async broadcastCellChange(change: CellChange): Promise<void> {
        if (!this.channel || !this.config) {
            throw new Error('[Collaboration] Service not initialized');
        }

        console.log('[Collaboration] Broadcasting cell change:', change);

        try {
            // 1. Save to database first (creates audit trail)
            const { data: savedChange, error } = await supabase
                .from('cell_change_history')
                .insert({
                    instance_id: this.config.instanceId,
                    section_id: change.sectionId,
                    table_id: change.tableId,
                    row_index: change.rowIndex,
                    col_index: change.colIndex,
                    old_value: change.oldValue,
                    new_value: change.newValue,
                    changed_by: this.config.userId,
                    changed_by_name: this.config.userName,
                    change_type: change.oldValue === null ? 'create' : 'update',
                })
                .select()
                .single();

            if (error) {
                console.error('[Collaboration] Failed to save cell change:', error);
                throw error;
            }

            // 2. Broadcast to other users
            const payload: CellChangeWithMetadata = {
                ...change,
                changedBy: this.config.userId,
                changedByName: this.config.userName,
                changedAt: savedChange.changed_at,
                version: savedChange.version,
            };

            await this.channel.send({
                type: 'broadcast',
                event: 'cell_change',
                payload,
            });

            console.log('[Collaboration] ✅ Cell change broadcasted');
        } catch (error) {
            console.error('[Collaboration] Broadcast error:', error);
            this.handleError(error as Error);
            throw error;
        }
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
        return this.isInitialized && this.channel !== null;
    }

    /**
     * Disconnect and cleanup
     * قطع الاتصال والتنظيف
     */
    async disconnect(): Promise<void> {
        console.log('[Collaboration] Disconnecting...');

        if (this.channel) {
            try {
                await this.channel.untrack();
                await this.channel.unsubscribe();
                supabase.removeChannel(this.channel);
            } catch (error) {
                console.error('[Collaboration] Disconnect error:', error);
            }
            this.channel = null;
        }

        this.isInitialized = false;
        this.presenceState.clear();
        this.config = null;
        this.callbacks = {};

        console.log('[Collaboration] ✅ Disconnected');
    }

    // ==================== PRIVATE METHODS ====================

    private handlePresenceSync(state: any): void {
        this.presenceState.clear();

        Object.entries(state).forEach(([key, presences]: [string, any]) => {
            presences.forEach((presence: PresenceUser) => {
                this.presenceState.set(key, presence);
            });
        });

        if (this.callbacks.onPresenceChange) {
            this.callbacks.onPresenceChange(this.getActiveUsers());
        }
    }

    private handleCellChange(payload: CellChangeWithMetadata): void {
        console.log('[Collaboration] Received cell change:', payload);

        if (this.callbacks.onCellChange) {
            this.callbacks.onCellChange(payload);
        }
    }

    private handleCursorMove(payload: any): void {
        if (this.callbacks.onCursorMove) {
            this.callbacks.onCursorMove(payload);
        }
    }

    private handleError(error: Error): void {
        console.error('[Collaboration] Error:', error);

        if (this.callbacks.onError) {
            this.callbacks.onError(error);
        }
    }
}

// ==================== SINGLETON EXPORT ====================

export const realtimeCollaborationService = new RealTimeCollaborationService();

export default realtimeCollaborationService;
