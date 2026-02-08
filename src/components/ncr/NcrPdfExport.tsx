/**
 * NCR PDF Export Component
 * تصدير تقرير NCR كـ PDF للطباعة
 */

import { useRef } from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { WORKFLOW_STAGES } from '../../types/ncr';
import type { NcrRecord } from '../../types/ncr';

interface Props {
    ncr: NcrRecord;
}

function formatDate(dateStr: string): string {
    try {
        return new Intl.DateTimeFormat('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateStr));
    } catch {
        return dateStr;
    }
}

const severityLabels = { low: 'منخفض', medium: 'متوسط', high: 'مرتفع' };

export default function NcrPdfExport({ ncr }: Props) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>تقرير عدم المطابقة - ${ncr.id.slice(0, 8)}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
                        padding: 20px;
                        direction: rtl;
                        color: #333;
                    }
                    .header { 
                        text-align: center; 
                        border-bottom: 2px solid #0066cc; 
                        padding-bottom: 15px; 
                        margin-bottom: 20px; 
                    }
                    .header h1 { color: #0066cc; font-size: 24px; }
                    .header p { color: #666; margin-top: 5px; }
                    .section { 
                        margin-bottom: 20px; 
                        border: 1px solid #ddd; 
                        border-radius: 8px; 
                        padding: 15px; 
                    }
                    .section-title { 
                        font-size: 16px; 
                        font-weight: bold; 
                        color: #0066cc; 
                        margin-bottom: 10px;
                        padding-bottom: 5px;
                        border-bottom: 1px solid #eee;
                    }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                    .field { margin-bottom: 8px; }
                    .field-label { font-size: 12px; color: #666; }
                    .field-value { font-size: 14px; font-weight: 500; }
                    .description { 
                        background: #f9f9f9; 
                        padding: 10px; 
                        border-radius: 5px; 
                        white-space: pre-wrap; 
                    }
                    .status-badge {
                        display: inline-block;
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: bold;
                    }
                    .status-open { background: #fee2e2; color: #dc2626; }
                    .status-closed { background: #dcfce7; color: #16a34a; }
                    .severity-high { background: #fee2e2; color: #dc2626; }
                    .severity-medium { background: #fef3c7; color: #d97706; }
                    .severity-low { background: #dcfce7; color: #16a34a; }
                    .action-item {
                        padding: 10px;
                        background: #f5f5f5;
                        border-radius: 5px;
                        margin-bottom: 8px;
                    }
                    .action-type {
                        display: inline-block;
                        padding: 2px 8px;
                        border-radius: 10px;
                        font-size: 11px;
                        margin-left: 10px;
                    }
                    .type-corrective { background: #dbeafe; color: #2563eb; }
                    .type-preventive { background: #f3e8ff; color: #9333ea; }
                    .footer { 
                        margin-top: 30px; 
                        padding-top: 15px; 
                        border-top: 1px solid #ddd;
                        text-align: center;
                        font-size: 11px;
                        color: #999;
                    }
                    @media print {
                        body { padding: 0; }
                        .section { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                ${content.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const currentStage = WORKFLOW_STAGES[ncr.currentStage];

    return (
        <>
            {/* Print Button */}
            <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
                <PrinterIcon className="w-5 h-5" />
                طباعة PDF
            </button>

            {/* Hidden Print Content */}
            <div ref={printRef} className="hidden">
                <div className="header">
                    <h1>تقرير عدم المطابقة (NCR)</h1>
                    <p>رقم التقرير: {ncr.id.slice(0, 8).toUpperCase()}</p>
                </div>

                {/* Basic Info */}
                <div className="section">
                    <div className="section-title">المعلومات الأساسية</div>
                    <div className="grid">
                        <div className="field">
                            <div className="field-label">القسم</div>
                            <div className="field-value">{ncr.department}</div>
                        </div>
                        <div className="field">
                            <div className="field-label">المنتج</div>
                            <div className="field-value">{ncr.description?.slice(0, 50) || '-'}</div>
                        </div>
                        <div className="field">
                            <div className="field-label">تاريخ الإنشاء</div>
                            <div className="field-value">{formatDate(ncr.createdAt)}</div>
                        </div>
                        <div className="field">
                            <div className="field-label">الحالة</div>
                            <span className={`status-badge ${ncr.status === 'closed' ? 'status-closed' : 'status-open'}`}>
                                {ncr.status === 'closed' ? 'مغلق' : 'مفتوح'}
                            </span>
                        </div>
                        <div className="field">
                            <div className="field-label">الشدة</div>
                            <span className={`status-badge severity-${ncr.severity}`}>
                                {severityLabels[ncr.severity]}
                            </span>
                        </div>
                        <div className="field">
                            <div className="field-label">المرحلة الحالية</div>
                            <div className="field-value">{currentStage?.name}</div>
                        </div>
                        <div className="field">
                            <div className="field-label">اكتشف بواسطة</div>
                            <div className="field-value">{ncr.discoveredBy}</div>
                        </div>
                        <div className="field">
                            <div className="field-label">أنشئ بواسطة</div>
                            <div className="field-value">{ncr.createdBy}</div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="section">
                    <div className="section-title">وصف عدم المطابقة</div>
                    <div className="description">{ncr.description}</div>
                </div>

                {/* Immediate Action */}
                {ncr.immediateAction && (
                    <div className="section">
                        <div className="section-title">الإجراء الفوري</div>
                        <div className="description">{ncr.immediateAction}</div>
                    </div>
                )}

                {/* Root Cause */}
                {ncr.rootCause && (
                    <div className="section">
                        <div className="section-title">تحليل السبب الجذري</div>
                        <div className="description">{ncr.rootCause}</div>
                        {ncr.rootCauseApproval && (
                            <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                                الحالة: {ncr.rootCauseApproval.status === 'approved' ? '✅ تمت الموافقة' : ncr.rootCauseApproval.status === 'rejected' ? '❌ مرفوض' : '⏳ بانتظار الموافقة'}
                                {ncr.rootCauseApproval.proposedByName && ` | بواسطة: ${ncr.rootCauseApproval.proposedByName}`}
                            </p>
                        )}
                    </div>
                )}

                {/* CAPA Actions */}
                {ncr.actions && ncr.actions.length > 0 && (
                    <div className="section">
                        <div className="section-title">الإجراءات التصحيحية والوقائية (CAPA)</div>
                        {ncr.actions.map((action, index) => (
                            <div key={index} className="action-item">
                                <span className={`action-type ${action.type === 'corrective' ? 'type-corrective' : 'type-preventive'}`}>
                                    {action.type === 'corrective' ? 'تصحيحي' : 'وقائي'}
                                </span>
                                <strong>{action.description}</strong>
                                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                    المسؤول: {action.responsiblePerson} |
                                    الموعد: {action.targetDate || '-'} |
                                    الحالة: {action.status === 'completed' ? 'مكتمل' : action.status === 'in-progress' ? 'قيد التنف��ذ' : 'معلق'}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Verification */}
                {ncr.verification && (
                    <div className="section">
                        <div className="section-title">التحقق والإغلاق</div>
                        <div className="grid">
                            <div className="field">
                                <div className="field-label">تم التحقق بواسطة</div>
                                <div className="field-value">{ncr.verification.verifiedBy}</div>
                            </div>
                            <div className="field">
                                <div className="field-label">النتيجة</div>
                                <div className="field-value">{ncr.verification.result === 'success' ? '✅ ناجح' : '❌ فاشل'}</div>
                            </div>
                        </div>
                        {ncr.verification.notes && (
                            <div className="description" style={{ marginTop: '10px' }}>
                                {ncr.verification.notes}
                            </div>
                        )}
                    </div>
                )}

                <div className="footer">
                    تم إنشاء هذا التقرير بتاريخ {formatDate(new Date().toISOString())} | نظام إدارة NCR
                </div>
            </div>
        </>
    );
}
