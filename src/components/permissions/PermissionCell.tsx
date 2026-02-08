/**
 * PermissionCell Component
 * Individual permission toggle in the matrix
 * Handles locked states, dependencies, and visual feedback
 */

import React, { memo } from 'react';
import {
    CheckIcon,
    LockClosedIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/solid';

export interface PermissionCellProps {
    roleId: string;
    permissionCode: string;
    isGranted: boolean;
    isLocked: boolean;
    isDisabled: boolean;
    missingDependencies: string[];
    onToggle: (roleId: string, permissionCode: string) => void;
    className?: string;
}

export const PermissionCell: React.FC<PermissionCellProps> = memo(({
    roleId,
    permissionCode,
    isGranted,
    isLocked,
    isDisabled,
    missingDependencies,
    onToggle,
    className = ''
}) => {
    const hasMissingDeps = missingDependencies.length > 0;

    const handleClick = () => {
        if (isLocked || isDisabled) return;
        onToggle(roleId, permissionCode);
    };

    // Determine cell state and styling
    let bgColor = 'bg-gray-100 dark:bg-gray-700';
    let textColor = 'text-gray-400';
    let icon: React.ReactNode = null;
    let cursor = 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600';

    if (isLocked) {
        bgColor = isGranted
            ? 'bg-green-600'
            : 'bg-gray-300 dark:bg-gray-600';
        textColor = isGranted ? 'text-white' : 'text-gray-500';
        icon = <LockClosedIcon className="w-3 h-3" />;
        cursor = 'cursor-not-allowed';
    } else if (isDisabled) {
        bgColor = 'bg-gray-200 dark:bg-gray-700';
        textColor = 'text-gray-400';
        cursor = 'cursor-not-allowed opacity-50';
    } else if (isGranted) {
        if (hasMissingDeps) {
            // Warning state: has permission but missing dependencies
            bgColor = 'bg-amber-500';
            textColor = 'text-white';
            icon = <ExclamationTriangleIcon className="w-3 h-3" />;
        } else {
            bgColor = 'bg-green-500 hover:bg-green-600';
            textColor = 'text-white';
            icon = <CheckIcon className="w-3 h-3" />;
        }
    }

    // Build tooltip content
    let tooltipContent = permissionCode;
    if (isLocked) {
        tooltipContent = `🔒 ${permissionCode} (System Protected)`;
    } else if (hasMissingDeps) {
        tooltipContent = `⚠️ ${permissionCode}\nRequires: ${missingDependencies.join(', ')}`;
    }

    return (
        <button
            onClick={handleClick}
            disabled={isLocked || isDisabled}
            title={tooltipContent}
            className={`
                w-6 h-6 rounded flex items-center justify-center 
                transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400
                ${bgColor} ${textColor} ${cursor} ${className}
            `}
            aria-label={`${isGranted ? 'Revoke' : 'Grant'} ${permissionCode} for role`}
        >
            {icon}
        </button>
    );
});

PermissionCell.displayName = 'PermissionCell';

export default PermissionCell;
