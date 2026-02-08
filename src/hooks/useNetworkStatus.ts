/**
 * useNetworkStatus Hook
 * مراقبة حالة الاتصال بالشبكة وSupabase Realtime
 * 
 * Monitors browser online/offline state AND Supabase Realtime connection:
 * - `isOnline` boolean for browser connectivity
 * - `realtimeStatus` for Supabase Realtime connection state
 * - `isFullyConnected` true only when both are connected
 * - Auto-reconnection when coming back online
 * - Toast notifications on state change
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToastStore } from '../store/toastStore';
import { supabase } from '../config/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface UseNetworkStatusOptions {
    /** Show toast notifications on status change (default: true) */
    showToasts?: boolean;
    /** Enable debug logging (default: false) */
    debug?: boolean;
    /** Enable Realtime monitoring (default: true) */
    monitorRealtime?: boolean;
}

interface NetworkStatusResult {
    /** Browser online/offline status */
    isOnline: boolean;
    /** Supabase Realtime connection status */
    realtimeStatus: ConnectionStatus;
    /** Combined status - true only if both online and realtime connected */
    isFullyConnected: boolean;
    /** Force reconnection attempt */
    reconnect: () => void;
}

export function useNetworkStatus(options: UseNetworkStatusOptions = {}): NetworkStatusResult {
    const { showToasts = true, debug = false, monitorRealtime = true } = options;
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [realtimeStatus, setRealtimeStatus] = useState<ConnectionStatus>('connecting');
    const addToast = useToastStore(state => state.addToast);
    const channelRef = useRef<RealtimeChannel | null>(null);

    // Setup Realtime connection monitoring
    const setupRealtimeMonitor = useCallback(() => {
        if (!monitorRealtime) return;

        // Remove existing channel
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

        if (debug) console.log('[NetworkStatus] Setting up Realtime monitor...');

        channelRef.current = supabase.channel('network-health-monitor');

        channelRef.current?.subscribe((status) => {
            if (debug) console.log('[NetworkStatus] Realtime status:', status);

            if (status === 'SUBSCRIBED') {
                setRealtimeStatus('connected');
                if (debug) console.log('[NetworkStatus] 🟢 Realtime connected');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                setRealtimeStatus('disconnected');
                if (debug) console.log('[NetworkStatus] 🔴 Realtime disconnected');
            } else {
                setRealtimeStatus('connecting');
            }
        });
    }, [monitorRealtime, debug]);

    // Force reconnection
    const reconnect = useCallback(() => {
        if (debug) console.log('[NetworkStatus] Manual reconnection requested');
        setupRealtimeMonitor();
    }, [setupRealtimeMonitor, debug]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            if (debug) console.log('[NetworkStatus] 🟢 Browser online');

            if (showToasts) {
                addToast({
                    type: 'success',
                    message: 'تم استعادة الاتصال بالإنترنت',
                    duration: 3000,
                });
            }

            // Reconnect Realtime when coming back online
            setTimeout(reconnect, 1000);

            // Dispatch event for other hooks to react
            window.dispatchEvent(new CustomEvent('network-online'));
        };

        const handleOffline = () => {
            setIsOnline(false);
            setRealtimeStatus('disconnected');
            if (debug) console.log('[NetworkStatus] 🔴 Browser offline');

            if (showToasts) {
                addToast({
                    type: 'error',
                    message: 'انقطع الاتصال بالإنترنت - بعض الميزات قد لا تعمل',
                    duration: 5000,
                });
            }

            // Dispatch event
            window.dispatchEvent(new CustomEvent('network-offline'));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial Realtime setup
        setupRealtimeMonitor();

        // Periodic health check - reconnect if disconnected while online
        const healthCheckInterval = setInterval(() => {
            if (isOnline && realtimeStatus === 'disconnected') {
                if (debug) console.log('[NetworkStatus] Auto-reconnecting Realtime...');
                reconnect();
            }
        }, 30000); // Check every 30 seconds

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(healthCheckInterval);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [showToasts, debug, addToast, setupRealtimeMonitor, reconnect, isOnline, realtimeStatus]);

    return {
        isOnline,
        realtimeStatus,
        isFullyConnected: isOnline && realtimeStatus === 'connected',
        reconnect
    };
}

export default useNetworkStatus;

