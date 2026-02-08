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
        if (window.confirm('Are you sure you want to delete this variable? This might affect documents using it.')) {
            await deleteMutation.mutateAsync(id);
        }
    };

    if (isLoading) return <div>Loading variables...</div>;

    return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                        <Variable className="w-6 h-6 text-indigo-500" />
                        Document Variables
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Define placeholders that can be reused across documents. Updating a value here updates it everywhere.
                    </p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Variable
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">Name (Placeholder)</th>
                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">Value</th>
                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">Unit</th>
                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">Description</th>
                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!variables || variables.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500">
                                    No variables defined yet. Create one to get started.
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
                                                className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(variable.id)}
                                                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded"
                                                title="Delete"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                {editingVariable ? 'Edit Variable' : 'Create Variable'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Variable Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">{'{{'}</span>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                                        className="w-full pl-8 pr-8 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white font-mono text-sm"
                                        placeholder="variable_name"
                                    />
                                    <span className="absolute right-3 top-2.5 text-slate-400 font-mono text-sm">{'}}'}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Only letters, numbers, and underscores. Example: <code>batch_weight</code>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Value <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    placeholder="e.g. 30"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Unit (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    placeholder="e.g. kg, ml, °C"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    rows={3}
                                    placeholder="What is this variable used for?"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Variable'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
