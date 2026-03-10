/**
 * Protected Route Component
 * مكون حماية المسارات - يمنع الوصول بدون تسجيل دخول أو صلاحيات
 */

import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/ncr/usePermissions';
import type { PermissionAction } from '../../types/permission';
import { FullPageLoading } from '../common/LoadingStates';

// Maximum time to wait for loading before forcing a decision
const MAX_LOADING_TIME_MS = 10000;

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredPermission?: PermissionAction;
    requiredPermissions?: PermissionAction[];
    requireAll?: boolean; // If true, requires ALL permissions. If false, requires ANY permission.
    requireAdmin?: boolean;
    redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredPermission,
    requiredPermissions,
    requireAll = false,
    requireAdmin = false,
    redirectTo = '/unauthorized'
}) => {
    const { profile, loading: authLoading, session } = useSupabaseAuth();
    // Read authStore.initialized to distinguish "still initializing" from "no session"
    const authInitialized = useAuthStore(state => state.initialized);
    const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin, loading: permLoading } = usePermissions();
    const location = useLocation();
    const [loadingTimedOut, setLoadingTimedOut] = useState(false);

    // Safety timeout - if loading takes too long, force a redirect decision
    useEffect(() => {
        if (!authLoading && !permLoading) {
            // Loading completed, reset timeout flag
            setLoadingTimedOut(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            console.warn('[ProtectedRoute] ⚠️ Loading timeout reached after', MAX_LOADING_TIME_MS, 'ms');
            setLoadingTimedOut(true);
        }, MAX_LOADING_TIME_MS);

        return () => clearTimeout(timeoutId);
    }, [authLoading, permLoading]);

    // If loading timed out, decide based on whether authStore has finished initializing.
    // Previously this redirected whenever session=null, but session stays null during
    // slow getSession() calls, causing authenticated users to be sent to /login.
    if (loadingTimedOut) {
        if (authInitialized && !session) {
            // authStore completed its check and confirmed no session → redirect
            console.warn('[ProtectedRoute] Timeout — auth initialized, no session → redirecting to login');
            return <Navigate to="/login" state={{ from: location, reason: 'timeout' }} replace />;
        }
        // authStore still initializing (Supabase slow) OR session exists →
        // stop showing the loading spinner and let the rest of the checks run.
        console.warn('[ProtectedRoute] Timeout — auth still initializing or session present, unblocking UI');
    }

    // Show loading state while checking auth (with timeout fallback above)
    if ((authLoading || permLoading) && !loadingTimedOut) {
        return <FullPageLoading />;
    }

    // Only redirect if we're sure there's no session AND no profile
    if (!authLoading && !session && !profile) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if admin is required
    if (requireAdmin && !isAdmin) {
        return <Navigate to={redirectTo} replace />;
    }

    // Check permissions
    let hasAccess = true;

    if (requiredPermission) {
        hasAccess = hasPermission(requiredPermission);
    } else if (requiredPermissions && requiredPermissions.length > 0) {
        hasAccess = requireAll
            ? hasAllPermissions(requiredPermissions)
            : hasAnyPermission(requiredPermissions);
    }

    if (!hasAccess) {
        return <Navigate to={redirectTo} replace />;
    }

    // User is authenticated and has required permissions, render children
    return <>{children}</>;
};

export default ProtectedRoute;
