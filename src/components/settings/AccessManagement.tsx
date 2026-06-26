/**
 * AccessManagement Component - Table-based with CRUD
 * مكون إدارة الوصول الموحد - جداول مع إمكانية الإضافة والتعديل والحذف
 */

import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    UserGroupIcon,
    ShieldCheckIcon,
    BuildingOfficeIcon,
    TableCellsIcon,
    CubeIcon,
    PlusIcon, PencilIcon, TrashIcon, XMarkIcon, CheckIcon,
    ArrowPathIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, ChevronDownIcon, ChevronLeftIcon
} from '@heroicons/react/24/outline';
import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../config/supabase';
import type { DepartmentWithChildren } from '../../types/department';
import { SettingsSkeleton } from '../common/LoadingStates';
import { OrganizationalChart } from './OrganizationalChart';

// Lazy load heavy components
const SimplePermissionMatrix = lazy(() => import('../permissions/SimplePermissionMatrix'));
// ModuleDistribution removed - module visibility now based on role permissions
const NcrStagePermissions = lazy(() => import('./NcrStagePermissions'));
const TaskStagePermissions = lazy(() => import('./TaskStagePermissions'));
const OrgChart = lazy(() => import('./OrgChart'));

// ==================== Types ====================
interface Role {
    id: string;
    name: string;
    name_ar?: string;
    code: string;
    description?: string;
    description_ar?: string;
    color: string;
    priority: number;
    is_system: boolean;
    is_active: boolean;
    category?: string;
}

interface Department {
    id: string;
    name: string;
    name_en?: string;
    name_ar?: string;
    code?: string;
    color?: string;
    is_active?: boolean;
    active?: boolean;
}

interface JobTitle {
    id: string;
    name: string;
    name_en?: string;
    department_id?: string;
    default_role_id?: string;
    active?: boolean;
}

// ==================== Loading Component ====================


// ==================== Modal Component ====================
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

// ==================== Users Tab Component (Full CRUD) ====================
interface UserFull {
    id: string;
    name: string;
    email: string;
    phone?: string;
    department_id?: string;
    department?: string;
    roles: string[];
    is_active: boolean;
}

const UsersTableTab: React.FC = () => {
    const [users, setUsers] = useState<UserFull[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [allRoles, setAllRoles] = useState<Role[]>([]);
    const [departmentRoles, setDepartmentRoles] = useState<{ department_id: string; role_id: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<UserFull | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', department_id: '', roles: [] as string[], is_active: true });
    const [deleteTarget, setDeleteTarget] = useState<UserFull | null>(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        const [usersRes, deptsRes, rolesRes, deptRolesRes] = await Promise.all([
            supabase.from('users').select('id, name, email, phone, department_id, department, roles, is_active, created_at').order('name').limit(500),
            supabase.from('departments').select('id, name, parent_department_id').eq('is_active', true),
            supabase.from('roles').select('id, name, name_ar').eq('is_active', true),
            supabase.from('department_roles').select('department_id, role_id')
        ]);
        setUsers(usersRes.data || []);
        setDepartments(deptsRes.data || []);
        setAllRoles(rolesRes.data || []);
        setDepartmentRoles(deptRolesRes.data || []);
        setLoading(false);
    };

    // Get available roles for selected department
    const getAvailableRoles = () => {
        if (!formData.department_id) return [];
        const roleIds = departmentRoles
            .filter(dr => dr.department_id === formData.department_id)
            .map(dr => dr.role_id);
        return allRoles.filter(r => roleIds.includes(r.id));
    };

    const openAdd = () => {
        setEditing(null);
        setFormData({ name: '', email: '', password: '', phone: '', department_id: '', roles: [], is_active: true });
        setShowModal(true);
    };

    const openEdit = (user: UserFull) => {
        setEditing(user);

        // Convert role codes to UUIDs (user.roles may contain codes like 'super_admin' instead of UUIDs)
        const roleIds = (user.roles || []).map(roleCodeOrId => {
            // Check if it's already a UUID (contains dashes and is 36 chars)
            if (roleCodeOrId && roleCodeOrId.includes('-') && roleCodeOrId.length === 36) {
                return roleCodeOrId;
            }
            // Otherwise, find the role by code and get its ID
            const role = allRoles.find(r => r.code === roleCodeOrId || r.name === roleCodeOrId);
            return role?.id || null;
        }).filter((id): id is string => id !== null);

        setFormData({
            name: user.name || '',
            email: user.email || '',
            password: '',
            phone: user.phone || '',
            department_id: user.department_id || '',
            roles: roleIds,
            is_active: user.is_active ?? true
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (editing) {
            // Update existing user
            const userData = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone || null,
                department_id: formData.department_id || null,
                department: departments.find(d => d.id === formData.department_id)?.name || null,
                roles: formData.roles,
                is_active: formData.is_active,
                updated_at: new Date().toISOString()
            };
            await supabase.from('users').update(userData).eq('id', editing.id);

            // CRITICAL FIX: Sync user_roles table when roles are updated
            console.log('[UserUpdate] Syncing roles to user_roles table...', formData.roles);

            // 1. Remove all existing role assignments
            await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', editing.id);

            // 2. Add new role assignments
            if (formData.roles && formData.roles.length > 0) {
                for (const roleId of formData.roles) {
                    const { error: roleError } = await supabase
                        .from('user_roles')
                        .insert({
                            user_id: editing.id,
                            role_id: roleId,
                            assigned_at: new Date().toISOString()
                        });

                    if (roleError) {
                        console.warn(`[UserUpdate] Role assignment warning for role ${roleId}:`, roleError.message);
                    } else {
                        console.log(`[UserUpdate] ✓ Assigned role: ${roleId}`);
                    }
                }
            }

            // Also update user_departments table (required for permissions)
            if (formData.department_id) {
                // Deactivate old department links
                await supabase
                    .from('user_departments')
                    .update({ is_active: false })
                    .eq('user_id', editing.id);

                // Upsert new department link
                await supabase
                    .from('user_departments')
                    .upsert({
                        user_id: editing.id,
                        department_id: formData.department_id,
                        is_active: true
                    }, { onConflict: 'user_id,department_id' });
            } else {
                // Deactivate all department links if no department selected
                await supabase
                    .from('user_departments')
                    .update({ is_active: false })
                    .eq('user_id', editing.id);
            }
        } else {
            // Create new user with auth
            if (!formData.password) {
                alert('كلمة المرور مطلوبة');
                return;
            }
            if (!supabaseUrl || !supabaseAnonKey) {
                alert('Supabase configuration missing');
                return;
            }

            try {
                // Create auth user with separate client to avoid auto-login
                const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
                    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
                });

                console.log('[UserCreate] Step 1: Creating auth user...');
                const { data: authData, error: authError } = await tempClient.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: { data: { full_name: formData.name } }
                });

                if (authError) {
                    console.error('[UserCreate] Auth error:', authError);
                    alert('Error: ' + authError.message);
                    return;
                }
                if (!authData.user) {
                    console.error('[UserCreate] No user returned');
                    alert('Failed to create user');
                    return;
                }

                const { data: companyId, error: companyError } = await supabase.rpc('get_user_company_id');
                if (companyError || !companyId) {
                    console.error('[UserCreate] Failed to resolve company_id:', companyError);
                    alert('تعذر تحديد الشركة الحالية');
                    return;
                }

                console.log('[UserCreate] Step 2: Creating profile (upsert)...', authData.user.id);
                // Use upsert instead of insert to handle cases where a database trigger might have 
                // already created the user record (common Supabase pattern)
                const { error: profileError } = await supabase.from('users').upsert({
                    id: authData.user.id,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone || null,
                    department_id: formData.department_id || null,
                    department: departments.find(d => d.id === formData.department_id)?.name || null,
                    roles: formData.roles,
                    is_active: formData.is_active,
                    company_id: companyId,
                    created_at: new Date().toISOString()
                }, { onConflict: 'id' });

                if (profileError) {
                    console.error('[UserCreate] Profile error:', profileError);
                    alert('Profile Error: ' + profileError.message);
                    return;
                }

                console.log('[UserCreate] Step 3: Assigning roles to user_roles table...');
                // CRITICAL FIX: Assign roles to user_roles table (RBAC system requirement)
                if (formData.roles && formData.roles.length > 0) {
                    for (const roleId of formData.roles) {
                        const { error: roleError } = await supabase
                            .from('user_roles')
                            .insert({
                                user_id: authData.user.id,
                                role_id: roleId,
                                assigned_at: new Date().toISOString()
                            });

                        if (roleError) {
                            console.warn(`[UserCreate] Role assignment warning for role ${roleId}:`, roleError.message);
                            // Don't fail user creation if role assignment fails
                        } else {
                            console.log(`[UserCreate] ✓ Assigned role: ${roleId}`);
                        }
                    }
                } else {
                    console.warn('[UserCreate] No roles selected - user will have zero permissions!');
                }

                console.log('[UserCreate] Step 4: Linking department...');
                // Link user to department in user_departments table
                if (formData.department_id) {
                    const { error: deptLinkError } = await supabase.from('user_departments').insert({
                        user_id: authData.user.id,
                        department_id: formData.department_id,
                        is_active: true
                    });
                    if (deptLinkError) {
                        console.warn('[UserCreate] Department link warning:', deptLinkError.message);
                    }
                }

                console.log('[UserCreate] Success!');
            } catch (err) {
                console.error('[UserCreate] Unexpected error:', err);
                alert('حدث خطأ غير متوقع');
                return;
            }
        }
        setShowModal(false);
        loadData();

        // Trigger real-time permission refresh
        window.dispatchEvent(new Event('permissions-changed'));
    };

    const handleDelete = (user: UserFull) => {
        setDeleteTarget(user);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            // Attempt to delete via secure admin RPC (deletes from auth.users -> cascades to public)
            const { error: rpcError } = await supabase.rpc('delete_user_by_admin', {
                target_user_id: deleteTarget.id
            });

            if (rpcError) {
                console.warn('RPC deletion failed, attempting direct public tabe deletion:', rpcError);
                // Fallback: Try delete from public table directly (if RPC fails/not exists)
                const { error } = await supabase.from('users').delete().eq('id', deleteTarget.id);
                if (error) {
                    // One last specific check: if user already deleted from public but stuck in auth?
                    // The RPC should have handled it. If we are here, it's a permission issue or constraints.
                    alert('فشل الحذف: ' + error.message);
                    return;
                }
            } else {
                console.log('User deleted successfully via admin RPC');
            }

            // Success
            loadData();
        } catch (err) {
            console.error('Delete error:', err);
            alert('حدث خطأ أثناء الحذف');
        }
        setDeleteTarget(null);
    };

    const getDeptName = (id?: string) => {
        if (!id) return '-';
        const dept = departments.find(d => d.id === id);
        return dept?.name || '-';
    };

    const filtered = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <SettingsSkeleton />;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="بحث..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    />
                </div>
                <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    <PlusIcon className="w-5 h-5" />
                    إضافة مستخدم
                </button>
            </div>
            <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-3 text-right font-semibold">الاسم</th>
                            <th className="px-4 py-3 text-right font-semibold">البريد الإلكتروني</th>
                            <th className="px-4 py-3 text-right font-semibold">القسم</th>
                            <th className="px-4 py-3 text-center font-semibold">الحالة</th>
                            <th className="px-4 py-3 text-center font-semibold">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filtered.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="px-4 py-3 font-medium">{user.name || '-'}</td>
                                <td className="px-4 py-3">{user.email}</td>
                                <td className="px-4 py-3">{getDeptName(user.department_id)}</td>
                                <td className="px-4 py-3 text-center">
                                    {user.is_active ? (
                                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">نشط</span>
                                    ) : (
                                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">غير نشط</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                        <button onClick={() => openEdit(user)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(user)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="text-sm text-gray-500">{filtered.length} مستخدم</div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">الاسم</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" disabled={!!editing} />
                        </div>
                        {!editing && (
                            <div>
                                <label className="block text-sm font-medium mb-1">كلمة المرور *</label>
                                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="********" />
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">الهاتف</label>
                            <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">القسم</label>
                            <select
                                value={formData.department_id}
                                onChange={e => setFormData({ ...formData, department_id: e.target.value, roles: [] })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">-- بدون قسم --</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Role Selection - filtered by department */}
                    {formData.department_id && (
                        <div>
                            <label className="block text-sm font-medium mb-2">الدور الوظيفي</label>
                            {getAvailableRoles().length > 0 ? (
                                <div className="flex flex-wrap gap-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                    {getAvailableRoles().map(role => (
                                        <label
                                            key={role.id}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${formData.roles.includes(role.id)
                                                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-700'
                                                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-primary-300'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.roles.includes(role.id)}
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        setFormData({ ...formData, roles: [...formData.roles, role.id] });
                                                    } else {
                                                        setFormData({ ...formData, roles: formData.roles.filter(r => r !== role.id) });
                                                    }
                                                }}
                                                className="sr-only"
                                            />
                                            <span className="text-sm">{role.name_ar || role.name}</span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                    لم يتم تعيين أدوار لهذا القسم. اذهب إلى "الأقسام والأدوار" لإضافة أدوار.
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="rounded" />
                            <span className="text-sm font-medium">مستخدم نشط</span>
                        </label>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">إلغاء</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                            <CheckIcon className="w-4 h-4" />
                            حفظ
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <TrashIcon className="w-5 h-5 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">تأكيد الحذف</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            هل أنت متأكد من حذف المستخدم <strong>"{deleteTarget.name}"</strong>؟
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                            >
                                <TrashIcon className="w-4 h-4" />
                                حذف
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==================== Roles Tab Component ====================
const RolesTab: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState({ name: '', name_ar: '', code: '', color: '#6B7280', category: 'general', description: '' });

    useEffect(() => { loadRoles(); }, []);

    const loadRoles = async () => {
        setLoading(true);
        const { data } = await supabase.from('roles').select('id, name, name_ar, code, description, description_ar, color, priority, is_system, is_active, category').order('priority');
        setRoles(data || []);
        setLoading(false);
    };

    const openAdd = () => {
        setEditingRole(null);
        setFormData({ name: '', name_ar: '', code: '', color: '#6B7280', category: 'general', description: '' });
        setShowModal(true);
    };

    const openEdit = (role: Role) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            name_ar: role.name_ar || '',
            code: role.code,
            color: role.color,
            category: role.category || 'general',
            description: role.description || ''
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (editingRole) {
            await supabase.from('roles').update({
                name: formData.name,
                name_ar: formData.name_ar,
                code: formData.code,
                color: formData.color,
                category: formData.category,
                description: formData.description,
                updated_at: new Date().toISOString()
            }).eq('id', editingRole.id);
        } else {
            await supabase.from('roles').insert({
                name: formData.name,
                name_ar: formData.name_ar,
                code: formData.code,
                color: formData.color,
                category: formData.category,
                description: formData.description,
                is_system: false,
                is_active: true,
                priority: 50
            });
        }
        setShowModal(false);
        loadRoles();
    };

    const handleDelete = async (role: Role) => {
        if (role.is_system) {
            alert('لا يمكن حذف دور النظام');
            return;
        }
        if (confirm(`هل تريد حذف الدور "${role.name_ar || role.name}"؟`)) {
            await supabase.from('roles').delete().eq('id', role.id);
            loadRoles();
        }
    };

    const categoryLabels: Record<string, string> = {
        executive: 'الإدارة التنفيذية',
        quality: 'ضمان الجودة',
        production: 'الإنتاج',
        laboratory: 'المختبر',
        maintenance: 'الصيانة',
        supply_chain: 'سلسلة التوريد',
        support: 'الدعم',
        general: 'عام'
    };

    const filtered = roles.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.name_ar?.includes(search) ||
        r.code.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <SettingsSkeleton />;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="بحث..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    />
                </div>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                    <PlusIcon className="w-5 h-5" />
                    إضافة دور
                </button>
            </div>

            {/* Table */}
            <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-3 text-right font-semibold">اللون</th>
                            <th className="px-4 py-3 text-right font-semibold">الاسم</th>
                            <th className="px-4 py-3 text-right font-semibold">الاسم بالعربي</th>
                            <th className="px-4 py-3 text-right font-semibold">الكود</th>
                            <th className="px-4 py-3 text-right font-semibold">التصنيف</th>
                            <th className="px-4 py-3 text-right font-semibold">نوع</th>
                            <th className="px-4 py-3 text-center font-semibold">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filtered.map(role => (
                            <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="px-4 py-3">
                                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: role.color }} />
                                </td>
                                <td className="px-4 py-3 font-medium">{role.name}</td>
                                <td className="px-4 py-3">{role.name_ar || '-'}</td>
                                <td className="px-4 py-3">
                                    <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">{role.code}</code>
                                </td>
                                <td className="px-4 py-3">{categoryLabels[role.category || 'general']}</td>
                                <td className="px-4 py-3">
                                    {role.is_system ? (
                                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">نظام</span>
                                    ) : (
                                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">مخصص</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => openEdit(role)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            title="تعديل"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(role)}
                                            disabled={role.is_system}
                                            className={`p-1.5 rounded-lg ${role.is_system ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`}
                                            title="حذف"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="text-sm text-gray-500">{filtered.length} دور</div>

            {/* Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingRole ? 'تعديل الدور' : 'إضافة دور جديد'}>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">الاسم (English)</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الاسم (عربي)</label>
                            <input
                                type="text"
                                value={formData.name_ar}
                                onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">الكود</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">اللون</label>
                            <input
                                type="color"
                                value={formData.color}
                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                className="w-full h-10 rounded-lg cursor-pointer"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">التصنيف</label>
                        <select
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        >
                            {Object.entries(categoryLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">الوصف</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            rows={2}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                            إلغاء
                        </button>
                        <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                            <CheckIcon className="w-4 h-4" />
                            حفظ
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

// ==================== Departments Tab Component (Master-Detail Layout) ====================
type DeptWithChildren = DepartmentWithChildren;

const DepartmentsTab: React.FC = () => {
    const [departments, setDepartments] = useState<DeptWithChildren[]>([]);
    const [allRoles, setAllRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showRolePicker, setShowRolePicker] = useState(false);
    const [showRoleEditModal, setShowRoleEditModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleFormData, setRoleFormData] = useState({ name_ar: '', name_en: '', description: '' });
    const [editing, setEditing] = useState<DeptWithChildren | null>(null);
    const [parentId, setParentId] = useState<string | null>(null);
    const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', name_en: '', code: '', color: '#6B7280', selectedRoles: [] as string[] });
    const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart'); // Default to chart view

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        const [deptRes, rolesRes, deptRolesRes] = await Promise.all([
            supabase.from('departments').select('id, name, name_en, code, color, is_active, parent_department_id, sort_order, description').order('sort_order'),
            supabase.from('roles').select('id, name, name_ar, code, description_ar').eq('is_active', true),
            supabase.from('department_roles').select('department_id, role_id, roles(id, name, name_ar)')
        ]);

        const depts = deptRes.data || [];
        const deptRoles = deptRolesRes.data || [];

        const deptsWithRoles = depts.map(d => ({
            ...d,
            roles: deptRoles.filter(dr => dr.department_id === d.id).map(dr => dr.roles).filter(Boolean)
        }));

        setDepartments(deptsWithRoles);
        setAllRoles(rolesRes.data || []);

        // Expand all by default and select first if none selected
        if (expandedDepts.size === 0) {
            setExpandedDepts(new Set(depts.map(d => d.id)));
        }
        if (!selectedDeptId && depts.length > 0) {
            setSelectedDeptId(depts[0].id);
        }
        setLoading(false);
    };

    const buildTree = (depts: DeptWithChildren[], parentId: string | null = null): DeptWithChildren[] => {
        return depts
            .filter(d => d.parent_department_id === parentId)
            .map(d => ({ ...d, children: buildTree(depts, d.id) }));
    };

    const tree = buildTree(departments, null);
    const selectedDept = departments.find(d => d.id === selectedDeptId);

    const openAdd = (parent: string | null = null) => {
        setEditing(null);
        setParentId(parent);
        setFormData({ name: '', name_en: '', code: '', color: '#6B7280', selectedRoles: [] });
        setShowModal(true);
    };

    const openEdit = (dept: DeptWithChildren) => {
        setEditing(dept);
        setParentId(dept.parent_department_id || null);
        setFormData({
            name: dept.name,
            name_en: dept.name_en || '',
            code: dept.code || '',
            color: dept.color || '#6B7280',
            selectedRoles: dept.roles?.map(r => r.id) || []
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        let deptId = editing?.id;

        if (editing) {
            await supabase.from('departments').update({
                name: formData.name,
                name_en: formData.name_en,
                code: formData.code,
                color: formData.color,
                parent_department_id: parentId,
                updated_at: new Date().toISOString()
            }).eq('id', editing.id);
        } else {
            const { data } = await supabase.from('departments').insert({
                name: formData.name,
                name_en: formData.name_en,
                code: formData.code,
                color: formData.color,
                parent_department_id: parentId,
                active: true
            }).select('id').single();
            deptId = data?.id;
        }

        setShowModal(false);
        loadData();
    };

    const handleDelete = async (dept: DeptWithChildren) => {
        // Check for sub-departments
        const hasChildren = departments.some(d => d.parent_department_id === dept.id);
        if (hasChildren) {
            alert('لا يمكن حذف قسم يحتوي على أقسام فرعية');
            return;
        }

        if (!confirm(`هل تريد حذف القسم "${dept.name}"؟`)) return;

        try {
            // Delete related records first
            await supabase.from('department_roles').delete().eq('department_id', dept.id);
            // Update users to remove department reference
            await supabase.from('users').update({ department_id: null, department: null }).eq('department_id', dept.id);
            // Delete the department
            const { error } = await supabase.from('departments').delete().eq('id', dept.id);

            if (error) {
                console.error('Delete error:', error);
                alert('حدث خطأ أثناء الحذف: ' + error.message);
                return;
            }

            if (selectedDeptId === dept.id) setSelectedDeptId(null);
            loadData();
        } catch (err) {
            console.error('Delete error:', err);
            alert('حدث خطأ أثناء الحذف');
        }
    };

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedDepts);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedDepts(newSet);
    };

    const toggleRole = async (deptId: string, roleId: string) => {
        const dept = departments.find(d => d.id === deptId);
        const isAssigned = dept?.roles?.some(r => r.id === roleId);

        if (isAssigned) {
            await supabase.from('department_roles').delete().eq('department_id', deptId).eq('role_id', roleId);
        } else {
            await supabase.from('department_roles').insert({ department_id: deptId, role_id: roleId });
        }
        loadData();
    };

    // Render tree item
    const renderTreeItem = (dept: DeptWithChildren, level: number = 0) => {
        const hasChildren = dept.children && dept.children.length > 0;
        const isExpanded = expandedDepts.has(dept.id);
        const isSelected = selectedDeptId === dept.id;

        return (
            <div key={dept.id}>
                <div
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors border-r-4 ${isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-primary-600'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent'
                        }`}
                    style={{ paddingRight: `${12 + level * 20}px` }}
                    onClick={() => setSelectedDeptId(dept.id)}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(dept.id); }}
                        className={`p-1 rounded hover:bg-black/10 transition-transform ${hasChildren ? '' : 'invisible'}`}
                    >
                        <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                        </svg>
                    </button>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color || '#6B7280' }} />
                    <span className={`text-sm ${isSelected ? 'font-bold text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {dept.name}
                    </span>
                    {dept.roles && dept.roles.length > 0 && (
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full text-gray-500">
                            {dept.roles.length}
                        </span>
                    )}
                </div>
                {isExpanded && dept.children?.map(child => renderTreeItem(child, level + 1))}
            </div>
        );
    };

    if (loading) return <SettingsSkeleton />;

    return (
        <div className="flex flex-col h-[calc(100vh-200px)">
            {/* Header with View Toggle */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
                <div className="flex items-center gap-3">
                    <BuildingOfficeIcon className="w-6 h-6 text-primary-600" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">الهيكل التنظيمي</h2>
                    <div className="flex items-center gap-1 px-1 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <button
                            onClick={() => setViewMode('chart')}
                            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === 'chart'
                                ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            📊 مخطط بصري
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === 'list'
                                ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            📝 قائمة
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            {viewMode === 'chart' ? (
                /* Organizational Chart View */
                <OrganizationalChart
                    departments={departments}
                    selectedDeptId={selectedDeptId}
                    onSelectDepartment={setSelectedDeptId}
                    onAddDepartment={openAdd}
                    onEditDepartment={openEdit}
                    onDeleteDepartment={handleDelete}
                />
            ) : (
                /* Traditional List View */
                <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden p-4">
                    {/* Left Panel: Organization Tree */}
                    <div className="col-span-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <h3 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <BuildingOfficeIcon className="w-5 h-5" />
                                الأقسام
                            </h3>
                            <button onClick={() => openAdd(null)} className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 text-primary-600 shadow-sm" title="إضافة قسم رئيسي">
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto py-2">
                            {tree.map(dept => renderTreeItem(dept))}
                        </div>
                    </div>

                    {/* Right Panel: Details & Roles */}
                    <div className="col-span-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                        {selectedDept ? (
                            <>
                                {/* Department Header */}
                                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg" style={{ backgroundColor: selectedDept.color || '#6B7280' }}>
                                            {selectedDept.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                {selectedDept.name}
                                                {selectedDept.parent_department_id && (
                                                    <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">فرعي</span>
                                                )}
                                            </h2>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex gap-4">
                                                <span>{selectedDept.name_ar || selectedDept.name}</span>
                                                {selectedDept.code && <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 rounded text-xs">{selectedDept.code}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openAdd(selectedDept.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 text-gray-700 dark:text-gray-300 shadow-sm">
                                            <PlusIcon className="w-4 h-4" />
                                            قسم فرعي
                                        </button>
                                        <button onClick={() => openEdit(selectedDept)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <PencilIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDelete(selectedDept)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Roles Section */}
                                <div className="p-6 flex-1 overflow-y-auto">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <ShieldCheckIcon className="w-5 h-5 text-primary-600" />
                                                الأدوار والمراتب الوظيفية
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1">إدارة الصلاحيات والأدوار التابعة لهذا القسم</p>
                                        </div>
                                        <button
                                            onClick={() => setShowRolePicker(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-md transition-all hover:translate-y-[-1px]"
                                        >
                                            <PlusIcon className="w-5 h-5" />
                                            إضافة دور للقسم
                                        </button>
                                    </div>

                                    {selectedDept.roles && selectedDept.roles.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {selectedDept.roles.map(role => (
                                                <div key={role.id} className="group flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                            <UserGroupIcon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900 dark:text-white">{role.name_ar || role.name}</div>
                                                            <div className="text-xs text-gray-500">{role.name}</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleRole(selectedDept.id, role.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="إزالة الدور"
                                                    >
                                                        <XMarkIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                                            <UserGroupIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <h4 className="text-lg font-medium text-gray-500">لا توجد أدوار مسندة</h4>
                                            <p className="text-sm text-gray-400 mt-1">قم بإضافة أدوار لهذا القسم لتحديد الصلاحيات</p>
                                            <button
                                                onClick={() => setShowRolePicker(true)}
                                                className="mt-4 text-primary-600 font-medium hover:underline"
                                            >
                                                إضافة أدوار الآن
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-900/30">
                                <BuildingOfficeIcon className="w-20 h-20 mb-4 opacity-20" />
                                <p className="text-lg">اختر قسماً من القائمة لعرض التفاصيل</p>
                            </div>
                        )}
                    </div>
                </div>
            )}     {/* Department Edit Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'تعديل القسم' : (parentId ? 'إضافة قسم فرعي' : 'إضافة قسم رئيسي')}>
                <div className="space-y-4">
                    {parentId && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm">
                            <span className="text-blue-700 dark:text-blue-300">قسم فرعي من: </span>
                            <strong>{departments.find(d => d.id === parentId)?.name}</strong>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">الاسم (عربي)</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الاسم (English)</label>
                            <input type="text" value={formData.name_en} onChange={e => setFormData({ ...formData, name_en: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">الكود</label>
                            <input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">اللون</label>
                            <input type="color" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} className="w-full h-10 p-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 cursor-pointer" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">إلغاء</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                        <CheckIcon className="w-4 h-4" />
                        حفظ
                    </button>
                </div>
            </Modal>

            {/* Role Picker Modal with Create Option */}
            <Modal isOpen={showRolePicker} onClose={() => setShowRolePicker(false)} title="إدارة الأدوار">
                <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="بحث عن دور..." className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    </div>

                    {/* All Roles List with Edit/Delete */}
                    <div className="max-h-64 overflow-y-auto space-y-2 border-b border-gray-200 dark:border-gray-700 pb-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">جميع الأدوار</h4>
                        {allRoles.map(role => {
                            const isAssigned = selectedDept?.roles?.some(r => r.id === role.id);
                            return (
                                <div key={role.id} className="flex items-center justify-between gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-600 flex-shrink-0">
                                            {(role.name_ar || role.name).charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="font-medium text-gray-900 dark:text-white truncate block">{role.name_ar || role.name}</span>
                                            <span className="text-xs text-gray-400 truncate block">{role.code || role.name}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {/* Edit Button */}
                                        <button
                                            onClick={() => {
                                                setEditingRole(role);
                                                setRoleFormData({
                                                    name_ar: role.name_ar || '',
                                                    name_en: role.name || '',
                                                    description: role.description_ar || ''
                                                });
                                                setShowRoleEditModal(true);
                                            }}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            title="تعديل"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        {/* Delete Button */}
                                        <button
                                            onClick={async () => {
                                                if (confirm(`هل تريد حذف الدور "${role.name_ar || role.name}"؟`)) {
                                                    await supabase.from('department_roles').delete().eq('role_id', role.id);
                                                    await supabase.from('roles').delete().eq('id', role.id);
                                                    loadData();
                                                }
                                            }}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                            title="حذف"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                        {/* Add/Remove from Department */}
                                        {isAssigned ? (
                                            <button
                                                onClick={() => toggleRole(selectedDeptId!, role.id)}
                                                className="px-2 py-1 text-xs bg-red-100 text-red-600 hover:bg-red-200 rounded-lg"
                                            >
                                                إزالة
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => toggleRole(selectedDeptId!, role.id)}
                                                className="px-2 py-1 text-xs bg-green-100 text-green-600 hover:bg-green-200 rounded-lg"
                                            >
                                                إضافة
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Create New Role Section */}
                    <div className="pt-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <PlusIcon className="w-4 h-4" />
                            إنشاء دور جديد
                        </h4>
                        <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="اسم الدور (عربي)"
                                    id="newRoleName"
                                    className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                                />
                                <input
                                    type="text"
                                    placeholder="Role Name (English)"
                                    id="newRoleNameEn"
                                    className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="وصف الدور"
                                id="newRoleDesc"
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                            />
                            <button
                                onClick={async () => {
                                    const nameAr = (document.getElementById('newRoleName') as HTMLInputElement)?.value;
                                    const nameEn = (document.getElementById('newRoleNameEn') as HTMLInputElement)?.value;
                                    const desc = (document.getElementById('newRoleDesc') as HTMLInputElement)?.value;
                                    if (!nameAr) { alert('يرجى إدخال اسم الدور'); return; }
                                    // Check for duplicates
                                    const exists = allRoles.some(r => r.name_ar === nameAr || r.name === nameEn);
                                    if (exists) { alert('هذا الدور موجود بالفعل'); return; }
                                    // Create role
                                    const { data } = await supabase.from('roles').insert({
                                        name: nameEn || nameAr,
                                        name_ar: nameAr,
                                        description_ar: desc,
                                        code: nameEn?.toUpperCase().replace(/\s+/g, '_') || nameAr.substring(0, 10),
                                        color: '#6B7280',
                                        priority: 50,
                                        is_active: true
                                    }).select('id').single();
                                    if (data?.id && selectedDeptId) {
                                        await supabase.from('department_roles').insert({ department_id: selectedDeptId, role_id: data.id });
                                    }
                                    loadData();
                                    (document.getElementById('newRoleName') as HTMLInputElement).value = '';
                                    (document.getElementById('newRoleNameEn') as HTMLInputElement).value = '';
                                    (document.getElementById('newRoleDesc') as HTMLInputElement).value = '';
                                }}
                                className="w-full px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                            >
                                <CheckIcon className="w-4 h-4" />
                                إنشاء وإضافة للقسم
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Role Edit Modal */}
            <Modal isOpen={showRoleEditModal} onClose={() => setShowRoleEditModal(false)} title="تعديل الدور">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">اسم الدور (عربي)</label>
                            <input
                                type="text"
                                value={roleFormData.name_ar}
                                onChange={e => setRoleFormData({ ...roleFormData, name_ar: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Role Name (English)</label>
                            <input
                                type="text"
                                value={roleFormData.name_en}
                                onChange={e => setRoleFormData({ ...roleFormData, name_en: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">وصف الدور</label>
                        <textarea
                            value={roleFormData.description}
                            onChange={e => setRoleFormData({ ...roleFormData, description: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            rows={3}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setShowRoleEditModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                            إلغاء
                        </button>
                        <button
                            onClick={async () => {
                                if (!editingRole) return;
                                await supabase.from('roles').update({
                                    name_ar: roleFormData.name_ar,
                                    name: roleFormData.name_en || roleFormData.name_ar,
                                    description_ar: roleFormData.description,
                                    code: roleFormData.name_en?.toUpperCase().replace(/\s+/g, '_') || editingRole.code
                                }).eq('id', editingRole.id);
                                setShowRoleEditModal(false);
                                loadData();
                            }}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                        >
                            <CheckIcon className="w-4 h-4" />
                            حفظ التغييرات
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

// ==================== Job Titles Tab Component ====================
const JobTitlesTab: React.FC = () => {
    const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<JobTitle | null>(null);
    const [formData, setFormData] = useState({ name: '', name_en: '', department_id: '', default_role_id: '' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        const [jt, deps, r] = await Promise.all([
            supabase.from('job_titles').select('id, name, name_en, department_id, default_role_id, is_active').order('name'),
            supabase.from('departments').select('id, name').eq('active', true),
            supabase.from('roles').select('id, name, name_ar').eq('is_active', true)
        ]);
        setJobTitles(jt.data || []);
        setDepartments(deps.data || []);
        setRoles(r.data || []);
        setLoading(false);
    };

    const openAdd = () => {
        setEditing(null);
        setFormData({ name: '', name_en: '', department_id: '', default_role_id: '' });
        setShowModal(true);
    };

    const openEdit = (jt: JobTitle) => {
        setEditing(jt);
        setFormData({ name: jt.name, name_en: jt.name_en || '', department_id: jt.department_id || '', default_role_id: jt.default_role_id || '' });
        setShowModal(true);
    };

    const handleSave = async () => {
        const data = {
            name: formData.name,
            name_en: formData.name_en || null,
            department_id: formData.department_id || null,
            default_role_id: formData.default_role_id || null,
            updated_at: new Date().toISOString()
        };
        if (editing) {
            await supabase.from('job_titles').update(data).eq('id', editing.id);
        } else {
            await supabase.from('job_titles').insert({ ...data, active: true });
        }
        setShowModal(false);
        loadData();
    };

    const handleDelete = async (jt: JobTitle) => {
        if (confirm(`هل تريد حذف المسمى الوظيفي "${jt.name}"؟`)) {
            await supabase.from('job_titles').delete().eq('id', jt.id);
            loadData();
        }
    };

    const getDeptName = (id?: string) => departments.find(d => d.id === id)?.name || '-';
    const getRoleName = (id?: string) => {
        const role = roles.find(r => r.id === id);
        return role?.name_ar || role?.name || '-';
    };

    const filtered = jobTitles.filter(jt =>
        jt.name.toLowerCase().includes(search.toLowerCase()) ||
        jt.name_en?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <SettingsSkeleton />;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="بحث..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    />
                </div>
                <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    <PlusIcon className="w-5 h-5" />
                    إضافة مسمى وظيفي
                </button>
            </div>

            <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-3 text-right font-semibold">الاسم (عربي)</th>
                            <th className="px-4 py-3 text-right font-semibold">الاسم (English)</th>
                            <th className="px-4 py-3 text-right font-semibold">القسم</th>
                            <th className="px-4 py-3 text-right font-semibold">الدور الافتراضي</th>
                            <th className="px-4 py-3 text-center font-semibold">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filtered.map(jt => (
                            <tr key={jt.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="px-4 py-3 font-medium">{jt.name}</td>
                                <td className="px-4 py-3">{jt.name_en || '-'}</td>
                                <td className="px-4 py-3">{getDeptName(jt.department_id)}</td>
                                <td className="px-4 py-3">{getRoleName(jt.default_role_id)}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                        <button onClick={() => openEdit(jt)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(jt)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="text-sm text-gray-500">{filtered.length} مسمى وظيفي</div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'تعديل المسمى الوظيفي' : 'إضافة مسمى وظيفي جديد'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">الاسم (عربي)</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">الاسم (English)</label>
                        <input
                            type="text"
                            value={formData.name_en}
                            onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">القسم</label>
                        <select
                            value={formData.department_id}
                            onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">-- كل الأقسام --</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">الدور الافتراضي</label>
                        <select
                            value={formData.default_role_id}
                            onChange={e => setFormData({ ...formData, default_role_id: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="">-- بدون دور --</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.name_ar || r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">إلغاء</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                            <CheckIcon className="w-4 h-4" />
                            حفظ
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

// ==================== Main Component ====================
const AccessManagement: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Valid tab IDs
    const validTabs = ['users', 'departments', 'matrix', 'ncr-stage', 'task-stage'];

    // Get initial tab from URL or default to 'users'
    const getInitialTab = useCallback(() => {
        const tabFromUrl = searchParams.get('tab');
        return validTabs.includes(tabFromUrl || '') ? tabFromUrl! : 'users';
    }, [searchParams]);

    const [activeTab, setActiveTab] = useState(getInitialTab);

    // Update URL when tab changes (preserve section param)
    const handleTabChange = useCallback((tabId: string) => {
        setActiveTab(tabId);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', tabId);
        setSearchParams(newParams, { replace: true });
    }, [searchParams, setSearchParams]);

    // Sync state with URL on navigation (browser back/forward)
    useEffect(() => {
        const tabFromUrl = searchParams.get('tab');
        if (tabFromUrl && validTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
            setActiveTab(tabFromUrl);
        }
    }, [searchParams, activeTab]);

    const tabs = [
        { id: 'users', label: 'المستخدمين', icon: UserGroupIcon },
        { id: 'departments', label: 'الهيكل التنظيمي', icon: BuildingOfficeIcon },
        { id: 'matrix', label: 'مصفوفة الصلاحيات', icon: TableCellsIcon },
        { id: 'ncr-stage', label: 'صلاحيات NCR حسب الدور والمرحلة', icon: ExclamationTriangleIcon },
        { id: 'task-stage', label: 'صلاحيات المهام حسب الدور والمرحلة', icon: CubeIcon }
    ];

    return (
        <div className="h-full flex flex-col">
            {/* Tab Navigation */}
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex gap-1 p-1 overflow-x-auto">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto p-6">
                {activeTab === 'users' && <UsersTableTab />}
                {activeTab === 'departments' && (
                    <Suspense fallback={<SettingsSkeleton />}>
                        <OrgChart />
                    </Suspense>
                )}
                {activeTab === 'matrix' && (
                    <Suspense fallback={<SettingsSkeleton />}>
                        <div className="h-[70vh] min-h-[620px]">
                            <SimplePermissionMatrix />
                        </div>
                    </Suspense>
                )}
                {activeTab === 'ncr-stage' && (
                    <Suspense fallback={<SettingsSkeleton />}>
                        <div className="h-[70vh] min-h-[620px]">
                            <NcrStagePermissions />
                        </div>
                    </Suspense>
                )}
                {activeTab === 'task-stage' && (
                    <Suspense fallback={<SettingsSkeleton />}>
                        <div className="h-[70vh] min-h-[620px]">
                            <TaskStagePermissions />
                        </div>
                    </Suspense>
                )}
            </div>
        </div>
    );
};

export default AccessManagement;
