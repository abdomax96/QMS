/**
 * Master Data Types - الموردين والخامات
 * Updated with multi-company support and junction table types
 */

// ============ Company Interface ============

export interface Company {
    id: string;
    name: string;
    nameEn?: string;
    code: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    email?: string;
    taxNumber?: string;
    commercialRegister?: string;
    active: boolean;
    settings?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

// ============ Supplier Interface ============

export interface Supplier {
    id: string;
    code: string;                   // رمز المورد
    name: string;                   // اسم المورد
    nameEn?: string;                // الاسم بالإنجليزية
    type: SupplierType;             // نوع المورد
    companyId?: string;             // الشركة (Multi-tenant)

    // Contact Info
    contactPerson?: string;
    phone?: string;
    mobile?: string;
    email?: string;
    fax?: string;

    // Address
    address?: string;
    city?: string;
    country?: string;

    // Business Info
    taxNumber?: string;
    commercialRegister?: string;

    // Status
    approved: boolean;              // معتمد
    active: boolean;                // نشط

    // Metadata
    notes?: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
}

export type SupplierType =
    | 'raw_materials'       // موردين مواد خام
    | 'packaging'           // موردين مواد تعبئة
    | 'chemicals'           // موردين مواد كيميائية
    | 'equipment'           // موردين معدات
    | 'services'            // موردين خدمات
    | 'other';              // أخرى

export const supplierTypeLabels: Record<SupplierType, string> = {
    raw_materials: 'مواد خام',
    packaging: 'مواد تعبئة',
    chemicals: 'مواد كيميائية',
    equipment: 'معدات',
    services: 'خدمات',
    other: 'أخرى'
};

// ============ Raw Material Interface ============

export interface RawMaterial {
    id: string;
    code: string;                   // كود المادة
    name: string;                   // اسم المادة
    nameEn?: string;                // الاسم بالإنجليزية
    category: MaterialCategory;     // التصنيف
    companyId?: string;             // الشركة (Multi-tenant)

    // Specifications
    unit: string;                   // وحدة القياس
    specifications?: string;        // المواصفات
    shelfLife?: number;             // مدة الصلاحية
    shelfLifeUnit?: ShelfLifeUnit;  // وحدة مدة الصلاحية
    expirySubtractDays?: number;    // عدد الأيام المخصومة عند حساب الانتهاء بالشهر/السنة

    // Storage
    storageCondition?: string;      // ظروف التخزين
    storageTemperature?: string;    // درجة حرارة التخزين

    // Quality
    requiresLabTest: boolean;       // يتطلب فحص معملي
    qualityParameters?: string[];   // معايير الجودة

    // Allergens - مسببات الحساسية
    containsAllergens?: string[];   // يحتوي على مسببات الحساسية
    mayContainAllergens?: string[]; // قد يحتوي على (تلوث متقاطع)

    // Suppliers (DEPRECATED - use raw_material_suppliers junction table)
    /** @deprecated Use RawMaterialSupplier junction table instead */
    approvedSuppliers?: string[];   // الموردين المعتمدين (IDs)

    // Packaging
    packagingOptions?: string[];    // خيارات التعبئة
    packagingTypeId?: string;       // نوع التعبئة الرئيسي (لمواد التعبئة)
    packagingSubtypeId?: string;    // نوع التعبئة الفرعي (لمواد التعبئة)
    packagingTypeName?: string;     // اسم النوع الرئيسي
    packagingSubtypeName?: string;  // اسم النوع الفرعي
    allergens?: string[];           // مسببات الحساسية (حقل legacy مستخدم في الواجهات)

    // Status
    active: boolean;

    // Metadata
    notes?: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
}

// ============ Junction Table: RawMaterial ↔ Supplier ============

export type ApprovalStatus = 'pending' | 'approved' | 'suspended' | 'rejected';

export interface RawMaterialSupplier {
    id: string;
    rawMaterialId: string;
    supplierId: string;
    companyId: string;

    // Approval
    isPrimary: boolean;
    approvalStatus: ApprovalStatus;
    approvalDate?: string;
    approvedBy?: string;
    approvalNotes?: string;

    // Validity
    validFrom?: string;
    validUntil?: string;

    // Metadata
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

// ============ Junction Table: RawMaterial ↔ Tests ============

export type TestType = 'chemical' | 'physical' | 'microbiological' | 'sensory' | 'packaging';
export type TestFrequency = 'each_batch' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface TestParameter {
    name: string;
    unit?: string;
    min?: number;
    max?: number;
    method?: string;
    specification?: string;
}

export interface RawMaterialTest {
    id: string;
    rawMaterialId: string;
    companyId: string;

    // Test definition
    testType: TestType;
    testName: string;
    testNameEn?: string;
    testMethod?: string;

    // Parameters
    parameters: TestParameter[];
    acceptanceCriteria?: Record<string, unknown>;
    rejectionCriteria?: Record<string, unknown>;

    // Settings
    required: boolean;
    frequency: TestFrequency;
    priority: 'normal' | 'urgent' | 'critical';

    // Metadata
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export type MaterialCategory =
    | 'ingredient'          // مكون غذائي
    | 'packaging'           // مواد تعبئة
    | 'chemical'            // مواد كيميائية
    | 'additive'            // مضافات
    | 'flavoring'           // نكهات
    | 'coloring'            // ملونات
    | 'preservative'        // مواد حافظة
    | 'other';              // أخرى

export type ShelfLifeUnit = 'days' | 'months' | 'years';

export const shelfLifeUnitLabels: Record<ShelfLifeUnit, string> = {
    days: 'يوم',
    months: 'شهر',
    years: 'سنة'
};

export const materialCategoryLabels: Record<MaterialCategory, string> = {
    ingredient: 'مكون غذائي',
    packaging: 'مواد تعبئة',
    chemical: 'مواد كيميائية',
    additive: 'مضافات',
    flavoring: 'نكهات',
    coloring: 'ملونات',
    preservative: 'مواد حافظة',
    other: 'أخرى'
};

// ============ DTOs ============

export interface CreateSupplierInput {
    code: string;
    name: string;
    nameEn?: string;
    type: SupplierType;
    contactPerson?: string;
    phone?: string;
    mobile?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    taxNumber?: string;
    commercialRegister?: string;
    approved?: boolean;
    notes?: string;
}

export interface CreateMaterialInput {
    code: string;
    name: string;
    nameEn?: string;
    category: MaterialCategory;
    unit: string;
    specifications?: string;
    shelfLife?: number;
    shelfLifeUnit?: ShelfLifeUnit;
    expirySubtractDays?: number;
    storageCondition?: string;
    storageTemperature?: string;
    requiresLabTest?: boolean;
    qualityParameters?: string[];
    approvedSuppliers?: string[];
    containsAllergens?: string[];   // مسببات الحساسية
    mayContainAllergens?: string[]; // قد يحتوي على
    allergens?: string[];           // حقل الحفظ الحالي في قاعدة البيانات
    packagingTypeId?: string;
    packagingSubtypeId?: string;
    notes?: string;
}

export interface LabPackagingType {
    id: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    usageCount: number;
    createdAt: string;
    updatedAt: string;
}

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

// ============ Helper Functions ============

export function generateSupplierCode(): string {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `SUP-${random}`;
}

export function generateMaterialCode(category: MaterialCategory, existingMaterials: RawMaterial[] = []): string {
    const prefixes: Record<MaterialCategory, string> = {
        ingredient: 'ING',
        packaging: 'PKG',
        chemical: 'CHM',
        additive: 'ADD',
        flavoring: 'FLV',
        coloring: 'CLR',
        preservative: 'PRV',
        other: 'OTH'
    };
    const prefix = prefixes[category];

    // Find the highest number for this category prefix
    const maxNumber = existingMaterials
        .filter(m => m.code.startsWith(prefix + '-'))
        .map(m => {
            const numPart = m.code.split('-')[1];
            return parseInt(numPart || '0', 10);
        })
        .filter(n => !isNaN(n))
        .reduce((max, num) => Math.max(max, num), 0);

    // Generate next sequential number with 4 digits padding
    const nextNumber = String(maxNumber + 1).padStart(4, '0');
    return `${prefix}-${nextNumber}`;
}

// ============ Library: Inspection Criteria ============

export interface InspectionCriterion {
    id: string;
    code: string;
    name: string;
    nameEn?: string;
    testType: TestType;
    defaultParameters?: Parameter[];
    description?: string;
    active: boolean;
}

// Re-export Parameter to be used in InspectionCriterion
export interface Parameter {
    name: string;
    type: 'numeric' | 'passfail' | 'yesno' | 'text' | 'options';
    unit?: string;
    min?: string;
    max?: string;
    expectedValue?: string;
    options?: string[];
}
