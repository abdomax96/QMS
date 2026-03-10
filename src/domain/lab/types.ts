/**
 * Laboratory Module Types & DTOs
 * قسم المختبر - الأنواع والواجهات
 */

// ============ Enums ============

export type LabTestStatus = 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected';
export type LabTestType = 'chemical' | 'physical' | 'microbiological' | 'sensory' | 'packaging';
export type LabSampleType = 'raw_material' | 'in_process' | 'finished_product' | 'environmental';

export type MaterialType = 'packaging' | 'ingredient' | 'chemical' | 'additive' | 'other' | 'raw_material';
export type MaterialReceivingStatus = 'pending' | 'inspecting' | 'in_testing' | 'accepted' | 'approved' | 'rejected' | 'on_hold';
export type MaterialDateFormat = 'dmy' | 'my';

// ============ Lab Test Interfaces ============

export interface LabTestParameter {
    id: string;
    name: string;
    method: string;
    unit: string;
    specification: string;
    minValue?: number;
    maxValue?: number;
    result?: string | number;
    status?: 'pass' | 'fail' | 'pending';
    testedBy?: string;
    testedAt?: string;
}

export interface LabSample {
    id: string;
    sampleNumber: string;
    sampleType: LabSampleType;
    sourceId?: string;         // Material receiving ID or production batch
    sourceName: string;
    collectedBy: string;
    collectedAt: string;
    quantity: string;
    unit: string;
    storageCondition?: string;
    notes?: string;
}

export interface LabTest {
    id: string;
    testNumber: string;        // Auto-generated: LAB-YYYY-XXXX
    testType: LabTestType;
    status: LabTestStatus;
    companyId?: string;        // الشركة (Multi-tenant)

    // Sample info
    sample: LabSample;

    // Test details
    parameters: LabTestParameter[];
    requestedBy: string;
    requestedByName: string;
    requestedAt: string;

    // Execution
    assignedTo?: string;
    assignedToName?: string;
    startedAt?: string;
    completedAt?: string;

    // Approval
    approvedBy?: string;
    approvedByName?: string;
    approvedAt?: string;
    approvalNotes?: string;

    // General
    priority: 'normal' | 'urgent' | 'critical';
    dueDate?: string;
    notes?: string;
    attachments?: LabAttachment[];

    // Metadata
    createdAt: string;
    updatedAt: string;
}

export interface LabAttachment {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    uploadedBy: string;
    uploadedAt: string;
}

// ============ Material Receiving Interfaces ============

export interface Supplier {
    id: string;
    name: string;
    code: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    approved: boolean;
}

export interface MaterialReceiving {
    id: string;
    receivingNumber: string;   // Auto-generated: RCV-YYYY-XXXX
    materialType: MaterialType;
    status: MaterialReceivingStatus;
    companyId?: string;              // الشركة (Multi-tenant)

    // Material info - الربط بالمادة الخام
    rawMaterialId?: string;           // ربط مع جدول raw_materials
    materialName: string;
    materialCode?: string;
    batchNumber: string;
    lotNumber?: string;

    // Supplier
    supplierId: string;
    supplierName: string;

    // Quantity
    quantity: number;
    unit: string;
    packagingType?: string;

    // Dates
    productionDate?: string;
    expiryDate?: string;
    productionDateFormat?: MaterialDateFormat;
    expiryDateFormat?: MaterialDateFormat;
    receivedAt: string;
    receivedBy: string;
    receivedByName: string;

    // Documents
    deliveryNoteNumber?: string;
    invoiceNumber?: string;
    certificateOfAnalysis?: string;

    // Inspection
    inspectionRequired: boolean;
    inspectedBy?: string;
    inspectedAt?: string;
    inspectionNotes?: string;

    // Lab test link
    labTestId?: string;
    labTestStatus?: LabTestStatus;

    // Storage
    storageLocation?: string;
    storageCondition?: string;

    // Decision
    acceptedQuantity?: number;
    rejectedQuantity?: number;
    rejectionReason?: string;
    consumedQuantity?: number;
    remainingQuantity?: number;
    isManuallyDepleted?: boolean;
    manualDepletionReason?: string;
    manualDepletedAt?: string;

    // Snapshots for audit trail - لقطات للتتبع
    testRequirementsSnapshot?: TestRequirementSnapshot[];
    supplierApprovalSnapshot?: SupplierApprovalSnapshot;

    // Test Results - نتائج الفحص
    testResults?: any;

    // Vehicle Inspection - بيانات فحص السيارة
    vehicleInspection?: {
        vehicleType: string;
        cleanliness: 'pass' | 'fail' | '';
        noOdors: 'pass' | 'fail' | '';
        noContaminants: 'pass' | 'fail' | '';
        packagingIntact: 'pass' | 'fail' | '';
        temperatureOk: 'pass' | 'fail' | 'na' | '';
        temperature: string;
        vehicleNotes?: string;
    };

    // Metadata
    notes?: string;
    attachments?: LabAttachment[];
    createdAt: string;
    updatedAt: string;
}

// Snapshot types for audit trail
export interface TestRequirementSnapshot {
    testType: string;
    testName: string;
    parameters: { name: string; min?: number; max?: number; unit?: string }[];
    required: boolean;
}

export interface SupplierApprovalSnapshot {
    supplierId: string;
    supplierName: string;
    approvalStatus: string;
    approvalDate?: string;
    capturedAt: string;
}

// ============ DTOs ============

export interface CreateLabTestInput {
    testType: LabTestType;
    sample: Omit<LabSample, 'id'>;
    parameters: Omit<LabTestParameter, 'id' | 'result' | 'status' | 'testedBy' | 'testedAt'>[];
    priority: 'normal' | 'urgent' | 'critical';
    dueDate?: string;
    notes?: string;
    assignedTo?: string;
}

export interface CreateMaterialReceivingInput {
    materialType: MaterialType;
    rawMaterialId?: string;      // ربط مع المادة الخام
    materialName: string;
    materialCode?: string;
    batchNumber: string;
    lotNumber?: string;
    supplierId: string;
    supplierName: string;
    quantity: number;
    unit: string;
    packagingType?: string;
    productionDate?: string;
    expiryDate?: string;
    receivedAt?: string;
    productionDateFormat?: MaterialDateFormat;
    expiryDateFormat?: MaterialDateFormat;
    deliveryNoteNumber?: string;
    invoiceNumber?: string;
    certificateOfAnalysis?: string;
    inspectionRequired: boolean;
    storageLocation?: string;
    storageCondition?: string;
    notes?: string;
    companyId?: string;          // الشركة

    // فحص السيارة
    vehicleInspection?: {
        vehicleType: string;
        cleanliness: 'pass' | 'fail' | '';
        noOdors: 'pass' | 'fail' | '';
        noContaminants: 'pass' | 'fail' | '';
        packagingIntact: 'pass' | 'fail' | '';
        temperatureOk: 'pass' | 'fail' | 'na' | '';
        temperature: string;
        vehicleNotes: string;
    };

    // النتيجة النهائية
    overallResult?: 'pending' | 'accepted' | 'rejected';
    acceptedQuantity?: number;
    rejectedQuantity?: number;
    rejectionReason?: string;

    // نتائج الفحص الأولية عند الاستلام
    initialTestResults?: {
        testName: string;
        testNameEn?: string;
        testType: string;
        required: boolean;
        results: {
            paramName: string;
            paramUnit?: string;
            min?: string;
            max?: string;
            value: string;
        }[];
    }[];
}

export interface LabFilters {
    testType?: LabTestType[];
    status?: LabTestStatus[];
    priority?: ('normal' | 'urgent' | 'critical')[];
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}

export interface MaterialFilters {
    materialType?: MaterialType[];
    status?: MaterialReceivingStatus[];
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}

// ============ Labels & Colors ============

export const labTestStatusLabels: Record<LabTestStatus, string> = {
    pending: 'قيد الانتظار',
    in_progress: 'قيد الفحص',
    completed: 'مكتمل',
    approved: 'معتمد',
    rejected: 'مرفوض'
};

export const labTestStatusColors: Record<LabTestStatus, { bg: string; text: string }> = {
    pending: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
    in_progress: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
    completed: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300' },
    approved: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
    rejected: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' }
};

export const labTestTypeLabels: Record<LabTestType, string> = {
    chemical: 'كيميائي',
    physical: 'فيزيائي',
    microbiological: 'ميكروبيولوجي',
    sensory: 'حسي',
    packaging: 'تعبئة وتغليف'
};

export const labTestTypeIcons: Record<LabTestType, string> = {
    chemical: 'beaker',
    physical: 'scale',
    microbiological: 'bug',
    sensory: 'eye',
    packaging: 'cube'
};

export const materialTypeLabels: Record<MaterialType, string> = {
    packaging: 'مواد تعبئة وتغليف',
    ingredient: 'مكونات غذائية',
    chemical: 'مواد كيميائية',
    additive: 'مضافات غذائية',
    raw_material: 'مواد خام',
    other: 'أخرى'
};

export const materialReceivingStatusLabels: Record<MaterialReceivingStatus, string> = {
    pending: 'قيد الانتظار',
    inspecting: 'قيد الفحص',
    in_testing: 'قيد الاختبار',
    accepted: 'مقبول',
    approved: 'معتمد',
    rejected: 'مرفوض',
    on_hold: 'محتجز'
};

export const materialReceivingStatusColors: Record<MaterialReceivingStatus, { bg: string; text: string }> = {
    pending: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
    inspecting: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
    in_testing: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300' },
    accepted: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
    approved: { bg: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-700 dark:text-emerald-300' },
    rejected: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' },
    on_hold: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-700 dark:text-orange-300' }
};

export const sampleTypeLabels: Record<LabSampleType, string> = {
    raw_material: 'مادة خام',
    in_process: 'أثناء الإنتاج',
    finished_product: 'منتج نهائي',
    environmental: 'بيئي'
};

// ============ Helper Functions ============

export function generateLabTestNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `LAB-${year}-${random}`;
}

export function generateReceivingNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `RCV-${year}-${random}`;
}

export function generateSampleNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(100 + Math.random() * 900);
    return `SMP-${dateStr}-${random}`;
}

export function calculateTestProgress(test: LabTest): number {
    if (test.parameters.length === 0) return 0;
    const completed = test.parameters.filter(p => p.status && p.status !== 'pending').length;
    return Math.round((completed / test.parameters.length) * 100);
}

export function isTestPassed(test: LabTest): boolean {
    return test.parameters.every(p => p.status === 'pass');
}

export function getOverdueTests(tests: LabTest[]): LabTest[] {
    const now = new Date();
    return tests.filter(t =>
        t.dueDate &&
        t.status !== 'completed' &&
        t.status !== 'approved' &&
        t.status !== 'rejected' &&
        new Date(t.dueDate) < now
    );
}
