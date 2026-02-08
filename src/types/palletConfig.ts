/**
 * Pallet Configuration Types
 * Per-product pallet stacking configuration with dimensions and visual patterns
 */

// =====================================================
// Stacking Pattern Types
// =====================================================

export type StackingPattern = 'brick' | 'column' | 'pinwheel';

export type LayerOrientation = 'horizontal' | 'vertical';

// =====================================================
// Layer Pattern (Single Layer Configuration)
// =====================================================

export interface LayerPattern {
    layer_index: number;
    orientation: LayerOrientation;
    // Grid representation: each cell is 0 (normal) or 1 (rotated 90°)
    grid: number[][];
}

// =====================================================
// Product Pallet Configuration
// =====================================================

export interface ProductPalletConfig {
    id: string;
    product_id: string;
    company_id: string;

    // أبعاد الكرتونة (سم)
    carton_width_cm: number;
    carton_depth_cm: number;
    carton_height_cm: number;

    // أبعاد البالتة (سم)
    pallet_width_cm: number;
    pallet_depth_cm: number;
    pallet_max_height_cm: number;

    // إعدادات الرص
    cartons_per_layer: number;
    number_of_layers: number;
    total_cartons_per_pallet: number; // Computed field

    // نمط الرص الأساسي
    base_pattern: StackingPattern;

    // تبديل تلقائي بين الطبقات
    alternate_layers: boolean;

    // نمط كل طبقة
    layer_patterns: LayerPattern[];

    // متغير مدة الصلاحية من SOP
    shelf_life_variable_id?: string | null;

    // ملاحظات
    notes?: string;

    // Metadata
    created_at: string;
    updated_at: string;
    created_by?: string;
    updated_by?: string;
}

// Extended type with product info
export interface ProductPalletConfigWithProduct extends ProductPalletConfig {
    product?: {
        id: string;
        name: string;
        sku: string;
        sop_document_id?: string | null;
    };
}

// =====================================================
// Form Input Types
// =====================================================

export interface ProductPalletConfigInput {
    carton_width_cm: number;
    carton_depth_cm: number;
    carton_height_cm: number;
    pallet_width_cm: number;
    pallet_depth_cm: number;
    pallet_max_height_cm: number;
    cartons_per_layer: number;
    number_of_layers: number;
    base_pattern: StackingPattern;
    alternate_layers: boolean;
    layer_patterns: LayerPattern[];
    shelf_life_variable_id?: string | null;
    notes?: string;
}

// =====================================================
// Company-wide Pallet Settings (Simplified)
// =====================================================

export interface PalletCompanySettings {
    id: string;
    company_id: string;

    // Loading settings
    allow_multiple_batches_per_pallet: boolean;
    default_loading_strategy: string;
    allow_partial_pallet_loading: boolean;
    require_inspection_before_loading: boolean;

    // Print settings
    auto_print_on_creation: boolean;
    default_copies: number;
    label_template: 'default' | 'compact' | 'detailed';
    show_preview_dialog: boolean;

    // Default fallback
    default_cartons_per_pallet: number;

    // Metadata
    updated_at: string;
    updated_by?: string;
}

// =====================================================
// Constants and Labels
// =====================================================

export const STACKING_PATTERNS: Record<StackingPattern, {
    ar: string;
    en: string;
    description: string;
}> = {
    brick: {
        ar: 'نمط الطوب',
        en: 'Brick Pattern',
        description: 'كراتين متداخلة مثل الطوب لزيادة الثبات'
    },
    column: {
        ar: 'نمط العمود',
        en: 'Column Pattern',
        description: 'كراتين متراصة فوق بعضها مباشرة'
    },
    pinwheel: {
        ar: 'نمط الدولاب',
        en: 'Pinwheel Pattern',
        description: 'تناوب الاتجاهات لأقصى ثبات'
    }
};

export const LAYER_ORIENTATIONS: Record<LayerOrientation, {
    ar: string;
    en: string;
}> = {
    horizontal: {
        ar: 'أفقي',
        en: 'Horizontal'
    },
    vertical: {
        ar: 'عمودي (مدور 90°)',
        en: 'Vertical (Rotated 90°)'
    }
};

// =====================================================
// Default Values
// =====================================================

export const DEFAULT_PALLET_DIMENSIONS = {
    width_cm: 120,  // Euro pallet standard
    depth_cm: 100,  // Euro pallet standard
    max_height_cm: 180
};

export const DEFAULT_CARTON_DIMENSIONS = {
    width_cm: 40,
    depth_cm: 30,
    height_cm: 25
};

// =====================================================
// Limits (Validation Bounds)
// =====================================================

export const CONFIG_LIMITS = {
    carton: { min: 5, max: 200 },
    pallet: { min: 60, max: 200 },
    palletHeight: { min: 60, max: 300 },
    cartonsPerLayer: { min: 1, max: 200 },
    numberOfLayers: { min: 1, max: 50 },
};

export const DEFAULT_CONFIG: ProductPalletConfigInput = {
    carton_width_cm: DEFAULT_CARTON_DIMENSIONS.width_cm,
    carton_depth_cm: DEFAULT_CARTON_DIMENSIONS.depth_cm,
    carton_height_cm: DEFAULT_CARTON_DIMENSIONS.height_cm,
    pallet_width_cm: DEFAULT_PALLET_DIMENSIONS.width_cm,
    pallet_depth_cm: DEFAULT_PALLET_DIMENSIONS.depth_cm,
    pallet_max_height_cm: DEFAULT_PALLET_DIMENSIONS.max_height_cm,
    cartons_per_layer: 8,
    number_of_layers: 6,
    base_pattern: 'brick',
    alternate_layers: true,
    layer_patterns: []
};

// =====================================================
// Packing Helpers (Geometry-Accurate)
// =====================================================

export interface LayerPlanRow {
    rowIndex: number;
    rowRotated: boolean;
    rowWidth: number;
    rowDepth: number;
    rowOffset: number;
    maxCols: number;
}

export interface LayerPlanResult {
    rows: LayerPlanRow[];
    totalDepthUsed: number;
    maxCapacity: number;
    baseRotated: boolean;
}

export function computeLayerPlan(params: {
    palletWidth: number;
    palletDepth: number;
    cartonWidth: number;
    cartonDepth: number;
    basePattern: StackingPattern;
    alternateLayers: boolean;
    layerIndex: number;
    layerPattern?: LayerPattern;
}): LayerPlanResult {
    const {
        palletWidth,
        palletDepth,
        cartonWidth,
        cartonDepth,
        basePattern,
        alternateLayers,
        layerIndex,
        layerPattern
    } = params;

    const rows: LayerPlanRow[] = [];
    let totalDepthUsed = 0;
    let maxCapacity = 0;

    const baseRotated = layerPattern
        ? layerPattern.orientation === 'vertical'
        : alternateLayers && layerIndex % 2 === 1;

    if (palletWidth <= 0 || palletDepth <= 0 || cartonWidth <= 0 || cartonDepth <= 0) {
        return { rows, totalDepthUsed, maxCapacity, baseRotated };
    }

    const getRowRotated = (rowIndex: number, base: boolean) => {
        if (basePattern === 'pinwheel') {
            return rowIndex % 2 === 1 ? !base : base;
        }
        return base;
    };

    const getRowOffset = (rowIndex: number, rowWidth: number) => {
        if (basePattern === 'brick' && rowIndex % 2 === 1) {
            return rowWidth / 2;
        }
        return 0;
    };

    let rowIndex = 0;
    while (true) {
        const rowRotated = getRowRotated(rowIndex, baseRotated);
        const rowWidth = rowRotated ? cartonDepth : cartonWidth;
        const rowDepth = rowRotated ? cartonWidth : cartonDepth;

        if (rowWidth <= 0 || rowDepth <= 0) break;
        if (totalDepthUsed + rowDepth > palletDepth + 0.0001) break;

        const rowOffset = getRowOffset(rowIndex, rowWidth);
        const availableWidth = palletWidth - rowOffset;
        const maxCols = Math.floor(availableWidth / rowWidth);
        if (maxCols <= 0) break;

        rows.push({
            rowIndex,
            rowRotated,
            rowWidth,
            rowDepth,
            rowOffset,
            maxCols
        });

        totalDepthUsed += rowDepth;
        maxCapacity += maxCols;
        rowIndex += 1;
    }

    return {
        rows,
        totalDepthUsed,
        maxCapacity,
        baseRotated
    };
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Generate default layer patterns based on configuration
 */
export function generateLayerPatterns(
    cartonsPerLayer: number,
    numberOfLayers: number,
    basePattern: StackingPattern,
    alternate: boolean
): LayerPattern[] {
    const patterns: LayerPattern[] = [];

    for (let i = 0; i < numberOfLayers; i++) {
        const isAlternate = alternate && i % 2 === 1;
        const orientation: LayerOrientation = isAlternate ? 'vertical' : 'horizontal';

        // Generate a simple grid for visualization
        // Each layer has rows and columns of cartons
        const cols = Math.ceil(Math.sqrt(cartonsPerLayer));
        const rows = Math.ceil(cartonsPerLayer / cols);

        const grid: number[][] = [];
        let cartonCount = 0;

        for (let r = 0; r < rows; r++) {
            const row: number[] = [];
            for (let c = 0; c < cols && cartonCount < cartonsPerLayer; c++) {
                // For brick pattern, offset every other row
                if (basePattern === 'brick' && r % 2 === 1) {
                    row.push(isAlternate ? 0 : 1);
                } else if (basePattern === 'pinwheel') {
                    row.push((r + c) % 2);
                } else {
                    row.push(isAlternate ? 1 : 0);
                }
                cartonCount++;
            }
            if (row.length > 0) grid.push(row);
        }

        patterns.push({
            layer_index: i,
            orientation,
            grid
        });
    }

    return patterns;
}

/**
 * Calculate total cartons from layer configuration
 */
export function calculateTotalCartons(
    cartonsPerLayer: number,
    numberOfLayers: number
): number {
    return cartonsPerLayer * numberOfLayers;
}

/**
 * Validate configuration dimensions
 */
export function validateConfig(config: ProductPalletConfigInput): string[] {
    const errors: string[] = [];

    const inRange = (value: number, min: number, max: number) =>
        Number.isFinite(value) && value >= min && value <= max;

    if (!inRange(config.carton_width_cm, CONFIG_LIMITS.carton.min, CONFIG_LIMITS.carton.max)) {
        errors.push(`عرض الكرتونة يجب أن يكون بين ${CONFIG_LIMITS.carton.min} و ${CONFIG_LIMITS.carton.max} سم`);
    }
    if (!inRange(config.carton_depth_cm, CONFIG_LIMITS.carton.min, CONFIG_LIMITS.carton.max)) {
        errors.push(`عمق الكرتونة يجب أن يكون بين ${CONFIG_LIMITS.carton.min} و ${CONFIG_LIMITS.carton.max} سم`);
    }
    if (!inRange(config.carton_height_cm, CONFIG_LIMITS.carton.min, CONFIG_LIMITS.carton.max)) {
        errors.push(`ارتفاع الكرتونة يجب أن يكون بين ${CONFIG_LIMITS.carton.min} و ${CONFIG_LIMITS.carton.max} سم`);
    }

    if (!inRange(config.pallet_width_cm, CONFIG_LIMITS.pallet.min, CONFIG_LIMITS.pallet.max)) {
        errors.push(`عرض البالتة يجب أن يكون بين ${CONFIG_LIMITS.pallet.min} و ${CONFIG_LIMITS.pallet.max} سم`);
    }
    if (!inRange(config.pallet_depth_cm, CONFIG_LIMITS.pallet.min, CONFIG_LIMITS.pallet.max)) {
        errors.push(`عمق البالتة يجب أن يكون بين ${CONFIG_LIMITS.pallet.min} و ${CONFIG_LIMITS.pallet.max} سم`);
    }
    if (!inRange(config.pallet_max_height_cm, CONFIG_LIMITS.palletHeight.min, CONFIG_LIMITS.palletHeight.max)) {
        errors.push(`أقصى ارتفاع للبالتة يجب أن يكون بين ${CONFIG_LIMITS.palletHeight.min} و ${CONFIG_LIMITS.palletHeight.max} سم`);
    }

    if (!inRange(config.cartons_per_layer, CONFIG_LIMITS.cartonsPerLayer.min, CONFIG_LIMITS.cartonsPerLayer.max)) {
        errors.push(`عدد الكراتين في الطبقة يجب أن يكون بين ${CONFIG_LIMITS.cartonsPerLayer.min} و ${CONFIG_LIMITS.cartonsPerLayer.max}`);
    }
    if (!inRange(config.number_of_layers, CONFIG_LIMITS.numberOfLayers.min, CONFIG_LIMITS.numberOfLayers.max)) {
        errors.push(`عدد الطبقات يجب أن يكون بين ${CONFIG_LIMITS.numberOfLayers.min} و ${CONFIG_LIMITS.numberOfLayers.max}`);
    }

    // Check if total height exceeds max
    const totalHeight = config.carton_height_cm * config.number_of_layers;
    if (totalHeight > config.pallet_max_height_cm) {
        errors.push(`الارتفاع الإجمالي (${totalHeight} سم) يتجاوز الحد الأقصى (${config.pallet_max_height_cm} سم)`);
    }

    // Logical fit checks
    const hasPositiveDims =
        config.carton_width_cm > 0 &&
        config.carton_depth_cm > 0 &&
        config.pallet_width_cm > 0 &&
        config.pallet_depth_cm > 0;

    if (hasPositiveDims) {
        const fitsNormal =
            config.carton_width_cm <= config.pallet_width_cm &&
            config.carton_depth_cm <= config.pallet_depth_cm;
        const fitsRotated =
            config.carton_width_cm <= config.pallet_depth_cm &&
            config.carton_depth_cm <= config.pallet_width_cm;

        if (!fitsNormal && !fitsRotated) {
            errors.push('أبعاد الكرتونة أكبر من مساحة البالتة ولا يمكن رصها بأي اتجاه');
        }
        if (config.number_of_layers > 0) {
            let minCapacity = Number.POSITIVE_INFINITY;
            for (let i = 0; i < config.number_of_layers; i++) {
                const pattern = config.layer_patterns?.find((p) => p.layer_index === i);
                const plan = computeLayerPlan({
                    palletWidth: config.pallet_width_cm,
                    palletDepth: config.pallet_depth_cm,
                    cartonWidth: config.carton_width_cm,
                    cartonDepth: config.carton_depth_cm,
                    basePattern: config.base_pattern,
                    alternateLayers: config.alternate_layers,
                    layerIndex: i,
                    layerPattern: pattern
                });
                minCapacity = Math.min(minCapacity, plan.maxCapacity);
            }

            if (!Number.isFinite(minCapacity) || minCapacity === 0) {
                errors.push('لا توجد مساحة كافية لوضع أي كرتونة على البالتة بالأبعاد الحالية');
            } else if (config.cartons_per_layer > minCapacity) {
                errors.push(`عدد الكراتين في الطبقة أكبر من المساحة المتاحة (الحد الأقصى: ${minCapacity})`);
            }
        }
    }

    if (config.carton_height_cm > 0 && config.pallet_max_height_cm > 0) {
        const maxLayers = Math.floor(config.pallet_max_height_cm / config.carton_height_cm);
        if (maxLayers > 0 && config.number_of_layers > maxLayers) {
            errors.push(`عدد الطبقات يتجاوز الحد المسموح حسب الارتفاع (الحد الأقصى: ${maxLayers})`);
        }
    }

    return errors;
}
