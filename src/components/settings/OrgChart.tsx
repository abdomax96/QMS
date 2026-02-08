/**
 * OrgChart Component - الهيكل التنظيمي
 * Compact interactive org chart with CRUD and Multi-Select functionality
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    BuildingOfficeIcon,
    ChevronDownIcon,
    XMarkIcon,
    ShieldCheckIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CheckIcon,
    Square2StackIcon,
    ArrowsPointingOutIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../config/supabase';
import { SettingsSkeleton } from '../common/LoadingStates';
import { requirePermission, bustPermissionCache, PermissionError } from '../../services/unifiedPermissionService';

// ==================== Types ====================
interface Department {
    id: string;
    name: string;
    name_ar?: string;
    code?: string;
    color?: string;
    parent_department_id?: string;
    is_active: boolean;
    sort_order?: number;
}

interface Role {
    id: string;
    name: string;
    name_ar?: string;
    code: string;
    color: string;
}

interface DepartmentWithRoles extends Department {
    roles: Role[];
    children: DepartmentWithRoles[];
}

// ==================== Modal Component ====================
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
};

// ==================== Main OrgChart Component ====================
const OrgChart: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [departments, setDepartments] = useState<DepartmentWithRoles[]>([]);
    const [allDepartmentsFlat, setAllDepartmentsFlat] = useState<Department[]>([]);
    const [flatDeptsWithRoles, setFlatDeptsWithRoles] = useState<DepartmentWithRoles[]>([]);
    const [allRoles, setAllRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Selection State - Multi-select support
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    // CRUD State
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [deptForm, setDeptForm] = useState({ name: '', name_ar: '', code: '', color: '#6B7280', parent_department_id: '' });
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
    const [currentDeptForRoles, setCurrentDeptForRoles] = useState<DepartmentWithRoles | null>(null);

    // Role CRUD State
    const [showRoleForm, setShowRoleForm] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleForm, setRoleForm] = useState({ name: '', name_ar: '', code: '', color: '#6B7280' });
    const [showDeleteRoleConfirm, setShowDeleteRoleConfirm] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

    // Get selected departments as array
    const selectedDepartments = flatDeptsWithRoles.filter(d => selectedIds.has(d.id));
    const singleSelected = selectedDepartments.length === 1 ? selectedDepartments[0] : null;

    useEffect(() => {
        loadData();
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle if in modal or input
            if (showDeptModal || showRoleModal || showDeleteConfirm) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // Ctrl+A - Select All
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                setSelectedIds(new Set(flatDeptsWithRoles.map(d => d.id)));
            }
            // Delete - Delete selected
            if (e.key === 'Delete' && selectedIds.size > 0) {
                e.preventDefault();
                setShowDeleteConfirm(true);
            }
            // Escape - Clear selection
            if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedIds(new Set());
            }
            // E - Edit (single selection)
            if (e.key === 'e' && singleSelected) {
                e.preventDefault();
                openEditDept(singleSelected);
            }
            // N - New department
            if (e.key === 'n' && !e.ctrlKey) {
                e.preventDefault();
                openAddDept(singleSelected?.id);
            }
            // R - Manage roles (single selection)
            if (e.key === 'r' && singleSelected) {
                e.preventDefault();
                openRoleManager(singleSelected);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showDeptModal, showRoleModal, showDeleteConfirm, selectedIds, singleSelected, flatDeptsWithRoles]);

    const loadData = async () => {
        setLoading(true);
        const [deptRes, rolesRes, deptRolesRes] = await Promise.all([
            supabase.from('departments').select('id, name, name_ar, code, color, parent_department_id, is_active, sort_order').eq('is_active', true).order('sort_order'),
            supabase.from('roles').select('id, name, name_ar, code, color').eq('is_active', true),
            supabase.from('department_roles').select('department_id, role_id')
        ]);

        const allDepts = deptRes.data || [];
        const roles = rolesRes.data || [];
        const deptRoles = deptRolesRes.data || [];

        setAllDepartmentsFlat(allDepts);
        setAllRoles(roles);

        const deptsWithRoles: DepartmentWithRoles[] = allDepts.map(dept => ({
            ...dept,
            roles: deptRoles.filter(dr => dr.department_id === dept.id)
                .map(dr => roles.find(r => r.id === dr.role_id))
                .filter(Boolean) as Role[],
            children: []
        }));

        setFlatDeptsWithRoles(deptsWithRoles);

        const rootDepts: DepartmentWithRoles[] = [];
        const deptMap = new Map<string, DepartmentWithRoles>();
        deptsWithRoles.forEach(d => deptMap.set(d.id, d));
        deptsWithRoles.forEach(dept => {
            if (dept.parent_department_id && deptMap.has(dept.parent_department_id)) {
                deptMap.get(dept.parent_department_id)!.children.push(dept);
            } else {
                rootDepts.push(dept);
            }
        });

        setExpandedIds(new Set(allDepts.map(d => d.id)));
        setDepartments(rootDepts);
        setLoading(false);
    };

    // Selection handler with Ctrl and Shift support
    const handleSelect = useCallback((dept: DepartmentWithRoles, e: React.MouseEvent) => {
        const id = dept.id;

        if (e.ctrlKey || e.metaKey) {
            // Toggle selection
            setSelectedIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            });
            setLastSelectedId(id);
        } else if (e.shiftKey && lastSelectedId) {
            // Range selection
            const startIdx = flatDeptsWithRoles.findIndex(d => d.id === lastSelectedId);
            const endIdx = flatDeptsWithRoles.findIndex(d => d.id === id);
            if (startIdx !== -1 && endIdx !== -1) {
                const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
                const rangeIds = flatDeptsWithRoles.slice(from, to + 1).map(d => d.id);
                setSelectedIds(new Set(rangeIds));
            }
        } else {
            // Single selection
            setSelectedIds(new Set([id]));
            setLastSelectedId(id);
        }
    }, [lastSelectedId, flatDeptsWithRoles]);

    // CRUD Handlers
    const openAddDept = (parentId?: string) => {
        setEditingDept(null);
        setDeptForm({ name: '', name_ar: '', code: '', color: '#6B7280', parent_department_id: parentId || '' });
        setShowDeptModal(true);
    };

    const openEditDept = (dept: DepartmentWithRoles) => {
        setEditingDept(dept);
        setDeptForm({
            name: dept.name,
            name_ar: dept.name_ar || '',
            code: dept.code || '',
            color: dept.color || '#6B7280',
            parent_department_id: dept.parent_department_id || ''
        });
        setShowDeptModal(true);
    };

    const saveDept = async () => {
        try {
            // SECURITY: Backend permission enforcement
            await requirePermission('settings', 'edit');

            if (editingDept) {
                await supabase.from('departments').update({
                    name: deptForm.name, name_ar: deptForm.name_ar, code: deptForm.code, color: deptForm.color,
                    parent_department_id: deptForm.parent_department_id || null,
                    updated_at: new Date().toISOString()
                }).eq('id', editingDept.id);
            } else {
                await supabase.from('departments').insert({
                    name: deptForm.name, name_ar: deptForm.name_ar, code: deptForm.code, color: deptForm.color,
                    parent_department_id: deptForm.parent_department_id || null, is_active: true
                });
            }
            setShowDeptModal(false);
            loadData();
        } catch (err) {
            if (err instanceof PermissionError) {
                alert(err.message_ar || 'ليس لديك صلاحية لتعديل الأقسام');
            } else {
                console.error('Error saving department:', err);
                alert('حدث خطأ أثناء الحفظ');
            }
        }
    };

    const deleteSelected = async () => {
        if (selectedIds.size === 0) return;
        try {
            // SECURITY: Backend permission enforcement
            await requirePermission('settings', 'delete');

            await supabase.from('departments').update({ is_active: false }).in('id', Array.from(selectedIds));
            setShowDeleteConfirm(false);
            setSelectedIds(new Set());
            loadData();
        } catch (err) {
            if (err instanceof PermissionError) {
                alert(err.message_ar || 'ليس لديك صلاحية لحذف الأقسام');
            } else {
                console.error('Error deleting departments:', err);
                alert('حدث خطأ أثناء الحذف');
            }
            setShowDeleteConfirm(false);
        }
    };

    const openRoleManager = (dept: DepartmentWithRoles) => {
        setCurrentDeptForRoles(dept);
        setSelectedRoleIds(dept.roles.map(r => r.id));
        setShowRoleModal(true);
    };

    const saveRoles = async () => {
        if (!currentDeptForRoles) return;
        await supabase.from('department_roles').delete().eq('department_id', currentDeptForRoles.id);
        if (selectedRoleIds.length > 0) {
            await supabase.from('department_roles').insert(
                selectedRoleIds.map(rid => ({ department_id: currentDeptForRoles.id, role_id: rid }))
            );
        }
        setShowRoleModal(false);
        setCurrentDeptForRoles(null);
        loadData();
    };

    // Role CRUD Handlers
    const openAddRole = () => {
        setEditingRole(null);
        setRoleForm({ name: '', name_ar: '', code: '', color: '#6B7280' });
        setShowRoleForm(true);
    };

    const openEditRole = (role: Role) => {
        setEditingRole(role);
        setRoleForm({
            name: role.name,
            name_ar: role.name_ar || '',
            code: role.code,
            color: role.color || '#6B7280'
        });
        setShowRoleForm(true);
    };

    const saveRole = async () => {
        if (!roleForm.name || !roleForm.code) {
            alert('يرجى إدخال الاسم والكود');
            return;
        }

        try {
            // SECURITY: Backend permission enforcement
            await requirePermission('settings', 'edit');

            if (editingRole) {
                await supabase.from('roles').update({
                    name: roleForm.name,
                    name_ar: roleForm.name_ar,
                    code: roleForm.code.toUpperCase(),
                    color: roleForm.color,
                    updated_at: new Date().toISOString()
                }).eq('id', editingRole.id);
            } else {
                // Get company_id from RPC function
                const { data: companyId } = await supabase.rpc('get_user_company_id');
                const finalCompanyId = companyId || 'a0000001-0000-0000-0000-000000000001';

                await supabase.from('roles').insert({
                    name: roleForm.name,
                    name_ar: roleForm.name_ar,
                    code: roleForm.code.toUpperCase(),
                    color: roleForm.color,
                    company_id: finalCompanyId,
                    is_active: true
                });
            }
            setShowRoleForm(false);
            setEditingRole(null);
            // Bust permission cache since roles changed
            bustPermissionCache();
            loadData();
        } catch (err) {
            if (err instanceof PermissionError) {
                alert(err.message_ar || 'ليس لديك صلاحية لتعديل الأدوار');
            } else {
                console.error('Error saving role:', err);
                alert('حدث خطأ أثناء الحفظ');
            }
        }
    };

    const confirmDeleteRole = (role: Role) => {
        setRoleToDelete(role);
        setShowDeleteRoleConfirm(true);
    };

    const deleteRole = async () => {
        if (!roleToDelete) return;
        try {
            // SECURITY: Backend permission enforcement
            await requirePermission('settings', 'delete');

            // First remove from department_roles
            await supabase.from('department_roles').delete().eq('role_id', roleToDelete.id);
            // Then soft-delete the role
            await supabase.from('roles').update({ is_active: false }).eq('id', roleToDelete.id);
            setShowDeleteRoleConfirm(false);
            setRoleToDelete(null);
            // Remove from selected if was selected
            setSelectedRoleIds(prev => prev.filter(id => id !== roleToDelete.id));
            // Bust permission cache since roles changed
            bustPermissionCache();
            loadData();
        } catch (err) {
            if (err instanceof PermissionError) {
                alert(err.message_ar || 'ليس لديك صلاحية لحذف الأدوار');
            } else {
                console.error('Error deleting role:', err);
                alert('حدث خطأ أثناء الحذف');
            }
            setShowDeleteRoleConfirm(false);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    if (loading) return <SettingsSkeleton />;

    // ==================== Node Renderer ====================
    const renderNode = (dept: DepartmentWithRoles, level: number = 0): React.ReactNode => {
        const isExpanded = expandedIds.has(dept.id);
        const hasChildren = dept.children.length > 0;
        const isSelected = selectedIds.has(dept.id);

        return (
            <div key={dept.id} className="flex flex-col items-center">
                <div className="relative group">
                    <div
                        onClick={(e) => handleSelect(dept, e)}
                        className={`
                            cursor-pointer transition-all duration-150
                            bg-white dark:bg-gray-800 rounded-lg shadow border-r-4 
                            px-2 py-1.5 min-w-[100px] max-w-[130px]
                            hover:shadow-md
                            ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''}
                        `}
                        style={{ borderRightColor: dept.color || '#6B7280' }}
                    >
                        <div className="text-center">
                            <h4 className="text-[11px] font-semibold text-gray-900 dark:text-white leading-tight truncate">
                                {dept.name_ar || dept.name}
                            </h4>
                            <div className="flex items-center justify-center gap-1 mt-0.5 text-[9px] text-gray-500">
                                <ShieldCheckIcon className="w-2.5 h-2.5" />
                                <span>{dept.roles.length}</span>
                                {hasChildren && (
                                    <>
                                        <BuildingOfficeIcon className="w-2.5 h-2.5 mr-1" />
                                        <span>{dept.children.length}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-0.5">
                        <button onClick={(e) => { e.stopPropagation(); openEditDept(dept); }} className="p-0.5 bg-blue-500 text-white rounded hover:bg-blue-600" title="تعديل (E)">
                            <PencilIcon className="w-2.5 h-2.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); openAddDept(dept.id); }} className="p-0.5 bg-green-500 text-white rounded hover:bg-green-600" title="إضافة فرعي (N)">
                            <PlusIcon className="w-2.5 h-2.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); openRoleManager(dept); }} className="p-0.5 bg-purple-500 text-white rounded hover:bg-purple-600" title="الأدوار (R)">
                            <ShieldCheckIcon className="w-2.5 h-2.5" />
                        </button>
                    </div>

                    {hasChildren && (
                        <button onClick={(e) => { e.stopPropagation(); toggleExpand(dept.id); }}
                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center z-10">
                            <ChevronDownIcon className={`w-2.5 h-2.5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </div>

                {/* Roles Pills */}
                {dept.roles.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-0.5 mt-1 max-w-[140px]">
                        {dept.roles.slice(0, 3).map(role => (
                            <span key={role.id} className="px-1 py-0 text-[8px] rounded font-medium"
                                style={{ backgroundColor: `${role.color}20`, color: role.color }}>
                                {role.name_ar || role.name}
                            </span>
                        ))}
                        {dept.roles.length > 3 && (
                            <span className="px-1 py-0 text-[8px] rounded bg-gray-100 dark:bg-gray-700 text-gray-500">+{dept.roles.length - 3}</span>
                        )}
                    </div>
                )}

                {/* Children */}
                {isExpanded && hasChildren && (
                    <div className="mt-4 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-4 bg-gray-300 dark:bg-gray-600 -mt-4" />
                        {dept.children.length > 1 && <div className="absolute top-0 h-px bg-gray-300 dark:bg-gray-600" style={{ left: '10%', right: '10%' }} />}
                        <div className="flex gap-3 justify-center flex-wrap">
                            {dept.children.map(child => (
                                <div key={child.id} className="relative pt-4">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-4 bg-gray-300 dark:bg-gray-600" />
                                    {renderNode(child, level + 1)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div ref={containerRef} className="flex flex-col h-full" tabIndex={0}>
            {/* Header & Toolbar */}
            <div className="flex-shrink-0 p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">الهيكل التنظيمي</h2>
                        <p className="text-[10px] text-gray-500">
                            Ctrl+Click للتحديد المتعدد • Shift+Click لتحديد نطاق • Ctrl+A تحديد الكل • Delete حذف • Esc إلغاء
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                                <Square2StackIcon className="w-4 h-4 text-primary-600" />
                                <span className="text-xs font-medium text-primary-700 dark:text-primary-300">{selectedIds.size} محدد</span>
                                <button onClick={() => setSelectedIds(new Set())} className="mr-1 p-0.5 hover:bg-primary-200 dark:hover:bg-primary-800 rounded">
                                    <XMarkIcon className="w-3 h-3 text-primary-600" />
                                </button>
                            </div>
                        )}
                        {selectedIds.size > 0 && (
                            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-100 text-xs">
                                <TrashIcon className="w-3 h-3" /> حذف ({selectedIds.size})
                            </button>
                        )}
                        <button onClick={() => openAddDept()} className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
                            <PlusIcon className="w-4 h-4" /> إضافة قسم
                        </button>
                    </div>
                </div>
            </div>

            {/* Chart Area - Full Width */}
            <div className="flex-1 overflow-auto p-4">
                {departments.length === 0 ? (
                    <div className="text-center py-12">
                        <BuildingOfficeIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">لا توجد أقسام</h3>
                        <button onClick={() => openAddDept()} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">
                            <PlusIcon className="w-4 h-4 inline ml-1" /> إضافة قسم
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-center gap-4 flex-wrap">
                        {departments.map(dept => renderNode(dept))}
                    </div>
                )}
            </div>

            {/* Department Modal */}
            <Modal isOpen={showDeptModal} onClose={() => setShowDeptModal(false)} title={editingDept ? 'تعديل القسم' : 'إضافة قسم'}>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium mb-1">الاسم (English)</label>
                            <input type="text" value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">الاسم (عربي)</label>
                            <input type="text" value={deptForm.name_ar} onChange={e => setDeptForm({ ...deptForm, name_ar: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium mb-1">الكود</label>
                            <input type="text" value={deptForm.code} onChange={e => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })} className="w-full px-2 py-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">اللون</label>
                            <input type="color" value={deptForm.color} onChange={e => setDeptForm({ ...deptForm, color: e.target.value })} className="w-full h-8 rounded cursor-pointer" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1">القسم الأب</label>
                        <select value={deptForm.parent_department_id} onChange={e => setDeptForm({ ...deptForm, parent_department_id: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600">
                            <option value="">-- بدون (قسم رئيسي) --</option>
                            {allDepartmentsFlat.filter(d => d.id !== editingDept?.id).map(d => (
                                <option key={d.id} value={d.id}>{d.name_ar || d.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setShowDeptModal(false)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700">إلغاء</button>
                        <button onClick={saveDept} className="px-3 py-1.5 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 flex items-center gap-1">
                            <CheckIcon className="w-4 h-4" /> حفظ
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Role Assignment Modal - Enhanced with CRUD */}
            <Modal isOpen={showRoleModal && !showRoleForm} onClose={() => { setShowRoleModal(false); setCurrentDeptForRoles(null); }} title={`أدوار: ${currentDeptForRoles?.name_ar || currentDeptForRoles?.name || ''}`}>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">اختر الأدوار المتاحة في هذا القسم:</p>
                        <button
                            onClick={openAddRole}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            <PlusIcon className="w-3 h-3" /> دور جديد
                        </button>
                    </div>

                    {allRoles.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                            <ShieldCheckIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">لا توجد أدوار</p>
                            <button onClick={openAddRole} className="mt-2 text-primary-600 text-sm hover:underline">
                                + إضافة دور جديد
                            </button>
                        </div>
                    ) : (
                        <div className="max-h-64 overflow-auto space-y-1 border border-gray-200 dark:border-gray-600 rounded p-2">
                            {allRoles.map(role => (
                                <div key={role.id} className={`flex items-center gap-2 p-2 rounded transition-colors group ${selectedRoleIds.includes(role.id) ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                    <input
                                        type="checkbox"
                                        checked={selectedRoleIds.includes(role.id)}
                                        onChange={e => {
                                            if (e.target.checked) setSelectedRoleIds([...selectedRoleIds, role.id]);
                                            else setSelectedRoleIds(selectedRoleIds.filter(id => id !== role.id));
                                        }}
                                        className="rounded"
                                    />
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: role.color }} />
                                    <span className="text-sm flex-1">{role.name_ar || role.name}</span>
                                    <span className="text-xs text-gray-400">{role.code}</span>

                                    {/* Edit/Delete buttons - show on hover */}
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEditRole(role); }}
                                            className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                                            title="تعديل"
                                        >
                                            <PencilIcon className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); confirmDeleteRole(role); }}
                                            className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                            title="حذف"
                                        >
                                            <TrashIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{selectedRoleIds.length} دور محدد</span>
                            {selectedRoleIds.length > 0 && (
                                <button
                                    onClick={async () => {
                                        // Confirm and delete selected roles
                                        if (confirm(`هل تريد حذف ${selectedRoleIds.length} دور محدد؟ سيتم إزالتها من جميع الأقسام.`)) {
                                            // Delete from department_roles first
                                            await supabase.from('department_roles').delete().in('role_id', selectedRoleIds);
                                            // Soft-delete roles
                                            await supabase.from('roles').update({ is_active: false }).in('id', selectedRoleIds);
                                            // Reset and reload (keep modal open)
                                            setSelectedRoleIds([]);
                                            loadData();
                                        }
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                    title="حذف الأدوار المحددة"
                                >
                                    <TrashIcon className="w-3 h-3" />
                                    حذف المحدد
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setShowRoleModal(false); setCurrentDeptForRoles(null); }} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700">إلغاء</button>
                            <button onClick={saveRoles} className="px-3 py-1.5 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 flex items-center gap-1">
                                <CheckIcon className="w-4 h-4" /> حفظ
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Role Form Modal (Add/Edit Role) */}
            <Modal isOpen={showRoleForm} onClose={() => setShowRoleForm(false)} title={editingRole ? 'تعديل الدور' : 'إضافة دور جديد'}>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium mb-1">الاسم (English)</label>
                            <input
                                type="text"
                                value={roleForm.name}
                                onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                                className="w-full px-2 py-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                                placeholder="e.g. Quality Manager"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">الاسم (عربي)</label>
                            <input
                                type="text"
                                value={roleForm.name_ar}
                                onChange={e => setRoleForm({ ...roleForm, name_ar: e.target.value })}
                                className="w-full px-2 py-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                                placeholder="مثال: مدير الجودة"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium mb-1">الكود</label>
                            <input
                                type="text"
                                value={roleForm.code}
                                onChange={e => setRoleForm({ ...roleForm, code: e.target.value.toUpperCase() })}
                                className="w-full px-2 py-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 uppercase"
                                placeholder="مثال: QA_MGR"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">اللون</label>
                            <input
                                type="color"
                                value={roleForm.color}
                                onChange={e => setRoleForm({ ...roleForm, color: e.target.value })}
                                className="w-full h-8 rounded cursor-pointer"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setShowRoleForm(false)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700">إلغاء</button>
                        <button onClick={saveRole} className="px-3 py-1.5 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 flex items-center gap-1">
                            <CheckIcon className="w-4 h-4" /> حفظ
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Role Confirmation */}
            {showDeleteRoleConfirm && roleToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-xs w-full mx-4 shadow-xl">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <TrashIcon className="w-4 h-4 text-red-600" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">حذف الدور</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            هل تريد حذف دور <strong>{roleToDelete.name_ar || roleToDelete.name}</strong>؟
                            <br /><span className="text-xs text-red-500">سيتم إزالته من جميع الأقسام.</span>
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => { setShowDeleteRoleConfirm(false); setRoleToDelete(null); }} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700">إلغاء</button>
                            <button onClick={deleteRole} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1">
                                <TrashIcon className="w-3 h-3" /> حذف
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Department Confirmation */}
            {
                showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-xs w-full mx-4 shadow-xl">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                    <TrashIcon className="w-4 h-4 text-red-600" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">تأكيد الحذف</h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                هل تريد حذف <strong>{selectedIds.size}</strong> قسم؟
                            </p>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700">إلغاء</button>
                                <button onClick={deleteSelected} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1">
                                    <TrashIcon className="w-3 h-3" /> حذف
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default OrgChart;
