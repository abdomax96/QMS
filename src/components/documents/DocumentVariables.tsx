import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, CalculatorIcon, ClipboardDocumentIcon, CheckIcon, PencilIcon } from '@heroicons/react/24/outline';
import { variableService } from '../../services/variableService';
import type { DocumentVariable } from '../../types/variables';
import { useToastStore } from '../../store/toastStore';

interface DocumentVariablesProps {
    documentId: string;
    companyId: string;
    canEdit: boolean;
}

const DocumentVariables: React.FC<DocumentVariablesProps> = ({ documentId, companyId, canEdit }) => {
    const [variables, setVariables] = useState<DocumentVariable[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editVariable, setEditVariable] = useState({ value: '', unit: '' });
    const [copiedVariableName, setCopiedVariableName] = useState<string | null>(null);
    const [newVariable, setNewVariable] = useState({ name: '', value: '', unit: '' });
    const { addToast } = useToastStore();

    useEffect(() => {
        fetchVariables();
    }, [documentId]);

    const fetchVariables = async () => {
        try {
            const data = await variableService.getVariablesByDocument(documentId);
            setVariables(data);
        } catch (error) {
            console.error('Error fetching variables:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newVariable.name || !newVariable.value) return;

        try {
            // Check if name exists
            const exists = await variableService.checkNameExists(newVariable.name, documentId);
            if (exists) {
                addToast({ type: 'error', message: 'اسم المتغير موجود بالفعل في الشركة' });
                return;
            }

            await variableService.createVariable({
                name: newVariable.name,
                value: newVariable.value,
                unit: newVariable.unit,
                source_document_id: documentId,
                company_id: companyId,
                description: 'تم إنشاؤه من محرر الوثائق',
            });

            addToast({ type: 'success', message: 'تم إضافة المتغير بنجاح' });
            setIsAdding(false);
            setNewVariable({ name: '', value: '', unit: '' });
            fetchVariables();
        } catch (error) {
            console.error('Error creating variable:', error);
            addToast({ type: 'error', message: 'فشل إضافة المتغير' });
        }
    };

    const handleStartEdit = (v: DocumentVariable) => {
        setEditingId(v.id);
        setEditVariable({ value: v.value, unit: v.unit || '' });
    };

    const handleUpdate = async (id: string) => {
        try {
            await variableService.updateVariable(id, { value: editVariable.value, unit: editVariable.unit });
            addToast({ type: 'success', message: 'تم تحديث المتغير' });
            setEditingId(null);
            fetchVariables();
        } catch (error) {
            console.error('Error updating variable:', error);
            addToast({ type: 'error', message: 'فشل تحديث المتغير' });
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`هل أنت متأكد من حذف المتغير "${name}"؟`)) return;

        try {
            await variableService.deleteVariable(id);
            addToast({ type: 'success', message: 'تم حذف المتغير' });
            fetchVariables();
        } catch (error) {
            console.error('Error deleting variable:', error);
            addToast({ type: 'error', message: 'فشل حذف المتغير' });
        }
    };

    const handleCopyVariable = async (name: string) => {
        const variableToken = `{Global:${name}}`;
        try {
            await navigator.clipboard.writeText(variableToken);
            setCopiedVariableName(name);
            setTimeout(() => setCopiedVariableName((current) => (current === name ? null : current)), 1200);
        } catch (error) {
            console.error('Error copying variable token:', error);
            addToast({ type: 'error', message: 'تعذر نسخ المتغير' });
        }
    };

    if (loading) return <div className="animate-pulse h-20 bg-gray-100 dark:bg-gray-700/50 rounded-lg"></div>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <CalculatorIcon className="w-4 h-4" />
                    المتغيرات المرتبطة
                    <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                        {variables.length}
                    </span>
                </h3>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {variables.length === 0 && !isAdding && (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        لا توجد متغيرات.
                        {canEdit && <span className="block mt-1 text-xs">أضف متغيرات لاستخدامها في النماذج.</span>}
                    </div>
                )}

                {variables.map((v) => (
                    <div key={v.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        {editingId === v.id ? (
                            <div className="space-y-2">
                                <div className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded inline-block">
                                    {`{Global:${v.name}}`}
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="text"
                                        placeholder="القيمة"
                                        className="flex-1 text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-1 focus:ring-primary-500"
                                        value={editVariable.value}
                                        onChange={(e) => setEditVariable({ ...editVariable, value: e.target.value })}
                                        autoFocus
                                    />
                                    <input
                                        type="text"
                                        placeholder="الوحدة"
                                        className="w-full sm:w-20 text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-1 focus:ring-primary-500"
                                        value={editVariable.unit}
                                        onChange={(e) => setEditVariable({ ...editVariable, unit: e.target.value })}
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="min-h-[32px] px-3 py-1 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        onClick={() => handleUpdate(v.id)}
                                        className="min-h-[32px] px-3 py-1 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                    >
                                        حفظ
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        <span className="select-all cursor-pointer font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded break-all" title="صيغة المتغير">
                                            {`{Global:${v.name}}`}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyVariable(v.name)}
                                            className="min-h-[30px] min-w-[30px] p-1 rounded-md text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                                            title="نسخ المتغير"
                                        >
                                            {copiedVariableName === v.name ? (
                                                <CheckIcon className="w-4 h-4 text-emerald-600" />
                                            ) : (
                                                <ClipboardDocumentIcon className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        <span className="font-semibold text-primary-600 break-words">{v.value}</span>
                                        {v.unit && <span className="text-xs text-gray-400 ms-1">{v.unit}</span>}
                                    </div>
                                </div>
                                {canEdit && (
                                    <div className="flex justify-end sm:justify-start gap-1">
                                        <button
                                            onClick={() => handleStartEdit(v)}
                                            className="min-h-[36px] px-2 p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                            title="تعديل"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(v.id, v.name)}
                                            className="min-h-[36px] px-3 sm:px-2 p-1.5 text-sm text-red-600 sm:text-gray-400 hover:text-red-500 bg-red-50 sm:bg-transparent hover:bg-red-100 sm:hover:bg-red-50 dark:bg-red-900/20 sm:dark:bg-transparent dark:hover:bg-red-900/30 rounded-lg transition-colors inline-flex items-center gap-1.5"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                            <span className="sm:hidden">حذف</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {isAdding && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50">
                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder="اسم المتغير (مثال: PackWeight)"
                                className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-1 focus:ring-primary-500"
                                value={newVariable.name}
                                onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value.replace(/\s+/g, '_') })}
                            />
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    placeholder="القيمة"
                                    className="flex-1 text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-1 focus:ring-primary-500"
                                    value={newVariable.value}
                                    onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="الوحدة"
                                    className="w-full sm:w-20 text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-1 focus:ring-primary-500"
                                    value={newVariable.unit}
                                    onChange={(e) => setNewVariable({ ...newVariable, unit: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="min-h-[36px] px-3 py-1 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleAdd}
                                    className="min-h-[36px] px-3 py-1 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                >
                                    حفظ
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {canEdit && !isAdding && (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full py-2 flex items-center justify-center gap-1 text-xs font-medium text-gray-500 hover:text-primary-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-t border-gray-100 dark:border-gray-700"
                >
                    <PlusIcon className="w-3 h-3" />
                    إضافة متغير
                </button>
            )}
        </div>
    );
};

export default DocumentVariables;
