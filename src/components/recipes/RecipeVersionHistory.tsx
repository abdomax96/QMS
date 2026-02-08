/**
 * Recipe Version History Component
 * مكون عرض سجل إصدارات الوصفة
 */

import React, { useState, useEffect } from 'react';
import {
    ClockIcon,
    ArrowPathIcon,
    DocumentDuplicateIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { recipeVersionService } from '../../services/recipeVersionService';
import type { RecipeVersion, RecipeVersionSummary, RecipeChangeLog } from '../../types/recipe';
import { cn } from '../../utils';

interface RecipeVersionHistoryProps {
    recipeId: string;
    recipeName: string;
    onRestore?: (versionId: string) => void;
    onCompare?: (versionAId: string, versionBId: string) => void;
}

const RecipeVersionHistory: React.FC<RecipeVersionHistoryProps> = ({
    recipeId,
    recipeName,
    onRestore,
    onCompare
}) => {
    const [summary, setSummary] = useState<RecipeVersionSummary | null>(null);
    const [changeLog, setChangeLog] = useState<RecipeChangeLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
    const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
    const [restoring, setRestoring] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<'timeline' | 'log'>('timeline');

    // تحميل البيانات
    useEffect(() => {
        loadData();
    }, [recipeId]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [summaryData, logData] = await Promise.all([
                recipeVersionService.getVersionSummary(recipeId),
                recipeVersionService.getChangeLog(recipeId)
            ]);
            setSummary(summaryData);
            setChangeLog(logData);
        } catch (err) {
            setError('فشل في تحميل سجل الإصدارات');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // تبديل توسيع الإصدار
    const toggleExpand = (versionId: string) => {
        const newExpanded = new Set(expandedVersions);
        if (newExpanded.has(versionId)) {
            newExpanded.delete(versionId);
        } else {
            newExpanded.add(versionId);
        }
        setExpandedVersions(newExpanded);
    };

    // اختيار إصدار للمقارنة
    const toggleSelectVersion = (versionId: string) => {
        if (selectedVersions.includes(versionId)) {
            setSelectedVersions(selectedVersions.filter(id => id !== versionId));
        } else if (selectedVersions.length < 2) {
            setSelectedVersions([...selectedVersions, versionId]);
        }
    };

    // استعادة إصدار
    const handleRestore = async (versionId: string, versionNumber: number) => {
        if (!confirm(`هل تريد استعادة الإصدار ${versionNumber}؟\nسيتم إنشاء إصدار جديد من البيانات القديمة.`)) {
            return;
        }

        setRestoring(true);
        try {
            const success = await recipeVersionService.restoreVersion(
                recipeId,
                versionId,
                `استعادة الإصدار ${versionNumber}`
            );
            if (success) {
                alert('تم استعادة الإصدار بنجاح');
                loadData();
                onRestore?.(versionId);
            } else {
                alert('فشل في استعادة الإصدار');
            }
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء استعادة الإصدار');
        } finally {
            setRestoring(false);
        }
    };

    // حذف إصدار
    const handleDelete = async (versionId: string, versionNumber: number) => {
        if (!confirm(`هل أنت متأكد من حذف الإصدار v${versionNumber}؟\nهذا الإجراء لا يمكن التراجع عنه.`)) {
            return;
        }

        setDeleting(true);
        try {
            const success = await recipeVersionService.deleteVersion(versionId);
            if (success) {
                alert('تم حذف الإصدار بنجاح');
                loadData();
            } else {
                alert('فشل في حذف الإصدار');
            }
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء حذف الإصدار');
        } finally {
            setDeleting(false);
        }
    };

    // مقارنة إصدارين
    const handleCompare = () => {
        if (selectedVersions.length === 2) {
            onCompare?.(selectedVersions[0], selectedVersions[1]);
        }
    };

    // تنسيق التاريخ
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // تنسيق المدة
    const formatDuration = (days?: number) => {
        if (!days || days === 0) return 'أقل من يوم';
        if (days === 1) return 'يوم واحد';
        if (days === 2) return 'يومان';
        if (days <= 10) return `${days} أيام`;
        return `${days} يوم`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
                <span className="mr-3 text-gray-600 dark:text-gray-400">جاري تحميل سجل الإصدارات...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 text-center">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-700 dark:text-red-300">{error}</p>
                <button onClick={loadData} className="mt-2 text-sm text-red-600 hover:underline">
                    إعادة المحاولة
                </button>
            </div>
        );
    }

    if (!summary || summary.versions.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <ClockIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا يوجد سجل إصدارات لهذه الوصفة</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ملخص */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                    <ClockIcon className="w-5 h-5" />
                    سجل إصدارات: {recipeName}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {summary.total_versions}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">إصدار</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            v{summary.current_version}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">الإصدار الحالي</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {summary.total_duration_days}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">يوم إجمالي</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
                            {formatDate(summary.last_updated).split('،')[0]}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">آخر تحديث</div>
                    </div>
                </div>
            </div>

            {/* أزرار المقارنة */}
            {selectedVersions.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-amber-700 dark:text-amber-300">
                        تم اختيار {selectedVersions.length} إصدار
                        {selectedVersions.length === 2 && ' للمقارنة'}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedVersions([])}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                            إلغاء
                        </button>
                        {selectedVersions.length === 2 && (
                            <button
                                onClick={handleCompare}
                                className="px-3 py-1 text-sm bg-amber-600 text-white rounded hover:bg-amber-700"
                            >
                                <DocumentDuplicateIcon className="w-4 h-4 inline ml-1" />
                                مقارنة
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* تبويبات */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('timeline')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                        activeTab === 'timeline'
                            ? "border-primary-600 text-primary-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                >
                    📊 الجدول الزمني
                </button>
                <button
                    onClick={() => setActiveTab('log')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                        activeTab === 'log'
                            ? "border-primary-600 text-primary-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                >
                    📋 سجل التغييرات ({changeLog.length})
                </button>
            </div>

            {/* محتوى التبويب */}
            {activeTab === 'timeline' ? (
                <div className="space-y-3">
                    {summary.versions.map((version, index) => (
                        <div
                            key={version.id}
                            className={cn(
                                "bg-white dark:bg-gray-800 border rounded-lg overflow-hidden transition-all",
                                !version.effective_until
                                    ? "border-green-300 dark:border-green-700 ring-2 ring-green-100 dark:ring-green-900"
                                    : "border-gray-200 dark:border-gray-700",
                                selectedVersions.includes(version.id) && "ring-2 ring-amber-400"
                            )}
                        >
                            {/* Header */}
                            <div
                                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
                                onClick={() => toggleExpand(version.id)}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Checkbox for selection */}
                                    <input
                                        type="checkbox"
                                        checked={selectedVersions.includes(version.id)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            toggleSelectVersion(version.id);
                                        }}
                                        className="w-4 h-4 rounded border-gray-300"
                                    />

                                    {/* Version badge */}
                                    <span className={cn(
                                        "px-2 py-1 rounded text-sm font-bold",
                                        !version.effective_until
                                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                    )}>
                                        v{version.version_number}
                                    </span>

                                    {/* Change type */}
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {recipeVersionService.formatChangeType(version.change_type)}
                                    </span>

                                    {/* Current badge */}
                                    {!version.effective_until && (
                                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                            <CheckCircleIcon className="w-4 h-4" />
                                            نشط
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Duration */}
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {formatDuration(version.duration_days)}
                                    </span>

                                    {/* Date */}
                                    <span className="text-xs text-gray-400">
                                        {formatDate(version.created_at)}
                                    </span>

                                    {/* Expand icon */}
                                    {expandedVersions.has(version.id) ? (
                                        <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                            </div>

                            {/* Expanded content */}
                            {expandedVersions.has(version.id) && (
                                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-850">
                                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                        <div>
                                            <span className="text-gray-500">الاسم:</span>
                                            <span className="mr-2 font-medium">{version.name}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">المستخدم:</span>
                                            <span className="mr-2">{version.created_by_name || 'غير معروف'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">عدد المكونات:</span>
                                            <span className="mr-2">{version.ingredients?.length || 0}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">خطوات الخلط:</span>
                                            <span className="mr-2">{version.mixing_steps?.length || 0}</span>
                                        </div>
                                        {version.change_summary && (
                                            <div className="col-span-2">
                                                <span className="text-gray-500">ملخص:</span>
                                                <span className="mr-2">{version.change_summary}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* تفاصيل التغييرات */}
                                    {version.change_details && Object.keys(version.change_details).length > 0 && (
                                        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                                📝 التغييرات في هذا الإصدار:
                                            </h4>
                                            <div className="space-y-2">
                                                {Object.entries(version.change_details).map(([field, detail]: [string, any]) => {
                                                    const fieldLabels: Record<string, string> = {
                                                        'name': 'الاسم',
                                                        'name_en': 'الاسم الإنجليزي',
                                                        'ingredients': 'المكونات',
                                                        'mixing_steps': 'خطوات الخلط',
                                                        'notes': 'الملاحظات',
                                                        'action': 'الإجراء'
                                                    };

                                                    return (
                                                        <div key={field} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 px-2 py-0.5 rounded">
                                                                    {fieldLabels[field] || field}
                                                                </span>
                                                            </div>
                                                            {typeof detail === 'object' && detail?.old !== undefined && detail?.new !== undefined ? (
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <span className="px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded line-through">
                                                                        {String(detail.old)}
                                                                    </span>
                                                                    <span className="text-gray-400">→</span>
                                                                    <span className="px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                                                                        {String(detail.new)}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                    {typeof detail === 'string' ? detail : JSON.stringify(detail)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* عرض المكونات مع مقارنة بالإصدار السابق */}
                                    {version.ingredients && version.ingredients.length > 0 && (() => {
                                        // البحث عن الإصدار السابق للمقارنة
                                        const currentIndex = summary!.versions.findIndex(v => v.id === version.id);
                                        const prevVersion = currentIndex < summary!.versions.length - 1
                                            ? summary!.versions[currentIndex + 1]
                                            : null;

                                        const prevIngredientsMap = new Map<string, any>();
                                        if (prevVersion?.ingredients) {
                                            prevVersion.ingredients.forEach((ing: any) => {
                                                prevIngredientsMap.set(ing.ingredient_name, ing);
                                            });
                                        }

                                        const currentIngredientsMap = new Map<string, any>();
                                        version.ingredients.forEach((ing: any) => {
                                            currentIngredientsMap.set(ing.ingredient_name, ing);
                                        });

                                        // تحديد المكونات المحذوفة
                                        const removedIngredients = prevVersion?.ingredients?.filter(
                                            (ing: any) => !currentIngredientsMap.has(ing.ingredient_name)
                                        ) || [];

                                        return (
                                            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                                    🧪 المكونات:
                                                    {prevVersion && (
                                                        <span className="text-xs font-normal text-gray-500">
                                                            (مقارنة مع v{prevVersion.version_number})
                                                        </span>
                                                    )}
                                                </h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                                    {/* المكونات الحالية */}
                                                    {version.ingredients.map((ing: any, i: number) => {
                                                        const prevIng = prevIngredientsMap.get(ing.ingredient_name);
                                                        const isNew = prevVersion && !prevIng;
                                                        const isModified = prevIng && (
                                                            prevIng.quantity !== ing.quantity ||
                                                            prevIng.unit !== ing.unit
                                                        );

                                                        return (
                                                            <div
                                                                key={i}
                                                                className={cn(
                                                                    "p-2 rounded border",
                                                                    isNew
                                                                        ? "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                                                                        : isModified
                                                                            ? "bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700"
                                                                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-1">
                                                                    {isNew && <span className="text-green-600">✚</span>}
                                                                    {isModified && <span className="text-amber-600">✎</span>}
                                                                    <span className="font-medium">{ing.ingredient_name}</span>
                                                                </div>
                                                                <div className="text-gray-500 mt-0.5">
                                                                    {isModified && prevIng && (
                                                                        <span className="line-through text-red-400 mr-1">
                                                                            {prevIng.quantity} {prevIng.unit}
                                                                        </span>
                                                                    )}
                                                                    <span className={isModified ? "text-green-600 font-medium" : ""}>
                                                                        {ing.quantity} {ing.unit}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* المكونات المحذوفة */}
                                                    {removedIngredients.map((ing: any, i: number) => (
                                                        <div
                                                            key={`removed-${i}`}
                                                            className="p-2 rounded border bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 opacity-60"
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-red-600">✕</span>
                                                                <span className="font-medium line-through">{ing.ingredient_name}</span>
                                                            </div>
                                                            <div className="text-red-400 line-through mt-0.5">
                                                                {ing.quantity} {ing.unit}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* مفتاح الألوان */}
                                                {prevVersion && (
                                                    <div className="flex gap-4 mt-3 text-[10px] text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span>
                                                            مكون جديد
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></span>
                                                            تم تعديله
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span>
                                                            تم حذفه
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Actions */}
                                    <div className="mt-4 flex gap-2">
                                        {version.effective_until && (
                                            <button
                                                onClick={() => handleRestore(version.id, version.version_number)}
                                                disabled={restoring}
                                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                <ArrowPathIcon className="w-4 h-4" />
                                                استعادة
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(version.id, version.version_number)}
                                            disabled={deleting || !version.effective_until}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                            title={!version.effective_until ? 'لا يمكن حذف الإصدار النشط' : 'حذف هذا الإصدار'}
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                            حذف
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                /* سجل التغييرات */
                <div className="space-y-2">
                    {changeLog.map((log) => (
                        <div
                            key={log.id}
                            className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm">
                                {log.action === 'create' && '➕'}
                                {log.action === 'update' && '✏️'}
                                {log.action === 'restore' && '🔄'}
                                {log.action === 'approve' && '✅'}
                                {log.action === 'reject' && '❌'}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {recipeVersionService.formatAction(log.action)}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {formatDate(log.changed_at)}
                                    </span>
                                </div>
                                {log.reason && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {log.reason}
                                    </p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                    بواسطة: {log.changed_by_name || 'غير معروف'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecipeVersionHistory;
