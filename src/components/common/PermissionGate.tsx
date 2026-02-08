/**
 * PermissionGate Component
 * مكون لإخفاء/عرض العناصر حسب الصلاحيات
 */

import React from 'react';
import { useModulePermissions } from '../../hooks/useModulePermissions';
import { LockClosedIcon } from '@heroicons/react/24/outline';

// ==================== Types ====================
interface PermissionGateProps {
    /** Module code to check */
    module: string;
    /** Required action(s) - can be single action or array */
    action?: string | string[];
    /** If true, requires ALL actions. If false, requires ANY action */
    requireAll?: boolean;
    /** Children to render if permitted */
    children: React.ReactNode;
    /** Fallback to render if not permitted (optional) */
    fallback?: React.ReactNode;
    /** Show a "no permission" message instead of hiding */
    showMessage?: boolean;
    /** Custom message to show */
    message?: string;
}

interface NcrStageGateProps {
    /** NCR stage code */
    stage: string;
    /** Required action(s) */
    action?: string | string[];
    /** If true, requires ALL actions */
    requireAll?: boolean;
    /** Children to render if permitted */
    children: React.ReactNode;
    /** Fallback to render if not permitted */
    fallback?: React.ReactNode;
}

// ==================== Permission Gate ====================
export const PermissionGate: React.FC<PermissionGateProps> = ({
    module,
    action,
    requireAll = false,
    children,
    fallback = null,
    showMessage = false,
    message = 'ليس لديك صلاحية للوصول لهذا المحتوى',
}) => {
    const { canAccess, canPerform, canPerformAll, canPerformAny, loading } = useModulePermissions();

    // While loading, show nothing or a placeholder
    if (loading) {
        return null;
    }

    // Check if user can access the module
    if (!canAccess(module)) {
        if (showMessage) {
            return <NoPermissionMessage message={message} />;
        }
        return <>{fallback}</>;
    }

    // If no specific action required, just check module access
    if (!action) {
        return <>{children}</>;
    }

    // Check specific actions
    const actions = Array.isArray(action) ? action : [action];
    const hasPermission = requireAll
        ? canPerformAll(module, actions)
        : canPerformAny(module, actions);

    if (!hasPermission) {
        if (showMessage) {
            return <NoPermissionMessage message={message} />;
        }
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

// ==================== NCR Stage Gate ====================
export const NcrStageGate: React.FC<NcrStageGateProps> = ({
    stage,
    action,
    requireAll = false,
    children,
    fallback = null,
}) => {
    const { canPerformNcrAction, loading } = useModulePermissions();

    if (loading) {
        return null;
    }

    // If no action specified, just render children
    if (!action) {
        return <>{children}</>;
    }

    const actions = Array.isArray(action) ? action : [action];
    const hasPermission = requireAll
        ? actions.every(a => canPerformNcrAction(stage, a))
        : actions.some(a => canPerformNcrAction(stage, a));

    if (!hasPermission) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

// ==================== No Permission Message ====================
const NoPermissionMessage: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center p-8 text-center" dir="rtl">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <LockClosedIcon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">{message}</p>
    </div>
);

// ==================== HOC Version ====================
export function withPermission<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    module: string,
    action?: string | string[],
    requireAll?: boolean
) {
    return function PermissionWrappedComponent(props: P) {
        return (
            <PermissionGate module={module} action={action} requireAll={requireAll}>
                <WrappedComponent {...props} />
            </PermissionGate>
        );
    };
}

// ==================== Button with Permission ====================
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    module: string;
    action: string;
    children: React.ReactNode;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
    module,
    action,
    children,
    disabled,
    title,
    ...props
}) => {
    const { canPerform, loading } = useModulePermissions();
    const hasPermission = canPerform(module, action);

    return (
        <button
            {...props}
            disabled={disabled || loading || !hasPermission}
            title={!hasPermission ? 'ليس لديك صلاحية لهذا الإجراء' : title}
        >
            {children}
        </button>
    );
};

export default PermissionGate;









