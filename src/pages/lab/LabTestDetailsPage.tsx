/**
 * Lab Test Details Page
 * صفحة تفاصيل وإجراء الفحص المخبري
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowRightIcon,
    PrinterIcon,
    CheckCircleIcon,
    XCircleIcon,
    BeakerIcon,
    CalendarIcon,
    UserIcon,
    ClipboardDocumentCheckIcon,
    ArrowPathIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';
import { DetailPageSkeleton } from '../../components/common/LoadingStates';
import * as labService from '../../services/labService';
import { FormattedDate } from '../../components/common/FormattedDate';
import type { LabTest, LabTestParameter } from '../../domain/lab/types';
import {
    labTestStatusLabels,
    labTestStatusColors,
    labTestTypeLabels
} from '../../domain/lab/types';

const LabTestDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [test, setTest] = useState<LabTest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Test Results State
    const [parameters, setParameters] = useState<LabTestParameter[]>([]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await labService.getLabTestById(id!);
            if (data) {
                setTest(data);
                setParameters(data.parameters || []);
                setNotes(data.notes || '');
            } else {
                setError('الفحص غير موجود');
            }
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResultChange = (index: number, value: string | number) => {
        const newParams = [...parameters];
        const param = { ...newParams[index] };
        param.result = value;

        // Auto Status Calculation
        if (value !== undefined && value !== '') {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            if (!isNaN(numValue)) {
                if (param.minValue !== undefined && numValue < param.minValue) {
                    param.status = 'fail';
                } else if (param.maxValue !== undefined && numValue > param.maxValue) {
                    param.status = 'fail';
                } else {
                    param.status = 'pass';
                }
            } else {
                // If not a number, maybe text matching or manual
                param.status = 'pending';
            }
        } else {
            param.status = 'pending';
        }

        newParams[index] = param;
        setParameters(newParams);
    };

    const handleManualStatusChange = (index: number, status: 'pass' | 'fail' | 'pending') => {
        const newParams = [...parameters];
        newParams[index] = { ...newParams[index], status };
        setParameters(newParams);
    };

    const saveProgress = async () => {
        if (!test) return;
        setIsSaving(true);
        try {
            const success = await labService.updateLabTestResults(test.id, parameters);
            if (success) {
                // Show notification?
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const completeTest = async () => {
        if (!test) return;

        // Check if all parameters have results
        const missingResults = parameters.some(p => p.result === undefined || p.result === '');
        if (missingResults) {
            if (!window.confirm('بعض المعايير لا تحتوي على نتائج. هل تود الإكمال على أي حال؟')) {
                return;
            }
        }

        setIsSaving(true);
        try {
            const success = await labService.updateLabTestResults(test.id, parameters, 'completed');
            if (success) {
                loadData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const approveTest = async () => {
        if (!test) return;
        if (!window.confirm('هل أنت متأكد من اعتماد نتائج هذا الفحص؟')) return;

        setIsSaving(true);
        try {
            const success = await labService.approveLabTest(test.id, true, 'تم الاعتماد من قبل المسؤول', 'user-1', 'أحمد محمد');
            if (success) {
                loadData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const rejectTest = async () => {
        if (!test) return;
        const reason = window.prompt('يرجى ذكر سبب الرفض:');
        if (!reason) return;

        setIsSaving(true);
        try {
            const success = await labService.approveLabTest(test.id, false, reason, 'user-1', 'أحمد محمد');
            if (success) {
                loadData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <DetailPageSkeleton />;
    }

    if (error || !test) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
                    {error || 'الفحص غير موجود'}
                </div>
                <button onClick={() => navigate('/lab/tests/results')} className="mt-4 text-primary-600 flex items-center gap-2">
                    <ArrowRightIcon className="w-4 h-4" /> العودة للقائمة
                </button>
            </div>
        );
    }

    const isEditable = test.status === 'pending' || test.status === 'in_progress';
    const isApprovable = test.status === 'completed';

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/lab/tests/results')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <ArrowRightIcon className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            {test.testNumber}
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${labTestStatusColors[test.status].bg} ${labTestStatusColors[test.status].text}`}>
                                {labTestStatusLabels[test.status]}
                            </span>
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {labTestTypeLabels[test.testType]} - {test.sample.sourceName}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isEditable && (
                        <>
                            <button
                                onClick={saveProgress}
                                disabled={isSaving}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                            >
                                <ArrowPathIcon className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                                حفظ المسودة
                            </button>
                            <button
                                onClick={completeTest}
                                disabled={isSaving}
                                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md flex items-center gap-2"
                            >
                                <ClipboardDocumentCheckIcon className="w-5 h-5" />
                                إكمال الفحص
                            </button>
                        </>
                    )}

                    {isApprovable && (
                        <>
                            <button
                                onClick={rejectTest}
                                disabled={isSaving}
                                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
                            >
                                <XCircleIcon className="w-5 h-5" />
                                رفض
                            </button>
                            <button
                                onClick={approveTest}
                                disabled={isSaving}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md flex items-center gap-2"
                            >
                                <CheckCircleIcon className="w-5 h-5" />
                                اعتماد
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => window.print()}
                        className="p-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100"
                        title="طباعة التقرير"
                    >
                        <PrinterIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Information Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <BeakerIcon className="w-5 h-5 text-primary-600" />
                            بيانات العينة
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 block">اسم المادة</label>
                                <div className="font-bold text-gray-900 dark:text-white text-lg">{test.sample.sourceName}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400 block">رقم العينة</label>
                                    <div className="font-mono text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded inline-block">
                                        {test.sample.sampleNumber}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400 block">أولوية</label>
                                    <div className={`font-medium ${test.priority === 'critical' ? 'text-red-600' :
                                        test.priority === 'urgent' ? 'text-orange-600' :
                                            'text-gray-700 dark:text-gray-300'
                                        }`}>
                                        {test.priority === 'critical' ? 'حرجة' : test.priority === 'urgent' ? 'عاجلة' : 'عادية'}
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <UserIcon className="w-4 h-4" />
                                    <span>بواسطة: {test.requestedByName}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <CalendarIcon className="w-4 h-4" />
                                    <span>تاريخ الطلب: <FormattedDate date={test.requestedAt} /></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {test.approvalNotes && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800/50 p-6 shadow-sm">
                            <h2 className="text-orange-800 dark:text-orange-400 font-bold mb-2 flex items-center gap-2">
                                <DocumentTextIcon className="w-5 h-5" />
                                ملاحظات المراجعة
                            </h2>
                            <p className="text-sm text-orange-700 dark:text-orange-300 leading-relaxed">
                                {test.approvalNotes}
                            </p>
                        </div>
                    )}
                </div>

                {/* Parameters Execution Card */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <ClipboardDocumentCheckIcon className="w-6 h-6 text-primary-600" />
                                نتائج المعايير
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 text-right">
                                    <tr>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500">المعيار</th>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500">المواصفة المطلوبة</th>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500">النتيجة</th>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500">التقييم</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {parameters.map((param, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">{param.name}</div>
                                                {param.method && <div className="text-xs text-gray-500">الطريقة: {param.method}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                                    {param.minValue !== undefined && param.maxValue !== undefined ? `${param.minValue} - ${param.maxValue}` :
                                                        param.minValue !== undefined ? `≥ ${param.minValue}` :
                                                            param.maxValue !== undefined ? `≤ ${param.maxValue}` : 'مواصفة نصية'}
                                                    <span className="mr-1 text-gray-400">{param.unit}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditable ? (
                                                    <input
                                                        type="text"
                                                        value={param.result || ''}
                                                        onChange={(e) => handleResultChange(idx, e.target.value)}
                                                        className="w-24 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
                                                        placeholder="النتيجة"
                                                    />
                                                ) : (
                                                    <span className="font-bold underline decoration-dotted">{param.result || '-'}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${param.status === 'pass' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                                                        param.status === 'fail' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {param.status === 'pass' ? 'مطابق' : param.status === 'fail' ? 'غير مطابق' : 'قيد الانتظار'}
                                                    </span>
                                                    {isEditable && (
                                                        <div className="flex bg-gray-100 p-0.5 rounded-lg">
                                                            <button
                                                                onClick={() => handleManualStatusChange(idx, 'pass')}
                                                                className={`p-1 rounded ${param.status === 'pass' ? 'bg-white shadow text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                                                            >
                                                                <CheckCircleIcon className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleManualStatusChange(idx, 'fail')}
                                                                className={`p-1 rounded ${param.status === 'fail' ? 'bg-white shadow text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                                                            >
                                                                <XCircleIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ملاحظات الفني / المختبر</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={!isEditable}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 outline-none resize-none disabled:bg-gray-50"
                            placeholder="أضف أي ملاحظات حول سير الفحص..."
                        />
                    </div>
                </div>
            </div>

            {/* Print Only Header (Hidden by default) */}
            <div className="hidden print:block print:p-8">
                <div className="text-center mb-10 pb-8 border-b-2 border-gray-900">
                    <h1 className="text-3xl font-black mb-2">شهادة فحص مخبري</h1>
                    <p className="text-gray-600">Lab Analysis Certificate - SmarterQMS</p>
                </div>
                {/* Print layout would go here, reusing parts of the above components but styled for static display */}
            </div>
        </div>
    );
};

export default LabTestDetailsPage;
