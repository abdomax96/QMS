/**
 * Permission Service - Backend-Enforced Authorization
 * 
 * SECURITY CRITICAL: This service provides server-side permission validation.
 * All permission checks should go through this service, not frontend-only logic.
 * 
 * Features:
 * - Server-side permission validation via Supabase RPC
 * - Hierarchical permission checks
 * - Audit logging for admin actions
 * - Cache with invalidation
 */

import { supabase } from '../config/supabase';

// ============ Types ============

export interface PermissionCheckResult {
    allowed: boolean;
    reason?: string;
    requiredPermissions?: string[];
}

export interface AuditLogEntry {
    id: string;
    changedBy: string;
    changedByEmail: string;
    changedByRoles: string[];
    targetTable: string;
    action: string;
    targetRoleId?: string;
    targetRoleName?: string;
    targetUserId?: string;
    targetUserEmail?: string;
    permissionCode?: string;
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    reason?: string;
    createdAt: string;
}

// ============ Permission Cache ============

interface CacheEntry {
    result: boolean;
    timestamp: number;
}

const permissionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5000; // 5 seconds - reduced to minimize stale permission window

function getCacheKey(userId: string, permission: string): string {
    return `${userId}:${permission}`;
}

function getCachedPermission(userId: string, permission: string): boolean | null {
    const key = getCacheKey(userId, permission);
    const entry = permissionCache.get(key);

    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
        return entry.result;
    }

    // Cache expired or not found
    permissionCache.delete(key);
    return null;
}

function setCachedPermission(userId: string, permission: string, result: boolean): void {
    const key = getCacheKey(userId, permission);
    permissionCache.set(key, { result, timestamp: Date.now() });
}

export function invalidatePermissionCache(userId?: string): void {
    if (userId) {
        // Invalidate all permissions for specific user
        for (const key of permissionCache.keys()) {
            if (key.startsWith(`${userId}:`)) {
                permissionCache.delete(key);
            }
        }
    } else {
        // Clear entire cache
        permissionCache.clear();
    }
}

// ============ Server-Side Permission Checks ============

/**
 * Check if user has a specific permission (server-validated)
 * This is the primary method for permission checks after initial load.
 */
export async function checkPermission(
    permission: string,
    userId?: string
): Promise<PermissionCheckResult> {
    try {
        // Get current user if not specified
        if (!userId) {
            const { data: { session } } = await supabase.auth.getSession();
            userId = session?.user?.id;
        }

        if (!userId) {
            return { allowed: false, reason: 'No authenticated user' };
        }

        // Check cache first
        const cached = getCachedPermission(userId, permission);
        if (cached !== null) {
            return { allowed: cached };
        }

        // Call server-side check
        const { data, error } = await supabase.rpc('check_user_permission', {
            p_permission: permission,
            p_user_id: userId
        });

        if (error) {
            console.error('[PermissionService] RPC error:', error);
            // Fail-safe: deny on error
            return { allowed: false, reason: error.message };
        }

        const allowed = data === true;
        setCachedPermission(userId, permission, allowed);

        return { allowed };
    } catch (err) {
        console.error('[PermissionService] Check failed:', err);
        return { allowed: false, reason: 'Permission check failed' };
    }
}

/**
 * Check permission with hierarchical validation
 * Ensures all prerequisite permissions are also present.
 */
export async function checkPermissionWithHierarchy(
    permission: string,
    userId?: string
): Promise<PermissionCheckResult> {
    try {
        if (!userId) {
            const { data: { session } } = await supabase.auth.getSession();
            userId = session?.user?.id;
        }

        if (!userId) {
            return { allowed: false, reason: 'No authenticated user' };
        }

        const { data, error } = await supabase.rpc('check_permission_hierarchy', {
            p_permission: permission,
            p_user_id: userId
        });

        if (error) {
            console.error('[PermissionService] Hierarchy check error:', error);
            return { allowed: false, reason: error.message };
        }

        return { allowed: data === true };
    } catch (err) {
        console.error('[PermissionService] Hierarchy check failed:', err);
        return { allowed: false, reason: 'Hierarchy check failed' };
    }
}

/**
 * Check multiple permissions at once
 * Returns true only if ALL permissions are granted.
 */
export async function checkAllPermissions(
    permissions: string[],
    userId?: string
): Promise<PermissionCheckResult> {
    const results = await Promise.all(
        permissions.map(p => checkPermission(p, userId))
    );

    const allAllowed = results.every(r => r.allowed);
    const denied = permissions.filter((_, i) => !results[i].allowed);

    return {
        allowed: allAllowed,
        requiredPermissions: denied.length > 0 ? denied : undefined
    };
}

/**
 * Check if user has ANY of the specified permissions
 */
export async function checkAnyPermission(
    permissions: string[],
    userId?: string
): Promise<PermissionCheckResult> {
    const results = await Promise.all(
        permissions.map(p => checkPermission(p, userId))
    );

    const anyAllowed = results.some(r => r.allowed);

    return { allowed: anyAllowed };
}

// ============ Audit Logging ============

/**
 * Log an admin action with context
 * Used for operations that need explicit audit trails beyond automatic triggers.
 */
export async function logAdminAction(
    action: string,
    targetTable: string,
    options?: {
        targetId?: string;
        details?: Record<string, unknown>;
        reason?: string;
    }
): Promise<{ success: boolean; logId?: string; error?: string }> {
    try {
        const { data, error } = await supabase.rpc('log_admin_action', {
            p_action: action,
            p_target_table: targetTable,
            p_target_id: options?.targetId ?? null,
            p_details: options?.details ?? null,
            p_reason: options?.reason ?? null
        });

        if (error) {
            console.error('[PermissionService] Audit log error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, logId: data };
    } catch (err) {
        console.error('[PermissionService] Audit log failed:', err);
        return { success: false, error: 'Audit logging failed' };
    }
}

/**
 * Fetch audit log entries
 */
export async function getAuditLog(options?: {
    limit?: number;
    roleId?: string;
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
}): Promise<{ entries: AuditLogEntry[]; error?: string }> {
    try {
        let query = supabase
            .from('permission_audit_log')
            .select('id, changed_by, changed_by_email, changed_by_roles, target_table, action, target_role_id, target_role_name, target_user_id, target_user_email, permission_code, old_data, new_data, reason, created_at')
            .order('created_at', { ascending: false })
            .limit(options?.limit ?? 100);

        if (options?.roleId) {
            query = query.eq('target_role_id', options.roleId);
        }
        if (options?.userId) {
            query = query.eq('target_user_id', options.userId);
        }
        if (options?.action) {
            query = query.eq('action', options.action);
        }
        if (options?.startDate) {
            query = query.gte('created_at', options.startDate.toISOString());
        }
        if (options?.endDate) {
            query = query.lte('created_at', options.endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            return { entries: [], error: error.message };
        }

        const entries: AuditLogEntry[] = (data ?? []).map(row => ({
            id: row.id,
            changedBy: row.changed_by,
            changedByEmail: row.changed_by_email,
            changedByRoles: row.changed_by_roles ?? [],
            targetTable: row.target_table,
            action: row.action,
            targetRoleId: row.target_role_id,
            targetRoleName: row.target_role_name,
            targetUserId: row.target_user_id,
            targetUserEmail: row.target_user_email,
            permissionCode: row.permission_code,
            oldData: row.old_data,
            newData: row.new_data,
            reason: row.reason,
            createdAt: row.created_at
        }));

        return { entries };
    } catch (err) {
        console.error('[PermissionService] Fetch audit log failed:', err);
        return { entries: [], error: 'Failed to fetch audit log' };
    }
}

// ============ Role Management ============

/**
 * Check if the current user can assign a specific role to another user
 * Prevents privilege escalation.
 */
export async function canAssignRole(roleId: string): Promise<PermissionCheckResult> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
            return { allowed: false, reason: 'No authenticated user' };
        }

        // Get current user's highest priority (lowest number)
        const { data: userRoles } = await supabase
            .from('user_roles')
            .select('roles(priority, code)')
            .eq('user_id', session.user.id);

        // Super admin can assign any role
        const isSuperAdmin = userRoles?.some((ur: any) => ur.roles?.code === 'super_admin');
        if (isSuperAdmin) {
            return { allowed: true };
        }

        const userPriority = Math.min(
            ...(userRoles?.map((ur: any) => ur.roles?.priority ?? 999) ?? [999])
        );

        // Get target role's priority
        const { data: targetRole } = await supabase
            .from('roles')
            .select('priority')
            .eq('id', roleId)
            .single();

        if (!targetRole) {
            return { allowed: false, reason: 'Role not found' };
        }

        // Cannot assign role with equal or higher privilege
        if (targetRole.priority <= userPriority) {
            return {
                allowed: false,
                reason: `Cannot assign role with priority ${targetRole.priority} (your priority: ${userPriority})`
            };
        }

        return { allowed: true };
    } catch (err) {
        console.error('[PermissionService] Role assignment check failed:', err);
        return { allowed: false, reason: 'Role assignment check failed' };
    }
}

/**
 * Check if current user can modify a specific role
 */
export async function canModifyRole(roleId: string): Promise<PermissionCheckResult> {
    try {
        // Check if role is system/locked
        const { data: role } = await supabase
            .from('roles')
            .select('is_system, is_locked, priority, name')
            .eq('id', roleId)
            .single();

        if (!role) {
            return { allowed: false, reason: 'Role not found' };
        }

        if (role.is_locked || role.is_system) {
            return { allowed: false, reason: `Cannot modify system role: ${role.name}` };
        }

        // Check user has permission to manage permissions
        const permCheck = await checkPermission('settings.manage_permissions');
        if (!permCheck.allowed) {
            return { allowed: false, reason: 'Missing settings.manage_permissions' };
        }

        // Check user priority
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
            return { allowed: false, reason: 'No authenticated user' };
        }

        const { data: userRoles } = await supabase
            .from('user_roles')
            .select('roles(priority, code)')
            .eq('user_id', session.user.id);

        const isSuperAdmin = userRoles?.some((ur: any) => ur.roles?.code === 'super_admin');
        if (isSuperAdmin) {
            return { allowed: true };
        }

        const userPriority = Math.min(
            ...(userRoles?.map((ur: any) => ur.roles?.priority ?? 999) ?? [999])
        );

        if (role.priority <= userPriority) {
            return {
                allowed: false,
                reason: `Cannot modify role with higher privilege (role: ${role.priority}, you: ${userPriority})`
            };
        }

        return { allowed: true };
    } catch (err) {
        console.error('[PermissionService] Role modify check failed:', err);
        return { allowed: false, reason: 'Role modify check failed' };
    }
}

// ============ Subscription for Real-time Updates ============

/**
 * Subscribe to permission changes for cache invalidation
 */
export function subscribeToPermissionChanges(
    userId: string,
    onUpdate: () => void
): { unsubscribe: () => void } {
    const channel = supabase.channel(`permissions:${userId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'user_roles',
                filter: `user_id=eq.${userId}`
            },
            () => {
                invalidatePermissionCache(userId);
                onUpdate();
            }
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'role_module_permissions'
            },
            () => {
                invalidatePermissionCache(userId);
                onUpdate();
            }
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'department_module_access'
            },
            () => {
                invalidatePermissionCache(userId);
                onUpdate();
            }
        )
        .subscribe();

    return {
        unsubscribe: () => {
            supabase.removeChannel(channel);
        }
    };
}

// ============ Export Default ============

export default {
    checkPermission,
    checkPermissionWithHierarchy,
    checkAllPermissions,
    checkAnyPermission,
    logAdminAction,
    getAuditLog,
    canAssignRole,
    canModifyRole,
    invalidatePermissionCache,
    subscribeToPermissionChanges
};
