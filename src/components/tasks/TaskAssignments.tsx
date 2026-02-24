/**
 * Task Assignments Component
 * عرض وإدارة المُسند إليهم بأنواع الإسناد المختلفة
 */

import React, { useEffect, useState } from 'react';
import {
    UserGroupIcon,
    UserPlusIcon,
    XMarkIcon,
    CheckIcon,
    XCircleIcon,
    ShieldCheckIcon,
    BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import type { Task, TaskAssignment, TaskAssignmentType } from '../../types/task';
import { TASK_ASSIGNMENT_TYPE_LABELS } from '../../types/task';
import { supabase } from '../../config/supabase';
import { useTaskStagePermissions } from '../../hooks/tasks/useTaskStagePermissions';
import { getTaskAssignmentScope } from '../../services/taskService';

interface TaskAssignmentsProps {
    task: Task;
    assignments: TaskAssignment[];
    currentUserId: string;
    companyId: string;
    onAssignUsers: (userIds: string[], primaryId: string) => Promise<void>;
    onAssignRole: (roleId: string) => Promise<void>;
    onAssignDepartment: (departmentId: string) => Promise<void>;
    onAccept: () => Promise<void>;
    onDecline: (reason?: string) => Promise<void>;
    onRemoveAssignment: (userId: string) => Promise<void>;
}

interface UserOption {
    id: string;
    name: string;
    email: string;
    department?: string;
}

interface RoleOption {
    id: string;
    name: string;
    name_ar?: string;
    code: string;
}

interface DepartmentOption {
    id: string;
    name: string;
    name_ar?: string;
}

const TaskAssignments: React.FC<TaskAssignmentsProps> = ({
    task,
    assignments,
    currentUserId,
    companyId,
    onAssignUsers,
    onAssignRole,
    onAssignDepartment,
    onAccept,
    onDecline,
    onRemoveAssignment,
}) => {
    const [showAssignForm, setShowAssignForm] = useState(false);
    const [assignType, setAssignType] = useState<TaskAssignmentType>(task.assignment_type || 'individual');
    const [users, setUsers] = useState<UserOption[]>([]);
    const [roles, setRoles] = useState<RoleOption[]>([]);
    const [departments, setDepartments] = useState<DepartmentOption[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [primaryUserId, setPrimaryUserId] = useState<string>('');
    const [selectedRoleId, setSelectedRoleId] = useState<string>('');
    const [selectedDeptId, setSelectedDeptId] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const { canAssign } = useTaskStagePermissions(task.current_stage);

    // Check if current user needs to accept/decline
    const myAssignment = assignments.find(a => a.user_id === currentUserId);
    const needsAcceptance = task.assignment_type === 'role' && !myAssignment;
    const canAcceptTask = task.assignment_type === 'role' && task.current_stage === 'assignment';

    // Load users, roles, departments when form opens
    useEffect(() => {
        if (!showAssignForm) return;
        loadOptions();
    }, [showAssignForm]);

    const loadOptions = async () => {
        const [scope, rolesRes] = await Promise.all([
            getTaskAssignmentScope(),
            supabase.from('roles').select('id, name, name_ar, code').order('name'),
        ]);
        setUsers(scope.users);
        setRoles(rolesRes.data || []);
        setDepartments(scope.departments);
    };

    const handleAssign = async () => {
        setLoading(true);
        try {
            if (assignType === 'individual') {
                if (selectedUserIds.length === 0) return;
                await onAssignUsers(selectedUserIds, primaryUserId || selectedUserIds[0]);
            } else if (assignType === 'role') {
                if (!selectedRoleId) return;
                await onAssignRole(selectedRoleId);
            } else if (assignType === 'department') {
                if (!selectedDeptId) return;
                await onAssignDepartment(selectedDeptId);
            }
            setShowAssignForm(false);
            setSelectedUserIds([]);
            setPrimaryUserId('');
        } catch (err) {
            console.error('Error assigning:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleUser = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const statusColors: Record<string, string> = {
        assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        accepted: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        declined: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    };

    const statusLabels: Record<string, string> = {
        assigned: 'معيّن',
        accepted: 'مقبول',
        in_progress: 'قيد العمل',
        completed: 'مكتمل',
        declined: 'مرفوض',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                    <UserGroupIcon className="h-5 w-5 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        المُسند إليهم
                    </h3>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        {TASK_ASSIGNMENT_TYPE_LABELS[task.assignment_type]?.ar || 'فردي'}
                    </span>
                </div>
                {canAssign && task.current_stage !== 'closed' && (
                    <button
                        onClick={() => setShowAssignForm(!showAssignForm)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                    >
                        <UserPlusIcon className="h-3.5 w-3.5" />
                        تعيين
                    </button>
                )}
            </div>

            {/* Role/Department Badge */}
            {task.assignment_type === 'role' && task.assigned_role_id && (
                <div className="mb-3 flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <ShieldCheckIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs text-indigo-700 dark:text-indigo-300">
                        مُسند لدور - أي شخص بهذا الدور يمكنه قبول المهمة
                    </span>
                </div>
            )}
            {task.assignment_type === 'department' && task.assigned_department_id && (
                <div className="mb-3 flex items-center gap-2 p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                    <BuildingOfficeIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-xs text-teal-700 dark:text-teal-300">
                        مُسند للقسم - مدير القسم يوزع المهمة
                    </span>
                </div>
            )}

            {/* Accept/Decline for role-based */}
            {canAcceptTask && !myAssignment && (
                <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                        هذه المهمة متاحة لك. هل تريد قبولها؟
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={onAccept}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        >
                            <CheckIcon className="h-3.5 w-3.5" />
                            قبول
                        </button>
                        <button
                            onClick={() => onDecline()}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <XCircleIcon className="h-3.5 w-3.5" />
                            رفض
                        </button>
                    </div>
                </div>
            )}

            {/* Assignments List */}
            {assignments.length > 0 ? (
                <div className="space-y-2">
                    {assignments.map(assignment => (
                        <div
                            key={assignment.id}
                            className="flex items-start justify-between gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                        >
                            <div className="flex items-start gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-medium text-blue-700 dark:text-blue-300">
                                    {(assignment.user_name || '?').charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white break-words">
                                            {assignment.user_name || 'مستخدم'}
                                        </span>
                                        {assignment.is_primary && (
                                            <StarIcon className="h-3.5 w-3.5 text-yellow-500" title="المسؤول الرئيسي" />
                                        )}
                                    </div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColors[assignment.status] || ''}`}>
                                        {statusLabels[assignment.status] || assignment.status}
                                    </span>
                                </div>
                            </div>
                            {canAssign && task.current_stage !== 'closed' && (
                                <button
                                    onClick={() => onRemoveAssignment(assignment.user_id)}
                                    className="p-1 text-gray-400 hover:text-red-500"
                                    title="إزالة"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-3">
                    لا يوجد مُسند إليهم بعد
                </p>
            )}

            {/* Assignment Form */}
            {showAssignForm && (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                    {/* Type Selector */}
                    <div className="flex flex-wrap gap-2">
                        {(['individual', 'role', 'department'] as TaskAssignmentType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => setAssignType(type)}
                                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                                    assignType === type
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                                }`}
                            >
                                {TASK_ASSIGNMENT_TYPE_LABELS[type].ar}
                            </button>
                        ))}
                    </div>

                    {/* Individual Assignment */}
                    {assignType === 'individual' && (
                        <div className="space-y-2">
                            <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                                {users.length === 0 && (
                                    <div className="px-3 py-5 text-xs text-gray-500 text-center">
                                        لا يوجد موظفون متاحون في نفس قسمك
                                    </div>
                                )}
                                {users.map(user => (
                                    <label
                                        key={user.id}
                                        className="flex flex-wrap items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedUserIds.includes(user.id)}
                                            onChange={() => toggleUser(user.id)}
                                            className="rounded border-gray-300 dark:border-gray-600"
                                        />
                                        <span className="text-sm text-gray-900 dark:text-white">{user.name}</span>
                                        {user.department && (
                                            <span className="text-xs text-gray-400">({user.department})</span>
                                        )}
                                        {selectedUserIds.includes(user.id) && (
                                            <button
                                                onClick={(e) => { e.preventDefault(); setPrimaryUserId(user.id); }}
                                                className={`mr-auto text-xs px-1.5 py-0.5 rounded ${
                                                    primaryUserId === user.id
                                                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                                        : 'text-gray-400 hover:text-yellow-600'
                                                }`}
                                                title="تعيين كمسؤول رئيسي"
                                            >
                                                {primaryUserId === user.id ? '★ رئيسي' : '☆'}
                                            </button>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Role Assignment */}
                    {assignType === 'role' && (
                        <select
                            value={selectedRoleId}
                            onChange={(e) => setSelectedRoleId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="">اختر الدور...</option>
                            {roles.map(role => (
                                <option key={role.id} value={role.id}>
                                    {role.name_ar || role.name} ({role.code})
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Department Assignment */}
                    {assignType === 'department' && (
                        <select
                            value={selectedDeptId}
                            onChange={(e) => setSelectedDeptId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="">اختر القسم...</option>
                            {departments.length === 0 && (
                                <option value="" disabled>لا يوجد قسم متاح</option>
                            )}
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.name_ar || dept.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Submit */}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                        <button
                            onClick={() => setShowAssignForm(false)}
                            className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleAssign}
                            disabled={loading}
                            className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'جارٍ...' : 'تعيين'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskAssignments;
