/**
 * Product Pallet Configuration Form
 * Complete form for configuring per-product pallet stacking settings
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Package,
    Layers,
    Save,
    RotateCcw,
    AlertCircle,
    Info
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import DimensionInputGroup from './DimensionInputGroup';
import StackingPatternSelector from './StackingPatternSelector';
import PalletStackingVisualizer from './PalletStackingVisualizer';
import type {
    ProductPalletConfigInput,
    StackingPattern
} from '../../../types/palletConfig';
import {
    DEFAULT_CONFIG,
    CONFIG_LIMITS,
    STACKING_PATTERNS,
    validateConfig,
    generateLayerPatterns,
    computeLayerPlan
} from '../../../types/palletConfig';

// =====================================================
// Props Interface
// =====================================================

interface ProductPalletConfigFormProps {
    productId: string;
    productName: string;
    initialConfig?: Partial<ProductPalletConfigInput>;
    onSave: (config: ProductPalletConfigInput) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
}

type SuggestGoal = 'max_capacity' | 'balanced' | 'max_stability';
type SuggestApplyMode = 'apply' | 'list';

interface Suggestion {
    basePattern: StackingPattern;
    alternateLayers: boolean;
    cartonsPerLayer: number;
    numberOfLayers: number;
    totalCartons: number;
    stabilityScore: number;
    score: number;
}

interface SopVariable {
    id: string;
    name: string;
    value: string | null;
    unit?: string | null;
}

// =====================================================
// Component
// =====================================================

export default function ProductPalletConfigForm({
    productId,
    productName,
    initialConfig,
    onSave,
    onCancel,
    isLoading = false
}: ProductPalletConfigFormProps) {
    // Form state
    const [config, setConfig] = useState<ProductPalletConfigInput>({
        ...DEFAULT_CONFIG,
        ...initialConfig
    });

    const [sopDocumentId, setSopDocumentId] = useState<string | null>(null);
    const [sopVariables, setSopVariables] = useState<SopVariable[]>([]);
    const [loadingVariables, setLoadingVariables] = useState(false);
    const [sopLoaded, setSopLoaded] = useState(false);

    // Validation errors
    const [errors, setErrors] = useState<string[]>([]);

    // Saving state
    const [isSaving, setIsSaving] = useState(false);

    // Smart suggestion controls
    const [suggestGoal, setSuggestGoal] = useState<SuggestGoal>('max_capacity');
    const [allowMixing, setAllowMixing] = useState(true);
    const [applyMode, setApplyMode] = useState<SuggestApplyMode>('apply');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

    // Update config field
    const updateField = useCallback(<K extends keyof ProductPalletConfigInput>(
        field: K,
        value: ProductPalletConfigInput[K]
    ) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    }, []);

    // Validate on change
    useEffect(() => {
        const validationErrors = validateConfig(config);
        setErrors(validationErrors);
    }, [config]);

    useEffect(() => {
        const fetchSopDocument = async () => {
            if (!productId) {
                setSopDocumentId(null);
                setSopLoaded(true);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('sop_document_id')
                    .eq('id', productId)
                    .single();

                if (error) throw error;
                setSopDocumentId(data?.sop_document_id ?? null);
            } catch (err) {
                console.error('Error fetching product SOP:', err);
                setSopDocumentId(null);
            } finally {
                setSopLoaded(true);
            }
        };

        setSopLoaded(false);
        fetchSopDocument();
    }, [productId]);

    useEffect(() => {
        const fetchSopVariables = async () => {
            if (!sopLoaded) return;

            if (!sopDocumentId) {
                setSopVariables([]);
                setConfig(prev => (
                    prev.shelf_life_variable_id
                        ? { ...prev, shelf_life_variable_id: null }
                        : prev
                ));
                return;
            }

            try {
                setLoadingVariables(true);
                const { data, error } = await supabase
                    .from('variables')
                    .select('id, name, value, unit')
                    .eq('source_document_id', sopDocumentId)
                    .order('name');

                if (error) throw error;
                const variables = (data || []) as SopVariable[];
                setSopVariables(variables);

                setConfig(prev => {
                    if (!prev.shelf_life_variable_id) return prev;
                    const exists = variables.some(v => v.id === prev.shelf_life_variable_id);
                    return exists ? prev : { ...prev, shelf_life_variable_id: null };
                });
            } catch (err) {
                console.error('Error fetching SOP variables:', err);
                setSopVariables([]);
            } finally {
                setLoadingVariables(false);
            }
        };

        fetchSopVariables();
    }, [sopDocumentId, sopLoaded]);

    const cartonError = useMemo(() => {
        const related = errors.filter((e) => e.includes('الكرتونة') || e.includes('مساحة البالتة'));
        return related.length > 0 ? related.join('، ') : undefined;
    }, [errors]);

    const palletError = useMemo(() => {
        const related = errors.filter((e) => e.includes('البالتة') && !e.includes('مساحة البالتة'));
        return related.length > 0 ? related.join('، ') : undefined;
    }, [errors]);

    const stackingError = useMemo(() => {
        const related = errors.filter((e) => e.includes('الطبقة') || e.includes('الطبقات'));
        return related.length > 0 ? related.join('، ') : undefined;
    }, [errors]);

    const buildSuggestions = useCallback((): Suggestion[] => {
        const maxLayersByHeight = Math.floor(config.pallet_max_height_cm / config.carton_height_cm);
        const targetLayers = Math.min(
            Math.max(config.number_of_layers || 1, 1),
            CONFIG_LIMITS.numberOfLayers.max
        );
        if (targetLayers <= 0) return [];

        const patterns: StackingPattern[] = allowMixing
            ? ['column', 'brick', 'pinwheel']
            : ['column', 'brick'];
        const alternates = allowMixing ? [false, true] : [false];

        const stabilityWeights: Record<StackingPattern, number> = {
            column: 0.6,
            brick: 0.8,
            pinwheel: 0.9
        };

        const candidates: Suggestion[] = [];

        patterns.forEach((basePattern) => {
            alternates.forEach((alternateLayers) => {
                let minCapacity = Number.POSITIVE_INFINITY;
                for (let layer = 0; layer < targetLayers; layer++) {
                    const plan = computeLayerPlan({
                        palletWidth: config.pallet_width_cm,
                        palletDepth: config.pallet_depth_cm,
                        cartonWidth: config.carton_width_cm,
                        cartonDepth: config.carton_depth_cm,
                        basePattern,
                        alternateLayers,
                        layerIndex: layer
                    });
                    minCapacity = Math.min(minCapacity, plan.maxCapacity);
                }

                if (!Number.isFinite(minCapacity) || minCapacity <= 0) return;

                const cartonsPerLayer = Math.min(
                    minCapacity,
                    CONFIG_LIMITS.cartonsPerLayer.max
                );
                const numberOfLayers = targetLayers;
                const totalCartons = cartonsPerLayer * numberOfLayers;
                const stabilityScore = Math.min(1, stabilityWeights[basePattern] + (alternateLayers ? 0.05 : 0));

                candidates.push({
                    basePattern,
                    alternateLayers,
                    cartonsPerLayer,
                    numberOfLayers,
                    totalCartons,
                    stabilityScore,
                    score: 0
                });
            });
        });

        if (candidates.length === 0) return [];

        const bestTotal = Math.max(...candidates.map((c) => c.totalCartons), 1);
        candidates.forEach((c) => {
            if (suggestGoal === 'max_capacity') {
                c.score = c.totalCartons;
            } else if (suggestGoal === 'max_stability') {
                c.score = c.stabilityScore * 1000 + c.totalCartons / 1000;
            } else {
                const capacityScore = c.totalCartons / bestTotal;
                c.score = capacityScore * 0.7 + c.stabilityScore * 0.3;
            }
        });

        return candidates.sort((a, b) => b.score - a.score);
    }, [
        config.pallet_max_height_cm,
        config.carton_height_cm,
        config.pallet_width_cm,
        config.pallet_depth_cm,
        config.carton_width_cm,
        config.carton_depth_cm,
        allowMixing,
        suggestGoal
    ]);

    const applySuggestion = useCallback((suggestion: Suggestion) => {
        setConfig(prev => ({
            ...prev,
            base_pattern: suggestion.basePattern,
            alternate_layers: suggestion.alternateLayers,
            cartons_per_layer: suggestion.cartonsPerLayer
        }));
    }, []);

    // Generate layer patterns when stacking config changes
    useEffect(() => {
        const patterns = generateLayerPatterns(
            config.cartons_per_layer,
            config.number_of_layers,
            config.base_pattern,
            config.alternate_layers
        );
        setConfig(prev => ({ ...prev, layer_patterns: patterns }));
    }, [
        config.cartons_per_layer,
        config.number_of_layers,
        config.base_pattern,
        config.alternate_layers
    ]);

    // Handle save
    const handleSave = async () => {
        if (errors.length > 0) return;

        setIsSaving(true);
        try {
            await onSave(config);
        } finally {
            setIsSaving(false);
        }
    };

    // Reset to defaults
    const handleReset = () => {
        setConfig({ ...DEFAULT_CONFIG });
    };

    useEffect(() => {
        if (applyMode === 'apply' && suggestions.length > 0) {
            setSuggestions([]);
        }
    }, [applyMode, suggestions.length]);

    // Calculate totals
    const totalCartons = config.cartons_per_layer * config.number_of_layers;
    const totalHeight = config.carton_height_cm * config.number_of_layers;
    const exceedsMaxHeight = totalHeight > config.pallet_max_height_cm;

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Form Section */}
            <div className="flex-1 space-y-6">
                {/* Product Header */}
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Package size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">{productName}</h3>
                            <p className="text-sm text-gray-500">تخصيصات البالتة</p>
                        </div>
                    </div>
                </div>

                {/* Error Messages */}
                {errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="text-red-500 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-red-800">يوجد أخطاء في الإعدادات:</h4>
                                <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                                    {errors.map((error, idx) => (
                                        <li key={idx}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Carton Dimensions */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <Package size={18} />
                        أبعاد الكرتونة
                    </h4>
                    <DimensionInputGroup
                        label=""
                        width={config.carton_width_cm}
                        depth={config.carton_depth_cm}
                        height={config.carton_height_cm}
                        onWidthChange={(v) => updateField('carton_width_cm', v)}
                        onDepthChange={(v) => updateField('carton_depth_cm', v)}
                        onHeightChange={(v) => updateField('carton_height_cm', v)}
                        minWidth={CONFIG_LIMITS.carton.min}
                        maxWidth={CONFIG_LIMITS.carton.max}
                        minDepth={CONFIG_LIMITS.carton.min}
                        maxDepth={CONFIG_LIMITS.carton.max}
                        minHeight={CONFIG_LIMITS.carton.min}
                        maxHeight={CONFIG_LIMITS.carton.max}
                        error={cartonError}
                        disabled={isLoading || isSaving}
                    />
                </div>

                {/* Pallet Dimensions */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <Layers size={18} />
                        أبعاد البالتة
                    </h4>
                    <DimensionInputGroup
                        label=""
                        width={config.pallet_width_cm}
                        depth={config.pallet_depth_cm}
                        height={config.pallet_max_height_cm}
                        onWidthChange={(v) => updateField('pallet_width_cm', v)}
                        onDepthChange={(v) => updateField('pallet_depth_cm', v)}
                        onHeightChange={(v) => updateField('pallet_max_height_cm', v)}
                        minWidth={CONFIG_LIMITS.pallet.min}
                        maxWidth={CONFIG_LIMITS.pallet.max}
                        minDepth={CONFIG_LIMITS.pallet.min}
                        maxDepth={CONFIG_LIMITS.pallet.max}
                        minHeight={CONFIG_LIMITS.palletHeight.min}
                        maxHeight={CONFIG_LIMITS.palletHeight.max}
                        error={palletError}
                        disabled={isLoading || isSaving}
                    />
                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <Info size={12} />
                        البالتة الأوروبية القياسية: 120 × 100 سم
                    </p>
                </div>

                {/* Stacking Configuration */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Layers size={18} />
                        إعدادات الرص
                    </h4>

                    {/* Cartons per layer & Number of layers */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">
                                عدد الكراتين في الطبقة
                            </label>
                            <input
                                type="number"
                                value={config.cartons_per_layer}
                                onChange={(e) => updateField('cartons_per_layer', Number(e.target.value))}
                                min={CONFIG_LIMITS.cartonsPerLayer.min}
                                max={CONFIG_LIMITS.cartonsPerLayer.max}
                                disabled={isLoading || isSaving}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                    stackingError ? 'border-red-300' : 'border-gray-300'
                                }`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">
                                عدد الطبقات
                            </label>
                            <input
                                type="number"
                                value={config.number_of_layers}
                                onChange={(e) => updateField('number_of_layers', Number(e.target.value))}
                                min={CONFIG_LIMITS.numberOfLayers.min}
                                max={CONFIG_LIMITS.numberOfLayers.max}
                                disabled={isLoading || isSaving}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                    stackingError ? 'border-red-300' : 'border-gray-300'
                                }`}
                            />
                        </div>
                    </div>

                    {stackingError && (
                        <p className="text-xs text-red-600">{stackingError}</p>
                    )}

                    {/* Total Summary */}
                    <div className={`p-3 rounded-lg ${exceedsMaxHeight ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                        <div className="flex justify-between items-center">
                            <span className={exceedsMaxHeight ? 'text-red-700' : 'text-green-700'}>
                                إجمالي الكراتين:
                            </span>
                            <span className={`font-bold text-lg ${exceedsMaxHeight ? 'text-red-700' : 'text-green-700'}`}>
                                {totalCartons} كرتونة
                            </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <span className={`text-sm ${exceedsMaxHeight ? 'text-red-600' : 'text-green-600'}`}>
                                الارتفاع الإجمالي:
                            </span>
                            <span className={`text-sm ${exceedsMaxHeight ? 'text-red-600' : 'text-green-600'}`}>
                                {totalHeight} سم
                                {exceedsMaxHeight && ' (يتجاوز الحد الأقصى!)'}
                            </span>
                        </div>
                    </div>

                    {/* Alternate layers toggle */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.alternate_layers}
                            onChange={(e) => updateField('alternate_layers', e.target.checked)}
                            disabled={isLoading || isSaving}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                            <span className="text-sm font-medium text-gray-700">
                                تبديل تلقائي بين الطبقات
                            </span>
                            <p className="text-xs text-gray-500">
                                تدوير الكراتين 90° في كل طبقة لزيادة الثبات
                            </p>
                        </div>
                    </label>

                    {/* Stacking Pattern */}
                    <StackingPatternSelector
                        value={config.base_pattern}
                        onChange={(v) => updateField('base_pattern', v)}
                        disabled={isLoading || isSaving}
                    />

                    {/* Smart Suggestion */}
                    <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-3 bg-slate-50">
                        <div className="text-sm font-medium text-gray-800 mb-2">نظام الاقتراح الذكي</div>
                        <div className="text-[11px] text-gray-600 mb-2">
                            يعتمد الاقتراح على عدد الطبقات الحالي: {config.number_of_layers}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">الهدف</label>
                                <select
                                    value={suggestGoal}
                                    onChange={(e) => setSuggestGoal(e.target.value as SuggestGoal)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-white"
                                    disabled={isLoading || isSaving}
                                >
                                    <option value="max_capacity">أقصى عدد</option>
                                    <option value="balanced">توازن</option>
                                    <option value="max_stability">أقصى ثبات</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">خلط الاتجاهات</label>
                                <select
                                    value={allowMixing ? 'yes' : 'no'}
                                    onChange={(e) => setAllowMixing(e.target.value === 'yes')}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-white"
                                    disabled={isLoading || isSaving}
                                >
                                    <option value="yes">مسموح</option>
                                    <option value="no">غير مسموح</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">طريقة التطبيق</label>
                                <select
                                    value={applyMode}
                                    onChange={(e) => setApplyMode(e.target.value as SuggestApplyMode)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-white"
                                    disabled={isLoading || isSaving}
                                >
                                    <option value="apply">تطبيق مباشر</option>
                                    <option value="list">عرض اقتراحات</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const list = buildSuggestions();
                                    if (applyMode === 'apply') {
                                        if (list.length > 0) {
                                            applySuggestion(list[0]);
                                        } else {
                                            setSuggestions([]);
                                        }
                                    } else {
                                        setSuggestions(list.slice(0, 3));
                                    }
                                }}
                                disabled={isLoading || isSaving}
                                className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                                اقتراح أفضل رص
                            </button>
                            {applyMode === 'apply' && (
                                <span className="text-[11px] text-gray-500">سيتم تطبيق أفضل اقتراح تلقائيًا</span>
                            )}
                        </div>

                        {applyMode === 'list' && suggestions.length === 0 && (
                            <p className="mt-2 text-[11px] text-gray-500">لا توجد اقتراحات صالحة بالأبعاد الحالية.</p>
                        )}

                        {applyMode === 'list' && suggestions.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {suggestions.map((s, index) => (
                                    <div key={`${s.basePattern}-${index}`} className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-2 py-1.5">
                                        <div className="text-[11px] text-gray-700">
                                            <span className="font-medium">{STACKING_PATTERNS[s.basePattern].ar}</span>
                                            <span className="mx-1">•</span>
                                            <span>{s.cartonsPerLayer} كرتونة/طبقة</span>
                                            <span className="mx-1">•</span>
                                            <span>{s.numberOfLayers} طبقات</span>
                                            <span className="mx-1">•</span>
                                            <span>إجمالي {s.totalCartons}</span>
                                            {s.alternateLayers && <span className="mx-1">•</span>}
                                            {s.alternateLayers && <span>تناوب طبقات</span>}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => applySuggestion(s)}
                                            className="px-2 py-1 text-[11px] rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
                                        >
                                            تطبيق
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Shelf Life Variable */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                    <h4 className="font-medium text-gray-900">مدة الصلاحية (من SOP)</h4>
                    {!sopLoaded ? (
                        <p className="text-sm text-gray-500">جاري التحقق من SOP المرتبط بالمنتج...</p>
                    ) : !sopDocumentId ? (
                        <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                            لا يوجد SOP مرتبط بهذا المنتج. اربط SOP من صفحة إدارة المنتجات أولاً.
                        </div>
                    ) : loadingVariables ? (
                        <p className="text-sm text-gray-500">جاري تحميل متغيرات SOP...</p>
                    ) : sopVariables.length === 0 ? (
                        <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                            لا توجد متغيرات في SOP المرتبط بهذا المنتج.
                        </div>
                    ) : (
                        <>
                            <select
                                value={config.shelf_life_variable_id || ''}
                                onChange={(e) => updateField('shelf_life_variable_id', e.target.value || null)}
                                disabled={isLoading || isSaving}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- بدون تحديد --</option>
                                {sopVariables.map(variable => (
                                    <option key={variable.id} value={variable.id}>
                                        {variable.name}
                                        {variable.value ? ` (${variable.value}${variable.unit ? ` ${variable.unit}` : ''})` : ''}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500">
                                سيتم استخدام قيمة هذا المتغير لحساب تاريخ الانتهاء (بالشهور).
                            </p>
                        </>
                    )}
                </div>

                {/* Notes */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        ملاحظات (اختياري)
                    </label>
                    <textarea
                        value={config.notes || ''}
                        onChange={(e) => updateField('notes', e.target.value)}
                        rows={2}
                        disabled={isLoading || isSaving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="أي ملاحظات خاصة بهذا المنتج..."
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={isLoading || isSaving || errors.length > 0}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Save size={18} />
                        {isSaving ? 'جاري الحفظ...' : 'حفظ التخصيصات'}
                    </button>
                    <button
                        onClick={handleReset}
                        disabled={isLoading || isSaving}
                        className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        <RotateCcw size={18} />
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={isSaving}
                        className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        إلغاء
                    </button>
                </div>
            </div>

            {/* Visualization Section */}
            <div className="lg:w-[400px] xl:w-[500px]">
                <div className="sticky top-4 bg-white rounded-lg border border-gray-200 p-4">
                    <h4 className="font-medium text-gray-900 mb-4 text-center">
                        معاينة البالتة
                    </h4>
                    <PalletStackingVisualizer
                        palletWidth={config.pallet_width_cm}
                        palletDepth={config.pallet_depth_cm}
                        cartonWidth={config.carton_width_cm}
                        cartonDepth={config.carton_depth_cm}
                        cartonHeight={config.carton_height_cm}
                        cartonsPerLayer={config.cartons_per_layer}
                        numberOfLayers={config.number_of_layers}
                        alternateLayers={config.alternate_layers}
                        basePattern={config.base_pattern}
                    />
                </div>
            </div>
        </div>
    );
}
