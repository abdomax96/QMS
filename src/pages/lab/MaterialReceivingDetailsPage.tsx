/**
 * Material Receiving Details Page
 * صفحة تفاصيل استلام المادة - تصميم رسمي
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowRightIcon,
    PrinterIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    DocumentTextIcon,
    ArrowTopRightOnSquareIcon,
    ArrowDownTrayIcon,
    PencilSquareIcon
} from '@heroicons/react/24/outline';
import { DetailPageSkeleton } from '../../components/common/LoadingStates';
import * as labService from '../../services/labService';
import { downloadFromUrl } from '../../services/fileStorageService';
import { useDateFormat } from '../../hooks/useDateFormat';
import { cn } from '../../utils';
import type { MaterialReceiving, MaterialReceivingStatus } from '../../domain/lab/types';
import { materialReceivingStatusLabels, materialReceivingStatusColors } from '../../domain/lab/types';
import { formatMaterialDateForDisplay } from '../../utils/materialReceivingDate';

const MaterialReceivingDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [receiving, setReceiving] = useState<MaterialReceiving | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [statusNotes, setStatusNotes] = useState('');
    const [manualDepletionReasonInput, setManualDepletionReasonInput] = useState('');
    const { formatDate, language } = useDateFormat();

    const handlePrint = () => window.print();

    useEffect(() => {
        if (!id) return;
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await labService.getMaterialReceivingById(id!);
            setReceiving(data);
            setManualDepletionReasonInput(data?.manualDepletionReason || '');
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: MaterialReceivingStatus) => {
        if (!receiving || isUpdating) return;
        setIsUpdating(true);
        try {
            const success = await labService.updateMaterialReceivingStatus(receiving.id, newStatus, statusNotes);
            if (success) {
                setReceiving({ ...receiving, status: newStatus });
                setStatusNotes('');
            }
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleManualDepletionToggle = async () => {
        if (!receiving || isUpdating) return;

        const nextState = !receiving.isManuallyDepleted;
        const reason = nextState ? manualDepletionReasonInput.trim() : undefined;

        setIsUpdating(true);
        try {
            const success = await labService.setMaterialReceivingManualDepletion(
                receiving.id,
                nextState,
                reason || undefined
            );
            if (success) {
                await loadData();
            }
        } catch (error) {
            console.error('Error toggling manual depletion:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return <DetailPageSkeleton />;
    }

    if (!receiving) {
        return (
            <div className="p-6 text-center">
                <h3 className="text-xl text-red-600">عفواً، السجل غير موجود</h3>
                <button onClick={() => navigate('/lab/receiving')} className="mt-4 text-blue-600 hover:underline">
                    العودة للقائمة
                </button>
            </div>
        );
    }

    // InfoRow component for consistent formatting - compact for print
    const InfoRow = ({
        label,
        value,
        highlight = false,
        mono = false,
        hideOnPrint = false
    }: {
        label: string;
        value: string | null | undefined;
        highlight?: boolean;
        mono?: boolean;
        hideOnPrint?: boolean;
    }) => (
        <tr className={cn("border-b border-gray-100 dark:border-gray-700 print:border-gray-300", hideOnPrint && 'print:hidden')}>
            <td className="py-2 px-4 print:py-1 print:px-2 print:text-xs text-gray-600 dark:text-gray-400 font-medium w-1/3">{label}</td>
            <td className={`py-2 px-4 print:py-1 print:px-2 print:text-xs ${highlight ? 'font-bold text-blue-700 dark:text-blue-400 print:text-black' : 'text-gray-900 dark:text-white'} ${mono ? 'font-mono' : ''}`}>
                {value || '-'}
            </td>
        </tr>
    );

    const formatCheckResult = (value: string | undefined) => {
        if (value === 'pass') return '✓ مطابق';
        if (value === 'fail') return '✗ غير مطابق';
        if (value === 'na') return 'غير منطبق';
        return '-';
    };

    const normalizeKey = (value: unknown) => String(value ?? '').trim().toLowerCase();

    const structuredInitialTests = Array.isArray(receiving.testResults)
        ? receiving.testResults.filter((test: unknown) => !!test && typeof test === 'object')
        : [];

    const structuredTestRequirements = Array.isArray(receiving.testRequirementsSnapshot)
        ? receiving.testRequirementsSnapshot.filter((test: unknown) => !!test && typeof test === 'object')
        : [];

    const criteriaTestsForDisplay =
        structuredTestRequirements.length > 0
            ? structuredTestRequirements
            : structuredInitialTests.map((test: any) => ({
                testName: test?.testName || test?.testNameEn || '-',
                required: true,
                parameters: Array.isArray(test?.results)
                    ? test.results.map((row: any) => ({
                        name: row?.paramName || '-',
                        unit: row?.paramUnit || '',
                        min: row?.min,
                        max: row?.max
                    }))
                    : []
            }));

    const vehicleInspection = receiving.vehicleInspection || {
        vehicleType: '',
        cleanliness: '',
        noOdors: '',
        noContaminants: '',
        packagingIntact: '',
        temperatureOk: '',
        temperature: '',
        vehicleNotes: ''
    };

    const testResultByTestAndParam = new Map<string, string>();
    const testResultByParam = new Map<string, string>();

    structuredInitialTests.forEach((test: any) => {
        const testNameKey = normalizeKey(test?.testName || test?.testNameEn);
        const rows = Array.isArray(test?.results) ? test.results : [];
        rows.forEach((row: any) => {
            const paramKey = normalizeKey(row?.paramName);
            const value = row?.value ?? '-';
            if (!paramKey) return;
            if (testNameKey) testResultByTestAndParam.set(`${testNameKey}::${paramKey}`, value);
            if (!testResultByParam.has(paramKey)) testResultByParam.set(paramKey, value);
        });
    });

    const getParameterName = (parameter: any): string =>
        String(parameter?.name ?? parameter?.paramName ?? parameter?.label ?? '-');

    const getParameterUnit = (parameter: any): string =>
        String(parameter?.unit ?? parameter?.paramUnit ?? '').trim();

    const normalizeNumericText = (value: string): string => {
        const arabicIndicDigits = '٠١٢٣٤٥٦٧٨٩';
        const easternArabicIndicDigits = '۰۱۲۳۴۵۶۷۸۹';
        let result = value;

        for (let i = 0; i < 10; i += 1) {
            result = result.replace(new RegExp(arabicIndicDigits[i], 'g'), String(i));
            result = result.replace(new RegExp(easternArabicIndicDigits[i], 'g'), String(i));
        }

        return result
            .replace(/٬/g, '')
            .replace(/,/g, '.')
            .replace(/٫/g, '.')
            .replace(/:/g, '.');
    };

    const toComparableNumber = (value: unknown): number | null => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        if (typeof value !== 'string') return null;
        const normalized = normalizeNumericText(value.trim());
        if (!normalized) return null;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const parseBoundsFromText = (value: unknown): { min?: number; max?: number } => {
        if (typeof value !== 'string') return {};
        const normalized = normalizeNumericText(value);
        const matches = normalized.match(/-?\d+(?:\.\d+)?/g);
        if (!matches || matches.length === 0) return {};

        const numbers = matches
            .map((part) => Number(part))
            .filter((num) => Number.isFinite(num));

        if (numbers.length === 0) return {};
        if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };

        return { min: numbers[0], max: numbers[1] };
    };

    const getParameterBounds = (parameter: any): { min: unknown; max: unknown } => {
        let min = parameter?.min ?? parameter?.minValue ?? parameter?.lower ?? parameter?.lowerLimit;
        let max = parameter?.max ?? parameter?.maxValue ?? parameter?.upper ?? parameter?.upperLimit;

        if (min === undefined && max === undefined) {
            const fallbackBounds = [
                parseBoundsFromText(parameter?.limits),
                parseBoundsFromText(parameter?.limit),
                parseBoundsFromText(parameter?.acceptanceCriteria),
                parseBoundsFromText(parameter?.range)
            ].find((bounds) => bounds.min !== undefined || bounds.max !== undefined);

            min = fallbackBounds?.min;
            max = fallbackBounds?.max;
        }

        return { min, max };
    };

    const getParameterLimits = (parameter: any): string => {
        const { min, max } = getParameterBounds(parameter);
        if (min === undefined && max === undefined) return '-';
        return `${min ?? '-'} - ${max ?? '-'}`;
    };

    const getSnapshotResultValue = (testName: string, parameterName: string): string => {
        const testKey = normalizeKey(testName);
        const paramKey = normalizeKey(parameterName);
        if (!paramKey) return '-';
        return (
            testResultByTestAndParam.get(`${testKey}::${paramKey}`) ??
            testResultByParam.get(paramKey) ??
            '-'
        );
    };

    const toDisplayText = (value: unknown): string | null => {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed.length === 0) return null;
            const lowered = trimmed.toLowerCase();
            if (lowered === 'null' || lowered === 'undefined' || trimmed === '-') return null;
            return trimmed;
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            return String(value);
        }
        return null;
    };

    const receivingRecord = receiving as unknown as Record<string, unknown>;
    const routeReceivingId = toDisplayText(id);
    const receivingNumberDisplay =
        toDisplayText(receiving.receivingNumber) ??
        toDisplayText(receivingRecord.receiving_number) ??
        toDisplayText(receivingRecord.receipt_number) ??
        toDisplayText(receivingRecord.receiving_no) ??
        toDisplayText(receivingRecord.number) ??
        toDisplayText(receiving.id) ??
        routeReceivingId ??
        'غير متاح';

    return (
        <>
            {/* Print-specific CSS for dynamic A4 page layout */}
            <style>{`
                @media print {
                    :root {
                        --print-header-gray: #d1d5db;
                    }
                    @page {
                        size: A4;
                        margin: 7mm 8mm;
                    }
                    html, body {
                        height: auto;
                        margin: 0;
                        padding: 0;
                        background: #fff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .print-page-container {
                        width: 100%;
                        height: auto;
                        padding: 0 !important;
                    }
                    .print-document {
                        width: 100%;
                        height: auto;
                        min-height: 0;
                        border: 1px solid #000 !important;
                        border-radius: 0 !important;
                        margin: 0 !important;
                        direction: rtl !important;
                        background: #fff !important;
                    }
                    .print-document,
                    .print-document * {
                        color: #000 !important;
                        box-shadow: none !important;
                        text-shadow: none !important;
                    }
                    .print-document * {
                        background: transparent !important;
                    }
                    .print-document table,
                    .print-document th,
                    .print-document td {
                        border-color: #000 !important;
                    }
                    .print-document thead th {
                        background: var(--print-header-gray) !important;
                    }
                    .print-document svg {
                        color: #000 !important;
                        stroke: #000 !important;
                    }
                    .print-header {
                        padding: 10px 12px !important;
                        background: var(--print-header-gray) !important;
                        border-bottom: 1px solid #000 !important;
                    }
                    .print-header p {
                        color: #1f2937 !important;
                    }
                    .print-header-top-label,
                    .print-header-top-value {
                        color: #111827 !important;
                    }
                    .print-header-top-value {
                        font-weight: 800 !important;
                    }
                    .print-status-row {
                        display: flex !important;
                        justify-content: flex-start !important;
                        margin: 0 !important;
                        padding: 4px 12px 0 12px !important;
                    }
                    .print-status-pill {
                        box-shadow: none !important;
                        border-width: 1px !important;
                        padding: 2px 10px !important;
                        font-size: 10px !important;
                        border-color: #6b7280 !important;
                        background: #fff !important;
                        color: #111827 !important;
                    }
                    .print-content {
                        display: grid !important;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 8px 10px !important;
                        padding: 8px 12px 10px !important;
                        align-items: start;
                    }
                    .print-content > :not([hidden]) ~ :not([hidden]) {
                        margin-top: 0 !important;
                    }
                    .print-section {
                        border: 1px solid #9ca3af;
                        border-radius: 4px;
                        padding: 6px 8px;
                        page-break-inside: avoid;
                        break-inside: avoid;
                        background: #fff !important;
                    }
                    .print-section h3 {
                        background: var(--print-header-gray) !important;
                        border-bottom: 1px solid #6b7280 !important;
                        border-radius: 3px !important;
                        padding: 4px 6px !important;
                    }
                    .print-section--full {
                        grid-column: 1 / -1;
                    }
                    .print-section .overflow-x-auto {
                        overflow: visible !important;
                    }
                    .print-info-table td {
                        padding: 2px 6px !important;
                        font-size: 10px !important;
                    }
                    .print-info-table td:first-child {
                        width: 38% !important;
                        font-weight: 600 !important;
                        background: var(--print-header-gray) !important;
                    }
                    .print-info-table td:last-child {
                        width: 62% !important;
                        background: #fff !important;
                    }
                    .print-criteria-table {
                        table-layout: fixed !important;
                    }
                    .print-criteria-table th,
                    .print-criteria-table td {
                        padding: 3px 4px !important;
                        font-size: 10px !important;
                    }
                    .print-criteria-table th:nth-child(1),
                    .print-criteria-table td:nth-child(1) {
                        width: 20%;
                    }
                    .print-criteria-table th:nth-child(2),
                    .print-criteria-table td:nth-child(2) {
                        width: 34%;
                    }
                    .print-criteria-table th:nth-child(3),
                    .print-criteria-table td:nth-child(3) {
                        width: 18%;
                    }
                    .print-criteria-table th:nth-child(4),
                    .print-criteria-table td:nth-child(4) {
                        width: 18%;
                    }
                    .print-criteria-table th:nth-child(5),
                    .print-criteria-table td:nth-child(5) {
                        width: 10%;
                    }
                    .print-criteria-table tbody td:first-child {
                        background: var(--print-header-gray) !important;
                        font-weight: 600 !important;
                    }
                    .print-criteria-table tbody td:nth-child(5) {
                        background: #fff !important;
                    }
                    .print-receiving-inline-number {
                        direction: ltr !important;
                        unicode-bidi: isolate !important;
                        display: inline-block !important;
                        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
                    }
                    .print-signatures {
                        grid-column: 1 / -1;
                        page-break-inside: avoid;
                        break-inside: avoid;
                        margin-top: 8px !important;
                        padding: 10px 12px !important;
                    }
                    .print-compact * {
                        line-height: 1.25 !important;
                    }
                    .print-compact h2 {
                        font-size: 16px !important;
                    }
                    .print-compact h3 {
                        font-size: 12px !important;
                        margin-bottom: 4px !important;
                        padding-bottom: 3px !important;
                    }
                    .print-compact table {
                        width: 100% !important;
                    }
                    .print-signatures .mb-12 {
                        margin-bottom: 22px !important;
                    }
                }
            `}</style>
            <div className="p-4 max-w-4xl mx-auto print:p-0 print:max-w-none print-page-container">
                {/* Header - Hidden on Print */}
                <div className="flex items-center justify-between mb-4 print:hidden">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/lab/receiving')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <ArrowRightIcon className="w-5 h-5 text-gray-500" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            تفاصيل استلام المادة
                        </h1>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow"
                    >
                        <PrinterIcon className="w-5 h-5" />
                        طباعة
                    </button>
                </div>

                {/* Status Change Section - Hidden on Print */}
                {receiving.status === 'pending' && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4 print:hidden">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2">
                                <ClockIcon className="w-6 h-6 text-yellow-600" />
                                <span className="font-bold text-yellow-800 dark:text-yellow-400">قيد الانتظار - يتطلب اتخاذ قرار</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="ملاحظات..."
                                    value={statusNotes}
                                    onChange={(e) => setStatusNotes(e.target.value)}
                                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 w-40"
                                />
                                <button
                                    onClick={() => handleStatusChange('accepted')}
                                    disabled={isUpdating}
                                    className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                                >
                                    <CheckCircleIcon className="w-5 h-5" />
                                    قبول
                                </button>
                                <button
                                    onClick={() => handleStatusChange('rejected')}
                                    disabled={isUpdating}
                                    className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                                >
                                    <XCircleIcon className="w-5 h-5" />
                                    رفض
                                </button>
                                <button
                                    onClick={() => navigate(`/lab/receiving/${id}/edit`)}
                                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    <PencilSquareIcon className="w-5 h-5" />
                                    تعديل البيانات
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {receiving.status !== 'pending' && (
                    <div className={`rounded-lg p-4 mb-4 print:hidden flex items-center justify-between ${receiving.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                        <div className="flex items-center gap-2">
                            {receiving.status === 'accepted' ? (
                                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                            ) : (
                                <XCircleIcon className="w-6 h-6 text-red-600" />
                            )}
                            <span className={`font-bold ${receiving.status === 'accepted' ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>
                                {materialReceivingStatusLabels[receiving.status]}
                            </span>
                        </div>
                        <button
                            onClick={() => handleStatusChange('pending')}
                            disabled={isUpdating}
                            className="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                            إعادة للانتظار
                        </button>
                    </div>
                )}

                <div className="rounded-lg p-4 mb-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 print:hidden">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1 text-sm">
                            {receiving.isManuallyDepleted && (
                                <div className="text-red-600 dark:text-red-400 font-medium">
                                    الحالة: محدد كنَفاد يدوي
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 md:items-end">
                            <input
                                type="text"
                                value={manualDepletionReasonInput}
                                onChange={(e) => setManualDepletionReasonInput(e.target.value)}
                                placeholder="سبب تحديد الكمية كمستهلكة بالكامل"
                                className="w-64 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                            />
                            <button
                                type="button"
                                onClick={handleManualDepletionToggle}
                                disabled={isUpdating}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60',
                                    receiving.isManuallyDepleted
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                )}
                            >
                                {receiving.isManuallyDepleted ? 'إلغاء النفاد اليدوي' : 'تحديد الكمية كمستهلكة بالكامل'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Official Document Style */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-600 overflow-hidden shadow-lg print:shadow-none print:border print:rounded-none print-compact print-document">

                    {/* Document Header */}
                    <div className="bg-gradient-to-l from-blue-600 to-blue-800 text-white p-6 print:p-3 print:bg-blue-700 print-header">
                        <div className="flex justify-start items-center gap-2 mb-2 print:mb-1">
                            <span className="text-xs font-semibold text-white/90 print-header-top-label">رقم الاستلام:</span>
                            <span className="text-sm font-bold font-mono text-white print-header-top-value print-receiving-inline-number">{receivingNumberDisplay}</span>
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl print:text-lg font-bold mb-1 print:mb-0">تقرير استلام مواد خام</h2>
                                <p className="text-blue-200 text-sm print:text-xs">Material Receiving Report</p>
                            </div>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex justify-end px-6 -mt-4 print-status-row">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-lg ${materialReceivingStatusColors[receiving.status].bg} ${materialReceivingStatusColors[receiving.status].text} border-2 border-white dark:border-gray-800 print-status-pill`}>
                            {receiving.status === 'pending' && <ClockIcon className="w-5 h-5" />}
                            {receiving.status === 'accepted' && <CheckCircleIcon className="w-5 h-5" />}
                            {receiving.status === 'rejected' && <XCircleIcon className="w-5 h-5" />}
                            {materialReceivingStatusLabels[receiving.status]}
                        </div>
                    </div>
                    <div className="p-6 space-y-6 print:p-3 print:space-y-2 print-content">
                        {/* Material Information */}
                        <div className="print-section">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-blue-600 pb-2 mb-3">
                                معلومات المادة
                            </h3>
                            <table className="w-full print-info-table">
                                <tbody>
                                    <InfoRow label="اسم المادة" value={receiving.materialName} highlight />
                                    <InfoRow label="كود المادة" value={receiving.materialCode} mono />
                                    <InfoRow label="نوع المادة" value={receiving.materialType} />
                                    <InfoRow label="رقم الدفعة (Batch)" value={receiving.batchNumber} mono highlight />
                                </tbody>
                            </table>
                        </div>

                        {/* Supplier & Quantity */}
                        <div className="print-section">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-orange-500 pb-2 mb-3">
                                المورد والكمية
                            </h3>
                            <table className="w-full print-info-table">
                                <tbody>
                                    <InfoRow label="المورد" value={receiving.supplierName} highlight />
                                    <InfoRow label="الكمية" value={`${receiving.quantity} ${receiving.unit}`} highlight />
                                    <InfoRow label="الكمية المقبولة" value={`${Number(receiving.acceptedQuantity ?? receiving.quantity ?? 0).toFixed(3)} ${receiving.unit}`} />
                                    {Number(receiving.rejectedQuantity ?? 0) > 0 && (
                                        <InfoRow label="الكمية المرفوضة" value={`${Number(receiving.rejectedQuantity ?? 0).toFixed(3)} ${receiving.unit}`} />
                                    )}
                                    {receiving.isManuallyDepleted && (
                                        <InfoRow label="سبب النفاد اليدوي" value={receiving.manualDepletionReason || '-'} />
                                    )}
                                    <InfoRow label="نوع التعبئة" value={receiving.packagingType} />
                                </tbody>
                            </table>
                        </div>

                        {/* Dates */}
                        <div className="print-section">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-green-500 pb-2 mb-3">
                                التواريخ
                            </h3>
                            <table className="w-full print-info-table">
                                <tbody>
                                    <InfoRow label="تاريخ الاستلام" value={formatDate(receiving.receivedAt)} />
                                    <InfoRow
                                        label="تاريخ الإنتاج"
                                        value={formatMaterialDateForDisplay(
                                            receiving.productionDate,
                                            receiving.productionDateFormat || 'dmy',
                                            language
                                        )}
                                    />
                                    <InfoRow
                                        label="تاريخ الانتهاء"
                                        value={formatMaterialDateForDisplay(
                                            receiving.expiryDate,
                                            receiving.expiryDateFormat || 'dmy',
                                            language
                                        )}
                                    />
                                </tbody>
                            </table>
                        </div>

                        {/* Documents */}
                        <div className="print-section">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-purple-500 pb-2 mb-3">
                                المستندات والوثائق
                            </h3>
                            <table className="w-full print-info-table">
                                <tbody>
                                    <InfoRow label="رقم الفاتورة" value={receiving.invoiceNumber} mono />
                                    <InfoRow label="إذن التسليم" value={receiving.deliveryNoteNumber} mono />
                                    <tr className="border-b border-gray-100 dark:border-gray-700 print:border-gray-300">
                                        <td className="py-2 px-4 print:py-1 print:px-2 print:text-xs text-gray-600 dark:text-gray-400 font-medium w-1/3">شهادة التحليل (COA)</td>
                                        <td className="py-2 px-4 print:py-1 print:px-2 print:text-xs">
                                            {receiving.certificateOfAnalysis ? (
                                                <>
                                                    {/* Screen: Show buttons */}
                                                    <div className="flex items-center gap-2 print:hidden">
                                                        <button
                                                            onClick={() => {
                                                                if (receiving.certificateOfAnalysis) {
                                                                    const urlParts = receiving.certificateOfAnalysis.split('/');
                                                                    const fileName = urlParts[urlParts.length - 1] || `COA_${receiving.receivingNumber}.pdf`;
                                                                    downloadFromUrl(receiving.certificateOfAnalysis, fileName);
                                                                }
                                                            }}
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 font-medium text-sm"
                                                        >
                                                            <ArrowDownTrayIcon className="w-4 h-4" />
                                                            تحميل الشهادة
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (receiving.certificateOfAnalysis) {
                                                                    window.open(receiving.certificateOfAnalysis, '_blank');
                                                                }
                                                            }}
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 font-medium text-sm"
                                                        >
                                                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                                            فتح
                                                        </button>
                                                    </div>
                                                    {/* Print: Show text */}
                                                    <span className="hidden print:inline font-bold text-green-700">✓ مرفقة</span>
                                                </>
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-500 italic print:text-red-600 print:font-bold">✗ غير مرفقة</span>
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Storage */}
                        <div className="print-section">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-teal-500 pb-2 mb-3">
                                التخزين
                            </h3>
                            <table className="w-full print-info-table">
                                <tbody>
                                    <InfoRow label="موقع التخزين" value={receiving.storageLocation} />
                                    <InfoRow label="ظروف التخزين" value={receiving.storageCondition} />
                                </tbody>
                            </table>
                        </div>

                        {/* Receiver Info */}
                        <div className="print-section">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-gray-400 pb-2 mb-3">
                                بيانات الاستلام
                            </h3>
                            <table className="w-full print-info-table">
                                <tbody>
                                    <InfoRow label="استلم بواسطة" value={receiving.receivedByName} />
                                </tbody>
                            </table>
                        </div>

                        {/* Vehicle Inspection */}
                        <div className="print-section print-section--full">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-orange-600 pb-2 mb-3">
                                فحص سيارة النقل
                            </h3>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-2">
                                <table className="w-full print-info-table">
                                    <tbody>
                                        <InfoRow label="نوع السيارة" value={vehicleInspection.vehicleType} />
                                        <InfoRow label="درجة الحرارة °C" value={vehicleInspection.temperature} />
                                    </tbody>
                                </table>
                                <table className="w-full print-info-table">
                                    <tbody>
                                        <InfoRow label="نظافة السيارة" value={formatCheckResult(vehicleInspection.cleanliness)} />
                                        <InfoRow label="خالية من الروائح" value={formatCheckResult(vehicleInspection.noOdors)} />
                                        <InfoRow label="خالية من الملوثات" value={formatCheckResult(vehicleInspection.noContaminants)} />
                                        <InfoRow label="سلامة التعبئة" value={formatCheckResult(vehicleInspection.packagingIntact)} />
                                        <InfoRow label="الحرارة مناسبة" value={formatCheckResult(vehicleInspection.temperatureOk)} />
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Raw Material Test Criteria + Results */}
                        <div className="print-section print-section--full">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-cyan-600 pb-2 mb-3">
                                نتائج معايير الفحص الخاصة بالخامة
                            </h3>
                            {criteriaTestsForDisplay.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full border border-gray-200 dark:border-gray-700 text-sm print:text-xs print-criteria-table">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-700/40">
                                                <th className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right">الفحص</th>
                                                <th className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right">الباراميتر</th>
                                                <th className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right">الحدود</th>
                                                <th className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-right">النتيجة</th>
                                                <th className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-center">الحالة</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {criteriaTestsForDisplay.map((test: any, testIndex: number) => {
                                                const parameters = Array.isArray(test?.parameters) && test.parameters.length > 0
                                                    ? test.parameters
                                                    : [{ name: '-', min: undefined, max: undefined, unit: '' }];

                                                const testName = String(test?.testName ?? '-');
                                                return parameters.map((parameter: any, parameterIndex: number) => {
                                                    const parameterName = getParameterName(parameter);
                                                    const parameterUnit = getParameterUnit(parameter);
                                                    const parameterLabel = parameterUnit ? `${parameterName} (${parameterUnit})` : parameterName;
                                                    const limits = getParameterLimits(parameter);
                                                    const result = getSnapshotResultValue(testName, parameterName);
                                                    const { min, max } = getParameterBounds(parameter);
                                                    const minNumber = toComparableNumber(min);
                                                    const maxNumber = toComparableNumber(max);
                                                    const lowerBound =
                                                        minNumber !== null && maxNumber !== null ? Math.min(minNumber, maxNumber) : minNumber;
                                                    const upperBound =
                                                        minNumber !== null && maxNumber !== null ? Math.max(minNumber, maxNumber) : maxNumber;
                                                    const resultNumber = toComparableNumber(result);
                                                    const isOutOfRange =
                                                        resultNumber !== null &&
                                                        ((lowerBound !== null && resultNumber < lowerBound) ||
                                                            (upperBound !== null && resultNumber > upperBound));
                                                    const statusMark = isOutOfRange ? '✗' : '✔';

                                                    return (
                                                        <tr key={`criteria-${testIndex}-${parameterIndex}`} className="border-b border-gray-100 dark:border-gray-700">
                                                            <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 align-top">
                                                                {parameterIndex === 0 ? testName : ''}
                                                            </td>
                                                            <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">{parameterLabel}</td>
                                                            <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">{limits}</td>
                                                            <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 font-semibold">
                                                                {result}
                                                            </td>
                                                            <td className={`border border-gray-200 dark:border-gray-700 px-2 py-1 text-center font-bold ${isOutOfRange ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                                                                {statusMark}
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                    لا توجد معايير فحص محفوظة لهذه الخامة.
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        {receiving.notes && (
                            <div className="print-section print-section--full">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-yellow-500 pb-2 mb-3">
                                    ملاحظات
                                </h3>
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-gray-800 dark:text-gray-200">
                                    {receiving.notes}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Signatures - Print Only */}
                    <div className="hidden print:block border-t-2 border-gray-300 p-4 print-signatures">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="font-bold text-gray-900 mb-12 text-xs">المستلم (المخازن)</p>
                                <div className="border-t-2 border-gray-400 pt-1 text-[10px] text-gray-500">
                                    التوقيع: ___________
                                </div>
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 mb-12 text-xs">مراقب الجودة</p>
                                <div className="border-t-2 border-gray-400 pt-1 text-[10px] text-gray-500">
                                    التوقيع: ___________
                                </div>
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 mb-12 text-xs">مدير الجودة</p>
                                <div className="border-t-2 border-gray-400 pt-1 text-[10px] text-gray-500">
                                    التوقيع: ___________
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MaterialReceivingDetailsPage;
