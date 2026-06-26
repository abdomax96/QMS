/**
 * NCR Permission Actions Component
 * أزرار إجراءات NCR مع التحقق من صلاحيات المرحلة
 */

import React from 'react';
import { useModulePermissions } from '../../hooks/useModulePermissions';
import {
    TrashIcon,
    PencilIcon,
    DocumentArrowDownIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    CheckCircleIcon,
    XCircleIcon,
    LockClosedIcon,
} from '@heroicons/react/24/outline';

// ==================== Types ====================
interface NcrPermissionActionsProps {
    /** Current NCR stage code */
    stageCode: string;
    /** NCR ID */
    ncrId: string;
    /** Whether NCR is closed */
    isClosed?: boolean;
    /** Callbacks */
    onEdit?: () => void;
    onDelete?: () => void;
    onPrint?: () => void;
    onExport?: () => void;
    onAdvance?: () => void;
    onReturn?: () => void;
    onApprove?: () => void;
    onReject?: () => void;
    /** Custom class */
    className?: string;
}

// ==================== Main Component ====================
const NcrPermissionActions: React.FC<NcrPermissionActionsProps> = ({
    stageCode,
    ncrId,
    isClosed = false,
    onEdit,
    onDelete,
    onExport,
    onAdvance,
    onReturn,
    onApprove,
    onReject,
    className = '',
}) => {
    const { canPerformNcrAction, canAdvanceNcr, canReturnNcr, loading } = useModulePermissions();

    if (loading) {
        return (
            <div className={`flex gap-2 ${className}`}>
                <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
                <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
            </div>
        );
    }

    // Check permissions for current stage
    const canEdit = canPerformNcrAction(stageCode, 'edit');
    const canDelete = canPerformNcrAction(stageCode, 'delete');
    const canExport = canPerformNcrAction(stageCode, 'export');
    const canApprove = canPerformNcrAction(stageCode, 'approve');
    const canAdvance = canAdvanceNcr(stageCode);
    const canReturn = canReturnNcr(stageCode);

    // Button styles
    const baseBtn = "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed";
    const primaryBtn = `${baseBtn} bg-primary-600 text-white hover:bg-primary-700`;
    const secondaryBtn = `${baseBtn} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800`;
    const dangerBtn = `${baseBtn} border border-red-300 text-red-600 hover:bg-red-50`;
    const successBtn = `${baseBtn} bg-green-600 text-white hover:bg-green-700`;
    const warningBtn = `${baseBtn} bg-amber-500 text-white hover:bg-amber-600`;

    return (
        <div className={`flex flex-wrap gap-2 ${className}`} dir="rtl">
            {/* Edit Button */}
            {onEdit && (
                <button
                    onClick={onEdit}
                    disabled={!canEdit || isClosed}
                    className={secondaryBtn}
                    title={!canEdit ? 'ليس لديك صلاحية التعديل في هذه المرحلة' : 'تعديل'}
                >
                    {canEdit ? (
                        <PencilIcon className="w-4 h-4" />
                    ) : (
                        <LockClosedIcon className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">تعديل</span>
                </button>
            )}

            {/* Delete Button */}
            {onDelete && (
                <button
                    onClick={onDelete}
                    disabled={!canDelete}
                    className={dangerBtn}
                    title={!canDelete ? 'ليس لديك صلاحية الحذف' : 'حذف'}
                >
                    <TrashIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">حذف</span>
                </button>
            )}

            {/* Export Button */}
            {onExport && (
                <button
                    onClick={onExport}
                    disabled={!canExport}
                    className={secondaryBtn}
                    title="تصدير"
                >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">تصدير</span>
                </button>
            )}

            {/* Workflow Actions */}
            <div className="flex gap-2 mr-auto">
                {/* Return Button */}
                {onReturn && canReturn && !isClosed && (
                    <button
                        onClick={onReturn}
                        className={warningBtn}
                        title="إرجاع للمرحلة السابقة"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">إرجاع</span>
                    </button>
                )}

                {/* Reject Button (for approval stages) */}
                {onReject && canApprove && !isClosed && (
                    <button
                        onClick={onReject}
                        className={dangerBtn}
                        title="رفض"
                    >
                        <XCircleIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">رفض</span>
                    </button>
                )}

                {/* Approve Button */}
                {onApprove && canApprove && !isClosed && (
                    <button
                        onClick={onApprove}
                        className={successBtn}
                        title="موافقة"
                    >
                        <CheckCircleIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">موافقة</span>
                    </button>
                )}

                {/* Advance Button */}
                {onAdvance && canAdvance && !isClosed && (
                    <button
                        onClick={onAdvance}
                        className={primaryBtn}
                        title="التقدم للمرحلة التالية"
                    >
                        <span className="hidden sm:inline">التالي</span>
                        <ArrowRightIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

// ==================== Inline Permission Check Component ====================
interface NcrActionButtonProps {
    stageCode: string;
    action: string;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
}

export const NcrActionButton: React.FC<NcrActionButtonProps> = ({
    stageCode,
    action,
    children,
    onClick,
    className = '',
    disabled = false,
}) => {
    const { canPerformNcrAction, loading } = useModulePermissions();
    const hasPermission = canPerformNcrAction(stageCode, action);

    if (loading) {
        return (
            <button disabled className={`opacity-50 cursor-not-allowed ${className}`}>
                {children}
            </button>
        );
    }

    if (!hasPermission) {
        return null; // Or return a disabled button with lock icon
    }

    return (
        <button onClick={onClick} disabled={disabled} className={className}>
            {children}
        </button>
    );
};

// ==================== Stage Info Component ====================
interface NcrStageInfoProps {
    stageCode: string;
    className?: string;
}

export const NcrStageInfo: React.FC<NcrStageInfoProps> = ({ stageCode, className = '' }) => {
    const { canAdvanceNcr, canReturnNcr, ncrPermissions } = useModulePermissions();
    
    const stagePerm = ncrPermissions.find(p => p.stage_code === stageCode);
    const canAdvance = canAdvanceNcr(stageCode);
    const canReturn = canReturnNcr(stageCode);
    const actions = stagePerm?.allowed_actions || ['view'];

    return (
        <div className={`text-xs text-gray-500 ${className}`} dir="rtl">
            <span className="font-medium">صلاحياتك: </span>
            {actions.map((action, i) => (
                <span key={action}>
                    {action === 'view' ? 'عرض' :
                     action === 'edit' ? 'تعديل' :
                     action === 'create' ? 'إنشاء' :
                     action === 'approve' ? 'موافقة' :
                     action === 'assign' ? 'تعيين' :
                     action === 'root_cause.propose' ? 'اقتراح سبب جذري' :
                     action === 'release_hold' ? 'فك الحجز' :
                     action === 'reject' ? 'رفض' :
                     action === 'verify_close' ? 'تحقق وإغلاق' :
                     action === 'capa.add' ? 'إضافة CAPA' :
                     action === 'capa.complete' ? 'إكمال CAPA' :
                     action === 'workflow.progress' ? 'التقدم في المسار' :
                     action === 'export' ? 'تصدير' :
                     action === 'reopen' ? 'إعادة فتح' : action}
                    {i < actions.length - 1 && '، '}
                </span>
            ))}
            {canAdvance && <span className="text-green-600 mr-2">• يمكنك التقدم</span>}
            {canReturn && <span className="text-amber-600 mr-2">• يمكنك الإرجاع</span>}
        </div>
    );
};

export default NcrPermissionActions;











