/**
 * Supabase Service
 * خدمات Supabase لاستبدال Firebase
 */

import { supabase } from '../config/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Folder, FormTemplate, FormInstance } from '../types';

// ==================== FOLDERS ====================

export const foldersService = {
    // Create or update a folder
    async saveFolder(folder: Folder): Promise<void> {
        // Helper function to convert empty strings to null for UUID fields
        const sanitizeUUID = (value: string | null | undefined): string | null => {
            if (!value || value.trim() === '') return null;
            return value;
        };

        const { error } = await supabase
            .from('unified_folders')
            .upsert({
                id: folder.id,
                name: folder.name,
                type: folder.type,
                icon: folder.icon,
                color: folder.color,
                parent_id: sanitizeUUID(folder.parent_id),
                path: folder.path,
                created_at: folder.created_at,
                created_by: sanitizeUUID(folder.created_by),
                updated_at: folder.modified_at || new Date().toISOString(),
                // permissions: folder.permissions, // Removed as column doesn't exist
                // metadata: folder.metadata, // Removed as column doesn't exist
                stats: folder.stats,
                is_system: folder.is_system,
                sort_order: folder.sort_order,
                description: folder.description || folder.metadata?.description,
                tags: folder.tags || folder.metadata?.tags
            });
        if (error) throw error;
    },

    // Get a single folder
    async getFolder(id: string): Promise<Folder | null> {
        const { data, error } = await supabase
            .from('unified_folders')
            .select('id, name, name_en, type, icon, color, parent_id, path, created_at, created_by, updated_at, stats, is_system, department_id, sort_order, description, tags')
            .eq('id', id)
            .maybeSingle();

        if (error || !data) return null;
        return this.mapToFolder(data);
    },

    // Get all folders - using REST API directly, with optional department filter
    async getAllFolders(departmentIds?: string[]): Promise<Record<string, Folder>> {
        console.log('[Supabase] Fetching folders via REST API...', departmentIds ? `(filtered by ${departmentIds.length} departments)` : '(no filter)');
        const startTime = Date.now();

        // Removed metadata and permissions from select, added tags
        let query = supabase.from('unified_folders').select('id, name, name_en, type, icon, color, parent_id, path, created_at, created_by, updated_at, stats, is_system, department_id, sort_order, description, tags');

        // Apply department filter if provided
        if (departmentIds && departmentIds.length > 0) {
            query = query.in('department_id', departmentIds);
        }

        const { data, error } = await query;

        console.log(`[Supabase] Folders query took ${Date.now() - startTime}ms`);

        if (error) {
            console.warn('[Supabase] Error fetching folders:', error.message);
            return {};
        }

        console.log(`[Supabase] Fetched ${data?.length || 0} folders`);
        const folders: Record<string, Folder> = {};
        data?.forEach((row: any) => {
            folders[row.id] = this.mapToFolder(row);
        });
        return folders;
    },

    // Delete a folder
    async deleteFolder(id: string): Promise<void> {
        const { error } = await supabase
            .from('unified_folders')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // Update a folder
    async updateFolder(id: string, updates: Partial<Folder>): Promise<void> {
        // Helper function to convert empty strings to null for UUID fields
        const sanitizeUUID = (value: string | null | undefined): string | null => {
            if (!value || value.trim() === '') return null;
            return value;
        };

        // Sanitize UUID fields in updates
        const sanitizedUpdates: any = { ...updates };
        if ('parent_id' in sanitizedUpdates) {
            sanitizedUpdates.parent_id = sanitizeUUID(sanitizedUpdates.parent_id as string) as any;
        }
        if ('created_by' in sanitizedUpdates) {
            sanitizedUpdates.created_by = sanitizeUUID(sanitizedUpdates.created_by as string) as any;
        }

        // Remove company_id if present
        if ('company_id' in sanitizedUpdates) {
            delete sanitizedUpdates.company_id;
        }

        // Remove metadata if present
        if ('metadata' in sanitizedUpdates) {
            // Extract description and tags if they are in metadata but not at root
            if (sanitizedUpdates.metadata) {
                if (sanitizedUpdates.metadata.description && !sanitizedUpdates.description) {
                    sanitizedUpdates.description = sanitizedUpdates.metadata.description;
                }
                if (sanitizedUpdates.metadata.tags && !sanitizedUpdates.tags) {
                    sanitizedUpdates.tags = sanitizedUpdates.metadata.tags;
                }
            }
            delete sanitizedUpdates.metadata;
        }

        const { error } = await supabase
            .from('unified_folders')
            .update({
                ...sanitizedUpdates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        if (error) throw error;
    },

    // Subscribe to folder changes in real-time
    subscribeToFolders(
        onInitial: (folders: Record<string, Folder>) => void,
        onDelta?: (payload: RealtimePostgresChangesPayload<any>) => void
    ): () => void {
        // Initial load
        this.getAllFolders().then(onInitial);

        // Real-time subscription
        const channel = supabase
            .channel('folders_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'unified_folders' },
                (payload) => {
                    if (onDelta) {
                        onDelta(payload);
                    } else {
                        this.getAllFolders().then(onInitial);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    // Map database row to Folder type
    mapToFolder(row: any): Folder {
        return {
            id: row.id,
            name: row.name,
            name_en: row.name_en || undefined,
            type: row.type || 'department',
            icon: row.icon || '',
            color: row.color || '#3B82F6',
            parent_id: row.parent_id,
            path: row.path || '',
            created_at: row.created_at,
            created_by: row.created_by || '',
            updated_at: row.updated_at,
            modified_at: row.updated_at,
            permissions: row.permissions || { owner: '', editors: [], viewers: [] },
            // Reconstruct metadata from flat fields
            metadata: {
                description: row.description || '',
                tags: row.tags || []
            },
            stats: row.stats || { form_templates_count: 0, reports_count: 0, storage_used_mb: 0 },
            is_system: row.is_system,
            company_id: undefined, // Not in DB
            department_id: row.department_id,
            sort_order: row.sort_order,
            description: row.description, // Keep root access if needed
            tags: row.tags // Keep root access if needed
        } as Folder;
    }
};

// ==================== FORM TEMPLATES ====================

export const templatesService = {
    // Create or update a template
    async saveTemplate(template: FormTemplate): Promise<void> {
        // Helper function to convert empty strings to null for UUID fields
        const sanitizeUUID = (value: string | null | undefined): string | null => {
            if (!value || value.trim() === '') return null;
            return value;
        };

        // ✅ FIX: Get department_id and user_id from current user's profile
        const { data: { user } } = await supabase.auth.getUser();
        let departmentId: string | null = null;
        let userId: string | null = null;

        if (user) {
            userId = user.id;
            const { data: profile } = await supabase
                .from('users')
                .select('department_id')
                .eq('id', user.id)
                .single();

            departmentId = profile?.department_id || null;
        }

        // LOGICAL FIX: We are using "Unified Folders", so folder_id from frontend 
        // actually refers to a unified_folder. We must map it to the correct column.
        const unifiedFolderId = sanitizeUUID(template.folder_id);

        // ✅ FIX: Extract company_id from basic_info if available
        const companyId = sanitizeUUID(template.basic_info?.company_id);

        const { error } = await supabase
            .from('form_templates')
            .upsert({
                id: template.id,
                name: template.name,
                name_en: template.name_en || null, // ✅ FIX: Save English name
                version: template.version,
                created_at: template.created_at,
                created_by: userId, // ✅ FIX: Save who created/modified
                type: template.type,
                status: 'active', // ✅ FIX: Set default status
                // Legacy folder_id is set to null to avoid FK violation with old folders table
                folder_id: null,
                // We write the actual ID to the new unified_folder_id column
                unified_folder_id: unifiedFolderId,
                template_type_config: template.template_type_config,
                custom_properties: template.custom_properties,
                basic_info: template.basic_info,
                document_control: template.document_control,
                batch_configuration: template.batch_configuration,
                custom_variables: template.custom_variables,
                sections: template.sections,
                quality_criteria: template.quality_criteria,
                notes: template.notes,
                signatures: template.signatures,
                recipe: template.recipe,
                // ✅ FIX: Always set company_id and department_id
                company_id: companyId,
                department_id: departmentId
            });
        if (error) throw error;
    },


    // Get a single template
    async getTemplate(id: string): Promise<FormTemplate | null> {
        const { data, error } = await supabase
            .from('form_templates')
            .select('id, name, name_en, version, created_at, type, folder_id, unified_folder_id, template_type_config, custom_properties, basic_info, document_control, batch_configuration, custom_variables, sections, quality_criteria, notes, signatures, recipe, archived, archived_at, archived_by')
            .eq('id', id)
            .single();
        if (error) return null;
        return this.mapToTemplate(data);
    },

    // Get all templates - using REST API directly
    async getAllTemplates(): Promise<Record<string, FormTemplate>> {
        console.log('[Supabase] Fetching templates via authenticated client...');
        const startTime = Date.now();

        // Using standard client to ensure user session (JWT) is sent for RLS
        const { data, error } = await supabase
            .from('form_templates')
            .select('id, name, name_en, version, created_at, type, folder_id, unified_folder_id, template_type_config, custom_properties, basic_info, document_control, batch_configuration, custom_variables, sections, quality_criteria, notes, signatures, recipe, archived, archived_at, archived_by');

        console.log(`[Supabase] Templates query took ${Date.now() - startTime}ms`);

        if (error) {
            console.warn('[Supabase] Error fetching templates:', error.message);
            return {};
        }

        console.log(`[Supabase] Fetched ${data?.length || 0} templates`);
        const templates: Record<string, FormTemplate> = {};
        data?.forEach((row: any) => {
            templates[row.id] = this.mapToTemplate(row);
        });
        return templates;
    },

    // Delete a template
    async deleteTemplate(id: string): Promise<void> {
        const { error } = await supabase
            .from('form_templates')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // Update a template
    async updateTemplate(id: string, updates: Partial<FormTemplate>): Promise<void> {
        // Helper function to convert empty strings to null for UUID fields
        const sanitizeUUID = (value: string | null | undefined): string | null => {
            if (!value || value.trim() === '') return null;
            return value;
        };

        // Sanitize UUID fields in updates
        const sanitizedUpdates: any = { ...updates };

        // Map folder_id update to unified_folder_id
        if ('folder_id' in sanitizedUpdates) {
            sanitizedUpdates.unified_folder_id = sanitizeUUID(sanitizedUpdates.folder_id as string);
            sanitizedUpdates.folder_id = null; // Clear legacy
        }

        const { error } = await supabase
            .from('form_templates')
            .update(sanitizedUpdates)
            .eq('id', id);
        if (error) throw error;
    },

    // Subscribe to template changes in real-time
    subscribeToTemplates(
        onInitial: (templates: Record<string, FormTemplate>) => void,
        onDelta?: (payload: RealtimePostgresChangesPayload<any>) => void
    ): () => void {
        this.getAllTemplates().then(onInitial);

        const channel = supabase
            .channel('templates_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'form_templates' },
                (payload) => {
                    if (onDelta) {
                        onDelta(payload);
                    } else {
                        this.getAllTemplates().then(onInitial);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    // Map database row to FormTemplate type
    mapToTemplate(row: any): FormTemplate {
        // LOGICAL FIX: Map unified_folder_id back to folder_id for frontend compatibility
        // The frontend expects "folder_id", but we know it's a unified folder now.
        const effectiveFolderId = row.unified_folder_id || row.folder_id;

        return {
            id: row.id,
            name: row.name,
            name_en: row.name_en || undefined,
            version: row.version || 1,
            created_at: row.created_at,
            type: row.type || 'quality-control',
            folder_id: effectiveFolderId,
            unified_folder_id: row.unified_folder_id, // Keep specific field if needed
            template_type_config: row.template_type_config || {},
            custom_properties: row.custom_properties || {},
            basic_info: row.basic_info,
            document_control: row.document_control,
            batch_configuration: row.batch_configuration,
            custom_variables: row.custom_variables,
            sections: row.sections || {},
            quality_criteria: row.quality_criteria,
            notes: row.notes,
            signatures: row.signatures,
            recipe: row.recipe,
            archived: row.archived || false,
            archived_at: row.archived_at,
            archived_by: row.archived_by
        };
    }
};

// ==================== FORM INSTANCES ====================

const normalizeReportDateKey = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.includes('T')) {
        return trimmed.split('T')[0] || '';
    }
    return trimmed;
};

const normalizeShiftKey = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value.trim().toUpperCase();
};

const toDisplayDate = (dateKey: string): string => {
    if (!dateKey) return new Date().toLocaleDateString('ar-EG');
    const parsed = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return dateKey;
    }
    return parsed.toLocaleDateString('ar-EG');
};

const buildBaseInstanceName = (instance: FormInstance, template?: FormTemplate): string => {
    const safeFormData = instance?.form_data && typeof instance.form_data === 'object'
        ? instance.form_data
        : {};

    const templateName =
        typeof template?.name === 'string' && template.name.trim()
            ? template.name.trim()
            : 'تقرير';
    const reportDateKey =
        normalizeReportDateKey((safeFormData as any).report_date) ||
        normalizeReportDateKey(instance.created_at);
    const shiftKey = normalizeShiftKey((safeFormData as any).shift);
    const dateLabel = toDisplayDate(reportDateKey);

    if (shiftKey) {
        return `${templateName} - ${dateLabel} - وردية ${shiftKey}`;
    }
    return `${templateName} - ${dateLabel}`;
};

const getNameSuffix = (candidateName: string, baseName: string): number => {
    if (candidateName === baseName) return 1;
    const match = candidateName.match(new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\((\\d+)\\)$`));
    if (!match) return 0;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 1 ? parsed : 0;
};

const resolveUniqueInstanceName = async (
    baseName: string,
    folderId: string | null,
    excludeInstanceId?: string
): Promise<string> => {
    let query = supabase
        .from('form_instances')
        .select('id, name');

    if (folderId) {
        query = query.or(`unified_folder_id.eq.${folderId},folder_id.eq.${folderId}`);
    } else {
        query = query.or('unified_folder_id.is.null,folder_id.is.null');
    }

    if (excludeInstanceId) {
        query = query.neq('id', excludeInstanceId);
    }

    const { data, error } = await query;
    if (error) {
        console.warn('[instancesService] Failed to resolve unique report name, using base name:', error.message);
        return baseName;
    }

    const names = (data || [])
        .map((row: any) => (typeof row?.name === 'string' ? row.name.trim() : ''))
        .filter(Boolean);

    if (!names.includes(baseName)) {
        return baseName;
    }

    let maxSuffix = 1;
    for (const candidate of names) {
        maxSuffix = Math.max(maxSuffix, getNameSuffix(candidate, baseName));
    }

    return `${baseName} (${maxSuffix + 1})`;
};

export const instancesService = {
    // Create or update an instance
    // Optional template parameter to ensure template exists before saving instance
    async saveInstance(instance: FormInstance, template?: FormTemplate): Promise<void> {
        // If template is provided, ensure it exists in database first (foreign key requirement)
        if (template) {
            await templatesService.saveTemplate(template);
        }

        // Helper function to convert empty strings to null for UUID fields
        const sanitizeUUID = (value: string | null | undefined): string | null => {
            if (!value || value.trim() === '') return null;
            return value;
        };

        // ✅ FIX: Get department_id and company_id from current user's profile
        const { data: { user } } = await supabase.auth.getUser();
        let departmentId: string | null = null;
        let companyId: string | null = null;

        if (user) {
            const { data: profile } = await supabase
                .from('users')
                .select('department_id, company_id')
                .eq('id', user.id)
                .single();

            departmentId = profile?.department_id || null;
            companyId = profile?.company_id || null;
        }

        // LOGICAL FIX: Map folder_id to unified_folder_id
        const unifiedFolderId = sanitizeUUID(instance.folder_id);

        // ✅ CRITICAL FIX: Check if record exists with non-draft status
        // This prevents INVALID_TRANSITION errors when Tab Store restores old IDs
        const { data: existingRecord } = await supabase
            .from('form_instances')
            .select('id, status, name')
            .eq('id', instance.instance_id)
            .maybeSingle();

        if (existingRecord && existingRecord.status !== 'draft') {
            // Record exists with non-draft status - skip save to prevent transition error
            console.warn(`⚠️ [saveInstance] Skipping save: Instance ${instance.instance_id} has status "${existingRecord.status}", cannot save as "${instance.status}"`);
            return; // Don't save - would cause INVALID_TRANSITION
        }

        const requestedName =
            typeof instance.name === 'string' && instance.name.trim()
                ? instance.name.trim()
                : null;
        const baseName = requestedName || buildBaseInstanceName(instance, template);
        const instanceName = existingRecord?.name && String(existingRecord.name).trim()
            ? String(existingRecord.name).trim()
            : await resolveUniqueInstanceName(baseName, unifiedFolderId, instance.instance_id);
        instance.name = instanceName;

        // DEBUG LOGGING
        console.log('[saveInstance] Saving instance:', {
            id: instance.instance_id,
            user_id: user?.id,
            instance_created_by: instance.created_by,
            sanitized_created_by: sanitizeUUID(instance.created_by),
            final_created_by: user ? user.id : sanitizeUUID(instance.created_by),
            departmentId,
            companyId
        });

        const { error } = await supabase
            .from('form_instances')
            .upsert({
                id: instance.instance_id,
                name: instanceName,
                template_id: sanitizeUUID(instance.template_id),
                template_version: instance.template_version,
                // Legacy folder_id set to null
                folder_id: null,
                // New unified_folder_id set
                unified_folder_id: unifiedFolderId,
                status: instance.status,
                created_at: instance.created_at,
                // ✅ FIX: Enforce created_by from session to ensure RLS ownership match
                created_by: user ? user.id : sanitizeUUID(instance.created_by),
                submitted_at: instance.submitted_at,
                submitted_by: sanitizeUUID(instance.submitted_by),
                form_data: instance.form_data,
                calculations: instance.calculations,
                signatures: instance.signatures,
                workflow: instance.workflow,
                // ✅ FIX: Always set department_id and company_id
                department_id: departmentId,
                company_id: companyId
            });
        if (error) {
            console.error('[saveInstance] Upsert error:', error);
            throw error;
        }
    },

    // Get a single instance
    async getInstance(
        id: string,
        options?: { throwOnError?: boolean }
    ): Promise<FormInstance | null> {
        const { data, error } = await supabase
            .from('form_instances')
            .select('id, name, template_id, template_version, folder_id, unified_folder_id, status, created_at, created_by, submitted_at, submitted_by, form_data, calculations, signatures, workflow, company_id, archived, archived_at, archived_by')
            .eq('id', id)
            .maybeSingle();
        if (error) {
            console.warn('[instancesService.getInstance] Failed to load instance', {
                id,
                code: (error as any)?.code,
                message: error.message,
                details: (error as any)?.details,
                hint: (error as any)?.hint,
            });
            if (options?.throwOnError) {
                throw error;
            }
            return null;
        }
        if (!data) {
            return null;
        }
        return this.mapToInstance(data);
    },

    // Get all instances - using REST API directly
    async getAllInstances(): Promise<Record<string, FormInstance>> {
        console.log('[Supabase] Fetching instances via authenticated client...');
        const startTime = Date.now();

        // Using standard client to ensure user session (JWT) is sent for RLS
        const { data, error } = await supabase
            .from('form_instances')
            .select('id, name, template_id, template_version, folder_id, unified_folder_id, status, created_at, created_by, submitted_at, submitted_by, form_data, calculations, signatures, workflow, company_id, archived, archived_at, archived_by');

        console.log(`[Supabase] Instances query took ${Date.now() - startTime}ms`);

        if (error) {
            console.warn('[Supabase] Error fetching instances:', error.message);
            return {};
        }

        console.log(`[Supabase] Fetched ${data?.length || 0} instances`);
        const instances: Record<string, FormInstance> = {};
        data?.forEach((row: any) => {
            instances[row.id] = this.mapToInstance(row);
        });
        return instances;
    },

    async findDuplicateReportsByDetails(params: {
        templateId: string;
        folderId: string | null;
        reportDate: string;
        shift: string;
        excludeInstanceId?: string;
    }): Promise<Array<{ id: string; name: string | null; status: string | null; created_at: string | null }>> {
        const normalizedDate = normalizeReportDateKey(params.reportDate);
        const normalizedShift = normalizeShiftKey(params.shift);

        if (!params.templateId || !normalizedDate) {
            return [];
        }

        let query = supabase
            .from('form_instances')
            .select('id, name, status, created_at, template_id, form_data, archived')
            .eq('template_id', params.templateId);

        if (params.folderId) {
            query = query.or(`unified_folder_id.eq.${params.folderId},folder_id.eq.${params.folderId}`);
        } else {
            query = query.or('unified_folder_id.is.null,folder_id.is.null');
        }

        if (params.excludeInstanceId) {
            query = query.neq('id', params.excludeInstanceId);
        }

        const { data, error } = await query;
        if (error) {
            console.warn('[instancesService] Duplicate details check failed:', error.message);
            return [];
        }

        return (data || [])
            .filter((row: any) => row?.archived !== true)
            .filter((row: any) => {
                const rowFormData = row?.form_data && typeof row.form_data === 'object' ? row.form_data : {};
                const rowDate = normalizeReportDateKey(rowFormData.report_date);
                const rowShift = normalizeShiftKey(rowFormData.shift);

                return rowDate === normalizedDate && rowShift === normalizedShift;
            })
            .map((row: any) => ({
                id: row.id,
                name: row.name ?? null,
                status: row.status ?? null,
                created_at: row.created_at ?? null,
            }));
    },

    // Delete an instance
    // Primary path: hard delete (item is already captured in recycle_bin snapshot).
    // Fallback path: soft archive flags only (without status transition) for strict DB policies.
    async deleteInstance(id: string): Promise<void> {
        const { error: deleteError } = await supabase
            .from('form_instances')
            .delete()
            .eq('id', id);

        if (!deleteError) {
            return;
        }

        console.warn('Hard delete failed, falling back to soft archive flags:', deleteError);

        // IMPORTANT: do not set status='archived' here because workflow trigger
        // only allows approved->archived transitions.
        const { error: fallbackUpdateError } = await supabase
            .from('form_instances')
            .update({
                archived: true,
                archived_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (fallbackUpdateError) {
            console.error('Soft archive fallback failed:', fallbackUpdateError);
            throw fallbackUpdateError;
        }
    },

    // Update an instance
    async updateInstance(id: string, updates: Partial<FormInstance>): Promise<void> {
        // Filter out fields that don't exist in database
        const { attachments, instance_id, ...dbUpdatesRaw } = updates as any;
        const dbUpdates: any = { ...dbUpdatesRaw };

        // LOGICAL FIX: Map folder_id to unified_folder_id if present
        if ('folder_id' in dbUpdates) {
            dbUpdates.unified_folder_id = dbUpdates.folder_id ? dbUpdates.folder_id : null;
            dbUpdates.folder_id = null;
        }

        const { error } = await supabase
            .from('form_instances')
            .update(dbUpdates)
            .eq('id', id);
        if (error) throw error;
    },

    // Subscribe to instance changes in real-time
    subscribeToInstances(
        onInitial: (instances: Record<string, FormInstance>) => void,
        onDelta?: (payload: RealtimePostgresChangesPayload<any>) => void
    ): () => void {
        this.getAllInstances().then(onInitial);

        const channel = supabase
            .channel('instances_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'form_instances' },
                (payload) => {
                    if (onDelta) {
                        onDelta(payload);
                    } else {
                        this.getAllInstances().then(onInitial);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    // Map database row to FormInstance type
    mapToInstance(row: any): FormInstance {
        // LOGICAL FIX: Map unified_folder_id back to folder_id
        const effectiveFolderId = row.unified_folder_id || row.folder_id;

        const instance: FormInstance = {
            name: row.name || undefined,
            instance_id: row.id,
            template_id: row.template_id,
            template_version: row.template_version || '1.0',
            folder_id: effectiveFolderId, // Frontend sees this
            status: row.status || 'draft',
            created_at: row.created_at,
            created_by: row.created_by || '',
            submitted_at: row.submitted_at,
            submitted_by: row.submitted_by,
            form_data: row.form_data || { report_date: '', sections: {} },
            calculations: row.calculations,
            signatures: row.signatures,
            attachments: [], // Not stored in database yet
            workflow: row.workflow,
            archived: row.archived || false,
            archived_at: row.archived_at,
            archived_by: row.archived_by
        };

        return instance;
    }
};

// ==================== BATCH OPERATIONS ====================

export const batchService = {
    // Load all data from Supabase
    async loadAllData(): Promise<{
        folders: Record<string, Folder>;
        templates: Record<string, FormTemplate>;
        instances: Record<string, FormInstance>;
    }> {
        const [folders, templates, instances] = await Promise.all([
            foldersService.getAllFolders(),
            templatesService.getAllTemplates(),
            instancesService.getAllInstances()
        ]);
        return { folders, templates, instances };
    }
};

// Default export for backwards compatibility
const supabaseService = {
    folders: foldersService,
    templates: templatesService,
    instances: instancesService,
    batch: batchService
};

export default supabaseService;
