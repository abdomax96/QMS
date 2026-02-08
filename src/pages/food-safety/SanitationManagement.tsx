/**
 * Sanitation Management Page
 * صفحة إدارة التنظيف والتعقيم
 */

import React, { useState, useEffect } from 'react';
import {
    SparklesIcon,
    PlusIcon,
    CheckCircleIcon,
    ClockIcon,
    CalendarIcon,
    ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { sanitationService } from '../../services/foodSafety/foodSafetyService';
import { FormattedDate } from '../../components/common/FormattedDate';
import type { SanitationArea, CleaningRecord, CleaningFrequency, CleaningStatus } from '../../types/foodSafety';
import { LabDashboardSkeleton } from '../../components/common/LoadingStates';

const SanitationManagement: React.FC = () => {
    const [areas, setAreas] = useState<SanitationArea[]>([]);
    const [cleaningRecords, setCleaningRecords] = useState<CleaningRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddArea, setShowAddArea] = useState(false);
    const [activeTab, setActiveTab] = useState<'areas' | 'schedule' | 'history'>('areas');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [areasData, recordsData] = await Promise.all([
                sanitationService.getAreas(),
                sanitationService.getPendingCleaningTasks()
            ]);
            setAreas(areasData);
            setCleaningRecords(recordsData);
        } catch (err) {
            console.error('Error loading sanitation data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getFrequencyLabel = (freq: CleaningFrequency) => {
        switch (freq) {
            case 'after_use': return 'بعد كل استخدام';
            case 'daily': return 'يومي';
            case 'weekly': return 'أسبوعي';
            case 'monthly': return 'شهري';
            case 'quarterly': return 'ربع سنوي';
        }
    };

    const getStatusBadge = (status: CleaningStatus) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">قيد الانتظار</span>;
            case 'in_progress':
                return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">قيد التنفيذ</span>;
            case 'completed':
                return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">مكتمل</span>;
            case 'verified':
                return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">تم التحقق</span>;
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
                        <SparklesIcon className="w-8 h-8 text-blue-600" />
                        إدارة التنظيف والتعقيم
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        جداول التنظيف والتعقيم ومتابعة التنفيذ
                    </p>
                </div>
                <button
                    onClick={() => setShowAddArea(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    إضافة منطقة
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">مناطق التنظيف</p>
                            <p className="text-xl font-bold">{areas.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <ClockIcon className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">مهام معلقة</p>
                            <p className="text-xl font-bold text-yellow-600">
                                {cleaningRecords.filter(r => r.status === 'pending').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <CheckCircleIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">مكتملة اليوم</p>
                            <p className="text-xl font-bold text-green-600">
                                {cleaningRecords.filter(r => r.status === 'completed').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <CalendarIcon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">نسبة الامتثال</p>
                            <p className="text-xl font-bold">95%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                {[
                    { id: 'areas', label: 'مناطق التنظيف', icon: '🧹' },
                    { id: 'schedule', label: 'المهام المجدولة', icon: '📅' },
                    { id: 'history', label: 'السجلات', icon: '📋' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'areas' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {areas.length === 0 ? (
                        <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <span className="text-5xl mb-4 block">🧹</span>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                لا توجد مناطق تنظيف
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                ابدأ بإضافة مناطق التنظيف لتتبع جداول التعقيم
                            </p>
                            <button
                                onClick={() => setShowAddArea(true)}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                إضافة منطقة
                            </button>
                        </div>
                    ) : (
                        areas.map(area => (
                            <div
                                key={area.id}
                                className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{area.name}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{area.location}</p>
                                    </div>
                                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                                        {getFrequencyLabel(area.cleaningFrequency as CleaningFrequency)}
                                    </span>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-3">
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">المواد الكيميائية:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {(area.chemicals || []).map((chem, idx) => (
                                            <span key={idx} className="px-2 py-0.5 text-xs bg-white dark:bg-gray-800 rounded border">
                                                {chem}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">الفريق: {area.responsibleTeam}</span>
                                    <button className="text-sm text-primary-600 hover:text-primary-700">
                                        تسجيل تنظيف
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'schedule' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {cleaningRecords.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="text-5xl mb-4 block">📋</span>
                            <p className="text-gray-600 dark:text-gray-400">لا توجد مهام مجدولة</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">المنطقة</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ المجدول</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الحالة</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">الإجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {cleaningRecords.map(record => {
                                    const area = areas.find(a => a.id === record.areaId);
                                    return (
                                        <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{area?.name || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                <FormattedDate date={record.scheduledDate} />
                                            </td>
                                            <td className="px-4 py-3">{getStatusBadge(record.status)}</td>
                                            <td className="px-4 py-3">
                                                <button className="text-sm text-primary-600 hover:text-primary-700">
                                                    تنفيذ
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'history' && (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <span className="text-5xl mb-4 block">📋</span>
                    <p className="text-gray-600 dark:text-gray-400">سيتم عرض سجلات التنظيف هنا</p>
                </div>
            )}

            {/* Add Area Modal */}
            {showAddArea && (
                <AddSanitationAreaModal
                    onClose={() => setShowAddArea(false)}
                    onSave={async (data) => {
                        await sanitationService.addArea(data);
                        loadData();
                        setShowAddArea(false);
                    }}
                />
            )}
        </div>
    );
};

// Add Sanitation Area Modal
interface AddSanitationAreaModalProps {
    onClose: () => void;
    onSave: (data: Omit<SanitationArea, 'id'>) => Promise<void>;
}

const AddSanitationAreaModal: React.FC<AddSanitationAreaModalProps> = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        zone: 'production', // Default zone
        cleaningFrequency: 'daily' as CleaningFrequency,
        cleaningProcedure: '',
        chemicals: [] as string[],
        requiredChemicals: [] as string[],
        responsibleTeam: '',
        isActive: true
    });
    const [chemicalInput, setChemicalInput] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    const addChemical = () => {
        if (chemicalInput.trim() && !formData.chemicals.includes(chemicalInput.trim())) {
            const newChemicals = [...formData.chemicals, chemicalInput.trim()];
            setFormData({
                ...formData,
                chemicals: newChemicals,
                requiredChemicals: newChemicals
            });
            setChemicalInput('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">إضافة منطقة تنظيف</h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">اسم المنطقة *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                            placeholder="مثال: خط التعبئة"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">الموقع</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                            placeholder="مثال: قسم الإنتاج"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">تكرار التنظيف</label>
                        <select
                            value={formData.cleaningFrequency}
                            onChange={e => setFormData({ ...formData, cleaningFrequency: e.target.value as CleaningFrequency })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                        >
                            <option value="after_use">بعد كل استخدام</option>
                            <option value="daily">يومي</option>
                            <option value="weekly">أسبوعي</option>
                            <option value="monthly">شهري</option>
                            <option value="quarterly">ربع سنوي</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">إجراء التنظيف</label>
                        <textarea
                            value={formData.cleaningProcedure}
                            onChange={e => setFormData({ ...formData, cleaningProcedure: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                            rows={3}
                            placeholder="صف خطوات التنظيف..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">المواد الكيميائية</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={chemicalInput}
                                onChange={e => setChemicalInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addChemical())}
                                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700"
                                placeholder="أدخل اسم المادة"
                            />
                            <button type="button" onClick={addChemical} className="px-3 py-2 bg-gray-200 rounded-lg">+</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.chemicals.map((chem, idx) => (
                                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1">
                                    {chem}
                                    <button type="button" onClick={() => {
                                        const newChemicals = formData.chemicals.filter((_, i) => i !== idx);
                                        setFormData({
                                            ...formData,
                                            chemicals: newChemicals,
                                            requiredChemicals: newChemicals
                                        });
                                    }} className="text-blue-500 hover:text-blue-700">×</button>
                                </span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">الفريق المسؤول</label>
                        <input
                            type="text"
                            value={formData.responsibleTeam}
                            onChange={e => setFormData({ ...formData, responsibleTeam: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                            placeholder="مثال: فريق النظافة"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                            إلغاء
                        </button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                            حفظ
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SanitationManagement;
