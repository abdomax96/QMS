/**
 * Realtime Subscription Hook
 * Hook للاشتراك في تحديثات البيانات اللحظية من Supabase
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../config/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeOptions<T extends Record<string, any>> {
    table: string;
    schema?: string;
    filter?: string; // e.g., 'company_id=eq.123'
    event?: PostgresChangeEvent;
    onInsert?: (record: T) => void;
    onUpdate?: (record: T, oldRecord: T) => void;
    onDelete?: (oldRecord: T) => void;
    onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
    enabled?: boolean;
}

/**
 * Generic hook for subscribing to Supabase Realtime changes
 * @example
 * useRealtimeSubscription({
 *   table: 'material_receiving',
 *   filter: `company_id=eq.${companyId}`,
 *   onInsert: (record) => setData(prev => [record, ...prev]),
 *   onUpdate: (record) => setData(prev => prev.map(r => r.id === record.id ? record : r)),
 *   onDelete: (record) => setData(prev => prev.filter(r => r.id !== record.id))
 * });
 */
export function useRealtimeSubscription<T extends { id: string }>({
    table,
    schema = 'public',
    filter,
    event = '*',
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    enabled = true
}: UseRealtimeOptions<T>) {
    const channelRef = useRef<RealtimeChannel | null>(null);

    const handleChange = useCallback((payload: RealtimePostgresChangesPayload<T>) => {
        // Call the generic onChange handler if provided
        if (onChange) {
            onChange(payload);
        }

        // Call specific handlers based on event type
        switch (payload.eventType) {
            case 'INSERT':
                if (onInsert && payload.new) {
                    onInsert(payload.new as T);
                }
                break;
            case 'UPDATE':
                if (onUpdate && payload.new && payload.old) {
                    onUpdate(payload.new as T, payload.old as T);
                }
                break;
            case 'DELETE':
                if (onDelete && payload.old) {
                    onDelete(payload.old as T);
                }
                break;
        }
    }, [onChange, onInsert, onUpdate, onDelete]);

    // Retry logic
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryCountRef = useRef(0);
    const MAX_RETRIES = 5;
    const BASE_DELAY = 1000;

    const setupSubscription = useCallback(() => {
        if (!enabled) return;

        // Cleanup existing channel if any
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

        // Create unique channel name
        const channelName = `realtime:${schema}:${table}:${filter || 'all'}:${Date.now()}`;

        // Build the channel configuration
        const channelConfig: any = {
            event,
            schema,
            table
        };

        // Add filter if provided
        if (filter) {
            channelConfig.filter = filter;
        }

        console.log(`🔌 Subscribing to ${table} (Attempt ${retryCountRef.current + 1})`);

        // Subscribe to changes
        channelRef.current = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                channelConfig,
                handleChange as any
            )
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ Realtime subscribed to ${table}`);
                    retryCountRef.current = 0; // Reset retry count on success
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error(`❌ Realtime error for ${table}: ${status}`);

                    // Attempt retry if below limit
                    if (retryCountRef.current < MAX_RETRIES) {
                        const delay = BASE_DELAY * Math.pow(2, retryCountRef.current);
                        console.log(`🔄 Retrying subscription in ${delay}ms...`);

                        retryCountRef.current++;
                        retryTimeoutRef.current = setTimeout(() => {
                            setupSubscription();
                        }, delay);
                    } else {
                        console.error(`❌ Max retries reached for ${table}`);
                    }
                }
            });
    }, [table, schema, filter, event, enabled, handleChange]);

    useEffect(() => {
        setupSubscription();

        // Cleanup on unmount
        return () => {
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
            if (channelRef.current) {
                console.log(`🔌 Unsubscribing from ${table}`);
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [setupSubscription]);

    // Return a function to manually unsubscribe if needed
    return {
        unsubscribe: () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        }
    };
}

export default useRealtimeSubscription;
