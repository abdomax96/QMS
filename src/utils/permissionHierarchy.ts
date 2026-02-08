/**
 * Permission Hierarchy Service
 * نظام صلاحيات المصنع الشامل
 * 
 * Full Factory Coverage - All Departments
 */

// Permission hierarchy: which permissions require other permissions
export const PERMISSION_HIERARCHY: Record<string, string[]> = {
    // ========== EXPLORER / DOCUMENT MANAGEMENT ==========
    'explorer.create': ['explorer.view'],
    'explorer.update': ['explorer.view'],
    'explorer.delete': ['explorer.update', 'explorer.view'],
    'explorer.move': ['explorer.update', 'explorer.view'],

    // ========== QUALITY / NCR ==========
    'ncr.create': ['ncr.view_own'],
    'ncr.assign': ['ncr.view_all'],
    'ncr.root_cause': ['ncr.view_own'],
    'ncr.corrective_action': ['ncr.view_own'],
    'ncr.preventive_action': ['ncr.view_own'],
    'ncr.approve': ['ncr.view_all'],
    'ncr.close': ['ncr.approve', 'ncr.view_all'],
    'ncr.reopen': ['ncr.view_all'],
    'ncr.delete': ['ncr.view_all'],
    'ncr.export': ['ncr.view_all'],

    // ========== LABORATORY ==========
    'lab.request_test': ['lab.view'],
    'lab.assign_test': ['lab.view'],
    'lab.start_test': ['lab.view'],
    'lab.enter_results': ['lab.start_test', 'lab.view'],
    'lab.approve_results': ['lab.enter_results', 'lab.view'],
    'lab.reject_results': ['lab.view'],
    'lab.manage_criteria': ['lab.view'],
    'lab.manage_equipment': ['lab.view'],
    'lab.view_coa': ['lab.view'],

    // ========== PRODUCTION ==========
    'production.create_order': ['production.view'],
    'production.start_order': ['production.view'],
    'production.complete_order': ['production.start_order', 'production.view'],
    'production.cancel_order': ['production.view'],
    'production.record_output': ['production.view'],
    'production.record_downtime': ['production.view'],
    'production.manage_lines': ['production.view'],
    'production.manage_shifts': ['production.view'],
    'production.approve_batch': ['production.view'],
    'production.release_batch': ['production.approve_batch', 'production.view'],

    // ========== WAREHOUSE / INVENTORY ==========
    'warehouse.receive': ['warehouse.view'],
    'warehouse.issue': ['warehouse.view'],
    'warehouse.transfer': ['warehouse.view'],
    'warehouse.adjust': ['warehouse.view'],
    'warehouse.hold': ['warehouse.view'],
    'warehouse.release': ['warehouse.hold', 'warehouse.view'],
    'warehouse.manage_locations': ['warehouse.view'],
    'warehouse.stocktake': ['warehouse.view'],
    'warehouse.approve_adjustment': ['warehouse.adjust', 'warehouse.view'],

    // ========== RECEIVING / INCOMING ==========
    'receiving.create': ['receiving.view'],
    'receiving.inspect': ['receiving.view'],
    'receiving.approve': ['receiving.inspect', 'receiving.view'],
    'receiving.reject': ['receiving.inspect', 'receiving.view'],
    'receiving.hold': ['receiving.view'],
    'receiving.release': ['receiving.hold', 'receiving.view'],

    // ========== MAINTENANCE ==========
    'maintenance.create_request': ['maintenance.view'],
    'maintenance.assign': ['maintenance.view'],
    'maintenance.start_work': ['maintenance.view'],
    'maintenance.complete_work': ['maintenance.start_work', 'maintenance.view'],
    'maintenance.approve': ['maintenance.complete_work', 'maintenance.view'],
    'maintenance.manage_equipment': ['maintenance.view'],
    'maintenance.manage_schedule': ['maintenance.view'],
    'maintenance.manage_parts': ['maintenance.view'],

    // ========== PURCHASING ==========
    'purchasing.create_pr': ['purchasing.view'],
    'purchasing.approve_pr': ['purchasing.view'],
    'purchasing.create_po': ['purchasing.approve_pr', 'purchasing.view'],
    'purchasing.approve_po': ['purchasing.create_po', 'purchasing.view'],
    'purchasing.receive_po': ['purchasing.view'],
    'purchasing.manage_suppliers': ['purchasing.view'],
    'purchasing.evaluate_supplier': ['purchasing.view'],

    // ========== HR / EMPLOYEES ==========
    'hr.view_employees': ['hr.view'],
    'hr.create_employee': ['hr.view_employees', 'hr.view'],
    'hr.edit_employee': ['hr.view_employees', 'hr.view'],
    'hr.manage_attendance': ['hr.view'],
    'hr.manage_leave': ['hr.view'],
    'hr.manage_payroll': ['hr.view'],
    'hr.view_documents': ['hr.view'],

    // ========== TRAINING ==========
    'training.create_course': ['training.view'],
    'training.assign_training': ['training.view'],
    'training.record_attendance': ['training.view'],
    'training.approve_completion': ['training.record_attendance', 'training.view'],
    'training.manage_matrix': ['training.view'],

    // ========== CALIBRATION ==========
    'calibration.view_equipment': ['calibration.view'],
    'calibration.create_schedule': ['calibration.view'],
    'calibration.record_calibration': ['calibration.view'],
    'calibration.approve_calibration': ['calibration.record_calibration', 'calibration.view'],
    'calibration.manage_standards': ['calibration.view'],

    // ========== DOCUMENTS / DMS ==========
    'documents.create': ['documents.view'],
    'documents.edit': ['documents.view'],
    'documents.delete': ['documents.edit', 'documents.view'],
    'documents.approve': ['documents.view'],
    'documents.release': ['documents.approve', 'documents.view'],
    'documents.obsolete': ['documents.release', 'documents.view'],
    'documents.manage_types': ['documents.view'],

    // ========== FOOD SAFETY / HACCP ==========
    'food_safety.manage_haccp': ['food_safety.view'],
    'food_safety.record_monitoring': ['food_safety.view'],
    'food_safety.manage_sanitation': ['food_safety.view'],
    'food_safety.record_cleaning': ['food_safety.view'],
    'food_safety.manage_allergens': ['food_safety.view'],
    'food_safety.pre_op_check': ['food_safety.view'],
    'food_safety.corrective_action': ['food_safety.view'],

    // ========== FORMS ==========
    'forms.create_template': ['forms.view_own'],
    'forms.edit_template': ['forms.create_template', 'forms.view_own'],
    'forms.delete_template': ['forms.edit_template', 'forms.view_own'],
    'forms.fill_form': ['forms.view_own'],
    'forms.approve': ['forms.view_all', 'forms.view_own'],
    'forms.export': ['forms.view_own'],

    // ========== TASKS ==========
    'tasks.create': ['tasks.view_own'],
    'tasks.assign': ['tasks.view_dept', 'tasks.view_own'],
    'tasks.complete': ['tasks.view_own'],
    'tasks.verify': ['tasks.view_dept', 'tasks.view_own'],
    'tasks.delete': ['tasks.verify', 'tasks.view_dept'],

    // ========== REPORTS / ANALYTICS ==========
    'reports.view_all': ['reports.view'],
    'reports.export': ['reports.view'],
    'reports.create_custom': ['reports.export', 'reports.view'],
    'reports.schedule': ['reports.view'],

    // ========== MASTER DATA ==========
    'master_data.manage_materials': ['master_data.view'],
    'master_data.manage_suppliers': ['master_data.view'],
    'master_data.approve_suppliers': ['master_data.manage_suppliers', 'master_data.view'],
    'master_data.manage_products': ['master_data.view'],
    'master_data.manage_customers': ['master_data.view'],

    // ========== ADMINISTRATION ==========
    'users.create': ['users.view'],
    'users.edit': ['users.view'],
    'users.delete': ['users.edit', 'users.view'],
    'users.assign_roles': ['users.view'],
    'users.reset_password': ['users.edit', 'users.view'],
    'settings.edit_general': ['settings.view'],
    'settings.manage_departments': ['settings.view'],
    'settings.manage_permissions': ['settings.view'],
    'settings.manage_companies': ['settings.view'],
    'settings.backup': ['settings.view'],
    'settings.integrations': ['settings.view']
};

/**
 * Get all required permissions for a given permission (recursive)
 */
export function getRequiredPermissions(permission: string): string[] {
    const directRequirements = PERMISSION_HIERARCHY[permission] || [];
    const allRequirements = new Set<string>(directRequirements);

    for (const req of directRequirements) {
        const nestedReqs = getRequiredPermissions(req);
        nestedReqs.forEach(r => allRequirements.add(r));
    }

    return Array.from(allRequirements);
}

/**
 * Check if granting a permission would violate hierarchy rules
 */
export function checkHierarchyViolation(
    permission: string,
    currentPermissions: Set<string>
): string[] {
    const required = getRequiredPermissions(permission);
    return required.filter(r => !currentPermissions.has(r));
}

/**
 * Get all permissions that would need to be revoked if a permission is revoked
 */
export function getDependentPermissions(permission: string): string[] {
    const dependents: string[] = [];

    for (const [perm, requirements] of Object.entries(PERMISSION_HIERARCHY)) {
        if (requirements.includes(permission)) {
            dependents.push(perm);
            dependents.push(...getDependentPermissions(perm));
        }
    }

    return [...new Set(dependents)];
}

/**
 * Normalize permissions: auto-grant missing required permissions
 */
export function normalizePermissions(permissions: string[]): {
    normalized: string[];
    added: string[];
} {
    const normalized = new Set<string>(permissions);
    const added: string[] = [];

    for (const perm of permissions) {
        const required = getRequiredPermissions(perm);
        for (const req of required) {
            if (!normalized.has(req)) {
                normalized.add(req);
                added.push(req);
            }
        }
    }

    return { normalized: Array.from(normalized), added };
}

// Module definitions for matrix display (bilingual)
export interface ModuleDefinition {
    code: string;
    labelEn: string;
    labelAr: string;
    shortCode: string;
    permissions: PermissionDefinition[];
}

export interface PermissionDefinition {
    code: string;
    labelEn: string;
    labelAr: string;
    requiresPermissions?: string[];
}

// ========== COMPLETE FACTORY MODULE DEFINITIONS ==========
export const MODULE_DEFINITIONS: ModuleDefinition[] = [
    // DOCUMENT MANAGEMENT
    {
        code: 'explorer',
        labelEn: 'Documents / Explorer',
        labelAr: 'المستندات',
        shortCode: 'DOC',
        permissions: [
            { code: 'explorer.view', labelEn: 'View', labelAr: 'عرض' },
            { code: 'explorer.create', labelEn: 'Create', labelAr: 'إنشاء' },
            { code: 'explorer.update', labelEn: 'Edit', labelAr: 'تعديل' },
            { code: 'explorer.delete', labelEn: 'Delete', labelAr: 'حذف' },
            { code: 'explorer.move', labelEn: 'Move', labelAr: 'نقل' },
        ]
    },
    // QUALITY
    {
        code: 'quality',
        labelEn: 'Quality / NCR',
        labelAr: 'الجودة',
        shortCode: 'QA',
        permissions: [
            { code: 'ncr.view_own', labelEn: 'View Own', labelAr: 'عرض خاص' },
            { code: 'ncr.view_dept', labelEn: 'View Dept', labelAr: 'عرض قسم' },
            { code: 'ncr.view_all', labelEn: 'View All', labelAr: 'عرض الكل' },
            { code: 'ncr.create', labelEn: 'Create', labelAr: 'إنشاء' },
            { code: 'ncr.assign', labelEn: 'Assign', labelAr: 'تعيين' },
            { code: 'ncr.root_cause', labelEn: 'Root Cause', labelAr: 'سبب جذري' },
            { code: 'ncr.corrective_action', labelEn: 'CAPA', labelAr: 'إجراء تصحيحي' },
            { code: 'ncr.approve', labelEn: 'Approve', labelAr: 'اعتماد' },
            { code: 'ncr.close', labelEn: 'Close', labelAr: 'إغلاق' },
            { code: 'ncr.delete', labelEn: 'Delete', labelAr: 'حذف' },
        ]
    },
    // LABORATORY
    {
        code: 'lab',
        labelEn: 'Laboratory',
        labelAr: 'المختبر',
        shortCode: 'LAB',
        permissions: [
            { code: 'lab.view', labelEn: 'View', labelAr: 'عرض' },
            { code: 'lab.request_test', labelEn: 'Request Test', labelAr: 'طلب فحص' },
            { code: 'lab.assign_test', labelEn: 'Assign', labelAr: 'تعيين' },
            { code: 'lab.start_test', labelEn: 'Start', labelAr: 'بدء' },
            { code: 'lab.enter_results', labelEn: 'Enter Results', labelAr: 'إدخال نتائج' },
            { code: 'lab.approve_results', labelEn: 'Approve', labelAr: 'اعتماد' },
            { code: 'lab.manage_criteria', labelEn: 'Criteria', labelAr: 'معايير' },
            { code: 'lab.manage_equipment', labelEn: 'Equipment', labelAr: 'معدات' },
        ]
    },
    // PRODUCTION
    {
        code: 'production',
        labelEn: 'Production',
        labelAr: 'الإنتاج',
        shortCode: 'PRD',
        permissions: [
            { code: 'production.view', labelEn: 'View', labelAr: 'عرض' },
            { code: 'production.create_order', labelEn: 'Create Order', labelAr: 'إنشاء أمر' },
            { code: 'production.start_order', labelEn: 'Start Order', labelAr: 'بدء أمر' },
            { code: 'production.complete_order', labelEn: 'Complete', labelAr: 'إكمال' },
            { code: 'production.record_output', labelEn: 'Record Output', labelAr: 'تسجيل إنتاج' },
            { code: 'production.record_downtime', labelEn: 'Downtime', labelAr: 'توقف' },
            { code: 'production.manage_lines', labelEn: 'Lines', labelAr: 'خطوط' },
            { code: 'production.manage_shifts', labelEn: 'Shifts', labelAr: 'ورديات' },
            { code: 'production.approve_batch', labelEn: 'Approve Batch', labelAr: 'اعتماد دفعة' },
            { code: 'production.release_batch', labelEn: 'Release Batch', labelAr: 'إفراج دفعة' },
        ]
    },
    // WAREHOUSE
    {
        code: 'warehouse',
        labelEn: 'Warehouse / Inventory',
        labelAr: 'المستودع',
        shortCode: 'WH',
        permissions: [
            { code: 'warehouse.view', labelEn: 'View', labelAr: 'عرض' },
            { code: 'warehouse.receive', labelEn: 'Receive', labelAr: 'استلام' },
            { code: 'warehouse.issue', labelEn: 'Issue', labelAr: 'صرف' },
            { code: 'warehouse.transfer', labelEn: 'Transfer', labelAr: 'نقل' },
            { code: 'warehouse.adjust', labelEn: 'Adjust', labelAr: 'تعديل' },
            { code: 'warehouse.hold', labelEn: 'Hold', labelAr: 'حجز' },
            { code: 'warehouse.release', labelEn: 'Release', labelAr: 'إفراج' },
            { code: 'warehouse.stocktake', labelEn: 'Stocktake', labelAr: 'جرد' },
            { code: 'warehouse.manage_locations', labelEn: 'Locations', labelAr: 'مواقع' },
        ]
    },
    // RECEIVING
    {
        code: 'receiving',
        labelEn: 'Receiving',
        labelAr: 'الاستلام',
        shortCode: 'RCV',
        permissions: [
            { code: 'receiving.view', labelEn: 'View', labelAr: 'عرض' },
            { code: 'receiving.create', labelEn: 'Create', labelAr: 'إنشاء' },
            { code: 'receiving.inspect', labelEn: 'Inspect', labelAr: 'فحص' },
            { code: 'receiving.approve', labelEn: 'Approve', labelAr: 'قبول' },
            { code: 'receiving.reject', labelEn: 'Reject', labelAr: 'رفض' },
            { code: 'receiving.hold', labelEn: 'Hold', labelAr: 'حجز' },
            { code: 'receiving.release', labelEn: 'Release', labelAr: 'إفراج' },
        ]
    },
    // MAINTENANCE
    {
        code: 'maintenance',
        labelEn: 'Maintenance',
        labelAr: 'الصيانة',
        shortCode: 'MNT',
        permissions: [
            { code: 'maintenance.view', labelEn: 'View', labelAr: 'عرض' },
            { code: 'maintenance.create_request', labelEn: 'Create Request', labelAr: 'طلب صيانة' },
            { code: 'maintenance.assign', labelEn: 'Assign', labelAr: 'تعيين' },
            { code: 'maintenance.start_work', labelEn: 'Start Work', labelAr: 'بدء عمل' },
            { code: 'maintenance.complete_work', labelEn: 'Complete', labelAr: 'إكمال' },
            { code: 'maintenance.approve', labelEn: 'Approve', labelAr: 'اعتماد' },
            { code: 'maintenance.manage_equipment', labelEn: 'Equipment', labelAr: 'معدات' },
            { code: 'maintenance.manage_schedule', labelEn: 'Schedule', labelAr: 'جدولة' },
            { code: 'maintenance.manage_parts', labelEn: 'Spare Parts', labelAr: 'قطع غيار' },
        ]
    },
    // PURCHASING
    {
        code: 'purchasing',
        labelEn: 'Purchasing',
        labelAr: 'المشتريات',
        shortCode: 'PUR',
        permissions: [
            { code: 'purchasing.view', labelEn: 'View', labelAr: 'عرض' },
            { code: 'purchasing.create_pr', labelEn: 'Create PR', labelAr: 'طلب شراء' },
            { code: 'purchasing.approve_pr', labelEn: 'Approve PR', labelAr: 'اعتماد طلب' },
            { code: 'purchasing.create_po', labelEn: 'Create PO', labelAr: 'أمر شراء' },
            { code: 'purchasing.approve_po', labelEn: 'Approve PO', labelAr: 'اعتماد أمر' },
            { code: 'purchasing.receive_po', labelEn: 'Receive PO', labelAr: 'استلام' },
            { code: 'purchasing.manage_suppliers', labelEn: 'Suppliers', labelAr: 'موردين' },
            { code: 'purchasing.evaluate_supplier', labelEn: 'Evaluate', labelAr: 'تقييم' },
        ]
    },
    // HR
    {
        code: 'hr',
        labelEn: 'Human Resources',
        labelAr: 'الموارد البشرية',
        shortCode: 'HR',
        permissions: [
            { code: 'hr.view', labelEn: 'View', labelAr: 'عرض' },
            { code: 'hr.view_employees', labelEn: 'View Employees', labelAr: 'عرض موظفين' },
            { code: 'hr.create_employee', labelEn: 'Create Employee', labelAr: 'إضافة موظف' },
            { code: 'hr.edit_employee', labelEn: 'Edit Employee', labelAr: 'تعديل موظف' },
            { code: 'hr.manage_attendance', labelEn: 'Attendance', labelAr: 'حضور' },
            { code: 'hr.manage_leave', labelEn: 'Leave', labelAr: 'إجازات' },
            { code: 'hr.manage_payroll', labelEn: 'Payroll', labelAr: 'رواتب' },
        ]
    },
    // TRAINING
    {
        code: 'training',
        labelEn: 'Training',
        labelAr: 'التدريب',
        shortCode: 'TRN',
        permissions: [
            { code: 'training.view', labelEn: 'View', labelAr: 'عرض' },
            { code: 'training.create_course', labelEn: 'Create Course', labelAr: 'إنشاء دورة' },
            { code: 'training.assign_training', labelEn: 'Assign', labelAr: 'تعيين' },
            { code: 'training.record_attendance', labelEn: 'Record', labelAr: 'تسجيل' },
            { code: 'training.approve_completion', labelEn: 'Approve', labelAr: 'اعتماد' },
            { code: 'training.manage_matrix', labelEn: 'Matrix', labelAr: 'مصفوفة' },
        ]
    },
    // CALIBRATION
    {
        code: 'calibration',
        labelEn: 'Calibration',
        labelAr: 'المعايرة',
        shortCode: 'CAL',
        permissions: [
            { code: 'calibration.view', labelEn: 'View', labelAr: 'عرض' },
            { code: 'calibration.view_equipment', labelEn: 'Equipment', labelAr: 'معدات' },
            { code: 'calibration.create_schedule', labelEn: 'Schedule', labelAr: 'جدولة' },
            { code: 'calibration.record_calibration', labelEn: 'Record', labelAr: 'تسجيل' },
            { code: 'calibration.approve_calibration', labelEn: 'Approve', labelAr: 'اعتماد' },
            { code: 'calibration.manage_standards', labelEn: 'Standards', labelAr: 'معايير' },
        ]
    },
    // FOOD SAFETY
    {
        code: 'food_safety',
        labelEn: 'Food Safety / HACCP',
        labelAr: 'سلامة الغذاء',
        shortCode: 'FS',
        permissions: [
            { code: 'food_safety.view', labelEn: 'View', labelAr: 'عرض' },
            { code: 'food_safety.manage_haccp', labelEn: 'HACCP', labelAr: 'هاسب' },
            { code: 'food_safety.record_monitoring', labelEn: 'Monitoring', labelAr: 'مراقبة' },
            { code: 'food_safety.manage_sanitation', labelEn: 'Sanitation', labelAr: 'صحة' },
            { code: 'food_safety.record_cleaning', labelEn: 'Cleaning', labelAr: 'تنظيف' },
            { code: 'food_safety.manage_allergens', labelEn: 'Allergens', labelAr: 'مسببات حساسية' },
            { code: 'food_safety.pre_op_check', labelEn: 'Pre-Op', labelAr: 'ما قبل التشغيل' },
            { code: 'food_safety.corrective_action', labelEn: 'CAPA', labelAr: 'إجراء تصحيحي' },
        ]
    },
    // FORMS
    {
        code: 'forms',
        labelEn: 'Forms & Records',
        labelAr: 'النماذج والسجلات',
        shortCode: 'FRM',
        permissions: [
            { code: 'forms.view_own', labelEn: 'View Own', labelAr: 'عرض خاص' },
            { code: 'forms.view_all', labelEn: 'View All', labelAr: 'عرض الكل' },
            { code: 'forms.fill_form', labelEn: 'Fill', labelAr: 'تعبئة' },
            { code: 'forms.create_template', labelEn: 'Create Tpl', labelAr: 'إنشاء قالب' },
            { code: 'forms.edit_template', labelEn: 'Edit Tpl', labelAr: 'تعديل قالب' },
            { code: 'forms.delete_template', labelEn: 'Delete Tpl', labelAr: 'حذف قالب' },
            { code: 'forms.approve', labelEn: 'Approve', labelAr: 'اعتماد' },
            { code: 'forms.export', labelEn: 'Export', labelAr: 'تصدير' },
        ]
    },
    // TASKS
    {
        code: 'tasks',
        labelEn: 'Tasks & Actions',
        labelAr: 'المهام',
        shortCode: 'TSK',
        permissions: [
            { code: 'tasks.view_own', labelEn: 'View Own', labelAr: 'عرض خاص' },
            { code: 'tasks.view_dept', labelEn: 'View Dept', labelAr: 'عرض قسم' },
            { code: 'tasks.view_all', labelEn: 'View All', labelAr: 'عرض الكل' },
            { code: 'tasks.create', labelEn: 'Create', labelAr: 'إنشاء' },
            { code: 'tasks.assign', labelEn: 'Assign', labelAr: 'تعيين' },
            { code: 'tasks.complete', labelEn: 'Complete', labelAr: 'إكمال' },
            { code: 'tasks.verify', labelEn: 'Verify', labelAr: 'تحقق' },
            { code: 'tasks.delete', labelEn: 'Delete', labelAr: 'حذف' },
        ]
    },
    // REPORTS
    {
        code: 'reports',
        labelEn: 'Reports & Analytics',
        labelAr: 'التقارير',
        shortCode: 'RPT',
        permissions: [
            { code: 'reports.view', labelEn: 'View', labelAr: 'عرض' },
            { code: 'reports.view_all', labelEn: 'View All', labelAr: 'عرض الكل' },
            { code: 'reports.export', labelEn: 'Export', labelAr: 'تصدير' },
            { code: 'reports.create_custom', labelEn: 'Custom', labelAr: 'تقرير خاص' },
            { code: 'reports.schedule', labelEn: 'Schedule', labelAr: 'جدولة' },
        ]
    },
    // MASTER DATA
    {
        code: 'master_data',
        labelEn: 'Master Data',
        labelAr: 'البيانات الرئيسية',
        shortCode: 'MD',
        permissions: [
            { code: 'master_data.view', labelEn: 'View', labelAr: 'عرض' },
            { code: 'master_data.manage_materials', labelEn: 'Materials', labelAr: 'مواد' },
            { code: 'master_data.manage_suppliers', labelEn: 'Suppliers', labelAr: 'موردين' },
            { code: 'master_data.approve_suppliers', labelEn: 'Approve Sup', labelAr: 'اعتماد م' },
            { code: 'master_data.manage_products', labelEn: 'Products', labelAr: 'منتجات' },
            { code: 'master_data.manage_customers', labelEn: 'Customers', labelAr: 'عملاء' },
        ]
    },
    // ADMINISTRATION
    {
        code: 'admin',
        labelEn: 'Administration',
        labelAr: 'الإدارة',
        shortCode: 'ADM',
        permissions: [
            { code: 'users.view', labelEn: 'View Users', labelAr: 'عرض مستخدمين' },
            { code: 'users.create', labelEn: 'Create Users', labelAr: 'إنشاء م' },
            { code: 'users.edit', labelEn: 'Edit Users', labelAr: 'تعديل م' },
            { code: 'users.delete', labelEn: 'Delete Users', labelAr: 'حذف م' },
            { code: 'users.assign_roles', labelEn: 'Assign Roles', labelAr: 'تعيين أدوار' },
            { code: 'settings.view', labelEn: 'View Settings', labelAr: 'عرض إعدادات' },
            { code: 'settings.manage_permissions', labelEn: 'Permissions', labelAr: 'صلاحيات' },
            { code: 'settings.manage_departments', labelEn: 'Departments', labelAr: 'أقسام' },
            { code: 'settings.backup', labelEn: 'Backup', labelAr: 'نسخ احتياطي' },
            { code: 'settings.integrations', labelEn: 'Integrations', labelAr: 'تكاملات' },
        ]
    }
];

// Role state for UI
export interface RoleState {
    id: string;
    name: string;
    nameAr?: string;
    code: string;
    color: string;
    priority: number;
    isLocked: boolean;
    minEditPriority: number;
    permissionCount: number;
}

// Audit log entry
export interface PermissionAuditEntry {
    id: string;
    changedBy: string;
    changedByEmail: string;
    targetRoleId: string;
    targetRoleName: string;
    permissionCode: string;
    action: 'grant' | 'revoke' | 'bulk_grant' | 'bulk_revoke';
    previousState: boolean;
    newState: boolean;
    changedAt: string;
    notes?: string;
}
