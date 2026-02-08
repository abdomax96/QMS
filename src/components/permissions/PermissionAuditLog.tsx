/**
 * Permission Audit Log Component
 * Displays history of permission changes for compliance
 */

import React, { useState, useEffect } from 'react';
import {
    ClockIcon,
    ArrowPathIcon,
    FunnelIcon,
    PlusIcon,
    MinusIcon,
    UserIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../config/supabase';
import { TableSkeleton } from '../common/LoadingStates';
import type { PermissionAuditEntry } from '../../utils/permissionHierarchy';

interface PermissionAuditLogProps {
    roleId?: string;
    limit?: number;
}

export const PermissionAuditLog: React.FC<PermissionAuditLogProps> = ({
    roleId,
    limit = 50
}) => {
    const [entries, setEntries] = useState<PermissionAuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'grant' | 'revoke'>('all');

    const loadAuditLog = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('permission_audit_log')
                .select('id, changed_by, changed_by_email, target_role_id, target_role_name, permission_code, action, previous_state, new_state, changed_at, notes')
                .order('changed_at', { ascending: false })
                .limit(limit);

            if (roleId) {
                query = query.eq('target_role_id', roleId);
            }

            if (filter !== 'all') {
                query = query.eq('action', filter);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error loading audit log:', error);
                return;
            }

            setEntries(data?.map(e => ({
                id: e.id,
                changedBy: e.changed_by,
                changedByEmail: e.changed_by_email,
                targetRoleId: e.target_role_id,
                targetRoleName: e.target_role_name,
                permissionCode: e.permission_code,
                action: e.action,
                previousState: e.previous_state,
                newState: e.new_state,
                changedAt: e.changed_at,
                notes: e.notes
            })) || []);
        } catch (err) {
            console.error('Audit log error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAuditLog();
    }, [roleId, filter, limit]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getActionIcon = (action: string) => {
        if (action.includes('grant')) {
            return <PlusIcon className="w-4 h-4 text-green-500" />;
        }
        return <MinusIcon className="w-4 h-4 text-red-500" />;
    };

    const getActionBadge = (action: string) => {
        const isGrant = action.includes('grant');
        return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${isGrant
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                {isGrant ? 'GRANT' : 'REVOKE'}
            </span>
        );
    };

    if (loading) {
        return <TableSkeleton />;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                            Permission Change History
                        </h3>
                        <span className="text-xs text-gray-500">
                            ({entries.length} entries)
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <FunnelIcon className="w-4 h-4 text-gray-400" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as typeof filter)}
                            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 
                                       dark:bg-gray-700 dark:text-white"
                        >
                            <option value="all">All Changes</option>
                            <option value="grant">Grants Only</option>
                            <option value="revoke">Revokes Only</option>
                        </select>
                        <button
                            onClick={loadAuditLog}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                            title="Refresh"
                        >
                            <ArrowPathIcon className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Entries List */}
            <div className="max-h-96 overflow-y-auto">
                {entries.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <ClockIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No permission changes recorded</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {entries.map((entry) => (
                            <div
                                key={entry.id}
                                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                        {getActionIcon(entry.action)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {getActionBadge(entry.action)}
                                            <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono">
                                                {entry.permissionCode}
                                            </code>
                                            <span className="text-xs text-gray-500">→</span>
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                {entry.targetRoleName}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                            <UserIcon className="w-3 h-3" />
                                            <span>{entry.changedByEmail || 'System'}</span>
                                            <span>•</span>
                                            <span>{formatDate(entry.changedAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PermissionAuditLog;
