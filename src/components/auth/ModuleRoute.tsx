/**
 * ModuleRoute Component
 * حماية المسارات حسب صلاحيات الموديولز
 */

import React, { Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useModulePermissions } from '../../hooks/useModulePermissions';
import { LockClosedIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// ==================== Types ====================
interface ModuleRouteProps {
    /** Module code required to access this route */
    module: string;
    /** Required action(s) - defaults to 'view' */
    action?: string | string[];
    /** Require ALL actions (true) or ANY action (false) */
    requireAll?: boolean;
    /** Children to render if permitted */
    children: React.ReactNode;
    /** Custom fallback component when loading */
    loadingFallback?: React.ReactNode;
    /** Redirect path when not authorized (defaults to /module-access-denied) */
    redirectTo?: string;
}

// ==================== Loading Component ====================
// Using FullPageLoading for better perceived performance
import { FullPageLoading } from '../common/LoadingStates';

const DefaultLoadingFallback = () => <FullPageLoading />;

// ==================== Access Denied Component ====================
interface AccessDeniedProps {
    module: string;
    action?: string | string[];
}

export const ModuleAccessDenied: React.FC<AccessDeniedProps> = ({ module, action }) => {
    const moduleNames: Record<string, string> = {
        forms_reports: 'النماذج والتقارير',
        tasks: 'المهام',
        lab: 'المختبر',
        ncr: 'NCR والمحتجزات',
    };

    const actionNames: Record<string, string> = {
        view: 'عرض',
        create: 'إنشاء',
        edit: 'تعديل',
        delete: 'حذف',
        approve: 'موافقة',
        export: 'تصدير',
        print: 'طباعة',
        share: 'مشاركة',
    };

    const moduleName = moduleNames[module] || module;
    const actions = Array.isArray(action) ? action : action ? [action] : ['view'];
    const actionsList = actions.map(a => actionNames[a] || a).join('، ');

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-8" dir="rtl">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center">
                    <LockClosedIcon className="w-10 h-10 text-red-500" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    غير مصرح بالوصول
                </h1>

                {/* Message */}
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    ليس لديك صلاحية للوصول إلى{' '}
                    <span className="font-semibold text-gray-900 dark:text-white">{moduleName}</span>
                    {action && (
                        <>
                            {' '}بإجراء{' '}
                            <span className="font-semibold text-gray-900 dark:text-white">{actionsList}</span>
                        </>
                    )}
                </p>

                {/* Info Box */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-right text-sm text-amber-800 dark:text-amber-300">
                            <p className="font-medium mb-1">كيف يمكنني الوصول؟</p>
                            <p className="text-amber-700 dark:text-amber-400">
                                تواصل مع مدير النظام لطلب صلاحية الوصول لهذا الموديول.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => window.history.back()}
                        className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        العودة للخلف
                    </button>
                    <a
                        href="/"
                        className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                    >
                        الصفحة الرئيسية
                    </a>
                </div>
            </div>
        </div>
    );
};

// ==================== Module Route Component ====================
// Maximum time to wait for loading before showing access denied
const MAX_LOADING_TIME_MS = 10000;

export const ModuleRoute: React.FC<ModuleRouteProps> = ({
    module,
    action = 'view',
    requireAll = false,
    children,
    loadingFallback,
    redirectTo,
}) => {
    const location = useLocation();
    const { canAccess, canPerform, canPerformAll, canPerformAny, loading, error } = useModulePermissions();
    const [loadingTimedOut, setLoadingTimedOut] = React.useState(false);

    // Track when loading first started for cumulative timeout
    const loadingStartRef = React.useRef<number | null>(null);

    // Safety timeout - if loading takes too long, show access denied instead of infinite loading
    // Now tracks CUMULATIVE loading time, not resetting on state toggles
    React.useEffect(() => {
        if (!loading) {
            setLoadingTimedOut(false);
            loadingStartRef.current = null; // Reset when loading completes
            return;
        }

        // Start cumulative timer on first loading state
        if (!loadingStartRef.current) {
            loadingStartRef.current = Date.now();
        }

        const timeoutId = setTimeout(() => {
            const totalTime = Date.now() - (loadingStartRef.current || Date.now());
            console.warn('[ModuleRoute] ⚠️ Loading timeout reached after', MAX_LOADING_TIME_MS, 'ms. Total loading time:', totalTime, 'ms for module:', module);
            setLoadingTimedOut(true);
        }, MAX_LOADING_TIME_MS);

        return () => clearTimeout(timeoutId);
    }, [loading, module]);

    // Show loading state (with timeout protection)
    if (loading && !loadingTimedOut) {
        return <>{loadingFallback || <DefaultLoadingFallback />}</>;
    }

    // If loading timed out, treat as no permission (fail-safe)
    if (loadingTimedOut) {
        console.warn('[ModuleRoute] Loading timed out - showing access denied for module:', module);
        return <ModuleAccessDenied module={module} action={action} />;
    }

    // Check module access
    const hasModuleAccess = canAccess(module);

    // Check specific actions if provided
    let hasActionPermission = true;
    if (action) {
        const actions = Array.isArray(action) ? action : [action];
        hasActionPermission = requireAll
            ? canPerformAll(module, actions)
            : canPerformAny(module, actions);
    }

    // Not authorized
    if (!hasModuleAccess || !hasActionPermission) {
        if (redirectTo) {
            return <Navigate to={redirectTo} state={{ from: location, module, action }} replace />;
        }
        return <ModuleAccessDenied module={module} action={action} />;
    }

    // Authorized - render children
    return <>{children}</>;
};

// ==================== Higher-Order Component ====================
export function withModulePermission<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    module: string,
    action?: string | string[],
    requireAll?: boolean
) {
    return function ModuleProtectedComponent(props: P) {
        return (
            <ModuleRoute module={module} action={action} requireAll={requireAll}>
                <WrappedComponent {...props} />
            </ModuleRoute>
        );
    };
}

// ==================== Convenience Components ====================
// Pre-configured routes for each module

export const FormsReportsRoute: React.FC<{ children: React.ReactNode; action?: string | string[] }> = ({
    children,
    action = 'view',
}) => (
    <ModuleRoute module="forms_reports" action={action}>
        {children}
    </ModuleRoute>
);

export const TasksRoute: React.FC<{ children: React.ReactNode; action?: string | string[] }> = ({
    children,
    action = 'view',
}) => (
    <ModuleRoute module="tasks" action={action}>
        {children}
    </ModuleRoute>
);

export const LabRoute: React.FC<{ children: React.ReactNode; action?: string | string[] }> = ({
    children,
    action = 'view',
}) => (
    <ModuleRoute module="lab" action={action}>
        {children}
    </ModuleRoute>
);

export const NcrRoute: React.FC<{ children: React.ReactNode; action?: string | string[] }> = ({
    children,
    action = 'view',
}) => (
    <ModuleRoute module="ncr" action={action}>
        {children}
    </ModuleRoute>
);

export default ModuleRoute;









