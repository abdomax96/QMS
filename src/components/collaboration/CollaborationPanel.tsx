/**
 * CollaborationPanel Component
 * لوحة التعاون في الوقت الفعلي
 * 
 * Displays:
 * - Connection status
 * - Active users list
 * - Each user's current activity
 * 
 * @author QMS Development Team
 * @date 2026-01-22
 */

import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '../../utils';
import type { PresenceUser } from '../../services/realtimeCollaborationService';
import type { CollaborationConnectionStatus } from '../../hooks/useFormCollaboration';

export interface CollaborationActivityItem {
    id: string;
    changedByName: string;
    changedAt: string;
    scope: 'cell' | 'table_notes' | 'basic_field' | 'section' | 'other';
    description: string;
    details?: string;
    sectionId?: string | null;
    tableId?: string | null;
    rowIndex?: number | null;
    colIndex?: number | null;
    changePath?: string[] | null;
}

interface CollaborationPanelProps {
    /** List of active users */
    activeUsers: PresenceUser[];
    /** Connection status */
    isConnected: boolean;
    /** Detailed connection status */
    connectionStatus?: CollaborationConnectionStatus;
    /** Retry count */
    reconnectAttempt?: number;
    /** Trigger immediate reconnect */
    onReconnect?: () => void;
    /** Recent collaboration activity */
    activityItems?: CollaborationActivityItem[];
    /** Handle click on activity item (navigate to change location) */
    onActivityItemClick?: (item: CollaborationActivityItem) => void;
    /** CSS class name */
    className?: string;
}

/**
 * Panel showing real-time collaboration status
 */
export function CollaborationPanel({
    activeUsers,
    isConnected,
    connectionStatus: _connectionStatus,
    reconnectAttempt: _reconnectAttempt = 0,
    onReconnect: _onReconnect,
    activityItems = [],
    onActivityItemClick,
    className,
}: CollaborationPanelProps) {
    const [isActivityVisible, setIsActivityVisible] = useState(false);

    const uniqueActiveUsers = useMemo(() => {
        const byUser = new Map<string, PresenceUser>();

        activeUsers.forEach((user, index) => {
            const userId = String(user?.user_id || '').trim();
            const fallbackKey = `anon:${index}`;
            const key = userId || fallbackKey;
            const existing = byUser.get(key);

            if (!existing) {
                byUser.set(key, user);
                return;
            }

            const existingTs = Date.parse(existing.joined_at || '');
            const nextTs = Date.parse(user.joined_at || '');
            if (!Number.isNaN(nextTs) && (Number.isNaN(existingTs) || nextTs > existingTs)) {
                byUser.set(key, user);
            }
        });

        return Array.from(byUser.values());
    }, [activeUsers]);

    useEffect(() => {
        if (activityItems.length === 0 && isActivityVisible) {
            setIsActivityVisible(false);
        }
    }, [activityItems.length, isActivityVisible]);

    // Don't show if no signal to display
    if (!isConnected && uniqueActiveUsers.length === 0 && activityItems.length === 0) {
        return null;
    }

    return (
        <div
            className={cn(
                'relative z-20 w-full max-w-xs px-3 pt-2 pb-1',
                'print:hidden',
                className
            )}
        >
            {(uniqueActiveUsers.length > 0 || activityItems.length > 0) && (
                <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center min-w-0">
                        {uniqueActiveUsers.slice(0, 8).map((user, index) => (
                            <div
                                key={`${user.user_id || 'user'}:${user.joined_at || index}:${index}`}
                                className={cn(
                                    'relative group',
                                    index > 0 && '-ml-1.5 sm:-ml-2'
                                )}
                            >
                                <div
                                    className={cn(
                                        'w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white dark:border-gray-900 shadow-sm',
                                        'overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center'
                                    )}
                                    title={user.user_name || 'مستخدم'}
                                >
                                    {user.user_avatar ? (
                                        <img
                                            src={user.user_avatar}
                                            alt={user.user_name || 'User avatar'}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div
                                            className={cn(
                                                'w-full h-full flex items-center justify-center text-white text-[10px] sm:text-xs font-bold',
                                                'bg-gradient-to-br',
                                                getAvatarColor(index)
                                            )}
                                        >
                                            {getInitials(user.user_name || 'مستخدم')}
                                        </div>
                                    )}
                                </div>

                                <div
                                    className={cn(
                                        'pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2',
                                        'px-2 py-1 rounded-md text-[11px] whitespace-nowrap',
                                        'bg-gray-900 text-white shadow-lg',
                                        'opacity-0 group-hover:opacity-100 transition-opacity duration-150'
                                    )}
                                >
                                    {user.user_name || 'مستخدم'}
                                </div>
                            </div>
                        ))}

                        {uniqueActiveUsers.length > 8 && (
                            <div
                                className={cn(
                                    'relative -ml-1.5 sm:-ml-2 w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white dark:border-gray-900',
                                    'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200',
                                    'text-[10px] sm:text-xs font-bold flex items-center justify-center shadow-sm'
                                )}
                                title={`+${uniqueActiveUsers.length - 8} مستخدم`}
                            >
                                +{uniqueActiveUsers.length - 8}
                            </div>
                        )}
                    </div>

                    {activityItems.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setIsActivityVisible((prev) => !prev)}
                            title={isActivityVisible ? 'إخفاء آخر التعديلات' : 'إظهار آخر التعديلات'}
                            className={cn(
                                'w-8 h-8 rounded-full border shadow-sm shrink-0',
                                'flex items-center justify-center transition-colors',
                                'bg-white dark:bg-gray-800',
                                'border-gray-200 dark:border-gray-700',
                                'text-gray-600 dark:text-gray-300',
                                'hover:bg-gray-50 dark:hover:bg-gray-700'
                            )}
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </button>
                    )}
                </div>
            )}

            {activityItems.length > 0 && isActivityVisible && (
                <div className="absolute left-0 top-full mt-1 min-w-[280px] max-w-[90vw] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                            آخر التعديلات
                        </h3>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                        {activityItems.map((item, index) => (
                            (() => {
                                const isNavigable =
                                    Boolean(onActivityItemClick) && isNavigableActivityItem(item);
                                const content = (
                                    <>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white truncate">
                                                {item.changedByName}
                                            </span>
                                            <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {formatTime(item.changedAt)}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-gray-600 dark:text-gray-300">
                                            {item.description}
                                        </div>
                                        {item.details && (
                                            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400" dir="ltr">
                                                {item.details}
                                            </div>
                                        )}
                                    </>
                                );
                                const rowClassName = cn(
                                    'px-4 py-2.5 text-xs w-full text-right',
                                    index !== activityItems.length - 1 &&
                                        'border-b border-gray-100 dark:border-gray-700',
                                    isNavigable &&
                                        'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors'
                                );

                                if (isNavigable) {
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => onActivityItemClick?.(item)}
                                            className={rowClassName}
                                            title="الانتقال إلى الخلية المعدلة"
                                        >
                                            {content}
                                        </button>
                                    );
                                }

                                return (
                                    <div key={item.id} className={rowClassName}>
                                        {content}
                                    </div>
                                );
                            })()
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function isNavigableActivityItem(item: CollaborationActivityItem): boolean {
    return (
        item.scope === 'cell' &&
        Boolean(item.sectionId) &&
        Boolean(item.tableId) &&
        typeof item.rowIndex === 'number' &&
        Number.isInteger(item.rowIndex) &&
        item.rowIndex >= 0 &&
        typeof item.colIndex === 'number' &&
        Number.isInteger(item.colIndex) &&
        item.colIndex >= 0
    );
}

/**
 * Get user initials from name
 */
function getInitials(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

/**
 * Get avatar color based on index
 */
function getAvatarColor(index: number): string {
    const colors = [
        'from-blue-500 to-blue-600',
        'from-green-500 to-green-600',
        'from-purple-500 to-purple-600',
        'from-orange-500 to-orange-600',
        'from-pink-500 to-pink-600',
        'from-indigo-500 to-indigo-600',
        'from-teal-500 to-teal-600',
        'from-red-500 to-red-600',
    ];
    return colors[index % colors.length];
}

function formatTime(isoString: string): string {
    if (!isoString) {
        return '--:--';
    }

    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
        return '--:--';
    }

    return date.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default CollaborationPanel;
