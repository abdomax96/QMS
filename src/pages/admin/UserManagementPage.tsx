/**
 * User Management Page
 * صفحة إدارة المستخدمين مع الأدوار المؤقتة
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    UserGroupIcon,
    PlusIcon,
    ClockIcon,
    XMarkIcon,
    CheckIcon,
    ArrowPathIcon,
    TrashIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../config/supabase';

interface User {
    id: string;
    email: string;
    full_name?: string;
    role_id?: string;
    role_name?: string;
    temp_roles?: TempRole[];
}

interface Role {
    id: string;
    name: string;
    name_ar?: string;
    color: string;
}

interface TempRole {
    id: string;
    role_id: string;
    role_name: string;
    role_name_ar?: string;
    role_color: string;
    expires_at: string | null;
    reason?: string;
    status: string;
}

const UserManagementPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Temp role modal state
    const [showTempModal, setShowTempModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [tempRoleForm, setTempRoleForm] = useState({
        role_id: '',
        expires_at: '',
        reason: ''
    });
    const [saving, setSaving] = useState(false);

    // Load users and roles
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Get users from auth.users via profiles or direct query
            const [usersRes, rolesRes, tempRolesRes] = await Promise.all([
                supabase.from('users').select('id, email, full_name, role_id'),
                supabase.from('roles').select('id, name, name_ar, color').eq('is_active', true),
                supabase.from('user_temp_roles')
                    .select(`
                        id, user_id, role_id, expires_at, reason,
                        roles(name, name_ar, color)
                    `)
                    .eq('is_active', true)
            ]);

            const rolesData = rolesRes.data || [];
            const tempRolesData = tempRolesRes.data || [];

            // Map temp roles to users
            const usersWithTempRoles = (usersRes.data || []).map((user: any) => {
                const userTempRoles = tempRolesData
                    .filter((tr: any) => tr.user_id === user.id)
                    .map((tr: any) => ({
                        id: tr.id,
                        role_id: tr.role_id,
                        role_name: tr.roles?.name || '',
                        role_name_ar: tr.roles?.name_ar || '',
                        role_color: tr.roles?.color || '#6B7280',
                        expires_at: tr.expires_at,
                        reason: tr.reason,
                        status: !tr.expires_at ? 'permanent' :
                            new Date(tr.expires_at) > new Date() ? 'active' : 'expired'
                    }));

                const primaryRole = rolesData.find((r: Role) => r.id === user.role_id);

                return {
                    ...user,
                    role_name: primaryRole?.name || 'No Role',
                    temp_roles: userTempRoles
                };
            });

            setUsers(usersWithTempRoles);
            setRoles(rolesData);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Open temp role modal
    const openTempRoleModal = (user: User) => {
        setSelectedUser(user);
        setTempRoleForm({ role_id: '', expires_at: '', reason: '' });
        setShowTempModal(true);
    };

    // Save temp role
    const saveTempRole = async () => {
        if (!selectedUser || !tempRoleForm.role_id) return;

        setSaving(true);
        try {
            await supabase.from('user_temp_roles').upsert({
                user_id: selectedUser.id,
                role_id: tempRoleForm.role_id,
                expires_at: tempRoleForm.expires_at || null,
                reason: tempRoleForm.reason || null,
                is_active: true
            }, {
                onConflict: 'user_id,role_id'
            });

            await loadData();
            setShowTempModal(false);
        } catch (error) {
            console.error('Error saving temp role:', error);
        } finally {
            setSaving(false);
        }
    };

    // Remove temp role
    const removeTempRole = async (tempRoleId: string) => {
        try {
            await supabase.from('user_temp_roles')
                .update({ is_active: false })
                .eq('id', tempRoleId);
            await loadData();
        } catch (error) {
            console.error('Error removing temp role:', error);
        }
    };

    // Filter users
    const filteredUsers = users.filter(u =>
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Format date for display
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'دائم';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="p-6 h-full overflow-y-auto" dir="rtl">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <UserGroupIcon className="w-8 h-8 text-primary-600" />
                    إدارة المستخدمين
                </h1>
                <p className="text-gray-500 mt-1">إضافة وتعديل صلاحيات المستخدمين والأدوار المؤقتة</p>
            </div>

            {/* Search */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="بحث عن مستخدم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full max-w-md p-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             dark:bg-gray-700 dark:text-white"
                />
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-right font-medium text-gray-700 dark:text-gray-300">المستخدم</th>
                            <th className="p-3 text-right font-medium text-gray-700 dark:text-gray-300">الدور الأساسي</th>
                            <th className="p-3 text-right font-medium text-gray-700 dark:text-gray-300">الأدوار المؤقتة</th>
                            <th className="p-3 text-center font-medium text-gray-700 dark:text-gray-300">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3">
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {user.full_name || 'No Name'}
                                        </div>
                                        <div className="text-xs text-gray-500">{user.email}</div>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded text-xs">
                                        {user.role_name}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                        {user.temp_roles?.filter(tr => tr.status !== 'expired').map(tr => (
                                            <div
                                                key={tr.id}
                                                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                                                style={{ backgroundColor: tr.role_color + '20', color: tr.role_color }}
                                            >
                                                <ClockIcon className="w-3 h-3" />
                                                <span>{tr.role_name_ar || tr.role_name}</span>
                                                <span className="text-[10px] opacity-70">
                                                    ({formatDate(tr.expires_at)})
                                                </span>
                                                <button
                                                    onClick={() => removeTempRole(tr.id)}
                                                    className="hover:bg-red-200 rounded p-0.5"
                                                    title="إزالة"
                                                >
                                                    <XMarkIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {(!user.temp_roles || user.temp_roles.filter(tr => tr.status !== 'expired').length === 0) && (
                                            <span className="text-gray-400 text-xs">لا توجد أدوار مؤقتة</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-3 text-center">
                                    <button
                                        onClick={() => openTempRoleModal(user)}
                                        className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 
                                                 rounded hover:bg-green-200 dark:hover:bg-green-800 inline-flex items-center gap-1"
                                    >
                                        <PlusIcon className="w-3 h-3" />
                                        دور مؤقت
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        لا يوجد مستخدمون
                    </div>
                )}
            </div>

            {/* Temp Role Modal */}
            {showTempModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                                إضافة دور مؤقت
                            </h3>
                            <button onClick={() => setShowTempModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                <XMarkIcon className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="font-medium text-gray-900 dark:text-white">{selectedUser.full_name || 'No Name'}</div>
                            <div className="text-sm text-gray-500">{selectedUser.email}</div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    الدور المؤقت
                                </label>
                                <select
                                    value={tempRoleForm.role_id}
                                    onChange={(e) => setTempRoleForm(f => ({ ...f, role_id: e.target.value }))}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                             dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">اختر الدور...</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>
                                            {role.name_ar || role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    تاريخ الانتهاء (اختياري)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={tempRoleForm.expires_at}
                                    onChange={(e) => setTempRoleForm(f => ({ ...f, expires_at: e.target.value }))}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                             dark:bg-gray-700 dark:text-white"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">اتركه فارغاً للدور الدائم</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    السبب (اختياري)
                                </label>
                                <input
                                    type="text"
                                    value={tempRoleForm.reason}
                                    onChange={(e) => setTempRoleForm(f => ({ ...f, reason: e.target.value }))}
                                    placeholder="مثال: تغطية إجازة موظف"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                             dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowTempModal(false)}
                                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                                         dark:hover:bg-gray-700 rounded-lg"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={saveTempRole}
                                disabled={!tempRoleForm.role_id || saving}
                                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 
                                         disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                                إضافة
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;
