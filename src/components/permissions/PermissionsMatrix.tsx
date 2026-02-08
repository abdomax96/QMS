/**
 * Enterprise Permissions Matrix Component
 * مصفوفة الصلاحيات للمؤسسات
 * 
 * Features:
 * - Modules (rows) × Roles (columns) layout
 * - Sticky headers and first column
 * - Collapsible module sections
 * - Bilingual labels (EN + AR)
 * - Hierarchical permission enforcement
 * - Cascade revoke support
 * - System role protection (locked icons)
 * - Audit trail integration
 * 
 * SECURITY: Uses server-side validation for critical operations
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    ShieldCheckIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon,
    LockClosedIcon,
    CheckIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    Cog6ToothIcon,
    DocumentDuplicateIcon,
    XMarkIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../config/supabase';
import {
    MODULE_DEFINITIONS,
    checkHierarchyViolation,
    normalizePermissions,
    getDependentPermissions,
    type ModuleDefinition,
    type RoleState
} from '../../utils/permissionHierarchy';
import { TableSkeleton } from '../common/LoadingStates';
import { PermissionAuditLog } from './PermissionAuditLog';

// Tab types
type TabType = 'matrix' | 'audit';

interface RoleData {
    id: string;
    name: string;
    name_ar?: string;
    code: string;
    color: string;
    priority: number;
    is_locked?: boolean;
    min_edit_priority?: number;
    is_system?: boolean;
}

interface PermissionsMatrixProps {
    userPriority?: number;
}

export const PermissionsMatrix: React.FC<PermissionsMatrixProps> = ({
    userPriority = 999
}) => {
    // State
    const [activeTab, setActiveTab] = useState<TabType>('matrix');
    const [roles, setRoles] = useState<RoleData[]>([]);
    const [rolePermissions, setRolePermissions] = useState<Record<string, Set<string>>>({});
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(
        MODULE_DEFINITIONS.map(m => m.code)
    ));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);
    const [showLockedRoles, setShowLockedRoles] = useState(true);

    // Pagination for performance (show limited roles at a time)
    const [rolePage, setRolePage] = useState(0);
    const ROLES_PER_PAGE = 10;

    // Clone Role state
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [sourceRoleId, setSourceRoleId] = useState<string>('');
    const [targetRoleId, setTargetRoleId] = useState<string>('');
    const [cloning, setCloning] = useState(false);

    // Role Management state (CRUD)
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleData | null>(null);
    const [roleForm, setRoleForm] = useState({ name: '', name_ar: '', code: '', color: '#3B82F6', priority: 50 });
    const [savingRole, setSavingRole] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [rolesRes, rolePermsRes] = await Promise.all([
                supabase.from('roles')
                    .select('id, name, name_ar, code, color, priority, is_locked, min_edit_priority, is_system')
                    .eq('is_active', true)
                    .order('priority'),
                supabase.from('role_permissions')
                    .select('role_id, permission_code')
            ]);

            setRoles(rolesRes.data || []);

            // Group permissions by role
            const grouped: Record<string, Set<string>> = {};
            (rolePermsRes.data || []).forEach((rp: { role_id: string; permission_code?: string }) => {
                if (!grouped[rp.role_id]) grouped[rp.role_id] = new Set();
                if (rp.permission_code) grouped[rp.role_id].add(rp.permission_code);
            });
            setRolePermissions(grouped);
        } catch (error) {
            console.error('Error loading permissions data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter roles based on search and visibility settings
    const filteredRoles = useMemo(() => {
        let result = roles;

        if (!showLockedRoles) {
            result = result.filter(r => !r.is_locked);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.name.toLowerCase().includes(q) ||
                (r.name_ar || '').includes(q) ||
                r.code.toLowerCase().includes(q)
            );
        }

        return result;
    }, [roles, searchQuery, showLockedRoles]);

    // Paginate roles for performance
    const paginatedRoles = useMemo(() => {
        const start = rolePage * ROLES_PER_PAGE;
        return filteredRoles.slice(start, start + ROLES_PER_PAGE);
    }, [filteredRoles, rolePage]);

    const totalPages = Math.ceil(filteredRoles.length / ROLES_PER_PAGE);

    // Check if permission is granted
    const hasPermission = useCallback((roleId: string, permCode: string): boolean => {
        return rolePermissions[roleId]?.has(permCode) || false;
    }, [rolePermissions]);

    // Check if role is locked
    const isRoleLocked = useCallback((role: RoleData): boolean => {
        return role.is_locked || false;
    }, []);

    // Check if user can modify role
    const canModifyRole = useCallback((role: RoleData): boolean => {
        if (role.is_locked) return false;
        const minPriority = role.min_edit_priority ?? 100;
        return userPriority < minPriority;
    }, [userPriority]);

    // Get missing dependencies for a permission
    const getMissingDeps = useCallback((roleId: string, permCode: string): string[] => {
        const currentPerms = rolePermissions[roleId] || new Set();
        return checkHierarchyViolation(permCode, currentPerms);
    }, [rolePermissions]);

    // Toggle permission with hierarchy enforcement and cascade revoke
    const togglePermission = useCallback(async (roleId: string, permCode: string) => {
        const role = roles.find(r => r.id === roleId);
        if (!role || isRoleLocked(role) || !canModifyRole(role)) return;

        setSaving(true);
        const currentlyHas = hasPermission(roleId, permCode);

        try {
            if (currentlyHas) {
                // CASCADE REVOKE: Also revoke permissions that depend on this one
                const dependents = getDependentPermissions(permCode);
                const allToRevoke = [permCode, ...dependents];

                // Delete all related permissions
                await supabase.from('role_permissions')
                    .delete()
                    .eq('role_id', roleId)
                    .in('permission_code', allToRevoke);

                setRolePermissions(prev => {
                    const updated = { ...prev };
                    if (updated[roleId]) {
                        updated[roleId] = new Set(updated[roleId]);
                        allToRevoke.forEach(p => updated[roleId].delete(p));
                    }
                    return updated;
                });

                // Log cascade revoke for debugging
                if (dependents.length > 0) {
                    console.info(`[RBAC] Cascade revoke: ${permCode} → also revoked: ${dependents.join(', ')}`);
                }
            } else {
                // Grant permission - also grant missing dependencies (SAFE GRANT)
                const currentPerms = Array.from(rolePermissions[roleId] || new Set());
                const { normalized, added } = normalizePermissions([...currentPerms, permCode]);

                // Get only the new permissions to insert
                const toInsert = normalized.filter(p => !currentPerms.includes(p));

                if (toInsert.length > 0) {
                    await supabase.from('role_permissions')
                        .upsert(
                            toInsert.map(p => ({ role_id: roleId, permission_code: p })),
                            { onConflict: 'role_id,permission_code', ignoreDuplicates: true }
                        );

                    setRolePermissions(prev => {
                        const updated = { ...prev };
                        updated[roleId] = new Set([...(prev[roleId] || new Set()), ...toInsert]);
                        return updated;
                    });

                    // Log auto-granted dependencies
                    if (toInsert.length > 1) {
                        const autoGranted = toInsert.filter(p => p !== permCode);
                        console.info(`[RBAC] Safe grant: ${permCode} → also granted: ${autoGranted.join(', ')}`);
                    }
                }
            }
        } catch (error) {
            console.error('Error toggling permission:', error);
            // Reload on error
            loadData();
        } finally {
            setSaving(false);
        }
    }, [roles, hasPermission, rolePermissions, isRoleLocked, canModifyRole, loadData]);

    // Toggle module expansion
    const toggleModule = useCallback((moduleCode: string) => {
        setExpandedModules(prev => {
            const updated = new Set(prev);
            if (updated.has(moduleCode)) {
                updated.delete(moduleCode);
            } else {
                updated.add(moduleCode);
            }
            return updated;
        });
    }, []);

    // Expand/collapse all modules
    const expandAll = useCallback(() => {
        setExpandedModules(new Set(MODULE_DEFINITIONS.map(m => m.code)));
    }, []);

    const collapseAll = useCallback(() => {
        setExpandedModules(new Set());
    }, []);

    // Clone role permissions
    const cloneRolePermissions = useCallback(async () => {
        if (!sourceRoleId || !targetRoleId || sourceRoleId === targetRoleId) return;

        const targetRole = roles.find(r => r.id === targetRoleId);
        if (!targetRole || !canModifyRole(targetRole)) return;

        setCloning(true);
        try {
            // Get source permissions
            const sourcePerms = rolePermissions[sourceRoleId] || new Set();
            const permsToAdd = Array.from(sourcePerms);

            if (permsToAdd.length > 0) {
                // Insert all permissions for target role
                await supabase.from('role_permissions')
                    .upsert(
                        permsToAdd.map(p => ({ role_id: targetRoleId, permission_code: p })),
                        { onConflict: 'role_id,permission_code', ignoreDuplicates: true }
                    );

                // Reload data
                await loadData();
            }

            setShowCloneModal(false);
            setSourceRoleId('');
            setTargetRoleId('');
        } catch (error) {
            console.error('Error cloning permissions:', error);
        } finally {
            setCloning(false);
        }
    }, [sourceRoleId, targetRoleId, roles, rolePermissions, canModifyRole, loadData]);

    // --- Role CRUD Functions ---
    const openAddRole = useCallback(() => {
        setEditingRole(null);
        setRoleForm({ name: '', name_ar: '', code: '', color: '#3B82F6', priority: 50 });
        setShowRoleModal(true);
    }, []);

    const openEditRole = useCallback((role: RoleData) => {
        setEditingRole(role);
        setRoleForm({
            name: role.name,
            name_ar: role.name_ar || '',
            code: role.code,
            color: role.color || '#3B82F6',
            priority: role.priority
        });
        setShowRoleModal(true);
    }, []);

    const saveRole = useCallback(async () => {
        if (!roleForm.name || !roleForm.code) return;

        setSavingRole(true);
        try {
            if (editingRole) {
                // Update existing role
                await supabase.from('roles')
                    .update({
                        name: roleForm.name,
                        name_ar: roleForm.name_ar,
                        code: roleForm.code,
                        color: roleForm.color,
                        priority: roleForm.priority
                    })
                    .eq('id', editingRole.id);
            } else {
                // Create new role
                await supabase.from('roles')
                    .insert({
                        name: roleForm.name,
                        name_ar: roleForm.name_ar,
                        code: roleForm.code,
                        color: roleForm.color,
                        priority: roleForm.priority,
                        is_active: true,
                        is_locked: false
                    });
            }

            await loadData();
            setShowRoleModal(false);
            setEditingRole(null);
        } catch (error) {
            console.error('Error saving role:', error);
        } finally {
            setSavingRole(false);
        }
    }, [editingRole, roleForm, loadData]);

    const deleteRole = useCallback(async (roleId: string) => {
        try {
            // Delete role permissions first
            await supabase.from('role_permissions').delete().eq('role_id', roleId);
            // Then delete the role (soft delete - set is_active to false)
            await supabase.from('roles').update({ is_active: false }).eq('id', roleId);

            await loadData();
            setDeleteConfirmId(null);
        } catch (error) {
            console.error('Error deleting role:', error);
        }
    }, [loadData]);

    // Count permissions per module per role
    const getModulePermissionCount = useCallback((roleId: string, module: ModuleDefinition): { granted: number; total: number } => {
        const total = module.permissions.length;
        const granted = module.permissions.filter(p => hasPermission(roleId, p.code)).length;
        return { granted, total };
    }, [hasPermission]);

    // Render loading state
    if (loading) {
        return <TableSkeleton />;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ShieldCheckIcon className="w-6 h-6" />
                        <div>
                            <h2 className="text-lg font-bold">Permissions Matrix</h2>
                            <p className="text-xs text-slate-300">مصفوفة الصلاحيات</p>
                        </div>
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                            {roles.length} roles • {MODULE_DEFINITIONS.length} modules
                        </span>
                    </div>

                    {/* Tab buttons */}
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('matrix')}
                            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${activeTab === 'matrix'
                                ? 'bg-white text-slate-800'
                                : 'bg-white/10 hover:bg-white/20'
                                }`}
                        >
                            <Cog6ToothIcon className="w-4 h-4" />
                            Matrix
                        </button>
                        <button
                            onClick={() => setActiveTab('audit')}
                            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${activeTab === 'audit'
                                ? 'bg-white text-slate-800'
                                : 'bg-white/10 hover:bg-white/20'
                                }`}
                        >
                            <ClockIcon className="w-4 h-4" />
                            Audit Log
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'matrix' ? (
                <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-b-lg border border-t-0 border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <div className="flex items-center gap-4 flex-wrap">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search roles... / بحث..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pr-9 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                             text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-2">
                                {/* Add Role Button */}
                                <button
                                    onClick={openAddRole}
                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 
                                             rounded hover:bg-green-200 dark:hover:bg-green-800 flex items-center gap-1"
                                >
                                    <PlusIcon className="w-3.5 h-3.5" />
                                    Add Role
                                </button>

                                <button
                                    onClick={() => setShowCloneModal(true)}
                                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 
                                             rounded hover:bg-purple-200 dark:hover:bg-purple-800 flex items-center gap-1"
                                >
                                    <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                                    Clone Role
                                </button>

                                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                    <input
                                        type="checkbox"
                                        checked={showLockedRoles}
                                        onChange={(e) => setShowLockedRoles(e.target.checked)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    Show locked
                                </label>

                                <button
                                    onClick={expandAll}
                                    className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                    Expand All
                                </button>
                                <button
                                    onClick={collapseAll}
                                    className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                    Collapse All
                                </button>
                                <button
                                    onClick={loadData}
                                    disabled={loading}
                                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                    title="Refresh"
                                >
                                    <ArrowPathIcon className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                    <button
                                        onClick={() => setRolePage(p => Math.max(0, p - 1))}
                                        disabled={rolePage === 0}
                                        className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ← Prev
                                    </button>
                                    <span className="text-xs text-gray-600 dark:text-gray-300">
                                        {rolePage + 1} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setRolePage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={rolePage >= totalPages - 1}
                                        className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next →
                                    </button>
                                    <span className="text-[10px] text-gray-400">
                                        ({paginatedRoles.length} of {filteredRoles.length} roles)
                                    </span>
                                </div>
                            )}

                            {/* Saving indicator */}
                            {saving && (
                                <span className="text-xs text-blue-600 flex items-center gap-1">
                                    <ArrowPathIcon className="w-3 h-3 animate-spin" />
                                    Saving...
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Matrix Table - RTL with sticky right column */}
                    <div className="flex-1 overflow-auto">
                        <table className="w-full border-collapse text-xs" dir="rtl" style={{ minWidth: '600px' }}>
                            {/* Header row with roles */}
                            <thead className="sticky top-0 z-20">
                                <tr className="bg-slate-100 dark:bg-slate-700">
                                    {/* Module/Permission column header - RIGHT side sticky */}
                                    <th className="sticky right-0 z-30 bg-slate-200 dark:bg-slate-600 p-2 text-right font-bold 
                                                 border-b border-l-2 border-gray-300 dark:border-gray-500 min-w-[200px] w-[200px]"
                                        style={{ boxShadow: '-4px 0 8px -4px rgba(0,0,0,0.15)' }}
                                    >
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-gray-500 font-normal">الوحدة</span>
                                            <span>Module</span>
                                        </div>
                                    </th>

                                    {/* Role column headers - paginated */}
                                    {paginatedRoles.map(role => (
                                        <th
                                            key={role.id}
                                            className="p-2 text-center font-medium border-b border-r border-gray-300 dark:border-gray-600 
                                                     bg-slate-200 dark:bg-slate-600 min-w-[80px] max-w-[120px]"
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-1">
                                                    <div
                                                        className="w-3 h-3 rounded flex-shrink-0"
                                                        style={{ backgroundColor: role.color || '#6B7280' }}
                                                    />
                                                    {isRoleLocked(role) && (
                                                        <LockClosedIcon className="w-3 h-3 text-amber-500" />
                                                    )}
                                                </div>
                                                <span className="truncate max-w-[100px] text-gray-900 dark:text-white">
                                                    {role.name_ar || role.name}
                                                </span>
                                                <span className="text-[9px] text-gray-500 truncate max-w-[100px]">
                                                    {role.name}
                                                </span>
                                                {/* Edit button */}
                                                {!isRoleLocked(role) && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openEditRole(role); }}
                                                        className="mt-1 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 
                                                                 rounded hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center gap-0.5"
                                                        title="Edit Role"
                                                    >
                                                        <PencilIcon className="w-2.5 h-2.5" />
                                                        Edit
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            {/* Body with modules and permissions */}
                            <tbody>
                                {MODULE_DEFINITIONS.map(module => (
                                    <React.Fragment key={module.code}>
                                        {/* Module header row */}
                                        <tr
                                            className="bg-gray-100 dark:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                                            onClick={() => toggleModule(module.code)}
                                        >
                                            <td className="sticky right-0 z-10 bg-gray-100 dark:bg-gray-700 p-2 
                                                         border-b border-l-2 border-gray-300 dark:border-gray-500 font-semibold min-w-[200px] w-[200px]"
                                                style={{ boxShadow: '-4px 0 8px -4px rgba(0,0,0,0.1)' }}
                                            >
                                                <div className="flex items-center justify-end gap-2">
                                                    {expandedModules.has(module.code) ? (
                                                        <ChevronDownIcon className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronUpIcon className="w-4 h-4" />
                                                    )}
                                                    <span className="text-sm text-gray-900 dark:text-white">
                                                        {module.labelEn}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        ({module.labelAr})
                                                    </span>
                                                    <span className="ml-auto bg-gray-300 dark:bg-gray-500 px-1.5 py-0.5 rounded text-[10px]">
                                                        {module.shortCode}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Module summary per role */}
                                            {paginatedRoles.map(role => {
                                                const { granted, total } = getModulePermissionCount(role.id, module);
                                                const percentage = total > 0 ? Math.round((granted / total) * 100) : 0;

                                                return (
                                                    <td
                                                        key={`${module.code}-${role.id}`}
                                                        className="p-2 text-center border-b border-r border-gray-200 dark:border-gray-600"
                                                    >
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <span className={`text-[10px] font-medium ${granted === total ? 'text-green-600' :
                                                                granted > 0 ? 'text-amber-600' : 'text-gray-400'
                                                                }`}>
                                                                {granted}/{total}
                                                            </span>
                                                            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${granted === total ? 'bg-green-500' :
                                                                        granted > 0 ? 'bg-amber-500' : 'bg-gray-300'
                                                                        }`}
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>

                                        {/* Permission rows (collapsible) */}
                                        {expandedModules.has(module.code) && module.permissions.map(perm => (
                                            <tr
                                                key={perm.code}
                                                className={`transition-colors ${hoveredRow === perm.code
                                                    ? 'bg-blue-50 dark:bg-blue-900/20'
                                                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
                                                    }`}
                                                onMouseEnter={() => setHoveredRow(perm.code)}
                                                onMouseLeave={() => setHoveredRow(null)}
                                            >
                                                {/* Permission name - sticky right */}
                                                <td className={`sticky right-0 z-10 p-2 pr-6 
                                                             border-b border-l-2 border-gray-200 dark:border-gray-600 min-w-[200px] w-[200px]
                                                             ${hoveredRow === perm.code
                                                        ? 'bg-blue-50 dark:bg-blue-900/30'
                                                        : 'bg-white dark:bg-gray-800'}`}
                                                    style={{ boxShadow: '-4px 0 6px -4px rgba(0,0,0,0.1)' }}
                                                >
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="text-gray-400 text-[10px]">
                                                            {perm.labelAr}
                                                        </span>
                                                        <span className="text-gray-700 dark:text-gray-300">
                                                            {perm.labelEn}
                                                        </span>
                                                        {perm.requiresPermissions && perm.requiresPermissions.length > 0 && (
                                                            <span className="text-[9px] text-amber-500" title={`Requires: ${perm.requiresPermissions.join(', ')}`}>
                                                                ⚠
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Permission toggles per role - paginated */}
                                                {paginatedRoles.map(role => {
                                                    const isGranted = hasPermission(role.id, perm.code);
                                                    const isLocked = isRoleLocked(role);
                                                    const canModify = canModifyRole(role);
                                                    const missingDeps = getMissingDeps(role.id, perm.code);
                                                    const hasMissingDeps = isGranted && missingDeps.length > 0;

                                                    // Cell styling
                                                    let cellClass = 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200';
                                                    let iconNode: React.ReactNode = null;

                                                    if (isLocked) {
                                                        cellClass = isGranted
                                                            ? 'bg-green-600 text-white cursor-not-allowed'
                                                            : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed';
                                                        iconNode = <LockClosedIcon className="w-3 h-3" />;
                                                    } else if (!canModify) {
                                                        cellClass = isGranted
                                                            ? 'bg-green-400 opacity-50 cursor-not-allowed'
                                                            : 'bg-gray-200 dark:bg-gray-600 opacity-50 cursor-not-allowed';
                                                    } else if (isGranted) {
                                                        if (hasMissingDeps) {
                                                            cellClass = 'bg-amber-500 text-white hover:bg-amber-600';
                                                            iconNode = <ExclamationTriangleIcon className="w-3 h-3" />;
                                                        } else {
                                                            cellClass = 'bg-green-500 text-white hover:bg-green-600';
                                                            iconNode = <CheckIcon className="w-3 h-3" />;
                                                        }
                                                    }

                                                    return (
                                                        <td
                                                            key={`${perm.code}-${role.id}`}
                                                            className="p-1 text-center border-b border-r border-gray-100 dark:border-gray-700"
                                                        >
                                                            <button
                                                                onClick={() => togglePermission(role.id, perm.code)}
                                                                disabled={isLocked || !canModify || saving}
                                                                title={
                                                                    isLocked ? '🔒 System Protected' :
                                                                        !canModify ? 'Insufficient privileges' :
                                                                            hasMissingDeps ? `⚠ Missing: ${missingDeps.join(', ')}` :
                                                                                `${isGranted ? 'Revoke' : 'Grant'} ${perm.code}`
                                                                }
                                                                className={`
                                                                    w-6 h-6 rounded flex items-center justify-center mx-auto
                                                                    transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400
                                                                    ${cellClass}
                                                                `}
                                                            >
                                                                {iconNode}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Legend */}
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <div className="flex items-center gap-6 text-xs text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
                                    <CheckIcon className="w-3 h-3 text-white" />
                                </div>
                                <span>Granted</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded" />
                                <span>Not Granted</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center">
                                    <LockClosedIcon className="w-3 h-3 text-white" />
                                </div>
                                <span>Locked (System)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 bg-amber-500 rounded flex items-center justify-center">
                                    <ExclamationTriangleIcon className="w-3 h-3 text-white" />
                                </div>
                                <span>Missing Dependencies</span>
                            </div>
                            <span className="ml-auto text-gray-400">
                                Click cell to toggle • Hierarchical permissions auto-enforced
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                /* Audit Log Tab */
                <div className="flex-1 p-4 bg-white dark:bg-gray-800 rounded-b-lg border border-t-0 border-gray-200 dark:border-gray-700">
                    <PermissionAuditLog />
                </div>
            )}

            {/* Clone Role Modal */}
            {showCloneModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <DocumentDuplicateIcon className="w-5 h-5 text-purple-600" />
                                Clone Role Permissions
                            </h3>
                            <button
                                onClick={() => setShowCloneModal(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                                <XMarkIcon className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            نسخ جميع الصلاحيات من دور إلى آخر
                            <span className="block text-xs mt-1">Copy all permissions from one role to another</span>
                        </p>

                        <div className="space-y-4">
                            {/* Source Role */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Source Role (نسخ من)
                                </label>
                                <select
                                    value={sourceRoleId}
                                    onChange={(e) => setSourceRoleId(e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                             dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">Select source role...</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>
                                            {role.name_ar || role.name} ({(rolePermissions[role.id]?.size || 0)} permissions)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Target Role */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Target Role (نسخ إلى)
                                </label>
                                <select
                                    value={targetRoleId}
                                    onChange={(e) => setTargetRoleId(e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                             dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">Select target role...</option>
                                    {roles.filter(r => !r.is_locked && canModifyRole(r)).map(role => (
                                        <option key={role.id} value={role.id} disabled={role.id === sourceRoleId}>
                                            {role.name_ar || role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowCloneModal(false)}
                                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                                         dark:hover:bg-gray-700 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={cloneRolePermissions}
                                disabled={!sourceRoleId || !targetRoleId || sourceRoleId === targetRoleId || cloning}
                                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 
                                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {cloning ? (
                                    <>
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        Cloning...
                                    </>
                                ) : (
                                    <>
                                        <DocumentDuplicateIcon className="w-4 h-4" />
                                        Clone Permissions
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Role Management Modal */}
            {showRoleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {editingRole ? <PencilIcon className="w-5 h-5 text-blue-600" /> : <PlusIcon className="w-5 h-5 text-green-600" />}
                                {editingRole ? 'Edit Role' : 'Add New Role'}
                            </h3>
                            <button onClick={() => setShowRoleModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                <XMarkIcon className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name (EN)</label>
                                    <input
                                        type="text"
                                        value={roleForm.name}
                                        onChange={(e) => setRoleForm(f => ({ ...f, name: e.target.value }))}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                        placeholder="Quality Manager"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم (AR)</label>
                                    <input
                                        type="text"
                                        value={roleForm.name_ar}
                                        onChange={(e) => setRoleForm(f => ({ ...f, name_ar: e.target.value }))}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-right"
                                        placeholder="مدير الجودة"
                                        dir="rtl"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                                <input
                                    type="text"
                                    value={roleForm.code}
                                    onChange={(e) => setRoleForm(f => ({ ...f, code: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono"
                                    placeholder="quality_manager"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={roleForm.color}
                                            onChange={(e) => setRoleForm(f => ({ ...f, color: e.target.value }))}
                                            className="w-12 h-10 border-0 cursor-pointer rounded"
                                        />
                                        <input
                                            type="text"
                                            value={roleForm.color}
                                            onChange={(e) => setRoleForm(f => ({ ...f, color: e.target.value }))}
                                            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                                    <input
                                        type="number"
                                        value={roleForm.priority}
                                        onChange={(e) => setRoleForm(f => ({ ...f, priority: parseInt(e.target.value) || 50 }))}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                        min="1"
                                        max="100"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Lower = higher rank (1=Admin, 100=Viewer)</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between mt-6">
                            {editingRole && !editingRole.is_locked && (
                                <button
                                    onClick={() => { setShowRoleModal(false); setDeleteConfirmId(editingRole.id); }}
                                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-1"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    Delete
                                </button>
                            )}
                            <div className="flex gap-2 ml-auto">
                                <button onClick={() => setShowRoleModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                    Cancel
                                </button>
                                <button
                                    onClick={saveRole}
                                    disabled={!roleForm.name || !roleForm.code || savingRole}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {savingRole ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                                    {editingRole ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <TrashIcon className="w-5 h-5 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Role?</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            هل أنت متأكد من حذف هذا الدور؟ سيتم إزالة جميع الصلاحيات المرتبطة به.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteRole(deleteConfirmId)}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                            >
                                <TrashIcon className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermissionsMatrix;
