import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, CalculatorIcon } from '@heroicons/react/24/outline';
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

    if (loading) return <div className="animate-pulse h-20 bg-gray-100 rounded-lg"></div>;

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
                    <div key={v.id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div>
                            <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="select-all cursor-pointer font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded" title="انقر للنسخ">
                                    {`{global:${v.name}}`}
                                </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                                <span className="font-semibold text-primary-600">{v.value}</span>
                                {v.unit && <span className="text-xs text-gray-400 ms-1">{v.unit}</span>}
                            </div>
                        </div>
                        {canEdit && (
                            <button
                                onClick={() => handleDelete(v.id, v.name)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
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
                            <div className="flex gap-2">
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
                                    className="w-16 text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-1 focus:ring-primary-500"
                                    value={newVariable.unit}
                                    onChange={(e) => setNewVariable({ ...newVariable, unit: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleAdd}
                                    className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
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
