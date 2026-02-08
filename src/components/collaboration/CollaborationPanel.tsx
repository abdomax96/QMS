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

import React from 'react';
import { cn } from '../../utils';
import type { PresenceUser } from '../../services/realtimeCollaborationService';

interface CollaborationPanelProps {
    /** List of active users */
    activeUsers: PresenceUser[];
    /** Connection status */
    isConnected: boolean;
    /** CSS class name */
    className?: string;
}

/**
 * Panel showing real-time collaboration status
 */
export function CollaborationPanel({
    activeUsers,
    isConnected,
    className,
}: CollaborationPanelProps) {
    // Don't show if not connected and no users
    if (!isConnected && activeUsers.length === 0) {
        return null;
    }

    return (
        <div
            className={cn(
                'fixed top-20 left-4 z-50 max-w-xs',
                'print:hidden',
                className
            )}
        >
            {/* Connection Status Badge */}
            <div
                className={cn(
                    'mb-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm',
                    'flex items-center gap-2 w-fit',
                    isConnected
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                )}
            >
                <span
                    className={cn(
                        'w-2 h-2 rounded-full',
                        isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    )}
                />
                <span>{isConnected ? 'متصل' : 'غير متصل'}</span>
            </div>

            {/* Active Users List */}
            {activeUsers.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg
                                className="w-4 h-4 text-blue-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                            <span>المتعاونون ({activeUsers.length})</span>
                        </h3>
                    </div>

                    {/* Users List */}
                    <div className="max-h-64 overflow-y-auto">
                        {activeUsers.map((user, index) => (
                            <div
                                key={user.user_id}
                                className={cn(
                                    'px-4 py-3 flex items-center gap-3',
                                    'hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors',
                                    index !== activeUsers.length - 1 &&
                                    'border-b border-gray-100 dark:border-gray-700'
                                )}
                            >
                                {/* Avatar */}
                                <div
                                    className={cn(
                                        'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold',
                                        'bg-gradient-to-br',
                                        getAvatarColor(index)
                                    )}
                                    title={user.user_name}
                                >
                                    {getInitials(user.user_name)}
                                </div>

                                {/* User Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {user.user_name}
                                    </div>
                                    {user.current_cell && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                            <svg
                                                className="w-3 h-3"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                                />
                                            </svg>
                                            <span>
                                                يحرر: {user.current_cell.tableId}[
                                                {user.current_cell.rowIndex},{user.current_cell.colIndex}
                                                ]
                                            </span>
                                        </div>
                                    )}
                                    {!user.current_cell && (
                                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                            يشاهد
                                        </div>
                                    )}
                                </div>

                                {/* Online Indicator */}
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
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

export default CollaborationPanel;
