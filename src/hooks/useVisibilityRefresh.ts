/**
 * useVisibilityRefresh Hook
 * 
 * Proactively refreshes authentication and permissions when the browser tab
 * becomes visible after being hidden (e.g., after laptop sleep, tab switching).
 * 
 * This prevents the "infinite loading" issue by ensuring fresh state BEFORE
 * user navigation attempts.
 */

import { useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';
import { useAuthStore } from '../store/authStore';
import { invalidatePermissionCache } from '../services/permissionService';
import { dataCache } from '../services/dataCache';

interface UseVisibilityRefreshOptions {
    /** Minimum time (ms) the tab must be hidden before triggering refresh (default: 60000 = 1 min) */
    minHiddenTime?: number;
    /** Enable debug logging */
    debug?: boolean;
    /** Callback when refresh is triggered */
    onRefresh?: () => void;
}

export function useVisibilityRefresh(options: UseVisibilityRefreshOptions = {}) {
    const { minHiddenTime = 60000, debug = false, onRefresh } = options;
    const hiddenAtRef = useRef<number | null>(null);
    const isRefreshingRef = useRef(false);

    useEffect(() => {
        const clearLocalSessionAndRedirect = async (reason: string) => {
            try {
                // Clear local auth state first so UI can proceed to login even if network is flaky.
                useAuthStore.setState({ session: null, profile: null, loading: false, isQuality: false } as any);
                dataCache.clear();
                invalidatePermissionCache();

                // Ensure Supabase local storage is cleared (prevents stale session blocking login).
                await supabase.auth.signOut({ scope: 'local' });
            } catch (err) {
                // signOut can fail when offline; redirect anyway.
                console.warn('[VisibilityRefresh] Failed to clear local session:', err);
            } finally {
                window.location.href = `/login?reason=${encodeURIComponent(reason)}`;
            }
        };

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'hidden') {
                // Tab is now hidden - record timestamp
                hiddenAtRef.current = Date.now();
                if (debug) console.log('[VisibilityRefresh] Tab hidden at:', new Date().toISOString());
            } else if (document.visibilityState === 'visible') {
                // Tab is now visible - check if we need to refresh
                const hiddenAt = hiddenAtRef.current;
                hiddenAtRef.current = null;

                if (!hiddenAt) return;

                const hiddenDuration = Date.now() - hiddenAt;
                if (debug) console.log('[VisibilityRefresh] Tab visible after', Math.round(hiddenDuration / 1000), 'seconds');

                // Only refresh if hidden for longer than threshold
                if (hiddenDuration < minHiddenTime) {
                    if (debug) console.log('[VisibilityRefresh] Hidden time below threshold, skipping refresh');
                    return;
                }

                // Prevent concurrent refreshes
                if (isRefreshingRef.current) {
                    if (debug) console.log('[VisibilityRefresh] Refresh already in progress, skipping');
                    return;
                }

                isRefreshingRef.current = true;

                // Timeout for the entire refresh operation
                const REFRESH_TIMEOUT_MS = 10000;
                let didTimeout = false;
                const timeoutId = setTimeout(() => {
                    didTimeout = true;
                    console.warn('[VisibilityRefresh] ⚠️ Refresh timeout after', REFRESH_TIMEOUT_MS, 'ms');
                    isRefreshingRef.current = false;
                    // Force page reload as last resort to get fresh state
                    window.location.reload();
                }, REFRESH_TIMEOUT_MS);

                try {
                    console.log('[VisibilityRefresh] 🔄 Refreshing session after idle...');

                    // 1. Get current session
                    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                    if (didTimeout) return; // Already handled by timeout

                    if (sessionError) {
                        console.warn('[VisibilityRefresh] Session fetch error:', sessionError.message);
                        // Session error after idle - redirect to login
                        clearTimeout(timeoutId);
                        await clearLocalSessionAndRedirect('session_error');
                        return;
                    }

                    if (!session) {
                        console.log('[VisibilityRefresh] No session found - redirecting to login');
                        clearTimeout(timeoutId);
                        await clearLocalSessionAndRedirect('session_expired');
                        return;
                    }

                    // 2. Refresh the session token
                    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

                    if (didTimeout) return; // Already handled by timeout

                    if (refreshError) {
                        console.warn('[VisibilityRefresh] Session refresh failed:', refreshError.message);
                        clearTimeout(timeoutId);
                        await clearLocalSessionAndRedirect('session_expired');
                        return;
                    }

                    if (refreshData.session) {
                        console.log('[VisibilityRefresh] ✅ Session refreshed successfully');

                        // Update auth store with new session
                        useAuthStore.setState({ session: refreshData.session });

                        // 3. Invalidate permission cache to force fresh fetch
                        invalidatePermissionCache(refreshData.session.user.id);

                        // 3b. Invalidate ALL data caches to ensure fresh data after idle
                        dataCache.invalidate();
                        console.log('[VisibilityRefresh] 🗑️ All caches invalidated');

                        // 4. Dispatch event for permission hooks to re-fetch
                        window.dispatchEvent(new CustomEvent('permissions-changed'));

                        // 5. Call optional callback
                        onRefresh?.();
                    }

                    clearTimeout(timeoutId);

                } catch (err) {
                    console.error('[VisibilityRefresh] Unexpected error:', err);
                    clearTimeout(timeoutId);
                    // On unexpected error, redirect to login as fail-safe
                    await clearLocalSessionAndRedirect('refresh_error');
                } finally {
                    isRefreshingRef.current = false;
                }
            }
        };

        // Listen for visibility changes
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Also handle online event (network reconnection)
        const handleOnline = () => {
            if (debug) console.log('[VisibilityRefresh] Network back online, scheduling refresh...');
            // Treat coming back online like becoming visible
            hiddenAtRef.current = Date.now() - minHiddenTime - 1000; // Force refresh
            handleVisibilityChange();
        };

        window.addEventListener('online', handleOnline);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
        };
    }, [minHiddenTime, debug, onRefresh]);
}

export default useVisibilityRefresh;
