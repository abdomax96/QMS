/**
 * Optimistic Lock Service
 * خدمة القفل المتفائل لمنع فقدان البيانات
 * 
 * Prevents data loss from concurrent edits by tracking entity versions
 * and detecting conflicts before they cause overwrites.
 */

import { supabase } from '../config/supabase';

// ==================== Types ====================

export interface VersionedEntity {
    id: string;
    version: number;
    last_modified_by?: string;
    last_modified_at?: string;
}

export interface ConflictError {
    type: 'VERSION_CONFLICT';
    entityId: string;
    entityType: string;
    currentVersion: number;
    expectedVersion: number;
    lastModifiedBy?: string;
    lastModifiedAt?: string;
    message: string;
}

export interface UpdateResult<T> {
    success: boolean;
    data?: T;
    error?: ConflictError | { type: string; message: string };
}

export type EntityType =
    | 'folders'
    | 'form_templates'
    | 'form_instances'
    | 'ncrs'
    | 'raw_materials'
    | 'suppliers'
    | 'products'
    | 'material_receiving'
    | 'lab_tests';

// ==================== Service ====================

class OptimisticLockService {
    /**
     * Get current version of an entity
     */
    async getVersion(table: EntityType, id: string): Promise<number | null> {
        const versionColumn = 'version';

        const { data, error } = await supabase
            .from(table)
            .select(versionColumn)
            .eq('id', id)
            .single();

        if (error || !data) {
            return null;
        }

        return data[versionColumn];
    }

    /**
     * Update with optimistic locking
     * @param table - Table name
     * @param id - Entity ID
     * @param expectedVersion - Version the client expects
     * @param updates - Fields to update
     * @returns UpdateResult with success/failure and data or conflict info
     */
    async updateWithLock<T>(
        table: EntityType,
        id: string,
        expectedVersion: number,
        updates: Partial<T>
    ): Promise<UpdateResult<T>> {
        const versionColumn = 'version';

        try {
            // First, check current version
            const currentVersion = await this.getVersion(table, id);

            if (currentVersion === null) {
                return {
                    success: false,
                    error: {
                        type: 'ENTITY_NOT_FOUND',
                        message: 'Entity not found'
                    }
                };
            }

            if (currentVersion !== expectedVersion) {
                // Get more details about who modified it
                const { data: entityData } = await supabase
                    .from(table)
                    .select('last_modified_by, last_modified_at')
                    .eq('id', id)
                    .single();

                return {
                    success: false,
                    error: {
                        type: 'VERSION_CONFLICT',
                        entityId: id,
                        entityType: table,
                        currentVersion,
                        expectedVersion,
                        lastModifiedBy: entityData?.last_modified_by,
                        lastModifiedAt: entityData?.last_modified_at,
                        message: 'Entity was modified by another user. Please refresh and try again.'
                    }
                };
            }

            // Perform update with version check in WHERE clause
            const { data, error } = await supabase
                .from(table)
                .update(updates)
                .eq('id', id)
                .eq(versionColumn, expectedVersion)
                .select()
                .single();

            if (error) {
                console.error('[OptimisticLock] Update error:', error);
                return {
                    success: false,
                    error: {
                        type: 'UPDATE_FAILED',
                        message: error.message
                    }
                };
            }

            if (!data) {
                // Race condition - version changed between check and update
                return {
                    success: false,
                    error: {
                        type: 'VERSION_CONFLICT',
                        entityId: id,
                        entityType: table,
                        currentVersion: currentVersion + 1,
                        expectedVersion,
                        message: 'Entity was modified during the update. Please refresh and try again.'
                    }
                };
            }

            return {
                success: true,
                data: data as T
            };
        } catch (err) {
            console.error('[OptimisticLock] Exception:', err);
            return {
                success: false,
                error: {
                    type: 'EXCEPTION',
                    message: err instanceof Error ? err.message : 'Unknown error'
                }
            };
        }
    }

    /**
     * Upsert with optimistic locking for existing records
     */
    async upsertWithLock<T extends { id: string }>(
        table: EntityType,
        data: T & { version?: number }
    ): Promise<UpdateResult<T>> {
        const versionColumn = 'version';

        // Check if entity exists
        const currentVersion = await this.getVersion(table, data.id);

        if (currentVersion === null) {
            // New entity - just insert
            const { data: inserted, error } = await supabase
                .from(table)
                .insert({ ...data, [versionColumn]: 1 })
                .select()
                .single();

            if (error) {
                return {
                    success: false,
                    error: { type: 'INSERT_FAILED', message: error.message }
                };
            }

            return { success: true, data: inserted as T };
        }

        // Existing entity - use optimistic lock
        const expectedVersion = data.version ?? currentVersion;
        const { version: _, ...updates } = data;

        return this.updateWithLock<T>(table, data.id, expectedVersion, updates as Partial<T>);
    }

    /**
     * Delete with version check
     */
    async deleteWithLock(
        table: EntityType,
        id: string,
        expectedVersion: number
    ): Promise<UpdateResult<void>> {
        const versionColumn = 'version';

        const currentVersion = await this.getVersion(table, id);

        if (currentVersion === null) {
            return {
                success: false,
                error: { type: 'ENTITY_NOT_FOUND', message: 'Entity not found' }
            };
        }

        if (currentVersion !== expectedVersion) {
            return {
                success: false,
                error: {
                    type: 'VERSION_CONFLICT',
                    entityId: id,
                    entityType: table,
                    currentVersion,
                    expectedVersion,
                    message: 'Entity was modified. Cannot delete outdated version.'
                }
            };
        }

        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id)
            .eq(versionColumn, expectedVersion);

        if (error) {
            return {
                success: false,
                error: { type: 'DELETE_FAILED', message: error.message }
            };
        }

        return { success: true };
    }

    /**
     * Check if entity is stale (version mismatch)
     */
    async isStale(table: EntityType, id: string, clientVersion: number): Promise<boolean> {
        const serverVersion = await this.getVersion(table, id);
        return serverVersion !== null && serverVersion !== clientVersion;
    }

    /**
     * Get entity with version info
     */
    async getWithVersion<T>(table: EntityType, id: string): Promise<(T & VersionedEntity) | null> {
        const versionColumn = 'version';

        const { data, error } = await supabase
            .from(table)
            .select('*, ' + versionColumn)
            .eq('id', id)
            .single();

        if (error || !data) {
            return null;
        }



        return data as T & VersionedEntity;
    }
}

export const optimisticLockService = new OptimisticLockService();
export default optimisticLockService;













