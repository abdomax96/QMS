import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowRightIcon,
    StopIcon,
    BeakerIcon,
    ArrowPathIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { productionService, type ProductionBatch, type ReworkLog } from '../../services/productionService';
import { useToastStore } from '../../store/toastStore';
import { InlineLoading } from '../../components/common/LoadingStates';
import { cn } from '../../utils';

export default function ProductionDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { success, error: toastError } = useToastStore();

    const [batch, setBatch] = useState<ProductionBatch & { rework_logs: ReworkLog[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Rework Form State
    const [showReworkForm, setShowReworkForm] = useState(false);
    const [reworkForm, setReworkForm] = useState({
        quantity: 0,
        source_batch: '',
        type: 'recycle',
        reason: ''
    });

    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await productionService.getBatchDetails(id);
            setBatch(data);
        } catch (error) {
            console.error(error);
            toastError('خطأ', 'فشل تحميل بيانات التشغيلة');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleUpdateOutput = async (newQuantity: number) => {
        if (!batch) return;
        setUpdating(true);
        try {
            await productionService.updateBatch(batch.id, { actual_quantity: newQuantity });
            const updated = { ...batch, actual_quantity: newQuantity };
            setBatch(updated);
            success('تم الحفظ', 'تم تحديث الكمية المنتجة');
        } catch (error) {
            toastError('خطأ', 'فشل التحديث');
        } finally {
            setUpdating(false);
        }
    };

    const handleCompleteBatch = async () => {
        if (!batch || !confirm('هل أنت متأكد من إغلاق التشغيلة؟ لا يمكن التعديل عليها لاحقاً.')) return;
        setUpdating(true);
        try {
            await productionService.updateBatch(batch.id, {
                status: 'completed',
                completed_at: new Date().toISOString()
            });
            success('تم الاغلاق', 'تم إغلاق التشغيلة بنجاح');
            navigate('/production');
        } catch (error) {
            toastError('خطأ', 'فشل الإغلاق');
            setUpdating(false);
        }
    };

    const handleAddRework = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!batch) return;

        setUpdating(true);
        try {
            await productionService.addRework({
                batch_id: batch.id,
                rework_quantity: reworkForm.quantity,
                source_batch_no: reworkForm.source_batch,
                rework_type: reworkForm.type,
                reason: reworkForm.reason
            });
            success('تمت الإضافة', 'تم إضافة الـ Rework بنجاح');
            setShowReworkForm(false);
            setReworkForm({ quantity: 0, source_batch: '', type: 'recycle', reason: '' });
            loadData(); // Refresh to see new log
        } catch (error) {
            toastError('خطأ', 'فشل الإضافة');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="flex justify-center py-12"><InlineLoading /></div>;
    if (!batch) return <div className="text-center py-12">التشغيلة غير موجودة</div>;

    const totalRework = batch.rework_logs?.reduce((sum, log) => sum + Number(log.rework_quantity), 0) || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/production')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <ArrowRightIcon className="w-5 h-5 text-gray-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {batch.product_name}
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {batch.batch_number}
                        </span>
                    </h1>
                </div>
                <div className="flex-1" />
                {batch.status === 'running' && (
                    <button
                        onClick={handleCompleteBatch}
                        className="btn-danger flex items-center gap-2"
                        disabled={updating}
                    >
                        <StopIcon className="w-5 h-5" />
                        إغلاق التشغيلة
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Stats */}
                <div className="col-span-2 space-y-6">
                    {/* Output Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <BeakerIcon className="w-5 h-5 text-primary-600" />
                            الإنتاج الفعلي
                        </h2>

                        <div className="flex items-end gap-3 mb-4">
                            <div className="flex-1">
                                <label className="text-sm text-gray-500 block mb-1">الكمية الحالية ({batch.uom})</label>
                                <input
                                    type="number"
                                    className="text-4xl font-bold w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-primary-500 focus:ring-0 px-0 py-2"
                                    value={batch.actual_quantity}
                                    onChange={(e) => handleUpdateOutput(Number(e.target.value))}
                                    disabled={batch.status !== 'running'}
                                />
                            </div>
                            <div className="text-sm text-gray-400 mb-3">
                                / {batch.planned_quantity || '-'} مخطط
                            </div>
                        </div>
                    </div>

                    {/* Rework Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <ArrowPathIcon className="w-5 h-5 text-amber-600" />
                                سجل إعادة التشغيل (Rework)
                            </h2>
                            {batch.status === 'running' && (
                                <button
                                    onClick={() => setShowReworkForm(!showReworkForm)}
                                    className="text-sm text-primary-600 hover:underline"
                                >
                                    + إضافة جديد
                                </button>
                            )}
                        </div>

                        {/* Rework Form */}
                        {showReworkForm && (
                            <form onSubmit={handleAddRework} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4 border border-gray-200 dark:border-gray-600">
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1">مصدر الباتش</label>
                                        <input
                                            type="text"
                                            required
                                            className="input-sm w-full"
                                            placeholder="رقم الباتش القديم"
                                            value={reworkForm.source_batch}
                                            onChange={e => setReworkForm({ ...reworkForm, source_batch: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1">الكمية المضافة ({batch.uom})</label>
                                        <input
                                            type="number"
                                            required
                                            min="0.1"
                                            step="0.1"
                                            className="input-sm w-full"
                                            value={reworkForm.quantity}
                                            onChange={e => setReworkForm({ ...reworkForm, quantity: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium mb-1">السبب / الملاحظات</label>
                                        <input
                                            type="text"
                                            className="input-sm w-full"
                                            value={reworkForm.reason}
                                            onChange={e => setReworkForm({ ...reworkForm, reason: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowReworkForm(false)}
                                        className="text-xs px-3 py-1.5 border rounded hover:bg-white"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="submit"
                                        className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700"
                                    >
                                        إضافة للسجل
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Rework Log Table */}
                        {batch.rework_logs && batch.rework_logs.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700 text-right">
                                        <tr>
                                            <th className="p-2">الباتش المصدر</th>
                                            <th className="p-2">الكمية</th>
                                            <th className="p-2">السبب</th>
                                            <th className="p-2">التوقيت</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {batch.rework_logs.map(log => (
                                            <tr key={log.id}>
                                                <td className="p-2 font-mono text-xs">{log.source_batch_no || '-'}</td>
                                                <td className="p-2 font-bold text-amber-600">{log.rework_quantity} {batch.uom}</td>
                                                <td className="p-2 text-gray-500">{log.reason || '-'}</td>
                                                <td className="p-2 text-xs text-gray-400">
                                                    {new Date(log.added_at).toLocaleTimeString('ar-EG')}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-amber-50 dark:bg-amber-900/20 font-bold">
                                            <td className="p-2">الإجمالي</td>
                                            <td className="p-2 text-amber-700">{totalRework} {batch.uom}</td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                لا يوجد سجلات إعادة تشغيل لهذه الدفعة
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                        <h3 className="font-bold mb-3 text-sm text-gray-500 uppercase tracking-wider">بيانات الوردية</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span>الوردية:</span>
                                <span className="font-bold">{batch.shift}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>التاريخ:</span>
                                <span>{batch.production_date}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>المشغل:</span>
                                <span>{batch.operator_name || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>الحالة:</span>
                                <span>
                                    {batch.status === 'running' && '🟢 جاري'}
                                    {batch.status === 'completed' && '⚫ مغلق'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {batch.notes && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-800">
                            <h3 className="font-bold mb-2 text-sm text-yellow-800 dark:text-yellow-500">ملاحظات</h3>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{batch.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
