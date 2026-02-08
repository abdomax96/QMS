/**
 * Quality Hold Management Component
 * Manages pallet holds and NCR disposition
 */

import { useState, useEffect } from 'react';
import { useCompanyStore } from '../../store/companyStore';
import { holdService } from '../../services/holdService';
import type { PalletHold, DispositionType } from '../../types/pallet';
import { AlertTriangle, CheckCircle, XCircle, RotateCw, Loader2, AlertCircle } from 'lucide-react';

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

// Success message component
const SuccessMessage = ({ message, onClose }: { message: string; onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <CheckCircle size={18} />
                {message}
            </div>
            <button onClick={onClose} className="text-green-500 hover:text-green-700">&times;</button>
        </div>
    );
};


export default function QualityHoldManagement() {
    const { selectedCompanyId } = useCompanyStore();
    const [activeHolds, setActiveHolds] = useState<PalletHold[]>([]);
    const [selectedHold, setSelectedHold] = useState<PalletHold | null>(null);
    const [loading, setLoading] = useState(false);

    const [dispositionType, setDispositionType] = useState<DispositionType>('accept');
    const [quantity, setQuantity] = useState(0);
    const [notes, setNotes] = useState('');

    // Batch Hold State
    const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
    const [selectedBatch, setSelectedBatch] = useState('');
    const [selectedShift, setSelectedShift] = useState('');
    const [availableShifts, setAvailableShifts] = useState<string[]>([]);
    const [loadingShifts, setLoadingShifts] = useState(false);

    const [holdReason, setHoldReason] = useState('');
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [availableBatches, setAvailableBatches] = useState<any[]>([]);

    // Form errors and success messages
    const [formErrors, setFormErrors] = useState<{
        batch?: string;
        reason?: string;
        range?: string;
        quantity?: string;
        general?: string;
    }>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Escape key handler for modal
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && selectedHold) {
                setSelectedHold(null);
                setQuantity(0);
                setNotes('');
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [selectedHold]);

    const clearError = (field: keyof typeof formErrors) => {
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    useEffect(() => {
        loadActiveHolds();
        if (selectedCompanyId) loadBatches();
    }, [selectedCompanyId]);

    // Load shifts when batch changes
    useEffect(() => {
        if (selectedBatch && selectedCompanyId) {
            loadShiftsForBatch();
        } else {
            setAvailableShifts([]);
            setSelectedShift('');
        }
    }, [selectedBatch, selectedCompanyId]);

    const loadBatches = async () => {
        if (!selectedCompanyId) return;
        try {
            const { palletBatchService } = await import('../../services/palletBatchService');
            const batches = await palletBatchService.getActiveBatches(selectedCompanyId);
            setAvailableBatches(batches);
        } catch (error) {
            console.error('Error loading batches:', error);
        }
    };

    const loadShiftsForBatch = async () => {
        if (!selectedCompanyId || !selectedBatch) return;
        try {
            setLoadingShifts(true);
            const { palletBatchService } = await import('../../services/palletBatchService');
            const shifts = await palletBatchService.getShiftsForBatchReports(selectedCompanyId, selectedBatch);
            setAvailableShifts(shifts);
        } catch (error) {
            console.error('Error loading shifts:', error);
        } finally {
            setLoadingShifts(false);
        }
    };

    const handleBatchHold = async () => {
        // Validate inputs
        const errors: typeof formErrors = {};

        if (!selectedBatch) {
            errors.batch = 'يرجى اختيار الباتش';
        }
        if (!holdReason.trim()) {
            errors.reason = 'يرجى إدخال سبب الحجز';
        }

        // Validate range if both provided
        if (rangeStart && rangeEnd) {
            const start = parseInt(rangeStart);
            const end = parseInt(rangeEnd);
            if (start > end) {
                errors.range = 'رقم البداية يجب أن يكون أقل من أو يساوي رقم النهاية';
            }
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormErrors({});

        try {
            setLoading(true);

            const range = {
                start: rangeStart ? parseInt(rangeStart) : undefined,
                end: rangeEnd ? parseInt(rangeEnd) : undefined
            };

            const result = await holdService.holdBatchRange(
                selectedCompanyId!,
                selectedBatch,
                range,
                holdReason,
                undefined,
                selectedShift || undefined
            );

            // Reset and go to list
            setSelectedBatch('');
            setSelectedShift('');
            setHoldReason('');
            setRangeStart('');
            setRangeEnd('');
            setActiveTab('list');
            setSuccessMessage(`تم حجز ${result.held_count} بالتة بنجاح ${result.failed_count > 0 ? `(${result.failed_count} فشل)` : ''}`);
            loadActiveHolds();

        } catch (error) {
            console.error('Batch hold failed:', error);
            setFormErrors({ general: 'فشل عملية الحجز الجماعي. يرجى المحاولة مرة أخرى.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadActiveHolds();
    }, [selectedCompanyId]);

    const loadActiveHolds = async () => {
        if (!selectedCompanyId) return;

        try {
            setLoading(true);
            const holds = await holdService.getCompanyActiveHolds(selectedCompanyId);
            setActiveHolds(holds);
        } catch (err) {
            console.error('Failed to load holds:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleResolveHold = async () => {
        // Validate quantity
        if (!selectedHold) return;

        if (quantity <= 0) {
            setFormErrors({ quantity: 'يرجى إدخال كمية صحيحة' });
            return;
        }

        if (quantity > selectedHold.hold_quantity) {
            setFormErrors({ quantity: `الحد الأقصى هو ${selectedHold.hold_quantity} كرتونة` });
            return;
        }

        setFormErrors({});

        try {
            setLoading(true);

            await holdService.resolveHold({
                hold_id: selectedHold.id,
                disposition_type: dispositionType,
                scrapped_quantity: dispositionType === 'scrap' ? quantity : 0,
                accepted_quantity: dispositionType === 'accept' ? quantity : 0,
                reworked_quantity: dispositionType === 'rework' ? quantity : 0,
                disposition_notes: notes || undefined,
            });

            // Reset form
            setSelectedHold(null);
            setQuantity(0);
            setNotes('');

            // Reload holds
            await loadActiveHolds();

            setSuccessMessage('تم فرز الحجز بنجاح');
        } catch (err) {
            console.error('Failed to resolve hold:', err);
            setFormErrors({ general: 'فشل فرز الحجز. يرجى المحاولة مرة أخرى.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">إدارة الحجز</h1>
                <div className="flex space-x-2 space-x-reverse">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-2 rounded-lg ${activeTab === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        قائمة الحجوزات
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`px-4 py-2 rounded-lg ${activeTab === 'create' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        حجز جديد (Batch Hold)
                    </button>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <SuccessMessage message={successMessage} onClose={() => setSuccessMessage(null)} />
            )}

            {/* Active Holds Table */}
            {activeTab === 'list' && (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        الحجوزات النشطة ({activeHolds.length})
                    </h2>
                    <div className="bg-white rounded-lg shadow-sm border border-yellow-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-yellow-50 text-yellow-800">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">رقم البالتة</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">المنتج</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">الكمية المحجوزة</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">سبب الحجز</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">رقم NCR</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-yellow-100">
                                    {activeHolds.map((hold) => (
                                        <tr key={hold.id} className="hover:bg-yellow-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                {(hold as any).pallet?.pallet_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                {(hold as any).pallet?.product?.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-red-600">
                                                {hold.hold_quantity} كرتونة
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {hold.hold_reason || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-mono">
                                                {hold.ncr_id || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => {
                                                        setSelectedHold(hold);
                                                        setQuantity(hold.hold_quantity);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                                                >
                                                    <RotateCw size={14} />
                                                    فرز
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {activeHolds.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                لا توجد حجوزات نشطة حالياً
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Hold Tab */}
            {activeTab === 'create' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6">حجز نطاق من البالتات (Batch Hold)</h2>

                    {/* General Error */}
                    {formErrors.general && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                            <AlertCircle size={18} />
                            {formErrors.general}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">رقم الباتش</label>
                            <select
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                    formErrors.batch ? 'border-red-500 bg-red-50' : 'border-blue-300'
                                }`}
                                value={selectedBatch}
                                onChange={(e) => {
                                    setSelectedBatch(e.target.value);
                                    clearError('batch');
                                }}
                            >
                                <option value="">اختر الباتش...</option>
                                {availableBatches.map((b: any) => (
                                    <option key={b.id} value={b.batch_number}>
                                        {b.batch_number} ({b.product?.name})
                                    </option>
                                ))}
                            </select>
                            <FormError message={formErrors.batch || null} />
                        </div>

                        {/* Shift Selection (Dynamic) */}
                        {availableShifts.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">الوردية (اختياري)</label>
                                <select
                                    className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    value={selectedShift}
                                    onChange={(e) => setSelectedShift(e.target.value)}
                                    disabled={loadingShifts}
                                >
                                    <option value="">كل الورادي</option>
                                    {availableShifts.map((shift) => (
                                        <option key={shift} value={shift}>
                                            {shift}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">تظهر فقط الورادي التي لها تقارير إنتاج لهذا الباتش</p>
                            </div>
                        )}


                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">سبب الحجز</label>
                            <input
                                type="text"
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                    formErrors.reason ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                                value={holdReason}
                                onChange={(e) => {
                                    setHoldReason(e.target.value);
                                    clearError('reason');
                                }}
                                placeholder="مثال: خطأ في الطباعة"
                            />
                            <FormError message={formErrors.reason || null} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">من بالتة رقم (تسلسل)</label>
                            <input
                                type="number"
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                    formErrors.range ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                                value={rangeStart}
                                onChange={(e) => {
                                    setRangeStart(e.target.value);
                                    clearError('range');
                                }}
                                placeholder="1"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">إلى بالتة رقم (تسلسل)</label>
                            <input
                                type="number"
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                    formErrors.range ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                                value={rangeEnd}
                                onChange={(e) => {
                                    setRangeEnd(e.target.value);
                                    clearError('range');
                                }}
                                placeholder="10"
                            />
                            <FormError message={formErrors.range || null} />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleBatchHold}
                            disabled={loading}
                            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    جاري الحفظ...
                                </>
                            ) : (
                                <>
                                    <AlertTriangle size={18} />
                                    تطبيق الحجز على النطاق
                                </>
                            )}
                        </button>
                    </div>

                    <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h4 className="font-medium text-blue-800 mb-2">تنبيه:</h4>
                        <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                            <li>سيتم حجز جميع البالتات الموجودة في النطاق المحدد.</li>
                            <li>لن يتم التأثير على البالتات المحجوزة مسبقاً بالكامل (Hold).</li>
                            <li>البالتات المحجوزة جزئياً (Partial Hold) قد يزداد حجزها.</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Disposition Modal */}
            {selectedHold && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            فرز الحجز - البالتة: {(selectedHold as any).pallet?.pallet_number}
                        </h2>

                        <div className="space-y-4">
                            {/* Disposition Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    نوع الفرز
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setDispositionType('accept')}
                                        className={`px-4 py-3 rounded-lg border ${dispositionType === 'accept'
                                            ? 'bg-green-50 border-green-500 text-green-700'
                                            : 'border-gray-300'
                                            }`}
                                    >
                                        <CheckCircle className="mx-auto mb-1" size={24} />
                                        <span className="text-sm font-medium">قبول</span>
                                    </button>
                                    <button
                                        onClick={() => setDispositionType('scrap')}
                                        className={`px-4 py-3 rounded-lg border ${dispositionType === 'scrap'
                                            ? 'bg-red-50 border-red-500 text-red-700'
                                            : 'border-gray-300'
                                            }`}
                                    >
                                        <XCircle className="mx-auto mb-1" size={24} />
                                        <span className="text-sm font-medium">إهلاك</span>
                                    </button>
                                    <button
                                        onClick={() => setDispositionType('rework')}
                                        className={`px-4 py-3 rounded-lg border ${dispositionType === 'rework'
                                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                                            : 'border-gray-300'
                                            }`}
                                    >
                                        <RotateCw className="mx-auto mb-1" size={24} />
                                        <span className="text-sm font-medium">إعادة معالجة</span>
                                    </button>
                                </div>
                            </div>

                            {/* General Error in Modal */}
                            {formErrors.general && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                                    <AlertCircle size={18} />
                                    {formErrors.general}
                                </div>
                            )}

                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    الكمية (الحد الأقصى: {selectedHold.hold_quantity})
                                </label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => {
                                        setQuantity(Number(e.target.value));
                                        clearError('quantity');
                                    }}
                                    min="1"
                                    max={selectedHold.hold_quantity}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                        formErrors.quantity ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                    }`}
                                />
                                <FormError message={formErrors.quantity || null} />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ملاحظات الفرز
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="أضف تفاصيل الفرز..."
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleResolveHold}
                                    disabled={loading}
                                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            جاري الحفظ...
                                        </>
                                    ) : (
                                        'حفظ الفرز'
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedHold(null);
                                        setQuantity(0);
                                        setNotes('');
                                        setFormErrors({});
                                    }}
                                    disabled={loading}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    إلغاء
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-center">اضغط Escape للإغلاق</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && activeHolds.length === 0 && (
                <div className="text-center py-12">
                    <AlertTriangle className="mx-auto text-gray-400 mb-4" size={48} />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد حجوزات نشطة</h3>
                    <p className="text-gray-500">جميع البالتات متاحة للتحميل</p>
                </div>
            )}
        </div>
    );
}
