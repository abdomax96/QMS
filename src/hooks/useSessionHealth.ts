/**
 * useSessionHealth Hook
 * 
 * Proactively validates session health before allowing navigation.
 * Checks session validity on route changes and proactively refreshes
 * tokens that are nearing expiry.
 * 
 * This is a defensive layer that ensures users are never stuck with
 * stale sessions that cause infinite loading states.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuthStore } from '../store/authStore';

// Check session every 60 seconds when actively navigating
const SESSION_CHECK_INTERVAL_MS = 60000;

// Refresh token if it expires within 5 minutes
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

// Timeout for session check operations
const CHECK_TIMEOUT_MS = 8000;

interface UseSessionHealthOptions {
    /** Enable debug logging */
    debug?: boolean;
    /** Skip health check on certain paths (e.g., login) */
    skipPaths?: string[];
}

export function useSessionHealth(options: UseSessionHealthOptions = {}) {
    const { debug = false, skipPaths = ['/login', '/unauthorized'] } = options;
    const location = useLocation();
    const navigate = useNavigate();
    const lastCheckRef = useRef<number>(Date.now());
    const isCheckingRef = useRef<boolean>(false);

    /**
     * Check if the current session is healthy
     * Returns true if healthy, false if user should be redirected
     */
    const checkSessionHealth = useCallback(async (): Promise<boolean> => {
        // Skip if already checking
        if (isCheckingRef.current) {
            if (debug) console.log('[SessionHealth] Check already in progress, skipping');
            return true;
        }

        isCheckingRef.current = true;

        // Timeout wrapper
        // FIXED: Timeout now assumes healthy - let Supabase be the source of truth
        // Rationale: Slow network ≠ invalid session. Supabase's onAuthStateChange will
        // handle actual session expiry. This prevents false logouts on tab switches/slow networks.
        const timeoutPromise = new Promise<boolean>((resolve) => {
            setTimeout(() => {
                console.warn('[SessionHealth] ⚠️ Health check timeout - assuming session healthy (trusting Supabase)');
                resolve(true); // ✅ Changed: Keep user logged in on timeout
            }, CHECK_TIMEOUT_MS);
        });

        const checkPromise = (async (): Promise<boolean> => {
            try {
                // FORCE LOGGING: Override debug flag for investigation
                console.log('[SessionHealth] 🔍 Checking session health...');

                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.warn('[SessionHealth] ❌ Session error:', error.message);
                    // ✅ FIXED: Don't override authStore state - let Supabase's onAuthStateChange handle it
                    return false;
                }

                if (!session) {
                    console.log('[SessionHealth] ⚠️ No session found - Invalid');
                    // ✅ FIXED: Don't override authStore state - let Supabase's onAuthStateChange handle it
                    return false;
                }

                // Check if token is about to expire
                const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
                const timeUntilExpiry = expiresAt - Date.now();

                console.log(`[SessionHealth] ℹ️ Session info: User=${session.user.id}, ExpiresIn=${Math.round(timeUntilExpiry / 1000)}s`);

                if (expiresAt && timeUntilExpiry < TOKEN_REFRESH_THRESHOLD_MS) {
                    console.log('[SessionHealth] ⏳ Token expiring soon, refreshing...');

                    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

                    if (refreshError) {
                        console.warn('[SessionHealth] ❌ Token refresh failed:', refreshError.message);
                        // ✅ FIXED: Don't override authStore state - let Supabase's onAuthStateChange handle it
                        return false;
                    }

                    if (refreshData.session) {
                        console.log('[SessionHealth] ✅ Token refreshed successfully');
                        useAuthStore.setState({ session: refreshData.session });
                    }
                }

                lastCheckRef.current = Date.now();
                return true;

            } catch (err) {
                console.error('[SessionHealth] 💥 Unexpected error:', err);
                return false;
            }
        })();

        try {
            const result = await Promise.race([checkPromise, timeoutPromise]);
            return result;
        } finally {
            isCheckingRef.current = false;
        }
    }, [debug]);

    /**
     * Handle navigation with session validation
     */
    useEffect(() => {
        // Skip health check for certain paths
        if (skipPaths.some(path => location.pathname.startsWith(path))) {
            return;
        }

        // Always log navigation checks for now
        // console.log('[SessionHealth] Navigation check for:', location.pathname);

        // Only check if enough time has passed since last check
        const timeSinceLastCheck = Date.now() - lastCheckRef.current;
        if (timeSinceLastCheck < SESSION_CHECK_INTERVAL_MS) {
            // if (debug) console.log('[SessionHealth] Recent check exists, skipping');
            return;
        }

        // Perform health check
        checkSessionHealth().then(isHealthy => {
            if (!isHealthy) {
                console.warn('[SessionHealth] 🚫 Session unhealthy, redirecting to login');
                navigate('/login', {
                    state: { from: location, reason: 'session_invalid' },
                    replace: true
                });
            }
        });
    }, [location.pathname, checkSessionHealth, navigate, skipPaths, debug, location]);

    return {
        /** Manually trigger a session health check */
        checkSessionHealth,
        /** Force an immediate session refresh */
        forceRefresh: async () => {
            const { error } = await supabase.auth.refreshSession();
            if (error) {
                console.error('[SessionHealth] Force refresh failed:', error);
                return false;
            }
            return true;
        }
    };
}

export default useSessionHealth;
