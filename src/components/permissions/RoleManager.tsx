import React, { useState } from 'react';
import {
    PlusIcon,
    TrashIcon,
    ShieldCheckIcon,
    UserGroupIcon,
    KeyIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils';

export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: Permission[];
    users: string[];
    color: string;
    priority: number;
}

export interface Permission {
    id: string;
    resource: string;
    action: 'create' | 'read' | 'update' | 'delete' | 'approve';
    conditions?: PermissionCondition[];
}

export interface PermissionCondition {
    type: 'time' | 'field' | 'status' | 'owner';
    value: any;
}

interface RoleManagerProps {
    roles: Role[];
    onChange: (roles: Role[]) => void;
}

const RESOURCES = [
    'folders', 'templates', 'instances', 'reports', 'users', 'settings'
];

const ACTIONS: Permission['action'][] = [
    'create', 'read', 'update', 'delete', 'approve'
];

const ACTION_LABELS = {
    create: 'إنشاء',
    read: 'قراءة',
    update: 'تعديل',
    delete: 'حذف',
    approve: 'موافقة'
};

const ROLE_COLORS = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'
];

const RoleManager: React.FC<RoleManagerProps> = ({ roles, onChange }) => {
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [newRoleName, setNewRoleName] = useState('');

    const addRole = () => {
        if (!newRoleName.trim()) return;

        const newRole: Role = {
            id: `role-${Date.now()}`,
            name: newRoleName,
            permissions: [],
            users: [],
            color: ROLE_COLORS[roles.length % ROLE_COLORS.length],
            priority: roles.length
        };

        onChange([...roles, newRole]);
        setNewRoleName('');
        setSelectedRole(newRole.id);
    };

    const removeRole = (roleId: string) => {
        onChange(roles.filter(r => r.id !== roleId));
        if (selectedRole === roleId) {
            setSelectedRole(null);
        }
    };

    const updateRole = (roleId: string, updates: Partial<Role>) => {
        onChange(roles.map(r => r.id === roleId ? { ...r, ...updates } : r));
    };

    const togglePermission = (roleId: string, resource: string, action: Permission['action']) => {
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        const permissionId = `${resource}:${action}`;
        const existingIndex = role.permissions.findIndex(p => p.id === permissionId);

        let newPermissions;
        if (existingIndex >= 0) {
            newPermissions = role.permissions.filter((_, idx) => idx !== existingIndex);
        } else {
            newPermissions = [
                ...role.permissions,
                { id: permissionId, resource, action, conditions: [] }
            ];
        }

        updateRole(roleId, { permissions: newPermissions });
    };

    const hasPermission = (role: Role, resource: string, action: Permission['action']): boolean => {
        return role.permissions.some(p => p.resource === resource && p.action === action);
    };

    const selectedRoleData = roles.find(r => r.id === selectedRole);

    return (
        <div className="grid grid-cols-3 gap-6 h-full">
            {/* Roles List */}
            <div className="col-span-1 space-y-4">
                <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 p-6 rounded-lg text-white">
                    <div className="flex items-center gap-3">
                        <ShieldCheckIcon className="w-8 h-8" />
                        <div>
                            <h2 className="text-xl font-bold">إدارة الأدوار</h2>
                            <p className="text-cyan-100 text-sm mt-1">
                                {roles.length} دور
                            </p>
                        </div>
                    </div>
                </div>

                {/* Add New Role */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                        دور جديد
                    </h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            placeholder="اسم الدور..."
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 dark:bg-gray-700 dark:text-white text-sm"
                            onKeyPress={(e) => e.key === 'Enter' && addRole()}
                        />
                        <button
                            onClick={addRole}
                            className="px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                        >
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Roles List */}
                <div className="space-y-2">
                    {roles.map((role) => (
                        <div
                            key={role.id}
                            onClick={() => setSelectedRole(role.id)}
                            className={cn(
                                'p-4 rounded-lg border-2 cursor-pointer transition-all',
                                selectedRole === role.id
                                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-cyan-300'
                            )}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: role.color }}
                                        />
                                        <h4 className="font-semibold text-gray-900 dark:text-white">
                                            {role.name}
                                        </h4>
                                    </div>
                                    {role.description && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            {role.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <KeyIcon className="w-3 h-3" />
                                            {role.permissions.length} صلاحية
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <UserGroupIcon className="w-3 h-3" />
                                            {role.users.length} مستخدم
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeRole(role.id);
                                    }}
                                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {roles.length === 0 && (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                            <ShieldCheckIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                لم يتم إضافة أي أدوار بعد
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Role Details & Permissions */}
            <div className="col-span-2">
                {selectedRoleData ? (
                    <div className="space-y-6">
                        {/* Role Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                                معلومات الدور
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        اسم الدور
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedRoleData.name}
                                        onChange={(e) => updateRole(selectedRole!, { name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        الوصف
                                    </label>
                                    <textarea
                                        value={selectedRoleData.description || ''}
                                        onChange={(e) => updateRole(selectedRole!, { description: e.target.value })}
                                        rows={2}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="وصف اختياري للدور..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        اللون
                                    </label>
                                    <div className="flex gap-2">
                                        {ROLE_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                onClick={() => updateRole(selectedRole!, { color })}
                                                className={cn(
                                                    'w-8 h-8 rounded-full transition-transform',
                                                    selectedRoleData.color === color && 'ring-4 ring-cyan-500 scale-110'
                                                )}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Permissions Matrix */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                                الصلاحيات
                            </h3>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                                                المورد
                                            </th>
                                            {ACTIONS.map((action) => (
                                                <th key={action} className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                                                    {ACTION_LABELS[action]}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {RESOURCES.map((resource) => (
                                            <tr key={resource} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="py-3 px-4 font-medium text-gray-900 dark:text-white capitalize">
                                                    {resource}
                                                </td>
                                                {ACTIONS.map((action) => (
                                                    <td key={action} className="py-3 px-4 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={hasPermission(selectedRoleData, resource, action)}
                                                            onChange={() => togglePermission(selectedRole!, resource, action)}
                                                            className="w-5 h-5 text-cyan-600 rounded focus:ring-cyan-500 cursor-pointer"
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    const allPermissions: Permission[] = [];
                                    RESOURCES.forEach(resource => {
                                        ACTIONS.forEach(action => {
                                            allPermissions.push({
                                                id: `${resource}:${action}`,
                                                resource,
                                                action,
                                                conditions: []
                                            });
                                        });
                                    });
                                    updateRole(selectedRole!, { permissions: allPermissions });
                                }}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                تفعيل جميع الصلاحيات
                            </button>
                            <button
                                onClick={() => updateRole(selectedRole!, { permissions: [] })}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                إلغاء جميع الصلاحيات
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <div className="text-center">
                            <ShieldCheckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">
                                اختر دوراً لعرض وتعديل الصلاحيات
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoleManager;
