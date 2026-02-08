/**
 * Module Permissions Service
 * خدمة لإدارة صلاحيات الموديولز وتوزيعها
 */

import { supabase } from '../config/supabase';

// ==================== Types ====================
export interface AppModule {
    id: string;
    code: string;
    name: string;
    name_ar: string;
    description?: string;
    icon: string;
    color: string;
    is_active: boolean;
    display_order: number;
    available_actions: string[];
    data_isolation_mode: 'shared' | 'isolated' | 'hybrid';
    created_at: string;
}

export interface DepartmentModuleAccess {
    id: string;
    department_id: string;
    module_code: string;
    stage_code?: string | null;
    is_enabled: boolean;
    granted_actions: string[];
    custom_isolation_mode?: 'shared' | 'isolated' | 'hybrid';
    created_at: string;
    updated_at: string;
}

export interface NcrWorkflowStage {
    id: string;
    stage_code: string;
    stage_name: string;
    stage_name_ar: string;
    description?: string;
    display_order: number;
    is_active: boolean;
}

export interface NcrStagePermission {
    id: string;
    role_id: string;
    stage_code: string;
    allowed_actions: string[];
    can_advance: boolean;
    can_return: boolean;
    is_active: boolean;
}

function mapRoleStageToNcrStagePermission(row: {
    id: string;
    role_id: string | null;
    stage_code: string;
    allowed_actions: string[] | null;
    can_advance: boolean | null;
    can_return: boolean | null;
    is_active: boolean | null;
}): NcrStagePermission | null {
    if (!row.role_id || !row.stage_code) return null;

    return {
        id: row.id,
        role_id: row.role_id,
        stage_code: row.stage_code,
        allowed_actions: (row.allowed_actions || []).length > 0 ? (row.allowed_actions || []) : ['view'],
        can_advance: Boolean(row.can_advance),
        can_return: Boolean(row.can_return),
        is_active: Boolean(row.is_active ?? true),
    };
}

export interface RoleModulePermission {
    id: string;
    role_id: string;
    module_code: string;
    granted_actions: string[];
    can_see_all_departments: boolean;
}

export interface DocumentShare {
    id: string;
    document_id: string;
    document_type: string;
    shared_by_user_id: string;
    shared_with_user_id?: string;
    shared_with_department_id?: string;
    permission_level: 'view' | 'edit' | 'full';
    expires_at?: string;
    created_at: string;
}

// ==================== Module Service ====================
export const moduleService = {
    // Get all modules
    async getAll(): Promise<AppModule[]> {
        const { data, error } = await supabase
            .from('app_modules')
            .select('id, code, name, name_ar, description, icon, color, is_active, display_order, available_actions, data_isolation_mode, created_at')
            .order('display_order');

        if (error) throw error;
        return data || [];
    },

    // Get active modules only
    async getActive(): Promise<AppModule[]> {
        const { data, error } = await supabase
            .from('app_modules')
            .select('id, code, name, name_ar, description, icon, color, is_active, display_order, available_actions, data_isolation_mode, created_at')
            .eq('is_active', true)
            .order('display_order');

        if (error) throw error;
        return data || [];
    },

    // Update module settings
    async update(code: string, updates: Partial<AppModule>): Promise<AppModule> {
        const { data, error } = await supabase
            .from('app_modules')
            .update(updates)
            .eq('code', code)
            .select()
            .single();

        if (error) throw error;
        return data;
    },
};

// ==================== Department Module Access Service ====================
export const departmentModuleService = {
    // Get all access records for a department
    async getByDepartment(departmentId: string): Promise<DepartmentModuleAccess[]> {
        const { data, error } = await supabase
            .from('department_module_access')
            .select('id, department_id, module_code, is_enabled, granted_actions, custom_isolation_mode, created_at, updated_at')
            .eq('department_id', departmentId);

        if (error) throw error;
        return data || [];
    },

    // Get all access records for a module
    async getByModule(moduleCode: string): Promise<DepartmentModuleAccess[]> {
        const { data, error } = await supabase
            .from('department_module_access')
            .select('id, department_id, module_code, is_enabled, granted_actions, custom_isolation_mode, created_at, updated_at')
            .eq('module_code', moduleCode);

        if (error) throw error;
        return data || [];
    },

    // Get all access records
    async getAll(): Promise<DepartmentModuleAccess[]> {
        const { data, error } = await supabase
            .from('department_module_access')
            .select('id, department_id, module_code, is_enabled, granted_actions, custom_isolation_mode, created_at, updated_at');

        if (error) throw error;
        return data || [];
    },

    // Upsert access (create or update)
    async upsert(access: Partial<DepartmentModuleAccess> & { department_id: string; module_code: string }): Promise<DepartmentModuleAccess> {
        const { data: existing, error: existingError } = await supabase
            .from('department_module_access')
            .select('id')
            .eq('department_id', access.department_id)
            .eq('module_code', access.module_code)
            .is('stage_code', null)
            .maybeSingle();

        if (existingError) throw existingError;

        const payload = {
            ...access,
            stage_code: null,
            updated_at: new Date().toISOString(),
        };

        if (existing?.id) {
            const { data, error } = await supabase
                .from('department_module_access')
                .update(payload)
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        }

        const { data, error } = await supabase
            .from('department_module_access')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Enable module for department
    async enable(departmentId: string, moduleCode: string, actions: string[] = ['view']): Promise<DepartmentModuleAccess> {
        return this.upsert({
            department_id: departmentId,
            module_code: moduleCode,
            is_enabled: true,
            granted_actions: actions,
        });
    },

    // Disable module for department
    async disable(departmentId: string, moduleCode: string): Promise<DepartmentModuleAccess> {
        return this.upsert({
            department_id: departmentId,
            module_code: moduleCode,
            is_enabled: false,
        });
    },

    // Set isolation mode
    async setIsolationMode(departmentId: string, moduleCode: string, mode: 'shared' | 'isolated' | 'hybrid'): Promise<DepartmentModuleAccess> {
        return this.upsert({
            department_id: departmentId,
            module_code: moduleCode,
            custom_isolation_mode: mode,
        });
    },

    // Delete access
    async delete(departmentId: string, moduleCode: string): Promise<void> {
        const { error } = await supabase
            .from('department_module_access')
            .delete()
            .eq('department_id', departmentId)
            .eq('module_code', moduleCode);

        if (error) throw error;
    },
};

// ==================== NCR Workflow Service ====================
export const ncrWorkflowService = {
    // Get all stages
    async getStages(): Promise<NcrWorkflowStage[]> {
        const { data, error } = await supabase
            .from('ncr_workflow_stages')
            .select('id, code, name, name_ar, description, stage_order, color, is_active')
            .order('stage_order');

        if (error) throw error;
        return data || [];
    },

    // Get active stages
    async getActiveStages(): Promise<NcrWorkflowStage[]> {
        const { data, error } = await supabase
            .from('ncr_workflow_stages')
            .select('id, code, name, name_ar, description, stage_order, color, is_active')
            .eq('is_active', true)
            .order('stage_order');

        if (error) throw error;
        return data || [];
    },

    // Get permissions for role
    async getPermissionsForRole(roleId: string): Promise<NcrStagePermission[]> {
        const { data, error } = await supabase
            .from('ncr_stage_permissions')
            .select('id, role_id, stage_code, allowed_actions, can_advance, can_return, is_active')
            .eq('role_id', roleId)
            .is('department_id', null)
            .eq('is_active', true);

        if (error) throw error;
        return (data || [])
            .map(mapRoleStageToNcrStagePermission)
            .filter((row): row is NcrStagePermission => Boolean(row));
    },

    // Backward compatibility shim after moving NCR stage permissions to roles only.
    async getPermissionsForDepartment(_departmentId: string): Promise<NcrStagePermission[]> {
        return [];
    },

    // Get all permissions
    async getAllPermissions(): Promise<NcrStagePermission[]> {
        const { data, error } = await supabase
            .from('ncr_stage_permissions')
            .select('id, role_id, stage_code, allowed_actions, can_advance, can_return, is_active')
            .is('department_id', null)
            .eq('is_active', true);

        if (error) throw error;
        return (data || [])
            .map(mapRoleStageToNcrStagePermission)
            .filter((row): row is NcrStagePermission => Boolean(row));
    },

    // Upsert stage permission
    async upsertPermission(permission: Partial<NcrStagePermission> & { role_id: string; stage_code: string }): Promise<NcrStagePermission> {
        const { data: existing, error: existingError } = await supabase
            .from('ncr_stage_permissions')
            .select('id')
            .eq('role_id', permission.role_id)
            .eq('stage_code', permission.stage_code)
            .is('department_id', null)
            .maybeSingle();

        if (existingError) throw existingError;

        const payload = {
            role_id: permission.role_id,
            department_id: null,
            stage_code: permission.stage_code,
            is_active: permission.is_active ?? true,
            allowed_actions: Array.from(new Set((permission.allowed_actions || ['view']).filter(Boolean))),
            can_advance: Boolean(permission.can_advance),
            can_return: Boolean(permission.can_return),
        };

        if (existing?.id) {
            const { data, error } = await supabase
                .from('ncr_stage_permissions')
                .update(payload)
                .eq('id', existing.id)
                .select('id, role_id, stage_code, allowed_actions, can_advance, can_return, is_active')
                .single();

            if (error) throw error;
            const mapped = mapRoleStageToNcrStagePermission(data);
            if (!mapped) throw new Error('Failed to map updated NCR stage permission');
            return mapped;
        }

        const { data, error } = await supabase
            .from('ncr_stage_permissions')
            .insert(payload)
            .select('id, role_id, stage_code, allowed_actions, can_advance, can_return, is_active')
            .single();

        if (error) throw error;
        const mapped = mapRoleStageToNcrStagePermission(data);
        if (!mapped) throw new Error('Failed to map created NCR stage permission');
        return mapped;
    },

    // Bulk update permissions for role
    async bulkUpdateForRole(roleId: string, permissions: Array<{ stage_code: string; allowed_actions: string[]; can_advance: boolean; can_return: boolean }>): Promise<void> {
        for (const permission of permissions) {
            await this.upsertPermission({
                role_id: roleId,
                stage_code: permission.stage_code,
                allowed_actions: permission.allowed_actions,
                can_advance: permission.can_advance,
                can_return: permission.can_return,
                is_active: true,
            });
        }
    },

    // Backward compatibility shim after moving NCR stage permissions to roles only.
    async bulkUpdateForDepartment(_departmentId: string, _permissions: Array<{ stage_code: string; allowed_actions: string[]; can_advance: boolean; can_return: boolean }>): Promise<void> {
        return;
    },
};

// ==================== Role Module Permissions Service ====================
export const roleModuleService = {
    // Get permissions for role
    async getByRole(roleId: string): Promise<RoleModulePermission[]> {
        const { data, error } = await supabase
            .from('role_module_permissions')
            .select('id, role_id, module_code, granted_actions, can_see_all_departments')
            .eq('role_id', roleId);

        if (error) throw error;
        return data || [];
    },

    // Get all permissions
    async getAll(): Promise<RoleModulePermission[]> {
        const { data, error } = await supabase
            .from('role_module_permissions')
            .select('id, role_id, module_code, granted_actions, can_see_all_departments');

        if (error) throw error;
        return data || [];
    },

    // Upsert permission
    async upsert(permission: Partial<RoleModulePermission> & { role_id: string; module_code: string }): Promise<RoleModulePermission> {
        const { data, error } = await supabase
            .from('role_module_permissions')
            .upsert(permission, {
                onConflict: 'role_id,module_code'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Set actions for role on module
    async setActions(roleId: string, moduleCode: string, actions: string[]): Promise<RoleModulePermission> {
        return this.upsert({
            role_id: roleId,
            module_code: moduleCode,
            granted_actions: actions,
        });
    },

    // Grant full access
    async grantFullAccess(roleId: string, moduleCode: string, canSeeAll: boolean = false): Promise<RoleModulePermission> {
        const module = await supabase
            .from('app_modules')
            .select('available_actions')
            .eq('code', moduleCode)
            .single();

        return this.upsert({
            role_id: roleId,
            module_code: moduleCode,
            granted_actions: module.data?.available_actions || ['view', 'create', 'edit', 'delete'],
            can_see_all_departments: canSeeAll,
        });
    },

    // Revoke all access
    async revokeAccess(roleId: string, moduleCode: string): Promise<void> {
        const { error } = await supabase
            .from('role_module_permissions')
            .delete()
            .eq('role_id', roleId)
            .eq('module_code', moduleCode);

        if (error) throw error;
    },
};

// ==================== Document Share Service ====================
export const documentShareService = {
    // Share document with user
    async shareWithUser(
        documentId: string,
        documentType: string,
        sharedByUserId: string,
        targetUserId: string,
        permissionLevel: 'view' | 'edit' | 'full' = 'view',
        expiresAt?: Date
    ): Promise<DocumentShare> {
        const { data, error } = await supabase
            .from('document_shares')
            .upsert({
                document_id: documentId,
                document_type: documentType,
                shared_by_user_id: sharedByUserId,
                shared_with_user_id: targetUserId,
                permission_level: permissionLevel,
                expires_at: expiresAt?.toISOString(),
            }, {
                onConflict: 'document_id,shared_with_user_id'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Share document with department
    async shareWithDepartment(
        documentId: string,
        documentType: string,
        sharedByUserId: string,
        targetDepartmentId: string,
        permissionLevel: 'view' | 'edit' | 'full' = 'view',
        expiresAt?: Date
    ): Promise<DocumentShare> {
        const { data, error } = await supabase
            .from('document_shares')
            .upsert({
                document_id: documentId,
                document_type: documentType,
                shared_by_user_id: sharedByUserId,
                shared_with_department_id: targetDepartmentId,
                permission_level: permissionLevel,
                expires_at: expiresAt?.toISOString(),
            }, {
                onConflict: 'document_id,shared_with_department_id'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Get shares for document
    async getSharesForDocument(documentId: string): Promise<DocumentShare[]> {
        const { data, error } = await supabase
            .from('document_shares')
            .select('id, document_id, document_type, shared_by, shared_with_user_id, shared_with_department_id, permission_level, expires_at, is_active, created_at')
            .eq('document_id', documentId);

        if (error) throw error;
        return data || [];
    },

    // Get documents shared with user
    async getSharedWithUser(userId: string): Promise<DocumentShare[]> {
        const { data, error } = await supabase
            .from('document_shares')
            .select('id, document_id, document_type, shared_by, shared_with_user_id, shared_with_department_id, permission_level, expires_at, is_active, created_at')
            .eq('shared_with_user_id', userId)
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

        if (error) throw error;
        return data || [];
    },

    // Get documents shared with department
    async getSharedWithDepartment(departmentId: string): Promise<DocumentShare[]> {
        const { data, error } = await supabase
            .from('document_shares')
            .select('id, document_id, document_type, shared_by, shared_with_user_id, shared_with_department_id, permission_level, expires_at, is_active, created_at')
            .eq('shared_with_department_id', departmentId)
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

        if (error) throw error;
        return data || [];
    },

    // Revoke share
    async revoke(shareId: string): Promise<void> {
        const { error } = await supabase
            .from('document_shares')
            .delete()
            .eq('id', shareId);

        if (error) throw error;
    },

    // Check if user has access to document
    async checkAccess(documentId: string, userId: string, userDepartmentIds: string[]): Promise<{ hasAccess: boolean; permissionLevel: 'view' | 'edit' | 'full' | null }> {
        // Check direct share
        const { data: userShare } = await supabase
            .from('document_shares')
            .select('permission_level')
            .eq('document_id', documentId)
            .eq('shared_with_user_id', userId)
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .single();

        if (userShare) {
            return { hasAccess: true, permissionLevel: userShare.permission_level as any };
        }

        // Check department shares
        if (userDepartmentIds.length > 0) {
            const { data: deptShares } = await supabase
                .from('document_shares')
                .select('permission_level')
                .eq('document_id', documentId)
                .in('shared_with_department_id', userDepartmentIds)
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

            if (deptShares && deptShares.length > 0) {
                // Return highest permission level
                const levels = ['view', 'edit', 'full'];
                const maxLevel = deptShares.reduce((max, share) => {
                    const idx = levels.indexOf(share.permission_level);
                    return idx > levels.indexOf(max) ? share.permission_level : max;
                }, 'view');
                return { hasAccess: true, permissionLevel: maxLevel as any };
            }
        }

        return { hasAccess: false, permissionLevel: null };
    },
};

export default {
    modules: moduleService,
    departmentModules: departmentModuleService,
    ncrWorkflow: ncrWorkflowService,
    roleModules: roleModuleService,
    documentShares: documentShareService,
};









