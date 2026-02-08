import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { productionService, type CreateBatchInput } from '../../services/productionService';
import { useToastStore } from '../../store/toastStore';
import { cn } from '../../utils';

export default function ProductionNew() {
    const navigate = useNavigate();
    const { success, error: toastError } = useToastStore();
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState<CreateBatchInput>({
        batch_number: '',
        product_name: '',
        shift: 'A',
        planned_quantity: 0,
        uom: 'kg',
        operator_name: '',
        notes: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.product_name || !form.batch_number) return;

        setLoading(true);
        try {
            await productionService.createBatch(form);
            success('تم بنجاح', 'تم بدء التشغيلة بنجاح');
            navigate('/production');
        } catch (error) {
            console.error(error);
            toastError('خطأ', 'فشل بدء التشغيلة');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/production')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <ArrowRightIcon className="w-5 h-5 text-gray-500" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    بدء تشغيلة جديدة
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6 shadow-sm">

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            اسم المنتج <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={form.product_name}
                            onChange={e => setForm({ ...form, product_name: e.target.value })}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                            placeholder="مثال: بسكويت شاي 100جم"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            رقم التشغيلة (Batch No) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={form.batch_number}
                            onChange={e => setForm({ ...form, batch_number: e.target.value })}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 font-mono"
                            placeholder="e.g. B-20250101-01"
                        />
                    </div>
                </div>

                {/* Shift & Quantity */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            الوردية <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={form.shift}
                            onChange={e => setForm({ ...form, shift: e.target.value as any })}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                        >
                            <option value="A">وردية A (صباحي)</option>
                            <option value="B">وردية B (مسائي)</option>
                            <option value="C">وردية C (ليلي)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            الكمية المخططة
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={form.planned_quantity}
                            onChange={e => setForm({ ...form, planned_quantity: Number(e.target.value) })}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            الوحدة
                        </label>
                        <input
                            type="text"
                            value={form.uom}
                            onChange={e => setForm({ ...form, uom: e.target.value })}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                            placeholder="kg, box..."
                        />
                    </div>
                </div>

                {/* Operator Info */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        مسؤول الوردية / المشغل
                    </label>
                    <input
                        type="text"
                        value={form.operator_name}
                        onChange={e => setForm({ ...form, operator_name: e.target.value })}
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ملاحظات
                    </label>
                    <textarea
                        rows={3}
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={() => navigate('/production')}
                        className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        إلغاء
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={cn(
                            "px-5 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-sm font-medium",
                            loading && "opacity-70 cursor-wait"
                        )}
                    >
                        {loading ? 'جاري البدء...' : 'بدء التشغيل'}
                    </button>
                </div>

            </form>
        </div>
    );
}
