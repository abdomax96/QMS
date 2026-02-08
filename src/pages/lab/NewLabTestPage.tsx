/**
 * New Lab Test Page
 * صفحة إنشاء فحص معملي جديد
 * Updated: Linked to Material Receiving & Inspection Criteria
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowRightIcon,
    BeakerIcon,
    PlusIcon,
    TrashIcon,
    ArrowPathIcon,
    DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { useLabStore } from '../../store/labStore'; // Keeping for legacy/compatibility if needed
import * as labService from '../../services/labService';
import * as inspectionCriteriaService from '../../services/inspectionCriteriaService';
import useStore from '../../store';
import { useCompanyStore } from '../../store/companyStore';
import { useMaterialReceivings } from '../../hooks/useLabData';
import { useMasterData } from '../../hooks/useMasterData';
import type { CreateLabTestInput, LabTestType, LabSampleType } from '../../domain/lab/types';
import { labTestTypeLabels, sampleTypeLabels } from '../../domain/lab/types';

const NewLabTestPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const paramReceivingId = searchParams.get('receivingId');
    const { user } = useStore();
    const { selectedCompanyId } = useCompanyStore();

    // Data Loading
    const { receivings, isLoading: receivingsLoading } = useMaterialReceivings(selectedCompanyId ?? undefined, { status: 'pending' }); // Fetch pending receivings
    // Also fetch 'inspecting' status? The hook filter is single status. 
    // Ideally we want pending OR inspecting. For now, let's assume 'pending' is main flow.

    const { materials: rawMaterials } = useMasterData(selectedCompanyId ?? undefined);

    const [templates, setTemplates] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [sourceOrigin, setSourceOrigin] = useState<'receiving' | 'generic'>('receiving');
    const [selectedReceivingId, setSelectedReceivingId] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    const [formData, setFormData] = useState<CreateLabTestInput>({
        testType: 'chemical',
        sample: {
            sampleNumber: '', // Will be generated
            sampleType: 'raw_material',
            sourceId: '',
            sourceName: '',
            collectedBy: user?.name || '',
            collectedAt: new Date().toISOString().split('T')[0],
            quantity: '',
            unit: 'جم',
            notes: ''
        },
        parameters: [],
        priority: 'normal',
        dueDate: '',
        notes: ''
    });

    const [newParameter, setNewParameter] = useState({
        name: '',
        method: '',
        unit: '',
        specification: ''
    });

    // Load Templates
    useEffect(() => {
        const loadTemplates = async () => {
            if (selectedCompanyId) {
                try {
                    const data = await inspectionCriteriaService.getAllCriteria(selectedCompanyId);
                    setTemplates(data);
                } catch (err) {
                    console.error('Error loading templates:', err);
                }
            }
        };
        loadTemplates();
    }, [selectedCompanyId]);

    // Update Collected By when user loads
    useEffect(() => {
        if (user?.name && !formData.sample.collectedBy) {
            setFormData(prev => ({
                ...prev,
                sample: { ...prev.sample, collectedBy: user.name }
            }));
        }
    }, [user]);

    // Handle URL Params
    useEffect(() => {
        if (paramReceivingId && receivings.length > 0 && !selectedReceivingId) {
            handleReceivingSelect(paramReceivingId);
        }
    }, [paramReceivingId, receivings]);

    // Handle Receiving Selection
    const handleReceivingSelect = (receivingId: string) => {
        setSelectedReceivingId(receivingId);
        if (!receivingId) {
            setFormData(prev => ({
                ...prev,
                sample: { ...prev.sample, sourceId: '', sourceName: '', quantity: '', unit: 'جم' }
            }));
            return;
        }

        const receiving = receivings.find(r => r.id === receivingId);
        if (receiving) {

            // Auto-populate sample info
            const sourceName = `${receiving.materialName} - ${receiving.batchNumber} (${receiving.supplierName})`;

            // Check for required tests snapshot
            let newParameters = formData.parameters;

            // If snapshot exists, look for matching test type
            if (receiving.testRequirementsSnapshot && receiving.testRequirementsSnapshot.length > 0) {
                // Flatten all parameters from all required tests matching the current testType
                // OR just take the first matching requirement?
                // Usually a single LabTest corresponds to one "Check".
                // Let's filter by current formData.testType
                const matchingReqs = receiving.testRequirementsSnapshot.filter(
                    req => req.testType === formData.testType
                );

                if (matchingReqs.length > 0) {
                    // Combine parameters from all matching requirements
                    const snapshotParams = matchingReqs.flatMap(req => req.parameters.map(p => ({
                        name: p.name,
                        method: '', // Not in snapshot usually
                        unit: p.unit || '',
                        specification: `${p.min !== undefined ? p.min : ''} - ${p.max !== undefined ? p.max : ''}`
                    })));

                    if (snapshotParams.length > 0) {
                        newParameters = snapshotParams;
                    }
                }
            }

            setFormData(prev => ({
                ...prev,
                sample: {
                    ...prev.sample,
                    sourceId: receiving.id,
                    sourceName: sourceName,
                    sampleType: 'raw_material',
                    quantity: '', // Reset quantity as sample quantity != receiving quantity
                    unit: receiving.unit
                },
                parameters: newParameters
            }));
        }
    };

    // Handle Template Selection
    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplateId(templateId);
        if (!templateId) return;

        const template = templates.find(t => t.id === templateId);
        if (template) {
            setFormData(prev => ({
                ...prev,
                testType: template.testType, // Update test type to match template
                parameters: template.defaultParameters.map((p: any) => ({
                    name: p.name,
                    method: '',
                    unit: p.unit,
                    specification: `${p.min || ''} - ${p.max || ''}`
                }))
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.sample.sourceName) return;

        setIsSubmitting(true);
        try {
            // Generate sample number if empty
            const finalFormData = {
                ...formData,
                sample: {
                    ...formData.sample,
                    sampleNumber: formData.sample.sampleNumber || `SMP-${Date.now()}`
                }
            };

            const test = await labService.createLabTest(
                finalFormData,
                user?.id || '',
                user?.name || '',
                selectedCompanyId || undefined
            );

            if (test) {
                // If linked to receiving, update receiving status
                if (sourceOrigin === 'receiving' && selectedReceivingId) {
                    await labService.linkTestToReceiving(selectedReceivingId, test.id);
                    await labService.updateMaterialReceivingStatus(selectedReceivingId, 'inspecting');
                }
                navigate(`/lab/tests/${test.id}`);
            }
        } catch (error) {
            console.error('Error creating test:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addParameter = () => {
        if (!newParameter.name) return;
        setFormData({
            ...formData,
            parameters: [...formData.parameters, { ...newParameter }]
        });
        setNewParameter({ name: '', method: '', unit: '', specification: '' });
    };

    const removeParameter = (index: number) => {
        setFormData({
            ...formData,
            parameters: formData.parameters.filter((_, i) => i !== index)
        });
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/lab/tests')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                    <ArrowRightIcon className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BeakerIcon className="w-7 h-7 text-primary-600" />
                        فحص معملي جديد
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Source Selection & Sample Type */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">مصدر العينة</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">نوع العينة *</label>
                            <select
                                value={formData.sample.sampleType}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    sample: { ...formData.sample, sampleType: e.target.value as LabSampleType }
                                })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700"
                            >
                                {Object.entries(sampleTypeLabels).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>

                        {formData.sample.sampleType === 'raw_material' && (
                            <div>
                                <label className="block text-sm font-medium mb-2">المصدر *</label>
                                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mb-3">
                                    <button
                                        type="button"
                                        onClick={() => { setSourceOrigin('receiving'); setFormData(p => ({ ...p, sample: { ...p.sample, sourceId: '', sourceName: '' } })); setSelectedReceivingId(''); }}
                                        className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${sourceOrigin === 'receiving' ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}
                                    >
                                        استلام مخزني
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setSourceOrigin('generic'); setFormData(p => ({ ...p, sample: { ...p.sample, sourceId: '', sourceName: '' } })); setSelectedReceivingId(''); }}
                                        className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${sourceOrigin === 'generic' ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}
                                    >
                                        مادة عامة
                                    </button>
                                </div>

                                {sourceOrigin === 'receiving' ? (
                                    <select
                                        value={selectedReceivingId}
                                        onChange={(e) => handleReceivingSelect(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700"
                                        required
                                    >
                                        <option value="">اختر إذن الاستلام...</option>
                                        {receivings.map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.materialName} - {r.batchNumber} ({r.supplierName})
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <select
                                        value={formData.sample.sourceName} // Using sourceName for generic material name
                                        onChange={(e) => setFormData(p => ({ ...p, sample: { ...p.sample, sourceName: e.target.value } }))}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700"
                                        required
                                    >
                                        <option value="">اختر المادة...</option>
                                        {rawMaterials.map(m => (
                                            <option key={m.id} value={m.name}>{m.name} ({m.code})</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        {formData.sample.sampleType !== 'raw_material' && (
                            <div>
                                <label className="block text-sm font-medium mb-2">اسم المصدر / المادة *</label>
                                <input
                                    type="text"
                                    value={formData.sample.sourceName}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        sample: { ...formData.sample, sourceName: e.target.value }
                                    })}
                                    placeholder="وصف العينة..."
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700"
                                    required
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Test Type & Priority */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">تفاصيل الفحص</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">نوع الفحص *</label>
                            <select
                                value={formData.testType}
                                onChange={(e) => setFormData({ ...formData, testType: e.target.value as LabTestType })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700"
                            >
                                {Object.entries(labTestTypeLabels).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">الأولوية</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'normal' | 'urgent' | 'critical' })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700"
                            >
                                <option value="normal">عادية</option>
                                <option value="urgent">عاجلة</option>
                                <option value="critical">حرجة</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">الموعد النهائي</label>
                            <input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700"
                            />
                        </div>
                    </div>
                </div>

                {/* Sample Details */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">تفاصيل العينة</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">الكمية المسحوبة</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.sample.quantity}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        sample: { ...formData.sample, quantity: e.target.value }
                                    })}
                                    placeholder="الكمية"
                                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700"
                                />
                                <select
                                    value={formData.sample.unit}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        sample: { ...formData.sample, unit: e.target.value }
                                    })}
                                    className="w-24 px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700"
                                >
                                    <option value="جم">جم</option>
                                    <option value="كجم">كجم</option>
                                    <option value="مل">مل</option>
                                    <option value="لتر">لتر</option>
                                    <option value="قطعة">قطعة</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">جمعت بواسطة</label>
                            <input
                                type="text"
                                value={formData.sample.collectedBy}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    sample: { ...formData.sample, collectedBy: e.target.value }
                                })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">تاريخ الجمع</label>
                            <input
                                type="date"
                                value={formData.sample.collectedAt}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    sample: { ...formData.sample, collectedAt: e.target.value }
                                })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700"
                            />
                        </div>
                    </div>
                </div>

                {/* Parameters */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">معايير الفحص</h3>

                        {/* Auto-fill from template - Only showing active templates */}
                        <div className="flex items-center gap-2">
                            <DocumentDuplicateIcon className="w-5 h-5 text-gray-400" />
                            <select
                                value={selectedTemplateId}
                                onChange={(e) => handleTemplateSelect(e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm max-w-[200px]"
                            >
                                <option value="">استيراد من قالب...</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Add Parameter */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
                        <input
                            type="text"
                            value={newParameter.name}
                            onChange={(e) => setNewParameter({ ...newParameter, name: e.target.value })}
                            placeholder="اسم المعيار"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm"
                        />
                        <input
                            type="text"
                            value={newParameter.method}
                            onChange={(e) => setNewParameter({ ...newParameter, method: e.target.value })}
                            placeholder="طريقة الفحص"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm"
                        />
                        <input
                            type="text"
                            value={newParameter.unit}
                            onChange={(e) => setNewParameter({ ...newParameter, unit: e.target.value })}
                            placeholder="الوحدة"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm"
                        />
                        <input
                            type="text"
                            value={newParameter.specification}
                            onChange={(e) => setNewParameter({ ...newParameter, specification: e.target.value })}
                            placeholder="المواصفة"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm"
                        />
                        <button
                            type="button"
                            onClick={addParameter}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-1"
                        >
                            <PlusIcon className="w-4 h-4" />
                            إضافة
                        </button>
                    </div>

                    {/* Parameters List */}
                    {formData.parameters.length > 0 ? (
                        <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-3 py-2 text-right">المعيار</th>
                                        <th className="px-3 py-2 text-right">الطريقة</th>
                                        <th className="px-3 py-2 text-right">الوحدة</th>
                                        <th className="px-3 py-2 text-right">المواصفة</th>
                                        <th className="px-3 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                    {formData.parameters.map((param, index) => (
                                        <tr key={index}>
                                            <td className="px-3 py-2">{param.name}</td>
                                            <td className="px-3 py-2">{param.method}</td>
                                            <td className="px-3 py-2">{param.unit}</td>
                                            <td className="px-3 py-2">{param.specification}</td>
                                            <td className="px-3 py-2">
                                                <button
                                                    type="button"
                                                    onClick={() => removeParameter(index)}
                                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-500 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-dashed border-gray-300">
                            لا توجد معايير مضافة. أضف يدوياً أو اختر قالباً.
                        </div>
                    )}
                </div>

                {/* Notes */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <label className="block text-sm font-medium mb-2">ملاحظات</label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        placeholder="أي ملاحظات إضافية..."
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 resize-none"
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/lab/tests')}
                        className="px-6 py-3 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                    >
                        إلغاء
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                جاري الحفظ...
                            </>
                        ) : (
                            <>
                                <BeakerIcon className="w-5 h-5" />
                                إنشاء الفحص
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewLabTestPage;
