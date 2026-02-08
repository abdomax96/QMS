import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, Check, X, FileCheck, FlaskConical } from 'lucide-react';
import { supabase } from '../../config/supabase'; // Direct use for simplicity or create service method
import { labTestConfigService } from '../../services/labTestConfigService';
import type { LabTestTemplate, LabTestConfig } from '../../types/labTests';

const TestTemplateManager: React.FC = () => {
    const [templates, setTemplates] = useState<LabTestTemplate[]>([]);
    const [configs, setConfigs] = useState<LabTestConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [nameAr, setNameAr] = useState('');
    const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [templatesData, configsData] = await Promise.all([
                fetchTemplates(),
                labTestConfigService.getAllConfigs()
            ]);
            setTemplates(templatesData);
            setConfigs(configsData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        const { data, error } = await supabase
            .from('lab_test_templates')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { data: user } = await supabase.auth.getUser();
            const { data: settings } = await supabase.from('settings').select('main_company_id').single();

            const payload = {
                code,
                name,
                name_ar: nameAr,
                test_config_ids: selectedConfigIds,
                company_id: settings?.main_company_id,
                updated_by: user.user?.id
            };

            if (currentId) {
                // Update
                const { error } = await supabase
                    .from('lab_test_templates')
                    .update(payload)
                    .eq('id', currentId);
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('lab_test_templates')
                    .insert({
                        ...payload,
                        created_by: user.user?.id
                    });
                if (error) throw error;
            }

            await loadData();
            resetForm();
        } catch (error) {
            console.error('Failed to save template:', error);
            alert('Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            const { error } = await supabase
                .from('lab_test_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await loadData();
        } catch (error) {
            console.error('Failed to delete:', error);
            alert('Failed to delete template');
        }
    };

    const startEdit = (template: LabTestTemplate) => {
        setCurrentId(template.id);
        setCode(template.code);
        setName(template.name);
        setNameAr(template.name_ar);
        setSelectedConfigIds(template.test_config_ids || []);
        setIsEditing(true);
    };

    const resetForm = () => {
        setCurrentId(null);
        setCode('');
        setName('');
        setNameAr('');
        setSelectedConfigIds([]);
        setIsEditing(false);
    };

    const toggleConfigSelection = (configId: string) => {
        setSelectedConfigIds(prev =>
            prev.includes(configId)
                ? prev.filter(id => id !== configId)
                : [...prev, configId]
        );
    };

    if (isEditing) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileCheck className="h-6 w-6 text-orange-600" />
                        {currentId ? 'Edit Template' : 'New Template'}
                    </h2>
                    <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                            <input
                                type="text"
                                required
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                placeholder="TMP-001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name (EN) *</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name (AR) *</label>
                            <input
                                type="text"
                                required
                                value={nameAr}
                                onChange={e => setNameAr(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-right"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Select Tests Included in Template ({selectedConfigIds.length})
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-4 border rounded-lg bg-gray-50">
                            {configs.map(config => (
                                <div
                                    key={config.id}
                                    onClick={() => toggleConfigSelection(config.id)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3
                                        ${selectedConfigIds.includes(config.id)
                                            ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-500'
                                            : 'bg-white border-gray-200 hover:border-orange-300'}`}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center
                                        ${selectedConfigIds.includes(config.id) ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                                        {selectedConfigIds.includes(config.id) && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{config.name}</p>
                                        <p className="text-xs text-gray-500 truncate">{config.name_ar}</p>
                                    </div>
                                </div>
                            ))}
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
                            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? 'Saving...' : <><Check className="h-4 w-4" /> Save Template</>}
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
                        placeholder="Search templates..."
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                </div>
                <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                    <Plus className="h-5 w-5" />
                    <span>New Template</span>
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                </div>
            ) : templates.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No templates found</p>
                    <p className="text-sm text-gray-400 mt-1">لا توجد قوالب فحوصات</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {templates.map(template => (
                        <div key={template.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-100 rounded-lg">
                                    <FileCheck className="h-6 w-6 text-orange-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{template.name}</h3>
                                    <p className="text-sm text-gray-500">{template.name_ar}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                            {template.code}
                                        </span>
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <FlaskConical className="h-3 w-3" />
                                            {(template.test_config_ids || []).length} Tests
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => startEdit(template)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                >
                                    <Edit2 className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(template.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TestTemplateManager;
