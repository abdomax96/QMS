/**
 * Recipe Traceability Table Component
 * جدول تتبع الخامات والوصفات
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Table, FormTemplate } from '../../types';
import type { Recipe, RecipeIngredient } from '../../types/recipe';
import { getRecipesByProduct } from '../../services/recipeService';
import { getMaterialBatches, type MaterialBatch } from '../../services/labService';
import { cn } from '../../utils';
import { TableSkeleton } from '../common/LoadingStates';
import { formatMaterialDateForDisplay } from '../../utils/materialReceivingDate';
import { convertQuantity } from '../../utils/unitConversion';

interface RecipeTraceabilityTableProps {
    table: Table;
    tableData: any[][];
    onChange: (tableId: string, data: any[][]) => void;
    template: FormTemplate;
}

interface SelectedBatch {
    batchNumber: string;
    materialId?: string;
    lotNumber?: string;
    supplierName?: string;
    productionDate?: string;
    expiryDate?: string;
    productionDateFormat?: 'dmy' | 'my';
    expiryDateFormat?: 'dmy' | 'my';
    receivingId: string;
    quantity?: number;
    unit?: string;
    remainingQuantity?: number;
    usedQuantity?: number;
    usedUnit?: string;
    manualUsedQuantity?: boolean;
}

interface RecipeMetaRow extends Record<string, unknown> {
    __recipe_meta__: true;
    selected_recipe_id?: string | null;
    recipe_rows_by_id?: Record<string, any[][]>;
    dough_count_by_recipe?: Record<string, number>;
    link_repeated_batches_by_recipe?: Record<string, boolean>;
    recipes?: Array<Record<string, unknown>>;
}

type RecipeColumnKey =
    | 'ingredient'
    | 'quantity'
    | 'unit'
    | 'batch'
    | 'usedQuantity'
    | 'productionDate'
    | 'expiryDate'
    | 'actions';

const INGREDIENT_NAME_INDEX = 0;
const INGREDIENT_QUANTITY_INDEX = 1;
const INGREDIENT_UNIT_INDEX = 2;
const BATCHES_INDEX = 3;
const DOUGH_COUNT_INDEX = 4;
const MATERIAL_ID_INDEX = 5;
const DEFAULT_DOUGH_COUNT = 1;
const BATCH_EPSILON = 0.000001;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const getIngredientMaterialId = (
    ingredient?: RecipeIngredient | Record<string, unknown> | null,
    fallback?: unknown
): string | null => {
    const source = ingredient as Record<string, unknown> | undefined | null;
    const value =
        source?.material_id ??
        source?.materialId ??
        source?.raw_material_id ??
        source?.rawMaterialId ??
        fallback;

    return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const getIngredientName = (
    ingredient?: RecipeIngredient | Record<string, unknown> | null,
    fallback?: unknown
): string => {
    const source = ingredient as Record<string, unknown> | undefined | null;
    return String(source?.ingredient_name ?? source?.name ?? fallback ?? '');
};

const normalizeIngredientKey = (value: unknown): string =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_ARABIC_INDIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

const normalizeNumericInput = (value: string): string =>
    value
        .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
        .replace(/[۰-۹]/g, (digit) => String(EASTERN_ARABIC_INDIC_DIGITS.indexOf(digit)))
        .replace(/[٫,]/g, '.')
        .replace(/٬/g, '')
        .replace(/\s+/g, '');

const parseLocalizedNumber = (value: string, allowTrailingDecimal: boolean): number | null => {
    const normalized = normalizeNumericInput(value.trim());
    if (!normalized) return null;
    if (!/^[+-]?\d*(\.\d*)?$/.test(normalized)) return null;
    if (
        normalized === '+' ||
        normalized === '-' ||
        normalized === '.' ||
        normalized === '+.' ||
        normalized === '-.'
    ) {
        return null;
    }
    if (!allowTrailingDecimal && normalized.endsWith('.')) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        return parseLocalizedNumber(value, true);
    }
    return null;
};

const toPositiveNumber = (value: unknown): number | null => {
    const parsed = toNumber(value);
    if (parsed === null) return null;
    return parsed > 0 ? parsed : null;
};

const roundQuantity = (value: number): number => Number(value.toFixed(6));

const formatNumber = (value: number): string => {
    if (!Number.isFinite(value)) return '-';
    return Number(value.toFixed(3)).toLocaleString('ar-EG');
};

const normalizeUnitText = (unit?: string | null): string => String(unit || '').trim();

const getUnitDisplayLabel = (unit?: string | null): string => {
    const normalized = normalizeUnitText(unit);
    if (!normalized) return '-';

    const map: Record<string, string> = {
        kg: 'كجم',
        g: 'جم',
        mg: 'مجم',
        l: 'لتر',
        ml: 'مل',
    };

    return map[normalized.toLowerCase()] || normalized;
};

const getSafeDoughCount = (row: any[] | undefined): number => {
    const parsed = toPositiveNumber(row?.[DOUGH_COUNT_INDEX]);
    return parsed ?? DEFAULT_DOUGH_COUNT;
};

const createEmptyBatch = (): SelectedBatch => ({
    batchNumber: '',
    materialId: undefined,
    productionDate: undefined,
    expiryDate: undefined,
    receivingId: '',
    quantity: undefined,
    unit: undefined,
    remainingQuantity: undefined,
    usedQuantity: undefined,
    usedUnit: undefined,
    manualUsedQuantity: false,
});

const normalizeStoredBatch = (value: unknown): SelectedBatch => {
    if (!value || typeof value !== 'object') {
        return createEmptyBatch();
    }

    const item = value as Record<string, unknown>;
    return {
        batchNumber: String(item.batchNumber || item.batch_number || ''),
        materialId:
            typeof item.materialId === 'string'
                ? item.materialId
                : typeof item.rawMaterialId === 'string'
                    ? item.rawMaterialId
                    : typeof item.raw_material_id === 'string'
                        ? item.raw_material_id
                        : undefined,
        lotNumber: typeof item.lotNumber === 'string' ? item.lotNumber : typeof item.lot_number === 'string' ? item.lot_number : undefined,
        supplierName: typeof item.supplierName === 'string' ? item.supplierName : undefined,
        productionDate: typeof item.productionDate === 'string' ? item.productionDate : typeof item.production_date === 'string' ? item.production_date : undefined,
        expiryDate: typeof item.expiryDate === 'string' ? item.expiryDate : typeof item.expiry_date === 'string' ? item.expiry_date : undefined,
        productionDateFormat: (item.productionDateFormat || item.production_date_format || 'dmy') as 'dmy' | 'my',
        expiryDateFormat: (item.expiryDateFormat || item.expiry_date_format || 'dmy') as 'dmy' | 'my',
        receivingId: String(item.receivingId || item.receiving_id || ''),
        quantity: toPositiveNumber(item.quantity) ?? undefined,
        unit: typeof item.unit === 'string' ? item.unit : undefined,
        remainingQuantity: toPositiveNumber(item.remainingQuantity ?? item.remaining_quantity) ?? undefined,
        usedQuantity: toPositiveNumber(item.usedQuantity ?? item.used_quantity) ?? undefined,
        usedUnit: typeof item.usedUnit === 'string' ? item.usedUnit : typeof item.used_unit === 'string' ? item.used_unit : undefined,
        manualUsedQuantity: Boolean(item.manualUsedQuantity ?? item.manual_used_quantity),
    };
};

const ensureBatchArray = (value: unknown): SelectedBatch[] => {
    if (!Array.isArray(value)) return [];
    return value.map(normalizeStoredBatch);
};

const normalizeRecipeRows = (value: unknown): any[][] => {
    if (!Array.isArray(value)) return [];
    return value
        .filter((row) => Array.isArray(row))
        .map((row) => {
            const nextRow = [...row];
            nextRow[BATCHES_INDEX] = ensureBatchArray(row[BATCHES_INDEX]);
            return nextRow;
        });
};

const normalizeRecipeRowsMap = (value: unknown): Record<string, any[][]> => {
    if (!isRecord(value)) return {};

    return Object.entries(value).reduce<Record<string, any[][]>>((acc, [recipeId, rows]) => {
        if (!recipeId || !recipeId.trim()) return acc;
        acc[recipeId] = normalizeRecipeRows(rows);
        return acc;
    }, {});
};

const normalizePositiveNumberMap = (value: unknown): Record<string, number> => {
    if (!isRecord(value)) return {};

    return Object.entries(value).reduce<Record<string, number>>((acc, [key, rawValue]) => {
        if (!key || !key.trim()) return acc;
        const parsed = toPositiveNumber(rawValue);
        if (parsed !== null) {
            acc[key] = parsed;
        }
        return acc;
    }, {});
};

const normalizeBooleanMap = (value: unknown): Record<string, boolean> => {
    if (!isRecord(value)) return {};

    return Object.entries(value).reduce<Record<string, boolean>>((acc, [key, rawValue]) => {
        if (!key || !key.trim()) return acc;
        acc[key] = Boolean(rawValue);
        return acc;
    }, {});
};

const extractRecipeMetaRow = (value: unknown): RecipeMetaRow | null => {
    if (!Array.isArray(value) || value.length === 0) return null;
    const lastRow = value[value.length - 1];
    if (!isRecord(lastRow) || lastRow.__recipe_meta__ !== true) return null;
    return lastRow as RecipeMetaRow;
};

const toLinkedBatchTemplate = (batch: SelectedBatch, materialId: string): SelectedBatch => ({
    ...batch,
    materialId,
    usedQuantity: undefined,
    manualUsedQuantity: false,
});

const sanitizeBatchesForMaterial = (batches: SelectedBatch[], materialId: string | null): SelectedBatch[] =>
    batches.map((batch) => {
        if (!batch.receivingId) return batch;
        if (!materialId) return createEmptyBatch();
        if (batch.materialId && batch.materialId !== materialId) return createEmptyBatch();
        return batch;
    });

const isExpiryNear = (expiryDate?: string, warningDays = 30): boolean => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= warningDays && diffDays >= 0;
};

const isExpired = (expiryDate?: string): boolean => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
};

const RecipeTraceabilityTable: React.FC<RecipeTraceabilityTableProps> = ({
    table,
    tableData,
    onChange,
    template,
}) => {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [availableBatches, setAvailableBatches] = useState<Record<string, MaterialBatch[]>>({});
    const [loadingBatches, setLoadingBatches] = useState<Record<string, boolean>>({});
    const [usedQuantityDrafts, setUsedQuantityDrafts] = useState<Record<string, string>>({});
    const [doughCountByRecipe, setDoughCountByRecipe] = useState<Record<string, number>>({});
    const [linkRepeatedBatchesByRecipe, setLinkRepeatedBatchesByRecipe] = useState<Record<string, boolean>>({});
    const [linkedBatchesByMaterial, setLinkedBatchesByMaterial] = useState<Record<string, SelectedBatch[]>>({});

    const loadedMaterialIdsRef = useRef<Set<string>>(new Set());
    const loadingMaterialIdsRef = useRef<Set<string>>(new Set());
    const lastRecipeSyncRef = useRef<string>('');

    const productId = template?.basic_info?.product_id;
    const companyId = template?.basic_info?.company_id;
    const showMixingSteps = table.features?.show_mixing_steps !== false;
    const allowMultipleBatches = table.features?.allow_multiple_batches !== false;
    const showExpiryWarning = table.features?.show_expiry_warning !== false;
    const expiryWarningDays = table.expiry_warning_days || 30;
    const unlinkedIngredientHint = 'الخامة غير مربوطة بمادة خام';

    const rawTableData = useMemo<any[]>(
        () => (Array.isArray(tableData) ? (tableData as any[]) : []),
        [tableData]
    );
    const recipeMetaRow = useMemo(() => extractRecipeMetaRow(rawTableData), [rawTableData]);
    const dataRows = useMemo(
        () => normalizeRecipeRows(recipeMetaRow ? rawTableData.slice(0, -1) : rawTableData),
        [rawTableData, recipeMetaRow]
    );
    const persistedRecipeRowsById = useMemo(() => {
        const candidates = [
            recipeMetaRow?.recipe_rows_by_id,
            (recipeMetaRow as Record<string, unknown> | null)?.recipeRowsById,
            (recipeMetaRow as Record<string, unknown> | null)?.rows_by_recipe,
        ];
        const source = candidates.find((candidate) => isRecord(candidate));
        return normalizeRecipeRowsMap(source);
    }, [recipeMetaRow]);
    const persistedDoughCountByRecipe = useMemo(() => {
        const candidates = [
            recipeMetaRow?.dough_count_by_recipe,
            (recipeMetaRow as Record<string, unknown> | null)?.doughCountByRecipe,
        ];
        const source = candidates.find((candidate) => isRecord(candidate));
        return normalizePositiveNumberMap(source);
    }, [recipeMetaRow]);
    const persistedLinkRepeatedBatchesByRecipe = useMemo(() => {
        const candidates = [
            recipeMetaRow?.link_repeated_batches_by_recipe,
            (recipeMetaRow as Record<string, unknown> | null)?.linkRepeatedBatchesByRecipe,
        ];
        const source = candidates.find((candidate) => isRecord(candidate));
        return normalizeBooleanMap(source);
    }, [recipeMetaRow]);
    const persistedSelectedRecipeId = useMemo(() => {
        const candidates = [
            recipeMetaRow?.selected_recipe_id,
            (recipeMetaRow as Record<string, unknown> | null)?.selectedRecipeId,
        ];
        const selected = candidates.find((candidate) => typeof candidate === 'string');
        return typeof selected === 'string' && selected.trim() ? selected.trim() : '';
    }, [recipeMetaRow]);

    const effectiveDoughCountByRecipe = useMemo(
        () => ({ ...persistedDoughCountByRecipe, ...doughCountByRecipe }),
        [persistedDoughCountByRecipe, doughCountByRecipe]
    );
    const effectiveLinkRepeatedBatchesByRecipe = useMemo(
        () => ({ ...persistedLinkRepeatedBatchesByRecipe, ...linkRepeatedBatchesByRecipe }),
        [persistedLinkRepeatedBatchesByRecipe, linkRepeatedBatchesByRecipe]
    );

    const selectedRecipe = recipes.find((recipe) => recipe.id === selectedRecipeId);
    const currentDoughCount = useMemo(() => {
        if (selectedRecipeId && effectiveDoughCountByRecipe[selectedRecipeId] !== undefined) {
            return effectiveDoughCountByRecipe[selectedRecipeId];
        }
        return getSafeDoughCount(dataRows[0]);
    }, [dataRows, effectiveDoughCountByRecipe, selectedRecipeId]);
    const isBatchLinkingEnabled = selectedRecipeId
        ? (effectiveLinkRepeatedBatchesByRecipe[selectedRecipeId] ?? true)
        : true;

    const getUsedQuantityDraftKey = (ingredientIndex: number, batchIndex: number): string =>
        `${ingredientIndex}:${batchIndex}`;

    const clearUsedQuantityDraft = useCallback((ingredientIndex: number, batchIndex: number) => {
        const key = getUsedQuantityDraftKey(ingredientIndex, batchIndex);
        setUsedQuantityDrafts((prev) => {
            if (!(key in prev)) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);

    const clearUsedQuantityDraftsForIngredient = useCallback((ingredientIndex: number) => {
        const prefix = `${ingredientIndex}:`;
        setUsedQuantityDrafts((prev) => {
            const keys = Object.keys(prev).filter((key) => key.startsWith(prefix));
            if (keys.length === 0) return prev;
            const next = { ...prev };
            keys.forEach((key) => {
                delete next[key];
            });
            return next;
        });
    }, []);

    const getUsedQuantityInputValue = (ingredientIndex: number, batchIndex: number, selectedBatch: SelectedBatch): string => {
        const key = getUsedQuantityDraftKey(ingredientIndex, batchIndex);
        if (Object.prototype.hasOwnProperty.call(usedQuantityDrafts, key)) {
            return usedQuantityDrafts[key];
        }
        return selectedBatch.usedQuantity === undefined ? '' : String(selectedBatch.usedQuantity);
    };

    const syncLinkedTemplateForMaterial = useCallback((materialId: string | null, batches: SelectedBatch[]) => {
        if (!materialId) return;
        const nextTemplate = (batches.length > 0 ? batches : [createEmptyBatch()]).map((batch) =>
            toLinkedBatchTemplate(batch, materialId)
        );

        setLinkedBatchesByMaterial((prev) => {
            const current = prev[materialId];
            const currentSignature = JSON.stringify(current || []);
            const nextSignature = JSON.stringify(nextTemplate);
            if (currentSignature === nextSignature) return prev;
            return { ...prev, [materialId]: nextTemplate };
        });
    }, []);

    type SetTableRowsOptions = {
        selectedRecipeId?: string;
        doughCountByRecipe?: Record<string, number>;
        linkRepeatedBatchesByRecipe?: Record<string, boolean>;
        recipeRowsById?: Record<string, any[][]>;
    };

    const setTableRows = useCallback(
        (rows: any[][], options?: SetTableRowsOptions) => {
            const normalizedRows = normalizeRecipeRows(rows);
            const effectiveSelectedRecipeId = options?.selectedRecipeId ?? selectedRecipeId ?? persistedSelectedRecipeId;
            const normalizedRecipeRowsOverride = options?.recipeRowsById
                ? normalizeRecipeRowsMap(options.recipeRowsById)
                : {};
            const nextRecipeRowsById = {
                ...persistedRecipeRowsById,
                ...normalizedRecipeRowsOverride,
            };

            if (effectiveSelectedRecipeId) {
                nextRecipeRowsById[effectiveSelectedRecipeId] = normalizeRecipeRows(normalizedRows);
            }

            const nextDoughCountByRecipe = options?.doughCountByRecipe ?? effectiveDoughCountByRecipe;
            const nextLinkRepeatedBatchesByRecipe =
                options?.linkRepeatedBatchesByRecipe ?? effectiveLinkRepeatedBatchesByRecipe;

            const recipesSnapshot = recipes.map((recipe) => {
                const recipeRows = nextRecipeRowsById[recipe.id] || [];
                const recipeIngredients = (recipe.ingredients || []).map((ingredient, index) => {
                    const ingredientRow = Array.isArray(recipeRows[index]) ? recipeRows[index] : [];
                    const ingredientMaterialId = getIngredientMaterialId(ingredient, ingredientRow[MATERIAL_ID_INDEX]);
                    return {
                        ...ingredient,
                        ingredient_name: getIngredientName(ingredient, ingredientRow[INGREDIENT_NAME_INDEX] ?? ''),
                        quantity: ingredientRow[INGREDIENT_QUANTITY_INDEX] ?? ingredient.quantity,
                        unit: ingredientRow[INGREDIENT_UNIT_INDEX] ?? ingredient.unit,
                        material_id: ingredientMaterialId ?? undefined,
                        batches: ensureBatchArray(ingredientRow[BATCHES_INDEX]),
                    };
                });

                return {
                    id: recipe.id,
                    name: recipe.name,
                    version: recipe.version,
                    is_default: recipe.is_default,
                    ingredients: recipeIngredients,
                    mixing_steps: recipe.mixing_steps || [],
                    notes: recipe.notes || '',
                };
            });

            const selectedRecipeSnapshot = recipesSnapshot.find(
                (recipe) => recipe.id === effectiveSelectedRecipeId
            );
            const baseMeta = isRecord(recipeMetaRow) ? recipeMetaRow : {};
            const metaRow: RecipeMetaRow = {
                ...baseMeta,
                __recipe_meta__: true,
                selected_recipe_id: effectiveSelectedRecipeId || null,
                recipe_rows_by_id: nextRecipeRowsById,
                dough_count_by_recipe: nextDoughCountByRecipe,
                link_repeated_batches_by_recipe: nextLinkRepeatedBatchesByRecipe,
                recipes: recipesSnapshot,
            };

            if (selectedRecipeSnapshot) {
                (metaRow as Record<string, unknown>).id = selectedRecipeSnapshot.id;
                (metaRow as Record<string, unknown>).name = selectedRecipeSnapshot.name;
                (metaRow as Record<string, unknown>).version = selectedRecipeSnapshot.version;
                (metaRow as Record<string, unknown>).ingredients = selectedRecipeSnapshot.ingredients;
                (metaRow as Record<string, unknown>).mixing_steps = selectedRecipeSnapshot.mixing_steps;
                (metaRow as Record<string, unknown>).notes = selectedRecipeSnapshot.notes;
            }

            onChange(table.id, [...normalizedRows, metaRow] as any[][]);
        },
        [
            effectiveDoughCountByRecipe,
            effectiveLinkRepeatedBatchesByRecipe,
            onChange,
            persistedRecipeRowsById,
            persistedSelectedRecipeId,
            recipeMetaRow,
            recipes,
            selectedRecipeId,
            table.id,
        ]
    );

    const ensureIngredientRow = useCallback(
        (rows: any[][], ingredientIndex: number, ingredient?: RecipeIngredient): any[] => {
            const existing = Array.isArray(rows[ingredientIndex]) ? [...rows[ingredientIndex]] : [];
            const fallback = selectedRecipe?.ingredients?.[ingredientIndex];
            const source = ingredient || fallback;

            const doughCount = getSafeDoughCount(existing);
            const materialId = getIngredientMaterialId(source, existing[MATERIAL_ID_INDEX]);
            const batches = ensureBatchArray(existing[BATCHES_INDEX]);

            const nextRow = [
                existing[INGREDIENT_NAME_INDEX] ?? getIngredientName(source, ''),
                existing[INGREDIENT_QUANTITY_INDEX] ?? source?.quantity ?? '',
                existing[INGREDIENT_UNIT_INDEX] ?? source?.unit ?? '',
                batches,
                doughCount,
                materialId,
            ];

            rows[ingredientIndex] = nextRow;
            return nextRow;
        },
        [selectedRecipe?.ingredients]
    );

    const recalculateIngredientUsage = useCallback((row: any[]): any[] => {
        const nextRow = [...row];
        const recipeQty = toPositiveNumber(nextRow[INGREDIENT_QUANTITY_INDEX]) ?? 0;
        const recipeUnit = normalizeUnitText(nextRow[INGREDIENT_UNIT_INDEX]);
        const doughCount = getSafeDoughCount(nextRow);
        const requiredQuantity = recipeQty * doughCount;
        const currentBatches = ensureBatchArray(nextRow[BATCHES_INDEX]);

        const recalculatedBatches = currentBatches.map((batch) => {
            const nextBatch: SelectedBatch = { ...batch };
            const isSelected = Boolean(nextBatch.receivingId);
            const sourceUnit = normalizeUnitText(nextBatch.unit);
            const usedUnit = sourceUnit || recipeUnit || undefined;
            nextBatch.usedUnit = usedUnit;

            if (!isSelected || requiredQuantity <= BATCH_EPSILON) {
                nextBatch.usedQuantity = 0;
                nextBatch.manualUsedQuantity = false;
                return nextBatch;
            }

            const availableInBatchUnit =
                toPositiveNumber(nextBatch.remainingQuantity) ??
                toPositiveNumber(nextBatch.quantity) ??
                0;

            if (availableInBatchUnit <= BATCH_EPSILON) {
                nextBatch.usedQuantity = 0;
                nextBatch.manualUsedQuantity = false;
                return nextBatch;
            }

            const currentUsed = toPositiveNumber(nextBatch.usedQuantity) ?? 0;
            const cappedUsed = Math.min(currentUsed, availableInBatchUnit);
            nextBatch.usedQuantity = roundQuantity(cappedUsed);
            return nextBatch;
        });

        let manualConsumedInRecipeUnit = 0;
        recalculatedBatches.forEach((batch) => {
            if (!batch.manualUsedQuantity || !batch.receivingId) return;

            const used = toPositiveNumber(batch.usedQuantity) ?? 0;
            if (used <= BATCH_EPSILON) return;

            const usedUnit = normalizeUnitText(batch.usedUnit || batch.unit);
            if (!recipeUnit || !usedUnit || usedUnit === recipeUnit) {
                manualConsumedInRecipeUnit += used;
                return;
            }

            const converted = convertQuantity(used, usedUnit, recipeUnit);
            if (converted !== null && converted > BATCH_EPSILON) {
                manualConsumedInRecipeUnit += converted;
            }
        });

        let remainingRequiredInRecipeUnit = Math.max(0, requiredQuantity - manualConsumedInRecipeUnit);
        const finalizedBatches = recalculatedBatches.map((batch) => {
            const nextBatch: SelectedBatch = { ...batch };
            if (nextBatch.manualUsedQuantity || !nextBatch.receivingId) {
                return nextBatch;
            }

            const usedUnit = normalizeUnitText(nextBatch.usedUnit || nextBatch.unit);
            const availableInBatchUnit =
                toPositiveNumber(nextBatch.remainingQuantity) ??
                toPositiveNumber(nextBatch.quantity) ??
                0;

            if (availableInBatchUnit <= BATCH_EPSILON || remainingRequiredInRecipeUnit <= BATCH_EPSILON) {
                nextBatch.usedQuantity = 0;
                return nextBatch;
            }

            if (!recipeUnit || !usedUnit || recipeUnit === usedUnit) {
                const allocated = Math.min(remainingRequiredInRecipeUnit, availableInBatchUnit);
                nextBatch.usedQuantity = roundQuantity(allocated);
                remainingRequiredInRecipeUnit = Math.max(0, remainingRequiredInRecipeUnit - allocated);
                return nextBatch;
            }

            const availableInRecipeUnit = convertQuantity(availableInBatchUnit, usedUnit, recipeUnit);
            if (availableInRecipeUnit === null || availableInRecipeUnit <= BATCH_EPSILON) {
                nextBatch.usedQuantity = 0;
                return nextBatch;
            }

            const allocatedInRecipeUnit = Math.min(remainingRequiredInRecipeUnit, availableInRecipeUnit);
            const allocatedInBatchUnit = convertQuantity(allocatedInRecipeUnit, recipeUnit, usedUnit);
            if (allocatedInBatchUnit === null || allocatedInBatchUnit <= BATCH_EPSILON) {
                nextBatch.usedQuantity = 0;
                return nextBatch;
            }

            nextBatch.usedQuantity = roundQuantity(allocatedInBatchUnit);
            remainingRequiredInRecipeUnit = Math.max(0, remainingRequiredInRecipeUnit - allocatedInRecipeUnit);
            return nextBatch;
        });

        nextRow[BATCHES_INDEX] = finalizedBatches;
        nextRow[DOUGH_COUNT_INDEX] = doughCount;
        return nextRow;
    }, []);

    const getUsageSummary = useCallback((row: any[] | undefined) => {
        const recipeQty = toPositiveNumber(row?.[INGREDIENT_QUANTITY_INDEX]) ?? 0;
        const recipeUnit = normalizeUnitText(row?.[INGREDIENT_UNIT_INDEX]);
        const doughCount = getSafeDoughCount(row);
        const totalBatchQuantity = recipeQty * doughCount;

        const batches = ensureBatchArray(row?.[BATCHES_INDEX]);
        let usedInRecipeUnit = 0;
        let hasConversionIssue = false;

        batches.forEach((batch) => {
            const used = toPositiveNumber(batch.usedQuantity);
            if (!batch.receivingId || used === null || used <= BATCH_EPSILON) return;

            const usedUnit = normalizeUnitText(batch.usedUnit || batch.unit);
            if (!recipeUnit || !usedUnit || usedUnit === recipeUnit) {
                usedInRecipeUnit += used;
                return;
            }

            const converted = convertQuantity(used, usedUnit, recipeUnit);
            if (converted === null) {
                hasConversionIssue = true;
                return;
            }
            usedInRecipeUnit += converted;
        });

        const shortage = Math.max(0, totalBatchQuantity - usedInRecipeUnit);
        return {
            recipeQuantity: recipeQty,
            totalBatchQuantity,
            doughCount,
            usedInRecipeUnit,
            shortage,
            recipeUnit,
            hasConversionIssue,
        };
    }, []);

    const loadBatchesForMaterial = useCallback(
        async (materialId: string) => {
            if (!materialId) return;
            if (loadedMaterialIdsRef.current.has(materialId)) return;
            if (loadingMaterialIdsRef.current.has(materialId)) return;

            loadingMaterialIdsRef.current.add(materialId);
            setLoadingBatches((prev) => ({ ...prev, [materialId]: true }));

            try {
                const batches = await getMaterialBatches(materialId, {
                    companyId,
                    status: 'accepted',
                });
                setAvailableBatches((prev) => ({ ...prev, [materialId]: batches }));
                loadedMaterialIdsRef.current.add(materialId);
            } catch (loadError) {
                console.error('Error loading material batches:', loadError);
            } finally {
                loadingMaterialIdsRef.current.delete(materialId);
                setLoadingBatches((prev) => ({ ...prev, [materialId]: false }));
            }
        },
        [companyId]
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(max-width: 1023px)');
        const handleViewportChange = () => setIsMobileViewport(mediaQuery.matches);

        handleViewportChange();
        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleViewportChange);
            return () => mediaQuery.removeEventListener('change', handleViewportChange);
        }

        mediaQuery.addListener(handleViewportChange);
        return () => mediaQuery.removeListener(handleViewportChange);
    }, []);

    useEffect(() => {
        loadedMaterialIdsRef.current.clear();
        loadingMaterialIdsRef.current.clear();
        setAvailableBatches({});
        setLoadingBatches({});
    }, [productId, companyId]);

    useEffect(() => {
        if (!productId) return;

        const loadRecipes = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getRecipesByProduct(productId);
                setRecipes(data);

                setSelectedRecipeId((current) => {
                    if (current && data.some((recipe) => recipe.id === current)) {
                        return current;
                    }
                    if (
                        persistedSelectedRecipeId &&
                        data.some((recipe) => recipe.id === persistedSelectedRecipeId)
                    ) {
                        return persistedSelectedRecipeId;
                    }
                    const defaultRecipe = data.find((recipe) => recipe.is_default) || data[0];
                    return defaultRecipe?.id || '';
                });
            } catch (loadError) {
                setError('فشل في تحميل الوصفات');
                console.error('Error loading recipes:', loadError);
            } finally {
                setLoading(false);
            }
        };

        void loadRecipes();
    }, [persistedSelectedRecipeId, productId]);

    useEffect(() => {
        if (!selectedRecipe?.ingredients || selectedRecipe.ingredients.length === 0) return;

        const storedRowsForRecipe = persistedRecipeRowsById[selectedRecipe.id];
        const shouldUseVisibleRowsFallback =
            !storedRowsForRecipe &&
            (lastRecipeSyncRef.current === '' || lastRecipeSyncRef.current === selectedRecipe.id);
        const existingRows = normalizeRecipeRows(
            storedRowsForRecipe ?? (shouldUseVisibleRowsFallback ? dataRows : [])
        );
        const recipeChanged = lastRecipeSyncRef.current !== selectedRecipe.id;
        const mappedDoughCount = effectiveDoughCountByRecipe[selectedRecipe.id];
        const fallbackDoughCount = mappedDoughCount ?? (recipeChanged ? DEFAULT_DOUGH_COUNT : getSafeDoughCount(existingRows[0]));

        const nextRows = selectedRecipe.ingredients.map((ingredient, index) => {
            const existing = Array.isArray(existingRows[index]) ? [...existingRows[index]] : [];
            const materialId = getIngredientMaterialId(ingredient, existing[MATERIAL_ID_INDEX]);
            let normalizedBatches = sanitizeBatchesForMaterial(
                ensureBatchArray(existing[BATCHES_INDEX]),
                materialId
            );
            if (isBatchLinkingEnabled && materialId && linkedBatchesByMaterial[materialId]) {
                normalizedBatches = linkedBatchesByMaterial[materialId].map((batch) =>
                    toLinkedBatchTemplate(batch, materialId)
                );
            }
            const normalizedRow = [
                getIngredientName(ingredient, existing[INGREDIENT_NAME_INDEX] ?? ''),
                ingredient.quantity,
                ingredient.unit,
                normalizedBatches,
                mappedDoughCount ?? (recipeChanged ? fallbackDoughCount : getSafeDoughCount(existing) || fallbackDoughCount),
                materialId,
            ];
            return recalculateIngredientUsage(normalizedRow);
        });

        lastRecipeSyncRef.current = selectedRecipe.id;

        const nextSignature = JSON.stringify(nextRows);
        const existingSignature = JSON.stringify(existingRows);
        const shouldSyncSelectedRecipeMeta = recipeMetaRow?.selected_recipe_id !== selectedRecipe.id;
        if (nextSignature !== existingSignature || shouldSyncSelectedRecipeMeta) {
            setTableRows(nextRows, { selectedRecipeId: selectedRecipe.id });
        }
    }, [
        dataRows,
        effectiveDoughCountByRecipe,
        isBatchLinkingEnabled,
        linkedBatchesByMaterial,
        persistedRecipeRowsById,
        recipeMetaRow?.selected_recipe_id,
        selectedRecipe?.id,
        selectedRecipe?.ingredients,
        recalculateIngredientUsage,
        setTableRows,
    ]);

    useEffect(() => {
        if (!selectedRecipe?.ingredients || selectedRecipe.ingredients.length === 0) return;

        const uniqueMaterialIds = Array.from(
            new Set(
                selectedRecipe.ingredients
                    .map((ingredient) => getIngredientMaterialId(ingredient))
                    .filter((materialId): materialId is string => Boolean(materialId))
            )
        );

        if (uniqueMaterialIds.length === 0) return;

        void Promise.all(uniqueMaterialIds.map((materialId) => loadBatchesForMaterial(materialId)));
    }, [selectedRecipe?.id, selectedRecipe?.ingredients, loadBatchesForMaterial]);

    const ingredientsForDisplay = useMemo(() => {
        if (selectedRecipe?.ingredients && selectedRecipe.ingredients.length > 0) {
            return selectedRecipe.ingredients;
        }

        return dataRows.map((row) => ({
            ingredient_name: row[INGREDIENT_NAME_INDEX] || '',
            quantity: row[INGREDIENT_QUANTITY_INDEX] || '',
            unit: row[INGREDIENT_UNIT_INDEX] || '',
            material_id: getIngredientMaterialId(undefined, row[MATERIAL_ID_INDEX]),
        })) as RecipeIngredient[];
    }, [dataRows, selectedRecipe?.ingredients]);

    const handleDoughCountChange = (value: string) => {
        const parsed = toPositiveNumber(value);
        const nextDoughCount = parsed ?? DEFAULT_DOUGH_COUNT;
        const nextDoughMap = selectedRecipeId
            ? { ...effectiveDoughCountByRecipe, [selectedRecipeId]: nextDoughCount }
            : effectiveDoughCountByRecipe;
        if (selectedRecipeId) {
            setDoughCountByRecipe((prev) => ({ ...prev, [selectedRecipeId]: nextDoughCount }));
        }
        const rows = [...dataRows];

        ingredientsForDisplay.forEach((ingredient, index) => {
            const row = ensureIngredientRow(rows, index, ingredient);
            row[DOUGH_COUNT_INDEX] = nextDoughCount;
            rows[index] = recalculateIngredientUsage(row);
        });

        setTableRows(rows, { doughCountByRecipe: nextDoughMap });
    };

    const handleBatchLinkingToggle = (checked: boolean) => {
        if (!selectedRecipeId) return;
        const nextLinkMap = { ...effectiveLinkRepeatedBatchesByRecipe, [selectedRecipeId]: checked };
        setLinkRepeatedBatchesByRecipe((prev) => ({ ...prev, [selectedRecipeId]: checked }));

        if (!checked) {
            setTableRows(dataRows, { linkRepeatedBatchesByRecipe: nextLinkMap });
            return;
        }

        const rows = [...dataRows];
        let changed = false;
        ingredientsForDisplay.forEach((ingredient, index) => {
            const row = ensureIngredientRow(rows, index, ingredient);
            const materialId = getIngredientMaterialId(ingredient, row[MATERIAL_ID_INDEX]);
            if (!materialId) return;
            const template = linkedBatchesByMaterial[materialId];
            if (!template || template.length === 0) return;

            row[BATCHES_INDEX] = template.map((batch) => toLinkedBatchTemplate(batch, materialId));
            rows[index] = recalculateIngredientUsage(row);
            clearUsedQuantityDraftsForIngredient(index);
            changed = true;
        });

        if (changed) {
            setTableRows(rows, { linkRepeatedBatchesByRecipe: nextLinkMap });
            return;
        }

        setTableRows(dataRows, { linkRepeatedBatchesByRecipe: nextLinkMap });
    };

    const getLinkedIngredientIndexes = (rows: any[][], sourceIngredientIndex: number): number[] => {
        const sourceRow = rows[sourceIngredientIndex];
        const sourceMaterialId = getIngredientMaterialId(undefined, sourceRow?.[MATERIAL_ID_INDEX]);
        const sourceIngredientKey = normalizeIngredientKey(sourceRow?.[INGREDIENT_NAME_INDEX]);
        if (!isBatchLinkingEnabled) return [];
        if (!sourceMaterialId && !sourceIngredientKey) return [];

        const linkedIndexes: number[] = [];
        ingredientsForDisplay.forEach((ingredient, index) => {
            if (index === sourceIngredientIndex) return;
            const candidateRow = ensureIngredientRow(rows, index, ingredient);
            const candidateMaterialId = getIngredientMaterialId(undefined, candidateRow[MATERIAL_ID_INDEX]);
            const candidateIngredientKey = normalizeIngredientKey(candidateRow[INGREDIENT_NAME_INDEX]);
            if (
                (sourceMaterialId && candidateMaterialId === sourceMaterialId) ||
                (!sourceMaterialId && sourceIngredientKey && candidateIngredientKey === sourceIngredientKey)
            ) {
                linkedIndexes.push(index);
            }
        });

        return linkedIndexes;
    };

    const handleBatchSelect = (ingredientIndex: number, batchIndex: number, batch: MaterialBatch | null, ingredient?: RecipeIngredient) => {
        const rows = [...dataRows];
        const row = ensureIngredientRow(rows, ingredientIndex, ingredient);
        const rowMaterialId = getIngredientMaterialId(ingredient, row[MATERIAL_ID_INDEX]);
        const batches = ensureBatchArray(row[BATCHES_INDEX]);
        const nextBatches = [...batches];

        while (nextBatches.length <= batchIndex) {
            nextBatches.push(createEmptyBatch());
        }

        if (!batch) {
            nextBatches[batchIndex] = createEmptyBatch();
        } else {
            nextBatches[batchIndex] = {
                batchNumber: batch.batchNumber,
                materialId: rowMaterialId ?? undefined,
                lotNumber: batch.lotNumber,
                supplierName: batch.supplierName,
                productionDate: batch.productionDate,
                expiryDate: batch.expiryDate,
                productionDateFormat: batch.productionDateFormat || 'dmy',
                expiryDateFormat: batch.expiryDateFormat || 'dmy',
                receivingId: batch.id,
                quantity: toPositiveNumber(batch.quantity) ?? undefined,
                unit: batch.unit,
                remainingQuantity:
                    toPositiveNumber(batch.remainingQuantity) ??
                    toPositiveNumber(batch.quantity) ??
                    undefined,
                usedQuantity: undefined,
                usedUnit: batch.unit,
                manualUsedQuantity: false,
            };
        }

        row[BATCHES_INDEX] = nextBatches;
        rows[ingredientIndex] = recalculateIngredientUsage(row);
        const linkedIndexes = getLinkedIngredientIndexes(rows, ingredientIndex);
        linkedIndexes.forEach((linkedIndex) => {
            const linkedRow = ensureIngredientRow(rows, linkedIndex, ingredientsForDisplay[linkedIndex]);
            const linkedBatches = ensureBatchArray(linkedRow[BATCHES_INDEX]);
            while (linkedBatches.length <= batchIndex) {
                linkedBatches.push(createEmptyBatch());
            }
            linkedBatches[batchIndex] = {
                ...nextBatches[batchIndex],
                usedQuantity: undefined,
                manualUsedQuantity: false,
            };
            linkedRow[BATCHES_INDEX] = linkedBatches;
            rows[linkedIndex] = recalculateIngredientUsage(linkedRow);
            clearUsedQuantityDraftsForIngredient(linkedIndex);
        });
        if (isBatchLinkingEnabled) {
            syncLinkedTemplateForMaterial(
                rowMaterialId,
                ensureBatchArray(rows[ingredientIndex]?.[BATCHES_INDEX])
            );
        }
        clearUsedQuantityDraftsForIngredient(ingredientIndex);
        setTableRows(rows);
    };

    const handleAddBatchSlot = (ingredientIndex: number, ingredient?: RecipeIngredient) => {
        const rows = [...dataRows];
        const row = ensureIngredientRow(rows, ingredientIndex, ingredient);
        const rowMaterialId = getIngredientMaterialId(ingredient, row[MATERIAL_ID_INDEX]);
        const batches = ensureBatchArray(row[BATCHES_INDEX]);
        row[BATCHES_INDEX] = [...batches, createEmptyBatch()];
        rows[ingredientIndex] = recalculateIngredientUsage(row);
        const linkedIndexes = getLinkedIngredientIndexes(rows, ingredientIndex);
        linkedIndexes.forEach((linkedIndex) => {
            const linkedRow = ensureIngredientRow(rows, linkedIndex, ingredientsForDisplay[linkedIndex]);
            const linkedBatches = ensureBatchArray(linkedRow[BATCHES_INDEX]);
            linkedRow[BATCHES_INDEX] = [...linkedBatches, createEmptyBatch()];
            rows[linkedIndex] = recalculateIngredientUsage(linkedRow);
            clearUsedQuantityDraftsForIngredient(linkedIndex);
        });
        if (isBatchLinkingEnabled) {
            syncLinkedTemplateForMaterial(
                rowMaterialId,
                ensureBatchArray(rows[ingredientIndex]?.[BATCHES_INDEX])
            );
        }
        clearUsedQuantityDraftsForIngredient(ingredientIndex);
        setTableRows(rows);
    };

    const handleRemoveBatch = (ingredientIndex: number, batchIndex: number, ingredient?: RecipeIngredient) => {
        const rows = [...dataRows];
        const row = ensureIngredientRow(rows, ingredientIndex, ingredient);
        const rowMaterialId = getIngredientMaterialId(ingredient, row[MATERIAL_ID_INDEX]);
        const batches = ensureBatchArray(row[BATCHES_INDEX]);
        const filtered = batches.filter((_, index) => index !== batchIndex);
        row[BATCHES_INDEX] = filtered.length > 0 ? filtered : [createEmptyBatch()];
        rows[ingredientIndex] = recalculateIngredientUsage(row);
        const linkedIndexes = getLinkedIngredientIndexes(rows, ingredientIndex);
        linkedIndexes.forEach((linkedIndex) => {
            const linkedRow = ensureIngredientRow(rows, linkedIndex, ingredientsForDisplay[linkedIndex]);
            const linkedBatches = ensureBatchArray(linkedRow[BATCHES_INDEX]);
            const linkedFiltered = linkedBatches.filter((_, index) => index !== batchIndex);
            linkedRow[BATCHES_INDEX] = linkedFiltered.length > 0 ? linkedFiltered : [createEmptyBatch()];
            rows[linkedIndex] = recalculateIngredientUsage(linkedRow);
            clearUsedQuantityDraftsForIngredient(linkedIndex);
        });
        if (isBatchLinkingEnabled) {
            syncLinkedTemplateForMaterial(
                rowMaterialId,
                ensureBatchArray(rows[ingredientIndex]?.[BATCHES_INDEX])
            );
        }
        clearUsedQuantityDraftsForIngredient(ingredientIndex);
        setTableRows(rows);
    };

    const handleUsedQuantityChange = (
        ingredientIndex: number,
        batchIndex: number,
        value: string,
        ingredient?: RecipeIngredient
    ) => {
        const rows = [...dataRows];
        const row = ensureIngredientRow(rows, ingredientIndex, ingredient);
        const batches = ensureBatchArray(row[BATCHES_INDEX]);
        const nextBatches = [...batches];

        while (nextBatches.length <= batchIndex) {
            nextBatches.push(createEmptyBatch());
        }

        const targetBatch: SelectedBatch = { ...nextBatches[batchIndex] };
        if (!targetBatch.receivingId) {
            row[BATCHES_INDEX] = nextBatches;
            rows[ingredientIndex] = row;
            setTableRows(rows);
            return;
        }

        const trimmed = value.trim();
        if (!trimmed) {
            targetBatch.usedQuantity = undefined;
            targetBatch.manualUsedQuantity = false;
            nextBatches[batchIndex] = targetBatch;
            row[BATCHES_INDEX] = nextBatches;
            rows[ingredientIndex] = recalculateIngredientUsage(row);
            setTableRows(rows);
            return;
        }

        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed)) {
            return;
        }

        const availableInBatchUnit =
            toPositiveNumber(targetBatch.remainingQuantity) ??
            toPositiveNumber(targetBatch.quantity) ??
            0;
        const cappedUsed = Math.max(0, Math.min(parsed, availableInBatchUnit));

        targetBatch.usedQuantity = roundQuantity(cappedUsed);
        targetBatch.usedUnit = targetBatch.usedUnit || targetBatch.unit;
        targetBatch.manualUsedQuantity = true;
        nextBatches[batchIndex] = targetBatch;
        row[BATCHES_INDEX] = nextBatches;
        rows[ingredientIndex] = recalculateIngredientUsage(row);
        setTableRows(rows);
    };

    const handleUsedQuantityInputChange = (
        ingredientIndex: number,
        batchIndex: number,
        value: string,
        ingredient?: RecipeIngredient
    ) => {
        const trimmed = value.trim();
        if (!trimmed) {
            clearUsedQuantityDraft(ingredientIndex, batchIndex);
            handleUsedQuantityChange(ingredientIndex, batchIndex, '', ingredient);
            return;
        }

        const parsed = parseLocalizedNumber(trimmed, false);
        if (parsed === null) {
            const key = getUsedQuantityDraftKey(ingredientIndex, batchIndex);
            setUsedQuantityDrafts((prev) => ({ ...prev, [key]: value }));
            return;
        }

        clearUsedQuantityDraft(ingredientIndex, batchIndex);
        handleUsedQuantityChange(ingredientIndex, batchIndex, String(parsed), ingredient);
    };

    const handleUsedQuantityInputBlur = (
        ingredientIndex: number,
        batchIndex: number,
        ingredient?: RecipeIngredient
    ) => {
        const key = getUsedQuantityDraftKey(ingredientIndex, batchIndex);
        const draftValue = usedQuantityDrafts[key];
        if (draftValue === undefined) return;

        const trimmed = draftValue.trim();
        if (!trimmed) {
            clearUsedQuantityDraft(ingredientIndex, batchIndex);
            handleUsedQuantityChange(ingredientIndex, batchIndex, '', ingredient);
            return;
        }

        const parsed = parseLocalizedNumber(trimmed, true);
        clearUsedQuantityDraft(ingredientIndex, batchIndex);
        if (parsed === null) {
            return;
        }

        handleUsedQuantityChange(ingredientIndex, batchIndex, String(parsed), ingredient);
    };

    const allColumnKeys: RecipeColumnKey[] = allowMultipleBatches
        ? ['ingredient', 'quantity', 'unit', 'batch', 'usedQuantity', 'productionDate', 'expiryDate', 'actions']
        : ['ingredient', 'quantity', 'unit', 'batch', 'usedQuantity', 'productionDate', 'expiryDate'];

    const columnLabels: Record<RecipeColumnKey, string> = {
        ingredient: 'الخامة',
        quantity: 'كمية الوصفة',
        unit: 'الوحدة',
        batch: 'رقم الباتش',
        usedQuantity: 'المستهلك',
        productionDate: 'تاريخ الإنتاج',
        expiryDate: 'تاريخ الانتهاء',
        actions: 'إجراءات',
    };

    const columnHeaderClass: Record<RecipeColumnKey, string> = {
        ingredient: 'border border-gray-300 dark:border-gray-600 px-2 py-2 text-right text-xs font-semibold whitespace-nowrap',
        quantity: 'border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-xs font-semibold whitespace-nowrap',
        unit: 'border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-xs font-semibold whitespace-nowrap',
        batch: 'border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-xs font-semibold whitespace-nowrap',
        usedQuantity: 'border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-xs font-semibold whitespace-nowrap',
        productionDate: 'border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-xs font-semibold whitespace-nowrap',
        expiryDate: 'border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-xs font-semibold whitespace-nowrap',
        actions: 'border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-xs font-semibold whitespace-nowrap',
    };

    const columnWidthStyle: Record<RecipeColumnKey, string> = {
        ingredient: allowMultipleBatches ? '18%' : '20%',
        quantity: '8%',
        unit: '6%',
        batch: allowMultipleBatches ? '30%' : '34%',
        usedQuantity: '12%',
        productionDate: '10%',
        expiryDate: '10%',
        actions: '6%',
    };

    if (!productId) {
        return (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <span className="text-xl">⚠️</span>
                    <div>
                        <p className="font-medium">يجب اختيار منتج أولاً</p>
                        <p className="text-sm">اذهب إلى تبويب "المعلومات الأساسية" واختر المنتج لعرض الوصفات والخامات.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return <TableSkeleton />;
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
            </div>
        );
    }

    if (recipes.length === 0) {
        return (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <p className="text-blue-700 dark:text-blue-300 font-medium">لا توجد وصفات لهذا المنتج.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    اختر الوصفة:
                </label>
                <select
                    value={selectedRecipeId}
                    onChange={(event) => setSelectedRecipeId(event.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                    {recipes.map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>
                            {recipe.name} {recipe.is_default ? '(افتراضية)' : ''} - v{recipe.version}
                        </option>
                    ))}
                </select>
            </div>

            {selectedRecipe && (
                <>
                    {showMixingSteps && selectedRecipe.mixing_steps && selectedRecipe.mixing_steps.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                            <h5 className="font-medium text-blue-800 dark:text-blue-300 mb-2 text-sm">
                                📋 خطوات الخلط ({selectedRecipe.mixing_steps.length} خطوات)
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {selectedRecipe.mixing_steps.map((step, index) => (
                                    <div key={index} className="flex gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-blue-100 dark:border-blue-800">
                                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-blue-500 text-white text-xs rounded-full font-bold">
                                            {step.step_number || index + 1}
                                        </span>
                                        <div className="flex-1 text-xs">
                                            <p className="font-medium text-gray-900 dark:text-white">{step.title}</p>
                                            {step.description && (
                                                <p className="text-gray-500 dark:text-gray-400 mt-0.5">{step.description}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    عدد العجنات
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={currentDoughCount}
                                    onChange={(event) => handleDoughCountChange(event.target.value)}
                                    className="w-40 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 select-none">
                                <input
                                    type="checkbox"
                                    checked={isBatchLinkingEnabled}
                                    onChange={(event) => handleBatchLinkingToggle(event.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                ربط الباتشات للخامات المتكررة داخل الوصفة
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {isMobileViewport && (
                            <div className="space-y-3">
                                {ingredientsForDisplay.map((ingredient, ingredientIndex) => {
                                    const row = Array.isArray(dataRows[ingredientIndex]) ? dataRows[ingredientIndex] : [];
                                    const materialId = getIngredientMaterialId(ingredient, row[MATERIAL_ID_INDEX]) || '';
                                    const ingredientDisplayName = getIngredientName(ingredient, `خامة ${ingredientIndex + 1}`);
                                    const batches = materialId ? availableBatches[materialId] || [] : [];
                                    const isLoadingBatches = materialId ? Boolean(loadingBatches[materialId]) : false;
                                    const selectedBatches = ensureBatchArray(row[BATCHES_INDEX]);
                                    const ingredientBatches = selectedBatches.length > 0 ? selectedBatches : [createEmptyBatch()];
                                    const usage = getUsageSummary(row);

                                    return (
                                        <div key={ingredient.id || `${ingredientIndex}`} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-sm text-gray-900 dark:text-white inline-flex items-center gap-1">
                                                        <span>{ingredientDisplayName}</span>
                                                        {!materialId && (
                                                            <span
                                                                title={unlinkedIngredientHint}
                                                                aria-label={unlinkedIngredientHint}
                                                                className="text-[11px] leading-none text-amber-600 dark:text-amber-400 cursor-help"
                                                            >
                                                                *
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        كمية الوصفة: {formatNumber(usage.recipeQuantity)} {getUnitDisplayLabel(usage.recipeUnit)}
                                                    </p>
                                                    {usage.doughCount > 1 && (
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                            إجمالي التشغيلة: {formatNumber(usage.totalBatchQuantity)} {getUnitDisplayLabel(usage.recipeUnit)}
                                                        </p>
                                                    )}
                                                    <p className={cn(
                                                        'text-xs',
                                                        usage.hasConversionIssue ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
                                                    )}>
                                                        المستخدم: {formatNumber(usage.usedInRecipeUnit)} {getUnitDisplayLabel(usage.recipeUnit)}
                                                    </p>
                                                </div>
                                            </div>

                                            {ingredientBatches.map((selectedBatch, batchIndex) => (
                                                <div key={`mobile-${ingredientIndex}-${batchIndex}`} className="rounded-md border border-gray-200 dark:border-gray-700 p-2 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">باتش {batchIndex + 1}</span>
                                                        {allowMultipleBatches && ingredientBatches.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveBatch(ingredientIndex, batchIndex, ingredient)}
                                                                className="text-xs text-red-600 hover:text-red-700"
                                                            >
                                                                حذف
                                                            </button>
                                                        )}
                                                    </div>

                                                    <select
                                                        value={selectedBatch.receivingId || ''}
                                                        onChange={(event) => {
                                                            const batch = batches.find((item) => item.id === event.target.value);
                                                            handleBatchSelect(ingredientIndex, batchIndex, batch || null, ingredient);
                                                        }}
                                                        onFocus={() => {
                                                            if (materialId && !batches.length && !isLoadingBatches) {
                                                                void loadBatchesForMaterial(materialId);
                                                            }
                                                        }}
                                                        disabled={!materialId}
                                                        className="w-full h-8 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                    >
                                                        <option value="">{materialId ? 'اختر الباتش...' : 'غير متاح'}</option>
                                                        {isLoadingBatches && <option disabled>جاري التحميل...</option>}
                                                        {!isLoadingBatches && batches.length === 0 && (
                                                            <option disabled>لا توجد باتشات متاحة</option>
                                                        )}
                                                        {batches.map((batch) => {
                                                            const optionRemaining =
                                                                toPositiveNumber(batch.remainingQuantity) ??
                                                                toPositiveNumber(batch.quantity) ??
                                                                0;
                                                            return (
                                                                <option key={batch.id} value={batch.id}>
                                                                    {batch.batchNumber} - {batch.supplierName} (متبقي: {formatNumber(optionRemaining)} {getUnitDisplayLabel(batch.unit)})
                                                                </option>
                                                            );
                                                        })}
                                                    </select>

                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="rounded border border-gray-200 dark:border-gray-700 p-1.5">
                                                            <p className="text-gray-500 dark:text-gray-400">المستهلك</p>
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    dir="ltr"
                                                                    value={getUsedQuantityInputValue(ingredientIndex, batchIndex, selectedBatch)}
                                                                    onChange={(event) =>
                                                                        handleUsedQuantityInputChange(
                                                                            ingredientIndex,
                                                                            batchIndex,
                                                                            event.target.value,
                                                                            ingredient
                                                                        )
                                                                    }
                                                                    onBlur={() =>
                                                                        handleUsedQuantityInputBlur(ingredientIndex, batchIndex, ingredient)
                                                                    }
                                                                    disabled={!selectedBatch.receivingId}
                                                                    className="w-full h-7 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-400"
                                                                />
                                                                <span className="text-[10px] text-gray-500">
                                                                    {getUnitDisplayLabel(selectedBatch.usedUnit || selectedBatch.unit)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="rounded border border-gray-200 dark:border-gray-700 p-1.5">
                                                            <p className="text-gray-500 dark:text-gray-400">المتبقي</p>
                                                            <p className="font-medium text-gray-800 dark:text-gray-100">
                                                                {formatNumber(toPositiveNumber(selectedBatch.remainingQuantity) ?? 0)} {getUnitDisplayLabel(selectedBatch.unit)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {allowMultipleBatches && materialId && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddBatchSlot(ingredientIndex, ingredient)}
                                                    className="text-xs text-primary-600 hover:text-primary-700"
                                                >
                                                    + إضافة باتش
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className={cn('overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900', isMobileViewport && 'hidden')}>
                            <table className="min-w-[1080px] w-full table-fixed border-collapse text-xs">
                                <colgroup>
                                    {allColumnKeys.map((columnKey) => (
                                        <col key={`col-${columnKey}`} style={{ width: columnWidthStyle[columnKey] }} />
                                    ))}
                                </colgroup>
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-700">
                                        {allColumnKeys.map((columnKey) => (
                                            <th key={columnKey} className={columnHeaderClass[columnKey]}>
                                                {columnLabels[columnKey]}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ingredientsForDisplay.map((ingredient, ingredientIndex) => {
                                        const row = Array.isArray(dataRows[ingredientIndex]) ? dataRows[ingredientIndex] : [];
                                        const materialId = getIngredientMaterialId(ingredient, row[MATERIAL_ID_INDEX]) || '';
                                        const ingredientDisplayName = getIngredientName(ingredient, `خامة ${ingredientIndex + 1}`);
                                        const batches = materialId ? availableBatches[materialId] || [] : [];
                                        const isLoadingBatches = materialId ? Boolean(loadingBatches[materialId]) : false;
                                        const selectedBatches = ensureBatchArray(row[BATCHES_INDEX]);
                                        const ingredientBatches = selectedBatches.length > 0 ? selectedBatches : [createEmptyBatch()];
                                        const usage = getUsageSummary(row);

                                        return ingredientBatches.map((selectedBatch, batchIndex) => (
                                            <tr key={`desktop-${ingredientIndex}-${batchIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                                {batchIndex === 0 && (
                                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-xs font-medium align-top" rowSpan={ingredientBatches.length}>
                                                        <div className="space-y-1 leading-5 break-words">
                                                            <div className="line-clamp-3 inline-flex items-start gap-1">
                                                                <span>{ingredientDisplayName}</span>
                                                                {!materialId && (
                                                                    <span
                                                                        title={unlinkedIngredientHint}
                                                                        aria-label={unlinkedIngredientHint}
                                                                        className="text-[11px] leading-none text-amber-600 dark:text-amber-400 cursor-help mt-0.5"
                                                                    >
                                                                        *
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                )}
                                                {batchIndex === 0 && (
                                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-center text-xs align-top" rowSpan={ingredientBatches.length}>
                                                        <div className="space-y-1">
                                                            <div>{formatNumber(usage.recipeQuantity)}</div>
                                                        </div>
                                                    </td>
                                                )}
                                                {batchIndex === 0 && (
                                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-center text-xs align-top" rowSpan={ingredientBatches.length}>
                                                        {getUnitDisplayLabel(usage.recipeUnit)}
                                                    </td>
                                                )}

                                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 align-middle">
                                                    <select
                                                        value={selectedBatch.receivingId || ''}
                                                        onChange={(event) => {
                                                            const batch = batches.find((item) => item.id === event.target.value);
                                                            handleBatchSelect(ingredientIndex, batchIndex, batch || null, ingredient);
                                                        }}
                                                        onFocus={() => {
                                                            if (materialId && !batches.length && !isLoadingBatches) {
                                                                void loadBatchesForMaterial(materialId);
                                                            }
                                                        }}
                                                        disabled={!materialId}
                                                        className="w-full h-8 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                    >
                                                        <option value="">{materialId ? 'اختر الباتش...' : 'غير متاح'}</option>
                                                        {isLoadingBatches && <option disabled>جاري التحميل...</option>}
                                                        {!isLoadingBatches && batches.length === 0 && (
                                                            <option disabled>لا توجد باتشات متاحة</option>
                                                        )}
                                                        {batches.map((batch) => {
                                                            const optionRemaining =
                                                                toPositiveNumber(batch.remainingQuantity) ??
                                                                toPositiveNumber(batch.quantity) ??
                                                                0;
                                                            return (
                                                                <option key={batch.id} value={batch.id}>
                                                                    {batch.batchNumber} - {batch.supplierName} (متبقي: {formatNumber(optionRemaining)} {getUnitDisplayLabel(batch.unit)})
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </td>

                                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center text-[11px]">
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            dir="ltr"
                                                            value={getUsedQuantityInputValue(ingredientIndex, batchIndex, selectedBatch)}
                                                            onChange={(event) =>
                                                                handleUsedQuantityInputChange(
                                                                    ingredientIndex,
                                                                    batchIndex,
                                                                    event.target.value,
                                                                    ingredient
                                                                )
                                                            }
                                                            onBlur={() =>
                                                                handleUsedQuantityInputBlur(ingredientIndex, batchIndex, ingredient)
                                                            }
                                                            disabled={!selectedBatch.receivingId}
                                                            className="w-20 h-7 px-2 py-1 text-[11px] border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-400"
                                                        />
                                                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                                            {getUnitDisplayLabel(selectedBatch.usedUnit || selectedBatch.unit)}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center text-[11px]">
                                                    {formatMaterialDateForDisplay(
                                                        selectedBatch.productionDate,
                                                        selectedBatch.productionDateFormat || 'dmy',
                                                        'ar'
                                                    ) || '-'}
                                                </td>

                                                <td className={cn(
                                                    'border border-gray-300 dark:border-gray-600 px-2 py-1 text-center text-[11px]',
                                                    isExpired(selectedBatch.expiryDate) && 'bg-red-100 dark:bg-red-900',
                                                    showExpiryWarning && isExpiryNear(selectedBatch.expiryDate, expiryWarningDays) && !isExpired(selectedBatch.expiryDate) && 'bg-amber-100 dark:bg-amber-900'
                                                )}>
                                                    {selectedBatch.expiryDate ? (
                                                        <span className={cn(
                                                            isExpired(selectedBatch.expiryDate) && 'text-red-700 dark:text-red-300 font-medium',
                                                            showExpiryWarning && isExpiryNear(selectedBatch.expiryDate, expiryWarningDays) && !isExpired(selectedBatch.expiryDate) && 'text-amber-700 dark:text-amber-300'
                                                        )}>
                                                            {formatMaterialDateForDisplay(
                                                                selectedBatch.expiryDate,
                                                                selectedBatch.expiryDateFormat || 'dmy',
                                                                'ar'
                                                            )}
                                                            {isExpired(selectedBatch.expiryDate) && ' ⚠️'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>

                                                {allowMultipleBatches && (
                                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                                                        {!materialId ? (
                                                            <span className="text-gray-400">-</span>
                                                        ) : batchIndex === ingredientBatches.length - 1 ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddBatchSlot(ingredientIndex, ingredient)}
                                                                className="text-primary-600 hover:text-primary-700 text-sm"
                                                                title="إضافة باتش"
                                                            >
                                                                +
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveBatch(ingredientIndex, batchIndex, ingredient)}
                                                                className="text-red-600 hover:text-red-700 text-sm"
                                                                title="حذف الباتش"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ));
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {selectedRecipe.notes && (
                        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات الوصفة:</h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedRecipe.notes}</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default RecipeTraceabilityTable;
