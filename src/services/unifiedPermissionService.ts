/**
 * Unified Permission Service
 * 
 * SINGLE SOURCE OF TRUTH for all permission checks in the application.
 * 
 * SECURITY FEATURES:
 * - Database-only authority (no localStorage)
 * - Cache busting for write operations (create, edit, delete, approve)
 * - Audit logging for all permission denials
 * - Explicit admin permission check
 * - Structured error codes
 * 
 * @security This service must be used for ALL permission checks.
 */

import { supabase } from '../config/supabase';

// ==================== Types ====================

export interface PermissionCheckResult {
    allowed: boolean;
    error_code?: PermissionErrorCode;
    message?: string;
    message_ar?: string;
    details?: PermissionDetails;
}

export interface PermissionDetails {
    request_id: string;
    module_code: string;
    required_permission: string;
    timestamp: string;
    user_id?: string;
    cached?: boolean;
    audit_logged?: boolean;
}

export type PermissionErrorCode =
    | 'PERM_401_NOT_AUTHENTICATED'
    | 'PERM_403_MODULE_DENIED'
    | 'PERM_403_ACTION_DENIED'
    | 'PERM_403_ADMIN_REQUIRED'
    | 'PERM_403_ROLE_MISMATCH'
    | 'PERM_409_CONFLICT'
    | 'PERM_500_EVAL_ERROR'
    | 'PERM_422_INVALID_GRANT'
    | 'PERM_403_HIERARCHY_FAIL'
    | 'PERM_403_DEPT_ISOLATION'
    | 'PERM_403_STALE_CACHE';

// ==================== Error Messages ====================

const ERROR_MESSAGES: Record<PermissionErrorCode, { en: string; ar: string }> = {
    'PERM_401_NOT_AUTHENTICATED': {
        en: 'Authentication required to access this resource.',
        ar: 'يجب تسجيل الدخول للوصول لهذا المورد.'
    },
    'PERM_403_MODULE_DENIED': {
        en: 'You do not have access to this module.',
        ar: 'ليس لديك صلاحية للوصول لهذا الموديول.'
    },
    'PERM_403_ACTION_DENIED': {
        en: 'You do not have permission to perform this action.',
        ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'
    },
    'PERM_403_ADMIN_REQUIRED': {
        en: 'Administrator privileges required.',
        ar: 'مطلوب صلاحيات المسؤول.'
    },
    'PERM_403_ROLE_MISMATCH': {
        en: 'Your role does not have sufficient privileges.',
        ar: 'دورك لا يملك صلاحيات كافية.'
    },
    'PERM_409_CONFLICT': {
        en: 'Permission conflict detected.',
        ar: 'تم اكتشاف تعارض في الصلاحيات.'
    },
    'PERM_500_EVAL_ERROR': {
        en: 'Permission check failed. Please try again.',
        ar: 'فشل التحقق من الصلاحيات. يرجى المحاولة مرة أخرى.'
    },
    'PERM_422_INVALID_GRANT': {
        en: 'Invalid permission configuration.',
        ar: 'إعداد صلاحيات غير صالح.'
    },
    'PERM_403_HIERARCHY_FAIL': {
        en: 'Permission hierarchy violation.',
        ar: 'انتهاك تسلسل الصلاحيات.'
    },
    'PERM_403_DEPT_ISOLATION': {
        en: 'Access denied due to department restrictions.',
        ar: 'تم رفض الوصول بسبب قيود القسم.'
    },
    'PERM_403_STALE_CACHE': {
        en: 'Permission data outdated. Please refresh.',
        ar: 'بيانات الصلاحيات قديمة. يرجى التحديث.'
    }
};

// ==================== Write Actions (NO CACHE) ====================
// These actions are considered "write" operations and should NEVER use cache
const WRITE_ACTIONS = new Set(['create', 'edit', 'delete', 'approve', 'archive', 'sign', 'release']);

// ==================== Cache Configuration ====================

interface CacheEntry {
    result: boolean;
    timestamp: number;
}

const permissionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5000; // 5 seconds for read operations

function getCacheKey(userId: string, moduleCode: string, action: string): string {
    return `${userId}:${moduleCode}:${action}`;
}

function getCachedPermission(userId: string, moduleCode: string, action: string): boolean | null {
    // NEVER cache write operations
    if (WRITE_ACTIONS.has(action)) {
        return null;
    }

    const key = getCacheKey(userId, moduleCode, action);
    const entry = permissionCache.get(key);

    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
        return entry.result;
    }

    permissionCache.delete(key);
    return null;
}

function setCachedPermission(userId: string, moduleCode: string, action: string, result: boolean): void {
    // NEVER cache write operations
    if (WRITE_ACTIONS.has(action)) {
        return;
    }

    const key = getCacheKey(userId, moduleCode, action);
    permissionCache.set(key, { result, timestamp: Date.now() });
}

export function invalidateCache(userId?: string): void {
    if (userId) {
        for (const key of permissionCache.keys()) {
            if (key.startsWith(`${userId}:`)) {
                permissionCache.delete(key);
            }
        }
    } else {
        permissionCache.clear();
    }
}

/**
 * Bust cache on any permission mutation
 * Call this after any permission change operation
 */
export function bustPermissionCache(): void {
    permissionCache.clear();
    // Dispatch event for any React hooks to refresh
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('permissions-changed'));
    }
}

// ==================== Request ID Generation ====================

function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// ==================== Audit Logging ====================

interface AuditLogPayload {
    request_id: string;
    user_id: string;
    module_code: string;
    action: string;
    result: 'allowed' | 'denied';
    error_code?: PermissionErrorCode;
    timestamp: string;
    context?: Record<string, unknown>;
}

/**
 * Log permission check to audit trail
 * Only logs denials by default to reduce noise
 */
async function logPermissionAudit(payload: AuditLogPayload): Promise<void> {
    // Only log denials (they're security-relevant)
    if (payload.result === 'allowed') return;

    try {
        await supabase.from('permission_audit_log').insert({
            request_id: payload.request_id,
            changed_by: payload.user_id,
            target_table: payload.module_code,
            action: `${payload.action}_denied`,
            permission_code: `${payload.module_code}.${payload.action}`,
            old_data: { error_code: payload.error_code },
            changed_at: payload.timestamp,
        });
    } catch (err) {
        // Don't fail permission check if audit logging fails
        console.error('[Audit] Failed to log permission denial:', err);
    }
}

// ==================== Core Permission Check ====================

/**
 * The SINGLE function for all permission checks.
 * Uses database RPC - no client-side stores.
 * 
 * SECURITY: Write operations (create, edit, delete, approve) NEVER use cache.
 */
export async function checkPermission(
    moduleCode: string,
    action: string,
    options?: { userId?: string; skipCache?: boolean; skipAudit?: boolean }
): Promise<PermissionCheckResult> {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();

    try {
        // Get current user if not specified
        let userId = options?.userId;
        if (!userId) {
            const { data: { session } } = await supabase.auth.getSession();
            userId = session?.user?.id;
        }

        if (!userId) {
            return {
                allowed: false,
                error_code: 'PERM_401_NOT_AUTHENTICATED',
                message: ERROR_MESSAGES['PERM_401_NOT_AUTHENTICATED'].en,
                message_ar: ERROR_MESSAGES['PERM_401_NOT_AUTHENTICATED'].ar,
                details: {
                    request_id: requestId,
                    module_code: moduleCode,
                    required_permission: `${moduleCode}.${action}`,
                    timestamp,
                    cached: false,
                }
            };
        }

        // Check cache first (NEVER for write operations)
        const isWriteAction = WRITE_ACTIONS.has(action);
        if (!options?.skipCache && !isWriteAction) {
            const cached = getCachedPermission(userId, moduleCode, action);
            if (cached !== null) {
                return {
                    allowed: cached,
                    details: {
                        request_id: requestId,
                        module_code: moduleCode,
                        required_permission: `${moduleCode}.${action}`,
                        timestamp,
                        user_id: userId,
                        cached: true,
                    }
                };
            }
        }

        // Call database RPC
        const { data, error } = await supabase.rpc('check_user_permission', {
            user_uuid: userId,
            p_module_code: moduleCode,
            p_permission_code: action
        });

        if (error) {
            console.error('[UnifiedPermission] RPC error:', error);
            return {
                allowed: false,
                error_code: 'PERM_500_EVAL_ERROR',
                message: ERROR_MESSAGES['PERM_500_EVAL_ERROR'].en,
                message_ar: ERROR_MESSAGES['PERM_500_EVAL_ERROR'].ar,
                details: {
                    request_id: requestId,
                    module_code: moduleCode,
                    required_permission: `${moduleCode}.${action}`,
                    timestamp,
                    user_id: userId,
                    cached: false,
                }
            };
        }

        const allowed = data === true;

        // Cache result (but not for write actions)
        if (!isWriteAction) {
            setCachedPermission(userId, moduleCode, action, allowed);
        }

        // Audit log denials
        if (!allowed && !options?.skipAudit) {
            await logPermissionAudit({
                request_id: requestId,
                user_id: userId,
                module_code: moduleCode,
                action,
                result: 'denied',
                error_code: 'PERM_403_ACTION_DENIED',
                timestamp,
            });
        }

        if (!allowed) {
            return {
                allowed: false,
                error_code: 'PERM_403_ACTION_DENIED',
                message: ERROR_MESSAGES['PERM_403_ACTION_DENIED'].en,
                message_ar: ERROR_MESSAGES['PERM_403_ACTION_DENIED'].ar,
                details: {
                    request_id: requestId,
                    module_code: moduleCode,
                    required_permission: `${moduleCode}.${action}`,
                    timestamp,
                    user_id: userId,
                    cached: false,
                    audit_logged: true,
                }
            };
        }

        return {
            allowed: true,
            details: {
                request_id: requestId,
                module_code: moduleCode,
                required_permission: `${moduleCode}.${action}`,
                timestamp,
                user_id: userId,
                cached: false,
            }
        };
    } catch (err) {
        console.error('[UnifiedPermission] Check failed:', err);
        return {
            allowed: false,
            error_code: 'PERM_500_EVAL_ERROR',
            message: ERROR_MESSAGES['PERM_500_EVAL_ERROR'].en,
            message_ar: ERROR_MESSAGES['PERM_500_EVAL_ERROR'].ar,
            details: {
                request_id: requestId,
                module_code: moduleCode,
                required_permission: `${moduleCode}.${action}`,
                timestamp,
                cached: false,
            }
        };
    }
}

/**
 * Check for explicit admin permission
 * Uses dedicated system.admin permission - NOT inferred from other permissions
 */
export async function checkAdminPermission(options?: { userId?: string }): Promise<PermissionCheckResult> {
    const result = await checkPermission('system', 'admin', { ...options, skipCache: true });

    if (!result.allowed) {
        return {
            ...result,
            error_code: 'PERM_403_ADMIN_REQUIRED',
            message: ERROR_MESSAGES['PERM_403_ADMIN_REQUIRED'].en,
            message_ar: ERROR_MESSAGES['PERM_403_ADMIN_REQUIRED'].ar,
        };
    }

    return result;
}

/**
 * Check multiple permissions - ALL must be granted
 */
export async function checkAllPermissions(
    moduleCode: string,
    actions: string[],
    options?: { userId?: string }
): Promise<PermissionCheckResult> {
    const results = await Promise.all(
        actions.map(action => checkPermission(moduleCode, action, options))
    );

    const denied = results.filter(r => !r.allowed);
    if (denied.length > 0) {
        return denied[0]; // Return first denial
    }

    return { allowed: true };
}

/**
 * Check multiple permissions - ANY can be granted
 */
export async function checkAnyPermission(
    moduleCode: string,
    actions: string[],
    options?: { userId?: string }
): Promise<PermissionCheckResult> {
    const results = await Promise.all(
        actions.map(action => checkPermission(moduleCode, action, options))
    );

    const allowed = results.find(r => r.allowed);
    if (allowed) {
        return { allowed: true };
    }

    return results[0] || { allowed: false, error_code: 'PERM_403_ACTION_DENIED' };
}

/**
 * Check if user can access a module at all (has view permission)
 */
export async function checkModuleAccess(
    moduleCode: string,
    options?: { userId?: string }
): Promise<PermissionCheckResult> {
    return checkPermission(moduleCode, 'view', options);
}

// ==================== Permission Error Class ====================

export class PermissionError extends Error {
    public readonly error_code: PermissionErrorCode;
    public readonly details?: PermissionDetails;
    public readonly message_ar?: string;
    public readonly httpStatus: number = 403;

    constructor(result: PermissionCheckResult) {
        super(result.message || 'Permission denied');
        this.name = 'PermissionError';
        this.error_code = result.error_code || 'PERM_403_ACTION_DENIED';
        this.details = result.details;
        this.message_ar = result.message_ar;

        // Set HTTP status based on error code
        if (this.error_code === 'PERM_401_NOT_AUTHENTICATED') {
            this.httpStatus = 401;
        } else if (this.error_code === 'PERM_500_EVAL_ERROR') {
            this.httpStatus = 500;
        } else if (this.error_code === 'PERM_422_INVALID_GRANT') {
            this.httpStatus = 422;
        }
    }

    toJSON() {
        return {
            error_code: this.error_code,
            message: this.message,
            message_ar: this.message_ar,
            details: this.details,
            http_status: this.httpStatus,
        };
    }
}

/**
 * Throws an error if permission is denied
 * USE THIS for all backend/write operations
 */
export async function requirePermission(
    moduleCode: string,
    action: string,
    options?: { userId?: string }
): Promise<void> {
    // Always skip cache for requirePermission (used in write operations)
    const result = await checkPermission(moduleCode, action, { ...options, skipCache: true });
    if (!result.allowed) {
        throw new PermissionError(result);
    }
}

/**
 * Require admin permission
 * USE THIS for admin-only operations
 */
export async function requireAdmin(options?: { userId?: string }): Promise<void> {
    const result = await checkAdminPermission(options);
    if (!result.allowed) {
        throw new PermissionError(result);
    }
}

// ==================== Middleware Pattern ====================

/**
 * Permission middleware wrapper for async operations
 * Use this to wrap any function that requires permission
 */
export function withPermission<T extends (...args: any[]) => Promise<any>>(
    moduleCode: string,
    action: string,
    fn: T
): T {
    return (async (...args: Parameters<T>) => {
        await requirePermission(moduleCode, action);
        return fn(...args);
    }) as T;
}

/**
 * Admin middleware wrapper
 */
export function withAdmin<T extends (...args: any[]) => Promise<any>>(fn: T): T {
    return (async (...args: Parameters<T>) => {
        await requireAdmin();
        return fn(...args);
    }) as T;
}

// ==================== Default Export ====================

export default {
    checkPermission,
    checkAdminPermission,
    checkAllPermissions,
    checkAnyPermission,
    checkModuleAccess,
    requirePermission,
    requireAdmin,
    invalidateCache,
    bustPermissionCache,
    withPermission,
    withAdmin,
    PermissionError,
    WRITE_ACTIONS,
};
