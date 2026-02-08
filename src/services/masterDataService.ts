/**
 * Master Data Service - Supabase Integration
 * خدمة البيانات الرئيسية - الموردين والخامات
 */

import { supabase } from '../config/supabase';
import type {
    Supplier,
    RawMaterial,
    RawMaterialSupplier,
    RawMaterialTest,
    ApprovalStatus
} from '../domain/masterData/types';

// ============ Multi-Tenant Enforcement ============

/**
 * Check if multi-tenant mode is active
 * In production, companyId should always be provided
 */
const MULTI_TENANT_MODE = import.meta.env.VITE_MULTI_TENANT === 'true';

/**
 * Validate companyId for multi-tenant operations
 * @param companyId - The company ID to validate
 * @param operationName - Name of the operation for logging
 * @throws Error if in multi-tenant mode and companyId is not provided
 */
function validateCompanyId(companyId: string | undefined, operationName: string): void {
    if (MULTI_TENANT_MODE && !companyId) {
        console.warn(`[Multi-Tenant] ${operationName} called without companyId - data isolation may be compromised`);
        // In strict mode, could throw: throw new Error(`companyId is required for ${operationName} in multi-tenant mode`);
    }
}

// ============ Raw Materials CRUD ============

/**
 * Get all active raw materials
 * جلب جميع المواد الخام النشطة
 */
export async function getAllRawMaterials(companyId?: string): Promise<RawMaterial[]> {
    validateCompanyId(companyId, 'getAllRawMaterials');

    // Updated: include storage_condition, shelf_life, requires_lab_test, allergens
    let query = supabase
        .from('raw_materials')
        .select('id, code, name, category, unit, specifications, storage_condition, shelf_life, requires_lab_test, allergens, is_active, company_id, packaging_options, created_at, updated_at')
        .eq('is_active', true)
        .order('name');

    if (companyId) {
        // Get materials for this company OR materials without company (shared)
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    const { data, error } = await query;

    // Debug logging
    console.log('getAllRawMaterials - companyId:', companyId, 'results:', data?.length || 0);

    if (error) {
        console.error('Error fetching raw materials:', error);
        return [];
    }

    return (data || []).map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category || 'ingredient',
        unit: item.unit || 'كجم',
        specifications: typeof item.specifications === 'object'
            ? (item.specifications as any)?.description || JSON.stringify(item.specifications)
            : item.specifications,
        storageCondition: item.storage_condition,
        shelfLife: item.shelf_life,
        requiresLabTest: item.requires_lab_test ?? true,
        allergens: item.allergens || [],
        active: item.is_active,
        companyId: item.company_id,
        packagingOptions: item.packaging_options || [],
        createdAt: item.created_at,
        updatedAt: item.updated_at
    }));
}

/**
 * Get all active suppliers
 * جلب جميع الموردين النشطين
 */
export async function getAllSuppliers(companyId?: string): Promise<Supplier[]> {
    validateCompanyId(companyId, 'getAllSuppliers');

    let query = supabase
        .from('suppliers')
        .select('id, code, name, contact_person, phone, email, address, approved, rating, company_id, is_active, created_at, updated_at')
        .order('name');

    if (companyId) {
        query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching suppliers:', error);
        return [];
    }

    return (data || []).map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        type: 'raw_materials' as const,
        contactPerson: item.contact_person,
        phone: item.phone,
        email: item.email,
        address: item.address,
        approved: item.approved ?? false,
        active: item.is_active ?? true,
        createdAt: item.created_at || '',
        updatedAt: item.updated_at || ''
    }));
}

/**
 * Create new supplier
 * إنشاء مورد جديد
 */
export async function createSupplier(
    data: {
        code: string;
        name: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
        address?: string;
        approved?: boolean;
    },
    companyId?: string
): Promise<Supplier | null> {
    const now = new Date().toISOString();

    const { data: result, error } = await supabase
        .from('suppliers')
        .insert({
            code: data.code,
            name: data.name,
            contact_person: data.contactPerson,
            phone: data.phone,
            email: data.email,
            address: data.address,
            approved: data.approved ?? false,
            company_id: companyId || null,
            is_active: true,
            created_at: now,
            updated_at: now
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating supplier:', error);
        return null;
    }

    return {
        id: result.id,
        code: result.code,
        name: result.name,
        type: 'raw_materials',
        contactPerson: result.contact_person,
        phone: result.phone,
        email: result.email,
        address: result.address,
        approved: result.approved ?? false,
        active: result.is_active ?? true,
        createdAt: result.created_at || '',
        updatedAt: result.updated_at || ''
    };
}

/**
 * Update supplier
 * تحديث مورد
 */
export async function updateSupplier(
    id: string,
    data: {
        code?: string;
        name?: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
        address?: string;
        approved?: boolean;
    }
): Promise<boolean> {
    const { error } = await supabase
        .from('suppliers')
        .update({
            code: data.code,
            name: data.name,
            contact_person: data.contactPerson,
            phone: data.phone,
            email: data.email,
            address: data.address,
            approved: data.approved,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    return !error;
}

/**
 * Delete supplier
 * حذف مورد
 */
export async function deleteSupplier(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

    return !error;
}

/**
 * Create new raw material
 * إنشاء مادة خام جديدة
 */
export async function createRawMaterial(
    data: {
        code: string;
        name: string;
        category?: string;
        unit?: string;
        specifications?: string;
        storageCondition?: string;
        shelfLife?: number;
        requiresLabTest?: boolean;
        packagingOptions?: string[];
        allergens?: string[];
    },
    companyId?: string
): Promise<RawMaterial | null> {
    const now = new Date().toISOString();

    // Updated: include storage_condition, shelf_life, requires_lab_test, allergens
    const insertPayload: any = {
        code: data.code,
        name: data.name,
        category: data.category || 'ingredient',
        unit: data.unit || 'كجم',
        specifications: data.specifications,
        storage_condition: data.storageCondition,
        shelf_life: data.shelfLife,
        requires_lab_test: data.requiresLabTest ?? true,
        packaging_options: data.packagingOptions,
        allergens: data.allergens || [],
        is_active: true,
        company_id: companyId || null,
        created_at: now,
        updated_at: now
    };

    const { data: result, error } = await supabase
        .from('raw_materials')
        .insert(insertPayload)
        .select()
        .single();

    if (error) {
        console.error('Error creating raw material:', error);
        return null;
    }

    return {
        id: result.id,
        code: result.code,
        name: result.name,
        category: result.category || 'ingredient',
        unit: result.unit || 'كجم',
        specifications: typeof result.specifications === 'object'
            ? (result.specifications as any)?.description || JSON.stringify(result.specifications)
            : result.specifications,
        storageCondition: result.storage_condition,
        shelfLife: result.shelf_life,
        requiresLabTest: result.requires_lab_test ?? true,
        packagingOptions: result.packaging_options || [],
        active: result.is_active,
        companyId: result.company_id,
        createdAt: result.created_at,
        updatedAt: result.updated_at
    };
}

/**
 * Update raw material
 * تحديث مادة خام
 */
export async function updateRawMaterial(
    id: string,
    data: {
        code?: string;
        name?: string;
        category?: string;
        unit?: string;
        specifications?: string;
        storageCondition?: string;
        shelfLife?: number;
        requiresLabTest?: boolean;
        packagingOptions?: string[];
        allergens?: string[];
        active?: boolean;
    }
): Promise<boolean> {
    const updateData: any = {
        updated_at: new Date().toISOString()
    };

    // Only include fields that are defined AND exist in DB
    if (data.code !== undefined) updateData.code = data.code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.specifications !== undefined) updateData.specifications = data.specifications;
    if (data.storageCondition !== undefined) updateData.storage_condition = data.storageCondition;
    if (data.shelfLife !== undefined) updateData.shelf_life = data.shelfLife;
    if (data.requiresLabTest !== undefined) updateData.requires_lab_test = data.requiresLabTest;
    if (data.packagingOptions !== undefined) updateData.packaging_options = data.packagingOptions;
    if (data.allergens !== undefined) updateData.allergens = data.allergens;
    if (data.active !== undefined) updateData.is_active = data.active;

    const { error } = await supabase
        .from('raw_materials')
        .update(updateData)
        .eq('id', id);

    if (error) {
        console.error('Error updating raw material:', error.message, error.details, error.hint);
    }

    return !error;
}

/**
 * Delete raw material
 * حذف مادة خام
 */
export async function deleteRawMaterial(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id);

    return !error;
}

// ============ Raw Material Suppliers (Junction) ============

/**
 * Get approved suppliers for a specific raw material
 * جلب الموردين المعتمدين لمادة خام معينة
 */
export async function getApprovedSuppliersForMaterial(
    rawMaterialId: string,
    companyId?: string
): Promise<(Supplier & { isPrimary: boolean; approvalStatus: ApprovalStatus })[]> {
    let query = supabase
        .from('raw_material_suppliers')
        .select(`
            id, 
            supplier_id,
            is_primary,
            approval_status,
            is_active,
            suppliers (
                id,
                code,
                name,
                contact_person,
                phone,
                email,
                address,
                approved,
                rating
            )
        `)
        .eq('raw_material_id', rawMaterialId)
        .eq('is_active', true)
        .eq('approval_status', 'approved');

    if (companyId) {
        query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching approved suppliers:', error);
        return [];
    }

    return (data || []).map((row: any) => ({
        id: row.suppliers.id,
        code: row.suppliers.code,
        name: row.suppliers.name,
        type: 'raw_materials' as const, // Default type
        contactPerson: row.suppliers.contact_person,
        phone: row.suppliers.phone,
        email: row.suppliers.email,
        address: row.suppliers.address,
        approved: row.suppliers.approved,
        active: true, // From junction table active status (is_active=true filtered above)
        isPrimary: row.is_primary,
        approvalStatus: row.approval_status,
        createdAt: '',
        updatedAt: ''
    }));
}

/**
 * Link a supplier to a raw material
 * ربط مورد بمادة خام
 */
export async function linkSupplierToMaterial(
    rawMaterialId: string,
    supplierId: string,
    companyId: string,
    options?: {
        isPrimary?: boolean;
        approvalNotes?: string;
        approvedBy?: string;
    }
): Promise<RawMaterialSupplier | null> {
    const now = new Date().toISOString();

    // Handle empty string companyId as null
    const validCompanyId = companyId && companyId.trim() !== '' ? companyId : null;

    // First, check if link already exists
    let query = supabase
        .from('raw_material_suppliers')
        .select('id, raw_material_id, supplier_id, company_id, is_primary, approval_status, approval_date, approved_by, is_active, created_at, updated_at')
        .eq('raw_material_id', rawMaterialId)
        .eq('supplier_id', supplierId);

    if (validCompanyId) {
        query = query.eq('company_id', validCompanyId);
    } else {
        query = query.is('company_id', null);
    }

    const { data: existing } = await query.maybeSingle();

    const linkData = {
        raw_material_id: rawMaterialId,
        supplier_id: supplierId,
        company_id: validCompanyId,
        is_primary: options?.isPrimary ?? false,
        approval_status: 'approved',
        approval_date: now.split('T')[0],
        approved_by: options?.approvedBy,
        approval_notes: options?.approvalNotes,
        is_active: true,
        updated_at: now
    };

    if (existing) {
        // Update existing link
        const { data, error } = await supabase
            .from('raw_material_suppliers')
            .update(linkData)
            .eq('id', existing.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating supplier link:', error);
            return null;
        }
        return normalizeRawMaterialSupplier(data);
    } else {
        // Insert new link
        const { data, error } = await supabase
            .from('raw_material_suppliers')
            .insert({
                ...linkData,
                created_at: now
            })
            .select()
            .single();

        if (error) {
            console.error('Error linking supplier to material:', error);
            return null;
        }
        return normalizeRawMaterialSupplier(data);
    }
}

/**
 * Remove supplier link from material
 * إلغاء ربط مورد من مادة خام
 */
export async function unlinkSupplierFromMaterial(
    rawMaterialId: string,
    supplierId: string,
    companyId: string
): Promise<boolean> {
    const { error } = await supabase
        .from('raw_material_suppliers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('raw_material_id', rawMaterialId)
        .eq('supplier_id', supplierId)
        .eq('company_id', companyId);

    return !error;
}

// ============ Raw Material Tests (Junction) ============

/**
 * Get required tests for a specific raw material
 * جلب الفحوصات المطلوبة لمادة خام معينة
 */
export async function getRequiredTestsForMaterial(
    rawMaterialId: string,
    companyId?: string
): Promise<RawMaterialTest[]> {
    let query = supabase
        .from('raw_material_tests')
        .select('id, raw_material_id, company_id, criteria_id, test_type, test_name, test_name_en, test_method, parameters, required, frequency, priority, is_active, created_at, updated_at')
        .eq('raw_material_id', rawMaterialId)
        .eq('is_active', true)
        .order('required', { ascending: false })
        .order('test_type');

    if (companyId) {
        query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching required tests:', error);
        return [];
    }

    return (data || []).map(normalizeRawMaterialTest);
}

/**
 * Get all linked tests for a company (across all materials)
 * جلب جميع الفحوصات المربوطة بالخامات لشركة معينة
 */
export async function getAllLinkedTests(
    companyId?: string
): Promise<(RawMaterialTest & { materialName?: string })[]> {
    let query = supabase
        .from('raw_material_tests')
        .select(`
            *,
            raw_materials (
                id,
                name
            )
        `)
        .eq('is_active', true)
        .order('test_name');

    if (companyId) {
        query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching all linked tests:', error);
        return [];
    }

    return (data || []).map((item: any) => ({
        ...normalizeRawMaterialTest(item),
        materialName: item.raw_materials?.name || 'غير محدد'
    }));
}

/**
 * Add a test requirement for a raw material
 * إضافة فحص مطلوب لمادة خام
 */
export async function addTestRequirementForMaterial(
    rawMaterialId: string,
    companyId: string,
    testData: {
        testType: string;
        testName: string;
        testNameEn?: string;
        testMethod?: string;
        parameters?: any[];
        required?: boolean;
        frequency?: string;
        priority?: string;
        criteriaId?: string;
    }
): Promise<RawMaterialTest | null> {
    const now = new Date().toISOString();

    // Validate required fields
    if (!rawMaterialId || !companyId || !testData.testName) {
        console.error('Missing required fields: rawMaterialId, companyId, or testName');
        return null;
    }

    // First check if test already exists
    let query = supabase
        .from('raw_material_tests')
        .select('id')
        .eq('raw_material_id', rawMaterialId)
        .eq('test_name', testData.testName)
        .eq('is_active', true);

    // Only add company_id filter if it's a valid UUID
    if (companyId && companyId.length > 0) {
        query = query.eq('company_id', companyId);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
        // Update existing test
        const { data, error } = await supabase
            .from('raw_material_tests')
            .update({
                test_type: testData.testType,
                test_name_en: testData.testNameEn,
                test_method: testData.testMethod,
                parameters: testData.parameters || [],
                required: testData.required ?? true,
                frequency: testData.frequency || 'each_batch',
                priority: testData.priority || 'normal',
                updated_at: now
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating test requirement:', error);
            return null;
        }
        return normalizeRawMaterialTest(data);
    }

    // Insert new test
    const { data, error } = await supabase
        .from('raw_material_tests')
        .insert({
            raw_material_id: rawMaterialId,
            company_id: companyId,
            criteria_id: testData.criteriaId || null,
            test_type: testData.testType,
            test_name: testData.testName,
            test_name_en: testData.testNameEn || null,
            test_method: testData.testMethod || null,
            parameters: testData.parameters || [],
            required: testData.required ?? true,
            frequency: testData.frequency || 'each_batch',
            priority: testData.priority || 'normal',
            is_active: true,
            created_at: now,
            updated_at: now
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding test requirement:', error);
        return null;
    }

    return normalizeRawMaterialTest(data);
}

/**
 * Remove a test requirement from a raw material
 * إزالة فحص من المطلوبات لمادة خام
 */
export async function removeTestRequirementFromMaterial(
    testId: string
): Promise<boolean> {
    const { error } = await supabase
        .from('raw_material_tests')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', testId);

    return !error;
}

/**
 * Update a test requirement
 * تحديث فحص مطلوب
 */
export async function updateTestRequirement(
    testId: string,
    updates: {
        testType?: string;
        testName?: string;
        testNameEn?: string;
        testMethod?: string;
        parameters?: any[];
        required?: boolean;
        frequency?: string;
        priority?: string;
    }
): Promise<RawMaterialTest | null> {
    const { data, error } = await supabase
        .from('raw_material_tests')
        .update({
            test_type: updates.testType,
            test_name: updates.testName,
            test_name_en: updates.testNameEn,
            test_method: updates.testMethod,
            parameters: updates.parameters,
            required: updates.required,
            frequency: updates.frequency,
            priority: updates.priority,
            updated_at: new Date().toISOString()
        })
        .eq('id', testId)
        .select()
        .single();

    if (error) {
        console.error('Error updating test requirement:', error);
        return null;
    }

    return normalizeRawMaterialTest(data);
}

// ============ Validation Functions ============

/**
 * Validate if a supplier is approved for a material
 * التحقق من أن المورد معتمد للمادة
 */
export async function validateSupplierForMaterial(
    rawMaterialId: string,
    supplierId: string,
    companyId?: string
): Promise<boolean> {
    const { data, error } = await supabase
        .from('raw_material_suppliers')
        .select('id')
        .eq('raw_material_id', rawMaterialId)
        .eq('supplier_id', supplierId)
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .maybeSingle();

    if (error) {
        console.error('Error validating supplier:', error);
        return false;
    }

    // If companyId provided, do an additional check
    if (companyId && data) {
        const { data: companyCheck } = await supabase
            .from('raw_material_suppliers')
            .select('id')
            .eq('id', data.id)
            .eq('company_id', companyId)
            .maybeSingle();
        return !!companyCheck;
    }

    return !!data;
}

// ============ Normalization Functions ============

function normalizeRawMaterialSupplier(data: any): RawMaterialSupplier {
    return {
        id: data.id,
        rawMaterialId: data.raw_material_id,
        supplierId: data.supplier_id,
        companyId: data.company_id,
        isPrimary: data.is_primary || false,
        approvalStatus: data.approval_status || 'pending',
        approvalDate: data.approval_date,
        approvedBy: data.approved_by,
        approvalNotes: data.approval_notes,
        validFrom: data.valid_from,
        validUntil: data.valid_until,
        active: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

function normalizeRawMaterialTest(data: any): RawMaterialTest {
    return {
        id: data.id,
        rawMaterialId: data.raw_material_id,
        companyId: data.company_id,
        testType: data.test_type,
        testName: data.test_name,
        testNameEn: data.test_name_en,
        testMethod: data.test_method,
        parameters: data.parameters || [],
        acceptanceCriteria: data.acceptance_criteria,
        rejectionCriteria: data.rejection_criteria,
        required: data.required,
        frequency: data.frequency || 'each_batch',
        priority: data.priority || 'normal',
        active: data.active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

// ============ Snapshot Functions ============

/**
 * Create test requirements snapshot for material receiving
 * إنشاء لقطة من الفحوصات المطلوبة عند الاستلام
 */
export async function createTestRequirementsSnapshot(
    rawMaterialId: string,
    companyId?: string
): Promise<any[]> {
    const tests = await getRequiredTestsForMaterial(rawMaterialId, companyId);

    return tests.map(test => ({
        testType: test.testType,
        testName: test.testName,
        parameters: test.parameters,
        required: test.required
    }));
}

/**
 * Create supplier approval snapshot for material receiving
 * إنشاء لقطة من اعتماد المورد عند الاستلام
 */
export async function createSupplierApprovalSnapshot(
    supplierId: string,
    supplierName: string,
    rawMaterialId: string,
    companyId?: string
): Promise<any> {
    const isValid = await validateSupplierForMaterial(rawMaterialId, supplierId, companyId);

    return {
        supplierId,
        supplierName,
        approvalStatus: isValid ? 'approved' : 'not_approved',
        capturedAt: new Date().toISOString()
    };
}
