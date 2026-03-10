/**
 * Production Registration Component
 * Main component for registering pallets during production
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePalletStore } from '../../store/palletStore';
import { useCompanyStore } from '../../store/companyStore';
import { useTabsStore } from '../../store/tabsStore';
import { palletBatchService } from '../../services/palletBatchService';
import { supabase } from '../../config/supabase';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Save, X, Printer, ArrowRight, Loader2, AlertCircle, Search } from 'lucide-react';
import PalletStatusBadge from './PalletStatusBadge';
import PrintDialog from './PrintDialog';

interface BatchOption {
    id: string;
    batch_number: string;
    status?: string;
    production_date?: string;
    form_instance_id?: string | null;
    pallets_count?: number;
}

interface RecentBatch {
    company_id: string;
    product_id: string;
    batch_number: string;
    product_name?: string;
    last_used_at: string;
}

const RECENT_BATCHES_KEY = 'pallet_recent_batches_v1';
const MAX_RECENT_BATCHES = 8;

const loadRecentBatches = (companyId: string): RecentBatch[] => {
    try {
        const stored = localStorage.getItem(RECENT_BATCHES_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored) as RecentBatch[];
        return parsed
            .filter(item => item.company_id === companyId)
            .sort((a, b) => new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime());
    } catch (err) {
        console.error('Failed to load recent batches:', err);
        return [];
    }
};

const saveRecentBatch = (batch: RecentBatch): RecentBatch[] => {
    try {
        const stored = localStorage.getItem(RECENT_BATCHES_KEY);
        const parsed = stored ? (JSON.parse(stored) as RecentBatch[]) : [];
        const filtered = parsed.filter(
            item => !(item.company_id === batch.company_id && item.batch_number === batch.batch_number)
        );
        const next = [batch, ...filtered].slice(0, MAX_RECENT_BATCHES);
        localStorage.setItem(RECENT_BATCHES_KEY, JSON.stringify(next));
        return next;
    } catch (err) {
        console.error('Failed to save recent batch:', err);
        return [];
    }
};

const BATCH_STATUS_LABELS: Record<string, string> = {
    active: 'نشطة',
    completed: 'مكتملة',
    cancelled: 'ملغاة',
};

// Inline error message component
const FormError = ({ message }: { message: string | null }) => {
    if (!message) return null;
    return (
        <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
            <AlertCircle size={14} />
            <span>{message}</span>
        </div>
    );
};

const getLocalDateTimeValue = (date: Date = new Date()) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

export default function ProductionRegistration() {
    const navigate = useNavigate();
    const { openTab } = useTabsStore();
    const { selectedCompanyId } = useCompanyStore();
    const {
        currentSession,
        nextPalletNumber,
        setSession,
        registerPallet,
        loading,
        error,
    } = usePalletStore();

    const [showForm, setShowForm] = useState(false);
    const [cartons, setCartons] = useState<number>(0);
    const [isPartial, setIsPartial] = useState(false);
    const [notes, setNotes] = useState('');
    const [finishedAt, setFinishedAt] = useState<string>(getLocalDateTimeValue());

    const [showPrintDialog, setShowPrintDialog] = useState(false);
    const [lastRegisteredPallet, setLastRegisteredPallet] = useState<any>(null);

    // Continue Mode State
    const [registrationMode, setRegistrationMode] = useState<'new' | 'continue'>('new');
    const [partialPallets, setPartialPallets] = useState<any[]>([]);
    const [loadingPartials, setLoadingPartials] = useState(false);
    const [continuePalletId, setContinuePalletId] = useState<string | null>(null);

    // Session setup state
    const [setupMode, setSetupMode] = useState(() => !currentSession);
    const [productId, setProductId] = useState('');
    const [batchNumber, setBatchNumber] = useState('');
    const [shift, setShift] = useState<'A' | 'B' | 'C'>('A');
    const [products, setProducts] = useState<{ id: string; name: string; name_ar?: string }[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [recentBatches, setRecentBatches] = useState<RecentBatch[]>([]);
    const [showBatchDropdown, setShowBatchDropdown] = useState(false);
    const batchDropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (setupMode && selectedCompanyId) {
            fetchProducts();
        }
    }, [setupMode, selectedCompanyId]);

    useEffect(() => {
        if (setupMode && selectedCompanyId) {
            setRecentBatches(loadRecentBatches(selectedCompanyId));
        }
    }, [setupMode, selectedCompanyId]);

    useEffect(() => {
        if (currentSession?.standard_cartons_per_pallet) {
            setCartons(currentSession.standard_cartons_per_pallet);
        }
    }, [currentSession?.standard_cartons_per_pallet]);

    useEffect(() => {
        setSetupMode(!currentSession);
    }, [currentSession]);

    const fetchPartialPallets = async () => {
        if (!currentSession?.product_id) return;

        try {
            setLoadingPartials(true);
            const { data, error } = await supabase
                .from('pallets')
                .select('*, batch:pallet_batches(batch_number)')
                .eq('product_id', currentSession.product_id)
                .eq('status', 'partial') // Only partials
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPartialPallets(data || []);
        } catch (err) {
            console.error('Error fetching partials:', err);
        } finally {
            setLoadingPartials(false);
        }
    };

    const fetchProducts = async () => {
        try {
            setLoadingProducts(true);
            const { data, error } = await supabase
                .from('products')
                .select('id, name')
                .eq('company_id', selectedCompanyId);

            if (error) throw error;
            setProducts(data || []);
        } catch (err) {
            console.error('Error fetching products:', err);
        } finally {
            setLoadingProducts(false);
        }
    };

    // Batch selection state
    const [availableBatches, setAvailableBatches] = useState<BatchOption[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

    // Form validation errors
    const [formErrors, setFormErrors] = useState<{
        product?: string;
        batch?: string;
        shift?: string;
        cartons?: string;
        general?: string;
    }>({});

    // Clear specific error when field changes
    const clearError = (field: keyof typeof formErrors) => {
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    useEffect(() => {
        if (selectedCompanyId && productId) {
            fetchBatches();
        } else {
            setAvailableBatches([]);
        }
    }, [selectedCompanyId, productId]);

    const normalizedBatchQuery = useMemo(() => batchNumber.trim().toLowerCase(), [batchNumber]);
    const filteredBatches = useMemo(() => {
        if (!normalizedBatchQuery) return availableBatches;
        return availableBatches.filter(batch =>
            batch.batch_number.toLowerCase().includes(normalizedBatchQuery)
        );
    }, [availableBatches, normalizedBatchQuery]);
    const hasExactBatchMatch = useMemo(
        () => availableBatches.some(batch => batch.batch_number.toLowerCase() === normalizedBatchQuery),
        [availableBatches, normalizedBatchQuery]
    );

    useEffect(() => {
        if (!showBatchDropdown) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (!batchDropdownRef.current) return;
            if (!batchDropdownRef.current.contains(event.target as Node)) {
                setShowBatchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showBatchDropdown]);

    const canDeleteBatch = (batch: BatchOption) =>
        batch.status === 'active' && (batch.pallets_count || 0) === 0;

    const handleDeleteBatch = async (batch: BatchOption) => {
        if (!selectedCompanyId) return;
        if (!batch.id) return;
        if (!window.confirm(`هل تريد حذف التشغيلة ${batch.batch_number}؟`)) return;

        try {
            setDeletingBatchId(batch.id);

            const { count, error: countError } = await supabase
                .from('pallets')
                .select('id', { count: 'exact', head: true })
                .eq('batch_id', batch.id);

            if (countError) throw countError;

            if ((count || 0) > 0) {
                alert('لا يمكن حذف هذه التشغيلة لأنها تحتوي على بالتات مسجلة.');
                return;
            }

            const { error: deleteError } = await supabase
                .from('pallet_batches')
                .delete()
                .eq('id', batch.id)
                .eq('company_id', selectedCompanyId);

            if (deleteError) throw deleteError;

            setAvailableBatches((prev) => prev.filter((item) => item.id !== batch.id));
            if (batchNumber === batch.batch_number) {
                setBatchNumber('');
            }
        } catch (err) {
            console.error('Failed to delete batch:', err);
            alert('تعذر حذف التشغيلة. يرجى المحاولة مرة أخرى.');
        } finally {
            setDeletingBatchId(null);
        }
    };

    const fetchBatches = async () => {
        if (!selectedCompanyId || !productId) return;
        setLoadingBatches(true);
        try {
            const { data, error } = await supabase
                .from('pallet_batches')
                .select('id, batch_number, status, production_date, created_at, form_instance_id, pallets(count)')
                .eq('company_id', selectedCompanyId)
                .eq('product_id', productId)
                .order('created_at', { ascending: false })
                .limit(200);

            if (error) throw error;

            const normalized = (data || []).map((batch: any) => ({
                id: batch.id,
                batch_number: batch.batch_number,
                status: batch.status,
                production_date: batch.production_date,
                form_instance_id: batch.form_instance_id ?? null,
                pallets_count: Array.isArray(batch.pallets) && batch.pallets.length > 0
                    ? Number(batch.pallets[0]?.count ?? 0)
                    : 0,
            })) as BatchOption[];

            setAvailableBatches(normalized);
        } catch (error) {
            console.error('Error fetching batches:', error);
        } finally {
            setLoadingBatches(false);
        }
    };

    // Shift selection state
    const [availableShifts, setAvailableShifts] = useState<string[]>([]);
    const [loadingShifts, setLoadingShifts] = useState(false);

    useEffect(() => {
        if (selectedCompanyId && batchNumber) {
            fetchShifts();
        } else {
            setAvailableShifts([]);
            setShift('A'); // Reset or keep?
        }
    }, [selectedCompanyId, batchNumber]);

    const fetchShifts = async () => {
        if (!selectedCompanyId || !batchNumber) return;
        setLoadingShifts(true);
        try {
            const shifts = await palletBatchService.getShiftsForBatchReports(selectedCompanyId, batchNumber);
            if (shifts.length > 0) {
                setAvailableShifts(shifts);
                setShift(shifts[0] as any);
            } else {
                setAvailableShifts(['A', 'B', 'C']);
                setShift('A');
            }
        } catch (error) {
            console.error('Error fetching shifts:', error);
            setAvailableShifts(['A', 'B', 'C']);
            setShift('A');
        } finally {
            setLoadingShifts(false);
        }
    };

    const [startingSession, setStartingSession] = useState(false);
    const openPalletTrackingTab = useCallback((session?: { batch_number?: string; shift?: string }) => {
        const batchLabel = session?.batch_number ? ` • ${session.batch_number}` : '';
        const shiftLabel = session?.shift ? ` • ${session.shift}` : '';
        openTab(
            'settings',
            `pallet-tracking-${selectedCompanyId || 'global'}`,
            `نظام تتبع البالتات${batchLabel}${shiftLabel}`,
            '/pallet/production',
            '/pallet'
        );
    }, [openTab, selectedCompanyId]);

    const handleStartSession = async () => {
        const finalBatchNumber = batchNumber.trim();

        // Validate all fields
        const errors: typeof formErrors = {};
        if (!productId) {
            errors.product = 'يرجى اختيار المنتج';
        }
        if (!finalBatchNumber) {
            errors.batch = 'يرجى اختيار أو إدخال رقم الباتش';
        }
        if (!shift || (availableShifts.length > 0 && !availableShifts.includes(shift))) {
            errors.shift = 'يرجى اختيار الوردية';
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormErrors({});
        setStartingSession(true);

        try {
            const response = await palletBatchService.createSession({
                company_id: selectedCompanyId!,
                product_id: productId,
                batch_number: finalBatchNumber,
                shift,
                use_existing_batch: true,
            });

            setSession(response.session, response.next_pallet_number);
            setSetupMode(false);

            const productName = products.find(p => p.id === productId)?.name;
            const updatedRecents = saveRecentBatch({
                company_id: selectedCompanyId!,
                product_id: productId,
                product_name: productName,
                batch_number: finalBatchNumber,
                last_used_at: new Date().toISOString(),
            });
            setRecentBatches(updatedRecents.filter(item => item.company_id === selectedCompanyId));
        } catch (err) {
            console.error('Failed to start session:', err);
            setFormErrors({ general: 'فشل بدء الجلسة. يرجى المحاولة مرة أخرى.' });
        } finally {
            setStartingSession(false);
        }
    };

    useEffect(() => {
        if (!setupMode && currentSession) {
            openPalletTrackingTab(currentSession);
        }
    }, [setupMode, currentSession, openPalletTrackingTab]);

    const handleRegisterPallet = async (shouldPrint = false) => {
        // Validate cartons
        const maxCartons = currentSession?.standard_cartons_per_pallet ?? 0;
        if (!cartons || cartons <= 0) {
            setFormErrors({ cartons: 'يرجى إدخال عدد الكراتين' });
            return;
        }
        if (cartons > maxCartons) {
            setFormErrors({ cartons: `الحد الأقصى للكراتين هو ${maxCartons}` });
            return;
        }

        // For continue mode, check if exceeding target
        if (continuePalletId) {
            const targetPallet = partialPallets.find(p => p.id === continuePalletId);
            if (targetPallet) {
                const remaining = targetPallet.target_cartons - targetPallet.actual_cartons;
                if (cartons > remaining) {
                    setFormErrors({ cartons: `الحد الأقصى المتبقي هو ${remaining} كرتونة` });
                    return;
                }
            }
        }

        setFormErrors({});

        try {
            const parsedFinishedAt = finishedAt ? new Date(finishedAt) : null;
            const finishedAtIso =
                parsedFinishedAt && !Number.isNaN(parsedFinishedAt.getTime())
                    ? parsedFinishedAt.toISOString()
                    : new Date().toISOString();

            const response = await registerPallet({
                cartons,
                is_partial: isPartial,
                notes: notes || undefined,
                finished_at: finishedAtIso,
                continue_existing_pallet_id: continuePalletId || undefined,
            });

            // Set last registered for printing (only for new)
            if (response?.pallet && !continuePalletId) {
                setLastRegisteredPallet({
                    ...response.pallet,
                    batch_number: currentSession?.batch_number,
                    production_date: currentSession?.shift_date,
                    shift: currentSession?.shift
                });

                // Check Auto-Print Settings
                let triggerPrint = shouldPrint;
                if (!triggerPrint && selectedCompanyId) {
                    try {
                        const savedSettings = localStorage.getItem(`pallet_print_settings_${selectedCompanyId}`);
                        if (savedSettings) {
                            const settings = JSON.parse(savedSettings);
                            if (settings.auto_print_on_creation) {
                                triggerPrint = true;
                            }
                        }
                    } catch (e) {
                        console.error('Error reading print settings:', e);
                    }
                }

                if (triggerPrint) {
                    setShowPrintDialog(true);
                }
            }

            // Reset form
            setCartons(currentSession?.standard_cartons_per_pallet ?? 0);
            setNotes('');
            setFinishedAt(getLocalDateTimeValue());
            setShowForm(false);
            setContinuePalletId(null);

            // Refresh partials list if likely changed
            if (registrationMode === 'continue') {
                fetchPartialPallets();
            }
        } catch (err) {
            console.error('Failed to register/update pallet:', err);
            setFormErrors({ general: 'فشل تسجيل البالتة. يرجى المحاولة مرة أخرى.' });
        }
    };

    if (setupMode) {
        return (
            <div className="max-w-2xl mx-auto mt-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900">بدء جلسة تسجيل بالتات</h2>
                    </div>

                    {/* General Error */}
                    {formErrors.general && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                            <AlertCircle size={18} />
                            {formErrors.general}
                        </div>
                    )}

                    {recentBatches.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-slate-700">آخر التشغيلات المفتوحة</h3>
                                <span className="text-xs text-slate-400">اضغط للاختيار</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {recentBatches.map((batch) => {
                                    const productName = batch.product_name || products.find(p => p.id === batch.product_id)?.name;
                                    return (
                                        <button
                                            key={`${batch.company_id}-${batch.batch_number}`}
                                            type="button"
                                            onClick={() => {
                                                setProductId(batch.product_id);
                                                setBatchNumber(batch.batch_number);
                                                clearError('product');
                                                clearError('batch');
                                            }}
                                            className="px-3 py-2 text-xs border border-slate-200 bg-white rounded-lg hover:border-blue-300 hover:text-blue-700 transition-colors text-right"
                                        >
                                            <div className="font-semibold text-slate-800" dir="ltr">{batch.batch_number}</div>
                                            <div className="text-[10px] text-slate-500">{productName || 'منتج'}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                المنتج
                            </label>
                            <select
                                value={productId}
                                onChange={(e) => {
                                    setProductId(e.target.value);
                                    clearError('product');
                                }}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                    formErrors.product ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                                disabled={loadingProducts}
                            >
                                <option value="">اختر المنتج...</option>
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                            <FormError message={formErrors.product || null} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                رقم الباتش
                                {loadingBatches && <span className="text-xs text-blue-500 mr-2">جاري البحث...</span>}
                            </label>
                            <div className="relative" ref={batchDropdownRef}>
                                <input
                                    type="text"
                                    value={batchNumber}
                                    onChange={(e) => {
                                        setBatchNumber(e.target.value);
                                        clearError('batch');
                                        setShowBatchDropdown(true);
                                    }}
                                    onFocus={() => setShowBatchDropdown(true)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            setShowBatchDropdown(false);
                                        }
                                    }}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                        formErrors.batch ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                    }`}
                                    disabled={!productId || loadingBatches}
                                    placeholder="ابحث أو اكتب رقم الباتش"
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    {loadingBatches ? (
                                        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                                    ) : (
                                        <Search className="h-5 w-5 text-gray-400" />
                                    )}
                                </div>
                                {showBatchDropdown && productId && !loadingBatches && (
                                    <div className="absolute right-0 left-0 top-full mt-2 z-30 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                                        {filteredBatches.length === 0 && (
                                            <div className="px-3 py-2 text-sm text-slate-500">لا توجد تشغيلات مطابقة</div>
                                        )}

                                    {filteredBatches.map((batch) => (
                                        <div
                                            key={batch.batch_number}
                                            className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-slate-50 transition-colors"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setBatchNumber(batch.batch_number);
                                                    setShowBatchDropdown(false);
                                                }}
                                                className="flex-1 text-right"
                                            >
                                                <div className="text-sm font-semibold text-slate-800" dir="ltr">
                                                    {batch.batch_number}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {batch.status ? BATCH_STATUS_LABELS[batch.status] || batch.status : 'بدون حالة'}
                                                </div>
                                            </button>
                                            {canDeleteBatch(batch) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteBatch(batch)}
                                                    disabled={deletingBatchId === batch.id}
                                                    className="px-2 py-1 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                >
                                                    {deletingBatchId === batch.id ? '...' : 'حذف'}
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                        {normalizedBatchQuery && !hasExactBatchMatch && (
                                            <button
                                                type="button"
                                                onClick={() => setShowBatchDropdown(false)}
                                                className="w-full text-right px-3 py-2 border-t border-slate-100 hover:bg-blue-50 transition-colors"
                                            >
                                                <div className="text-sm font-semibold text-blue-700">
                                                    استخدام باتش جديد: <span dir="ltr">{batchNumber}</span>
                                                </div>
                                                <div className="text-xs text-slate-500">سيتم إنشاء/استخدام هذا الرقم مباشرة</div>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <FormError message={formErrors.batch || null} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                الوردية
                                {loadingShifts && <span className="text-xs text-blue-500 mr-2">جاري التحقق...</span>}
                            </label>
                            <div className="relative">
                                <select
                                    value={shift}
                                    onChange={(e) => {
                                        setShift(e.target.value as any);
                                        clearError('shift');
                                    }}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 ${
                                        formErrors.shift ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                    }`}
                                    disabled={!batchNumber || loadingShifts || availableShifts.length === 0}
                                >
                                    {availableShifts.length === 0 && (
                                        <option value="">
                                            {batchNumber ? 'لا توجد ورديات متاحة' : 'اختر الباتش أولاً'}
                                        </option>
                                    )}
                                    {availableShifts.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                {loadingShifts && (
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                                    </div>
                                )}
                            </div>
                            <FormError message={formErrors.shift || null} />
                        </div>

                        <button
                            onClick={handleStartSession}
                            disabled={startingSession}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {startingSession ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    جاري بدء الجلسة...
                                </>
                            ) : (
                                'بدء الجلسة'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{currentSession?.product_name}</h2>
                            <p className="text-sm text-gray-500">
                                {currentSession?.batch_number} - الوردية: {currentSession?.shift}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">البالتة التالية</p>
                        <p className="text-lg font-bold text-blue-600">{nextPalletNumber}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8 space-x-reverse" aria-label="Tabs">
                    <button
                        onClick={() => {
                            setRegistrationMode('new');
                            setContinuePalletId(null);
                        }}
                        className={`${registrationMode === 'new'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                        تسجيل جديد
                    </button>
                    <button
                        onClick={() => {
                            setRegistrationMode('continue');
                            fetchPartialPallets();
                        }}
                        className={`${registrationMode === 'continue'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                        استكمال وردية (بالتات جزئية)
                    </button>
                </nav>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {/* Continue Pallet List */}
            {registrationMode === 'continue' && !continuePalletId && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">اختر بالتة للاستكمال</h3>
                    {loadingPartials ? (
                        <div className="text-center py-8 text-gray-500">جاري تحميل البالتات الجزئية...</div>
                    ) : partialPallets.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {partialPallets.map(pallet => (
                                <div key={pallet.id} className="border rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors bg-white shadow-sm"
                                    onClick={() => {
                                        setContinuePalletId(pallet.id);
                                        setCartons(pallet.target_cartons - pallet.actual_cartons); // Default to filling it
                                        setFinishedAt(getLocalDateTimeValue());
                                        setShowForm(true);
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-gray-900">{pallet.pallet_number}</span>
                                        <PalletStatusBadge status={pallet.status} size="sm" />
                                    </div>
                                    <div className="text-sm text-gray-600 mb-2">
                                        <div className="flex justify-between">
                                            <span>الحالية:</span>
                                            <span className="font-bold">{pallet.actual_cartons}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>المستهدفة:</span>
                                            <span className="font-bold text-gray-900">{pallet.target_cartons}</span>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-400">
                                            من تشغيلة: {pallet.batch?.batch_number || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                        <div
                                            className="bg-orange-500 h-2 rounded-full"
                                            style={{ width: `${(pallet.actual_cartons / pallet.target_cartons) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
                            لا توجد بالتات جزئية للمنتج الحالي
                        </div>
                    )}
                </div>
            )}

            {/* Registration Form */}
            {(showForm || (registrationMode === 'continue' && continuePalletId)) ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                        {registrationMode === 'continue' ? 'إضافة كراتين للبالتة' : 'تسجيل بالتة جديدة'}
                    </h3>

                    {registrationMode === 'continue' && continuePalletId && (
                        <div className="bg-blue-50 p-2 rounded-lg mb-2 text-[11px] text-blue-800 flex justify-between items-center">
                            <span>جاري الاستكمال على البالتة: <strong>{partialPallets.find(p => p.id === continuePalletId)?.pallet_number}</strong></span>
                            <button onClick={() => setContinuePalletId(null)} className="text-blue-600 hover:text-blue-800 underline text-xs">تغيير</button>
                        </div>
                    )}

                    {/* Registration Form Errors */}
                    {formErrors.general && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1.5 rounded-lg mb-2 flex items-center gap-2 text-xs">
                            <AlertCircle size={14} />
                            {formErrors.general}
                        </div>
                    )}

                    <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-wrap items-start gap-2 max-w-[720px] ml-auto flex-1">
                            <div className="w-[150px]">
                                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                                    {registrationMode === 'continue' ? 'عدد الكراتين المضافة' : 'عدد الكراتين'}
                                </label>
                                <input
                                    type="number"
                                    value={cartons}
                                    onChange={(e) => {
                                        setCartons(Number(e.target.value));
                                        clearError('cartons');
                                    }}
                                    min="1"
                                    max={currentSession?.standard_cartons_per_pallet ?? undefined}
                                    className={`w-full h-8 px-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 ${
                                        formErrors.cartons ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                    }`}
                                />
                                <FormError message={formErrors.cartons || null} />
                                <p className="text-xs text-gray-500 mt-0.5">
                                    الحد الأقصى: {currentSession?.standard_cartons_per_pallet ?? '-'} كرتونة
                                </p>
                            </div>

                            <div className="w-[170px]">
                                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                                    وقت انتهاء البالتة
                                </label>
                                <input
                                    type="datetime-local"
                                    value={finishedAt}
                                    onChange={(e) => setFinishedAt(e.target.value)}
                                    className="w-full h-8 px-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-0.5">
                                    يمكنك تعديل وقت الانتهاء يدوياً قبل الحفظ
                                </p>
                            </div>

                            <div className="w-[170px]">
                                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                                    ملاحظات (اختياري)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={1}
                                    className="w-full min-h-0 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {registrationMode === 'new' && (
                                <div className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        id="isPartial"
                                        checked={isPartial}
                                        onChange={(e) => setIsPartial(e.target.checked)}
                                        className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="isPartial" className="text-sm text-gray-700">
                                        بالتة جزئية (لن يتم إضافة كراتين أخرى)
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 w-[150px] self-start">
                            <button
                                onClick={() => handleRegisterPallet(false)}
                                disabled={loading}
                                className="w-full bg-green-600 text-white px-2.5 py-1.5 text-sm rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        جاري التسجيل...
                                    </>
                                ) : (
                                    <>
                                        <Save size={14} />
                                        {registrationMode === 'continue' ? 'حفظ الإضافة' : 'حفظ'}
                                    </>
                                )}
                            </button>
                            {registrationMode === 'new' && (
                                <button
                                    onClick={() => handleRegisterPallet(true)}
                                    disabled={loading}
                                    className="w-full bg-blue-600 text-white px-2.5 py-1.5 text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            جاري الحفظ...
                                        </>
                                    ) : (
                                        <>
                                            <Printer size={14} />
                                            حفظ وطباعة
                                        </>
                                    )}
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setShowForm(false);
                                    setFormErrors({});
                                    if (registrationMode === 'continue') setContinuePalletId(null);
                                }}
                                disabled={loading}
                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                <X size={14} />
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                registrationMode === 'new' && (
                    <button
                        onClick={() => {
                            setFinishedAt(getLocalDateTimeValue());
                            setShowForm(true);
                        }}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mb-6"
                    >
                        <Plus size={20} />
                        تسجيل بالتة جديدة
                    </button>
                )
            )}

            {/* Registered Pallets */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    البالتات المسجلة ({currentSession?.registered_pallets.length || 0})
                </h3>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">رقم البالتة</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">الكراتين</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">الحالة</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">وقت انتهاء البالتة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                            {currentSession?.registered_pallets.slice().reverse().map((pallet) => (
                                    <tr key={pallet.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                            {pallet.pallet_number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                            {pallet.actual_cartons} / {pallet.target_cartons}
                                            <span className="text-xs text-gray-500 mr-2">
                                                ({Math.round((pallet.actual_cartons / pallet.target_cartons) * 100)}%)
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <PalletStatusBadge status={pallet.status} size="sm" />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <span>
                                                    {pallet.finished_at || pallet.completed_at
                                                        ? new Date(pallet.finished_at || pallet.completed_at!).toLocaleTimeString('ar-EG')
                                                        : '-'}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setLastRegisteredPallet({
                                                            ...pallet,
                                                            batch_number: currentSession?.batch_number,
                                                            production_date: currentSession?.shift_date,
                                                            shift: currentSession?.shift
                                                        });
                                                        setShowPrintDialog(true);
                                                    }}
                                                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors"
                                                    title="طباعة الملصق"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(!currentSession?.registered_pallets || currentSession.registered_pallets.length === 0) && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            لا توجد بالتات مسجلة في هذه الجلسة
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Print Dialog */}
            <PrintDialog
                isOpen={showPrintDialog}
                onClose={() => setShowPrintDialog(false)}
                pallet={lastRegisteredPallet}
            />
        </div>
    );
}
