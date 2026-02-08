import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowRightIcon,
    TrashIcon,
    CheckCircleIcon,
    ClockIcon,
    PrinterIcon,
    ArrowPathIcon,
    ChatBubbleLeftRightIcon,
    DocumentTextIcon,
    ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { useNcrs } from '../../hooks/ncr/useNcrs';
import { useAuth } from '../../hooks/ncr/useAuth';
import notificationService from '../../services/notificationService';
import { supabase } from '../../config/supabase';
import { useNcrComments } from '../../hooks/ncr/useNcrComments';
import { getNcrById } from '../../services/ncr/ncrService';
import { useEnsureCompaniesLoaded } from '../../hooks/useEnsureCompaniesLoaded';
import { WORKFLOW_STAGES } from '../../types/ncr';
import type { NcrRecord } from '../../types/ncr';
import NcrWorkflowActions from '../../components/ncr/NcrWorkflowActions';
import NcrStageHistory from '../../components/ncr/NcrStageHistory';
import { CommentsSection } from '../../components/comments/CommentsSection';
import { DetailPageSkeleton } from '../../components/common/LoadingStates';

const severityLabels: Record<string, string> = {
    low: 'منخفض',
    medium: 'متوسط',
    high: 'مرتفع'
};

const severityColors: Record<string, string> = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-red-100 text-red-800 border-red-200'
};

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

function formatShortDate(dateStr: string): string {
    try {
        return new Intl.DateTimeFormat('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(dateStr));
    } catch {
        return dateStr;
    }
}

// Comments Wrapper Component
function NcrCommentsWrapper({ ncrId, userInfo, isClosed }: {
    ncrId: string;
    userInfo: { id: string; name: string; avatarUrl?: string | null };
    isClosed: boolean;
}) {
    const { comments, loading, addComment, editComment, deleteComment } = useNcrComments(ncrId);

    if (loading) {
        return <div className="text-center py-4 text-gray-500">جاري تحميل التعليقات...</div>;
    }

    return (
        <CommentsSection
            comments={comments}
            entityId={ncrId}
            entityType="ncr"
            currentUserId={userInfo.id}
            currentUserName={userInfo.name}
            currentUserAvatar={userInfo.avatarUrl}
            onAddComment={async (input) => {
                await addComment(input, userInfo.id, userInfo.name, userInfo.avatarUrl);
                // After successful add, send notifications to department members (excluding author)
                if (!ncrId) return;
                const { data: ncrRow } = await supabase
                    .from('ncr_reports')
                    .select('department, number')
                    .eq('id', ncrId)
                    .single();

                if (!ncrRow?.department) return;

                const { data: recipients } = await supabase
                    .from('users')
                    .select('id, name')
                    .eq('department', ncrRow.department)
                    .neq('id', userInfo.id)
                    .eq('is_active', true);

                if (!recipients || recipients.length === 0) return;

                const title = `تعليق جديد على NCR ${ncrRow.number || ''}`.trim();
                const preview = input.content.slice(0, 120);

                await Promise.all(recipients.map((u: any) =>
                    notificationService.createNotification({
                        userId: u.id,
                        title,
                        message: preview || 'تعليق جديد',
                        type: 'workflow',
                        category: 'ncr',
                        entityType: 'ncr',
                        entityId: ncrId,
                        actionUrl: `/ncr/${ncrId}`,
                        senderId: userInfo.id,
                        senderName: userInfo.name
                    })
                ));
            }}
            onEditComment={editComment}
            onDeleteComment={deleteComment}
            disabled={isClosed}
        />
    );
}

const NcrDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { selectedCompanyId } = useEnsureCompaniesLoaded();
    const { deleteNcr } = useNcrs(selectedCompanyId);
    const { profile } = useAuth();
    const [ncr, setNcr] = useState<NcrRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // User info for workflow actions
    const userInfo = {
        id: profile?.uid || profile?.name || 'مستخدم',
        name: profile?.name || profile?.email || 'مستخدم',
        email: (profile as { email?: string })?.email || '',
        avatarUrl: (profile as { avatarUrl?: string })?.avatarUrl || null,
        role: (profile?.department?.toLowerCase().includes('quality') || profile?.department?.includes('جودة')) ? 'quality' as const : 'department' as const
    };

    useEffect(() => {
        if (!id) return;
        setError(null);
        if (!selectedCompanyId) {
            setError('يرجى اختيار الشركة أولاً');
            setLoading(false);
            return;
        }
        setLoading(true);
        getNcrById(id, selectedCompanyId)
            .then((data) => {
                if (data) {
                    setNcr(data);
                } else {
                    setError('التقرير غير موجود');
                }
            })
            .catch((err) => {
                console.error(err);
                setError('حدث خطأ في تحميل التقرير');
            })
            .finally(() => setLoading(false));
    }, [id, selectedCompanyId]);

    const handleDelete = async () => {
        if (!id || !confirm('هل أنت متأكد من حذف هذا التقرير؟')) return;
        try {
            await deleteNcr(id);
            navigate('/ncr');
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء الحذف');
        }
    };

    if (loading) {
        return <DetailPageSkeleton />;
    }

    if (error || !ncr) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <p className="text-red-800">{error || 'التقرير غير موجود'}</p>
                    <Link to="/ncr" className="text-primary-600 hover:underline mt-2 inline-block">
                        العودة للقائمة
                    </Link>
                </div>
            </div>
        );
    }

    const isClosed = !!ncr.closedAt;
    const currentStage = WORKFLOW_STAGES[ncr.currentStage];
    const progress = ((ncr.completedStages?.length || 0) / 5) * 100;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <Link to="/ncr" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-2">
                        <ArrowRightIcon className="w-4 h-4" />
                        <span>العودة للقائمة</span>
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        {ncr.number}
                        <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${severityColors[ncr.severity]}`}>
                            {severityLabels[ncr.severity]}
                        </span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        أُنشئ في {formatDate(ncr.createdAt)} بواسطة {ncr.createdBy}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors print:hidden"
                        title="طباعة التقرير"
                    >
                        <PrinterIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">طباعة</span>
                    </button>
                    <button
                        onClick={() => {
                            setLoading(true);
                            getNcrById(id!, selectedCompanyId).then(setNcr).finally(() => setLoading(false));
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors print:hidden"
                        title="تحديث البيانات"
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors print:hidden"
                    >
                        <TrashIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">حذف</span>
                    </button>
                </div>
            </div>

            {/* Status Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">حالة التقرير</h2>
                    <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full ${isClosed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                        {isClosed ? <CheckCircleIcon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />}
                        {isClosed ? 'مغلق' : currentStage?.name || 'مفتوح'}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>التقدم</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary-600 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Stages - Timeline Style */}
                <div className="flex items-center justify-between overflow-x-auto pb-2">
                    {Object.values(WORKFLOW_STAGES).map((stage, index, arr) => {
                        const isCompleted = ncr.completedStages?.includes(stage.id as import('../../types/ncr').NcrStage);
                        const isCurrent = ncr.currentStage === stage.id;
                        const isLast = index === arr.length - 1;
                        return (
                            <div key={stage.id} className="flex items-center flex-shrink-0">
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 ${isCompleted
                                            ? 'bg-green-100 text-green-600 border-green-400'
                                            : isCurrent
                                                ? 'bg-blue-100 text-blue-600 border-blue-400 animate-pulse'
                                                : 'bg-gray-100 text-gray-400 border-gray-300'
                                            }`}
                                    >
                                        {isCompleted ? <CheckCircleIcon className="w-5 h-5" /> : stage.icon}
                                    </div>
                                    <span className={`text-xs mt-1 text-center max-w-[80px] ${isCurrent ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                                        {stage.name}
                                    </span>
                                </div>
                                {!isLast && (
                                    <div className={`w-8 h-0.5 mx-1 ${isCompleted ? 'bg-green-400' : 'bg-gray-300'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">معلومات أساسية</h2>
                    <dl className="space-y-3">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">التاريخ:</dt>
                            <dd className="font-medium text-gray-900 dark:text-white">{formatShortDate(ncr.date)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">القسم:</dt>
                            <dd className="font-medium text-gray-900 dark:text-white">{ncr.department}</dd>
                        </div>
                        {ncr.shift && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">الوردية:</dt>
                                <dd className="font-medium text-gray-900 dark:text-white">{ncr.shift}</dd>
                            </div>
                        )}
                        {/* Linked Document Display */}
                        {ncr.documentId && (
                            <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                <div className="text-xs text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                                    <DocumentTextIcon className="w-3 h-3" />
                                    وثيقة مرجعية
                                </div>
                                <Link
                                    to={`/documents/${ncr.documentId}`}
                                    className="text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-2"
                                    target="_blank"
                                >
                                    {ncr.documentTitle || 'عرض الوثيقة المرتبطة'}
                                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                </Link>
                            </div>
                        )}
                        {ncr.productName && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">المنتج:</dt>
                                <dd className="font-medium text-gray-900 dark:text-white">{ncr.productName}</dd>
                            </div>
                        )}
                        {ncr.lineOrArea && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">الخط / المنطقة:</dt>
                                <dd className="font-medium text-gray-900 dark:text-white">{ncr.lineOrArea}</dd>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <dt className="text-gray-500">المكتشف:</dt>
                            <dd className="font-medium text-gray-900 dark:text-white">{ncr.discoveredBy}</dd>
                        </div>
                    </dl>
                </div>

                {/* Defect Info */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">تفاصيل عدم المطابقة</h2>
                    <dl className="space-y-3">
                        {(ncr.standardDefect || ncr.customType) && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">نوع العيب:</dt>
                                <dd className="font-medium text-gray-900 dark:text-white">{ncr.standardDefect || ncr.customType}</dd>
                            </div>
                        )}
                        {ncr.reservedQty && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">الكمية المحجوزة:</dt>
                                <dd className="font-medium text-gray-900 dark:text-white">{ncr.reservedQty} {ncr.reservedUnit || ''}</dd>
                            </div>
                        )}
                        {ncr.closedAt && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">تاريخ الإغلاق:</dt>
                                <dd className="font-medium text-green-600">{formatShortDate(ncr.closedAt)}</dd>
                            </div>
                        )}
                    </dl>
                </div>
            </div>

            {/* Description */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">الوصف</h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ncr.description}</p>
            </div>

            {/* Immediate Action */}
            {ncr.immediateAction && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">الإجراء الفوري</h2>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ncr.immediateAction}</p>
                </div>
            )}

            {/* Root Cause */}
            {ncr.rootCause && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">السبب الجذري</h2>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ncr.rootCause}</p>
                </div>
            )}

            {/* CAPA Actions */}
            {ncr.actions && ncr.actions.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">الإجراءات التصحيحية والوقائية (CAPA)</h2>
                    <div className="space-y-4">
                        {ncr.actions.map((action, i) => (
                            <div key={action.id || i} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`px-2 py-0.5 text-xs rounded ${action.type === 'corrective' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                        {action.type === 'corrective' ? 'تصحيحي' : 'وقائي'}
                                    </span>
                                    <span className={`px-2 py-0.5 text-xs rounded ${action.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        action.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {action.status === 'completed' ? 'مكتمل' : action.status === 'in-progress' ? 'قيد التنفيذ' : 'معلق'}
                                    </span>
                                </div>
                                <p className="text-gray-800 dark:text-gray-200">{action.description}</p>
                                <div className="mt-2 text-sm text-gray-500">
                                    <span>المسؤول: {action.responsiblePerson}</span>
                                    {action.targetDate && <span className="mr-4">الموعد: {action.targetDate}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Workflow Actions */}
            <NcrWorkflowActions
                ncr={ncr}
                onUpdate={setNcr}
                userInfo={userInfo}
            />

            {/* Stage History */}
            <NcrStageHistory
                currentStage={ncr.currentStage}
                completedStages={ncr.completedStages || []}
                stageHistory={ncr.stageHistory}
            />

            {/* Comments Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-primary-600" />
                    التعليقات والمناقشات
                </h2>
                <NcrCommentsWrapper ncrId={ncr.id} userInfo={userInfo} isClosed={!!ncr.closedAt} />
            </div>
        </div>
    );
};

export default NcrDetailsPage;
