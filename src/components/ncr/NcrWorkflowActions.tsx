/**
 * NCR Workflow Actions Component
 * مكون إجراءات سير العمل مع التحقق من الصلاحيات
 * 
 * Updated: 2025-12-31 - Using stage-based permissions per architecture redesign
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    PlusIcon,
    CheckIcon,
    XMarkIcon,
    ArrowRightIcon,
    DocumentTextIcon,
    ClipboardDocumentListIcon,
    LockClosedIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../config/supabase';
import hrService from '../../modules/hr/services/hrService';
import {
    proposeRootCause,
    reviewRootCause,
    addCapaAction,
    updateCapaStatus,
    progressToNextStage,
    verifyAndClose,
    returnToPreviousStage
} from '../../services/ncr/ncrService';
import { useNcrStagePermissions } from '../../hooks/ncr/useNcrStagePermissions';
import { InlineLoading } from '../common/LoadingStates';
import { WORKFLOW_STAGES } from '../../types/ncr';
import type { NcrRecord, CapaAction } from '../../types/ncr';
import type { HrEmployeeListItem } from '../../modules/hr/types';

interface Props {
    ncr: NcrRecord;
    onUpdate: (ncr: NcrRecord) => void;
    userInfo: {
        id: string;
        name: string;
        email: string;
        role: 'department' | 'quality';
    };
}

interface LookupOption {
    id: string;
    label: string;
    description?: string;
}

type DepartmentLookup = { id: string; name: string; name_ar?: string | null };
type EmployeeLookup = Pick<
    HrEmployeeListItem,
    'id' | 'name' | 'email' | 'baseEmployeeCode' | 'departmentId' | 'departmentName' | 'jobTitleText' | 'employmentStatus' | 'isActive'
>;

function SearchableSelect({
    label,
    placeholder,
    options,
    value,
    onChange,
    disabled = false,
    emptyMessage = 'لا توجد نتائج'
}: {
    label: string;
    placeholder: string;
    options: LookupOption[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    emptyMessage?: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef<HTMLDivElement | null>(null);
    const selected = options.find((option) => option.id === value);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((option) =>
            `${option.label} ${option.description || ''}`.toLowerCase().includes(q)
        );
    }, [options, query]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    return (
        <div ref={rootRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    setOpen((current) => !current);
                    setQuery('');
                }}
                className="flex min-h-[42px] w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-right text-sm text-gray-900 shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
            >
                <span className={selected ? '' : 'text-gray-500 dark:text-gray-300'}>
                    {selected?.label || placeholder}
                </span>
                <span className="text-gray-400">▾</span>
            </button>
            {open && !disabled && (
                <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
                    <div className="p-2">
                        <input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="بحث..."
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-3 text-sm text-gray-500 dark:text-gray-300">{emptyMessage}</div>
                        ) : (
                            filtered.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.id);
                                        setOpen(false);
                                        setQuery('');
                                    }}
                                    className={`block w-full px-3 py-2 text-right text-sm hover:bg-primary-50 dark:hover:bg-gray-600 ${value === option.id ? 'bg-primary-50 text-primary-700 dark:bg-gray-600 dark:text-white' : 'text-gray-800 dark:text-gray-100'}`}
                                >
                                    <span className="block font-medium">{option.label}</span>
                                    {option.description && (
                                        <span className="block text-xs text-gray-500 dark:text-gray-300">{option.description}</span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function NcrWorkflowActions({ ncr, onUpdate, userInfo }: Props) {
    // Stage-based permission checks (following architecture redesign)
    const {
        loading: permLoading,
        canProposeRootCause,
        canApproveRootCause,
        canAddCapa,
        canCompleteCapa,
        canProgressWorkflow,
        canVerifyAndClose,
        canReopen,
        isAdmin,
        currentStage
    } = useNcrStagePermissions(ncr.currentStage as import('../../types/ncr').NcrStage);

    // Derive user role display from permissions
    const userRole = isAdmin ? 'admin' : (currentStage || 'user');

    const [showRootCauseForm, setShowRootCauseForm] = useState(false);
    const [showCapaForm, setShowCapaForm] = useState(false);
    const [showVerifyForm, setShowVerifyForm] = useState(false);
    const [rootCauseText, setRootCauseText] = useState(ncr.rootCause || '');
    const [capaForm, setCapaForm] = useState({
        type: 'corrective' as 'corrective' | 'preventive',
        description: '',
        responsibleDeptId: '',
        responsiblePersonId: '',
        targetDate: ''
    });
    const [verificationNotes, setVerificationNotes] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [departments, setDepartments] = useState<DepartmentLookup[]>([]);
    const [employees, setEmployees] = useState<EmployeeLookup[]>([]);

    const isClosed = !!ncr.closedAt;
    const currentStageInfo = WORKFLOW_STAGES[ncr.currentStage];
    const workflowStageOrder: NcrRecord['currentStage'][] = [
        'initial_report',
        'root_cause_analysis',
        'capa_planning',
        'capa_execution',
        'verification_closure'
    ];
    const currentStageIndex = workflowStageOrder.indexOf(ncr.currentStage);
    const previousStageCode = currentStageIndex > 0 ? workflowStageOrder[currentStageIndex - 1] : null;
    const previousStageLabel = previousStageCode ? WORKFLOW_STAGES[previousStageCode]?.name : null;
    const canReturnToPreviousStage = Boolean(previousStageCode) && (canReopen || isAdmin);
    const selectedDepartment = departments.find((department) => department.id === capaForm.responsibleDeptId);
    const responsibleEmployees = useMemo(() => {
        if (!capaForm.responsibleDeptId) return employees;

        const matchesSelectedDepartment = (employee: EmployeeLookup) =>
            employee.departmentId === capaForm.responsibleDeptId
            || (!!selectedDepartment && employee.departmentName === (selectedDepartment.name_ar || selectedDepartment.name))
            || (!!selectedDepartment && employee.departmentName === selectedDepartment.name);

        const departmentEmployees = employees.filter(matchesSelectedDepartment);
        const otherEmployees = employees.filter((employee) => !matchesSelectedDepartment(employee));
        return [...departmentEmployees, ...otherEmployees];
    }, [capaForm.responsibleDeptId, employees, selectedDepartment]);

    const departmentOptions = departments.map((dept) => ({
        id: dept.id,
        label: dept.name_ar || dept.name,
        description: dept.name_ar && dept.name_ar !== dept.name ? dept.name : undefined
    }));
    const userOptions = responsibleEmployees.map((employee) => ({
        id: employee.id,
        label: employee.name || employee.email || employee.id,
        description: [
            employee.baseEmployeeCode,
            employee.departmentName,
            employee.jobTitleText,
            employee.isActive ? undefined : 'غير نشط'
        ].filter(Boolean).join(' | ') || undefined
    }));

    useEffect(() => {
        let isMounted = true;

        const loadCapaLookup = async () => {
            try {
                const [{ data: deptRows, error: deptError }, employeeRows] = await Promise.all([
                    supabase
                        .from('departments')
                        .select('id, name, name_ar')
                        .eq('is_active', true)
                        .order('display_order', { ascending: true }),
                    hrService.listEmployees(500)
                ]);

                if (deptError) {
                    console.warn('Unable to load NCR CAPA departments:', deptError.message);
                }

                if (!isMounted) return;
                setDepartments(deptRows || []);
                setEmployees(employeeRows.filter((employee) =>
                    employee.employmentStatus !== 'archived'
                ));
            } catch (error) {
                console.warn('Unable to load NCR CAPA lookup data:', error);
                if (!isMounted) return;
                setDepartments([]);
                setEmployees([]);
            }
        };

        loadCapaLookup();

        return () => {
            isMounted = false;
        };
    }, []);

    // Root cause analysis handlers
    const handleProposeRootCause = async () => {
        if (!rootCauseText.trim()) return;
        setIsProcessing(true);
        try {
            const updated = await proposeRootCause(
                ncr.id,
                rootCauseText,
                userInfo.id,
                userInfo.name,
                userInfo.email,
                userInfo.role,
                ncr.companyId
            );
            onUpdate(updated);
            setShowRootCauseForm(false);
        } catch (error) {
            console.error('Error proposing root cause:', error);
            alert('حدث خطأ في إرسال تحليل السبب الجذري');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReviewRootCause = async (approved: boolean, rejectionReason?: string) => {
        setIsProcessing(true);
        try {
            const updated = await reviewRootCause(
                ncr.id,
                approved,
                userInfo.id,
                userInfo.name,
                userInfo.email,
                userInfo.role,
                approved ? undefined : rejectionReason,
                ncr.companyId
            );
            onUpdate(updated);
        } catch (error) {
            console.error('Error reviewing root cause:', error);
            alert('حدث خطأ في مراجعة السبب الجذري');
        } finally {
            setIsProcessing(false);
        }
    };

    // CAPA handlers
    const handleAddCapa = async () => {
        if (!capaForm.description.trim() || !capaForm.responsibleDeptId || !capaForm.responsiblePersonId || !capaForm.targetDate) return;
        setIsProcessing(true);
        try {
            const selectedDept = departments.find((d) => d.id === capaForm.responsibleDeptId);
            const selectedEmployee = employees.find((employee) => employee.id === capaForm.responsiblePersonId);
            const updated = await addCapaAction(ncr.id, {
                type: capaForm.type,
                description: capaForm.description,
                responsibleDeptId: capaForm.responsibleDeptId,
                responsibleDept: selectedDept?.name_ar || selectedDept?.name || '',
                responsiblePersonId: capaForm.responsiblePersonId,
                responsiblePerson: selectedEmployee?.name || selectedEmployee?.email || '',
                targetDate: capaForm.targetDate
            }, ncr.companyId);
            onUpdate(updated);
            setCapaForm({
                type: 'corrective',
                description: '',
                responsibleDeptId: '',
                responsiblePersonId: '',
                targetDate: ''
            });
            setShowCapaForm(false);
        } catch (error) {
            console.error('Error adding CAPA:', error);
            alert('حدث خطأ في إضافة الإجراء');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateCapaStatus = async (actionId: string, status: CapaAction['status']) => {
        setIsProcessing(true);
        try {
            const updated = await updateCapaStatus(ncr.id, actionId, status, ncr.companyId);
            onUpdate(updated);
        } catch (error) {
            console.error('Error updating CAPA status:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Stage progression
    const handleProgressStage = async () => {
        if (!confirm(`هل تريد الانتقال للمرحلة التالية؟`)) return;
        setIsProcessing(true);
        try {
            const updated = await progressToNextStage(
                ncr.id,
                userInfo.id,
                userInfo.name,
                userInfo.email,
                undefined,
                ncr.companyId
            );
            onUpdate(updated);
        } catch (error) {
            console.error('Error progressing stage:', error);
            alert('حدث خطأ في تقديم المرحلة');
        } finally {
            setIsProcessing(false);
        }
    };

    // Verification & close
    const handleVerifyAndClose = async (result: 'success' | 'fail') => {
        setIsProcessing(true);
        try {
            const updated = await verifyAndClose(ncr.id, userInfo.name, verificationNotes, result, ncr.companyId);
            onUpdate(updated);
            setShowVerifyForm(false);
        } catch (error) {
            console.error('Error verifying NCR:', error);
            const message = (error as { message?: string })?.message || 'حدث خطأ في التحقق';
            alert(message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReturnToPreviousStage = async () => {
        if (!previousStageCode || !previousStageLabel) return;
        if (!confirm(`هل تريد إرجاع الحالة إلى مرحلة "${previousStageLabel}"؟`)) return;

        setIsProcessing(true);
        try {
            const notes = ncr.currentStage === 'verification_closure' && ncr.verification?.result === 'fail'
                ? 'إرجاع الحالة بعد فشل التحقق'
                : `إرجاع الحالة إلى المرحلة السابقة (${previousStageLabel})`;

            const updated = await returnToPreviousStage(
                ncr.id,
                userInfo.id || userInfo.name,
                userInfo.name,
                userInfo.email,
                notes,
                ncr.companyId
            );
            onUpdate(updated);
            setShowVerifyForm(false);
        } catch (error) {
            console.error('Error returning NCR to previous stage:', error);
            alert('تعذر إرجاع الحالة إلى المرحلة السابقة');
        } finally {
            setIsProcessing(false);
        }
    };

    // Closed NCR
    if (isClosed) {
        return (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                <CheckIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 dark:text-green-300 font-medium">تم إغلاق هذا التقرير</p>
            </div>
        );
    }

    // Loading permissions
    if (permLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
                <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
            </div>
        );
    }

    // Check if user has any permissions
    const hasAnyNcrPermission = canProposeRootCause || canApproveRootCause ||
        canAddCapa || canCompleteCapa ||
        canProgressWorkflow || canVerifyAndClose || canReopen;

    if (!hasAnyNcrPermission) {
        return (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-center">
                <LockClosedIcon className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-yellow-800 dark:text-yellow-300 font-medium">لا تملك صلاحية للقيام بإجراءات في هذه المرحلة</p>
                <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">دورك: {userRole}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Current Stage Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClipboardDocumentListIcon className="w-5 h-5 text-primary-600" />
                        إجراءات المرحلة الحالية
                    </h2>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                        {currentStageInfo?.name}
                    </span>
                </div>

                {/* Root Cause Analysis Section */}
                {(ncr.currentStage === 'initial_report' || ncr.currentStage === 'root_cause_analysis') &&
                    (canProposeRootCause || canApproveRootCause) && (
                        <div className="mb-6">
                            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <DocumentTextIcon className="w-4 h-4" />
                                تحليل السبب الجذري
                            </h3>

                            {ncr.rootCauseApproval ? (
                                <div className="space-y-3">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                            {ncr.rootCauseApproval.rootCauseText}
                                        </p>
                                        <div className="mt-2 text-sm text-gray-500">
                                            اقتُرح بواسطة: {ncr.rootCauseApproval.proposedByName}
                                        </div>
                                    </div>

                                    {/* Approval status */}
                                    <div className={`p-3 rounded-lg ${ncr.rootCauseApproval.status === 'approved'
                                        ? 'bg-green-100 text-green-800'
                                        : ncr.rootCauseApproval.status === 'rejected'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {ncr.rootCauseApproval.status === 'approved' && '✅ تمت الموافقة'}
                                        {ncr.rootCauseApproval.status === 'rejected' && '❌ تم الرفض'}
                                        {ncr.rootCauseApproval.status === 'pending' && '⏳ بانتظار المراجعة'}
                                        {ncr.rootCauseApproval.status === 'rejected' && ncr.rootCauseApproval.rejectionReason && (
                                            <div className="mt-2 text-sm">
                                                سبب الرفض: {ncr.rootCauseApproval.rejectionReason}
                                            </div>
                                        )}
                                    </div>

                                    {/* Review buttons */}
                                    {ncr.rootCauseApproval.status === 'pending' &&
                                        canApproveRootCause && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleReviewRootCause(true)}
                                                    disabled={isProcessing}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                                >
                                                    <CheckIcon className="w-4 h-4" />
                                                    موافقة
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const reason = prompt('سبب الرفض:');
                                                        if (reason) {
                                                            handleReviewRootCause(false, reason);
                                                        }
                                                    }}
                                                    disabled={isProcessing}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                                >
                                                    <XMarkIcon className="w-4 h-4" />
                                                    رفض
                                                </button>
                                            </div>
                                        )}
                                    {ncr.rootCauseApproval.status === 'rejected' && canProposeRootCause && (
                                        <div className="space-y-3">
                                            {showRootCauseForm ? (
                                                <>
                                                    <textarea
                                                        value={rootCauseText}
                                                        onChange={(e) => setRootCauseText(e.target.value)}
                                                        rows={4}
                                                        placeholder="أدخل تحليل السبب الجذري المعدل..."
                                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleProposeRootCause}
                                                            disabled={isProcessing || !rootCauseText.trim()}
                                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                                                        >
                                                            {isProcessing ? 'جاري الإرسال...' : 'إعادة الإرسال للموافقة'}
                                                        </button>
                                                        <button
                                                            onClick={() => setShowRootCauseForm(false)}
                                                            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                                                        >
                                                            إلغاء
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setRootCauseText(ncr.rootCauseApproval?.rootCauseText || ncr.rootCause || '');
                                                        setShowRootCauseForm(true);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-red-300 text-red-700 rounded-lg hover:border-primary-400 hover:text-primary-600 transition-colors"
                                                >
                                                    <PlusIcon className="w-5 h-5" />
                                                    تعديل السبب الجذري وإعادة الإرسال
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : canProposeRootCause ? (
                                <>
                                    {showRootCauseForm ? (
                                        <div className="space-y-3">
                                            <textarea
                                                value={rootCauseText}
                                                onChange={(e) => setRootCauseText(e.target.value)}
                                                rows={4}
                                                placeholder="أدخل تحليل السبب الجذري..."
                                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleProposeRootCause}
                                                    disabled={isProcessing || !rootCauseText.trim()}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                                                >
                                                    {isProcessing ? 'جاري الإرسال...' : 'إرسال للموافقة'}
                                                </button>
                                                <button
                                                    onClick={() => setShowRootCauseForm(false)}
                                                    className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                                                >
                                                    إلغاء
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowRootCauseForm(true)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-primary-400 hover:text-primary-600 transition-colors"
                                        >
                                            <PlusIcon className="w-5 h-5" />
                                            إضافة تحليل السبب الجذري
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-center text-gray-500">
                                    بانتظار اقتراح تحليل السبب الجذري
                                </div>
                            )}
                        </div>
                    )}

                {/* CAPA Section */}
                {(ncr.currentStage === 'capa_planning' || ncr.currentStage === 'capa_execution') &&
                    (canAddCapa || canCompleteCapa) && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-md font-medium text-gray-900 dark:text-white">
                                    الإجراءات التصحيحية والوقائية (CAPA)
                                </h3>
                                {canAddCapa && (
                                    <button
                                        onClick={() => setShowCapaForm(true)}
                                        className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        إضافة إجراء
                                    </button>
                                )}
                            </div>

                            {/* CAPA Form */}
                            {showCapaForm && (
                                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النوع</label>
                                            <select
                                                value={capaForm.type}
                                                onChange={(e) => setCapaForm({ ...capaForm, type: e.target.value as 'corrective' | 'preventive' })}
                                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-600"
                                            >
                                                <option value="corrective">تصحيحي</option>
                                                <option value="preventive">وقائي</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الموعد المستهدف</label>
                                            <input
                                                type="date"
                                                value={capaForm.targetDate}
                                                onChange={(e) => setCapaForm({ ...capaForm, targetDate: e.target.value })}
                                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-600"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف</label>
                                        <textarea
                                            value={capaForm.description}
                                            onChange={(e) => setCapaForm({ ...capaForm, description: e.target.value })}
                                            rows={2}
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-600"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <SearchableSelect
                                                label="القسم المسؤول"
                                                placeholder="اختر القسم"
                                                options={departmentOptions}
                                                value={capaForm.responsibleDeptId}
                                                onChange={(responsibleDeptId) => setCapaForm({
                                                    ...capaForm,
                                                    responsibleDeptId,
                                                    responsiblePersonId: ''
                                                })}
                                                emptyMessage="لا توجد أقسام مطابقة"
                                            />
                                        </div>
                                        <div>
                                            <SearchableSelect
                                                label="الشخص المسؤول"
                                                placeholder="اختر المسؤول"
                                                options={userOptions}
                                                value={capaForm.responsiblePersonId}
                                                onChange={(responsiblePersonId) => setCapaForm({
                                                    ...capaForm,
                                                    responsiblePersonId
                                                })}
                                                disabled={!capaForm.responsibleDeptId}
                                                emptyMessage="لا يوجد مستخدمون مطابقون"
                                            />
                                            {employees.length === 0 && (
                                                <p className="text-xs text-amber-600 mt-1">لا يوجد موظفون متاحون في دليل HR.</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAddCapa}
                                            disabled={isProcessing || !capaForm.description.trim() || !capaForm.responsibleDeptId || !capaForm.responsiblePersonId || !capaForm.targetDate}
                                            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                                        >
                                            إضافة
                                        </button>
                                        <button
                                            onClick={() => setShowCapaForm(false)}
                                            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100"
                                        >
                                            إلغاء
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* CAPA List */}
                            {ncr.actions && ncr.actions.length > 0 && (
                                <div className="space-y-2">
                                    {ncr.actions.map((action) => (
                                        <div key={action.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`px-2 py-0.5 text-xs rounded ${action.type === 'corrective' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                    {action.type === 'corrective' ? 'تصحيحي' : 'وقائي'}
                                                </span>
                                                <select
                                                    value={action.status}
                                                    onChange={(e) => handleUpdateCapaStatus(action.id, e.target.value as CapaAction['status'])}
                                                    disabled={!canCompleteCapa}
                                                    className="text-xs rounded border-gray-300 dark:border-gray-600 dark:bg-gray-600 disabled:opacity-50"
                                                >
                                                    <option value="pending">معلق</option>
                                                    <option value="in-progress">قيد التنفيذ</option>
                                                    <option value="completed">مكتمل</option>
                                                </select>
                                            </div>
                                            <p className="text-sm text-gray-800 dark:text-gray-200">{action.description}</p>
                                            <div className="mt-1 text-xs text-gray-500">
                                                القسم: {action.responsibleDept || '-'} | المسؤول: {action.responsiblePerson || '-'} | الموعد: {action.targetDate || '-'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                {/* Verification Section */}
                {ncr.currentStage === 'verification_closure' && canVerifyAndClose && (
                    <div className="mb-6">
                        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">التحقق والإغلاق</h3>

                        {showVerifyForm ? (
                            <div className="space-y-3">
                                <textarea
                                    value={verificationNotes}
                                    onChange={(e) => setVerificationNotes(e.target.value)}
                                    rows={3}
                                    placeholder="ملاحظات التحقق..."
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleVerifyAndClose('success')}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                        <CheckIcon className="w-4 h-4" />
                                        تحقق ناجح - إغلاق
                                    </button>
                                    <button
                                        onClick={() => handleVerifyAndClose('fail')}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                        تحقق فاشل
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowVerifyForm(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                <CheckIcon className="w-5 h-5" />
                                بدء التحقق والإغلاق
                            </button>
                        )}
                    </div>
                )}

                {/* Return to previous stage (permission matrix: can_return/reopen) */}
                {canReturnToPreviousStage && (
                    <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        {ncr.currentStage === 'verification_closure' && ncr.verification?.result === 'fail' && (
                            <p className="text-sm text-amber-800 mb-2">
                                آخر نتيجة تحقق كانت فاشلة. يمكنك إرجاع الحالة للمرحلة السابقة لاستكمال الإجراءات.
                            </p>
                        )}
                        <button
                            onClick={handleReturnToPreviousStage}
                            disabled={isProcessing}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                        >
                            <ArrowRightIcon className="w-4 h-4" />
                            {previousStageLabel ? `إرجاع إلى ${previousStageLabel}` : 'إرجاع للمرحلة السابقة'}
                        </button>
                    </div>
                )}

                {/* Stage Progress Button */}
                {ncr.currentStage !== 'verification_closure' && canProgressWorkflow && (
                    <button
                        onClick={handleProgressStage}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 disabled:opacity-50"
                    >
                        <ArrowRightIcon className="w-5 h-5 rotate-180" />
                        الانتقال للمرحلة التالية
                    </button>
                )}
            </div>
        </div>
    );
}
