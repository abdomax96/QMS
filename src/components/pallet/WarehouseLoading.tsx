/**
 * Warehouse Loading Component
 * Manages vehicle registration, inspection, and pallet loading
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useLoadingStore } from '../../store/loadingStore';
import { useCompanyStore } from '../../store/companyStore';
import { usePalletStore } from '../../store/palletStore';
import { useNavigate } from 'react-router-dom';
import { Truck, CheckCircle, XCircle, Package, Plus, ArrowRight } from 'lucide-react';
import { PalletStatus, type PalletWithDetails } from '../../types/pallet';


type ViewMode = 'vehicles' | 'inspect' | 'loading';
type LoadingMode = 'planned' | 'manual';
type TargetType = 'cartons' | 'pallets';
type PickItem = {
    pallet: PalletWithDetails;
    cartons: number;
};

export default function WarehouseLoading() {
    const navigate = useNavigate();
    const { selectedCompanyId } = useCompanyStore();
    const {
        todayVehicles,
        currentOperation,
        suggestedPallets,
        loadedPallets,
        loadTodayVehicles,
        registerVehicle,
        inspectVehicle,
        createLoadingOperation,
        startLoading,
        loadPallet,
        completeLoading,
        suggestPallets,
        loading: loadingStoreLoading,
        error,
    } = useLoadingStore();

    const {
        pallets: manualPallets,
        loadPallets,
        totalPages: manualTotalPages,
        totalCount: manualTotalCount,
        loading: manualLoading,
    } = usePalletStore();

    const [viewMode, setViewMode] = useState<ViewMode>('vehicles');
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [loadingMode, setLoadingMode] = useState<LoadingMode>('planned');
    const [targetType, setTargetType] = useState<TargetType>('cartons');
    const [targetCartons, setTargetCartons] = useState(0);
    const [targetPallets, setTargetPallets] = useState(0);
    const [manualSearchInput, setManualSearchInput] = useState('');
    const [manualSearch, setManualSearch] = useState('');
    const [manualPage, setManualPage] = useState(1);
    const [cartonInputs, setCartonInputs] = useState<Record<string, number>>({});
    const [pickList, setPickList] = useState<PickItem[]>([]);

    // Inspection form state
    const [inspectionData, setInspectionData] = useState({
        cleanliness_status: 'pass' as 'pass' | 'fail',
        temperature_celsius: 4,
        general_condition: 'good' as 'good' | 'acceptable' | 'poor',
        inspection_notes: '',
        overall_status: 'passed' as 'pending' | 'passed' | 'failed',
    });

    useEffect(() => {
        if (selectedCompanyId) {
            loadTodayVehicles(selectedCompanyId);
        }
    }, [selectedCompanyId]);

    const formatVehicleNumber = (value: string) => {
        const letters = (value.match(/[\u0621-\u064A]/g) || []).slice(0, 3);
        const digits = (value.match(/\d/g) || []).slice(0, 4);
        const lettersPart = letters.join(' ');
        const digitsPart = digits.join('');
        if (lettersPart && digitsPart) {
            return `${lettersPart} ${digitsPart}`;
        }
        return lettersPart || digitsPart;
    };

    useEffect(() => {
        if (selectedCompanyId && viewMode === 'loading' && loadingMode === 'manual') {
            loadPallets({
                company_id: selectedCompanyId,
                status: [PalletStatus.COMPLETE, PalletStatus.PARTIAL, PalletStatus.PARTIAL_LOAD],
                search: manualSearch || undefined,
                page: manualPage,
                limit: 20,
            });
        }
    }, [selectedCompanyId, viewMode, loadingMode, manualSearch, manualPage, loadPallets]);

    useEffect(() => {
        if (loadingMode === 'planned') {
            const defaults: Record<string, number> = {};
            suggestedPallets.forEach((pallet) => {
                const available = (pallet.available_cartons ?? pallet.actual_cartons) || 0;
                const suggested = pallet.suggested_cartons ?? available;
                defaults[pallet.id] = suggested > 0 ? suggested : available;
            });
            setCartonInputs((prev) => ({ ...prev, ...defaults }));
        }
    }, [suggestedPallets, loadingMode]);

    useEffect(() => {
        if (loadingMode === 'manual') {
            const defaults: Record<string, number> = {};
            manualPallets.forEach((pallet) => {
                const available = (pallet.available_cartons ?? pallet.actual_cartons) || 0;
                defaults[pallet.id] = available;
            });
            setCartonInputs((prev) => ({ ...prev, ...defaults }));
        }
    }, [manualPallets, loadingMode]);

    const getAvailableCartons = (pallet: PalletWithDetails) => {
        if (typeof pallet.available_cartons === 'number') {
            return pallet.available_cartons;
        }
        const hold = (pallet as any).hold_quantity || 0;
        return (pallet.actual_cartons || 0) - hold;
    };

    const getCartonValue = (pallet: PalletWithDetails) => {
        const available = getAvailableCartons(pallet);
        const fallback = pallet.suggested_cartons ?? available;
        return cartonInputs[pallet.id] ?? fallback;
    };

    const updateCartonValue = (pallet: PalletWithDetails, value: number) => {
        const available = getAvailableCartons(pallet);
        const sanitized = Math.max(0, Math.min(value, available));
        setCartonInputs((prev) => ({ ...prev, [pallet.id]: sanitized }));
    };

    const buildPickList = (pallets: PalletWithDetails[]) =>
        pallets
            .map((pallet) => {
                const available = getAvailableCartons(pallet);
                const cartons = pallet.suggested_cartons ?? available;
                const sanitized = Math.max(0, Math.min(cartons, available));
                return sanitized > 0 ? { pallet, cartons: sanitized } : null;
            })
            .filter((item): item is PickItem => Boolean(item));

    const refreshSuggestions = async () => {
        if (!selectedCompanyId) return;
        const options =
            targetType === 'cartons'
                ? targetCartons > 0
                    ? { targetCartons }
                    : undefined
                : targetPallets > 0
                    ? { targetPallets }
                    : undefined;
        return await suggestPallets(selectedCompanyId, 'fifo', options);
    };

    const handleSuggest = async () => {
        try {
            const nextSuggestions = await refreshSuggestions();
            if (nextSuggestions) {
                setPickList(buildPickList(nextSuggestions));
            }
        } catch (err) {
            console.error('Failed to suggest pallets:', err);
        }
    };

    const addToPickList = (pallet: PalletWithDetails) => {
        if (loadedPalletIdSet.has(pallet.id)) return;
        const available = getAvailableCartons(pallet);
        const cartons = getCartonValue(pallet);
        if (!cartons || cartons <= 0) return;
        if (cartons > available) return;

        setPickList((prev) => {
            const existing = prev.find((item) => item.pallet.id === pallet.id);
            if (existing) {
                return prev.map((item) =>
                    item.pallet.id === pallet.id ? { ...item, cartons } : item
                );
            }
            return [...prev, { pallet, cartons }];
        });
    };

    const removeFromPickList = (palletId: string) => {
        setPickList((prev) => prev.filter((item) => item.pallet.id !== palletId));
    };

    const updatePickListCartons = (palletId: string, value: number) => {
        setPickList((prev) =>
            prev.map((item) => {
                if (item.pallet.id !== palletId) return item;
                const available = getAvailableCartons(item.pallet);
                const sanitized = Math.max(0, Math.min(value, available));
                return { ...item, cartons: sanitized };
            })
        );
    };

    const pickListTotals = useMemo(() => {
        const totalCartons = pickList.reduce((sum, item) => sum + item.cartons, 0);
        return {
            totalCartons,
            totalPallets: pickList.length,
        };
    }, [pickList]);

    const loadedPalletIdSet = useMemo(() => {
        return new Set(loadedPallets.map((item) => item.pallet_id));
    }, [loadedPallets]);

    const pickListIdSet = useMemo(() => {
        return new Set(pickList.map((item) => item.pallet.id));
    }, [pickList]);

    const handleLoadPickList = async () => {
        if (!pickList.length) return;
        try {
            for (const item of pickList) {
                const available = getAvailableCartons(item.pallet);
                const isPartial = item.cartons < available;
                await loadPallet(item.pallet.id, item.cartons, isPartial);
            }
            setPickList([]);
        } catch (err) {
            console.error('Failed to load pick list:', err);
        }
    };

    const buildPickListHtml = () => {
        const formatDateTime = (value?: string | null) =>
            value ? new Date(value).toLocaleString('ar-EG') : '-';
        const formatDate = (value?: string | null) =>
            value ? new Date(value).toLocaleDateString('ar-EG') : '-';
        const rowsHtml = pickList
            .map(
                (item) => `
                <tr>
                    <td>${item.pallet.pallet_number}</td>
                    <td>${item.pallet.product_name || '-'}</td>
                    <td>${item.pallet.batch?.batch_number || '-'}</td>
                    <td>${formatDate(item.pallet.batch?.production_date || null)}</td>
                    <td>${item.cartons}</td>
                    <td>${item.pallet.location || '-'}</td>
                </tr>
            `
            )
            .join('');

        return `
            <html>
                <head>
                    <title>قائمة التجهيز</title>
                    <style>
                        @page { size: A4; margin: 16mm; }
                        body {
                            font-family: "Cairo", "Noto Kufi Arabic", "Tajawal", "Arial", sans-serif;
                            direction: rtl;
                            padding: 0;
                            color: #0f172a;
                            background: #ffffff;
                        }
                        .print-shell { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
                        .print-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
                        .print-title { font-size: 18px; font-weight: 700; }
                        .print-meta { font-size: 12px; color: #475569; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
                        th { background: #f8fafc; font-weight: 700; color: #1e293b; }
                        tbody tr:nth-child(even) { background: #f9fafb; }
                        .print-footer { margin-top: 12px; font-size: 12px; color: #475569; display: flex; justify-content: space-between; }
                    </style>
                </head>
                <body>
                    <div class="print-shell">
                        <table>
                            <thead>
                                <tr>
                                    <th>رقم البالتة</th>
                                    <th>المنتج</th>
                                    <th>الباتش</th>
                                    <th>تاريخ الإنتاج</th>
                                    <th>الكمية المطلوبة</th>
                                    <th>الموقع</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml || `<tr><td colspan="6">لا توجد عناصر</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </body>
            </html>
        `;
    };

    const handlePrintPickList = () => {
        if (!pickList.length) return;
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;
        printWindow.document.write(buildPickListHtml());
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const sortedManualPallets = useMemo(() => {
        const list = [...manualPallets];
        list.sort((a, b) => {
            const dateA = new Date(a.batch?.production_date || '9999-12-31').getTime();
            const dateB = new Date(b.batch?.production_date || '9999-12-31').getTime();
            if (dateA === dateB) {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
            return dateA - dateB;
        });
        return list;
    }, [manualPallets]);

    const displayedPallets = loadingMode === 'manual' ? sortedManualPallets : suggestedPallets;

    const handleRegisterVehicle = async () => {
        if (!selectedCompanyId || !vehicleNumber) return;

        try {
            await registerVehicle(vehicleNumber, selectedCompanyId);
            setVehicleNumber('');
        } catch (err) {
            console.error('Failed to register vehicle:', err);
        }
    };

    const handleInspectVehicle = async () => {
        if (!selectedVehicle) return;

        try {
            await inspectVehicle(selectedVehicle.id, {
                ...inspectionData,
                inspected_at: new Date().toISOString()
            });
            setViewMode('vehicles');
            setSelectedVehicle(null);
        } catch (err) {
            console.error('Failed to inspect vehicle:', err);
        }
    };

    const handleStartLoading = async (vehicle: any) => {
        if (!selectedCompanyId) return;

        try {
            await createLoadingOperation(vehicle.id, selectedCompanyId);
            if (loadingMode === 'planned') {
                await refreshSuggestions();
            }
            setSelectedVehicle(vehicle);
            setViewMode('loading');
            setPickList([]);
        } catch (err) {
            console.error('Failed to start loading:', err);
        }
    };

    const handleLoadPallet = async (pallet: PalletWithDetails, cartons: number) => {
        try {
            const available = getAvailableCartons(pallet);
            const loadCartons = Math.min(cartons, available);
            const isPartial = loadCartons < available;
            await loadPallet(pallet.id, loadCartons, isPartial);
        } catch (err) {
            console.error('Failed to load pallet:', err);
        }
    };

    const handleCompleteLoading = async () => {
        if (!currentOperation) return;

        try {
            await completeLoading(currentOperation.id);
            setViewMode('vehicles');
            setSelectedVehicle(null);
            setPickList([]);
            if (selectedCompanyId) {
                await loadTodayVehicles(selectedCompanyId);
            }
        } catch (err) {
            console.error('Failed to complete loading:', err);
        }
    };

    // Vehicles List View
    if (viewMode === 'vehicles') {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="رجوع"
                    >
                        <ArrowRight size={24} className="text-gray-600" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة التحميل</h1>
                </div>

                {/* Register Vehicle */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">تسجيل سيارة</h2>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={vehicleNumber}
                            onChange={(e) => setVehicleNumber(formatVehicleNumber(e.target.value))}
                            placeholder="رقم السيارة"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleRegisterVehicle}
                            disabled={loadingStoreLoading || !vehicleNumber}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <Plus size={18} />
                            تسجيل
                        </button>
                    </div>
                </div>

                {/* Today's Vehicles Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            سيارات اليوم ({todayVehicles.length})
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">رقم السيارة</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">الحالة</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">السائق</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">وقت الوصول</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {todayVehicles.map((vehicle) => (
                                    <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 flex items-center gap-2">
                                            <Truck className="text-gray-400" size={18} />
                                            {vehicle.vehicle_number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 text-xs rounded-full ${vehicle.status === 'dispatched'
                                                    ? 'bg-green-100 text-green-700'
                                                    : vehicle.status === 'inspected'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                    }`}
                                            >
                                                {vehicle.status === 'registered' && 'مسجلة'}
                                                {vehicle.status === 'inspected' && 'تم الفحص'}
                                                {vehicle.status === 'loading' && 'جاري التحميل'}
                                                {vehicle.status === 'dispatched' && 'تم الشحن'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                            {vehicle.driver_name || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            {new Date(vehicle.registered_at).toLocaleTimeString('ar-EG')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {vehicle.status === 'registered' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedVehicle(vehicle);
                                                        setViewMode('inspect');
                                                    }}
                                                    className="text-yellow-600 hover:text-yellow-800 font-medium text-sm flex items-center gap-1 bg-yellow-50 px-3 py-1.5 rounded-full hover:bg-yellow-100 transition-colors"
                                                >
                                                    فحص
                                                </button>
                                            )}
                                            {vehicle.status === 'inspected' && (
                                                <button
                                                    onClick={() => handleStartLoading(vehicle)}
                                                    className="text-green-600 hover:text-green-800 font-medium text-sm flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors"
                                                >
                                                    تحميل
                                                </button>
                                            )}
                                            {vehicle.status === 'loading' && (
                                                <button
                                                    onClick={() => handleStartLoading(vehicle)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                                                >
                                                    <Package size={14} />
                                                    استكمال
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {todayVehicles.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            لا توجد سيارات مسجلة اليوم
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // Inspection View
    if (viewMode === 'inspect') {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">
                    فحص السيارة: {selectedVehicle?.vehicle_number}
                </h1>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            حالة النظافة
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={() =>
                                    setInspectionData({ ...inspectionData, cleanliness_status: 'pass' })
                                }
                                className={`flex-1 px-4 py-2 rounded-lg border ${inspectionData.cleanliness_status === 'pass'
                                    ? 'bg-green-50 border-green-500 text-green-700'
                                    : 'border-gray-300'
                                    }`}
                            >
                                <CheckCircle className="mx-auto mb-1" size={20} />
                                نظيفة
                            </button>
                            <button
                                onClick={() =>
                                    setInspectionData({ ...inspectionData, cleanliness_status: 'fail' })
                                }
                                className={`flex-1 px-4 py-2 rounded-lg border ${inspectionData.cleanliness_status === 'fail'
                                    ? 'bg-red-50 border-red-500 text-red-700'
                                    : 'border-gray-300'
                                    }`}
                            >
                                <XCircle className="mx-auto mb-1" size={20} />
                                غير نظيفة
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            درجة الحرارة (°C)
                        </label>
                        <input
                            type="number"
                            value={inspectionData.temperature_celsius}
                            onChange={(e) =>
                                setInspectionData({
                                    ...inspectionData,
                                    temperature_celsius: Number(e.target.value),
                                })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            الحالة العامة
                        </label>
                        <select
                            value={inspectionData.general_condition}
                            onChange={(e) =>
                                setInspectionData({
                                    ...inspectionData,
                                    general_condition: e.target.value as any,
                                })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="good">جيدة</option>
                            <option value="acceptable">مقبولة</option>
                            <option value="poor">سيئة</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ملاحظات
                        </label>
                        <textarea
                            value={inspectionData.inspection_notes}
                            onChange={(e) =>
                                setInspectionData({ ...inspectionData, inspection_notes: e.target.value })
                            }
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleInspectVehicle}
                            disabled={loadingStoreLoading}
                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            حفظ الفحص
                        </button>
                        <button
                            onClick={() => {
                                setViewMode('vehicles');
                                setSelectedVehicle(null);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Loading View
    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    تحميل السيارة: {selectedVehicle?.vehicle_number}
                </h1>
                <button
                    onClick={handleCompleteLoading}
                    disabled={loadingStoreLoading || !currentOperation?.actual_pallets}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                    إنهاء التحميل
                </button>
            </div>

            {/* Loading Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">البالتات المحملة</p>
                    <p className="text-2xl font-bold text-gray-900">{currentOperation?.actual_pallets || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">الكراتين المحملة</p>
                    <p className="text-2xl font-bold text-gray-900">{currentOperation?.actual_cartons || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">الحالة</p>
                    <p className="text-lg font-semibold text-blue-600">{currentOperation?.status}</p>
                </div>
            </div>

            {/* Loading Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setLoadingMode('planned')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${loadingMode === 'planned'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                                }`}
                        >
                            تحميل مخطط
                        </button>
                        <button
                            type="button"
                            onClick={() => setLoadingMode('manual')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${loadingMode === 'manual'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                                }`}
                        >
                            اختيار يدوي
                        </button>
                    </div>
                    <span className="text-xs text-gray-500">
                        نظام FIFO يعتمد على تاريخ الإنتاج
                    </span>
                </div>

                {loadingMode === 'planned' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">طريقة تحديد الكمية</label>
                            <select
                                value={targetType}
                                onChange={(e) => setTargetType(e.target.value as TargetType)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                                <option value="cartons">بالكراتين</option>
                                <option value="pallets">بالبالتات</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">الكمية المطلوبة</label>
                            {targetType === 'cartons' ? (
                                <input
                                    type="number"
                                    value={targetCartons}
                                    onChange={(e) => setTargetCartons(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    min={0}
                                />
                            ) : (
                                <input
                                    type="number"
                                    value={targetPallets}
                                    onChange={(e) => setTargetPallets(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    min={0}
                                />
                            )}
                        </div>
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={handleSuggest}
                                disabled={loadingStoreLoading}
                                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                اقتراح تلقائي
                            </button>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={() => setPickList([])}
                                className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                تفريغ القائمة
                            </button>
                        </div>
                    </div>
                )}

                {loadingMode === 'manual' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm text-gray-600 mb-1">بحث بالبالتة / الباتش</label>
                            <input
                                type="text"
                                value={manualSearchInput}
                                onChange={(e) => setManualSearchInput(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="ابحث عن رقم البالتة أو ملاحظة"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setManualSearch(manualSearchInput);
                                    setManualPage(1);
                                }}
                                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                بحث
                            </button>
                        </div>
                        <div className="flex items-end text-sm text-gray-500">
                            إجمالي البالتات المتاحة: {manualTotalCount}
                        </div>
                    </div>
                )}
            </div>

            {/* Pick List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">قائمة التجهيز</h2>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handlePrintPickList}
                            disabled={!pickList.length}
                            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            طباعة
                        </button>
                        <button
                            type="button"
                            onClick={handleLoadPickList}
                            disabled={!pickList.length || loadingStoreLoading}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            تحميل الكل
                        </button>
                    </div>
                </div>

                <div>
                    <div className="print-shell">
                    {pickList.length === 0 ? (
                        <div className="text-sm text-gray-500">لا توجد عناصر في القائمة بعد.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider">رقم البالتة</th>
                                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider">المنتج</th>
                                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider">الباتش</th>
                                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider">تاريخ الإنتاج</th>
                                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider">الكمية المطلوبة</th>
                                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider">الموقع</th>
                                        <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider">إزالة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {pickList.map((item) => (
                                        <tr key={item.pallet.id}>
                                            <td className="px-4 py-2 text-sm text-gray-900">{item.pallet.pallet_number}</td>
                                            <td className="px-4 py-2 text-sm text-gray-700">{item.pallet.product_name}</td>
                                            <td className="px-4 py-2 text-sm text-gray-700">{item.pallet.batch?.batch_number || '-'}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500">
                                                {item.pallet.batch?.production_date ? new Date(item.pallet.batch.production_date).toLocaleDateString('ar-EG') : '-'}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-700">
                                                <input
                                                    type="number"
                                                    value={item.cartons}
                                                    onChange={(e) => updatePickListCartons(item.pallet.id, Number(e.target.value))}
                                                    className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm"
                                                    min={0}
                                                    max={getAvailableCartons(item.pallet)}
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-500">{item.pallet.location || '-'}</td>
                                            <td className="px-4 py-2 text-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => removeFromPickList(item.pallet.id)}
                                                    className="text-red-600 hover:text-red-800 text-xs"
                                                >
                                                    حذف
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    </div>
                </div>
            </div>

            {/* Pallets List */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {loadingMode === 'manual' ? 'البالتات المتاحة (اختيار يدوي)' : 'البالتات المقترحة (FIFO حسب تاريخ الإنتاج)'}
                </h2>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">رقم البالتة</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">المنتج</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">المتاح</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">الباتش</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">تاريخ الإنتاج</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">الموقع</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">الكمية المراد تحميلها</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loadingMode === 'manual' && manualLoading && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                            جاري تحميل البيانات...
                                        </td>
                                    </tr>
                                )}
                                {displayedPallets.map((pallet) => {
                                    const available = getAvailableCartons(pallet);
                                    const cartons = getCartonValue(pallet);
                                    const isPartial = cartons > 0 && cartons < available;
                                    const isLoaded = loadedPalletIdSet.has(pallet.id);
                                    const isSelected = pickListIdSet.has(pallet.id);
                                    return (
                                        <tr key={pallet.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                {pallet.pallet_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                {pallet.product_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {available}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                {pallet.batch?.batch_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                {pallet.batch?.production_date ? new Date(pallet.batch.production_date).toLocaleDateString('ar-EG') : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                {pallet.location || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <input
                                                        type="number"
                                                        value={cartons}
                                                        onChange={(e) => updateCartonValue(pallet, Number(e.target.value))}
                                                        className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm"
                                                        min={0}
                                                        max={available}
                                                        disabled={isLoaded}
                                                    />
                                                    <span className="text-xs text-gray-500">متاح: {available}</span>
                                                    {isPartial && (
                                                        <span className="text-xs text-amber-600">تحميل جزئي</span>
                                                    )}
                                                    {isLoaded && (
                                                        <span className="text-xs text-emerald-600">تم التحميل</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-wrap gap-2">
                                                    {isSelected ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFromPickList(pallet.id)}
                                                            disabled={isLoaded}
                                                            className="text-red-600 hover:text-red-800 font-medium text-xs bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50"
                                                        >
                                                            إزالة
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => addToPickList(pallet)}
                                                            disabled={isLoaded}
                                                            className="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50"
                                                        >
                                                            إضافة للقائمة
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleLoadPallet(pallet, cartons)}
                                                        disabled={loadingStoreLoading || cartons <= 0 || isLoaded}
                                                        className="text-green-600 hover:text-green-800 font-medium text-xs bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors disabled:opacity-50"
                                                    >
                                                        تحميل الآن
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!manualLoading && displayedPallets.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                            لا توجد بالتات متاحة ضمن النطاق الحالي
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {loadingMode === 'manual' && manualTotalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 text-sm">
                            <span className="text-gray-500">الصفحة {manualPage} من {manualTotalPages}</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setManualPage((prev) => Math.max(1, prev - 1))}
                                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    السابق
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setManualPage((prev) => Math.min(manualTotalPages, prev + 1))}
                                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    التالي
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
