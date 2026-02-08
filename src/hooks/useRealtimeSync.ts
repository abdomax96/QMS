/**
 * useRealtimeSync - REFACTORED with Stable Subscription Lifecycle
 * 
 * Fixes:
 * - Uses refs to prevent re-subscription on every render
 * - Proper cleanup in useEffect
 * - Subscription leak detection in development
 * - Graceful error handling with automatic retry
 * 
 * Changes from original:
 * - Channel refs instead of state
 * - Stable dependencies
 * - Debug logging for subscription lifecycle
 * - Automatic reconnection on failure
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { dataCache, invalidateAfterMutation } from '../services/dataCache';
import { logger } from '../utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeSyncOptions {
    syncFolders: boolean;
    syncTemplates: boolean;
    syncInstances: boolean;
    debug?: boolean;
}

const RECONNECT_DELAY_MS = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 3;

export function useRealtimeSync(options: RealtimeSyncOptions) {
    const {
        syncFolders,
        syncTemplates,
        syncInstances,
        debug = false
    } = options;

    // DISABLED: Realtime is not configured for self-hosted setup
    // Real-time sync is disabled to prevent WebSocket connection errors
    // Remove this block when Realtime is properly configured
    const REALTIME_DISABLED = true;
    if (REALTIME_DISABLED) {
        return {
            isSubscribed: false,
            channelCount: 0
        };
    }

    // Use refs to prevent re-subscription
    const channelRef = useRef<RealtimeChannel | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimerRef = useRef<number | null>(null);

    // Stable callback for handling changes
    const handleChange = useCallback((payload: any) => {
        const { table, eventType } = payload;

        if (debug) {
            logger.debug(`[RealtimeSync] ${table} ${eventType}`, payload);
        }

        // Invalidate cache for the affected table
        switch (table) {
            case 'folders':
                if (syncFolders) {
                    invalidateAfterMutation('folders');
                }
                break;
            case 'form_templates':
                if (syncTemplates) {
                    invalidateAfterMutation('templates');
                }
                break;
            case 'form_instances':
                if (syncInstances) {
                    invalidateAfterMutation('instances');
                }
                break;
        }
    }, [syncFolders, syncTemplates, syncInstances, debug]);

    // Setup subscription
    const setupSubscription = useCallback(() => {
        // Don't setup if nothing to sync
        if (!syncFolders && !syncTemplates && !syncInstances) {
            return;
        }

        // Cleanup existing channel
        if (channelRef.current) {
            if (debug) {
                logger.debug('[RealtimeSync] Cleaning up existing subscription');
            }
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        if (debug) {
            logger.debug('[RealtimeSync] Setting up real-time subscriptions');
        }

        // Create unique channel name to avoid conflicts
        const channelName = `data-sync-${Date.now()}`;
        let channel = supabase.channel(channelName);

        // Subscribe to folders
        if (syncFolders) {
            channel = channel.on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'folders' },
                handleChange
            );
        }

        // Subscribe to templates
        if (syncTemplates) {
            channel = channel.on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'form_templates' },
                handleChange
            );
        }

        // Subscribe to instances
        if (syncInstances) {
            channel = channel.on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'form_instances' },
                handleChange
            );
        }

        // Subscribe and handle status
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                if (debug) {
                    logger.debug('[RealtimeSync] ✅ Subscribed successfully');
                }
                reconnectAttemptsRef.current = 0; // Reset on success
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                logger.warn(`[RealtimeSync] Subscription failed: ${status}`);

                // Attempt reconnection
                if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttemptsRef.current++;
                    logger.warn(`[RealtimeSync] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

                    if (reconnectTimerRef.current) {
                        clearTimeout(reconnectTimerRef.current);
                    }

                    reconnectTimerRef.current = setTimeout(() => {
                        setupSubscription();
                    }, RECONNECT_DELAY_MS) as any;
                } else {
                    logger.error('[RealtimeSync] Max reconnection attempts reached. Real-time sync disabled.');
                }
            } else if (status === 'CLOSED') {
                if (debug) {
                    logger.debug('[RealtimeSync] Channel closed');
                }
            }
        });

        // Store channel ref
        channelRef.current = channel;

    }, [syncFolders, syncTemplates, syncInstances, debug, handleChange]);

    // Setup on mount, cleanup on unmount
    useEffect(() => {
        setupSubscription();

        // Cleanup function
        return () => {
            if (debug) {
                logger.debug('[RealtimeSync] Component unmounting, cleaning up subscriptions');
            }

            // Clear reconnect timer
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }

            // Remove channel
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [setupSubscription, debug]);

    // Leak detection in development
    useEffect(() => {
        if (!debug || !import.meta.env.DEV) return;

        const checkLeaks = setInterval(() => {
            const channels = (supabase as any).getChannels?.() || [];
            if (channels.length > 5) {
                logger.warn(`[RealtimeSync] ⚠️  Potential subscription leak detected: ${channels.length} channels open`);
                logger.warn('[RealtimeSync] Active channels:', channels.map((ch: any) => ch.topic));
            }
        }, 30000); // Check every 30 seconds

        return () => clearInterval(checkLeaks);
    }, [debug]);

    // Return channel status for debugging
    return {
        isSubscribed: channelRef.current?.state === 'joined',
        channelCount: channelRef.current ? 1 : 0
    };
}

export default useRealtimeSync;
