/**
 * NCR Stage Permissions Component (Role-first view)
 * Source of truth: ncr_stage_permissions (role_id + stage_code).
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowPathIcon,
    CheckIcon,
    InformationCircleIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../config/supabase';
import { NcrPermissionsSkeleton } from '../common/LoadingStates';

interface NcrStage {
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

interface MatrixFilterDetail {
    selectedRoleIds?: string[];
    selectedModuleCodes?: string[];
}

const STORAGE_KEYS = {
    roleIds: 'simple_permission_matrix_selected_role_ids',
    moduleCodes: 'simple_permission_matrix_selected_module_codes',
} as const;

const readStoredArray = (key: string): string[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return Array.from(
            new Set(parsed.filter((item): item is string => typeof item === 'string' && item.trim() !== ''))
        );
    } catch {
        return [];
    }
};

const FALLBACK_STAGES: NcrStage[] = [
    { id: 's1', code: 'initial_report', name: 'Initial Report', name_ar: 'التقرير الأولي', stage_order: 1, color: '#2563eb' },
    { id: 's2', code: 'root_cause_analysis', name: 'Root Cause Analysis', name_ar: 'تحليل السبب الجذري', stage_order: 2, color: '#7c3aed' },
    { id: 's3', code: 'capa_planning', name: 'CAPA Planning', name_ar: 'تخطيط الإجراءات', stage_order: 3, color: '#0ea5e9' },
    { id: 's4', code: 'capa_execution', name: 'CAPA Execution', name_ar: 'تنفيذ الإجراءات', stage_order: 4, color: '#10b981' },
    { id: 's5', code: 'verification_closure', name: 'Verification & Close', name_ar: 'التحقق والإغلاق', stage_order: 5, color: '#f59e0b' },
];

type StagePreset = {
    actions: string[];
    can_advance: boolean;
    can_return: boolean;
};

const STAGE_PRESETS: Record<string, StagePreset> = {
    initial_report: {
        actions: ['view', 'create', 'edit', 'delete', 'print'],
        can_advance: true,
        can_return: false,
    },
    root_cause_analysis: {
        actions: ['view', 'edit', 'review', 'assign', 'investigate', 'add_rca', 'approve', 'decide', 'reopen', 'print', 'root_cause.propose', 'reject'],
        can_advance: true,
        can_return: true,
    },
    capa_planning: {
        actions: ['view', 'edit', 'review', 'assign', 'approve', 'decide', 'hold_add', 'update_progress', 'reopen', 'print', 'capa.add', 'reject'],
        can_advance: true,
        can_return: true,
    },
    capa_execution: {
        actions: ['view', 'edit', 'review', 'hold_release', 'update_progress', 'reopen', 'print', 'capa.complete', 'release_hold'],
        can_advance: true,
        can_return: true,
    },
    verification_closure: {
        actions: ['view', 'verify', 'export', 'print', 'reopen', 'verify_close'],
        can_advance: false,
        can_return: true,
    },
};

const ACTION_META: Record<string, { label: string; color: string }> = {
    view: { label: 'عرض', color: '#4b5563' },
    create: { label: 'إنشاء', color: '#10b981' },
    edit: { label: 'تعديل', color: '#3b82f6' },
    delete: { label: 'حذف', color: '#ef4444' },
    review: { label: 'مراجعة', color: '#f59e0b' },
    assign: { label: 'تعيين', color: '#8b5cf6' },
    investigate: { label: 'تحقيق', color: '#ec4899' },
    add_rca: { label: 'إضافة RCA', color: '#06b6d4' },
    approve: { label: 'موافقة', color: '#10b981' },
    decide: { label: 'قرار', color: '#dc2626' },
    hold_add: { label: 'إضافة حجز', color: '#ef4444' },
    hold_release: { label: 'إفراج حجز', color: '#10b981' },
    update_progress: { label: 'تحديث التقدم', color: '#3b82f6' },
    reopen: { label: 'إعادة فتح', color: '#f59e0b' },
    print: { label: 'طباعة', color: '#6b7280' },
    export: { label: 'تصدير', color: '#6b7280' },
    verify: { label: 'تحقق', color: '#8b5cf6' },
    verify_close: { label: 'تحقق وإغلاق', color: '#16a34a' },
    reject: { label: 'رفض', color: '#ef4444' },
    'root_cause.propose': { label: 'اقتراح سبب جذري', color: '#06b6d4' },
    'capa.add': { label: 'إضافة CAPA', color: '#0ea5e9' },
    'capa.complete': { label: 'إكمال CAPA', color: '#10b981' },
    release_hold: { label: 'فك الحجز', color: '#10b981' },
};

const ACTION_ORDER = [
    'view',
    'create',
    'edit',
    'delete',
    'review',
    'assign',
    'investigate',
    'add_rca',
    'approve',
    'decide',
    'hold_add',
    'hold_release',
    'update_progress',
    'reopen',
    'export',
    'print',
    'verify',
    'verify_close',
    'root_cause.propose',
    'capa.add',
    'capa.complete',
    'release_hold',
    'reject',
];

const ACTION_ORDER_INDEX = new Map<string, number>(ACTION_ORDER.map((code, i) => [code, i]));

const makeKey = (stageCode: string, roleId: string) => `${stageCode}::${roleId}`;

const uniq = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

const sortActions = (actions: string[]): string[] =>
    uniq(actions).sort((a, b) => {
        const aIndex = ACTION_ORDER_INDEX.get(a);
        const bIndex = ACTION_ORDER_INDEX.get(b);
        if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
        if (aIndex !== undefined) return -1;
        if (bIndex !== undefined) return 1;
        return a.localeCompare(b);
    });

const ensureView = (actions: string[]): string[] => {
    const cleaned = uniq(actions);
    if (!cleaned.includes('view')) {
        cleaned.unshift('view');
    }
    return sortActions(cleaned);
};

const getActionLabel = (actionCode: string): string =>
    ACTION_META[actionCode]?.label || actionCode;

const getActionColor = (actionCode: string): string =>
    ACTION_META[actionCode]?.color || '#6b7280';

const getDefaultPermission = (stageCode: string, roleId: string): StagePermission => {
    const preset = STAGE_PRESETS[stageCode];
    return {
        stage_code: stageCode,
        role_id: roleId,
        allowed_actions: ensureView(preset?.actions || ['view']),
        can_advance: preset?.can_advance ?? false,
        can_return: preset?.can_return ?? false,
        is_active: true,
    };
};

const mapRowToPermission = (row: {
    id: string;
    role_id: string | null;
    stage_code: string;
    allowed_actions: string[] | null;
    can_advance: boolean | null;
    can_return: boolean | null;
    is_active: boolean | null;
}): StagePermission | null => {
    if (!row.role_id) return null;
    return {
        id: row.id,
        role_id: row.role_id,
        stage_code: row.stage_code,
        allowed_actions: ensureView(row.allowed_actions || []),
        can_advance: Boolean(row.can_advance),
        can_return: Boolean(row.can_return),
        is_active: row.is_active ?? true,
    };
};

const NcrStagePermissions: React.FC = () => {
    const [stages, setStages] = useState<NcrStage[]>(FALLBACK_STAGES);
    const [selectedStageCode, setSelectedStageCode] = useState(FALLBACK_STAGES[0].code);
    const [roles, setRoles] = useState<RoleRow[]>([]);
    const [dbPermissions, setDbPermissions] = useState<Map<string, StagePermission>>(new Map());
    const [pendingChanges, setPendingChanges] = useState<Map<string, StagePermission>>(new Map());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [linkedRoleIds, setLinkedRoleIds] = useState<string[]>(() => readStoredArray(STORAGE_KEYS.roleIds));
    const [linkedModuleCodes, setLinkedModuleCodes] = useState<string[]>(() => readStoredArray(STORAGE_KEYS.moduleCodes));

    useEffect(() => {
        void loadData();
    }, []);

    useEffect(() => {
        const handleMatrixFilterChange = (event: Event) => {
            const detail = (event as CustomEvent<MatrixFilterDetail>).detail || {};
            setLinkedRoleIds(Array.isArray(detail.selectedRoleIds) ? detail.selectedRoleIds : []);
            setLinkedModuleCodes(Array.isArray(detail.selectedModuleCodes) ? detail.selectedModuleCodes : []);
        };

        window.addEventListener('permission-matrix-filter-changed', handleMatrixFilterChange as EventListener);
        return () => {
            window.removeEventListener('permission-matrix-filter-changed', handleMatrixFilterChange as EventListener);
        };
    }, []);

    const isNcrModuleSelected = useMemo(() => {
        if (linkedModuleCodes.length === 0) return true;
        return linkedModuleCodes.includes('ncr');
    }, [linkedModuleCodes]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [stagesRes, rolesRes, permsRes] = await Promise.all([
                supabase
                    .from('ncr_workflow_stages')
                    .select('id, code, name, name_ar, stage_order, color, is_active')
                    .eq('is_active', true)
                    .order('stage_order'),
                supabase
                    .from('roles')
                    .select('id, name, name_ar, code, color, is_active, priority')
                    .eq('is_active', true)
                    .order('priority'),
                supabase
                    .from('ncr_stage_permissions')
                    .select('id, role_id, stage_code, allowed_actions, can_advance, can_return, is_active')
                    .is('department_id', null),
            ]);

            if (!stagesRes.error && stagesRes.data?.length) {
                const mappedStages: NcrStage[] = stagesRes.data.map(row => ({
                    id: row.id,
                    code: row.code,
                    name: row.name,
                    name_ar: row.name_ar,
                    stage_order: row.stage_order,
                    color: row.color || '#6b7280',
                }));
                setStages(mappedStages);
                if (!mappedStages.some(stage => stage.code === selectedStageCode)) {
                    setSelectedStageCode(mappedStages[0].code);
                }
            } else {
                setStages(FALLBACK_STAGES);
                if (!FALLBACK_STAGES.some(stage => stage.code === selectedStageCode)) {
                    setSelectedStageCode(FALLBACK_STAGES[0].code);
                }
            }

            if (rolesRes.error) {
                console.error('Failed to load roles:', rolesRes.error);
                setRoles([]);
            } else {
                setRoles((rolesRes.data || []).map(row => ({
                    id: row.id,
                    name: row.name,
                    name_ar: row.name_ar || undefined,
                    code: row.code,
                    color: row.color || undefined,
                })));
            }

            if (permsRes.error) {
                console.error('Failed to load role stage permissions:', permsRes.error);
                setDbPermissions(new Map());
            } else {
                const next = new Map<string, StagePermission>();
                for (const row of permsRes.data || []) {
                    const mapped = mapRowToPermission(row);
                    if (!mapped) continue;
                    const key = makeKey(mapped.stage_code, mapped.role_id);
                    if (next.has(key)) continue;
                    next.set(key, mapped);
                }
                setDbPermissions(next);
            }

            setPendingChanges(new Map());
            setIsEditing(false);
        } catch (error) {
            console.error('Error loading NCR role stage permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const resolvePermission = (stageCode: string, roleId: string): StagePermission => {
        const key = makeKey(stageCode, roleId);
        return pendingChanges.get(key) || dbPermissions.get(key) || getDefaultPermission(stageCode, roleId);
    };

    const selectedStage = useMemo(
        () => stages.find(stage => stage.code === selectedStageCode) || stages[0],
        [stages, selectedStageCode]
    );

    const selectedStageActions = useMemo(() => {
        const fromPreset = STAGE_PRESETS[selectedStageCode]?.actions || ['view'];
        return sortActions(ensureView(fromPreset));
    }, [selectedStageCode]);

    const filteredRoles = useMemo(() => {
        if (!isNcrModuleSelected) {
            return [];
        }

        const q = searchTerm.trim().toLowerCase();
        const roleFilter = linkedRoleIds.length > 0 ? new Set(linkedRoleIds) : null;

        return roles.filter(role => {
            if (roleFilter && !roleFilter.has(role.id)) return false;
            if (!q) return true;
            return (
                role.code.toLowerCase().includes(q) ||
                role.name.toLowerCase().includes(q) ||
                (role.name_ar || '').toLowerCase().includes(q)
            );
        });
    }, [roles, searchTerm, linkedRoleIds, isNcrModuleSelected]);

    const setPermissionChange = (permission: StagePermission) => {
        const key = makeKey(permission.stage_code, permission.role_id);
        setPendingChanges(prev => {
            const next = new Map(prev);
            next.set(key, permission);
            return next;
        });
    };

    const toggleAction = (roleId: string, actionCode: string) => {
        if (!isEditing || actionCode === 'view') return;

        const current = resolvePermission(selectedStageCode, roleId);
        const actionSet = new Set(current.allowed_actions);
        if (actionSet.has(actionCode)) {
            actionSet.delete(actionCode);
        } else {
            actionSet.add(actionCode);
        }
        actionSet.add('view');

        setPermissionChange({
            ...current,
            allowed_actions: sortActions(Array.from(actionSet)),
            is_active: true,
        });
    };

    const toggleAdvance = (roleId: string) => {
        if (!isEditing) return;
        const current = resolvePermission(selectedStageCode, roleId);
        setPermissionChange({
            ...current,
            can_advance: !current.can_advance,
            is_active: true,
        });
    };

    const toggleReturn = (roleId: string) => {
        if (!isEditing) return;
        const current = resolvePermission(selectedStageCode, roleId);
        setPermissionChange({
            ...current,
            can_return: !current.can_return,
            is_active: true,
        });
    };

    const applyStageDefaultForAllRoles = () => {
        if (!isEditing) return;
        const preset = STAGE_PRESETS[selectedStageCode];
        if (!preset) return;

        const next = new Map(pendingChanges);
        for (const role of filteredRoles) {
            const key = makeKey(selectedStageCode, role.id);
            const current = resolvePermission(selectedStageCode, role.id);
            next.set(key, {
                ...current,
                allowed_actions: sortActions(preset.actions),
                can_advance: preset.can_advance,
                can_return: preset.can_return,
                is_active: true,
            });
        }
        setPendingChanges(next);
    };

    const discardChanges = () => {
        setPendingChanges(new Map());
        setIsEditing(false);
    };

    const saveChanges = async () => {
        if (pendingChanges.size === 0) {
            setIsEditing(false);
            return;
        }

        setSaving(true);
        try {
            for (const permission of pendingChanges.values()) {
                const payload = {
                    stage_code: permission.stage_code,
                    role_id: permission.role_id,
                    department_id: null,
                    allowed_actions: ensureView(permission.allowed_actions),
                    can_advance: permission.can_advance,
                    can_return: permission.can_return,
                    is_active: true,
                };

                let rowId = permission.id;
                if (!rowId) {
                    const { data: existingRow, error: lookupError } = await supabase
                        .from('ncr_stage_permissions')
                        .select('id')
                        .eq('stage_code', permission.stage_code)
                        .eq('role_id', permission.role_id)
                        .is('department_id', null)
                        .maybeSingle();

                    if (lookupError) throw lookupError;
                    rowId = existingRow?.id;
                }

                if (rowId) {
                    const { error: updateError } = await supabase
                        .from('ncr_stage_permissions')
                        .update(payload)
                        .eq('id', rowId);
                    if (updateError) throw updateError;
                } else {
                    const { error: insertError } = await supabase
                        .from('ncr_stage_permissions')
                        .insert(payload);
                    if (insertError) throw insertError;
                }
            }

            setPendingChanges(new Map());
            setIsEditing(false);
            await loadData();
            window.dispatchEvent(new Event('permissions-changed'));
        } catch (error: any) {
            console.error('Failed to save role stage permissions:', error);
            alert(error?.message || 'حدث خطأ أثناء حفظ صلاحيات الأدوار');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <NcrPermissionsSkeleton />;
    }

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" dir="rtl">
            <div className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-l from-red-50 to-white dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <ShieldCheckIcon className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">صلاحيات NCR حسب الدور والمرحلة</h2>
                        <p className="text-sm text-gray-500">كل دور له صلاحيات مستقلة داخل المرحلة المختارة</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isEditing ? (
                        <button
                            onClick={() => {
                                setIsEditing(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                        >
                            <PencilIcon className="w-4 h-4" />
                            تعديل
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={discardChanges}
                                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={saveChanges}
                                disabled={saving || pendingChanges.size === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-60"
                            >
                                {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                                حفظ ({pendingChanges.size})
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">فلتر مرتبط بالمصفوفة العامة:</span>
                    <span className="px-2 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                        الأدوار: {linkedRoleIds.length ? linkedRoleIds.length : 'الكل'}
                    </span>
                    <span className="px-2 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                        الموديولز: {linkedModuleCodes.length ? linkedModuleCodes.length : 'الكل'}
                    </span>
                    <span className={`px-2 py-1 rounded border ${isNcrModuleSelected
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                        NCR: {isNcrModuleSelected ? 'مفعل' : 'غير محدد'}
                    </span>
                </div>
            </div>

            {isEditing && (
                <div className="flex-shrink-0 px-4 py-2 border-b border-amber-200 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
                        <InformationCircleIcon className="w-4 h-4" />
                        وضع التعديل مفعل. الأكشن `عرض` إلزامي دائمًا.
                    </div>
                    <button
                        onClick={applyStageDefaultForAllRoles}
                        className="text-xs px-3 py-1.5 rounded-md border border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                        استرجاع افتراضي المرحلة لكل الأدوار
                    </button>
                </div>
            )}

            <div className="flex-shrink-0 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {stages.map(stage => {
                        const isActive = stage.code === selectedStageCode;
                        return (
                            <button
                                key={stage.code}
                                onClick={() => setSelectedStageCode(stage.code)}
                                className={`px-3 py-2 rounded-lg border text-sm whitespace-nowrap transition-all ${isActive
                                    ? 'text-white shadow-sm'
                                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                    }`}
                                style={isActive ? { backgroundColor: stage.color, borderColor: stage.color } : undefined}
                            >
                                {stage.name_ar}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-shrink-0 p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                <div className="relative w-full max-w-md">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="بحث عن دور..."
                        className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                    />
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                    {selectedStage?.name_ar} - {filteredRoles.length} دور
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <>
                    <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-3 py-2 text-right font-semibold min-w-[220px]">الدور</th>
                                    <th className="px-3 py-2 text-center font-semibold min-w-[90px]">تقدم</th>
                                    <th className="px-3 py-2 text-center font-semibold min-w-[90px]">إرجاع</th>
                                    <th className="px-3 py-2 text-right font-semibold">الأكشنات المتاحة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredRoles.map(role => {
                                    const permission = resolvePermission(selectedStageCode, role.id);
                                    return (
                                        <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                                            <td className="px-3 py-3 align-top">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                                                        style={{ backgroundColor: role.color || '#6b7280' }}
                                                    >
                                                        {(role.name_ar || role.name || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                                            {role.name_ar || role.name}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500">{role.code}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 align-top text-center">
                                                <button
                                                    onClick={() => toggleAdvance(role.id)}
                                                    disabled={!isEditing}
                                                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${permission.can_advance
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                                        } ${isEditing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                                >
                                                    {permission.can_advance ? 'نعم' : 'لا'}
                                                </button>
                                            </td>
                                            <td className="px-3 py-3 align-top text-center">
                                                <button
                                                    onClick={() => toggleReturn(role.id)}
                                                    disabled={!isEditing}
                                                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${permission.can_return
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                                        } ${isEditing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                                >
                                                    {permission.can_return ? 'نعم' : 'لا'}
                                                </button>
                                            </td>
                                            <td className="px-3 py-3 align-top">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {selectedStageActions.map(actionCode => {
                                                        const isGranted = permission.allowed_actions.includes(actionCode);
                                                        const isView = actionCode === 'view';
                                                        return (
                                                            <button
                                                                key={`${role.id}-${actionCode}`}
                                                                onClick={() => toggleAction(role.id, actionCode)}
                                                                disabled={!isEditing || isView}
                                                                className={`px-2 py-1 rounded text-xs transition-all ${isGranted
                                                                    ? 'text-white'
                                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                                                    } ${isEditing && !isView ? 'cursor-pointer hover:opacity-85' : 'cursor-default'}`}
                                                                style={isGranted ? { backgroundColor: getActionColor(actionCode) } : undefined}
                                                                title={actionCode}
                                                            >
                                                                {getActionLabel(actionCode)}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                    </table>

                    {!isNcrModuleSelected && (
                        <div className="py-10 text-center text-gray-500">
                            الموديول `NCR` غير محدد في فلتر المصفوفة العامة. اختر `NCR` من قائمة الموديولز لعرض الأدوار هنا.
                        </div>
                    )}

                    {isNcrModuleSelected && filteredRoles.length === 0 && (
                        <div className="py-10 text-center text-gray-500">
                            لا توجد أدوار مطابقة للبحث/الفلتر.
                        </div>
                    )}
                </>
            </div>

            <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
                <div>مصدر البيانات: `ncr_stage_permissions` (role_id + stage_code)</div>
                <button
                    onClick={loadData}
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-700"
                >
                    <ArrowPathIcon className="w-3.5 h-3.5" />
                    تحديث
                </button>
            </div>
        </div>
    );
};

export default NcrStagePermissions;
