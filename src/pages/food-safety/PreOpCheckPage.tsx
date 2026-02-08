/**
 * Pre-Operation Check Page
 * صفحة فحص ما قبل التشغيل
 */

import React, { useState, useEffect } from 'react';
import {
    ClipboardDocumentCheckIcon,
    PlusIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { sanitationService } from '../../services/foodSafety/foodSafetyService';
import { useDateFormat } from '../../hooks/useDateFormat';
import type { PreOperationCheck } from '../../types/foodSafety';
import { supabase } from '../../config/supabase';
import { LabDashboardSkeleton } from '../../components/common/LoadingStates';

// Default checklist items
const DEFAULT_CHECK_ITEMS = [
    'نظافة الأرضيات',
    'نظافة الأسطح والطاولات',
    'نظافة المعدات',
    'نظافة أدوات العمل',
    'توفر مواد التعقيم',
    'صلاحية المواد الكيميائية',
    'درجات الحرارة ضمن الحدود',
    'عدم وجود آفات',
    'ملابس العمل نظيفة',
    'غسل الأيدي',
    'الإضاءة كافية',
    'التهوية جيدة',
    'لا توجد تسريبات',
    'أجهزة الإنذار تعمل',
    'سلال النفايات فارغة'
];

const PreOpCheckPage: React.FC = () => {
    const [checks, setChecks] = useState<PreOperationCheck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showNewCheck, setShowNewCheck] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadChecks();
    }, [selectedDate]);

    const loadChecks = async () => {
        try {
            const startDate = new Date(selectedDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(selectedDate);
            endDate.setHours(23, 59, 59, 999);

            const { data, error } = await supabase
                .from('pre_op_checks')
                .select('id, check_date, shift, production_line, area_id, items, overall_result, notes, checked_by, created_at')
                .gte('check_date', startDate.toISOString())
                .lte('check_date', endDate.toISOString())
                .order('check_date', { ascending: false })
                .limit(100);

            if (error) throw error;

            const checks = (data || []).map((row: any) => ({
                id: row.id,
                date: row.check_date,
                shift: row.shift,
                productionLine: row.production_line || row.area_id,
                items: row.items || [],
                overallStatus: row.overall_result,
                conditionsForProduction: row.notes,
                checkedBy: row.checked_by
            }));
            setChecks(checks);
        } catch (err) {
            console.error('Error loading pre-op checks:', err);
            setChecks([]);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: PreOperationCheck['overallStatus']) => {
        switch (status) {
            case 'pass': return 'bg-green-100 text-green-700 border-green-300';
            case 'fail': return 'bg-red-100 text-red-700 border-red-300';
            case 'conditional': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        }
    };

    const getStatusIcon = (status: PreOperationCheck['overallStatus']) => {
        switch (status) {
            case 'pass': return <CheckCircleIcon className="w-6 h-6 text-green-600" />;
            case 'fail': return <XCircleIcon className="w-6 h-6 text-red-600" />;
            case 'conditional': return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />;
        }
    };

    const getStatusText = (status: PreOperationCheck['overallStatus']) => {
        switch (status) {
            case 'pass': return 'ناجح';
            case 'fail': return 'فاشل';
            case 'conditional': return 'مشروط';
        }
    };

    if (isLoading) {
        return <LabDashboardSkeleton />;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <ClipboardDocumentCheckIcon className="w-8 h-8 text-blue-600" />
                        فحص ما قبل التشغيل
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        قوائم تحقق يومية قبل بدء الإنتاج
                    </p>
                </div>
                <button
                    onClick={() => setShowNewCheck(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                    <PlusIcon className="w-5 h-5" />
                    فحص جديد
                </button>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ:</label>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
            </div>

            {/* Stats for selected date */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <ClipboardDocumentCheckIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الفحوصات</p>
                            <p className="text-xl font-bold">{checks.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <CheckCircleIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">ناجح</p>
                            <p className="text-xl font-bold text-green-600">
                                {checks.filter(c => c.overallStatus === 'pass').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">مشروط</p>
                            <p className="text-xl font-bold text-yellow-600">
                                {checks.filter(c => c.overallStatus === 'conditional').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <XCircleIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">فاشل</p>
                            <p className="text-xl font-bold text-red-600">
                                {checks.filter(c => c.overallStatus === 'fail').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Checks List */}
            <div className="space-y-4">
                {checks.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <ClipboardDocumentCheckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            لا توجد فحوصات لهذا اليوم
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            ابدأ بإجراء فحص جديد قبل بدء الإنتاج
                        </p>
                        <button
                            onClick={() => setShowNewCheck(true)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            فحص جديد
                        </button>
                    </div>
                ) : (
                    checks.map(check => (
                        <div
                            key={check.id}
                            className={`bg-white dark:bg-gray-800 rounded-xl p-5 border-2 ${getStatusColor(check.overallStatus)}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    {getStatusIcon(check.overallStatus)}
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            خط الإنتاج: {check.productionLine}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            الوردية: {check.shift} | بواسطة: {check.checkedBy}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(check.overallStatus)}`}>
                                        {getStatusText(check.overallStatus)}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(check.date).toLocaleTimeString('ar-EG')}
                                    </p>
                                </div>
                            </div>

                            {/* Items Summary */}
                            <div className="mt-4 flex items-center gap-4">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    ✓ {check.items.filter(i => i.isOk).length} عنصر صحيح
                                </span>
                                <span className="text-sm text-red-600">
                                    ✗ {check.items.filter(i => !i.isOk).length} عنصر بحاجة انتباه
                                </span>
                            </div>

                            {check.overallStatus === 'conditional' && check.conditionsForProduction && (
                                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                        <strong>شروط الإنتاج:</strong> {check.conditionsForProduction}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* New Check Modal */}
            {showNewCheck && (
                <NewPreOpCheckModal
                    onClose={() => setShowNewCheck(false)}
                    onSave={async (data) => {
                        await sanitationService.recordPreOpCheck(data);
                        loadChecks();
                        setShowNewCheck(false);
                    }}
                />
            )}
        </div>
    );
};

// New Pre-Op Check Modal
interface NewPreOpCheckModalProps {
    onClose: () => void;
    onSave: (data: Omit<PreOperationCheck, 'id'>) => Promise<void>;
}

const NewPreOpCheckModal: React.FC<NewPreOpCheckModalProps> = ({ onClose, onSave }) => {
    const { formatDate } = useDateFormat();
    const [productionLine, setProductionLine] = useState('');
    const [shift, setShift] = useState('الوردية الصباحية');
    const [items, setItems] = useState(
        DEFAULT_CHECK_ITEMS.map(name => ({ name, isOk: true, notes: '' }))
    );
    const [conditions, setConditions] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const toggleItem = (index: number) => {
        const updated = [...items];
        updated[index].isOk = !updated[index].isOk;
        setItems(updated);
    };

    const updateNotes = (index: number, notes: string) => {
        const updated = [...items];
        updated[index].notes = notes;
        setItems(updated);
    };

    const getOverallStatus = (): PreOperationCheck['overallStatus'] => {
        const failedItems = items.filter(i => !i.isOk);
        if (failedItems.length === 0) return 'pass';
        if (failedItems.length <= 3 && conditions.trim()) return 'conditional';
        return 'fail';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({
                date: new Date().toISOString(),
                shift,
                productionLine,
                items,
                overallStatus: getOverallStatus(),
                conditionsForProduction: conditions || undefined,
                checkedBy: 'current-user' // TODO: Get from auth
            });
        } finally {
            setIsSaving(false);
        }
    };

    const failedCount = items.filter(i => !i.isOk).length;
    const status = getOverallStatus();

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        فحص ما قبل التشغيل
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(new Date())}
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">خط الإنتاج *</label>
                            <input
                                type="text"
                                value={productionLine}
                                onChange={e => setProductionLine(e.target.value)}
                                required
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                                placeholder="مثال: خط 1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">الوردية</label>
                            <select
                                value={shift}
                                onChange={e => setShift(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                            >
                                <option>الوردية الصباحية</option>
                                <option>الوردية المسائية</option>
                                <option>الوردية الليلية</option>
                            </select>
                        </div>
                    </div>

                    {/* Checklist */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium mb-2">قائمة التحقق:</label>
                        {items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => toggleItem(idx)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${item.isOk
                                        ? 'bg-green-500 text-white'
                                        : 'bg-red-500 text-white'
                                        }`}
                                >
                                    {item.isOk ? '✓' : '✗'}
                                </button>
                                <span className="flex-1 text-sm">{item.name}</span>
                                {!item.isOk && (
                                    <input
                                        type="text"
                                        value={item.notes}
                                        onChange={e => updateNotes(idx, e.target.value)}
                                        placeholder="ملاحظة..."
                                        className="px-2 py-1 text-sm border rounded dark:bg-gray-700 w-32"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Status Preview */}
                    <div className={`p-4 rounded-lg ${status === 'pass' ? 'bg-green-100 text-green-700' :
                        status === 'conditional' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">
                                الحالة: {status === 'pass' ? 'ناجح ✓' : status === 'conditional' ? 'مشروط ⚠️' : 'فاشل ✗'}
                            </span>
                            <span>{failedCount} عنصر فاشل</span>
                        </div>
                    </div>

                    {failedCount > 0 && (
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                شروط الإنتاج (مطلوب للحالة المشروطة):
                            </label>
                            <textarea
                                value={conditions}
                                onChange={e => setConditions(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                                rows={2}
                                placeholder="صف الشروط اللازمة لبدء الإنتاج رغم وجود مشاكل..."
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || (status === 'fail' && failedCount > 3)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                        >
                            {isSaving ? 'جاري الحفظ...' : 'حفظ الفحص'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PreOpCheckPage;
