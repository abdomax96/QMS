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
    LabTestStatus,
    MaterialDateFormat
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

let inventoryViewAvailability: 'unknown' | 'checking' | 'available' | 'missing' = 'unknown';

function isInventoryViewMissingError(error: any): boolean {
    if (!error) return false;

    const status = Number(error?.status ?? error?.statusCode ?? 0);
    const code = String(error?.code ?? '').toUpperCase();
    const message = String(error?.message ?? '').toLowerCase();
    const details = String(error?.details ?? '').toLowerCase();

    return (
        status === 404 ||
        code === 'PGRST205' ||
        code === '42P01' ||
        message.includes('v_material_receiving_inventory') ||
        details.includes('v_material_receiving_inventory')
    );
}

function shouldUseInventoryView(): boolean {
    if (inventoryViewAvailability === 'missing' || inventoryViewAvailability === 'checking') {
        return false;
    }

    if (inventoryViewAvailability === 'unknown') {
        // Allow only the first in-flight query to probe the view.
        inventoryViewAvailability = 'checking';
    }

    return true;
}

function markInventoryViewAvailable(): void {
    inventoryViewAvailability = 'available';
}

function handleInventoryViewError(error: any): void {
    if (isInventoryViewMissingError(error)) {
        if (inventoryViewAvailability !== 'missing') {
            console.warn(
                '[labService] v_material_receiving_inventory is unavailable. Falling back to material_receiving.'
            );
        }
        inventoryViewAvailability = 'missing';
        return;
    }

    if (inventoryViewAvailability === 'checking') {
        // Transient errors should allow future retries.
        inventoryViewAvailability = 'unknown';
    }

    console.warn('Inventory view query failed, falling back to material_receiving:', error);
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
        productionDateFormat: data.production_date_format || 'dmy',
        expiryDateFormat: data.expiry_date_format || 'dmy',
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
        consumedQuantity: data.consumed_quantity,
        remainingQuantity: data.remaining_quantity,
        isManuallyDepleted: data.is_manually_depleted,
        manualDepletionReason: data.manual_depletion_reason,
        manualDepletedAt: data.manual_depleted_at,
        notes: data.notes,
        attachments: data.attachments || [],
        companyId: data.company_id,
        testRequirementsSnapshot: data.test_requirements_snapshot,
        supplierApprovalSnapshot: data.supplier_approval_snapshot,
        testResults: data.initial_test_results, // نتائج الفحص الأولية
        vehicleInspection: sanitizeVehicleInspection(data.vehicle_inspection), // بيانات فحص السيارة
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

function normalizeReceivedAtInput(value?: string): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
        ? new Date(`${trimmed}T12:00:00`)
        : new Date(trimmed);

    if (Number.isNaN(parsedDate.getTime())) return null;
    return parsedDate.toISOString();
}

function sanitizeVehicleInspection(input: any): any {
    if (!input || typeof input !== 'object') return input ?? null;
    const { vehiclePlate: _removedVehiclePlate, driverName: _removedDriverName, ...rest } = input;
    return rest;
}

// ============ Batch Lookup for Traceability ============

export interface MaterialBatch {
    id: string;
    receivingNumber: string;
    batchNumber: string;
    lotNumber?: string;
    productionDate?: string;
    expiryDate?: string;
    productionDateFormat?: MaterialDateFormat;
    expiryDateFormat?: MaterialDateFormat;
    quantity: number;
    unit: string;
    supplierName: string;
    supplierId?: string;
    receivedAt: string;
    status: string;
    consumedQuantity?: number;
    remainingQuantity?: number;
    isManuallyDepleted?: boolean;
    isAvailableForIssue?: boolean;
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
        limit?: number;
    }
): Promise<MaterialBatch[]> {
    const requestedLimit = Number(options?.limit);
    const batchLimit = Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 1000)
        : 200;

    const applyStatusFilter = (query: any) => {
        if (options?.status === 'accepted') return query.eq('status', 'accepted');
        if (options?.status === 'approved') return query.eq('status', 'approved');
        if (options?.status === 'all') return query;
        return query.in('status', ['accepted', 'approved']);
    };

    const mapInventoryRows = (rows: any[]): MaterialBatch[] =>
        rows.map((item: any) => ({
            id: item.id,
            receivingNumber: item.receiving_number,
            batchNumber: item.batch_number,
            lotNumber: item.lot_number,
            productionDate: item.production_date,
            expiryDate: item.expiry_date,
            productionDateFormat: item.production_date_format || 'dmy',
            expiryDateFormat: item.expiry_date_format || 'dmy',
            quantity: item.quantity,
            unit: item.unit,
            supplierName: item.supplier_name,
            supplierId: item.supplier_id,
            receivedAt: item.received_at,
            status: item.status,
            consumedQuantity: item.consumed_quantity,
            remainingQuantity: item.remaining_quantity,
            isManuallyDepleted: item.is_manually_depleted,
            isAvailableForIssue: item.is_available_for_issue
        }));

    const runInventoryQuery = async (useCompanyFilter: boolean) => {
        let query = supabase
            .from('v_material_receiving_inventory')
            .select(`
                id,
                receiving_number,
                batch_number,
                lot_number,
                production_date,
                expiry_date,
                production_date_format,
                expiry_date_format,
                quantity,
                unit,
                supplier_name,
                supplier_id,
                received_at,
                status,
                consumed_quantity,
                remaining_quantity,
                is_manually_depleted,
                is_available_for_issue
            `)
            .eq('raw_material_id', rawMaterialId)
            .eq('is_available_for_issue', true)
            .order('received_at', { ascending: false })
            .limit(batchLimit);

        query = applyStatusFilter(query);

        if (useCompanyFilter && options?.companyId) {
            query = query.eq('company_id', options.companyId);
        }

        if (options?.productionDate) {
            query = query.eq('production_date', options.productionDate);
        }

        return await query;
    };

    if (shouldUseInventoryView()) {
        const inventoryPrimary = await runInventoryQuery(true);

        if (!inventoryPrimary.error) {
            markInventoryViewAvailable();
            if ((inventoryPrimary.data || []).length > 0) {
                return mapInventoryRows(inventoryPrimary.data || []);
            }

            if (options?.companyId) {
                const inventoryFallbackCompany = await runInventoryQuery(false);
                if (!inventoryFallbackCompany.error) {
                    markInventoryViewAvailable();
                    if ((inventoryFallbackCompany.data || []).length > 0) {
                        return mapInventoryRows(inventoryFallbackCompany.data || []);
                    }
                } else {
                    handleInventoryViewError(inventoryFallbackCompany.error);
                }
            }
        } else {
            handleInventoryViewError(inventoryPrimary.error);
        }
    }

    const runLegacyQuery = async (useCompanyFilter: boolean) => {
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
                accepted_quantity,
                unit,
                supplier_name,
                supplier_id,
                received_at,
                status
            `)
            .eq('raw_material_id', rawMaterialId)
            .order('received_at', { ascending: false })
            .limit(batchLimit);

        query = applyStatusFilter(query);

        if (useCompanyFilter && options?.companyId) {
            query = query.eq('company_id', options.companyId);
        }

        if (options?.productionDate) {
            query = query.eq('production_date', options.productionDate);
        }

        return await query;
    };

    const legacyPrimary = await runLegacyQuery(true);
    let legacyData = legacyPrimary.data || [];
    let legacyError = legacyPrimary.error;

    if (!legacyError && legacyData.length === 0 && options?.companyId) {
        const legacyFallbackCompany = await runLegacyQuery(false);
        legacyData = legacyFallbackCompany.data || legacyData;
        legacyError = legacyFallbackCompany.error || legacyError;
    }

    if (legacyError) {
        console.error('Error fetching material batches:', legacyError);
        return [];
    }

    return legacyData
        .map((item: any) => {
            const baseQuantity = Number(item.accepted_quantity ?? item.quantity ?? 0);
            const remainingQuantity = Number.isFinite(baseQuantity) ? Math.max(baseQuantity, 0) : 0;
            return {
                id: item.id,
                receivingNumber: item.receiving_number,
                batchNumber: item.batch_number,
                lotNumber: item.lot_number,
                productionDate: item.production_date,
                expiryDate: item.expiry_date,
                productionDateFormat: 'dmy' as MaterialDateFormat,
                expiryDateFormat: 'dmy' as MaterialDateFormat,
                quantity: Number(item.quantity ?? 0),
                unit: item.unit,
                supplierName: item.supplier_name,
                supplierId: item.supplier_id,
                receivedAt: item.received_at,
                status: item.status,
                consumedQuantity: 0,
                remainingQuantity,
                isManuallyDepleted: false,
                isAvailableForIssue: remainingQuantity > 0,
            } as MaterialBatch;
        })
        .filter((item) => (item.remainingQuantity ?? 0) > 0);
}

/**
 * Get production dates that have available batches for a raw material
 * جلب تواريخ الإنتاج التي لها باتشات متاحة
 */
export async function getAvailableProductionDates(
    rawMaterialId: string,
    companyId?: string
): Promise<string[]> {
    if (shouldUseInventoryView()) {
        let inventoryQuery = supabase
            .from('v_material_receiving_inventory')
            .select('production_date')
            .eq('raw_material_id', rawMaterialId)
            .eq('is_available_for_issue', true)
            .not('production_date', 'is', null)
            .order('production_date', { ascending: false });

        if (companyId) {
            inventoryQuery = inventoryQuery.eq('company_id', companyId);
        }

        const { data, error } = await inventoryQuery;
        if (!error) {
            markInventoryViewAvailable();
            const uniqueDates = [...new Set((data || []).map((d: any) => d.production_date))];
            return uniqueDates.filter((d: any) => d !== null) as string[];
        }

        handleInventoryViewError(error);
    }

    let legacyQuery = supabase
        .from('material_receiving')
        .select('production_date')
        .eq('raw_material_id', rawMaterialId)
        .in('status', ['accepted', 'approved'])
        .not('production_date', 'is', null)
        .order('production_date', { ascending: false });

    if (companyId) {
        legacyQuery = legacyQuery.eq('company_id', companyId);
    }

    const { data: legacyData, error: legacyError } = await legacyQuery;

    if (legacyError) {
        console.error('Error fetching production dates:', legacyError);
        return [];
    }

    const uniqueDates = [...new Set((legacyData || []).map((d: any) => d.production_date))];
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
    const applyFilters = (query: any) => {
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

        return query;
    };

    if (shouldUseInventoryView()) {
        const inventoryQuery = applyFilters(
            supabase
                .from('v_material_receiving_inventory')
                .select('*')
                .order('received_at', { ascending: false })
        );

        const { data, error } = await inventoryQuery;
        if (!error) {
            markInventoryViewAvailable();
            return (data || []).map(normalizeMaterialReceiving);
        }

        handleInventoryViewError(error);
    }

    const legacyQuery = applyFilters(
        supabase
            .from('material_receiving')
            .select('*')
            .order('received_at', { ascending: false })
    );
    const { data: legacyData, error: legacyError } = await legacyQuery;

    if (legacyError) {
        console.error('Error fetching material receivings:', legacyError);
        return [];
    }

    return (legacyData || []).map((item: any) =>
        normalizeMaterialReceiving({
            ...item,
            consumed_quantity: 0,
            remaining_quantity: item.accepted_quantity ?? item.quantity ?? 0,
            is_manually_depleted: item.is_manually_depleted ?? false,
        })
    );
}

/**
 * Get single material receiving by ID
 * جلب استلام مادة واحد
 */
export async function getMaterialReceivingById(id: string): Promise<MaterialReceiving | null> {
    if (shouldUseInventoryView()) {
        const { data: inventoryRow, error: inventoryError } = await supabase
            .from('v_material_receiving_inventory')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (!inventoryError && inventoryRow) {
            markInventoryViewAvailable();
            return normalizeMaterialReceiving(inventoryRow);
        } else {
            handleInventoryViewError(inventoryError);
        }
    }

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
    const receivedAt = normalizeReceivedAtInput(input.receivedAt) || now;

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
            production_date_format: input.productionDateFormat || 'dmy',
            expiry_date_format: input.expiryDateFormat || 'dmy',
            received_at: receivedAt,
            received_by: userId,
            received_by_name: userName,
            delivery_note_number: input.deliveryNoteNumber,
            invoice_number: input.invoiceNumber,
            certificate_of_analysis: input.certificateOfAnalysis,
            inspection_required: input.inspectionRequired ?? true,
            storage_location: input.storageLocation,
            storage_condition: input.storageCondition,
            accepted_quantity: input.acceptedQuantity ?? input.quantity,
            rejected_quantity: input.rejectedQuantity ?? 0,
            rejection_reason: (input.rejectedQuantity ?? 0) > 0 ? (input.rejectionReason || null) : null,
            notes: input.notes,
            vehicle_inspection: sanitizeVehicleInspection(input.vehicleInspection),
            initial_test_results: input.initialTestResults || null,
            test_requirements_snapshot: testRequirementsSnapshot || [],
            supplier_approval_snapshot: supplierApprovalSnapshot,
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
        receivedAt?: string;
        productionDateFormat?: MaterialDateFormat;
        expiryDateFormat?: MaterialDateFormat;
        supplierName?: string;
        supplierId?: string;
        invoiceNumber?: string;
        deliveryNoteNumber?: string;
        packagingType?: string;
        storageLocation?: string;
        storageCondition?: string;
        acceptedQuantity?: number;
        rejectedQuantity?: number;
        rejectionReason?: string;
        notes?: string;
        testResults?: any;
        vehicleInspection?: any;
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
    if (updates.receivedAt !== undefined) {
        const normalizedReceivedAt = normalizeReceivedAtInput(updates.receivedAt);
        if (normalizedReceivedAt) updateData.received_at = normalizedReceivedAt;
    }
    if (updates.productionDateFormat !== undefined) updateData.production_date_format = updates.productionDateFormat;
    if (updates.expiryDateFormat !== undefined) updateData.expiry_date_format = updates.expiryDateFormat;
    if (updates.supplierName !== undefined) updateData.supplier_name = updates.supplierName;
    if (updates.supplierId !== undefined) updateData.supplier_id = updates.supplierId;
    if (updates.invoiceNumber !== undefined) updateData.invoice_number = updates.invoiceNumber;
    if (updates.deliveryNoteNumber !== undefined) updateData.delivery_note_number = updates.deliveryNoteNumber;
    if (updates.packagingType !== undefined) updateData.packaging_type = updates.packagingType;
    if (updates.storageLocation !== undefined) updateData.storage_location = updates.storageLocation;
    if (updates.storageCondition !== undefined) updateData.storage_condition = updates.storageCondition;
    if (updates.acceptedQuantity !== undefined) updateData.accepted_quantity = updates.acceptedQuantity;
    if (updates.rejectedQuantity !== undefined) updateData.rejected_quantity = updates.rejectedQuantity;
    if (updates.rejectionReason !== undefined) updateData.rejection_reason = updates.rejectionReason || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.testResults !== undefined) updateData.initial_test_results = updates.testResults;
    if (updates.vehicleInspection !== undefined) {
        updateData.vehicle_inspection = sanitizeVehicleInspection(updates.vehicleInspection);
    }

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
 * Mark/unmark material batch as manually depleted
 * تحديد/إلغاء تحديد نفاد الباتش يدوياً
 */
export async function setMaterialReceivingManualDepletion(
    id: string,
    isManuallyDepleted: boolean,
    reason?: string
): Promise<boolean> {
    const { data: authData } = await supabase.auth.getUser();
    const now = new Date().toISOString();

    const updates = isManuallyDepleted
        ? {
            is_manually_depleted: true,
            manual_depletion_reason: reason || null,
            manual_depleted_at: now,
            manual_depleted_by: authData?.user?.id || null,
            updated_at: now,
        }
        : {
            is_manually_depleted: false,
            manual_depletion_reason: null,
            manual_depleted_at: null,
            manual_depleted_by: null,
            updated_at: now,
        };

    const { error } = await supabase
        .from('material_receiving')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('Error updating manual depletion state:', error);
        return false;
    }

    return true;
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
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const todayStartIso = todayStart.toISOString();
    const tomorrowStartIso = tomorrowStart.toISOString();

    const baseReceivingsCount = () => {
        let query = supabase.from('material_receiving').select('id', { count: 'exact', head: true });
        if (companyId) query = query.eq('company_id', companyId);
        return query;
    };

    const baseTestsCount = () => {
        let query = supabase.from('lab_tests').select('id', { count: 'exact', head: true });
        if (companyId) query = query.eq('company_id', companyId);
        return query;
    };

    const [
        { count: totalReceivings, error: totalReceivingsError },
        { count: pendingReceivings, error: pendingReceivingsError },
        { count: pendingTests, error: pendingTestsError },
        { count: completedTestsToday, error: completedTodayError },
    ] = await Promise.all([
        baseReceivingsCount(),
        baseReceivingsCount().eq('status', 'pending'),
        baseTestsCount().in('status', ['pending', 'in_progress']),
        baseTestsCount()
            .eq('status', 'completed')
            .gte('completed_at', todayStartIso)
            .lt('completed_at', tomorrowStartIso),
    ]);

    if (totalReceivingsError) {
        console.warn('Error fetching total receivings count:', totalReceivingsError);
    }
    if (pendingReceivingsError) {
        console.warn('Error fetching pending receivings count:', pendingReceivingsError);
    }
    if (pendingTestsError) {
        console.warn('Error fetching pending tests count:', pendingTestsError);
    }
    if (completedTodayError) {
        console.warn('Error fetching completed tests today count:', completedTodayError);
    }

    return {
        totalReceivings: totalReceivings || 0,
        pendingReceivings: pendingReceivings || 0,
        pendingTests: pendingTests || 0,
        completedTestsToday: completedTestsToday || 0
    };
}
