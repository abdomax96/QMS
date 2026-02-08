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
import type { MaterialReceiving, MaterialReceivingStatus } from '../../domain/lab/types';
import { materialReceivingStatusLabels, materialReceivingStatusColors } from '../../domain/lab/types';

const MaterialReceivingDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [receiving, setReceiving] = useState<MaterialReceiving | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [statusNotes, setStatusNotes] = useState('');
    const { formatDate } = useDateFormat();

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
    const InfoRow = ({ label, value, highlight = false, mono = false }: { label: string; value: string | null | undefined; highlight?: boolean; mono?: boolean }) => (
        <tr className="border-b border-gray-100 dark:border-gray-700 print:border-gray-300">
            <td className="py-2 px-4 print:py-1 print:px-2 print:text-xs text-gray-600 dark:text-gray-400 font-medium w-1/3">{label}</td>
            <td className={`py-2 px-4 print:py-1 print:px-2 print:text-xs ${highlight ? 'font-bold text-blue-700 dark:text-blue-400 print:text-black' : 'text-gray-900 dark:text-white'} ${mono ? 'font-mono' : ''}`}>
                {value || '-'}
            </td>
        </tr>
    );

    return (
        <>
            {/* Print-specific CSS for dynamic A4 page layout */}
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    html, body {
                        height: auto;
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Main container fills the page */
                    .print-page-container {
                        width: 100%;
                        height: auto;
                        padding: 0 !important;
                    }
                    /* Document wrapper to auto height */
                    .print-document {
                        width: 100%;
                        height: auto;
                        min-height: 0;
                        border: none !important;
                        border-radius: 0 !important;
                        margin: 0 !important;
                    }
                    /* Content area grows to fill space */
                    .print-content {
                        padding: 20px 40px !important;
                    }
                    /* ... */

                    .print-content {
                        flex: 1 !important;
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    /* Sections distribute space evenly */
                    .print-content > div {
                        flex: 1 !important;
                    }
                    /* Signatures stay at bottom */
                    .print-signatures {
                        flex-shrink: 0 !important;
                        margin-top: auto !important;
                    }
                    /* Compact text sizes */
                    .print-compact * {
                        font-size: 11px !important;
                        line-height: 1.3 !important;
                    }
                    .print-compact h2 {
                        font-size: 18px !important;
                    }
                    .print-compact h3 {
                        font-size: 13px !important;
                        margin-bottom: 6px !important;
                        padding-bottom: 4px !important;
                    }
                    .print-compact table {
                        width: 100% !important;
                    }
                    .print-signatures .mb-12 {
                        margin-bottom: 30px !important;
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

                {/* Official Document Style */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-600 overflow-hidden shadow-lg print:shadow-none print:border print:rounded-none print-compact print-document">

                    {/* Document Header */}
                    <div className="bg-gradient-to-l from-blue-600 to-blue-800 text-white p-6 print:p-3 print:bg-blue-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl print:text-lg font-bold mb-1 print:mb-0">تقرير استلام مواد خام</h2>
                                <p className="text-blue-200 text-sm print:text-xs">Material Receiving Report</p>
                            </div>
                            <div className="text-left">
                                <div className="bg-white/20 backdrop-blur px-4 py-2 print:px-2 print:py-1 rounded-lg">
                                    <p className="text-xs print:text-[10px] text-blue-200">رقم الاستلام</p>
                                    <p className="text-xl print:text-sm font-bold font-mono">{receiving.receivingNumber}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex justify-end px-6 -mt-4">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-lg ${materialReceivingStatusColors[receiving.status].bg} ${materialReceivingStatusColors[receiving.status].text} border-2 border-white dark:border-gray-800`}>
                            {receiving.status === 'pending' && <ClockIcon className="w-5 h-5" />}
                            {receiving.status === 'accepted' && <CheckCircleIcon className="w-5 h-5" />}
                            {receiving.status === 'rejected' && <XCircleIcon className="w-5 h-5" />}
                            {materialReceivingStatusLabels[receiving.status]}
                        </div>
                    </div>

                    <div className="p-6 space-y-6 print:p-3 print:space-y-2 print-content">
                        {/* Material Information */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-blue-600 pb-2 mb-3">
                                معلومات المادة
                            </h3>
                            <table className="w-full">
                                <tbody>
                                    <InfoRow label="اسم المادة" value={receiving.materialName} highlight />
                                    <InfoRow label="كود المادة" value={receiving.materialCode} mono />
                                    <InfoRow label="نوع المادة" value={receiving.materialType} />
                                    <InfoRow label="رقم الدفعة (Batch)" value={receiving.batchNumber} mono highlight />
                                </tbody>
                            </table>
                        </div>

                        {/* Supplier & Quantity */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-orange-500 pb-2 mb-3">
                                المورد والكمية
                            </h3>
                            <table className="w-full">
                                <tbody>
                                    <InfoRow label="المورد" value={receiving.supplierName} highlight />
                                    <InfoRow label="الكمية" value={`${receiving.quantity} ${receiving.unit}`} highlight />
                                    <InfoRow label="نوع التعبئة" value={receiving.packagingType} />
                                </tbody>
                            </table>
                        </div>

                        {/* Dates */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-green-500 pb-2 mb-3">
                                التواريخ
                            </h3>
                            <table className="w-full">
                                <tbody>
                                    <InfoRow label="تاريخ الاستلام" value={formatDate(receiving.receivedAt)} />
                                    <InfoRow label="تاريخ الإنتاج" value={receiving.productionDate ? formatDate(receiving.productionDate) : null} />
                                    <InfoRow label="تاريخ الانتهاء" value={receiving.expiryDate ? formatDate(receiving.expiryDate) : null} />
                                </tbody>
                            </table>
                        </div>

                        {/* Documents */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-purple-500 pb-2 mb-3">
                                المستندات والوثائق
                            </h3>
                            <table className="w-full">
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
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-teal-500 pb-2 mb-3">
                                التخزين
                            </h3>
                            <table className="w-full">
                                <tbody>
                                    <InfoRow label="موقع التخزين" value={receiving.storageLocation} />
                                    <InfoRow label="ظروف التخزين" value={receiving.storageCondition} />
                                </tbody>
                            </table>
                        </div>

                        {/* Receiver Info */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-gray-400 pb-2 mb-3">
                                بيانات الاستلام
                            </h3>
                            <table className="w-full">
                                <tbody>
                                    <InfoRow label="استلم بواسطة" value={receiving.receivedByName} />
                                    <InfoRow label="يتطلب فحص" value={receiving.inspectionRequired ? 'نعم' : 'لا'} />
                                </tbody>
                            </table>
                        </div>

                        {/* Notes */}
                        {receiving.notes && (
                            <div>
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
                        <div className="mt-4 text-center text-[9px] text-gray-400 border-t pt-2">
                            SmarterQMS - نظام إدارة الجودة الذكي | {formatDate(new Date())}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MaterialReceivingDetailsPage;
