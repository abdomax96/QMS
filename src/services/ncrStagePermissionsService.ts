/**
 * NCR Stage Permissions Service
 * --------------------------------
 * Single source of truth for reading/writing role-scoped NCR stage permissions
 * stored in the `ncr_stage_permissions` table (role_id + stage_code, department_id IS NULL).
 *
 * Why a dedicated service?
 *  - The `ncr_stage_permissions` table has NO unique constraint on (stage_code, role_id),
 *    so we cannot rely on Postgres `upsert(..., { onConflict })`. Persistence therefore
 *    performs an explicit "find existing row -> update or insert" per record, which keeps
 *    the writes idempotent and prevents duplicate rows.
 *  - Centralising the mapping/normalisation logic (e.g. `ensureView`, action ordering)
 *    guarantees the UI and the runtime permission hook stay perfectly in sync with the DB.
 *
 * RLS is unchanged: all calls go through the standard supabase client and obey the
 * existing `ncr_stage_permissions_select_policy` / `ncr_stage_permissions_modify_policy`.
 */

import { supabase } from '../config/supabase';
import {
    NCR_STAGE_ACTIONS,
    type NcrStageAction,
} from '../constants/ncrStageActions';

// ==================== Domain Types ====================

export interface NcrStageMeta {
    id: string;
    code: string;
    name: string;
    name_ar: string;
    stage_order: number;
    color: string;
}

export interface NcrRole {
    id: string;
    name: string;
    name_ar?: string;
    code: string;
    color?: string;
}

/**
 * A single role x stage permission record, normalised for the UI layer.
 * `id` is undefined when the record does not yet exist in the DB.
 */
export interface NcrStagePermissionRecord {
    id?: string;
    stage_code: string;
    role_id: string;
    allowed_actions: string[];
    can_advance: boolean;
    can_return: boolean;
    is_active: boolean;
}

export interface NcrStagePermissionsBundle {
    stages: NcrStageMeta[];
    roles: NcrRole[];
    /** Keyed by `${stage_code}::${role_id}` for O(1) lookup. */
    permissions: Map<string, NcrStagePermissionRecord>;
    /** True when fallbacks were used because the DB returned no stages. */
    usedFallbackStages: boolean;
}

// ==================== Canonical Action Metadata ====================

export const NCR_ACTION_META: Record<string, { label: string; color: string }> = {
    view: { label: 'عرض', color: '#4b5563' },
    create: { label: 'إنشاء', color: '#2563eb' },
    edit: { label: 'تعديل', color: '#3b82f6' },
    delete: { label: 'حذف', color: '#ef4444' },
    assign: { label: 'تعيين', color: '#8b5cf6' },
    approve: { label: 'موافقة', color: '#10b981' },
    reopen: { label: 'إعادة فتح', color: '#f59e0b' },
    export: { label: 'تصدير', color: '#6b7280' },
    verify_close: { label: 'تحقق وإغلاق', color: '#16a34a' },
    reject: { label: 'رفض', color: '#ef4444' },
    'root_cause.propose': { label: 'اقتراح سبب جذري', color: '#06b6d4' },
    'capa.add': { label: 'إضافة CAPA', color: '#0ea5e9' },
    'capa.complete': { label: 'إكمال CAPA', color: '#10b981' },
    release_hold: { label: 'فك الحجز', color: '#10b981' },
    'workflow.progress': { label: 'التقدم في المسار', color: '#3b82f6' },
};

/** Stable display order for action chips/columns. */
export const NCR_ACTION_ORDER: NcrStageAction[] = [
    'view',
    'create',
    'edit',
    'delete',
    'root_cause.propose',
    'assign',
    'approve',
    'release_hold',
    'reject',
    'verify_close',
    'export',
    'reopen',
    'capa.add',
    'capa.complete',
    'workflow.progress',
];

const ACTION_ORDER_INDEX = new Map<string, number>(
    NCR_ACTION_ORDER.map((code, index) => [code, index])
);
const CANONICAL_ACTION_SET = new Set<string>(NCR_ACTION_ORDER);

// ==================== Stage Presets / Fallbacks ====================

const STAGE_COLORS = ['#2563eb', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b'];

export const FALLBACK_NCR_STAGES: NcrStageMeta[] = NCR_STAGE_ACTIONS.map((stage, index) => ({
    id: `fallback-${stage.stage}`,
    code: stage.stage,
    name: stage.nameEn,
    name_ar: stage.nameAr,
    stage_order: stage.order,
    color: STAGE_COLORS[index] || '#2563eb',
}));

export interface StagePreset {
    actions: string[];
    can_advance: boolean;
    can_return: boolean;
}

export const NCR_STAGE_PRESETS: Record<string, StagePreset> = Object.fromEntries(
    NCR_STAGE_ACTIONS.map((stage) => [
        stage.stage,
        {
            actions: [...stage.allowedActions],
            can_advance: stage.canAdvance,
            can_return: stage.canReturn,
        },
    ])
);

/** The set of actions that are *configurable* for a given stage (from the canonical preset). */
export const getStageAllowableActions = (stageCode: string): string[] => {
    const preset = NCR_STAGE_PRESETS[stageCode];
    return sortNcrActions(ensureView(preset?.actions ?? ['view']));
};

// ==================== Pure Helpers ====================

export const makePermissionKey = (stageCode: string, roleId: string): string =>
    `${stageCode}::${roleId}`;

const uniq = (values: string[]): string[] =>
    Array.from(new Set(values.filter(Boolean)));

export const sortNcrActions = (actions: string[]): string[] =>
    uniq(actions).sort((a, b) => {
        const ai = ACTION_ORDER_INDEX.get(a);
        const bi = ACTION_ORDER_INDEX.get(b);
        if (ai !== undefined && bi !== undefined) return ai - bi;
        if (ai !== undefined) return -1;
        if (bi !== undefined) return 1;
        return a.localeCompare(b);
    });

/**
 * Normalise an action list: drop unknown actions, guarantee `view` is present,
 * and return a deterministically ordered array. `view` is implicit/mandatory
 * because every other action assumes the user can at least read the stage.
 */
export const ensureView = (actions: string[]): string[] => {
    const cleaned = uniq(actions).filter((action) => CANONICAL_ACTION_SET.has(action));
    if (!cleaned.includes('view')) cleaned.unshift('view');
    return sortNcrActions(cleaned);
};

export const getActionLabel = (actionCode: string): string =>
    NCR_ACTION_META[actionCode]?.label ?? actionCode;

export const getActionColor = (actionCode: string): string =>
    NCR_ACTION_META[actionCode]?.color ?? '#6b7280';

/** Build the default (preset-derived) permission for a role/stage with no DB row yet. */
export const getDefaultPermission = (
    stageCode: string,
    roleId: string
): NcrStagePermissionRecord => {
    const preset = NCR_STAGE_PRESETS[stageCode];
    return {
        stage_code: stageCode,
        role_id: roleId,
        allowed_actions: ensureView(preset?.actions ?? ['view']),
        can_advance: preset?.can_advance ?? false,
        can_return: preset?.can_return ?? false,
        is_active: true,
    };
};

interface RawPermissionRow {
    id: string;
    role_id: string | null;
    stage_code: string;
    allowed_actions: string[] | null;
    can_advance: boolean | null;
    can_return: boolean | null;
    is_active: boolean | null;
}

const mapRowToPermission = (
    row: RawPermissionRow
): NcrStagePermissionRecord | null => {
    if (!row.role_id) return null;
    return {
        id: row.id,
        role_id: row.role_id,
        stage_code: row.stage_code,
        allowed_actions: ensureView(row.allowed_actions ?? []),
        can_advance: Boolean(row.can_advance),
        can_return: Boolean(row.can_return),
        is_active: row.is_active ?? true,
    };
};

// ==================== Data Access ====================

/**
 * Load everything the matrix needs in a single round-trip set:
 * stages, active roles and all role-scoped (department_id IS NULL) stage permissions.
 */
export async function fetchNcrStagePermissionsBundle(): Promise<NcrStagePermissionsBundle> {
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

    // --- Stages (fall back to canonical config when the table is empty/missing) ---
    let stages: NcrStageMeta[];
    let usedFallbackStages = false;
    if (!stagesRes.error && stagesRes.data?.length) {
        stages = stagesRes.data.map((row: any) => ({
            id: row.id,
            code: row.code,
            name: row.name,
            name_ar: row.name_ar,
            stage_order: row.stage_order,
            color: row.color || '#6b7280',
        }));
    } else {
        stages = FALLBACK_NCR_STAGES;
        usedFallbackStages = true;
    }

    // --- Roles ---
    if (rolesRes.error) {
        throw new Error(`فشل تحميل الأدوار: ${rolesRes.error.message}`);
    }
    const roles: NcrRole[] = (rolesRes.data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        name_ar: row.name_ar || undefined,
        code: row.code,
        color: row.color || undefined,
    }));

    // --- Permissions ---
    if (permsRes.error) {
        throw new Error(`فشل تحميل صلاحيات المراحل: ${permsRes.error.message}`);
    }
    const permissions = new Map<string, NcrStagePermissionRecord>();
    for (const row of (permsRes.data ?? []) as RawPermissionRow[]) {
        const mapped = mapRowToPermission(row);
        if (!mapped) continue;
        const key = makePermissionKey(mapped.stage_code, mapped.role_id);
        // First write wins; keeps the matrix deterministic if duplicates exist.
        if (!permissions.has(key)) permissions.set(key, mapped);
    }

    return { stages, roles, permissions, usedFallbackStages };
}

/**
 * Persist a single role/stage permission record.
 *
 * Because the table lacks a (stage_code, role_id) unique constraint we cannot use
 * `upsert(onConflict)`. Instead we resolve the row id (from the in-memory record or a
 * targeted lookup) and then update-or-insert. Returns the row id that was written.
 */
export async function persistNcrStagePermission(
    permission: NcrStagePermissionRecord
): Promise<string> {
    const payload = {
        stage_code: permission.stage_code,
        role_id: permission.role_id,
        department_id: null as string | null,
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
        return rowId;
    }

    const { data: inserted, error: insertError } = await supabase
        .from('ncr_stage_permissions')
        .insert(payload)
        .select('id')
        .single();
    if (insertError) throw insertError;
    return inserted!.id as string;
}

/**
 * Persist a batch of permission records sequentially.
 * Sequential writes (rather than Promise.all) avoid the race where two records for the
 * same role/stage both fail the "does a row exist?" lookup and insert duplicates.
 */
export async function persistNcrStagePermissions(
    permissions: NcrStagePermissionRecord[]
): Promise<void> {
    for (const permission of permissions) {
        // eslint-disable-next-line no-await-in-loop
        await persistNcrStagePermission(permission);
    }
}

/** Notify the rest of the app (runtime permission hooks) that grants changed. */
export function broadcastPermissionsChanged(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('permissions-changed'));
}
