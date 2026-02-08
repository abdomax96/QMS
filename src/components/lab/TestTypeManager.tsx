import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, TestTube2, Beaker, X, Save } from 'lucide-react';
import { labTestConfigService } from '../../services/labTestConfigService';
import type { LabTestType, LabTestCategory } from '../../types/labTests';

const TestTypeManager: React.FC = () => {
    const [types, setTypes] = useState<LabTestType[]>([]);
    const [categories, setCategories] = useState<LabTestCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form State
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [nameAr, setNameAr] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [color, setColor] = useState('#10B981'); // Default green

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [typesData, catsData] = await Promise.all([
                labTestConfigService.getAllTypes(),
                labTestConfigService.getCategories()
            ]);
            setTypes(typesData);
            setCategories(catsData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                code,
                name,
                name_ar: nameAr,
                category_id: categoryId,
                color,
                icon: 'TestTube2', // Default icon
                display_order: 0
            };

            if (currentId) {
                await labTestConfigService.updateType(currentId, payload);
            } else {
                await labTestConfigService.createType(payload);
            }

            await loadData();
            resetForm();
        } catch (error) {
            console.error('Failed to save type:', error);
            alert('Failed to save type');
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (type: LabTestType) => {
        setCurrentId(type.id);
        setCode(type.code);
        setName(type.name);
        setNameAr(type.name_ar);
        setCategoryId(type.category_id);
        setColor(type.color);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this type?')) return;
        // Note: Real service might need a delete method or archive
        alert('Delete functionality to be implemented in service');
    };

    const resetForm = () => {
        setCurrentId(null);
        setCode('');
        setName('');
        setNameAr('');
        setCategoryId('');
        setColor('#10B981');
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <TestTube2 className="h-6 w-6 text-green-600" />
                        {currentId ? 'Edit Test Type' : 'New Test Type'}
                    </h2>
                    <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                            <select
                                required
                                value={categoryId}
                                onChange={e => setCategoryId(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                            >
                                <option value="">Select Category...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name} ({cat.name_ar})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                            <input
                                type="text"
                                required
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                placeholder="TYPE-01"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name (EN) *</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name (AR) *</label>
                            <input
                                type="text"
                                required
                                value={nameAr}
                                onChange={e => setNameAr(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 text-right"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Color Tag</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={e => setColor(e.target.value)}
                                    className="h-10 w-20 p-1 border rounded"
                                />
                                <span className="text-sm text-gray-500 self-center">{color}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? 'Saving...' : <><Save className="h-4 w-4" /> Save Type</>}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search types..."
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                </div>
                <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                    <Plus className="h-5 w-5" />
                    <span>New Type</span>
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                </div>
            ) : types.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <TestTube2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No test types found</p>
                    <p className="text-sm text-gray-400 mt-1">لا توجد أنواع فحوصات</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {types.map(type => (
                                <tr key={type.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-mono text-gray-900">{type.code}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{type.name}</p>
                                                <p className="text-xs text-gray-500">{type.name_ar}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            <Beaker className="h-3 w-3 mr-1" />
                                            {type.category?.name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => startEdit(type)}
                                                className="text-gray-400 hover:text-green-600"
                                            >
                                                <Edit2 className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(type.id)}
                                                className="text-gray-400 hover:text-red-600"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TestTypeManager;
