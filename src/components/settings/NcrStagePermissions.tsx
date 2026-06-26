/**
 * NCR Stage Permissions Matrix (Role-first, Module → Stage → Actions)
 * ------------------------------------------------------------------
 * Source of truth: `ncr_stage_permissions` (role_id + stage_code, department_id IS NULL).
 *
 * Hierarchy mirrors the main Role/Module permission matrix but tailored for stages:
 *
 *      Role  ->  Module (NCR)  ->  Stage  ->  Allowed Actions (+ Advance / Return)
 *
 * State management:
 *  - `dbPermissions`     : the last-loaded server state (immutable baseline).
 *  - `pendingChanges`    : an overlay map of unsaved edits, keyed by stage::role.
 *  - `getEffectivePermission()` is the SINGLE resolver everywhere
 *    (pending -> db -> preset default), so the UI always reflects the true state.
 *  - All mutations use functional updaters seeded from the effective permission,
 *    so rapid clicks never race against stale closures.
 *  - Saving is an atomic, sequential bulk write through the service layer.
 *
 * RLS is untouched: every call uses the standard supabase client via the service.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowPathIcon,
    CheckIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    ShieldCheckIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { NcrPermissionsSkeleton } from '../common/LoadingStates';
import {
    broadcastPermissionsChanged,
    fetchNcrStagePermissionsBundle,
    getActionColor,
    getActionLabel,
    getDefaultPermission,
    getStageAllowableActions,
    makePermissionKey,
    NCR_STAGE_PRESETS,
    persistNcrStagePermissions,
    sortNcrActions,
    type NcrRole,
    type NcrStageMeta,
    type NcrStagePermissionRecord,
} from '../../services/ncrStagePermissionsService';

// ==================== Matrix filter sync (with the main matrix) ====================

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
            new Set(
                parsed.filter(
                    (item): item is string => typeof item === 'string' && item.trim() !== ''
                )
            )
        );
    } catch {
        return [];
    }
};

// ==================== Component ====================

const NcrStagePermissions: React.FC = () => {
    // Data
    const [stages, setStages] = useState<NcrStageMeta[]>([]);
    const [roles, setRoles] = useState<NcrRole[]>([]);
    const [dbPermissions, setDbPermissions] = useState<Map<string, NcrStagePermissionRecord>>(
        new Map()
    );
    const [pendingChanges, setPendingChanges] = useState<Map<string, NcrStagePermissionRecord>>(
        new Map()
    );

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

    // Linked filters (broadcast from the main matrix)
    const [linkedRoleIds, setLinkedRoleIds] = useState<string[]>(() =>
        readStoredArray(STORAGE_KEYS.roleIds)
    );
    const [linkedModuleCodes, setLinkedModuleCodes] = useState<string[]>(() =>
        readStoredArray(STORAGE_KEYS.moduleCodes)
    );

    // ---------- Data loading ----------

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const bundle = await fetchNcrStagePermissionsBundle();
            setStages(bundle.stages);
            setRoles(bundle.roles);
            setDbPermissions(bundle.permissions);
            setPendingChanges(new Map());
            setIsEditing(false);
        } catch (err: any) {
            console.error('Error loading NCR stage permissions:', err);
            setError(err?.message || 'حدث خطأ أثناء تحميل صلاحيات المراحل');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    // Stay in sync with the general matrix's role/module filter selection.
    useEffect(() => {
        const handleFilterChange = (event: Event) => {
            const detail = (event as CustomEvent<MatrixFilterDetail>).detail || {};
            setLinkedRoleIds(Array.isArray(detail.selectedRoleIds) ? detail.selectedRoleIds : []);
            setLinkedModuleCodes(
                Array.isArray(detail.selectedModuleCodes) ? detail.selectedModuleCodes : []
            );
        };
        window.addEventListener('permission-matrix-filter-changed', handleFilterChange as EventListener);
        return () =>
            window.removeEventListener(
                'permission-matrix-filter-changed',
                handleFilterChange as EventListener
            );
    }, []);

    // ---------- Derived state ----------

    const isNcrModuleSelected = useMemo(() => {
        if (linkedModuleCodes.length === 0) return true; // "all" => NCR included
        return linkedModuleCodes.includes('ncr');
    }, [linkedModuleCodes]);

    const orderedStages = useMemo(
        () => [...stages].sort((a, b) => a.stage_order - b.stage_order),
        [stages]
    );

    const filteredRoles = useMemo(() => {
        if (!isNcrModuleSelected) return [];

        const q = searchTerm.trim().toLowerCase();
        const roleFilter = linkedRoleIds.length > 0 ? new Set(linkedRoleIds) : null;

        return roles.filter((role) => {
            if (roleFilter && !roleFilter.has(role.id)) return false;
            if (!q) return true;
            return (
                role.code.toLowerCase().includes(q) ||
                role.name.toLowerCase().includes(q) ||
                (role.name_ar || '').toLowerCase().includes(q)
            );
        });
    }, [roles, searchTerm, linkedRoleIds, isNcrModuleSelected]);

    /**
     * THE single resolver. Everything (rendering + mutations) goes through here so the
     * checkbox state can never diverge from the data model.
     */
    const getEffectivePermission = useCallback(
        (stageCode: string, roleId: string): NcrStagePermissionRecord => {
            const key = makePermissionKey(stageCode, roleId);
            return (
                pendingChanges.get(key) ||
                dbPermissions.get(key) ||
                getDefaultPermission(stageCode, roleId)
            );
        },
        [pendingChanges, dbPermissions]
    );

    /**
     * Whether a stage/role record currently differs from the saved DB baseline.
     * Used to badge the role chips and to short-circuit no-op saves.
     */
    const dirtyCount = pendingChanges.size;

    // ---------- Mutations (functional, race-safe) ----------

    /**
     * Apply a mutation to a single stage/role permission. The `mutator` always receives
     * the most up-to-date effective record (pending -> db -> default) computed *inside*
     * the state updater, eliminating stale-closure races on rapid clicks.
     */
    const mutatePermission = useCallback(
        (
            stageCode: string,
            roleId: string,
            mutator: (current: NcrStagePermissionRecord) => NcrStagePermissionRecord
        ) => {
            const key = makePermissionKey(stageCode, roleId);
            setPendingChanges((prev) => {
                const base =
                    prev.get(key) ||
                    dbPermissions.get(key) ||
                    getDefaultPermission(stageCode, roleId);
                const next = new Map(prev);
                next.set(key, { ...mutator(base), is_active: true });
                return next;
            });
        },
        [dbPermissions]
    );

    const toggleAction = useCallback(
        (stageCode: string, roleId: string, actionCode: string) => {
            if (!isEditing || actionCode === 'view') return; // view is mandatory
            mutatePermission(stageCode, roleId, (current) => {
                const set = new Set(current.allowed_actions);
                if (set.has(actionCode)) set.delete(actionCode);
                else set.add(actionCode);
                set.add('view');
                return { ...current, allowed_actions: sortNcrActions(Array.from(set)) };
            });
        },
        [isEditing, mutatePermission]
    );

    const toggleAllActions = useCallback(
        (stageCode: string, roleId: string, grant: boolean) => {
            if (!isEditing) return;
            const allowable = getStageAllowableActions(stageCode);
            mutatePermission(stageCode, roleId, (current) => ({
                ...current,
                allowed_actions: grant ? allowable : ['view'],
            }));
        },
        [isEditing, mutatePermission]
    );

    const toggleAdvance = useCallback(
        (stageCode: string, roleId: string) => {
            if (!isEditing) return;
            mutatePermission(stageCode, roleId, (current) => ({
                ...current,
                can_advance: !current.can_advance,
            }));
        },
        [isEditing, mutatePermission]
    );

    const toggleReturn = useCallback(
        (stageCode: string, roleId: string) => {
            if (!isEditing) return;
            mutatePermission(stageCode, roleId, (current) => ({
                ...current,
                can_return: !current.can_return,
            }));
        },
        [isEditing, mutatePermission]
    );

    /** Reset every visible stage of a role back to the canonical stage preset. */
    const applyPresetForRole = useCallback(
        (roleId: string) => {
            if (!isEditing) return;
            setPendingChanges((prev) => {
                const next = new Map(prev);
                for (const stage of orderedStages) {
                    const preset = NCR_STAGE_PRESETS[stage.code];
                    if (!preset) continue;
                    const key = makePermissionKey(stage.code, roleId);
                    const base =
                        prev.get(key) ||
                        dbPermissions.get(key) ||
                        getDefaultPermission(stage.code, roleId);
                    next.set(key, {
                        ...base,
                        allowed_actions: sortNcrActions(preset.actions),
                        can_advance: preset.can_advance,
                        can_return: preset.can_return,
                        is_active: true,
                    });
                }
                return next;
            });
        },
        [isEditing, orderedStages, dbPermissions]
    );

    // ---------- Expansion ----------

    const toggleExpand = useCallback((key: string) => {
        setExpandedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    // Auto-expand the first visible role for convenience on first paint.
    useEffect(() => {
        if (loading || filteredRoles.length === 0) return;
        setExpandedKeys((prev) => {
            if (prev.size > 0) return prev;
            return new Set([filteredRoles[0].id]);
        });
    }, [loading, filteredRoles]);

    // ---------- Save / discard ----------

    const startEditing = () => {
        setError(null);
        setSuccessMsg(null);
        setIsEditing(true);
    };

    const discardChanges = () => {
        setPendingChanges(new Map());
        setIsEditing(false);
        setError(null);
    };

    const saveChanges = async () => {
        if (pendingChanges.size === 0) {
            setIsEditing(false);
            return;
        }
        setSaving(true);
        setError(null);
        setSuccessMsg(null);
        try {
            await persistNcrStagePermissions(Array.from(pendingChanges.values()));
            await loadData();
            broadcastPermissionsChanged();
            setSuccessMsg('تم حفظ صلاحيات المراحل بنجاح');
            setTimeout(() => setSuccessMsg(null), 3500);
        } catch (err: any) {
            console.error('Failed to save NCR stage permissions:', err);
            if (
                err?.code === '42501' ||
                err?.message?.includes('permission') ||
                err?.message?.includes('policy')
            ) {
                setError(
                    'ليس لديك صلاحية لتعديل صلاحيات المراحل. تحتاج صلاحية "تعديل" في موديول إدارة الصلاحيات.'
                );
            } else {
                setError(err?.message || 'حدث خطأ أثناء حفظ صلاحيات المراحل');
            }
        } finally {
            setSaving(false);
        }
    };

    // ---------- Render ----------

    if (loading) {
        return <NcrPermissionsSkeleton />;
    }

    return (
        <div
            className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            dir="rtl"
        >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-l from-red-50 to-white dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <ShieldCheckIcon className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            صلاحيات NCR حسب الدور والمرحلة
                        </h2>
                        <p className="text-sm text-gray-500">
                            الدور ← الموديول (NCR) ← المرحلة ← الأكشنات المسموحة
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isEditing ? (
                        <button
                            onClick={startEditing}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                        >
                            <PencilIcon className="w-4 h-4" />
                            تعديل
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={discardChanges}
                                disabled={saving}
                                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-60"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={saveChanges}
                                disabled={saving || dirtyCount === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-60"
                            >
                                {saving ? (
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckIcon className="w-4 h-4" />
                                )}
                                حفظ ({dirtyCount})
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Linked filter status */}
            <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">فلتر مرتبط بالمصفوفة العامة:</span>
                    <span className="px-2 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                        الأدوار: {linkedRoleIds.length ? linkedRoleIds.length : 'الكل'}
                    </span>
                    <span className="px-2 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                        الموديولز: {linkedModuleCodes.length ? linkedModuleCodes.length : 'الكل'}
                    </span>
                    <span
                        className={`px-2 py-1 rounded border ${
                            isNcrModuleSelected
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                    >
                        NCR: {isNcrModuleSelected ? 'مفعل' : 'غير محدد'}
                    </span>
                </div>
            </div>

            {/* Error / Success banners */}
            {error && (
                <div className="flex-shrink-0 mx-4 mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
            {successMsg && (
                <div className="flex-shrink-0 mx-4 mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Edit-mode hint */}
            {isEditing && (
                <div className="flex-shrink-0 px-4 py-2 mt-2 border-y border-amber-200 bg-amber-50 dark:bg-amber-900/20 flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
                    <InformationCircleIcon className="w-4 h-4 shrink-0" />
                    وضع التعديل مفعل. الأكشن «عرض» إلزامي دائمًا. استخدم «استرجاع الافتراضي» لإعادة ضبط دور كامل.
                </div>
            )}

            {/* Search */}
            <div className="flex-shrink-0 p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                <div className="relative w-full max-w-md">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="بحث عن دور..."
                        className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                    />
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                    {filteredRoles.length} دور × {orderedStages.length} مرحلة
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-3 space-y-3">
                {!isNcrModuleSelected && (
                    <div className="py-10 text-center text-gray-500">
                        الموديول «NCR» غير محدد في فلتر المصفوفة العامة. اختر «NCR» من قائمة الموديولز لعرض الأدوار هنا.
                    </div>
                )}

                {isNcrModuleSelected && filteredRoles.length === 0 && (
                    <div className="py-10 text-center text-gray-500">لا توجد أدوار مطابقة للبحث/الفلتر.</div>
                )}

                {isNcrModuleSelected &&
                    filteredRoles.map((role) => {
                        const roleExpanded = expandedKeys.has(role.id);

                        // How many of this role's stage records are unsaved?
                        const roleDirty = orderedStages.reduce((acc, stage) => {
                            return acc +
                                (pendingChanges.has(makePermissionKey(stage.code, role.id)) ? 1 : 0);
                        }, 0);

                        return (
                            <div
                                key={role.id}
                                className="rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden"
                            >
                                {/* Role header (level 1) */}
                                <div
                                    className="px-4 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between cursor-pointer select-none"
                                    onClick={() => toggleExpand(role.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        {roleExpanded ? (
                                            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                                        ) : (
                                            <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                                        )}
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                                            style={{ backgroundColor: role.color || '#6b7280' }}
                                        >
                                            {(role.name_ar || role.name || '?').charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                                                {role.name_ar || role.name}
                                                {roleDirty > 0 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                                        {roleDirty} غير محفوظ
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-gray-500">{role.code}</div>
                                        </div>
                                    </div>

                                    {/* NCR module badge + per-role preset reset */}
                                    <div className="flex items-center gap-2">
                                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-red-50 text-red-600 border border-red-200">
                                            <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                            NCR
                                        </span>
                                        {isEditing && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    applyPresetForRole(role.id);
                                                }}
                                                className="text-[11px] px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                title="استرجاع الإعداد الافتراضي لكل مراحل هذا الدور"
                                            >
                                                استرجاع الافتراضي
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Stages (level 2) */}
                                {roleExpanded && (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {orderedStages.map((stage) => {
                                            const permission = getEffectivePermission(stage.code, role.id);
                                            const allowable = getStageAllowableActions(stage.code);
                                            const grantedConfigurable = allowable.filter(
                                                (a) => a !== 'view' && permission.allowed_actions.includes(a)
                                            ).length;
                                            const totalConfigurable = allowable.filter(
                                                (a) => a !== 'view'
                                            ).length;
                                            const hasAll =
                                                totalConfigurable > 0 &&
                                                grantedConfigurable === totalConfigurable;
                                            const isDirty = pendingChanges.has(
                                                makePermissionKey(stage.code, role.id)
                                            );

                                            return (
                                                <div
                                                    key={stage.code}
                                                    className={`px-4 py-3 ${
                                                        isDirty ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''
                                                    }`}
                                                >
                                                    {/* Stage header row */}
                                                    <div className="flex items-center justify-between gap-3 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="w-2.5 h-2.5 rounded-full"
                                                                style={{ backgroundColor: stage.color }}
                                                            />
                                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                {stage.name_ar}
                                                            </span>
                                                            <span className="text-[11px] text-gray-400">
                                                                {stage.name}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5">
                                                                {grantedConfigurable}/{totalConfigurable}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {/* Advance */}
                                                            <button
                                                                onClick={() => toggleAdvance(stage.code, role.id)}
                                                                disabled={!isEditing}
                                                                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                                                                    permission.can_advance
                                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                                                } ${
                                                                    isEditing
                                                                        ? 'cursor-pointer hover:opacity-80'
                                                                        : 'cursor-default'
                                                                }`}
                                                                title="السماح بالتقدم للمرحلة التالية (workflow.progress)"
                                                            >
                                                                تقدم: {permission.can_advance ? 'نعم' : 'لا'}
                                                            </button>

                                                            {/* Return */}
                                                            <button
                                                                onClick={() => toggleReturn(stage.code, role.id)}
                                                                disabled={!isEditing}
                                                                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                                                                    permission.can_return
                                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                                                } ${
                                                                    isEditing
                                                                        ? 'cursor-pointer hover:opacity-80'
                                                                        : 'cursor-default'
                                                                }`}
                                                                title="السماح بالإرجاع لمرحلة سابقة (workflow.return)"
                                                            >
                                                                إرجاع: {permission.can_return ? 'نعم' : 'لا'}
                                                            </button>

                                                            {/* Grant/Clear all (edit mode only) */}
                                                            {isEditing && totalConfigurable > 0 && (
                                                                <button
                                                                    onClick={() =>
                                                                        toggleAllActions(stage.code, role.id, !hasAll)
                                                                    }
                                                                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                                                                        hasAll
                                                                            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                                                            : 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'
                                                                    }`}
                                                                >
                                                                    {hasAll ? 'إلغاء الكل' : 'تفعيل الكل'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Action chips (level 3) */}
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {allowable.map((actionCode) => {
                                                            const isGranted =
                                                                permission.allowed_actions.includes(actionCode);
                                                            const isView = actionCode === 'view';
                                                            return (
                                                                <button
                                                                    key={`${role.id}-${stage.code}-${actionCode}`}
                                                                    onClick={() =>
                                                                        toggleAction(stage.code, role.id, actionCode)
                                                                    }
                                                                    disabled={!isEditing || isView}
                                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                                                                        isGranted
                                                                            ? 'text-white'
                                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                                                    } ${
                                                                        isEditing && !isView
                                                                            ? 'cursor-pointer hover:opacity-85'
                                                                            : 'cursor-default'
                                                                    } ${isView ? 'opacity-90' : ''}`}
                                                                    style={
                                                                        isGranted
                                                                            ? { backgroundColor: getActionColor(actionCode) }
                                                                            : undefined
                                                                    }
                                                                    title={actionCode}
                                                                >
                                                                    {isGranted ? (
                                                                        <CheckIcon className="w-3 h-3" />
                                                                    ) : (
                                                                        <XMarkIcon className="w-3 h-3" />
                                                                    )}
                                                                    {getActionLabel(actionCode)}
                                                                    {isView && (
                                                                        <span className="text-[9px] opacity-80">(إلزامي)</span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
                <div>مصدر البيانات: ncr_stage_permissions (role_id + stage_code)</div>
                <button
                    onClick={() => void loadData()}
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
