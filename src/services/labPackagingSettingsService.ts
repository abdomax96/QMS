import { supabase } from '../config/supabase';

export interface LabPackagingSubtype {
    id: string;
    packagingTypeId: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    usageCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface LabPackagingType {
    id: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    usageCount: number;
    subtypes: LabPackagingSubtype[];
    createdAt: string;
    updatedAt: string;
}

const TYPE_SELECT = 'id, name, sort_order, is_active, created_at, updated_at';
const SUBTYPE_SELECT = 'id, packaging_type_id, name, sort_order, is_active, created_at, updated_at';

function isMissingPackagingSettingsError(error: any): boolean {
    const status = Number(error?.status || error?.statusCode || 0);
    const code = String(error?.code || '').toUpperCase();
    const details = String(error?.details || '').toLowerCase();
    const message = String(error?.message || '').toLowerCase();

    return (
        status === 404 ||
        code === '42P01' ||
        code === 'PGRST205' ||
        message.includes('lab_packaging_types') ||
        message.includes('lab_packaging_subtypes') ||
        details.includes('lab_packaging_types') ||
        details.includes('lab_packaging_subtypes')
    );
}

function normalizeTypeRow(row: any): Omit<LabPackagingType, 'subtypes' | 'usageCount'> {
    return {
        id: row.id,
        name: row.name,
        sortOrder: Number(row.sort_order ?? 100),
        isActive: row.is_active ?? true,
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || '',
    };
}

function normalizeSubtypeRow(row: any): LabPackagingSubtype {
    return {
        id: row.id,
        packagingTypeId: row.packaging_type_id,
        name: row.name,
        sortOrder: Number(row.sort_order ?? 100),
        isActive: row.is_active ?? true,
        usageCount: 0,
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || '',
    };
}

export async function getLabPackagingSettingsTree(options?: {
    includeInactive?: boolean;
}): Promise<LabPackagingType[]> {
    const includeInactive = options?.includeInactive ?? true;

    let typesQuery = supabase
        .from('lab_packaging_types')
        .select(TYPE_SELECT)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

    if (!includeInactive) {
        typesQuery = typesQuery.eq('is_active', true);
    }

    const { data: typeRows, error: typeError } = await typesQuery;

    if (typeError) {
        if (isMissingPackagingSettingsError(typeError)) {
            console.warn('[labPackagingSettings] tables are not available yet. returning empty list.');
            return [];
        }
        throw typeError;
    }

    let subtypesQuery = supabase
        .from('lab_packaging_subtypes')
        .select(SUBTYPE_SELECT)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

    if (!includeInactive) {
        subtypesQuery = subtypesQuery.eq('is_active', true);
    }

    const { data: subtypeRows, error: subtypeError } = await subtypesQuery;

    if (subtypeError) {
        if (isMissingPackagingSettingsError(subtypeError)) {
            console.warn('[labPackagingSettings] subtypes table is not available yet. returning empty list.');
            return [];
        }
        throw subtypeError;
    }

    const { data: usageRows, error: usageError } = await supabase
        .from('raw_materials')
        .select('packaging_type_id, packaging_subtype_id')
        .eq('category', 'packaging');

    if (usageError && !isMissingPackagingSettingsError(usageError)) {
        console.warn('[labPackagingSettings] usage query failed:', usageError);
    }

    const typeUsage = new Map<string, number>();
    const subtypeUsage = new Map<string, number>();

    (usageRows || []).forEach((row: any) => {
        const typeId = String(row.packaging_type_id || '').trim();
        const subtypeId = String(row.packaging_subtype_id || '').trim();

        if (typeId) {
            typeUsage.set(typeId, (typeUsage.get(typeId) || 0) + 1);
        }
        if (subtypeId) {
            subtypeUsage.set(subtypeId, (subtypeUsage.get(subtypeId) || 0) + 1);
        }
    });

    const subtypeMap = new Map<string, LabPackagingSubtype[]>();
    (subtypeRows || []).forEach((row: any) => {
        const subtype = normalizeSubtypeRow(row);
        subtype.usageCount = subtypeUsage.get(subtype.id) || 0;

        const current = subtypeMap.get(subtype.packagingTypeId) || [];
        current.push(subtype);
        subtypeMap.set(subtype.packagingTypeId, current);
    });

    return (typeRows || []).map((row: any) => {
        const type = normalizeTypeRow(row);
        const subtypes = subtypeMap.get(type.id) || [];
        subtypes.sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, 'ar'));

        return {
            ...type,
            usageCount: typeUsage.get(type.id) || 0,
            subtypes,
        };
    });
}

export async function createLabPackagingType(input: {
    name: string;
    sortOrder?: number;
    isActive?: boolean;
}): Promise<LabPackagingType> {
    const name = input.name.trim();
    if (!name) {
        throw new Error('اسم النوع الرئيسي مطلوب');
    }

    const { data, error } = await supabase
        .from('lab_packaging_types')
        .insert({
            name,
            sort_order: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 100,
            is_active: input.isActive ?? true,
        })
        .select(TYPE_SELECT)
        .single();

    if (error) throw error;

    const normalized = normalizeTypeRow(data);
    return {
        ...normalized,
        usageCount: 0,
        subtypes: [],
    };
}

export async function updateLabPackagingType(
    id: string,
    updates: {
        name?: string;
        sortOrder?: number;
        isActive?: boolean;
    }
): Promise<void> {
    const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
        const trimmed = updates.name.trim();
        if (!trimmed) throw new Error('اسم النوع الرئيسي مطلوب');
        payload.name = trimmed;
    }
    if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;

    const { error } = await supabase
        .from('lab_packaging_types')
        .update(payload)
        .eq('id', id);

    if (error) throw error;
}

export async function createLabPackagingSubtype(input: {
    packagingTypeId: string;
    name: string;
    sortOrder?: number;
    isActive?: boolean;
}): Promise<LabPackagingSubtype> {
    const name = input.name.trim();
    if (!name) {
        throw new Error('اسم النوع الفرعي مطلوب');
    }

    if (!input.packagingTypeId) {
        throw new Error('النوع الرئيسي مطلوب');
    }

    const { data, error } = await supabase
        .from('lab_packaging_subtypes')
        .insert({
            packaging_type_id: input.packagingTypeId,
            name,
            sort_order: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 100,
            is_active: input.isActive ?? true,
        })
        .select(SUBTYPE_SELECT)
        .single();

    if (error) throw error;

    return normalizeSubtypeRow(data);
}

export async function updateLabPackagingSubtype(
    id: string,
    updates: {
        packagingTypeId?: string;
        name?: string;
        sortOrder?: number;
        isActive?: boolean;
    }
): Promise<void> {
    const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (updates.packagingTypeId !== undefined) payload.packaging_type_id = updates.packagingTypeId;

    if (updates.name !== undefined) {
        const trimmed = updates.name.trim();
        if (!trimmed) throw new Error('اسم النوع الفرعي مطلوب');
        payload.name = trimmed;
    }

    if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;

    const { error } = await supabase
        .from('lab_packaging_subtypes')
        .update(payload)
        .eq('id', id);

    if (error) throw error;
}

export async function toggleLabPackagingTypeActive(id: string, isActive: boolean): Promise<void> {
    return updateLabPackagingType(id, { isActive });
}

export async function toggleLabPackagingSubtypeActive(id: string, isActive: boolean): Promise<void> {
    return updateLabPackagingSubtype(id, { isActive });
}
