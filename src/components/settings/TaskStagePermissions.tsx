/**
 * Task Stage Permissions Component (Role-first view)
 * Source of truth: task_stage_permissions (role_id + stage_code).
 * Mirrors NcrStagePermissions pattern.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowPathIcon,
    CheckIcon,
    InformationCircleIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../config/supabase';

interface TaskStage {
    id: string;
    code: string;
    name: string;
    name_ar: string;
    stage_order: number;
    color: string;
}

interface RoleRow {
    id: string;
    name: string;
    name_ar?: string;
    code: string;
    color?: string;
}

interface StagePermission {
    id?: string;
    stage_code: string;
    role_id: string;
    allowed_actions: string[];
    can_advance: boolean;
    can_return: boolean;
    is_active: boolean;
}

const FALLBACK_STAGES: TaskStage[] = [
    { id: 'ts1', code: 'assignment',  name: 'Assignment',  name_ar: 'التعيين',     stage_order: 1, color: '#3b82f6' },
    { id: 'ts2', code: 'in_progress', name: 'In Progress', name_ar: 'قيد التنفيذ',  stage_order: 2, color: '#8b5cf6' },
    { id: 'ts3', code: 'review',      name: 'Review',      name_ar: 'المراجعة',    stage_order: 3, color: '#f59e0b' },
    { id: 'ts4', code: 'approval',    name: 'Approval',    name_ar: 'الاعتماد',    stage_order: 4, color: '#10b981' },
    { id: 'ts5', code: 'closed',      name: 'Closed',      name_ar: 'مغلقة',       stage_order: 5, color: '#6b7280' },
];

type StagePreset = {
    actions: string[];
    can_advance: boolean;
    can_return: boolean;
};

const STAGE_PRESETS: Record<string, StagePreset> = {
    assignment: {
        actions: ['view', 'create', 'assign', 'delegate', 'comment', 'attach', 'delete'],
        can_advance: true,
        can_return: false,
    },
    in_progress: {
        actions: ['view', 'update', 'complete', 'request_help', 'comment', 'attach'],
        can_advance: true,
        can_return: true,
    },
    review: {
        actions: ['view', 'verify', 'reject', 'comment', 'attach'],
        can_advance: true,
        can_return: true,
    },
    approval: {
        actions: ['view', 'approve', 'reject', 'comment'],
        can_advance: true,
        can_return: true,
    },
    closed: {
        actions: ['view'],
        can_advance: false,
        can_return: true,
    },
};

const ACTION_LABELS: Record<string, { en: string; ar: string }> = {
    view: { en: 'View', ar: 'عرض' },
    create: { en: 'Create', ar: 'إنشاء' },
    assign: { en: 'Assign', ar: 'تعيين' },
    delegate: { en: 'Delegate', ar: 'تفويض' },
    update: { en: 'Update', ar: 'تحديث' },
    complete: { en: 'Complete', ar: 'إكمال' },
    request_help: { en: 'Request Help', ar: 'طلب مساعدة' },
    verify: { en: 'Verify', ar: 'تحقق' },
    approve: { en: 'Approve', ar: 'اعتماد' },
    reject: { en: 'Reject', ar: 'رفض' },
    comment: { en: 'Comment', ar: 'تعليق' },
    attach: { en: 'Attach', ar: 'إرفاق' },
    delete: { en: 'Delete', ar: 'حذف' },
};

function bustPermissionCache() {
    window.dispatchEvent(new CustomEvent('permissions-changed'));
}

const TaskStagePermissions: React.FC = () => {
    const [stages, setStages] = useState<TaskStage[]>([]);
    const [roles, setRoles] = useState<RoleRow[]>([]);
    const [permissions, setPermissions] = useState<StagePermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>('');

    // Load data on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Load stages
            const { data: stageData } = await supabase
                .from('task_workflow_stages')
                .select('*')
                .eq('is_active', true)
                .order('stage_order', { ascending: true });

            setStages(stageData?.length ? stageData : FALLBACK_STAGES);

            // Load roles
            const { data: roleData } = await supabase
                .from('roles')
                .select('id, name, name_ar, code, color')
                .order('name', { ascending: true });

            setRoles(roleData || []);

            // Load all task stage permissions
            const { data: permData } = await supabase
                .from('task_stage_permissions')
                .select('*')
                .is('department_id', null);

            setPermissions(permData || []);

            // Select first role by default
            if (roleData?.length && !selectedRole) {
                setSelectedRole(roleData[0].id);
            }
        } catch (err) {
            console.error('Error loading task stage permissions:', err);
            setError('فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    // Get permissions for selected role
    const rolePermissions = useMemo(() => {
        if (!selectedRole) return {};
        const map: Record<string, StagePermission> = {};
        permissions
            .filter(p => p.role_id === selectedRole)
            .forEach(p => { map[p.stage_code] = p; });
        return map;
    }, [selectedRole, permissions]);

    // Toggle an action for a stage
    const toggleAction = async (stageCode: string, action: string) => {
        if (!selectedRole) return;
        setSaving(true);
        setError(null);

        const existing = rolePermissions[stageCode];
        let newActions: string[];

        if (existing) {
            if (existing.allowed_actions.includes(action)) {
                newActions = existing.allowed_actions.filter(a => a !== action);
            } else {
                newActions = [...existing.allowed_actions, action];
            }
        } else {
            newActions = ['view', action];
        }

        // Ensure 'view' is always included
        if (!newActions.includes('view') && newActions.length > 0) {
            newActions.unshift('view');
        }

        try {
            if (existing?.id) {
                await supabase
                    .from('task_stage_permissions')
                    .update({
                        allowed_actions: newActions,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('task_stage_permissions')
                    .insert({
                        role_id: selectedRole,
                        stage_code: stageCode,
                        allowed_actions: newActions,
                        can_advance: false,
                        can_return: false,
                        is_active: true,
                    });
            }

            await loadData();
            bustPermissionCache();
        } catch (err) {
            console.error('Error toggling action:', err);
            setError('فشل في حفظ التغيير');
        } finally {
            setSaving(false);
        }
    };

    // Toggle can_advance or can_return
    const toggleWorkflow = async (stageCode: string, field: 'can_advance' | 'can_return') => {
        if (!selectedRole) return;
        setSaving(true);

        const existing = rolePermissions[stageCode];
        const newValue = existing ? !existing[field] : true;

        try {
            if (existing?.id) {
                await supabase
                    .from('task_stage_permissions')
                    .update({
                        [field]: newValue,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('task_stage_permissions')
                    .insert({
                        role_id: selectedRole,
                        stage_code: stageCode,
                        allowed_actions: ['view'],
                        can_advance: field === 'can_advance' ? newValue : false,
                        can_return: field === 'can_return' ? newValue : false,
                        is_active: true,
                    });
            }

            await loadData();
            bustPermissionCache();
        } catch (err) {
            console.error('Error toggling workflow:', err);
            setError('فشل في حفظ التغيير');
        } finally {
            setSaving(false);
        }
    };

    // Apply preset for all stages to selected role
    const applyPreset = async () => {
        if (!selectedRole) return;
        setSaving(true);
        setError(null);

        try {
            // Delete existing permissions for this role
            await supabase
                .from('task_stage_permissions')
                .delete()
                .eq('role_id', selectedRole)
                .is('department_id', null);

            // Insert preset permissions
            const inserts = stages.map(stage => {
                const preset = STAGE_PRESETS[stage.code] || { actions: ['view'], can_advance: false, can_return: false };
                return {
                    role_id: selectedRole,
                    stage_code: stage.code,
                    allowed_actions: preset.actions,
                    can_advance: preset.can_advance,
                    can_return: preset.can_return,
                    is_active: true,
                };
            });

            await supabase.from('task_stage_permissions').insert(inserts);
            await loadData();
            bustPermissionCache();
            setSuccessMsg('تم تطبيق الإعدادات الافتراضية');
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err) {
            console.error('Error applying preset:', err);
            setError('فشل في تطبيق الإعدادات');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    const selectedRoleData = roles.find(r => r.id === selectedRole);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="h-6 w-6 text-emerald-600" />
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            صلاحيات مراحل المهام
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            تحديد الإجراءات المسموحة لكل دور في كل مرحلة من مراحل المهمة
                        </p>
                    </div>
                </div>
                <button
                    onClick={loadData}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title="تحديث"
                >
                    <ArrowPathIcon className="h-5 w-5" />
                </button>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                    {error}
                </div>
            )}
            {successMsg && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
                    <CheckIcon className="h-4 w-4" />
                    {successMsg}
                </div>
            )}

            {/* Role Selector */}
            <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    الدور:
                </label>
                <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="flex-1 max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                    {roles.map(role => (
                        <option key={role.id} value={role.id}>
                            {role.name_ar || role.name} ({role.code})
                        </option>
                    ))}
                </select>

                <button
                    onClick={applyPreset}
                    disabled={saving || !selectedRole}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
                >
                    تطبيق الافتراضي
                </button>
            </div>

            {/* Info */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                        <p>اضغط على أي خلية لتفعيل/تعطيل إجراء معين للدور <strong>{selectedRoleData?.name_ar || selectedRoleData?.name || ''}</strong> في المرحلة المحددة.</p>
                        <p className="mt-1">يمكنك أيضاً التحكم في إمكانية <strong>التقدم</strong> أو <strong>الرجوع</strong> في سير العمل.</p>
                    </div>
                </div>
            </div>

            {/* Permission Matrix */}
            {selectedRole && (
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    المرحلة
                                </th>
                                {Object.keys(ACTION_LABELS).map(action => (
                                    <th key={action} className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span>{ACTION_LABELS[action].ar}</span>
                                            <span className="text-[10px] opacity-60">{ACTION_LABELS[action].en}</span>
                                        </div>
                                    </th>
                                ))}
                                <th className="px-2 py-3 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                    تقدم
                                </th>
                                <th className="px-2 py-3 text-center text-xs font-medium text-amber-600 dark:text-amber-400">
                                    رجوع
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {stages.map(stage => {
                                const perm = rolePermissions[stage.code];
                                const actions = perm?.allowed_actions || [];

                                return (
                                    <tr key={stage.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full shrink-0"
                                                    style={{ backgroundColor: stage.color }}
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {stage.name_ar}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {stage.name}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {Object.keys(ACTION_LABELS).map(action => {
                                            const isActive = actions.includes(action);
                                            const isPreset = STAGE_PRESETS[stage.code]?.actions.includes(action);

                                            return (
                                                <td key={action} className="px-2 py-3 text-center">
                                                    <button
                                                        onClick={() => toggleAction(stage.code, action)}
                                                        disabled={saving}
                                                        className={`w-7 h-7 rounded-md border-2 transition-all inline-flex items-center justify-center ${
                                                            isActive
                                                                ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                                                                : isPreset
                                                                    ? 'border-gray-300 dark:border-gray-600 text-gray-300 dark:text-gray-600 hover:border-emerald-300'
                                                                    : 'border-gray-200 dark:border-gray-700 text-gray-200 dark:text-gray-700 hover:border-gray-300'
                                                        } disabled:opacity-50`}
                                                        title={`${ACTION_LABELS[action].ar} - ${stage.name_ar}`}
                                                    >
                                                        {isActive && <CheckIcon className="h-4 w-4" />}
                                                    </button>
                                                </td>
                                            );
                                        })}

                                        {/* Can Advance */}
                                        <td className="px-2 py-3 text-center">
                                            <button
                                                onClick={() => toggleWorkflow(stage.code, 'can_advance')}
                                                disabled={saving || stage.code === 'closed'}
                                                className={`w-7 h-7 rounded-md border-2 transition-all inline-flex items-center justify-center ${
                                                    perm?.can_advance
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                                                        : 'border-gray-200 dark:border-gray-700 text-gray-200 dark:text-gray-700 hover:border-emerald-300'
                                                } disabled:opacity-50`}
                                            >
                                                {perm?.can_advance && <CheckIcon className="h-4 w-4" />}
                                            </button>
                                        </td>

                                        {/* Can Return */}
                                        <td className="px-2 py-3 text-center">
                                            <button
                                                onClick={() => toggleWorkflow(stage.code, 'can_return')}
                                                disabled={saving || stage.code === 'assignment'}
                                                className={`w-7 h-7 rounded-md border-2 transition-all inline-flex items-center justify-center ${
                                                    perm?.can_return
                                                        ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-500 text-amber-700 dark:text-amber-300'
                                                        : 'border-gray-200 dark:border-gray-700 text-gray-200 dark:text-gray-700 hover:border-amber-300'
                                                } disabled:opacity-50`}
                                            >
                                                {perm?.can_return && <CheckIcon className="h-4 w-4" />}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TaskStagePermissions;
