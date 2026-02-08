/**
 * Lab Service - Supabase Integration
 * خدمة المختبر - استلام المواد والفحوصات
 */

import { supabase } from '../config/supabase';
import type {
    MaterialReceiving,
    LabTest,
    CreateMaterialReceivingInput,
    CreateLabTestInput,
    MaterialReceivingStatus,
    LabTestStatus
} from '../domain/lab/types';

// ============ Multi-Tenant Enforcement ============

/**
 * Check if multi-tenant mode is active
 */
const MULTI_TENANT_MODE = import.meta.env.VITE_MULTI_TENANT === 'true';

/**
 * Validate companyId for multi-tenant operations
 */
function validateCompanyId(companyId: string | undefined, operationName: string): void {
    if (MULTI_TENANT_MODE && !companyId) {
        console.warn(`[Multi-Tenant] ${operationName} called without companyId`);
    }
}

// ============ Type Normalization ============

function normalizeMaterialReceiving(data: any): MaterialReceiving {
    return {
        id: data.id,
        receivingNumber: data.receiving_number,
        materialType: data.material_type,
        status: data.status,
        rawMaterialId: data.raw_material_id,
        materialName: data.material_name,
        materialCode: data.material_code,
        batchNumber: data.batch_number,
        lotNumber: data.lot_number,
        supplierId: data.supplier_id,
        supplierName: data.supplier_name,
        quantity: data.quantity,
        unit: data.unit,
        packagingType: data.packaging_type,
        productionDate: data.production_date,
        expiryDate: data.expiry_date,
        receivedAt: data.received_at,
        receivedBy: data.received_by,
        receivedByName: data.received_by_name,
        deliveryNoteNumber: data.delivery_note_number,
        invoiceNumber: data.invoice_number,
        certificateOfAnalysis: data.certificate_of_analysis,
        inspectionRequired: data.inspection_required,
        inspectedBy: data.inspected_by,
        inspectedAt: data.inspected_at,
        inspectionNotes: data.inspection_notes,
        labTestId: data.lab_test_id,
        labTestStatus: data.lab_test_status,
        storageLocation: data.storage_location,
        storageCondition: data.storage_condition,
        acceptedQuantity: data.accepted_quantity,
        rejectedQuantity: data.rejected_quantity,
        rejectionReason: data.rejection_reason,
        notes: data.notes,
        attachments: data.attachments || [],
        companyId: data.company_id,
        testRequirementsSnapshot: data.test_requirements_snapshot,
        supplierApprovalSnapshot: data.supplier_approval_snapshot,
        testResults: data.initial_test_results, // نتائج الفحص الأولية
        vehicleInspection: data.vehicle_inspection, // بيانات فحص السيارة
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

function normalizeLabTest(data: any): LabTest {
    // Build sample object from lab_samples join or sample_data
    const sampleData = data.lab_samples || data.sample_data || {};
    const sample = {
        id: sampleData.id || data.sample_id || '',
        sampleNumber: sampleData.sample_number || '',
        sampleType: sampleData.sample_type || 'raw_material',
        sourceId: sampleData.source_id,
        sourceName: sampleData.source_name || '',
        collectedBy: sampleData.collected_by || '',
        collectedAt: sampleData.collected_at || '',
        quantity: sampleData.quantity || '',
        unit: sampleData.unit || '',
        storageCondition: sampleData.storage_condition,
        notes: sampleData.notes
    };

    return {
        id: data.id,
        testNumber: data.test_number,
        testType: data.test_type,
        status: data.status,
        companyId: data.company_id,
        sample,
        parameters: data.parameters || [],
        requestedBy: data.requested_by,
        requestedByName: data.requested_by_name,
        requestedAt: data.requested_at,
        assignedTo: data.assigned_to,
        assignedToName: data.assigned_to_name,
        startedAt: data.started_at,
        completedAt: data.completed_at,
        approvedBy: data.approved_by,
        approvedByName: data.approved_by_name,
        approvedAt: data.approved_at,
        approvalNotes: data.approval_notes,
        priority: data.priority || 'normal',
        dueDate: data.due_date,
        notes: data.notes,
        attachments: data.attachments || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

// ============ Batch Lookup for Traceability ============

export interface MaterialBatch {
    id: string;
    receivingNumber: string;
    batchNumber: string;
    lotNumber?: string;
    productionDate?: string;
    expiryDate?: string;
    quantity: number;
    unit: string;
    supplierName: string;
    supplierId?: string;
    receivedAt: string;
    status: string;
}

/**
 * Get available batches for a raw material
 * جلب الباتشات المتاحة لخامة معينة (للاستخدام في جدول تتبع الخامات)
 */
export async function getMaterialBatches(
    rawMaterialId: string,
    options?: {
        productionDate?: string;
        status?: 'accepted' | 'approved' | 'all';
        companyId?: string;
    }
): Promise<MaterialBatch[]> {
    let query = supabase
        .from('material_receiving')
        .select(`
            id,
            receiving_number,
            batch_number,
            lot_number,
            production_date,
            expiry_date,
            quantity,
            unit,
            supplier_name,
            supplier_id,
            received_at,
            status
        `)
        .eq('raw_material_id', rawMaterialId)
        .order('received_at', { ascending: false });

    // Filter by status (default: only accepted/approved)
    if (options?.status !== 'all') {
        query = query.in('status', ['accepted', 'approved']);
    }

    // Filter by company
    if (options?.companyId) {
        query = query.eq('company_id', options.companyId);
    }

    // Filter by production date
    if (options?.productionDate) {
        query = query.eq('production_date', options.productionDate);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching material batches:', error);
        return [];
    }

    return (data || []).map((item: any) => ({
        id: item.id,
        receivingNumber: item.receiving_number,
        batchNumber: item.batch_number,
        lotNumber: item.lot_number,
        productionDate: item.production_date,
        expiryDate: item.expiry_date,
        quantity: item.quantity,
        unit: item.unit,
        supplierName: item.supplier_name,
        supplierId: item.supplier_id,
        receivedAt: item.received_at,
        status: item.status
    }));
}

/**
 * Get production dates that have available batches for a raw material
 * جلب تواريخ الإنتاج التي لها باتشات متاحة
 */
export async function getAvailableProductionDates(
    rawMaterialId: string,
    companyId?: string
): Promise<string[]> {
    let query = supabase
        .from('material_receiving')
        .select('production_date')
        .eq('raw_material_id', rawMaterialId)
        .in('status', ['accepted', 'approved'])
        .not('production_date', 'is', null)
        .order('production_date', { ascending: false });

    if (companyId) {
        query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching production dates:', error);
        return [];
    }

    // Return unique dates
    const uniqueDates = [...new Set((data || []).map((d: any) => d.production_date))];
    return uniqueDates.filter((d: any) => d !== null) as string[];
}

// ============ Material Receiving CRUD ============

/**
 * Get all material receivings
 * جلب جميع استلامات المواد
 */
export async function getMaterialReceivings(
    companyId?: string,
    filters?: {
        status?: MaterialReceivingStatus;
        materialType?: string;
        supplierId?: string;
        fromDate?: string;
        toDate?: string;
    }
): Promise<MaterialReceiving[]> {
    let query = supabase
        .from('material_receiving')
        .select(`
            *,
            suppliers (id, name, code),
            raw_materials (id, name, code),
            lab_tests (id, test_number, status)
        `)
        .order('received_at', { ascending: false });

    if (companyId) {
        query = query.eq('company_id', companyId);
    }

    if (filters?.status) {
        query = query.eq('status', filters.status);
    }

    if (filters?.materialType) {
        query = query.eq('material_type', filters.materialType);
    }

    if (filters?.supplierId) {
        query = query.eq('supplier_id', filters.supplierId);
    }

    if (filters?.fromDate) {
        query = query.gte('received_at', filters.fromDate);
    }

    if (filters?.toDate) {
        query = query.lte('received_at', filters.toDate);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching material receivings:', error);
        return [];
    }

    return (data || []).map(normalizeMaterialReceiving);
}

/**
 * Get single material receiving by ID
 * جلب استلام مادة واحد
 */
export async function getMaterialReceivingById(id: string): Promise<MaterialReceiving | null> {
    const { data, error } = await supabase
        .from('material_receiving')
        .select(`
            *,
            suppliers (id, name, code, contact_person, phone, email),
            raw_materials (id, name, code, category, specifications),
            lab_tests (*)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching material receiving:', error);
        return null;
    }

    return normalizeMaterialReceiving(data);
}

/**
 * Create new material receiving
 * إنشاء استلام مادة جديد
 */
// Import masterDataService to create snapshots
import * as masterDataService from './masterDataService';

/**
 * Create new material receiving
 * إنشاء استلام مادة جديد
 * Updated: Now creates snapshots of test requirements and supplier approval
 */
export async function createMaterialReceiving(
    input: CreateMaterialReceivingInput,
    userId: string,
    userName: string,
    companyId?: string
): Promise<MaterialReceiving | null> {
    const now = new Date().toISOString();

    // Generate receiving number
    const { count } = await supabase
        .from('material_receiving')
        .select('id', { count: 'exact', head: true });

    const receivingNumber = `RCV-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;

    // 1. Create Test Requirements Snapshot
    // جلب متطلبات الفحص الحالية وحفظها كلقطة
    let testRequirementsSnapshot: any[] = [];
    if (input.rawMaterialId) {
        try {
            testRequirementsSnapshot = await masterDataService.createTestRequirementsSnapshot(input.rawMaterialId);
        } catch (err) {
            console.error('Failed to create test requirements snapshot:', err);
        }
    }

    // 2. Create Supplier Approval Snapshot
    // جلب حالة اعتماد المورد الحالية وحفظها كلقطة
    let supplierApprovalSnapshot: any = null;
    if (input.rawMaterialId && input.supplierId) {
        try {
            supplierApprovalSnapshot = await masterDataService.createSupplierApprovalSnapshot(
                input.supplierId,
                input.supplierName,
                input.rawMaterialId,
                companyId
            );
        } catch (err) {
            console.error('Failed to create supplier approval snapshot:', err);
        }
    }

    // Map overallResult to status
    const statusMap = {
        'pending': 'pending',
        'accepted': 'accepted',
        'rejected': 'rejected'
    };
    const status = statusMap[input.overallResult || 'pending'] || 'pending';

    const { data, error } = await supabase
        .from('material_receiving')
        .insert({
            receiving_number: receivingNumber,
            material_type: input.materialType,
            status: status,
            raw_material_id: input.rawMaterialId || null,
            material_name: input.materialName,
            material_code: input.materialCode,
            batch_number: input.batchNumber,
            lot_number: input.lotNumber,
            supplier_id: input.supplierId || null,
            supplier_name: input.supplierName,
            quantity: input.quantity,
            unit: input.unit,
            packaging_type: input.packagingType,
            production_date: input.productionDate || null,
            expiry_date: input.expiryDate || null,
            received_at: now,
            received_by: userId,
            received_by_name: userName,
            delivery_note_number: input.deliveryNoteNumber,
            invoice_number: input.invoiceNumber,
            certificate_of_analysis: input.certificateOfAnalysis,
            inspection_required: input.inspectionRequired ?? true,
            storage_location: input.storageLocation,
            storage_condition: input.storageCondition,
            notes: input.notes,
            company_id: companyId || null,
            created_at: now,
            updated_at: now
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating material receiving:', error);
        return null;
    }

    return normalizeMaterialReceiving(data);
}

/**
 * Update material receiving data (before approval)
 * تحديث بيانات استلام المادة (قبل الموافقة)
 */
export async function updateMaterialReceiving(
    id: string,
    updates: {
        batchNumber?: string;
        lotNumber?: string;
        quantity?: number;
        unit?: string;
        productionDate?: string;
        expiryDate?: string;
        supplierName?: string;
        supplierId?: string;
        invoiceNumber?: string;
        deliveryNoteNumber?: string;
        packagingType?: string;
        storageLocation?: string;
        storageCondition?: string;
        notes?: string;
        testResults?: any;
    }
): Promise<boolean> {
    // Build update object with snake_case keys
    const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
    };

    if (updates.batchNumber !== undefined) updateData.batch_number = updates.batchNumber;
    if (updates.lotNumber !== undefined) updateData.lot_number = updates.lotNumber;
    if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
    if (updates.unit !== undefined) updateData.unit = updates.unit;
    if (updates.productionDate !== undefined) updateData.production_date = updates.productionDate;
    if (updates.expiryDate !== undefined) updateData.expiry_date = updates.expiryDate;
    if (updates.supplierName !== undefined) updateData.supplier_name = updates.supplierName;
    if (updates.supplierId !== undefined) updateData.supplier_id = updates.supplierId;
    if (updates.invoiceNumber !== undefined) updateData.invoice_number = updates.invoiceNumber;
    if (updates.deliveryNoteNumber !== undefined) updateData.delivery_note_number = updates.deliveryNoteNumber;
    if (updates.packagingType !== undefined) updateData.packaging_type = updates.packagingType;
    if (updates.storageLocation !== undefined) updateData.storage_location = updates.storageLocation;
    if (updates.storageCondition !== undefined) updateData.storage_condition = updates.storageCondition;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.testResults !== undefined) updateData.test_results = updates.testResults;

    const { error } = await supabase
        .from('material_receiving')
        .update(updateData)
        .eq('id', id);

    if (error) {
        console.error('Error updating material receiving:', error);
        return false;
    }

    return true;
}

/**
 * Update material receiving status
 * تحديث حالة استلام المادة
 */
export async function updateMaterialReceivingStatus(
    id: string,
    status: MaterialReceivingStatus,
    notes?: string
): Promise<boolean> {
    const { error } = await supabase
        .from('material_receiving')
        .update({
            status,
            inspection_notes: notes,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    return !error;
}

/**
 * Inspect material (accept/reject)
 * فحص المادة (قبول/رفض)
 */
export async function inspectMaterial(
    id: string,
    accepted: boolean,
    acceptedQty: number,
    rejectedQty: number,
    notes: string,
    userId: string
): Promise<boolean> {
    const now = new Date().toISOString();

    const { error } = await supabase
        .from('material_receiving')
        .update({
            status: accepted ? 'accepted' : 'rejected',
            accepted_quantity: acceptedQty,
            rejected_quantity: rejectedQty,
            rejection_reason: accepted ? null : notes,
            inspection_notes: notes,
            inspected_by: userId,
            inspected_at: now,
            updated_at: now
        })
        .eq('id', id);

    return !error;
}

// ============ Lab Tests CRUD ============

/**
 * Get all lab tests
 * جلب جميع الفحوصات المخبرية
 */
export async function getLabTests(
    companyId?: string,
    filters?: {
        status?: LabTestStatus;
        testType?: string;
        priority?: string;
        assignedTo?: string;
    }
): Promise<LabTest[]> {
    let query = supabase
        .from('lab_tests')
        .select(`
            *,
            lab_samples (id, sample_number, source_name)
        `)
        .order('requested_at', { ascending: false });

    if (companyId) {
        query = query.eq('company_id', companyId);
    }

    if (filters?.status) {
        query = query.eq('status', filters.status);
    }

    if (filters?.testType) {
        query = query.eq('test_type', filters.testType);
    }

    if (filters?.priority) {
        query = query.eq('priority', filters.priority);
    }

    if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching lab tests:', error);
        return [];
    }

    return (data || []).map(normalizeLabTest);
}

/**
 * Get single lab test by ID
 * جلب فحص مخبري واحد
 */
export async function getLabTestById(id: string): Promise<LabTest | null> {
    const { data, error } = await supabase
        .from('lab_tests')
        .select(`
            *,
            lab_samples (*)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching lab test:', error);
        return null;
    }

    return normalizeLabTest(data);
}

/**
 * Create new lab test
 * إنشاء فحص مخبري جديد
 */
export async function createLabTest(
    input: CreateLabTestInput,
    userId: string,
    userName: string,
    companyId?: string
): Promise<LabTest | null> {
    const now = new Date().toISOString();

    // Generate test number
    const { count } = await supabase
        .from('lab_tests')
        .select('id', { count: 'exact', head: true });

    const testNumber = `LAB-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;

    // Convert sample object to sample_data JSONB
    const sampleData = input.sample ? {
        sample_number: input.sample.sampleNumber,
        sample_type: input.sample.sampleType,
        source_id: input.sample.sourceId,
        source_name: input.sample.sourceName,
        collected_by: input.sample.collectedBy,
        collected_at: input.sample.collectedAt,
        quantity: input.sample.quantity,
        unit: input.sample.unit,
        storage_condition: input.sample.storageCondition,
        notes: input.sample.notes
    } : null;

    const { data, error } = await supabase
        .from('lab_tests')
        .insert({
            test_number: testNumber,
            test_type: input.testType,
            status: 'pending',
            sample_data: sampleData,
            parameters: input.parameters || [],
            requested_by: userId,
            requested_by_name: userName,
            requested_at: now,
            assigned_to: input.assignedTo || null,
            priority: input.priority || 'normal',
            due_date: input.dueDate || null,
            notes: input.notes,
            company_id: companyId || null,
            created_at: now,
            updated_at: now
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating lab test:', error);
        return null;
    }

    return normalizeLabTest(data);
}

/**
 * Update lab test status
 * تحديث حالة الفحص المخبري
 */
export async function updateLabTestStatus(
    id: string,
    status: LabTestStatus,
    userId?: string,
    userName?: string
): Promise<boolean> {
    const now = new Date().toISOString();
    const updates: any = {
        status,
        updated_at: now
    };

    if (status === 'in_progress' && userId) {
        updates.assigned_to = userId;
        updates.assigned_to_name = userName;
        updates.started_at = now;
    }

    if (status === 'completed') {
        updates.completed_at = now;
    }

    const { error } = await supabase
        .from('lab_tests')
        .update(updates)
        .eq('id', id);

    return !error;
}

/**
 * Approve/Reject lab test
 * اعتماد/رفض الفحص المخبري
 */
export async function approveLabTest(
    id: string,
    approved: boolean,
    notes: string,
    userId: string,
    userName: string
): Promise<boolean> {
    const now = new Date().toISOString();

    const { error } = await supabase
        .from('lab_tests')
        .update({
            status: approved ? 'approved' : 'rejected',
            approved_by: userId,
            approved_by_name: userName,
            approved_at: now,
            approval_notes: notes,
            updated_at: now
        })
        .eq('id', id);

    return !error;
}

/**
 * Update lab test results (parameters)
 * تحديث نتائج الفحص (المعايير)
 */
export async function updateLabTestResults(
    id: string,
    parameters: any[],
    status?: LabTestStatus
): Promise<boolean> {
    const updates: any = {
        parameters,
        updated_at: new Date().toISOString()
    };

    if (status) {
        updates.status = status;
        if (status === 'completed') {
            updates.completed_at = new Date().toISOString();
        }
    }

    const { error } = await supabase
        .from('lab_tests')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('Error updating lab test results:', error);
    }

    return !error;
}

/**
 * Link lab test to material receiving
 * ربط الفحص باستلام المادة
 */
export async function linkTestToReceiving(
    receivingId: string,
    labTestId: string
): Promise<boolean> {
    const { error } = await supabase
        .from('material_receiving')
        .update({
            lab_test_id: labTestId,
            lab_test_status: 'pending',
            updated_at: new Date().toISOString()
        })
        .eq('id', receivingId);

    return !error;
}

// ============ Dashboard Statistics ============

/**
 * Get lab dashboard statistics
 * إحصائيات لوحة المختبر
 */
export async function getLabDashboardStats(companyId?: string): Promise<{
    totalReceivings: number;
    pendingReceivings: number;
    pendingTests: number;
    completedTestsToday: number;
}> {
    const today = new Date().toISOString().split('T')[0];

    // Get receivings count
    let receivingsQuery = supabase
        .from('material_receiving')
        .select('id, status', { count: 'exact' });

    if (companyId) {
        receivingsQuery = receivingsQuery.eq('company_id', companyId);
    }

    const { data: receivings, count: totalReceivings } = await receivingsQuery;
    const pendingReceivings = (receivings || []).filter(r => r.status === 'pending').length;

    // Get tests count
    let testsQuery = supabase
        .from('lab_tests')
        .select('id, status, completed_at', { count: 'exact' });

    if (companyId) {
        testsQuery = testsQuery.eq('company_id', companyId);
    }

    const { data: tests } = await testsQuery;
    const pendingTests = (tests || []).filter(t => ['pending', 'in_progress'].includes(t.status)).length;
    const completedTestsToday = (tests || []).filter(t =>
        t.status === 'completed' && t.completed_at?.startsWith(today)
    ).length;

    return {
        totalReceivings: totalReceivings || 0,
        pendingReceivings,
        pendingTests,
        completedTestsToday
    };
}
