/**
 * Product Types
 * أنواع المنتجات وخطوط الإنتاج
 */

// Production Line - خط الإنتاج
export interface ProductionLine {
    id: string;
    company_id: string;
    name: string;
    name_en?: string;
    code: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Product - المنتج
export interface Product {
    id: string;
    company_id: string;
    production_line_id: string;
    sop_document_id?: string | null;
    name: string;
    name_en?: string;
    sku: string;  // كود المنتج
    barcode?: string;
    category: ProductCategory;
    unit: string;
    shelf_life_days?: number;
    storage_conditions?: string;
    allergens?: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type ProductCategory =
    | 'baked_goods'      // مخبوزات
    | 'dairy'            // ألبان
    | 'beverages'        // مشروبات
    | 'snacks'           // وجبات خفيفة
    | 'frozen'           // مجمدات
    | 'canned'           // معلبات
    | 'confectionery'    // حلويات
    | 'meat'             // لحوم
    | 'poultry'          // دواجن
    | 'seafood'          // مأكولات بحرية
    | 'grains'           // حبوب
    | 'oils'             // زيوت
    | 'sauces'           // صلصات
    | 'other';           // أخرى

export const PRODUCT_CATEGORIES: Record<ProductCategory, { ar: string; en: string }> = {
    baked_goods: { ar: 'مخبوزات', en: 'Baked Goods' },
    dairy: { ar: 'ألبان ومنتجاتها', en: 'Dairy Products' },
    beverages: { ar: 'مشروبات', en: 'Beverages' },
    snacks: { ar: 'وجبات خفيفة', en: 'Snacks' },
    frozen: { ar: 'مجمدات', en: 'Frozen Products' },
    canned: { ar: 'معلبات', en: 'Canned Products' },
    confectionery: { ar: 'حلويات', en: 'Confectionery' },
    meat: { ar: 'لحوم', en: 'Meat Products' },
    poultry: { ar: 'دواجن', en: 'Poultry' },
    seafood: { ar: 'مأكولات بحرية', en: 'Seafood' },
    grains: { ar: 'حبوب', en: 'Grains' },
    oils: { ar: 'زيوت', en: 'Oils' },
    sauces: { ar: 'صلصات وتوابل', en: 'Sauces & Condiments' },
    other: { ar: 'أخرى', en: 'Other' }
};

export const COMMON_ALLERGENS = [
    'جلوتين (قمح)',
    'حليب ومشتقاته',
    'بيض',
    'فول سوداني',
    'مكسرات',
    'صويا',
    'سمك',
    'قشريات',
    'سمسم',
    'كبريتيت',
    'كرفس',
    'خردل',
    'ترمس'
];
