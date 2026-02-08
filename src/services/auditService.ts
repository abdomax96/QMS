/**
 * Audit Service
 * خدمة سجل التدقيق للامتثال التنظيمي
 * 
 * COMPLIANCE: 21 CFR Part 11, ISO 13485, ISO 9001
 * 
 * This service provides:
 * - Automatic audit logging for all CRUD operations
 * - Entity history retrieval
 * - Audit trail verification
 * - Compliance reporting
 */

import { supabase } from '../config/supabase';

// ==================== Types ====================

export type AuditAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'RESTORE'
    | 'ARCHIVE'
    | 'UNARCHIVE'
    | 'MOVE'
    | 'COPY'
    | 'APPROVE'
    | 'REJECT'
    | 'SUBMIT'
    | 'SIGN'
    | 'LOGIN'
    | 'LOGOUT'
    | 'PERMISSION_CHANGE';

export type AuditEntityType =
    | 'folder'
    | 'template_folder'
    | 'report_folder'
    | 'form_template'
    | 'form_instance'
    | 'user'
    | 'role'
    | 'permission'
    | 'ncr'
    | 'lab_test'
    | 'material_receiving'
    | 'raw_material'
    | 'supplier'
    | 'product';

export interface AuditEvent {
    id: string;
    action: AuditAction;
    entity_type: AuditEntityType;
    entity_id: string;
    entity_name?: string;
    user_id?: string;
    user_email?: string;
    user_name?: string;
    user_role?: string;
    timestamp: string;
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    changed_fields?: string[];
    reason?: string;
    parent_entity_type?: string;
    parent_entity_id?: string;
    metadata?: Record<string, any>;
    checksum: string;
    previous_checksum?: string;
    company_id?: string;
}

export interface AuditLogParams {
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    entityName?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    reason?: string;
    metadata?: Record<string, any>;
}

export interface AuditQueryParams {
    entityType?: AuditEntityType;
    entityId?: string;
    userId?: string;
    action?: AuditAction;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
}

// ==================== Service ====================

class AuditService {
    /**
     * Log an audit event
     * Note: Most audit events are logged automatically via database triggers.
     * Use this for custom events (login, logout, permission changes, etc.)
     */
    async logEvent(params: AuditLogParams): Promise<string | null> {
        try {
            const { data, error } = await supabase.rpc('log_audit_event', {
                p_action: params.action,
                p_entity_type: params.entityType,
                p_entity_id: params.entityId,
                p_entity_name: params.entityName || null,
                p_old_values: params.oldValues || null,
                p_new_values: params.newValues || null,
                p_reason: params.reason || null,
                p_metadata: params.metadata || {}
            });

            if (error) {
                console.error('[AuditService] Failed to log event:', error);
                return null;
            }

            return data;
        } catch (err) {
            console.error('[AuditService] Error logging event:', err);
            return null;
        }
    }

    /**
     * Log a login event
     */
    async logLogin(userId: string, userEmail: string): Promise<void> {
        await this.logEvent({
            action: 'LOGIN',
            entityType: 'user',
            entityId: userId,
            entityName: userEmail,
            metadata: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Log a logout event
     */
    async logLogout(userId: string, userEmail: string): Promise<void> {
        await this.logEvent({
            action: 'LOGOUT',
            entityType: 'user',
            entityId: userId,
            entityName: userEmail
        });
    }

    /**
     * Get audit history for a specific entity
     */
    async getEntityHistory(
        entityType: AuditEntityType,
        entityId: string,
        limit: number = 50
    ): Promise<AuditEvent[]> {
        try {
            const { data, error } = await supabase
                .from('audit_trail')
                .select('id, action, entity_type, entity_id, entity_name, user_id, user_email, user_name, timestamp, old_values, new_values, changed_fields, reason, metadata, company_id')
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .order('timestamp', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('[AuditService] Failed to get entity history:', error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error('[AuditService] Error getting entity history:', err);
            return [];
        }
    }

    /**
     * Query audit events with filters
     */
    async queryEvents(params: AuditQueryParams): Promise<AuditEvent[]> {
        try {
            let query = supabase
                .from('audit_trail')
                .select('id, action, entity_type, entity_id, entity_name, user_id, user_email, user_name, timestamp, old_values, new_values, changed_fields, reason, metadata, company_id')
                .order('timestamp', { ascending: false });

            if (params.entityType) {
                query = query.eq('entity_type', params.entityType);
            }
            if (params.entityId) {
                query = query.eq('entity_id', params.entityId);
            }
            if (params.userId) {
                query = query.eq('user_id', params.userId);
            }
            if (params.action) {
                query = query.eq('action', params.action);
            }
            if (params.fromDate) {
                query = query.gte('timestamp', params.fromDate);
            }
            if (params.toDate) {
                query = query.lte('timestamp', params.toDate);
            }
            if (params.limit) {
                query = query.limit(params.limit);
            }
            if (params.offset) {
                query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
            }

            const { data, error } = await query;

            if (error) {
                console.error('[AuditService] Failed to query events:', error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error('[AuditService] Error querying events:', err);
            return [];
        }
    }

    /**
     * Get recent audit events
     */
    async getRecentEvents(limit: number = 100): Promise<AuditEvent[]> {
        return this.queryEvents({ limit });
    }

    /**
     * Get audit events for a specific user
     */
    async getUserActivity(userId: string, limit: number = 50): Promise<AuditEvent[]> {
        return this.queryEvents({ userId, limit });
    }

    /**
     * Verify audit trail integrity
     */
    async verifyIntegrity(
        entityType?: AuditEntityType,
        entityId?: string
    ): Promise<{
        valid: boolean;
        totalRecords: number;
        invalidRecords: number;
        brokenChains: number;
        details: Array<{
            id: string;
            isValid: boolean;
            chainValid: boolean;
        }>;
    }> {
        try {
            const { data, error } = await supabase.rpc('verify_audit_trail_integrity', {
                p_entity_type: entityType || null,
                p_entity_id: entityId || null
            });

            if (error) {
                console.error('[AuditService] Integrity check failed:', error);
                return {
                    valid: false,
                    totalRecords: 0,
                    invalidRecords: 0,
                    brokenChains: 0,
                    details: []
                };
            }

            const results = data || [];
            const invalidRecords = results.filter((r: any) => !r.is_valid).length;
            const brokenChains = results.filter((r: any) => !r.chain_valid).length;

            return {
                valid: invalidRecords === 0 && brokenChains === 0,
                totalRecords: results.length,
                invalidRecords,
                brokenChains,
                details: results.map((r: any) => ({
                    id: r.audit_id,
                    entityType: r.audit_entity_type,
                    entityId: r.audit_entity_id,
                    timestamp: r.event_timestamp,
                    isValid: r.is_valid,
                    chainValid: r.chain_valid
                }))
            };
        } catch (err) {
            console.error('[AuditService] Error verifying integrity:', err);
            return {
                valid: false,
                totalRecords: 0,
                invalidRecords: 0,
                brokenChains: 0,
                details: []
            };
        }
    }

    /**
     * Generate compliance report
     */
    async generateComplianceReport(
        fromDate: string,
        toDate: string
    ): Promise<{
        period: { from: string; to: string };
        summary: {
            totalActions: number;
            actionBreakdown: Record<string, number>;
            entityBreakdown: Record<string, number>;
            activeUsers: number;
        };
        integrityCheck: {
            valid: boolean;
            totalRecords: number;
            invalidRecords: number;
        };
    }> {
        try {
            // Get all events in date range
            const events = await this.queryEvents({
                fromDate,
                toDate,
                limit: 10000
            });

            // Calculate breakdown
            const actionBreakdown: Record<string, number> = {};
            const entityBreakdown: Record<string, number> = {};
            const uniqueUsers = new Set<string>();

            events.forEach(event => {
                actionBreakdown[event.action] = (actionBreakdown[event.action] || 0) + 1;
                entityBreakdown[event.entity_type] = (entityBreakdown[event.entity_type] || 0) + 1;
                if (event.user_id) uniqueUsers.add(event.user_id);
            });

            // Verify integrity
            const integrity = await this.verifyIntegrity();

            return {
                period: { from: fromDate, to: toDate },
                summary: {
                    totalActions: events.length,
                    actionBreakdown,
                    entityBreakdown,
                    activeUsers: uniqueUsers.size
                },
                integrityCheck: {
                    valid: integrity.valid,
                    totalRecords: integrity.totalRecords,
                    invalidRecords: integrity.invalidRecords
                }
            };
        } catch (err) {
            console.error('[AuditService] Error generating compliance report:', err);
            throw err;
        }
    }

    /**
     * Get changes between two versions of an entity
     */
    getChangeDiff(
        oldValues: Record<string, any> | null,
        newValues: Record<string, any> | null
    ): Array<{ field: string; oldValue: any; newValue: any }> {
        if (!oldValues && !newValues) return [];

        const allKeys = new Set([
            ...Object.keys(oldValues || {}),
            ...Object.keys(newValues || {})
        ]);

        const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

        allKeys.forEach(key => {
            const oldVal = oldValues?.[key];
            const newVal = newValues?.[key];

            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                changes.push({
                    field: key,
                    oldValue: oldVal,
                    newValue: newVal
                });
            }
        });

        return changes;
    }
}

export const auditService = new AuditService();
export default auditService;

