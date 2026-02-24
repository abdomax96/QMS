import React, { useState } from 'react';
import { useVariables, useCreateVariable, useUpdateVariable, useDeleteVariable } from '../../../hooks/useVariables';
import { Plus, Edit2, Trash2, X, Save, Variable } from 'lucide-react';
import { type CreateVariableInput, type DocumentVariable } from '../../../types/variables';

export const VariablesManager: React.FC = () => {
    const { data: variables, isLoading } = useVariables();
    const createMutation = useCreateVariable();
    const updateMutation = useUpdateVariable();
    const deleteMutation = useDeleteVariable();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVariable, setEditingVariable] = useState<DocumentVariable | null>(null);
    const [formData, setFormData] = useState<CreateVariableInput>({
        name: '',
        value: '',
        unit: '',
        description: '',
    });

    const handleOpenCreate = () => {
        setEditingVariable(null);
        setFormData({ name: '', value: '', unit: '', description: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (variable: DocumentVariable) => {
        setEditingVariable(variable);
        setFormData({
            name: variable.name,
            value: variable.value,
            unit: variable.unit || '',
            description: variable.description || '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingVariable) {
                await updateMutation.mutateAsync({
                    id: editingVariable.id,
                    updates: formData,
                });
            } else {
                await createMutation.mutateAsync(formData);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المتغير؟ قد يؤثر ذلك على الوثائق التي تستخدمه.')) {
            await deleteMutation.mutateAsync(id);
        }
    };

    if (isLoading) return <div className="p-4 text-sm text-slate-500">جاري تحميل المتغيرات...</div>;

    return (
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
                <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                        <Variable className="w-6 h-6 text-indigo-500" />
                        <span className="truncate">متغيرات الوثائق</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
                        عرّف المتغيرات الديناميكية القابلة لإعادة الاستخدام داخل جميع الوثائق.
                    </p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="w-full sm:w-auto min-h-[42px] bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    متغير جديد
                </button>
            </div>

            <div className="md:hidden space-y-3">
                {!variables || variables.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-slate-500 text-sm">
                        لا توجد متغيرات حتى الآن. أضف متغيرًا للبدء.
                    </div>
                ) : (
                    variables.map((variable) => (
                        <div
                            key={variable.id}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-900/20"
                        >
                            <div className="space-y-2">
                                <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 break-all">
                                    {`{{${variable.name}}}`}
                                </div>
                                <div className="text-sm text-slate-800 dark:text-slate-200">
                                    <span className="text-slate-500">القيمة: </span>
                                    <span className="font-medium break-words">{variable.value}</span>
                                    {variable.unit ? <span className="text-xs text-slate-500 ms-1">({variable.unit})</span> : null}
                                </div>
                                <div className="text-xs text-slate-500 break-words">
                                    {variable.description || '-'}
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                        onClick={() => handleOpenEdit(variable)}
                                        className="min-h-[36px] px-3 text-sm inline-flex items-center gap-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
                                        title="تعديل"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        تعديل
                                    </button>
                                    <button
                                        onClick={() => handleDelete(variable.id)}
                                        className="min-h-[36px] px-3 text-sm inline-flex items-center gap-1.5 rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                                        title="حذف"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        حذف
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">اسم المتغير</th>
                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">القيمة</th>
                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">الوحدة</th>
                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">الوصف</th>
                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 w-24">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!variables || variables.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500">
                                    لا توجد متغيرات حتى الآن. أضف متغيرًا للبدء.
                                </td>
                            </tr>
                        ) : (
                            variables.map((variable) => (
                                <tr
                                    key={variable.id}
                                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <td className="p-3 font-mono text-sm text-indigo-600 dark:text-indigo-400">
                                        {`{{${variable.name}}}`}
                                    </td>
                                    <td className="p-3 text-slate-800 dark:text-slate-200">{variable.value}</td>
                                    <td className="p-3 text-slate-600 dark:text-slate-400">{variable.unit || '-'}</td>
                                    <td className="p-3 text-slate-500 dark:text-slate-400 text-sm max-w-xs truncate">
                                        {variable.description || '-'}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleOpenEdit(variable)}
                                                className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded"
                                                title="تعديل"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(variable.id)}
                                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded"
                                                title="حذف"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[calc(100vh-0.75rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                            <h3 className="font-bold text-base sm:text-lg text-slate-800 dark:text-white">
                                {editingVariable ? 'تعديل متغير' : 'إضافة متغير'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="min-h-[36px] min-w-[36px] p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    اسم المتغير <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">{'{{'}</span>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                                        className="w-full pl-8 pr-8 py-2.5 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white font-mono text-sm"
                                        placeholder="variable_name"
                                    />
                                    <span className="absolute right-3 top-2.5 text-slate-400 font-mono text-sm">{'}}'}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    مسموح بحروف إنجليزية وأرقام وشرطة سفلية فقط. مثال: <code>batch_weight</code>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    القيمة <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    className="w-full px-3 py-2.5 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    placeholder="مثال: 30"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    الوحدة (اختياري)
                                </label>
                                <input
                                    type="text"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    className="w-full px-3 py-2.5 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    placeholder="مثال: kg, ml, °C"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    الوصف (اختياري)
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2.5 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    rows={3}
                                    placeholder="اكتب استخدام هذا المتغير داخل الوثائق"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 -mx-4 px-4 pb-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="min-h-[40px] px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createMutation.isPending || updateMutation.isPending}
                                        className="min-h-[40px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" />
                                        {createMutation.isPending || updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ المتغير'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
