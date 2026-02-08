/**
 * Recipe Types
 * أنواع الوصفات ومكوناتها
 */

// صلاحيات الوصفة
export interface RecipePermissions {
    view_roles: string[];   // الأدوار المسموح لها بالعرض
    edit_roles: string[];   // الأدوار المسموح لها بالتعديل
}

// مكون الوصفة (المادة الخام)
export interface RecipeIngredient {
    id: string;
    material_id?: string;        // ربط مع المادة الخام
    ingredient_name: string;     // اسم المكون
    quantity: number;            // الكمية
    unit: string;               // الوحدة
    percentage?: number;         // النسبة المئوية
    allergens?: string[];        // المسببات للحساسية
    notes?: string;              // ملاحظات المكون
}

// خطوة الخلط
export interface MixingStep {
    step_number: number;         // رقم الخطوة
    title: string;               // عنوان الخطوة
    description: string;         // وصف الخطوة
    duration?: string;           // المدة الزمنية
    temperature?: string;        // درجة الحرارة
    equipment?: string;          // المعدات المستخدمة
    notes?: string;              // ملاحظات
}

// الوصفة
export interface Recipe {
    id: string;
    product_id: string;          // معرف المنتج
    name: string;                // اسم الوصفة
    name_en?: string;            // الاسم بالإنجليزية
    version: number;             // رقم الإصدار
    is_active: boolean;          // هل الوصفة نشطة
    is_default: boolean;         // هل هي الوصفة الافتراضية
    ingredients: RecipeIngredient[];  // قائمة المكونات
    mixing_steps?: MixingStep[];      // خطوات الخلط
    notes?: string;              // ملاحظات الوصفة
    permissions: RecipePermissions;   // صلاحيات الوصول
    created_at: string;
    updated_at: string;
    created_by: string;
}

// نموذج إنشاء وصفة جديدة
export interface CreateRecipeInput {
    product_id: string;
    name: string;
    name_en?: string;
    version?: number;
    is_default?: boolean;
    ingredients?: RecipeIngredient[];
    mixing_steps?: MixingStep[];
    notes?: string;
    permissions?: RecipePermissions;
}

// نموذج تحديث الوصفة
export interface UpdateRecipeInput {
    name?: string;
    name_en?: string;
    version?: number;
    is_active?: boolean;
    is_default?: boolean;
    ingredients?: RecipeIngredient[];
    mixing_steps?: MixingStep[];
    notes?: string;
    permissions?: RecipePermissions;
}

// الصلاحيات الافتراضية
export const DEFAULT_RECIPE_PERMISSIONS: RecipePermissions = {
    view_roles: ['admin', 'manager', 'user'],
    edit_roles: ['admin', 'manager']
};

// الوحدات الشائعة للمكونات
export const COMMON_UNITS = [
    { value: 'kg', label: 'كيلوجرام' },
    { value: 'g', label: 'جرام' },
    { value: 'mg', label: 'ملليجرام' },
    { value: 'l', label: 'لتر' },
    { value: 'ml', label: 'ملليلتر' },
    { value: 'piece', label: 'قطعة' },
    { value: 'pack', label: 'عبوة' },
    { value: 'cup', label: 'كوب' },
    { value: 'tbsp', label: 'ملعقة كبيرة' },
    { value: 'tsp', label: 'ملعقة صغيرة' },
];

// =====================================================
// أنواع سجل الإصدارات
// =====================================================

// نوع التغيير
export type RecipeChangeType = 'created' | 'updated' | 'ingredients_changed' | 'steps_changed' | 'restored';

// حالة الموافقة
export type RecipeApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected';

// إصدار الوصفة
export interface RecipeVersion {
    id: string;
    recipe_id: string;
    version_number: number;

    // بيانات الإصدار
    name: string;
    name_en?: string;
    ingredients: RecipeIngredient[];
    mixing_steps?: MixingStep[];
    notes?: string;

    // معلومات التغيير
    change_type: RecipeChangeType;
    change_summary?: string;
    change_details?: Record<string, any>;

    // فترة السريان
    effective_from: string;
    effective_until?: string;
    duration_days?: number;

    // المستخدم
    created_by?: string;
    created_by_name?: string;
    created_at: string;

    // حالة
    status?: 'نشط' | 'منتهي';
}

// سجل التغييرات
export interface RecipeChangeLog {
    id: string;
    recipe_id: string;
    version_id?: string;

    action: 'create' | 'update' | 'delete' | 'restore' | 'approve' | 'reject';
    field_changed?: string;
    old_value?: any;
    new_value?: any;

    changed_by?: string;
    changed_by_name?: string;
    changed_at: string;

    reason?: string;
}

// ملخص إصدارات الوصفة
export interface RecipeVersionSummary {
    total_versions: number;
    current_version: number;
    first_created: string;
    last_updated: string;
    total_duration_days: number;
    versions: RecipeVersion[];
}

// مقارنة بين إصدارين
export interface RecipeVersionDiff {
    version_a: RecipeVersion;
    version_b: RecipeVersion;
    changes: {
        field: string;
        label: string;
        old_value: any;
        new_value: any;
        type: 'added' | 'removed' | 'changed';
    }[];
}

