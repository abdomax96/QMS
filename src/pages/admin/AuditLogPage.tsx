/**
 * Audit Log Page
 * صفحة سجل التدقيق
 * 
 * COMPLIANCE: 21 CFR Part 11
 * Displays immutable audit logs with checksum verification status.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    ClipboardDocumentCheckIcon,
    FunnelIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    CheckBadgeIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { auditService } from '../../services/auditService';
import type { AuditEvent, AuditEntityType, AuditAction } from '../../services/auditService';
import { formatDate } from '../../utils';
import { TableSkeleton } from '../../components/common/LoadingStates';

const AuditLogPage: React.FC = () => {
    // State
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [integrityStatus, setIntegrityStatus] = useState<{ valid: boolean; totalRecords: number } | null>(null);
    const [verifying, setVerifying] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        entityType: '' as AuditEntityType | '',
        action: '' as AuditAction | '',
        limit: 50
    });

    // Fetch Logs
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await auditService.queryEvents({
                entityType: filters.entityType || undefined,
                action: filters.action || undefined,
                limit: filters.limit
            });
            setEvents(data);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Verify Integrity
    const verifyIntegrity = async () => {
        setVerifying(true);
        try {
            const result = await auditService.verifyIntegrity();
            setIntegrityStatus({
                valid: result.valid,
                totalRecords: result.totalRecords
            });
        } catch (error) {
            console.error('Error verifying integrity:', error);
        } finally {
            setVerifying(false);
        }
    };

    // Initial Load
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Action Color Mapping
    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'bg-green-100 text-green-800';
            case 'UPDATE': return 'bg-blue-100 text-blue-800';
            case 'DELETE': return 'bg-red-100 text-red-800';
            case 'LOGIN': return 'bg-purple-100 text-purple-800';
            case 'APPROVE': return 'bg-teal-100 text-teal-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClipboardDocumentCheckIcon className="w-8 h-8 text-primary-600" />
                        سجل التدقيق (Audit Trail)
                    </h1>
                    <p className="text-gray-500 mt-1">
                        سجل العمليات الكامل للنظام - متوافق مع معايير الامتثال (21 CFR Part 11)
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={verifyIntegrity}
                        disabled={verifying}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${integrityStatus?.valid
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        {verifying ? (
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        ) : integrityStatus?.valid ? (
                            <CheckBadgeIcon className="w-5 h-5" />
                        ) : (
                            <ShieldCheckIcon className="w-5 h-5" />
                        )}
                        {verifying ? 'جاري التحقق...' : integrityStatus?.valid ? 'السجل سليم' : 'تحقق من النزاهة'}
                    </button>

                    <button
                        onClick={fetchLogs}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                        تحديث
                    </button>
                </div>
            </div>

            {/* Integrity Alert */}
            {integrityStatus && !integrityStatus.valid && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                    <div>
                        <h3 className="font-bold text-red-800">تحذير: تم اكتشاف تلاعب في السجل!</h3>
                        <p className="text-red-700 text-sm">
                            فشل التحقق من صحة سلسلة التشفير (Checksum Chain). يرجى مراجعة مسؤول النظام فوراً.
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <div className="flex items-center gap-2 mb-4 text-gray-700 dark:text-gray-300">
                    <FunnelIcon className="w-5 h-5" />
                    <span className="font-medium">تصفية السجلات</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm text-gray-500 mb-1">نوع الكائن (Entity)</label>
                        <select
                            value={filters.entityType}
                            onChange={(e) => setFilters(prev => ({ ...prev, entityType: e.target.value as AuditEntityType }))}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="">الكل</option>
                            <option value="folder">مجلد</option>
                            <option value="form_template">قالب</option>
                            <option value="form_instance">تقرير</option>
                            <option value="user">مستخدم</option>
                            <option value="ncr">NCR</option>
                            <option value="lab_test">فحص مختبر</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-500 mb-1">الإجراء (Action)</label>
                        <select
                            value={filters.action}
                            onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value as AuditAction }))}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="">الكل</option>
                            <option value="CREATE">إنشاء</option>
                            <option value="UPDATE">تعديل</option>
                            <option value="DELETE">حذف</option>
                            <option value="LOGIN">تسجيل دخول</option>
                            <option value="APPROVE">اعتماد</option>
                            <option value="REJECT">رفض</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={() => setFilters({ entityType: '', action: '', limit: 50 })}
                            className="text-primary-600 hover:underline text-sm mb-2"
                        >
                            إعادة تعيين
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                {loading ? (
                    <TableSkeleton rows={5} />
                ) : events.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>لا توجد سجلات مطابقة لخيارات البحث</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm">
                                <tr>
                                    <th className="px-6 py-3 font-medium">العملية</th>
                                    <th className="px-6 py-3 font-medium">الكائن</th>
                                    <th className="px-6 py-3 font-medium">المستخدم</th>
                                    <th className="px-6 py-3 font-medium">التاريخ والوقت</th>
                                    <th className="px-6 py-3 font-medium">التفاصيل</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {events.map((event) => (
                                    <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(event.action)}`}>
                                                {event.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-900 dark:text-white font-medium">
                                                {event.entity_name || event.entity_id}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono mt-0.5">
                                                {event.entity_type}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            {event.user_name || event.user_email || 'System'}
                                            <div className="text-xs text-gray-400">{event.user_role}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 dir-ltr text-right">
                                            {formatDate(event.timestamp)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {/* Simple visual indicator of changes */}
                                            {event.changed_fields && event.changed_fields.length > 0 ? (
                                                <span className="text-xs text-gray-500" title={event.changed_fields.join(', ')}>
                                                    تعديل {event.changed_fields.length} حقل
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="mt-4 text-center text-xs text-gray-400">
                إظهار أحدث {events.length} سجل. استخدم خيارات البحث للوصول للسجلات الأقدم.
            </div>
        </div>
    );
};

// Quick Icon Component for Verification Button
const ShieldCheckIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
);

export default AuditLogPage;
