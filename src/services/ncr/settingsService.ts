import { supabase } from '../../config/supabase';
import type { DefectCatalogItem, SystemSettings, UserProfile } from '../../types/ncr';

const SETTINGS_TABLE = 'settings';
const SETTINGS_ID = 'global';

type DefectType = 'raw_material' | 'product' | 'process' | 'other';

const normalizeDefect = (item: any): DefectCatalogItem => ({
    id: item?.id || crypto.randomUUID(),
    name: item?.name || 'عيب غير مسمى',
    category: item?.category || 'عام',
    defectType: (item?.defectType || item?.defect_type || 'other') as DefectType,
    severity: (item?.severity || 'medium') as 'low' | 'medium' | 'high',
    description: item?.description || undefined,
    isActive: item?.isActive ?? item?.is_active ?? true
});

const defaultSettings: SystemSettings = {
    departments: ['الإنتاج', 'الجودة', 'الصيانة', 'المخازن'],
    users: [
        { name: 'أحمد محمد', title: 'مهندس جودة' },
        { name: 'فاطمة علي', title: 'مشرفة جودة' },
        { name: 'محمد حسن', title: 'مهندس إنتاج' }
    ],
    defectCatalog: [
        { id: crypto.randomUUID(), name: 'خدش السطح', category: 'جودة', defectType: 'product', severity: 'medium', isActive: true },
        { id: crypto.randomUUID(), name: 'كسر', category: 'مواد', defectType: 'raw_material', severity: 'high', isActive: true },
        { id: crypto.randomUUID(), name: 'خطأ أبعاد', category: 'عملية', defectType: 'process', severity: 'medium', isActive: true }
    ],
    products: [],
    lines: [],
    units: ['pcs', 'kg', 'ltr'],
    qualityDepartments: ['الجودة'],
    lastBackupAt: null,
    holdsDisposalPolicy: 'warning',
    ncrDocumentMeta: {
        docCode: 'NCR-FRM-01',
        issueNo: '1',
        revisionNo: '0',
        issueDate: '2026-01-01',
        reviewDate: '2026-12-31'
    }
};

export async function fetchSystemSettings(): Promise<SystemSettings> {
    const { data, error } = await supabase
        .from(SETTINGS_TABLE)
        .select('id, departments, users, defect_catalog, products, lines, units, quality_departments, last_backup_at, holds_disposal_policy, ncr_document_meta, created_at, updated_at')
        .eq('id', SETTINGS_ID)
        .single();

    if (error || !data) {
        // Create default settings if not exists
        await supabase.from(SETTINGS_TABLE).insert({
            id: SETTINGS_ID,
            ...defaultSettings,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        return defaultSettings;
    }

    return {
        ...defaultSettings,
        ...data,
        departments: data.departments ?? defaultSettings.departments,
        users: data.users ?? defaultSettings.users,
        defectCatalog: (Array.isArray(data.defect_catalog ?? data.defectCatalog)
            ? (data.defect_catalog ?? data.defectCatalog)
            : defaultSettings.defectCatalog
        ).map(normalizeDefect),
        products: data.products ?? defaultSettings.products,
        lines: data.lines ?? defaultSettings.lines,
        units: data.units ?? defaultSettings.units,
        qualityDepartments: data.quality_departments ?? data.qualityDepartments ?? defaultSettings.qualityDepartments,
        lastBackupAt: data.last_backup_at ?? data.lastBackupAt ?? null,
        ncrDocumentMeta: data.ncr_document_meta ?? data.ncrDocumentMeta ?? defaultSettings.ncrDocumentMeta
    };
}

export async function addProduct(product: string) {
    const settings = await fetchSystemSettings();
    const products = [...(settings.products || []), product];

    await supabase.from(SETTINGS_TABLE).update({
        products,
        updated_at: new Date().toISOString()
    }).eq('id', SETTINGS_ID);
}

export async function removeProduct(product: string) {
    const settings = await fetchSystemSettings();
    const products = (settings.products || []).filter(p => p !== product);

    await supabase.from(SETTINGS_TABLE).update({
        products,
        updated_at: new Date().toISOString()
    }).eq('id', SETTINGS_ID);
}

export async function addLine(line: string) {
    const settings = await fetchSystemSettings();
    const lines = [...(settings.lines || []), line];

    await supabase.from(SETTINGS_TABLE).update({
        lines,
        updated_at: new Date().toISOString()
    }).eq('id', SETTINGS_ID);
}

export async function addUnit(unit: string) {
    const settings = await fetchSystemSettings();
    const nextUnit = unit.trim();
    if (!nextUnit) return;
    const units = Array.from(new Set([...(settings.units || []), nextUnit]));

    await supabase.from(SETTINGS_TABLE).update({
        units,
        updated_at: new Date().toISOString()
    }).eq('id', SETTINGS_ID);
}

export async function removeUnit(unit: string) {
    const settings = await fetchSystemSettings();
    const units = (settings.units || []).filter(u => u !== unit.trim());

    await supabase.from(SETTINGS_TABLE).update({
        units,
        updated_at: new Date().toISOString()
    }).eq('id', SETTINGS_ID);
}

export async function removeLine(line: string) {
    const settings = await fetchSystemSettings();
    const lines = (settings.lines || []).filter(l => l !== line);

    await supabase.from(SETTINGS_TABLE).update({
        lines,
        updated_at: new Date().toISOString()
    }).eq('id', SETTINGS_ID);
}

export async function updateSystemSettings(partial: Partial<SystemSettings>) {
    const payload: Record<string, any> = {
        ...partial,
        updated_at: new Date().toISOString()
    };

    // Map camelCase to snake_case for DB
    if (partial.ncrDocumentMeta) {
        payload.ncr_document_meta = partial.ncrDocumentMeta;
        delete payload.ncrDocumentMeta;
    }
    if (partial.defectCatalog) {
        payload.defect_catalog = partial.defectCatalog.map(normalizeDefect);
        delete payload.defectCatalog;
    }
    if (partial.qualityDepartments) {
        payload.quality_departments = partial.qualityDepartments;
        delete payload.qualityDepartments;
    }
    if (partial.lastBackupAt !== undefined) {
        payload.last_backup_at = partial.lastBackupAt;
        delete payload.lastBackupAt;
    }
    if (partial.holdsDisposalPolicy) {
        payload.holds_disposal_policy = partial.holdsDisposalPolicy;
        delete payload.holdsDisposalPolicy;
    }

    await supabase.from(SETTINGS_TABLE).update(payload).eq('id', SETTINGS_ID);
}

export async function addDepartment(department: string) {
    const settings = await fetchSystemSettings();
    const departments = [...(settings.departments || []), department];

    await supabase.from(SETTINGS_TABLE).update({
        departments,
        updated_at: new Date().toISOString()
    }).eq('id', SETTINGS_ID);
}

export async function removeDepartment(department: string) {
    const settings = await fetchSystemSettings();
    const departments = (settings.departments || []).filter(d => d !== department);

    await supabase.from(SETTINGS_TABLE).update({
        departments,
        updated_at: new Date().toISOString()
    }).eq('id', SETTINGS_ID);
}

export async function addUser(profile: UserProfile) {
    const settings = await fetchSystemSettings();
    const users = [...(settings.users || []), profile];

    await supabase.from(SETTINGS_TABLE).update({
        users,
        updated_at: new Date().toISOString()
    }).eq('id', SETTINGS_ID);
}

export async function removeUser(profile: UserProfile) {
    const settings = await fetchSystemSettings();
    const users = (settings.users || []).filter(u => u.name !== profile.name);

    await supabase.from(SETTINGS_TABLE).update({
        users,
        updated_at: new Date().toISOString()
    }).eq('id', SETTINGS_ID);
}

export async function addDefect(item: Omit<DefectCatalogItem, 'id'>) {
    const settings = await fetchSystemSettings();
    const defect: DefectCatalogItem = normalizeDefect({ id: crypto.randomUUID(), ...item });
    const defectCatalog = [...(settings.defectCatalog || []), defect];

    await supabase.from(SETTINGS_TABLE).update({
        defect_catalog: defectCatalog,
        updated_at: new Date().toISOString()
    }).eq('id', SETTINGS_ID);

    return defect;
}

export async function updateDefect(item: DefectCatalogItem) {
    const settings = await fetchSystemSettings();
    const defectCatalog = (settings.defectCatalog || []).map((existing) =>
        existing.id === item.id ? normalizeDefect(item) : normalizeDefect(existing)
    );

    await supabase.from(SETTINGS_TABLE).update({
        defect_catalog: defectCatalog,
        updated_at: new Date().toISOString()
    }).eq('id', SETTINGS_ID);

    return normalizeDefect(item);
}

export async function removeDefect(item: DefectCatalogItem) {
    const settings = await fetchSystemSettings();
    const defectCatalog = (settings.defectCatalog || []).filter(d => d.id !== item.id);

    await supabase.from(SETTINGS_TABLE).update({
        defect_catalog: defectCatalog,
        updated_at: new Date().toISOString()
    }).eq('id', SETTINGS_ID);
}

export async function removeUsersWithoutAccounts() {
    const settings = await fetchSystemSettings();
    const currentUsers = settings.users ?? [];

    // Get all users from users table
    const { data: usersData } = await supabase.from('users').select('name, display_name, email');

    const accountNames = new Set<string>();
    (usersData || []).forEach((d: any) => {
        const name = d.name || d.display_name || d.email;
        if (name) accountNames.add(String(name));
    });

    const filtered = currentUsers.filter((u) => accountNames.has(u.name));
    if (filtered.length === currentUsers.length) return { removed: 0 };

    await supabase.from(SETTINGS_TABLE).update({
        users: filtered,
        updated_at: new Date().toISOString()
    }).eq('id', SETTINGS_ID);

    return { removed: currentUsers.length - filtered.length };
}

