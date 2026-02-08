// ==================== RBAC Store ====================
// Enterprise-Grade Role-Based Access Control State Management

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../config/supabase';
import type {
  Role,
  Module,
  Permission,
  PermissionAction,
  PermissionMatrixUIState,
  PendingPermissionChange,
  PermissionChangeLog,
  RoleConflict,
  UserRoleAssignment,
  UserEffectivePermissions,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  RoleCategory,
  ModuleCategory,
  ConflictResolutionStrategy,
  RolePermissionMatrix,
} from '../types/rbac';
import {
  DEFAULT_SYSTEM_ROLES,
  SYSTEM_MODULES,
  PERMISSION_ACTIONS,
  PERMISSION_HIERARCHY,
  createFullPermissionMatrix,
} from '../constants/rbac';

// ==================== Store Interface ====================
interface RBACStore {
  // Data
  roles: Role[];
  modules: Module[];
  permissions: Permission[];
  roleConflicts: RoleConflict[];
  userRoleAssignments: UserRoleAssignment[];
  auditLog: PermissionChangeLog[];

  // UI State
  uiState: PermissionMatrixUIState;

  // Settings
  conflictResolution: ConflictResolutionStrategy;

  // Role Actions
  getRoleById: (id: string) => Role | undefined;
  getRoleByCode: (code: string) => Role | undefined;
  getRolesByCategory: (category: RoleCategory) => Role[];
  createRole: (role: Omit<Role, 'id' | 'created_at' | 'updated_at'>) => Role;
  updateRole: (id: string, updates: Partial<Role>) => void;
  deleteRole: (id: string) => boolean;
  duplicateRole: (id: string, newName: string, newCode: string) => Role | null;
  deprecateRole: (id: string, replacementRoleId?: string, message?: string) => void;

  // Permission Actions
  getPermissionForRole: (roleId: string, moduleCode: string, action: PermissionAction) => boolean;
  setPermission: (roleId: string, moduleCode: string, action: PermissionAction, granted: boolean) => void;
  bulkSetPermissions: (roleId: string, moduleCode: string, permissions: Partial<Record<PermissionAction, boolean>>) => void;
  copyPermissionsFromRole: (sourceRoleId: string, targetRoleId: string) => void;
  resetRoleToDefault: (roleId: string) => void;

  // Permission Validation
  validatePermissionMatrix: (roleId: string) => ValidationResult;
  checkPermissionDependencies: (moduleCode: string, action: PermissionAction) => PermissionAction[];

  // User Role Management
  assignRoleToUser: (userId: string, roleId: string, assignedBy: string, expiresAt?: string, reason?: string) => void;
  removeRoleFromUser: (userId: string, roleId: string) => void;
  getUserRoles: (userId: string) => Role[];
  getUserEffectivePermissions: (userId: string) => UserEffectivePermissions;

  // Permission Checking
  hasPermission: (userId: string, moduleCode: string, action: PermissionAction) => boolean;
  canUserPerform: (userId: string, moduleCode: string, actions: PermissionAction[]) => boolean;

  // Audit
  logPermissionChange: (change: Omit<PermissionChangeLog, 'id' | 'changed_at'>) => void;
  getAuditLogForRole: (roleId: string) => PermissionChangeLog[];

  // UI Actions
  setUIState: (updates: Partial<PermissionMatrixUIState>) => void;
  toggleCategoryExpanded: (category: ModuleCategory) => void;
  toggleModuleExpanded: (moduleCode: string) => void;
  addPendingChange: (change: Omit<PendingPermissionChange, 'timestamp'>) => void;
  clearPendingChanges: () => void;
  applyPendingChanges: (userId: string, reason?: string) => Promise<void>;

  // Comparison
  compareRoles: (roleIdA: string, roleIdB: string) => {
    onlyInA: Array<{ module: string; action: PermissionAction }>;
    onlyInB: Array<{ module: string; action: PermissionAction }>;
    common: Array<{ module: string; action: PermissionAction }>;
  };

  // Import/Export
  exportRoles: () => string;
  importRoles: (data: string) => { success: boolean; imported: number; errors: string[] };

  // Initialization
  initializeDefaults: () => void;
}

// ==================== Helper Functions ====================
const generateId = () => `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const generateAuditId = () => `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ==================== Store Implementation ====================
export const useRBACStore = create<RBACStore>()(
  persist(
    (set, get) => ({
      // Initial Data
      roles: [],
      modules: SYSTEM_MODULES,
      permissions: PERMISSION_ACTIONS,
      roleConflicts: [],
      userRoleAssignments: [],
      auditLog: [],

      // Initial UI State
      uiState: {
        selectedRoles: [],
        expandedCategories: new Set(['core_system', 'quality_management', 'manufacturing'] as ModuleCategory[]),
        expandedModules: new Set(),
        filterText: '',
        filterRoleCategory: 'all',
        filterModuleCategory: 'all',
        filterPermissionState: 'all',
        viewMode: 'matrix',
        compareRoles: null,
        isEditing: false,
        pendingChanges: [],
        showInheritedPermissions: true,
        showLockedPermissions: true,
      },

      conflictResolution: 'permissive_union',

      // Role Getters
      getRoleById: (id) => get().roles.find(r => r.id === id),

      getRoleByCode: (code) => get().roles.find(r => r.code === code),

      getRolesByCategory: (category) => get().roles.filter(r => r.category === category),

      // Role CRUD
      createRole: (roleData) => {
        const newRole: Role = {
          ...roleData,
          id: generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set((state) => ({
          roles: [...state.roles, newRole],
        }));

        return newRole;
      },

      updateRole: (id, updates) => {
        const role = get().getRoleById(id);
        if (!role) return;

        // Prevent editing locked system roles
        if (role.is_locked && !updates.permissions) {
          console.warn('Cannot modify locked system role');
          return;
        }

        set((state) => ({
          roles: state.roles.map(r =>
            r.id === id
              ? { ...r, ...updates, updated_at: new Date().toISOString() }
              : r
          ),
        }));
      },

      deleteRole: (id) => {
        const role = get().getRoleById(id);
        if (!role) return false;

        // Prevent deleting system roles
        if (role.is_system) {
          console.warn('Cannot delete system role');
          return false;
        }

        // Check if role is assigned to users
        const assignments = get().userRoleAssignments.filter(a => a.role_id === id);
        if (assignments.length > 0) {
          console.warn('Cannot delete role assigned to users');
          return false;
        }

        set((state) => ({
          roles: state.roles.filter(r => r.id !== id),
        }));

        return true;
      },

      duplicateRole: (id, newName, newCode) => {
        const sourceRole = get().getRoleById(id);
        if (!sourceRole) return null;

        // Check for duplicate code
        if (get().getRoleByCode(newCode)) {
          console.warn('Role code already exists');
          return null;
        }

        const newRole: Role = {
          ...sourceRole,
          id: generateId(),
          name: newName,
          code: newCode,
          type: 'custom',
          is_system: false,
          is_locked: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set((state) => ({
          roles: [...state.roles, newRole],
        }));

        return newRole;
      },

      deprecateRole: (id, replacementRoleId, message) => {
        get().updateRole(id, {
          is_deprecated: true,
          deprecated_at: new Date().toISOString(),
          replacement_role_id: replacementRoleId,
          deprecation_message: message,
        });
      },

      // Permission Management
      getPermissionForRole: (roleId, moduleCode, action) => {
        const role = get().getRoleById(roleId);
        if (!role) return false;

        const modulePermissions = role.permissions[moduleCode];
        if (!modulePermissions) return false;

        const permission = modulePermissions[action];
        return permission?.is_granted ?? false;
      },

      setPermission: (roleId, moduleCode, action, granted) => {
        const role = get().getRoleById(roleId);
        if (!role) return;

        // Check if this is a minimum required permission
        if (!granted && role.minimum_required_permissions?.includes(`${moduleCode}.${action}`)) {
          console.warn('Cannot revoke minimum required permission');
          return;
        }

        // Get dependent permissions
        const dependencies = get().checkPermissionDependencies(moduleCode, action);

        // Update permissions
        set((state) => ({
          roles: state.roles.map(r => {
            if (r.id !== roleId) return r;

            const newPermissions = { ...r.permissions };
            if (!newPermissions[moduleCode]) {
              newPermissions[moduleCode] = {};
            }

            // Set the permission
            newPermissions[moduleCode][action] = {
              permission_id: `perm_${action}`,
              permission_code: action,
              is_granted: granted,
              state: granted ? 'granted' : 'denied',
            };

            // If granting, ensure dependencies are also granted
            if (granted) {
              dependencies.forEach(dep => {
                if (newPermissions[moduleCode][dep]) {
                  newPermissions[moduleCode][dep] = {
                    ...newPermissions[moduleCode][dep]!,
                    is_granted: true,
                    state: 'granted',
                  };
                }
              });
            }

            // If revoking, revoke dependent permissions
            if (!granted) {
              const dependentActions = PERMISSION_HIERARCHY
                .filter(h => h.requires_permissions.includes(action))
                .map(h => h.permission_code as PermissionAction);

              dependentActions.forEach(dep => {
                if (newPermissions[moduleCode][dep]) {
                  newPermissions[moduleCode][dep] = {
                    ...newPermissions[moduleCode][dep]!,
                    is_granted: false,
                    state: 'denied',
                  };
                }
              });
            }

            return {
              ...r,
              permissions: newPermissions,
              updated_at: new Date().toISOString(),
            };
          }),
        }));
      },

      bulkSetPermissions: (roleId, moduleCode, permissions) => {
        Object.entries(permissions).forEach(([action, granted]) => {
          if (granted !== undefined) {
            get().setPermission(roleId, moduleCode, action as PermissionAction, granted);
          }
        });
      },

      copyPermissionsFromRole: (sourceRoleId, targetRoleId) => {
        const sourceRole = get().getRoleById(sourceRoleId);
        const targetRole = get().getRoleById(targetRoleId);

        if (!sourceRole || !targetRole) return;

        // Don't allow copying to locked roles
        if (targetRole.is_locked) {
          console.warn('Cannot modify locked role');
          return;
        }

        set((state) => ({
          roles: state.roles.map(r =>
            r.id === targetRoleId
              ? {
                ...r,
                permissions: JSON.parse(JSON.stringify(sourceRole.permissions)),
                updated_at: new Date().toISOString(),
              }
              : r
          ),
        }));
      },

      resetRoleToDefault: (roleId) => {
        const role = get().getRoleById(roleId);
        if (!role) return;

        // Find default role with same code
        const defaultRole = DEFAULT_SYSTEM_ROLES.find(r => r.code === role.code);
        if (defaultRole) {
          set((state) => ({
            roles: state.roles.map(r =>
              r.id === roleId
                ? {
                  ...r,
                  permissions: JSON.parse(JSON.stringify(defaultRole.permissions)),
                  updated_at: new Date().toISOString(),
                }
                : r
            ),
          }));
        }
      },

      // Validation
      validatePermissionMatrix: (roleId) => {
        const role = get().getRoleById(roleId);
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        if (!role) {
          return {
            is_valid: false,
            errors: [{ module_code: '', permission_code: '', message: 'Role not found' }],
            warnings: [],
          };
        }

        // Check for orphaned permissions
        Object.entries(role.permissions).forEach(([moduleCode, modulePerms]) => {
          Object.entries(modulePerms).forEach(([action, grant]) => {
            if (!grant?.is_granted) return;

            const hierarchy = PERMISSION_HIERARCHY.find(h => h.permission_code === action);
            if (hierarchy) {
              hierarchy.requires_permissions.forEach(required => {
                const requiredPerm = modulePerms[required as PermissionAction];
                if (!requiredPerm?.is_granted) {
                  errors.push({
                    module_code: moduleCode,
                    permission_code: action,
                    message: `${action} requires ${required} permission`,
                    suggestion: `Grant ${required} permission or revoke ${action}`,
                  });
                }
              });
            }
          });
        });

        // Check for dangerous permissions
        if (role.permissions['audit_logs']?.['delete']?.is_granted) {
          warnings.push({
            module_code: 'audit_logs',
            permission_code: 'delete',
            message: 'Delete permission on audit logs may violate compliance requirements',
            risk_level: 'high',
          });
        }

        return {
          is_valid: errors.length === 0,
          errors,
          warnings,
        };
      },

      checkPermissionDependencies: (moduleCode, action) => {
        const hierarchy = PERMISSION_HIERARCHY.find(h => h.permission_code === action);
        return (hierarchy?.requires_permissions || []) as PermissionAction[];
      },

      // User Role Management
      assignRoleToUser: (userId, roleId, assignedBy, expiresAt, reason) => {
        const role = get().getRoleById(roleId);
        if (!role) return;

        // Check for conflicts
        const existingRoles = get().getUserRoles(userId);
        const conflicts = get().roleConflicts.filter(
          c => existingRoles.some(r => r.id === c.role_a_id && roleId === c.role_b_id) ||
            existingRoles.some(r => r.id === c.role_b_id && roleId === c.role_a_id)
        );

        if (conflicts.length > 0) {
          console.warn('Role conflicts detected:', conflicts);
        }

        const assignment: UserRoleAssignment = {
          id: generateId(),
          user_id: userId,
          role_id: roleId,
          role,
          assigned_by: assignedBy,
          assigned_at: new Date().toISOString(),
          expires_at: expiresAt,
          is_temporary: !!expiresAt,
          reason,
        };

        set((state) => ({
          userRoleAssignments: [
            ...state.userRoleAssignments.filter(
              a => !(a.user_id === userId && a.role_id === roleId)
            ),
            assignment,
          ],
        }));
      },

      removeRoleFromUser: (userId, roleId) => {
        set((state) => ({
          userRoleAssignments: state.userRoleAssignments.filter(
            a => !(a.user_id === userId && a.role_id === roleId)
          ),
        }));
      },

      getUserRoles: (userId) => {
        const assignments = get().userRoleAssignments.filter(a => a.user_id === userId);
        return assignments.map(a => a.role).filter((r): r is Role => r !== undefined);
      },

      /**
       * @deprecated DISABLED - Use useModulePermissions hook instead
       * @throws {Error} Always throws - this method used localStorage which could be manipulated
       */
      getUserEffectivePermissions: (userId) => {
        throw new Error(
          '[SECURITY] getUserEffectivePermissions is DISABLED. ' +
          'This method used localStorage-based permissions which could be manipulated. ' +
          'Use useModulePermissions hook for database-backed authorization.'
        );
      },

      // Permission Checking
      /**
       * @deprecated DISABLED - Use useModulePermissions.canPerform() instead
       * @throws {Error} Always throws - this method used localStorage which could be manipulated
       */
      hasPermission: (userId, moduleCode, action) => {
        throw new Error(
          '[SECURITY] hasPermission is DISABLED. ' +
          'This method used localStorage-based permissions which could be manipulated. ' +
          'Use useModulePermissions.canPerform() for database-backed authorization.'
        );
      },

      /**
       * @deprecated DISABLED - Use useModulePermissions.canPerformAll() instead
       * @throws {Error} Always throws - this method used localStorage which could be manipulated
       */
      canUserPerform: (userId, moduleCode, actions) => {
        throw new Error(
          '[SECURITY] canUserPerform is DISABLED. ' +
          'This method used localStorage-based permissions which could be manipulated. ' +
          'Use useModulePermissions.canPerformAll() for database-backed authorization.'
        );
      },

      // Audit
      logPermissionChange: (change) => {
        const logEntry: PermissionChangeLog = {
          ...change,
          id: generateAuditId(),
          changed_at: new Date().toISOString(),
        };

        set((state) => ({
          auditLog: [logEntry, ...state.auditLog].slice(0, 10000), // Keep last 10k entries
        }));
      },

      getAuditLogForRole: (roleId) => {
        return get().auditLog.filter(log => log.role_id === roleId);
      },

      // UI Actions
      setUIState: (updates) => {
        set((state) => ({
          uiState: { ...state.uiState, ...updates },
        }));
      },

      toggleCategoryExpanded: (category) => {
        set((state) => {
          const expanded = new Set(state.uiState.expandedCategories);
          if (expanded.has(category)) {
            expanded.delete(category);
          } else {
            expanded.add(category);
          }
          return {
            uiState: { ...state.uiState, expandedCategories: expanded },
          };
        });
      },

      toggleModuleExpanded: (moduleCode) => {
        set((state) => {
          const expanded = new Set(state.uiState.expandedModules);
          if (expanded.has(moduleCode)) {
            expanded.delete(moduleCode);
          } else {
            expanded.add(moduleCode);
          }
          return {
            uiState: { ...state.uiState, expandedModules: expanded },
          };
        });
      },

      addPendingChange: (change) => {
        set((state) => ({
          uiState: {
            ...state.uiState,
            pendingChanges: [
              ...state.uiState.pendingChanges,
              { ...change, timestamp: new Date().toISOString() },
            ],
          },
        }));
      },

      clearPendingChanges: () => {
        set((state) => ({
          uiState: { ...state.uiState, pendingChanges: [] },
        }));
      },

      applyPendingChanges: async (userId, reason) => {
        const pending = get().uiState.pendingChanges;
        const batchId = generateId();

        if (pending.length === 0) return;

        try {
          // Group changes by role_id + module_code
          const changesByKey = new Map<string, {
            role_id: string;
            module_code: string;
            actions: Map<string, boolean>;
          }>();

          pending.forEach(change => {
            const key = `${change.role_id}-${change.module_code}`;
            if (!changesByKey.has(key)) {
              changesByKey.set(key, {
                role_id: change.role_id,
                module_code: change.module_code,
                actions: new Map(),
              });
            }
            changesByKey.get(key)!.actions.set(change.permission_action, change.new_value);
          });

          // Process each role+module combination
          for (const [key, change] of changesByKey.entries()) {
            // Get current permissions from database
            const { data: existing, error: fetchError } = await supabase
              .from('role_module_permissions')
              .select('id, granted_actions, can_see_all_departments')
              .eq('role_id', change.role_id)
              .eq('module_code', change.module_code)
              .single();

            // Build new granted_actions array
            let currentActions: string[] = existing?.granted_actions || [];
            
            change.actions.forEach((granted, action) => {
              if (granted) {
                // Add action if not present
                if (!currentActions.includes(action)) {
                  currentActions.push(action);
                }
              } else {
                // Remove action
                currentActions = currentActions.filter(a => a !== action);
              }
            });

            // Save to database
            if (existing?.id) {
              // Update existing record
              const { error } = await supabase
                .from('role_module_permissions')
                .update({ granted_actions: currentActions })
                .eq('id', existing.id);

              if (error) {
                console.error('[RBAC] Error updating permissions:', error);
                throw error;
              }
            } else if (currentActions.length > 0) {
              // Insert new record
              const { error } = await supabase
                .from('role_module_permissions')
                .insert({
                  role_id: change.role_id,
                  module_code: change.module_code,
                  granted_actions: currentActions,
                  can_see_all_departments: false,
                });

              if (error) {
                console.error('[RBAC] Error inserting permissions:', error);
                throw error;
              }
            }
          }

          // Update local state
          pending.forEach(change => {
            get().setPermission(
              change.role_id,
              change.module_code,
              change.permission_action,
              change.new_value
            );

            get().logPermissionChange({
              role_id: change.role_id,
              role_name: get().getRoleById(change.role_id)?.name || '',
              module_code: change.module_code,
              permission_code: change.permission_action,
              action: change.new_value ? 'grant' : 'revoke',
              previous_state: change.previous_value,
              new_state: change.new_value,
              changed_by: userId,
              changed_by_email: '',
              reason,
              batch_id: batchId,
            });
          });

          // Emit event to notify other components
          window.dispatchEvent(new CustomEvent('permissions-changed'));
          console.log('[RBAC] ✅ Permissions saved successfully');

        } catch (err: any) {
          console.error('[RBAC] Failed to save permissions:', err);
          
          // Check for RLS/permission errors
          if (err?.code === '42501' || err?.message?.includes('policy')) {
            alert('❌ Permission Denied\n\nYou do not have permission to modify the permission matrix.\nOnly administrators can make these changes.');
          } else {
            alert('❌ Error saving permissions\n\n' + (err?.message || 'Unknown error'));
          }
          
          return; // Don't clear pending changes on error
        }

        get().clearPendingChanges();
      },

      // Role Comparison
      compareRoles: (roleIdA, roleIdB) => {
        const roleA = get().getRoleById(roleIdA);
        const roleB = get().getRoleById(roleIdB);

        const onlyInA: Array<{ module: string; action: PermissionAction }> = [];
        const onlyInB: Array<{ module: string; action: PermissionAction }> = [];
        const common: Array<{ module: string; action: PermissionAction }> = [];

        if (!roleA || !roleB) {
          return { onlyInA, onlyInB, common };
        }

        const allModules = new Set([
          ...Object.keys(roleA.permissions),
          ...Object.keys(roleB.permissions),
        ]);

        const allActions: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'archive'];

        allModules.forEach(moduleCode => {
          allActions.forEach(action => {
            const inA = roleA.permissions[moduleCode]?.[action]?.is_granted ?? false;
            const inB = roleB.permissions[moduleCode]?.[action]?.is_granted ?? false;

            if (inA && inB) {
              common.push({ module: moduleCode, action });
            } else if (inA && !inB) {
              onlyInA.push({ module: moduleCode, action });
            } else if (!inA && inB) {
              onlyInB.push({ module: moduleCode, action });
            }
          });
        });

        return { onlyInA, onlyInB, common };
      },

      // Import/Export
      exportRoles: () => {
        const { roles, modules, auditLog } = get();
        return JSON.stringify({
          export_date: new Date().toISOString(),
          roles: roles.filter(r => !r.is_system),
          modules,
          audit_trail: auditLog.slice(0, 1000),
        }, null, 2);
      },

      importRoles: (data) => {
        try {
          const parsed = JSON.parse(data);
          const errors: string[] = [];
          let imported = 0;

          if (parsed.roles && Array.isArray(parsed.roles)) {
            parsed.roles.forEach((role: Role) => {
              // Skip if role code exists
              if (get().getRoleByCode(role.code)) {
                errors.push(`Role ${role.code} already exists`);
                return;
              }

              // Create new role
              get().createRole({
                ...role,
                type: 'custom',
                is_system: false,
                is_locked: false,
              });
              imported++;
            });
          }

          return { success: errors.length === 0, imported, errors };
        } catch (e) {
          return { success: false, imported: 0, errors: ['Invalid JSON format'] };
        }
      },

      // Initialization
      initializeDefaults: () => {
        const existingRoles = get().roles;

        // Only initialize if no roles exist
        if (existingRoles.length === 0) {
          set({ roles: DEFAULT_SYSTEM_ROLES });
        }
      },
    }),
    {
      name: 'rbac-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        roles: state.roles,
        userRoleAssignments: state.userRoleAssignments,
        auditLog: state.auditLog.slice(0, 1000),
        conflictResolution: state.conflictResolution,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert Sets back from arrays
          if (state.uiState) {
            state.uiState.expandedCategories = new Set(state.uiState.expandedCategories as any);
            state.uiState.expandedModules = new Set(state.uiState.expandedModules as any);
          }
        }
      },
    }
  )
);

// Initialize defaults on store creation
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useRBACStore.getState().initializeDefaults();
  }, 0);
}

export default useRBACStore;

